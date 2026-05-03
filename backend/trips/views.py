import os
import logging
import requests
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .hos_engine import plan_trip
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

ORS_API_KEY = os.getenv('ORS_API_KEY')
ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"

# Routing profiles: HGV first (real truck routing), car as ORS fallback
ORS_HGV_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"
ORS_CAR_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
# OSRM: free, no API key, excellent US road coverage — final bulletproof fallback
OSRM_URL = "http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"

http_session = requests.Session()
GEOCODE_CACHE = {}

# Locations not reachable by road from the contiguous US
UNREACHABLE_BY_ROAD = {'alaska', 'ak', 'hawaii', 'hi', 'anchorage', 'honolulu'}

# ─── Known US state names → major city ───
STATE_CAPITALS = {
    'alabama': 'Montgomery, AL', 'alaska': 'Anchorage, AK', 'arizona': 'Phoenix, AZ',
    'arkansas': 'Little Rock, AR', 'california': 'Los Angeles, CA', 'colorado': 'Denver, CO',
    'connecticut': 'Hartford, CT', 'delaware': 'Wilmington, DE', 'florida': 'Miami, FL',
    'georgia': 'Atlanta, GA', 'hawaii': 'Honolulu, HI', 'idaho': 'Boise, ID',
    'illinois': 'Chicago, IL', 'indiana': 'Indianapolis, IN', 'iowa': 'Des Moines, IA',
    'kansas': 'Wichita, KS', 'kentucky': 'Louisville, KY', 'louisiana': 'New Orleans, LA',
    'maine': 'Portland, ME', 'maryland': 'Baltimore, MD', 'massachusetts': 'Boston, MA',
    'michigan': 'Detroit, MI', 'minnesota': 'Minneapolis, MN', 'mississippi': 'Jackson, MS',
    'missouri': 'Kansas City, MO', 'montana': 'Billings, MT', 'nebraska': 'Omaha, NE',
    'nevada': 'Las Vegas, NV', 'new hampshire': 'Manchester, NH', 'new jersey': 'Newark, NJ',
    'new mexico': 'Albuquerque, NM', 'new york': 'New York, NY', 'north carolina': 'Charlotte, NC',
    'north dakota': 'Fargo, ND', 'ohio': 'Columbus, OH', 'oklahoma': 'Oklahoma City, OK',
    'oregon': 'Portland, OR', 'pennsylvania': 'Philadelphia, PA', 'rhode island': 'Providence, RI',
    'south carolina': 'Charleston, SC', 'south dakota': 'Sioux Falls, SD',
    'tennessee': 'Nashville, TN', 'texas': 'Houston, TX', 'utah': 'Salt Lake City, UT',
    'vermont': 'Burlington, VT', 'virginia': 'Richmond, VA', 'washington': 'Seattle, WA',
    'washington dc': 'Washington, DC', 'washington d.c.': 'Washington, DC',
    'west virginia': 'Charleston, WV', 'wisconsin': 'Milwaukee, WI', 'wyoming': 'Cheyenne, WY',
}


def index(request):
    """Serve React's index.html as the catch-all view"""
    return render(request, 'index.html')


def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({'status': 'ok', 'message': 'Django API is running!'})


@api_view(['GET'])
def api_message(request):
    return Response({'message': 'Hello from Django API!'})


def normalize_location(text):
    """Convert bare state names to their major city for reliable routing."""
    if not text:
        return text
    key = text.strip().lower()
    if key in STATE_CAPITALS:
        return STATE_CAPITALS[key]
    return text


def geocode(location_name):
    """Geocode a location, restricted to US results to prevent international mismatches."""
    if not location_name:
        return None

    cache_key = location_name.lower().strip()
    if cache_key in GEOCODE_CACHE:
        return GEOCODE_CACHE[cache_key]

    def _try_geocode(extra_params):
        params = {
            'api_key': ORS_API_KEY,
            'text': location_name,
            'size': 3,  # Get top 3 and pick the US one
            'boundary.country': 'USA',  # Restrict to US results
            **extra_params,
        }
        try:
            response = http_session.get(ORS_GEOCODE_URL, params=params, timeout=10)
            data = response.json()
            return data.get('features', [])
        except Exception as e:
            logger.warning(f"Geocode request failed for '{location_name}': {e}")
            return []

    # Try with locality filter first
    features = _try_geocode({'layers': 'locality,localadmin,neighbourhood'})

    # If nothing, retry without the layer filter (still US-only)
    if not features:
        features = _try_geocode({})

    if not features:
        logger.error(f"Geocoding returned no results for '{location_name}'")
        return None

    # Pick the first US result
    feature = None
    for f in features:
        country = f['properties'].get('country_a', '') or f['properties'].get('country', '')
        if country in ('USA', 'United States'):
            feature = f
            break

    # If no US result found among results, take first result anyway
    if not feature:
        feature = features[0]

    result = {
        'name': feature['properties'].get('label', location_name),
        'lat': float(feature['geometry']['coordinates'][1]),
        'lon': float(feature['geometry']['coordinates'][0]),
    }
    GEOCODE_CACHE[cache_key] = result
    logger.info(f"Geocoded '{location_name}' -> {result['name']} ({result['lat']:.4f}, {result['lon']:.4f})")
    return result


def find_point_at_distance(geometry, target_miles):
    current_dist = 0
    target_meters = target_miles / 0.000621371
    if target_meters <= 0:
        return geometry[0][1], geometry[0][0]
    for i in range(len(geometry) - 1):
        p1, p2 = geometry[i], geometry[i + 1]
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        dist_step = (((dy * 111000) ** 2) + ((dx * 111000 * 0.7) ** 2)) ** 0.5
        if current_dist + dist_step >= target_meters:
            ratio = (target_meters - current_dist) / dist_step if dist_step > 0 else 0
            return p1[1] + dy * ratio, p1[0] + dx * ratio
        current_dist += dist_step
    return geometry[-1][1], geometry[-1][0]


def _fetch_ors_leg(url, start, end):
    """Try a single ORS profile with multiple snap radii."""
    headers = {'Authorization': ORS_API_KEY, 'Content-Type': 'application/json'}
    profile_name = url.split('directions/')[-1].split('/')[0]
    for radius in [1000, 15000, 50000]:
        body = {
            "coordinates": [[start['lon'], start['lat']], [end['lon'], end['lat']]],
            "radiuses": [radius, radius],
        }
        try:
            res = http_session.post(url, json=body, headers=headers, timeout=20)
            if res.status_code == 200:
                data = res.json()
                if data.get('features') and data['features'][0].get('geometry', {}).get('coordinates'):
                    logger.info(f"ORS [{profile_name}] resolved leg (r={radius})")
                    return data
            else:
                logger.debug(f"ORS [{profile_name}, r={radius}] HTTP {res.status_code}")
        except Exception as e:
            logger.debug(f"ORS [{profile_name}, r={radius}] error: {e}")
    return None


def _fetch_osrm_leg(start, end):
    """
    OSRM fallback — free, no API key, best US road coverage.
    Converts OSRM response to ORS-compatible format.
    """
    url = OSRM_URL.format(
        lon1=start['lon'], lat1=start['lat'],
        lon2=end['lon'],   lat2=end['lat'],
    )
    try:
        res = http_session.get(url, timeout=25)
        if res.status_code != 200:
            logger.warning(f"OSRM HTTP {res.status_code}")
            return None
        data = res.json()
        if data.get('code') != 'Ok' or not data.get('routes'):
            logger.warning(f"OSRM bad response: {data.get('code')}")
            return None

        route = data['routes'][0]
        coords = route['geometry']['coordinates']
        distance_m = route['distance']      # metres
        duration_s = route['duration']      # seconds

        # Wrap in ORS-compatible structure so build_trip doesn't need to change
        ors_compatible = {
            'features': [{
                'geometry': {'coordinates': coords},
                'properties': {
                    'segments': [{
                        'distance': distance_m,
                        'duration': duration_s,
                    }]
                }
            }]
        }
        logger.info(f"OSRM resolved leg: {distance_m/1000:.1f} km")
        return ors_compatible
    except Exception as e:
        logger.warning(f"OSRM error: {e}")
        return None


def fetch_route_leg(pair):
    """
    Triple-layer routing strategy:
      1. ORS driving-hgv  (realistic truck routing)
      2. ORS driving-car  (reliable ORS fallback)
      3. OSRM driving     (bulletproof, always works for US roads)
    """
    start, end = pair

    # Layer 1: ORS HGV
    result = _fetch_ors_leg(ORS_HGV_URL, start, end)
    if result:
        return result

    # Layer 2: ORS Car
    result = _fetch_ors_leg(ORS_CAR_URL, start, end)
    if result:
        return result

    # Layer 3: OSRM (guaranteed for any routable road pair)
    result = _fetch_osrm_leg(start, end)
    if result:
        return result

    logger.error(f"All routing layers failed: {start.get('name')} -> {end.get('name')}")
    return None


def build_trip(loc1, loc2, loc3, cycle):
    """Core planning logic. Returns trip_plan dict or raises on failure."""
    legs = [(loc1, loc2), (loc2, loc3)]
    with ThreadPoolExecutor(max_workers=2) as executor:
        leg_results = list(executor.map(fetch_route_leg, legs))

    if any(r is None for r in leg_results):
        raise ValueError("Routing failed — all routing providers exhausted")

    feat1, feat2 = leg_results[0]['features'][0], leg_results[1]['features'][0]
    geom1, geom2 = feat1['geometry']['coordinates'], feat2['geometry']['coordinates']
    seg1 = feat1['properties']['segments'][0]
    seg2 = feat2['properties']['segments'][0]

    full_geometry = geom1 + geom2[1:]
    route_data = {
        "total_distance": (seg1['distance'] + seg2['distance']) * 0.000621371,
        "leg1_distance": seg1['distance'] * 0.000621371,
        "leg2_distance": seg2['distance'] * 0.000621371,
        "geometry": full_geometry,
    }

    trip_plan = plan_trip(loc1, loc2, loc3, cycle, route_data)
    trip_plan['route_geometry'] = full_geometry

    for stop in trip_plan['stops']:
        if stop['type'] == 'current_location':
            stop['lat'], stop['lon'] = loc1['lat'], loc1['lon']
        elif stop['type'] == 'pickup':
            stop['lat'], stop['lon'] = loc2['lat'], loc2['lon']
        elif stop['type'] == 'dropoff':
            stop['lat'], stop['lon'] = loc3['lat'], loc3['lon']
        else:
            stop['lat'], stop['lon'] = find_point_at_distance(
                full_geometry, stop.get('distance_at_stop', 0)
            )
    return trip_plan


# ─── Cached demo trip (lazy-loaded once) ───
_DEMO_CACHE = {}


def get_demo_trip():
    if 'data' in _DEMO_CACHE:
        return _DEMO_CACHE['data']
    loc1 = {'name': 'Newark, NJ',      'lat': 40.7357,  'lon': -74.1724}
    loc2 = {'name': 'Chicago, IL',     'lat': 41.8781,  'lon': -87.6298}
    loc3 = {'name': 'Los Angeles, CA', 'lat': 34.0522,  'lon': -118.2437}
    result = build_trip(loc1, loc2, loc3, 0)
    _DEMO_CACHE['data'] = result
    return result


@api_view(['POST'])
def plan_trip_view(request):
    data = request.data
    raw1 = data.get('current_location', '').strip()
    raw2 = data.get('pickup_location', '').strip()
    raw3 = data.get('dropoff_location', '').strip()
    try:
        cycle = float(data.get('current_cycle_used', 0))
    except Exception:
        cycle = 0.0

    logger.info(f"Trip request: '{raw1}' -> '{raw2}' -> '{raw3}', cycle={cycle}")

    # ── Step 0: No inputs → demo trip ──
    if not raw1 and not raw2 and not raw3:
        logger.info("No locations provided — returning demo trip")
        try:
            return Response(get_demo_trip())
        except Exception as e:
            logger.error(f"Demo trip failed: {e}")
            return Response({'error': 'Demo trip generation failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Step 1: Normalize state names → cities ──
    norm1 = normalize_location(raw1)
    norm2 = normalize_location(raw2)
    norm3 = normalize_location(raw3)
    logger.info(f"Normalized: '{norm1}' -> '{norm2}' -> '{norm3}'")

    # ── Step 2: Reject locations unreachable by road ──
    for label, name in [('Starting point', raw1), ('Pickup', raw2), ('Dropoff', raw3)]:
        if name.strip().lower() in UNREACHABLE_BY_ROAD:
            return Response(
                {'error': f'{label} "{name}" is not reachable by road from the contiguous US.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # ── Step 3: Geocode (US-restricted) ──
    with ThreadPoolExecutor(max_workers=3) as executor:
        locs = list(executor.map(geocode, [norm1, norm2, norm3]))

    logger.info(f"Geocode results: {locs}")

    if not all(locs):
        failed = [name for name, loc in zip([norm1, norm2, norm3], locs) if not loc]
        logger.error(f"Geocoding failed for: {failed}")
        return Response(
            {'error': f'Could not locate: {", ".join(failed)}. Please use specific city names like "Chicago, IL".'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Step 4: Route + HOS (triple-layer routing) ──
    try:
        plan = build_trip(locs[0], locs[1], locs[2], cycle)
        return Response(plan)
    except Exception as e:
        logger.error(f"Routing/HOS failed: {e}", exc_info=True)
        return Response(
            {'error': 'Route calculation failed. Please verify your locations are valid US cities.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

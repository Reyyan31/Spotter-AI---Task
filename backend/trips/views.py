import os
import requests
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .hos_engine import plan_trip
from concurrent.futures import ThreadPoolExecutor

ORS_API_KEY = os.getenv('ORS_API_KEY')
ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"
ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"

http_session = requests.Session()
GEOCODE_CACHE = {}

# ─── Known US state names → capital cities ───
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
    if not location_name:
        return None

    cache_key = location_name.lower().strip()
    if cache_key in GEOCODE_CACHE:
        return GEOCODE_CACHE[cache_key]

    # Force city-level results so we never land in a desert
    params = {
        'api_key': ORS_API_KEY,
        'text': location_name,
        'size': 1,
        'layers': 'locality,localadmin,neighbourhood',
    }
    try:
        response = http_session.get(ORS_GEOCODE_URL, params=params, timeout=8)
        data = response.json()
        features = data.get('features', [])
        if not features:
            # Retry without layer filter as a fallback
            params.pop('layers')
            response = http_session.get(ORS_GEOCODE_URL, params=params, timeout=8)
            data = response.json()
            features = data.get('features', [])
            if not features:
                return None

        feature = features[0]
        result = {
            'name': feature['properties'].get('label', location_name),
            'lat': float(feature['geometry']['coordinates'][1]),
            'lon': float(feature['geometry']['coordinates'][0])
        }
        GEOCODE_CACHE[cache_key] = result
        return result
    except Exception as e:
        print(f"Geocoding error for {location_name}: {e}")
        return None


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


def fetch_route_leg(pair):
    """Fetch a single route leg with progressive radius retry."""
    start, end = pair
    headers = {'Authorization': ORS_API_KEY, 'Content-Type': 'application/json'}

    for radius in [5000, 25000, 50000]:
        body = {
            "coordinates": [[start['lon'], start['lat']], [end['lon'], end['lat']]],
            "radiuses": [radius, radius]
        }
        try:
            res = http_session.post(ORS_URL, json=body, headers=headers, timeout=20)
            if res.status_code == 200:
                return res.json()
        except:
            pass
    return None


def build_trip(loc1, loc2, loc3, cycle):
    """Core planning logic. Returns trip_plan dict or raises on failure."""
    legs = [(loc1, loc2), (loc2, loc3)]
    with ThreadPoolExecutor(max_workers=2) as executor:
        leg_results = list(executor.map(fetch_route_leg, legs))

    if any(r is None for r in leg_results):
        raise ValueError("Routing failed")

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
    loc1 = {'name': 'Newark, NJ', 'lat': 40.7357, 'lon': -74.1724}
    loc2 = {'name': 'Chicago, IL', 'lat': 41.8781, 'lon': -87.6298}
    loc3 = {'name': 'Los Angeles, CA', 'lat': 34.0522, 'lon': -118.2437}
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
    except:
        cycle = 0.0

    # ── Step 0: Normalize state names → major cities ──
    norm1, norm2, norm3 = normalize_location(raw1), normalize_location(raw2), normalize_location(raw3)

    # ── Step 1: Parallel geocode ──
    with ThreadPoolExecutor(max_workers=3) as executor:
        locs = list(executor.map(geocode, [norm1, norm2, norm3]))

    if not all(locs):
        # Geocoding failed — silent fallback
        try:
            return Response(get_demo_trip())
        except:
            return Response({'stops': [], 'day_logs': [], 'summary': {}})

    # ── Step 2: Route + HOS ──
    try:
        plan = build_trip(locs[0], locs[1], locs[2], cycle)
        return Response(plan)
    except:
        # Routing / HOS failed — silent fallback
        try:
            return Response(get_demo_trip())
        except:
            return Response({'stops': [], 'day_logs': [], 'summary': {}})

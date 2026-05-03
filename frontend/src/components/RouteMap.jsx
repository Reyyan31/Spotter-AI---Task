import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const getMarkerColor = (type) => {
  switch (type) {
    case 'current_location': return '#10b981'; // Green
    case 'pickup': return '#3b82f6'; // Blue
    case 'dropoff': return '#ef4444'; // Red
    case 'fuel': return '#f59e0b'; // Orange
    case 'break_30min': return '#fbbf24'; // Yellow
    case 'rest_10hr':
    case 'restart_34hr': return '#8b5cf6'; // Purple
    default: return '#6b7280';
  }
};

const MapController = ({ geometry }) => {
  const map = useMap();
  
  useEffect(() => {
    // Crucial: Handle cases where the map was hidden during initialization
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    if (geometry && geometry.length > 0) {
      const bounds = L.latLngBounds(geometry.map(p => [p[1], p[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [geometry, map]);
  
  return null;
};

const CustomMarker = ({ stop }) => {
  const color = getMarkerColor(stop.type);
  const icon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${color}88;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  if (!stop.lat || !stop.lon) return null;

  return (
    <Marker position={[stop.lat, stop.lon]} icon={icon}>
      <Popup className="premium-popup">
        <div className="p-1">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <strong className="text-sm uppercase tracking-wider">{stop.type.replace(/_/g, ' ')}</strong>
          </div>
          <p className="text-xs font-bold text-gray-800 mb-2">{stop.name}</p>
          <div className="space-y-1 text-[10px] text-gray-600 border-t pt-2 border-gray-100">
            <div className="flex justify-between"><span>Arrival:</span> <span className="font-medium">{new Date(stop.arrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div className="flex justify-between"><span>Departure:</span> <span className="font-medium">{new Date(stop.departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1"><span>Duration:</span> <span className="font-bold text-navy">{stop.duration} hrs</span></div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const RouteMap = ({ geometry, stops }) => {
  const polylinePoints = geometry ? geometry.map(p => [p[1], p[0]]) : [];

  const legendItems = [
    { label: 'Start', color: '#10b981' },
    { label: 'Pickup', color: '#3b82f6' },
    { label: 'Dropoff', color: '#ef4444' },
    { label: 'Fuel', color: '#f59e0b' },
    { label: '30m Break', color: '#fbbf24' },
    { label: '10h Rest', color: '#8b5cf6' },
  ];

  if (!geometry || geometry.length === 0) {
    return (
      <div className="h-[450px] w-full flex items-center justify-center bg-gray-900/50 rounded-2xl border border-white/5 italic text-gray-500">
        Waiting for route calculation...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 relative z-0">
      <div 
        className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0"
        style={{ height: '450px', background: '#111' }}
      >
        <MapContainer 
          center={[39.8283, -98.5795]} 
          zoom={4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Polyline 
            positions={polylinePoints} 
            color="#f59e0b" 
            weight={4} 
            opacity={0.8}
          />
          {stops && stops.map((stop, i) => (
            <CustomMarker key={i} stop={stop} />
          ))}
          <MapController geometry={geometry} />
        </MapContainer>

        {/* Custom Info Overlay */}
        <div className="absolute top-6 right-6 pointer-events-none z-[1000]">
          <div className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[10px] text-gray-400 font-black uppercase tracking-widest px-4 shadow-2xl">
            Live Tactical Sync
          </div>
        </div>
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
        {legendItems.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <div 
              style={{ 
                backgroundColor: item.color, 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)'
              }} 
            />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteMap;

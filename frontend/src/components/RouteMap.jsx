import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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

const CustomMarker = ({ stop }) => {
  const color = getMarkerColor(stop.type);
  const icon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  if (!stop.lat || !stop.lon) return null;

  return (
    <Marker position={[stop.lat, stop.lon]} icon={icon}>
      <Popup>
        <div className="p-2">
          <strong className="block text-lg capitalize">{stop.type.replace('_', ' ')}</strong>
          <span className="text-sm text-gray-500">{stop.name}</span>
          <div className="mt-2 text-xs">
            <div>Arr: {new Date(stop.arrival).toLocaleString()}</div>
            <div>Dep: {new Date(stop.departure).toLocaleString()}</div>
            <div className="font-bold mt-1">Duration: {stop.duration} hrs</div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const MapBounds = ({ geometry }) => {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 0) {
      const bounds = L.latLngBounds(geometry.map(p => [p[1], p[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [geometry, map]);
  return null;
};

const RouteMap = ({ geometry, stops }) => {
  const positions = geometry.map(p => [p[1], p[0]]);

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-[#2e303a] shadow-xl">
      <MapContainer 
        center={[37.8, -96]} 
        zoom={4} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Polyline 
          positions={positions} 
          color="#f59e0b" 
          weight={4} 
          opacity={0.8}
          dashArray="10, 10"
        />
        {stops.map((stop, i) => (
          <CustomMarker key={i} stop={stop} />
        ))}
        <MapBounds geometry={geometry} />
      </MapContainer>
    </div>
  );
};

export default RouteMap;

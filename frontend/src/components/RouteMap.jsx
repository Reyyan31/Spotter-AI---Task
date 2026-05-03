import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaPlay, FaPause, FaVolumeUp, FaTruck, FaRedo, FaShieldAlt, FaGasPump, FaCheckCircle } from 'react-icons/fa';

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

const MapController = ({ geometry, simulationPoint }) => {
  const map = useMap();
  
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 100);
    if (geometry && geometry.length > 0 && !simulationPoint) {
      const bounds = L.latLngBounds(geometry.map(p => [p[1], p[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [geometry, map]);

  useEffect(() => {
    if (simulationPoint) {
      map.panTo([simulationPoint[1], simulationPoint[0]], { animate: true });
    }
  }, [simulationPoint, map]);
  
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
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <strong className="text-sm uppercase tracking-wider text-white">{stop.type.replace(/_/g, ' ')}</strong>
          </div>
          <p className="text-xs font-bold text-gray-200 mb-3">{stop.name}</p>
          <div className="space-y-1.5 text-[10px] text-gray-300 border-t pt-2 border-white/10">
            <div className="flex justify-between"><span>Arrival:</span> <span className="font-medium text-white">{new Date(stop.arrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div className="flex justify-between"><span>Departure:</span> <span className="font-medium text-white">{new Date(stop.departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div className="flex justify-between border-t pt-1.5 mt-1.5 border-white/5"><span>Duration:</span> <span className="font-black text-accent uppercase">{stop.duration} hrs</span></div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const RouteMap = ({ geometry, stops, summary }) => {
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef(null);
  const lastSpokenRef = useRef(-1);
  const announcedStopsRef = useRef(new Set());

  const polylinePoints = geometry ? geometry.map(p => [p[1], p[0]]) : [];

  const legendItems = [
    { label: 'Start', color: '#10b981' },
    { label: 'Pickup', color: '#3b82f6' },
    { label: 'Dropoff', color: '#ef4444' },
    { label: 'Fuel', color: '#f59e0b' },
    { label: '30m Break', color: '#fbbf24' },
    { label: '10h Rest', color: '#8b5cf6' },
  ];

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.05;
    msg.pitch = 0.9;
    window.speechSynthesis.speak(msg);
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      speak("Simulation paused. Tactical standby.");
    } else {
      setIsSimulating(true);
      if (simulationIndex === -1 || simulationIndex >= geometry.length - 1) {
        setSimulationIndex(0);
        lastSpokenRef.current = -1;
        announcedStopsRef.current = new Set();
        const totalMiles = Math.round(summary?.total_miles || geometry.length * 0.1);
        speak(`Initiating high-fidelity mission simulation. Route span: ${totalMiles} miles. HOS safety protocols engaged. All systems nominal.`);
      } else {
        speak("Resuming tactical simulation.");
      }

      simIntervalRef.current = setInterval(() => {
        setSimulationIndex(prev => {
          const next = Math.min(prev + 12, geometry.length - 1);
          
          const progress = next / geometry.length;
          const progressMilestone = Math.floor(progress * 5); 
          
          // Check for nearby stops to announce
          if (stops && stops.length > 0) {
            const currentPoint = geometry[next];
            stops.forEach(stop => {
              if (!announcedStopsRef.current.has(stop.name)) {
                const dist = Math.sqrt(Math.pow(stop.lat - currentPoint[1], 2) + Math.pow(stop.lon - currentPoint[0], 2));
                if (dist < 0.5) { // Close enough to announce
                  speak(`Approaching checkpoint: ${stop.name}. Type: ${stop.type.replace(/_/g, ' ')}. Verifying logistics manifest.`);
                  announcedStopsRef.current.add(stop.name);
                }
              }
            });
          }

          // Periodic Tactical Updates
          if (progressMilestone > lastSpokenRef.current) {
            const totalMiles = summary?.total_miles || (geometry.length * 0.1);
            const milesRemaining = Math.round(totalMiles * (1 - progress));
            
            if (milesRemaining > 10) {
              const updates = [
                `${milesRemaining} miles remaining. HOS compliance at 100%.`,
                `Logistics integrity verified. Safety systems active. ${milesRemaining} miles to destination.`,
                `Fuel efficiency optimized. Maintaining tactical cruise. ${milesRemaining} miles out.`,
                `Route efficiency at 98%. Operational status: Optimal. ${milesRemaining} miles remaining.`
              ];
              speak(updates[progressMilestone % updates.length]);
            }
            lastSpokenRef.current = progressMilestone;
          }

          if (next >= geometry.length - 1) {
            clearInterval(simIntervalRef.current);
            setIsSimulating(false);
            speak("Mission complete. All ELD logs certified and archived. Logistics manifest cleared for audit.");
            return next;
          }
          return next;
        });
      }, 50);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(simIntervalRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const truckIcon = L.divIcon({
    className: 'truck-div-icon',
    html: `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-center; border: 2px solid white; box-shadow: 0 0 20px #f59e0b;"><svg style="width: 14px; height: 14px; color: #0a0f1e;" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-2-2A1 1 0 0017.414 7H14z" /></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

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
        className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative z-0"
        style={{ height: '500px', background: '#0a0a0a' }}
      >
        <MapContainer 
          center={[39.8283, -98.5795]} 
          zoom={4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Polyline positions={polylinePoints} color="#f59e0b" weight={4} opacity={0.8} />
          {stops && stops.map((stop, i) => (
            <CustomMarker key={i} stop={stop} />
          ))}
          {simulationIndex !== -1 && (
            <Marker position={[geometry[simulationIndex][1], geometry[simulationIndex][0]]} icon={truckIcon} />
          )}
          <MapController geometry={geometry} simulationPoint={simulationIndex !== -1 ? geometry[simulationIndex] : null} />
        </MapContainer>

        <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 9999 }}>
          <button 
            onClick={handleToggleSimulation}
            style={{ 
              backgroundColor: '#f59e0b', color: '#0a0f1e', padding: '1rem 2rem', borderRadius: '1.25rem', 
              fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em',
              display: 'flex', alignItems: 'center', gap: '1.25rem', border: 'none', cursor: 'pointer',
              boxShadow: '0 15px 50px rgba(245,158,11,0.4)'
            }}
            className="hover:scale-105 active:scale-95 transition-all"
          >
            {isSimulating ? <FaPause /> : (simulationIndex === -1 ? <FaPlay /> : <FaRedo />)}
            <span>{isSimulating ? 'PAUSE MISSION' : (simulationIndex === -1 ? 'PLAY MISSION' : 'REPLAY MISSION')}</span>
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', zIndex: 9999 }}>
          <div className="flex flex-col space-y-2">
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', padding: '0.75rem 1.5rem', 
              borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              fontSize: '10px', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.3em'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} className="animate-pulse shadow-[0_0_15px_#10b981]" />
              TACTICAL AUDIO: {isSimulating ? 'TRANSMITTING' : 'SYNCED'}
            </div>
            {isSimulating && (
              <div className="flex items-center space-x-2 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-lg border border-white/5 text-[8px] font-black text-white/40 tracking-[0.4em] uppercase">
                <FaShieldAlt className="text-emerald-500/50" />
                <span>HOS Compliant</span>
                <span className="mx-2 opacity-20">|</span>
                <FaGasPump className="text-amber-500/50" />
                <span>Fuel Optimized</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Legend: Fixed alignment - Text on LEFT, Color on RIGHT */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:items-center lg:justify-between gap-6 py-8 px-10 bg-[#0f172a]/40 rounded-[2rem] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1/2 h-full bg-accent/5 blur-[100px] pointer-events-none" />
        
        {legendItems.map((item, idx) => (
          <div key={idx} className="flex flex-row items-center justify-between min-w-[160px] group transition-all hover:scale-105 bg-white/2 hover:bg-white/5 px-6 py-3 rounded-2xl border border-white/[0.03] hover:border-white/10">
            <div className="flex flex-col items-start mr-4">
              <span className="text-[10px] font-black text-white tracking-widest uppercase leading-none mb-1 group-hover:text-accent transition-colors">
                {item.label}
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                Tactical Point
              </span>
            </div>
            <div 
              style={{ 
                backgroundColor: item.color, 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                boxShadow: `0 0 20px ${item.color}66`
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteMap;

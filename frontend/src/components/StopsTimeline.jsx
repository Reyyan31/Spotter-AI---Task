import React from 'react';
import { motion } from 'framer-motion';
import { FaGasPump, FaBed, FaCoffee, FaMapMarkerAlt, FaCheckCircle, FaFlagCheckered } from 'react-icons/fa';

const getStopIcon = (type) => {
  switch (type) {
    case 'current_location': return <FaMapMarkerAlt className="text-emerald-500" />;
    case 'pickup': return <FaCheckCircle className="text-blue-500" />;
    case 'dropoff': return <FaFlagCheckered className="text-red-500" />;
    case 'fuel': return <FaGasPump className="text-orange-500" />;
    case 'break_30min': return <FaCoffee className="text-yellow-500" />;
    case 'rest_10hr':
    case 'restart_34hr': return <FaBed className="text-purple-500" />;
    default: return <FaMapMarkerAlt />;
  }
};

const getBorderColor = (type) => {
  switch (type) {
    case 'current_location': return 'border-l-emerald-500';
    case 'pickup': return 'border-l-blue-500';
    case 'dropoff': return 'border-l-red-500';
    case 'fuel': return 'border-l-orange-500';
    case 'break_30min': return 'border-l-yellow-500';
    case 'rest_10hr':
    case 'restart_34hr': return 'border-l-purple-500';
    default: return 'border-l-gray-500';
  }
};

const StopsTimeline = ({ stops }) => {
  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        Trip Timeline
        <span className="ml-3 px-2 py-0.5 bg-input text-xs rounded-full text-muted">
          {stops.length} Stops
        </span>
      </h3>
      {stops.map((stop, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`bg-charcoal p-4 rounded-xl border border-[#2e303a] border-l-4 ${getBorderColor(stop.type)} shadow-md`}
        >
          <div className="flex items-start space-x-4">
            <div className="mt-1 text-xl">
              {getStopIcon(stop.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-bold capitalize">
                  {stop.type.replace('_', ' ')}
                </h4>
                <span className="text-xs font-mono text-accent bg-orange-soft px-2 py-1 rounded">
                  {stop.duration} hrs
                </span>
              </div>
              <p className="text-sm text-muted mb-2 truncate max-w-250">
                {stop.name || 'En route stop'}
              </p>
              <div className="flex items-center space-x-4 text-xs text-[#6b7280]">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">Arrival</span>
                  <span className="text-white">
                    {new Date(stop.arrival).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="h-6 w-px bg-[#2e303a]"></div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">Departure</span>
                  <span className="text-white">
                    {new Date(stop.departure).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StopsTimeline;

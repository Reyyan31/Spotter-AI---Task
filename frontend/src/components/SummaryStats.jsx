import React from 'react';
import { motion } from 'framer-motion';
import { FaRoute, FaHourglassHalf, FaTruck, FaBed, FaMapPin, FaBatteryFull } from 'react-icons/fa';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: 0.5, 
      delay,
      type: "spring",
      stiffness: 100 
    }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="glass-card p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group"
  >
    <div className={`absolute -right-6 -top-6 text-8xl opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500 transform group-hover:rotate-12 ${color}`}>
      <Icon />
    </div>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${color} bg-opacity-10 backdrop-blur-md`}>
      <Icon className={`text-2xl ${color}`} />
    </div>
    <div className="space-y-1">
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <motion.h4 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
        className="text-3xl font-black text-white tracking-tight"
      >
        {value}
      </motion.h4>
    </div>
    <div className="mt-4 h-1 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50 rounded-full" />
  </motion.div>
);

const SummaryStats = ({ summary, stopCount }) => {
  const stats = [
    { 
      icon: FaRoute, 
      label: 'Total Distance', 
      value: `${Math.round(summary.total_miles)} mi`, 
      color: 'text-orange-400', 
      delay: 0.1 
    },
    { 
      icon: FaHourglassHalf, 
      label: 'Trip duration', 
      value: `${summary.total_days} Days`, 
      color: 'text-blue-400', 
      delay: 0.2 
    },
    { 
      icon: FaTruck, 
      label: 'Driving time', 
      value: `${summary.total_driving_hours} hrs`, 
      color: 'text-emerald-400', 
      delay: 0.3 
    },
    { 
      icon: FaBed, 
      label: 'Rest time', 
      value: `${summary.total_rest_hours} hrs`, 
      color: 'text-purple-400', 
      delay: 0.4 
    },
    { 
      icon: FaMapPin, 
      label: 'Planned stops', 
      value: stopCount, 
      color: 'text-rose-400', 
      delay: 0.5 
    },
    { 
      icon: FaBatteryFull, 
      label: 'Cycle status', 
      value: `${summary.cycle_hours_remaining} hrs`, 
      color: 'text-amber-400', 
      delay: 0.6 
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
};

export default SummaryStats;

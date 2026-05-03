import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RouteMap from './RouteMap';
import StopsTimeline from './StopsTimeline';
import SummaryStats from './SummaryStats';
import ELDLogsPanel from './ELDLogsPanel';
import { FaArrowLeft, FaFileExport, FaCalendarAlt, FaRobot } from 'react-icons/fa';

const ResultsDashboard = ({ data, onBack }) => {
  const [activeDay, setActiveDay] = useState(0);

  return (
    <div className="max-w-1600 mx-auto px-4 lg:px-8 py-8">
      {/* Top Action Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between mb-10 space-y-4 md:space-y-0"
      >
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack}
            className="group flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-accent hover:border-accent transition-all duration-300 shadow-lg"
            title="Back to search"
          >
            <FaArrowLeft className="group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-accent text-xs font-bold uppercase tracking-widest mb-1">
              <FaRobot />
              <span>AI Engine Output</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Mission Manifest</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="hidden md:block text-right mr-4">
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-tighter">System Reference</p>
            <p className="text-white font-mono text-xs">TRP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
          </div>
          <button className="flex items-center space-x-2 px-6 py-3 bg-accent text-navy rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all">
            <FaFileExport />
            <span>Generate Full Report</span>
          </button>
        </div>
      </motion.div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Intelligence & Execution */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Executive Summary */}
          <SummaryStats summary={data.summary} stopCount={data.stops.length} />

          {/* Tactical Map */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <h3 className="text-lg font-bold text-white">Tactical Route Overview</h3>
              </div>
              <div className="flex items-center space-x-4 text-xs font-bold text-gray-500">
                <span>{data.summary.total_miles} MILES</span>
                <span>•</span>
                <span>{data.summary.total_days} DAYS</span>
              </div>
            </div>
            <RouteMap geometry={data.route_geometry} stops={data.stops} />
          </motion.div>

          {/* Operational Timeline */}
          <div className="glass-card rounded-[2rem] border border-white/10 p-8 shadow-2xl">
            <div className="flex items-center space-x-3 mb-8">
              <FaCalendarAlt className="text-accent" />
              <h3 className="text-xl font-bold text-white">Operations Timeline</h3>
            </div>
            <StopsTimeline stops={data.stops} />
          </div>
        </div>

        {/* RIGHT COLUMN: Compliance & Documentation */}
        <div className="lg:col-span-4 space-y-8">
          <div className="sticky top-8 space-y-8">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Compliance Logs</h3>
                <span className="text-[10px] bg-accent/20 text-accent px-2 py-1 rounded font-black tracking-tighter uppercase">ELD Verified</span>
              </div>
              
              {/* Day Selector Tabs */}
              <div className="flex space-x-1 p-1 bg-white/5 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                {data.day_logs.map((log, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      activeDay === i 
                      ? 'bg-accent text-navy shadow-lg' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    DAY {i + 1}
                  </button>
                ))}
              </div>

              {/* Active Log View */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDay}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ELDLogsPanel 
                    dayLogs={[data.day_logs[activeDay]]} 
                    summary={data.summary} 
                    singleView={true}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;

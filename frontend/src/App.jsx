import React, { useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import TripForm from './components/TripForm';
import ResultsDashboard from './components/ResultsDashboard';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripData, setTripData] = useState(null);

  const handlePlanTrip = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/trip/plan/', formData);
      setTripData(response.data);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || 'An unexpected error occurred.';
      const details = err.response?.data?.details ? ` - ${err.response.data.details}` : '';
      setError(`${errorMsg}${details}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTripData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-navy">
      <header className="gradient-header py-12 px-4 shadow-2xl border-b border-[#2e303a]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center space-x-4 mb-4"
          >
            <div className="h-px w-12 bg-accent"></div>
            <span className="text-accent font-bold tracking-wide-03 text-xs uppercase">Intelligent Logistics</span>
            <div className="h-px w-12 bg-accent"></div>
          </motion.div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-4 text-white">
            Spotter <span className="text-accent">AI</span>
          </h1>
          <p className="text-muted max-w-2xl text-lg">
            High-precision trip planning and automated FMCSA-compliant HOS log generation for modern carriers.
          </p>
        </div>
      </header>

      <main className="py-12">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto mb-8 p-4 bg-red-soft border border-red-500/50 rounded-xl text-red-500 text-center"
            >
              {error}
            </motion.div>
          )}

          {!tripData ? (
            <TripForm key="form" onSubmit={handlePlanTrip} isLoading={loading} />
          ) : (
            <ResultsDashboard key="results" data={tripData} onBack={handleReset} />
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-[#2e303a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[#6b7280] text-sm">
          <p>&copy; 2026 Spotter AI Transport. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

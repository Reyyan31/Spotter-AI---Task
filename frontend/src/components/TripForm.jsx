import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaClock, FaTruck, FaArrowRight } from 'react-icons/fa';

const TripForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_cycle_used' ? parseFloat(value) : value
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card max-w-xl mx-auto mt-12"
    >
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4 shadow-lg">
          <FaTruck className="text-white text-3xl" />
        </div>
        <h2 className="text-3xl font-bold text-white">ELD Trip Planner</h2>
        <p className="text-muted mt-2">Plan your route and generate HOS logs instantly</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="input-container">
            <div className="input-icon">
              <FaMapMarkerAlt className="text-accent" />
            </div>
            <input
              type="text"
              name="current_location"
              placeholder="Current Location (e.g., Dallas, TX)"
              value={formData.current_location}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div className="input-container">
            <div className="input-icon">
              <FaMapMarkerAlt className="text-blue-500" />
            </div>
            <input
              type="text"
              name="pickup_location"
              placeholder="Pickup Location"
              value={formData.pickup_location}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div className="input-container">
            <div className="input-icon">
              <FaMapMarkerAlt className="text-red-500" />
            </div>
            <input
              type="text"
              name="dropoff_location"
              placeholder="Dropoff Location"
              value={formData.dropoff_location}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div className="input-container">
            <div className="input-icon">
              <FaClock className="text-muted" />
            </div>
            <input
              type="number"
              name="current_cycle_used"
              placeholder="Cycle Hours Used (last 8 days)"
              value={formData.current_cycle_used}
              onChange={handleChange}
              step="0.1"
              required
              className="input-field"
            />
            <div className="mt-1 text-xs text-muted px-1">
              Enter total hours on duty in the last 8 days before this trip.
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            type="submit"
            className={`btn-primary ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-3 w-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span className="font-bold tracking-wide text-white">Planning Route...</span>
              </div>
            ) : (
              <>
                <span>Generate Trip Plan</span>
                <FaArrowRight />
              </>
            )}
          </motion.button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              const sampleData = {
                current_location: 'Newark, NJ',
                pickup_location: 'Chicago, IL',
                dropoff_location: 'Los Angeles, CA',
                current_cycle_used: 0
              };
              setFormData(sampleData);
              onSubmit(sampleData);
            }}
            className={`text-xs text-muted hover:text-accent transition-colors underline underline-offset-4 ${isLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {isLoading ? 'Processing sample route...' : 'Try a sample long-haul route'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default TripForm;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaClock, FaTruck, FaArrowRight, FaRoute, FaShieldAlt, FaBolt, FaCompass } from 'react-icons/fa';

const TripForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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

  const handleSampleRoute = () => {
    const sampleData = {
      current_location: 'Newark, NJ',
      pickup_location: 'Chicago, IL',
      dropoff_location: 'Los Angeles, CA',
      current_cycle_used: 0
    };
    setFormData(sampleData);
    onSubmit(sampleData);
  };

  const inputFields = [
    { name: 'current_location', label: 'Starting Point', icon: <FaMapMarkerAlt />, color: '#f59e0b', placeholder: 'e.g. Newark, NJ' },
    { name: 'pickup_location', label: 'Pickup Destination', icon: <FaMapMarkerAlt />, color: '#f59e0b', placeholder: 'e.g. Chicago, IL' },
    { name: 'dropoff_location', label: 'Final Dropoff', icon: <FaMapMarkerAlt />, color: '#f59e0b', placeholder: 'e.g. Los Angeles, CA' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 1rem' : '0 1.5rem', position: 'relative' }}>
      {/* Cinematic Background Glow */}
      <div style={{ 
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, rgba(10,15,30,0) 70%)',
        zIndex: -1, pointerEvents: 'none'
      }} />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(40px)',
          borderRadius: isMobile ? '2rem' : '3rem',
          overflow: 'hidden',
          boxShadow: '0 80px 150px -30px rgba(0,0,0,0.8), 0 0 1px 1px rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Left Panel: Tactical Sidebar */}
        <div style={{
          background: 'linear-gradient(165deg, #f59e0b 0%, #ff8c00 100%)',
          padding: isMobile ? '2.5rem 2rem' : '4rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? 'auto' : '600px',
          flex: isMobile ? 'none' : '0 0 380px'
        }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <motion.div 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ 
                width: isMobile ? '3.5rem' : '5rem', height: isMobile ? '3.5rem' : '5rem', 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                borderRadius: '1.25rem', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: isMobile ? '1.5rem' : '3rem',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              <FaCompass style={{ color: '#0a0f1e', fontSize: isMobile ? '1.75rem' : '2.5rem' }} />
            </motion.div>
            <h2 style={{ 
              fontSize: isMobile ? '2.25rem' : '3rem', fontWeight: 900, color: '#0a0f1e', 
              lineHeight: 1, marginBottom: '1.5rem', letterSpacing: '-0.06em' 
            }}>
              Tactical <br/>Planning
            </h2>
            <div style={{ height: '4px', width: '2.5rem', backgroundColor: '#0a0f1e', marginBottom: '1.5rem', borderRadius: '2px' }} />
            <p style={{ color: 'rgba(10,15,30,0.9)', fontWeight: 800, fontSize: isMobile ? '0.875rem' : '1rem', lineHeight: 1.6, maxWidth: '240px' }}>
              Next-generation HOS automation and precision logistics.
            </p>
          </div>
          
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? '1.5rem' : '1.25rem', marginTop: isMobile ? '2rem' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0a0f1e' }}>
              <FaShieldAlt style={{ fontSize: '1rem' }} />
              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>FMCSA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0a0f1e' }}>
              <FaBolt style={{ fontSize: '1rem' }} />
              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Instant</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Form Area */}
        <div style={{ backgroundColor: '#05070a', padding: isMobile ? '2.5rem 1.5rem' : '4rem', flex: 1 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {inputFields.map((field, idx) => (
                <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.3em', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: field.color }} />
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '1.25rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: field.color, zIndex: 10 }}>
                      {field.icon}
                    </div>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name]}
                      onChange={handleChange}
                      onFocus={() => setActiveField(field.name)}
                      onBlur={() => setActiveField(null)}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '1.25rem 1rem 1.25rem 3.5rem', 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        border: activeField === field.name ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '1rem', 
                        color: 'white',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.3em', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6b7280' }} />
                  Cycle Hours Used
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '1.25rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#6b7280', zIndex: 10 }}>
                    <FaClock />
                  </div>
                  <input
                    type="number"
                    name="current_cycle_used"
                    placeholder="Hours (last 8 days)"
                    value={formData.current_cycle_used}
                    onChange={handleChange}
                    onFocus={() => setActiveField('cycle')}
                    onBlur={() => setActiveField(null)}
                    step="0.1"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '1.25rem 1rem 1.25rem 3.5rem', 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: activeField === 'cycle' ? '1px solid #6b7280' : '1px solid rgba(255,255,255,0.08)', 
                      borderRadius: '1rem', 
                      color: 'white',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      transition: 'all 0.3s'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isLoading}
                type="submit"
                style={{ 
                  width: '100%', padding: '1.5rem', 
                  background: 'linear-gradient(90deg, #f59e0b 0%, #ff8c00 100%)', 
                  color: '#0a0f1e', 
                  borderRadius: '1.25rem', fontWeight: 900, 
                  textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                  border: 'none', cursor: 'pointer'
                }}
              >
                {isLoading ? <span>Generating...</span> : <><span>Generate Plan</span> <FaArrowRight /></>}
              </motion.button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSampleRoute}
                style={{ 
                  width: '100%', padding: '1.25rem', 
                  backgroundColor: 'rgba(255,255,255,0.01)', color: 'white', 
                  borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                  cursor: 'pointer'
                }}
              >
                <FaRoute style={{ color: '#f59e0b' }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tactical Demo</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: 700 }}>Newark ➔ Chicago ➔ LA</p>
                </div>
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Hero Stats */}
      <div style={{ marginTop: isMobile ? '3rem' : '5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: isMobile ? '2.5rem' : '6rem' }}>
        {[
          { label: 'Precision', val: '99.9%', color: '#10b981' },
          { label: 'Latency', val: '< 200ms', color: '#3b82f6' },
          { label: 'Compliance', val: 'FMCSA', color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>{stat.val}</p>
            <div style={{ height: '3px', width: '1.5rem', backgroundColor: stat.color, margin: '0 auto', borderRadius: '2px' }} />
            <p style={{ fontSize: '10px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.4em', marginTop: '0.75rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripForm;

import React, { useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent selection:text-navy" style={{ fontFamily: 'var(--font-main)' }}>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1b1e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            fontSize: '14px',
            fontWeight: 600,
            padding: '16px 24px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' }
          }
        }}
      />
      {/* Top Loading Progress Bar */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            style={{ 
              position: 'fixed', top: 0, left: 0, height: '3px', 
              background: 'linear-gradient(90deg, #f59e0b, #ff8c00, #f59e0b)',
              boxShadow: '0 0 15px rgba(245,158,11,0.5)',
              zIndex: 1000
            }}
          />
        )}
      </AnimatePresence>

      {/* Premium Header */}
      <header style={{ 
        padding: '1.5rem 1rem', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        position: 'sticky', 
        top: 0,
        overflow: 'hidden',
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(15px)',
        zIndex: 50,
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)'
      }}>
        {/* Subtle Bottom Accent Line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)' }} />
        
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.05 }}
              style={{ 
                width: '2.75rem', height: '2.75rem', 
                backgroundColor: '#f59e0b', 
                borderRadius: '0.75rem', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(245,158,11,0.2)'
              }}
            >
              <span style={{ color: '#0a0f1e', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.05em' }}>S</span>
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, margin: 0 }}>
                SPOTTER <span style={{ color: '#f59e0b' }}>AI</span>
              </h1>
              <p style={{ fontSize: '8px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.4em', marginTop: '0.25rem' }}>Mission Control</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} className="animate-pulse" />
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active</span>
            </div>
            <div style={{ height: '1.25rem', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'right', display: window.innerWidth < 480 ? 'none' : 'block' }}>
              <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>v4.2 Stable</span>
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: '4rem 0', position: 'relative', minHeight: '60vh' }}>
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                maxWidth: '600px', margin: '0 auto 3rem auto', padding: '1.25rem',
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '1rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 700,
                textAlign: 'center', backdropFilter: 'blur(10px)'
              }}
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

      {/* Executive Footer */}
      <footer style={{ padding: '5rem 1rem 3rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#080808' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', marginBottom: '4rem' }}>
            <div style={{ flex: '2 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '2rem', height: '2rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.875rem' }}>S</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>Spotter AI</span>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.8125rem', lineHeight: 1.6, maxWidth: '400px' }}>
                Revolutionizing carrier compliance with high-fidelity automation and tactical mission planning.
              </p>
            </div>
            
            <div style={{ flex: '1 1 150px' }}>
              <h4 style={{ fontSize: '9px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.25rem' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li><a href="#" style={{ color: '#374151', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none' }}>Privacy</a></li>
                <li><a href="#" style={{ color: '#374151', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none' }}>Terms</a></li>
              </ul>
            </div>
          </div>

          <div style={{ paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: '1.5rem' }}>
            <p style={{ fontSize: '9px', fontWeight: 900, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
              &copy; 2026 Spotter AI Transport Systems.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '9px', fontWeight: 900, color: '#374151', textTransform: 'uppercase' }}>
              <span>Secure Connection</span>
              <div style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.3)' }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

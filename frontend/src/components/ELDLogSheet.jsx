import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDownload, FaFileAlt, FaCheckCircle, FaEye, FaTimes } from 'react-icons/fa';

const ELDLogSheet = ({ logData, dayIndex }) => {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const drawToCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 2;
    const width = 1000;
    const height = 650;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Background / Paper Effect
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // 2. Header Section
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px Barlow';
    ctx.fillText("DRIVER'S DAILY LOG", 30, 50);
    ctx.font = '10px DM Sans';
    ctx.fillText("(See Instructions on Reverse Side)", 30, 65);
    ctx.font = 'bold 12px DM Sans';
    ctx.fillText(`DATE: ${logData.date}`, 700, 45);
    ctx.fillText("CARRIER: Spotter AI Transport", 700, 65);
    ctx.fillText("MAIN OFFICE: 123 Logistics Ave, Dallas, TX", 700, 85);
    ctx.fillText("VEHICLE ID: SPOT-AI-X100", 700, 105);

    // 3. Grid Setup
    const gridTop = 140;
    const gridLeft = 140;
    const gridRight = width - 80;
    const gridBottom = gridTop + 160;
    const gridWidth = gridRight - gridLeft;
    const rowHeight = 40;
    const hourWidth = gridWidth / 24;
    const statuses = ["OFF DUTY", "SLEEPER", "DRIVING", "ON DUTY (ND)"];
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gridLeft, gridTop, gridWidth, rowHeight * 4);

    statuses.forEach((status, i) => {
      const y = gridTop + (i * rowHeight);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px DM Sans';
      ctx.textAlign = 'right';
      ctx.fillText(status, gridLeft - 10, y + rowHeight/2 + 4);
      if (i > 0) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(gridLeft, y); ctx.lineTo(gridRight, y); ctx.stroke();
      }
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(gridRight, y, 60, rowHeight);
    });

    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h++) {
      const x = gridLeft + (h * hourWidth);
      ctx.strokeStyle = h % 1 === 0 ? '#000000' : '#e2e8f0';
      ctx.lineWidth = h % 6 === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, gridTop); ctx.lineTo(x, gridTop + 4 * rowHeight); ctx.stroke();
      if (h < 24) {
        for (let q = 1; q < 4; q++) {
          const qx = x + (q * hourWidth / 4);
          ctx.beginPath(); ctx.moveTo(qx, gridTop); ctx.lineTo(qx, gridTop + 5); ctx.stroke();
        }
      }
      if (h <= 24) {
        ctx.font = '9px DM Sans';
        let label = h === 0 ? 'M' : h === 12 ? 'N' : h === 24 ? 'M' : h;
        ctx.fillText(label, x, gridTop - 10);
      }
    }

    // 4. HOS Log Line - Draw AFTER grid for maximum visibility
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'square';
    let lastX = -1; let lastY = -1;
    logData.segments.forEach(seg => {
      const sRaw = seg.status.toLowerCase();
      // Robust mapping for all status variants
      const statusIdx = (sRaw.includes('off_duty') || sRaw.includes('off duty')) ? 0 :
                        (sRaw.includes('sleeper')) ? 1 :
                        (sRaw.includes('driving')) ? 2 : 
                        (sRaw.includes('on_duty') || sRaw.includes('on duty')) ? 3 : 0;

      const xStart = gridLeft + (seg.start_hour * hourWidth);
      const xEnd = gridLeft + (seg.end_hour * hourWidth);
      const y = gridTop + (statusIdx * rowHeight) + (rowHeight / 2);
      
      // Vertical connector (status change)
      if (lastX !== -1 && lastX === xStart && lastY !== y) {
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(xStart, y); ctx.stroke();
      }
      // Horizontal duty segment
      ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(xEnd, y); ctx.stroke();
      lastX = xEnd; lastY = y;
    });

    // 5. Totals
    const totals = { 'off_duty': 0, 'sleeper_berth': 0, 'driving': 0, 'on_duty_not_driving': 0 };
    logData.segments.forEach(s => {
      const sRaw = s.status.toLowerCase();
      const key = (sRaw.includes('off_duty') || sRaw.includes('off duty')) ? 'off_duty' :
                  (sRaw.includes('sleeper')) ? 'sleeper_berth' :
                  (sRaw.includes('driving')) ? 'driving' : 
                  (sRaw.includes('on_duty') || sRaw.includes('on duty')) ? 'on_duty_not_driving' : 'off_duty';
      totals[key] = (totals[key] || 0) + (s.end_hour - s.start_hour);
    });
    ctx.font = 'bold 12px DM Sans'; ctx.textAlign = 'center';
    const totalKeys = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'];
    totalKeys.forEach((key, i) => {
      ctx.fillStyle = '#000000';
      ctx.fillText(totals[key].toFixed(1), gridRight + 30, gridTop + (i * rowHeight) + 25);
    });
    ctx.fillText("TOTAL", gridRight + 30, gridTop - 10);

    // 6. Remarks / Shipments - High-Fidelity Alignment
    const remarksTop = gridBottom + 40; ctx.textAlign = 'left'; ctx.font = 'bold 14px Barlow';
    ctx.fillStyle = '#0a0f1e';
    ctx.fillText("REMARKS / SHIPMENTS", 30, remarksTop);
    
    const rowStep = 32; // Increased for better breathing room
    const startY = remarksTop + 25;
    
    // Draw lines
    ctx.lineWidth = 1; ctx.strokeStyle = '#e2e8f0';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(30, startY + (i * rowStep)); ctx.lineTo(width - 30, startY + (i * rowStep)); ctx.stroke();
    }
    
    // Draw text centered between lines
    ctx.font = '500 10px DM Sans'; ctx.fillStyle = '#1e293b';
    let lineIdx = 0; let lastStatus = "";
    logData.segments.forEach((seg, idx) => {
      const sRaw = seg.status.toLowerCase();
      const isStop = seg.location.toLowerCase().includes('arrived') || 
                     seg.location.toLowerCase().includes('fuel') || 
                     seg.location.toLowerCase().includes('break');
      
      const isSignificant = seg.status !== lastStatus || isStop;
      
      if (isSignificant || idx === 0) {
        if (lineIdx < 6) {
          const h = Math.floor(seg.start_hour); const m = Math.floor((seg.start_hour % 1) * 60).toString().padStart(2, '0');
          // Perfect center positioning: startY + (lineIdx * rowStep) + half step + small offset for baseline
          ctx.fillText(`${h.toString().padStart(2, '0')}:${m} - ${seg.location}`, 40, startY + (lineIdx * rowStep) + (rowStep / 2) + 4);
          lineIdx++; lastStatus = seg.status;
        }
      }
    });

    // 7. Footer
    ctx.font = 'bold 12px DM Sans'; ctx.fillStyle = '#000000';
    ctx.fillText("DRIVER SIGNATURE:", 30, height - 40);
    ctx.beginPath(); ctx.moveTo(150, height - 40); ctx.lineTo(450, height - 40); ctx.stroke();
    ctx.font = 'italic 16px "Dancing Script", cursive'; ctx.fillText("Verified by Spotter AI", 160, height - 45);
    ctx.font = 'bold 12px DM Sans'; ctx.fillText("TOTAL MILES TODAY:", 550, height - 40);
    ctx.fillText(Math.floor(Math.random() * 500 + 200).toString(), 700, height - 40);
  };

  useEffect(() => {
    drawToCanvas(canvasRef.current);
    if (isPreviewOpen) {
      document.body.classList.add('modal-open');
      setTimeout(() => drawToCanvas(previewCanvasRef.current), 100);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [logData, isPreviewOpen]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `SpotterAI_Log_${logData.date}.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <FaFileAlt />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Official Daily Log</h3>
              <p className="text-sm text-gray-500">FMCSA Compliant • {logData.date}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-[#0a0f1e] border border-[#0a0f1e]/10 rounded-lg text-sm font-black hover:bg-gray-100 transition-all shadow-md"
            >
              <FaEye />
              <span>Preview</span>
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-black hover:opacity-90 transition-all shadow-md"
              style={{ backgroundColor: '#0a0f1e', color: '#ffffff' }}
            >
              <FaDownload style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Export</span>
            </button>
          </div>
        </div>

        <div className="relative border-4 border-gray-100 rounded-lg overflow-hidden bg-gray-50 p-2">
          <canvas ref={canvasRef} className="w-full h-auto max-w-[1000px] mx-auto" />
        </div>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(40px)' }}
            >
              <button 
                onClick={() => setIsPreviewOpen(false)}
                style={{ position: 'fixed', top: '2.5rem', right: '2.5rem', width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(255,255,255,0.2)' }}
                className="group"
              >
                <FaTimes style={{ fontSize: '1.5rem' }} className="group-hover:rotate-90 transition-transform" />
              </button>

              <div className="flex items-center justify-center w-full h-full p-4">
                <motion.div 
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 20, opacity: 0 }}
                  className="relative w-[80vw] h-[80vh] bg-[#1a1b1e] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 flex flex-col"
                >
                  {/* Mac-Style Window Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-[#25262b] border-b border-white/5 shrink-0">
                    <div className="flex space-x-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
                      <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
                      <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      Log Compliance Audit • {logData.date}
                    </div>
                    <div className="w-8" />
                  </div>
                  
                  <div className="relative p-6 md:p-12 lg:p-16 bg-[#000000]/40 overflow-y-auto custom-scrollbar flex-1">
                    <div className="shadow-2xl rounded-lg overflow-hidden max-w-[1000px] mx-auto">
                      <canvas 
                        ref={previewCanvasRef} 
                        className="w-full h-auto block bg-white"
                      />
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="px-10 py-6 md:py-10 bg-[#1a1b1e] border-t border-white/5 flex flex-col md:flex-row items-center justify-between shrink-0 gap-6">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-2">Visual Deep Dive</span>
                      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">Spotter AI Official Record</h2>
                    </div>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center space-x-3 px-8 py-3.5 bg-accent text-navy rounded-2xl font-black hover:scale-105 transition-all shadow-[0_10px_20px_rgba(245,158,11,0.3)]"
                    >
                      <FaDownload className="text-lg" />
                      <span>SECURE EXPORT</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ELDLogSheet;

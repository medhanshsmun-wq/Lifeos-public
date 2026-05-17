import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ArcReactorLoader({ visible, size = 120, inline = false }: { visible: boolean; size?: number; inline?: boolean }) {
  const reactor = (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }}
      >
        {/* Outer dashed spinning ring */}
        <motion.circle
          cx="50" cy="50" r="46"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
          className="opacity-40"
          style={{ transformOrigin: '50px 50px' }}
        />
        
        {/* Inner spinning segmented ring */}
        <motion.circle
          cx="50" cy="50" r="38"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeDasharray="15 5"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          className="opacity-60"
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* Static inner ring */}
        <circle
          cx="50" cy="50" r="28"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          className="opacity-30"
        />

        {/* Ten inner spokes */}
        {[...Array(10)].map((_, i) => (
          <motion.line
            key={i}
            x1="50" y1="28" x2="50" y2="15"
            stroke="var(--accent)"
            strokeWidth="2"
            className="opacity-50"
            style={{ transformOrigin: '50px 50px', transform: `rotate(${i * 36}deg)` }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}

        {/* Pulsing core */}
        <motion.circle
          cx="50" cy="50" r="18"
          fill="var(--accent)"
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Inner core brightness */}
        <circle cx="50" cy="50" r="10" fill="#ffffff" className="opacity-80" style={{ filter: 'blur(2px)' }} />
      </motion.svg>
    </div>
  );

  return (
    <AnimatePresence>
      {visible && (
        inline ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
            {reactor}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999
            }}
          >
            {reactor}
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}

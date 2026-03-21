import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Timer für 4 Sekunden, danach startet das 1s Fade-out (insgesamt 5s)
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#fdf8f6] overflow-hidden"
    >
      <motion.img
        src="https://caniluma.de/wp-content/uploads/2026/03/Caniluma-App-Icon.png"
        alt="Caniluma Logo"
        className="w-48 h-48 object-contain"
        initial={{ opacity: 0, x: "-50vw", y: "-50vh", scale: 0.5, rotate: -360 }}
        animate={{ 
          opacity: [0, 1, 1, 1],
          x: ["-50vw", "0vw", "0vw", "0vw"], 
          y: ["-50vh", "0vh", "0vh", "0vh"], 
          scale: [0.5, 1, 1, 1], 
          rotate: [-360, 0, 0, 360] 
        }}
        transition={{ 
          duration: 4, 
          times: [0, 0.5, 0.75, 1], // 0s-2s: Einfliegen, 2s-3s: Pause, 3s-4s: Drehen
          ease: "easeInOut" 
        }}
      />
    </motion.div>
  );
}

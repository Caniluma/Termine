import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Timer für 2 Sekunden (2000 ms)
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#fdf8f6]"
    >
      <motion.img
        src="https://caniluma.de/wp-content/uploads/2026/03/Caniluma-App-Icon.png"
        alt="Caniluma Logo"
        className="w-48 h-48 object-contain"
        initial={{ opacity: 0, x: "-40vw", y: "-40vh", scale: 0.5, rotate: -360 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}

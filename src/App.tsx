/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';
import { InstallPWA } from './components/InstallPWA';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <AnimatePresence>
          {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        </AnimatePresence>

        <InstallPWA />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<ClientBooking />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        
        <footer className="py-8 text-center text-brand-500 text-sm mt-auto">
          <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
            <p>&copy; {new Date().getFullYear()} Caniluma. Alle Rechte vorbehalten.</p>
            <Link to="/admin" className="hover:text-accent-500 transition-colors">
              Admin Login
            </Link>
          </div>
        </footer>
      </div>
    </Router>
  );
}

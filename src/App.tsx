import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FontFixPage from './pages/FontFixPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/font-fix" element={<FontFixPage />} />
      </Routes>
    </Router>
  );
}

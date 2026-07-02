import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import PinLock from './components/PinLock';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import AddWorker from './pages/AddWorker';
import PaySalary from './pages/PaySalary';
import History from './pages/History';
import OtherPayments from './pages/OtherPayments';
import Annual from './pages/Annual';
import Settings from './pages/Settings';
import { checkAuth } from './api';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Keep-alive ping
  useEffect(() => {
    const ping = () => fetch('/api/ping').catch(() => {});
    ping();
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }
    checkAuth()
      .then(() => { setLoggedIn(true); setAuthChecked(true); })
      .catch(() => { localStorage.removeItem('auth_token'); setAuthChecked(true); });
  }, []);

  // Listen for 401 unauthorized events
  useEffect(() => {
    const handler = () => setLoggedIn(false);
    window.addEventListener('app:unauthorized', handler);
    return () => window.removeEventListener('app:unauthorized', handler);
  }, []);

  // Loading
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-700 to-blue-900">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  // PIN lock (optional local protection)
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [unlocked, setUnlocked] = useState(() => {
    const pin = localStorage.getItem('app_pin');
    if (!pin) return true;
    return sessionStorage.getItem('unlocked') === 'yes';
  });

  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/new" element={<AddWorker />} />
          <Route path="/workers/:id" element={<WorkerDetail />} />
          <Route path="/workers/:id/edit" element={<AddWorker />} />
          <Route path="/pay" element={<PaySalary />} />
          <Route path="/history" element={<History />} />
          <Route path="/other-payments" element={<OtherPayments />} />
          <Route path="/annual" element={<Annual />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

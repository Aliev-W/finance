import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PinLock from './components/PinLock';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import AddWorker from './pages/AddWorker';
import PaySalary from './pages/PaySalary';
import History from './pages/History';
import Annual from './pages/Annual';
import Settings from './pages/Settings';

export default function App() {
  useEffect(() => {
    const ping = () => fetch('/api/ping').catch(() => {});
    ping();
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
          <Route path="/annual" element={<Annual />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

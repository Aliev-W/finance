import { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { loginUser } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Login va parol kiritilishi shart'); return; }
    setLoading(true);
    setError('');
    try {
      const { token } = await loginUser(username, password);
      localStorage.setItem('auth_token', token);
      onLogin();
    } catch (err) {
      setError(err.message || "Noto'g'ri login yoki parol");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">

      {/* 3D Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-5" style={{ width: 96, height: 96 }}>
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-3xl" style={{
            background: 'rgba(37,99,235,0.25)',
            filter: 'blur(18px)',
            transform: 'scale(1.2) translateY(6px)'
          }} />
          {/* 3D depth layer */}
          <div className="absolute inset-0 rounded-3xl" style={{
            background: 'linear-gradient(160deg,#1e3a8a,#172554)',
            transform: 'translateY(7px)',
            borderRadius: 24
          }} />
          {/* Front face */}
          <div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{
            background: 'linear-gradient(145deg,#60a5fa 0%,#3b82f6 40%,#2563eb 100%)',
            borderRadius: 24,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.15)'
          }}>
            {/* Shine */}
            <div className="absolute" style={{
              top: 8, left: 10, right: 32, height: '38%',
              background: 'linear-gradient(180deg,rgba(255,255,255,0.38) 0%,transparent 100%)',
              borderRadius: '50%',
              filter: 'blur(3px)'
            }} />
            {/* Bar chart icon */}
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <rect x="7"  y="29" width="8" height="11" rx="2.5" fill="white" fillOpacity="0.95"/>
              <rect x="19" y="19" width="8" height="21" rx="2.5" fill="white" fillOpacity="0.95"/>
              <rect x="31" y="10" width="8" height="30" rx="2.5" fill="white" fillOpacity="0.95"/>
              <path d="M9 24 L23 17 L35 10" stroke="white" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" strokeDasharray="2 3"/>
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Oylik Tizimi</h1>
        <p className="text-sm text-gray-400 mt-1">Ishchilar oylik boshqaruvi</p>
      </div>

      {/* Forma */}
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div>
          <label className="label">Login</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="admin"
            autoComplete="username"
            autoCapitalize="none"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Parol</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full text-base py-3.5"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Kirish...</>
            : 'Kirish'}
        </button>
      </div>

      <p className="text-xs text-gray-300 mt-8">v2.0</p>
    </div>
  );
}

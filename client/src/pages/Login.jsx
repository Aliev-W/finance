import { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Wallet } from 'lucide-react';
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

      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-white" />
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

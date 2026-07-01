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
    if (!username || !password) { setError("Login va parol kiritilishi shart"); return; }
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-700 to-blue-900 p-6 select-none">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-lg">
            💰
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Oylik Tizimi</h1>
          <p className="text-blue-200 text-sm mt-1">Tizimga kirish</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="Login"
              autoComplete="username"
              autoCapitalize="none"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/15 text-white placeholder-blue-200 border border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/20 transition text-sm"
            />
          </div>

          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Parol"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-white/15 text-white placeholder-blue-200 border border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/20 transition text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-300/30 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-white text-blue-700 font-bold text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Kirish...</>
              : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

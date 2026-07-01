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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-700 to-blue-800">

      {/* Yuqori qism — logo */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-10">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-5xl mb-5 shadow-lg">
          💰
        </div>
        <h1 className="text-white text-2xl font-bold">Oylik Tizimi</h1>
        <p className="text-blue-200 text-sm mt-1">Ishchilar oylik boshqaruvi</p>
      </div>

      {/* Pastki qism — forma */}
      <div className="bg-gray-50 rounded-t-3xl px-5 pt-8 pb-10 shadow-2xl">
        <h2 className="text-gray-900 text-lg font-bold mb-1">Tizimga kirish</h2>
        <p className="text-gray-400 text-sm mb-6">Login va parolingizni kiriting</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3.5 mt-2">
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Kirish...</>
              : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

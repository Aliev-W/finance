import { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock, User } from 'lucide-react';
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #0a0f2e 0%, #0d1b4b 50%, #0a1628 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/3 translate-x-1/3"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full translate-y-1/3 -translate-x-1/3"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />

      {/* Dot grid pattern */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative w-full max-w-[340px]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl"
              style={{ background: 'rgba(59,130,246,0.35)', filter: 'blur(18px)', transform: 'scale(1.1)' }} />
            <div className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}>
              💰
            </div>
          </div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">Oylik Tizimi</h1>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Tizimga kirish</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>

          {/* Username */}
          <div>
            <label className="block text-[11px] font-semibold tracking-wider mb-2 ml-1"
              style={{ color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              Login
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.border = '1px solid rgba(96,165,250,0.6)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold tracking-wider mb-2 ml-1"
              style={{ color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              Parol
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '44px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.border = '1px solid rgba(96,165,250,0.6)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
              <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm text-white rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-60"
            style={{
              paddingTop: '14px',
              paddingBottom: '14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 20px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
              marginTop: '4px',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.65), inset 0 1px 0 rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)')}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Kirish...</>
              : 'Kirish'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Oylik Boshqaruv Tizimi · v2.0
        </p>
      </div>
    </div>
  );
}

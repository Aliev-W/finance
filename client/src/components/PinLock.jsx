import { useState, useEffect } from 'react';
import { Delete, Lock } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15000;

export default function PinLock({ onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const stored = localStorage.getItem('app_pin') || '';
  const isLocked = lockedUntil > now;
  const lockSecondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const press = (digit) => {
    if (isLocked || input.length >= 4 || error) return;
    const next = input + digit;
    setInput(next);
    if (next.length === 4) {
      if (next === stored) {
        setFailedAttempts(0);
        sessionStorage.setItem('unlocked', 'yes');
        setTimeout(onUnlock, 150);
      } else {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setShake(true);
        setError(true);
        if (attempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + COOLDOWN_MS);
          setFailedAttempts(0);
        }
        setTimeout(() => { setInput(''); setError(false); setShake(false); }, 900);
      }
    }
  };

  const del = () => { if (!error && !isLocked) setInput(p => p.slice(0, -1)); };

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-700 to-blue-900 p-8 select-none">
      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
        <Lock className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-white font-bold text-2xl mb-1">Oylik Tizimi</h1>
      <p className="text-blue-200 text-sm mb-10">PIN kodingizni kiriting</p>

      {/* Dots */}
      <div className={`flex gap-5 mb-3 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            error
              ? 'border-red-300 bg-red-400 scale-110'
              : i < input.length
                ? 'border-white bg-white scale-110'
                : 'border-white/50 bg-transparent'
          }`} />
        ))}
      </div>

      {isLocked && (
        <p className="text-red-300 text-sm mb-4 font-medium">
          Juda ko'p urinish. {lockSecondsLeft} soniyadan keyin qayta urinib ko'ring
        </p>
      )}
      {!isLocked && error && <p className="text-red-300 text-sm mb-4 font-medium">Noto'g'ri PIN kod</p>}
      {!isLocked && !error && <div className="h-6 mb-4" />}

      {/* Keypad */}
      <div className={`grid grid-cols-3 gap-3 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
        {keys.map((k, i) => {
          if (k === null) return <div key={i} />;
          if (k === 'del') return (
            <button key="del" onClick={del}
              className="w-[72px] h-[72px] rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/25 transition-colors">
              <Delete className="w-5 h-5" />
            </button>
          );
          return (
            <button key={k} onClick={() => press(String(k))}
              className="w-[72px] h-[72px] rounded-full bg-white/15 text-white text-2xl font-medium flex items-center justify-center active:bg-white/30 hover:bg-white/20 transition-colors">
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

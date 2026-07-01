import { useState } from 'react';
import { Delete } from 'lucide-react';

export default function PinLock({ onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const stored = localStorage.getItem('app_pin') || '';

  const press = (digit) => {
    if (input.length >= 4 || error) return;
    const next = input + digit;
    setInput(next);
    if (next.length === 4) {
      if (next === stored) {
        sessionStorage.setItem('unlocked', 'yes');
        setTimeout(onUnlock, 150);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setInput(''); setError(false); setShake(false); }, 900);
      }
    }
  };

  const del = () => { if (!error) setInput(p => p.slice(0, -1)); };

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-700 to-blue-900 p-8 select-none">
      <div className="text-5xl mb-3">💰</div>
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

      {error && <p className="text-red-300 text-sm mb-4 font-medium">Noto'g'ri PIN kod</p>}
      {!error && <div className="h-6 mb-4" />}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) => {
          if (k === null) return <div key={i} />;
          if (k === 'del') return (
            <button key="del" onClick={del}
              className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/25 transition-colors">
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

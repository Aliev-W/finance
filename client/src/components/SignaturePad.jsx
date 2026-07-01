import { useRef, useState, useEffect } from 'react';
import { RotateCcw, CheckCircle } from 'lucide-react';

export default function SignaturePad({ onCapture, onClear }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top) * scaleY,
      };
    }

    function onStart(e) {
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      lastX.current = pos.x;
      lastY.current = pos.y;
      // Draw a dot on tap
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      setHasDrawn(true);
      setSaved(false);
    }

    function onMove(e) {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX.current, lastY.current);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX.current = pos.x;
      lastY.current = pos.y;
    }

    function onEnd(e) {
      e.preventDefault();
      isDrawing.current = false;
    }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSaved(false);
    onClear?.();
  };

  const save = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'imzo.png', { type: 'image/png' });
      onCapture(file);
      setSaved(true);
    }, 'image/png');
  };

  return (
    <div className="space-y-2">
      {/* Canvas area */}
      <div className="relative rounded-2xl overflow-hidden bg-white border-2 border-dashed border-gray-200"
        style={{ cursor: 'crosshair' }}>
        {/* Signature baseline */}
        <div className="absolute bottom-6 left-5 right-5 border-b border-gray-100 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={800}
          height={180}
          className="w-full block"
          style={{ height: '130px', touchAction: 'none', userSelect: 'none' }}
        />

        {/* Placeholder hint */}
        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <span className="text-3xl opacity-20">✍️</span>
            <p className="text-gray-300 text-sm select-none">Barmoq bilan imzo qo'ying</p>
          </div>
        )}

        {/* Saved badge */}
        {saved && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> Saqlandi
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Qayta
        </button>
        {hasDrawn && !saved && (
          <button
            type="button"
            onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" /> Tasdiqlash
          </button>
        )}
      </div>
    </div>
  );
}

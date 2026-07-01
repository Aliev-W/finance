import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, CheckCircle, RefreshCw } from 'lucide-react';

export default function PhotoCapture({ onFileSelect, label = "Rasm olish (imzo bilan)" }) {
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const clear = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileSelect(null);
  };

  return (
    <div>
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Camera className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">{label}</p>
              <p className="text-sm text-gray-400 mt-1">
                Telefonda — kamera ochiladi<br />
                Kompyuterda — fayl tanlang
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Camera className="w-3.5 h-3.5" /> Kamera
              <span className="text-gray-200">|</span>
              <Upload className="w-3.5 h-3.5" /> Yuklash
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200">
          <img src={preview} alt="Olingan rasm" className="w-full max-h-64 object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="bg-white/90 backdrop-blur text-gray-700 rounded-full p-2 shadow-md hover:bg-white transition-colors"
              title="Qayta olish"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="bg-red-500 text-white rounded-full p-2 shadow-md hover:bg-red-600 transition-colors"
              title="O'chirish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 bg-green-600/90 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Rasm tayyor
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

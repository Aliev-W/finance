import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Shield, Database, Calendar, Download, Upload,
  Lock, Unlock, Trash2, CheckCircle, AlertCircle, ChevronRight, Eye, EyeOff, LogOut
} from 'lucide-react';
import { downloadBackup, restoreBackup } from '../api';

export default function Settings() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const hasPin = !!localStorage.getItem('app_pin');

  // PIN state
  const [pinModal, setPinModal] = useState(null); // 'set' | 'change' | 'remove'
  const [pinStep, setPinStep] = useState(''); // 'verify' | 'new' | 'confirm'
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Backup state
  const [restoring, setRestoring] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null); // { type: 'success'|'error', text }

  const openPin = (mode) => {
    setPinModal(mode);
    setPinStep(mode === 'set' ? 'new' : 'verify');
    setOldPin(''); setNewPin(''); setConfirmPin('');
    setPinError(''); setPinSuccess(''); setShowPin(false);
  };

  const closePin = () => { setPinModal(null); setPinError(''); };

  const handlePinNext = () => {
    const stored = localStorage.getItem('app_pin') || '';
    setPinError('');

    if (pinStep === 'verify') {
      if (oldPin !== stored) { setPinError("Noto'g'ri PIN kod"); return; }
      if (pinModal === 'remove') {
        localStorage.removeItem('app_pin');
        sessionStorage.removeItem('unlocked');
        closePin();
        setPinSuccess('PIN kod o\'chirildi');
        return;
      }
      setPinStep('new');
    } else if (pinStep === 'new') {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setPinError("4 ta raqam kiriting"); return; }
      setPinStep('confirm');
    } else if (pinStep === 'confirm') {
      if (confirmPin !== newPin) { setPinError('PIN kodlar mos kelmadi'); return; }
      localStorage.setItem('app_pin', newPin);
      sessionStorage.setItem('unlocked', 'yes');
      closePin();
      setPinSuccess('PIN kod muvaffaqiyatli o\'rnatildi');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setRestoring(true);
    setBackupMsg(null);
    try {
      await restoreBackup(file);
      setBackupMsg({ type: 'success', text: "Ma'lumotlar tiklandi! Sahifani yangilang (F5)." });
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sozlamalar</h1>
          <p className="text-sm text-gray-400">Xavfsizlik va zaxira nusxa</p>
        </div>
      </div>

      {pinSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">{pinSuccess}</span>
        </div>
      )}

      {/* Xavfsizlik */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-700 text-sm">Xavfsizlik</span>
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2">
              {hasPin ? <Lock className="w-4 h-4 text-green-600" /> : <Unlock className="w-4 h-4 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700">PIN kod</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasPin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {hasPin ? "O'rnatilgan" : "O'rnatilmagan"}
            </span>
          </div>
          <div className="space-y-2 pb-3">
            {!hasPin && (
              <button onClick={() => openPin('set')} className="btn-primary w-full">
                <Lock className="w-4 h-4" /> PIN kod o'rnatish
              </button>
            )}
            {hasPin && (
              <>
                <button onClick={() => openPin('change')} className="btn-secondary w-full">
                  <Shield className="w-4 h-4" /> PIN kodni o'zgartirish
                </button>
                <button onClick={() => openPin('remove')} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100">
                  <Trash2 className="w-4 h-4" /> PIN kodni o'chirish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Zaxira nusxa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-700 text-sm">Zaxira nusxa</span>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-400">Barcha ma'lumotlarni kompyuterga saqlang yoki avvalgi nusxadan tiklang.</p>

          {backupMsg && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
              backupMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {backupMsg.type === 'success'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{backupMsg.text}</span>
            </div>
          )}

          <button onClick={downloadBackup} className="btn-primary w-full">
            <Download className="w-4 h-4" /> Zaxira nusxa olish (.json)
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={restoring}
            className="btn-secondary w-full"
          >
            <Upload className="w-4 h-4" />
            {restoring ? 'Tiklanmoqda...' : "Zaxira nusxadan tiklash"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleRestore}
          />
          <p className="text-xs text-gray-400">⚠️ Tiklash joriy ma'lumotlarning ustiga yozadi.</p>
        </div>
      </div>

      {/* Hisobotlar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-700 text-sm">Hisobotlar</span>
        </div>
        <button
          onClick={() => navigate('/annual')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Yillik ko'rinish</p>
              <p className="text-xs text-gray-400">12 oylik umumiy hisobot</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Chiqish */}
      <button
        onClick={() => {
          localStorage.removeItem('auth_token');
          sessionStorage.removeItem('unlocked');
          window.location.reload();
        }}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
      >
        <LogOut className="w-4 h-4" /> Tizimdan chiqish
      </button>

      {/* App info */}
      <div className="text-center text-xs text-gray-300 pb-2">
        <p>Oylik Boshqaruv Tizimi v2.0</p>
      </div>

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePin} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-1">
              {pinModal === 'set' ? 'PIN kod o\'rnatish'
                : pinModal === 'change' ? 'PIN kodni o\'zgartirish'
                : 'PIN kodni o\'chirish'}
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              {pinStep === 'verify' ? 'Joriy PIN kodingizni kiriting'
                : pinStep === 'new' ? 'Yangi 4 xonali PIN kiriting'
                : 'Yangi PIN kodni tasdiqlang'}
            </p>

            <div className="relative mb-4">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinStep === 'verify' ? oldPin : pinStep === 'new' ? newPin : confirmPin}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (pinStep === 'verify') setOldPin(v);
                  else if (pinStep === 'new') setNewPin(v);
                  else setConfirmPin(v);
                  setPinError('');
                }}
                placeholder="● ● ● ●"
                className="input-field text-center text-2xl tracking-widest pr-12 font-bold"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handlePinNext(); }}
              />
              <button
                type="button"
                onClick={() => setShowPin(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {pinError && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {pinError}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={closePin} className="btn-secondary flex-1">Bekor qilish</button>
              <button onClick={handlePinNext} className={`flex-1 ${pinModal === 'remove' && pinStep === 'verify' ? 'bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2' : 'btn-primary'}`}>
                {pinModal === 'remove' && pinStep === 'verify' ? (<><Trash2 className="w-4 h-4" /> O'chirish</>) : pinStep === 'confirm' ? 'Saqlash' : 'Keyingi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

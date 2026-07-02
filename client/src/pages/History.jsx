import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter, Image, Trash2, Loader2, AlertCircle, Receipt, X, ChevronDown,
  User, MessageSquare, Clock, Banknote, Search
} from 'lucide-react';
import { getPayments, getWorkers, deletePayment } from '../api';
import { formatMoney, formatDate, currentMonth, MONTHS_LIST, monthLabel } from '../utils';
import { ConfirmModal } from '../components/Modal';

export default function History() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(searchParams.get('month') || currentMonth());
  const [workerId, setWorkerId] = useState('');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const [viewPhoto, setViewPhoto] = useState(null); // { url, label }[]

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = month === 'all' ? { limit: 1000 } : { month };
      if (workerId) params.worker_id = workerId;
      const [data, wlist] = await Promise.all([
        getPayments(params),
        workers.length === 0 ? getWorkers({ active: 1 }) : Promise.resolve(workers)
      ]);
      setPayments(data);
      if (workers.length === 0) setWorkers(wlist);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month, workerId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try {
      await deletePayment(deleteId);
      setPayments(p => p.filter(x => x.id !== deleteId));
    } catch (e) {
      setError(e.message);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (p.worker_name || '').toLowerCase().includes(q) ||
      (p.receiver_name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q);
  });

  const totalUZS = filteredPayments.filter(p => p.currency === 'UZS').reduce((s, p) => s + p.amount, 0);
  const totalUSD = filteredPayments.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">To'lovlar tarixi</h1>
        <p className="text-sm text-gray-500">{month === 'all' ? 'Umumiy — barcha vaqt' : monthLabel(month)}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Umumiy (barcha vaqt)</option>
          {MONTHS_LIST().map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={workerId}
          onChange={e => setWorkerId(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Barcha ishchilar</option>
          {workers.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Ishchi, qabul qiluvchi yoki izoh bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {/* Summary */}
      {!loading && filteredPayments.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-600 to-blue-500 text-white">
          <p className="text-sm text-blue-100 mb-2">Jami to'langan · {filteredPayments.length} ta to'lov</p>
          <div className="space-y-1">
            {totalUZS > 0 && <p className="text-xl font-bold">{formatMoney(totalUZS, 'UZS')}</p>}
            {totalUSD > 0 && <p className="text-xl font-bold">{formatMoney(totalUSD, 'USD')}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="card flex items-center gap-3 text-red-600 bg-red-50 border-red-100">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        </div>
      )}

      {!loading && filteredPayments.length === 0 && (
        <div className="card text-center py-12">
          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">To'lovlar yo'q</p>
          <p className="text-sm text-gray-400 mt-1">
            {search.trim() && payments.length > 0
              ? "Qidiruv bo'yicha hech narsa topilmadi"
              : month === 'all' ? 'Hali to\'lovlar yo\'q' : "Bu oy uchun to'lovlar topilmadi"}
          </p>
        </div>
      )}

      {!loading && filteredPayments.length > 0 && (
        <div className="space-y-3">
          {filteredPayments.map(p => (
            <PaymentCard
              key={p.id}
              payment={p}
              onViewPhoto={() => {
                const imgs = [];
                if (p.photo_url) imgs.push({ url: p.photo_url, label: 'Rasm' });
                if (p.signature_photo) imgs.push({ url: p.signature_photo, label: 'Imzo' });
                setViewPhoto(imgs);
              }}
              onDelete={() => setDeleteId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Photo viewer */}
      {viewPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 gap-4"
          onClick={() => setViewPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2"
            onClick={() => setViewPhoto(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {viewPhoto.map((img, i) => (
            <div key={i} className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
              {viewPhoto.length > 1 && (
                <span className="text-white/60 text-xs font-medium">{img.label}</span>
              )}
              <div className="bg-white rounded-2xl p-3">
                <img
                  src={img.url}
                  alt={img.label}
                  className="max-w-full max-h-[40vh] object-contain block"
                  style={{ maxWidth: '90vw' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="To'lovni o'chirish"
        message="Bu to'lovni o'chirishni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi."
        confirmText="O'chirish"
        confirmClass="btn-danger"
      />
    </div>
  );
}

function PaymentCard({ payment: p, onViewPhoto, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
            {(p.worker_name || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{p.worker_name}</p>
            <p className="text-xs text-gray-400">{p.worker_position}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900">{formatMoney(p.amount, p.currency)}</p>
          <span className={`text-xs font-semibold ${p.payment_type === 'full' ? 'text-green-600' : 'text-yellow-600'}`}>
            {p.payment_type === 'full' ? "✅ To'liq" : '⏳ Avansi'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(p.paid_at)}
          </div>
          <div className="flex items-center gap-2">
            {(p.photo_url || p.signature_photo) && (
              <button
                onClick={e => { e.stopPropagation(); onViewPhoto(); }}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg"
              >
                <Image className="w-3.5 h-3.5" /> Rasm
              </button>
            )}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${expanded ? 'bg-gray-100' : ''}`}>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {p.receiver_name && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Qabul qildi</p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">
                    {p.receiver_name}
                    {p.receiver_relation && (
                      <span className="text-gray-400 font-normal ml-1">({p.receiver_relation})</span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {p.notes && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Izoh</p>
                  <p className="text-sm text-gray-700 leading-snug">{p.notes}</p>
                </div>
              </div>
            )}
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-500 text-sm font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> To'lovni o'chirish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

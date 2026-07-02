import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Loader2, AlertCircle, Wallet, Trash2
} from 'lucide-react';
import { getOtherPayments, getOtherPaymentsSummary, createOtherPayment, deleteOtherPayment, getWorkers } from '../api';
import { formatMoney, formatDate, currentMonth, MONTHS_LIST, OTHER_PAYMENT_CATEGORIES } from '../utils';
import { ConfirmModal } from '../components/Modal';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = () => ({
  recipient_name: '', amount: '', currency: 'UZS',
  category: 'Boshqa', notes: '', date: todayStr()
});

export default function OtherPayments() {
  const [month, setMonth] = useState(currentMonth());
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        getOtherPayments({ month }),
        getOtherPaymentsSummary(month)
      ]);
      setPayments(list);
      setSummary(sum);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getWorkers({ active: 1 }).then(setWorkers).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.recipient_name.trim()) { setFormError('Ism kiritilishi shart'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError('Miqdor kiritilishi shart'); return; }

    setSaving(true);
    setFormError(null);
    try {
      const paidAt = new Date(`${form.date}T12:00:00`).toISOString();
      await createOtherPayment({
        recipient_name: form.recipient_name.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        notes: form.notes,
        paid_at: paidAt
      });
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = deleteId;
    try {
      await deleteOtherPayment(id);
      setPayments(p => p.filter(x => x.id !== id));
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Boshqa to'lovlar</h1>
          <p className="text-sm text-gray-500">Oyliqdan tashqari to'lovlar</p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setFormError(null); }}
          className="btn-primary py-2.5 px-4 text-sm"
        >
          {showForm ? <><X className="w-4 h-4" /> Bekor qilish</> : <><Plus className="w-4 h-4" /> Qo'shish</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div>
            <label className="label">Kimga *</label>
            <input
              type="text"
              list="worker-names"
              value={form.recipient_name}
              onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
              placeholder="Ism kiriting yoki ishchini tanlang..."
              className="input-field"
            />
            <datalist id="worker-names">
              {workers.map(w => <option key={w.id} value={w.name} />)}
            </datalist>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Miqdor *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Valyuta</label>
              <select
                value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="input-field w-28"
              >
                <option value="UZS">So'm</option>
                <option value="USD">Dollar</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Turkum</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="input-field"
              >
                {OTHER_PAYMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Sana</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Izoh</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Ixtiyoriy izoh..."
              className="input-field"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</> : 'Saqlash'}
          </button>
        </form>
      )}

      {/* Month filter */}
      <select
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {MONTHS_LIST().map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Summary */}
      {!loading && summary && (summary.total_uzs > 0 || summary.total_usd > 0) && (
        <div className="card bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
          <p className="text-sm text-indigo-100 mb-2">Jami to'langan · {summary.count} ta to'lov</p>
          <div className="space-y-1">
            {summary.total_uzs > 0 && <p className="text-xl font-bold">{formatMoney(summary.total_uzs, 'UZS')}</p>}
            {summary.total_usd > 0 && <p className="text-xl font-bold">{formatMoney(summary.total_usd, 'USD')}</p>}
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

      {!loading && payments.length === 0 && (
        <div className="card text-center py-12">
          <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">To'lovlar yo'q</p>
          <p className="text-sm text-gray-400 mt-1">Bu oy uchun boshqa to'lov topilmadi</p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                    {p.recipient_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{p.recipient_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.category}</span>
                      {p.worker_name && <span className="text-xs text-blue-500 font-medium">· Ishchi</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{formatMoney(p.amount, p.currency)}</p>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> O'chirish
                  </button>
                </div>
              </div>
              {(p.notes || p.paid_at) && (
                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 gap-2">
                  <span className="flex-shrink-0">{formatDate(p.paid_at)}</span>
                  {p.notes && <span className="truncate">{p.notes}</span>}
                </div>
              )}
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

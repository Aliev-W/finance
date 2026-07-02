import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Loader2, AlertCircle, Wallet, Trash2, Calendar, CheckCircle
} from 'lucide-react';
import {
  getOtherPayments, getOtherPaymentsSummary, createOtherPayment, deleteOtherPayment, getWorkers,
  getLoanRepayments, addLoanRepayment, deleteLoanRepayment, getDebtsSummary
} from '../api';
import { formatMoney, formatDateShort, currentMonth, MONTHS_LIST, OTHER_PAYMENT_CATEGORIES } from '../utils';
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

  const [debts, setDebts] = useState([]);
  const [debtTotals, setDebtTotals] = useState({});
  const [debtsLoading, setDebtsLoading] = useState(true);

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

  const loadDebts = useCallback(async () => {
    setDebtsLoading(true);
    try {
      const d = await getDebtsSummary();
      setDebts(d.debts);
      setDebtTotals(d.totals);
    } catch (e) {
      // non-critical section, fail silently
    } finally {
      setDebtsLoading(false);
    }
  }, []);

  const loadAll = useCallback(() => { load(); loadDebts(); }, [load, loadDebts]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDebts(); }, [loadDebts]);
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
      loadAll();
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
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  };

  // Unsettled Qarz entries live in the Qarzdorlarim list above — skip them here
  // so a loan given this month doesn't show up twice.
  const unsettledDebtIds = new Set(debts.map(d => d.id));
  const visiblePayments = payments.filter(p => !(p.category === 'Qarz' && unsettledDebtIds.has(p.id)));

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

      {/* Debts overview — simple, always visible, all-time */}
      {!debtsLoading && debts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-500">Qarzdorlarim</span>
            <span className="text-xs text-gray-400">{debts.length} kishi</span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            {debtTotals.UZS > 0 && <span className="text-3xl font-bold text-gray-900 leading-tight">{formatMoney(debtTotals.UZS, 'UZS')}</span>}
            {debtTotals.USD > 0 && <span className="text-3xl font-bold text-gray-900 leading-tight">{formatMoney(debtTotals.USD, 'USD')}</span>}
          </div>
          <div className="divide-y divide-gray-100 mt-3">
            {debts.map(d => (
              <DebtRow key={d.id} debt={d} onDelete={() => setDeleteId(d.id)} onChanged={loadAll} />
            ))}
          </div>
        </div>
      )}

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

      {/* Monthly expenses — separate section from the debt tracker above */}
      <div className="pt-1">
        <p className="text-sm font-semibold text-gray-500 mb-2">Oylik xarajatlar</p>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {MONTHS_LIST().map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {!loading && summary && (summary.total_uzs > 0 || summary.total_usd > 0) && (
        <div className="card flex items-center justify-between">
          <span className="text-sm text-gray-500">{summary.count} ta to'lov</span>
          <div className="flex gap-3">
            {summary.total_uzs > 0 && <span className="font-bold text-gray-900">{formatMoney(summary.total_uzs, 'UZS')}</span>}
            {summary.total_usd > 0 && <span className="font-bold text-gray-900">{formatMoney(summary.total_usd, 'USD')}</span>}
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

      {!loading && visiblePayments.length === 0 && (
        payments.length > 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Ushbu oydagi qarzlar yuqorida, Qarzdorlarim bo'limida</p>
        ) : (
          <div className="card text-center py-10">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Bu oy uchun boshqa to'lov topilmadi</p>
          </div>
        )
      )}

      {!loading && visiblePayments.length > 0 && (
        <div className="space-y-2">
          {visiblePayments.map(p => (
            <OtherPaymentCard
              key={p.id}
              p={p}
              onDelete={() => setDeleteId(p.id)}
            />
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

// Simple debt row: name, remaining amount, one repay button. Tap the date to see history.
function DebtRow({ debt: p, onDelete, onChanged }) {
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [repayments, setRepayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayError, setRepayError] = useState(null);
  const [deleteRepayId, setDeleteRepayId] = useState(null);

  const remaining = Number(p.remaining ?? p.amount);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      setRepayments(await getLoanRepayments(p.id));
    } catch (e) {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!repayAmount || parseFloat(repayAmount) <= 0) { setRepayError('Miqdor kiritilishi shart'); return; }
    setRepaySaving(true);
    setRepayError(null);
    try {
      await addLoanRepayment(p.id, { amount: parseFloat(repayAmount), paid_at: new Date().toISOString() });
      setRepayAmount('');
      setShowRepayForm(false);
      onChanged();
    } catch (e) {
      setRepayError(e.message);
    } finally {
      setRepaySaving(false);
    }
  };

  const handleDeleteRepayment = async () => {
    const id = deleteRepayId;
    try {
      await deleteLoanRepayment(id);
      setRepayments(r => r.filter(x => x.id !== id));
      onChanged();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0 text-sm">
          {p.recipient_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{p.recipient_name}</p>
          <button type="button" onClick={toggleHistory} className="text-xs text-gray-400">
            {formatDateShort(p.paid_at)}
          </button>
        </div>
        <p className="font-bold text-gray-900 text-sm flex-shrink-0">{formatMoney(remaining, p.currency)}</p>
        <button
          type="button"
          onClick={() => { setShowRepayForm(s => !s); setRepayError(null); }}
          className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg flex-shrink-0"
        >
          Qaytarish
        </button>
      </div>

      {showRepayForm && (
        <form onSubmit={handleRepay} className="mt-3 flex flex-col gap-2 pl-12">
          {repayError && <p className="text-xs text-red-600">{repayError}</p>}
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              placeholder={`Max ${remaining}`}
              className="input-field py-2 text-sm flex-1"
            />
            <button type="submit" disabled={repaySaving} className="btn-primary py-2 px-4 text-sm flex-shrink-0">
              {repaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
            </button>
          </div>
        </form>
      )}

      {showHistory && (
        <div className="mt-3 ml-12 pl-3 border-l-2 border-gray-100 space-y-1.5">
          <p className="text-xs text-gray-400">Berilgan: {formatMoney(p.amount, p.currency)}{p.notes ? ` · ${p.notes}` : ''}</p>
          {loadingHistory ? (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /></div>
          ) : repayments.length === 0 ? (
            <p className="text-xs text-gray-400">Hali qaytarilmagan</p>
          ) : (
            repayments.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{formatDateShort(r.paid_at)} — {formatMoney(r.amount, p.currency)}</span>
                <button onClick={() => setDeleteRepayId(r.id)} className="text-red-400 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
          <button onClick={onDelete} className="text-xs text-red-500 font-medium flex items-center gap-1 pt-1.5">
            <Trash2 className="w-3 h-3" /> Qarz yozuvini o'chirish
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!deleteRepayId}
        onClose={() => setDeleteRepayId(null)}
        onConfirm={handleDeleteRepayment}
        title="Qaytarishni o'chirish"
        message="Bu qaytarish yozuvini o'chirishni tasdiqlaysizmi?"
        confirmText="O'chirish"
        confirmClass="btn-danger"
      />
    </div>
  );
}

// General card for non-loan categories and settled loans kept as history.
function OtherPaymentCard({ p, onDelete }) {
  const isLoan = p.category === 'Qarz';

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
            {p.recipient_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{p.recipient_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.category}</span>
              {p.worker_name && <span className="text-xs text-blue-500 font-medium">· Ishchi</span>}
              {isLoan && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" /> Qaytarildi
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900">{formatMoney(p.amount, p.currency)}</p>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1 ml-auto"
          >
            <Trash2 className="w-3 h-3" /> O'chirish
          </button>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5 text-xs text-gray-400">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-shrink-0">{formatDateShort(p.paid_at)}</span>
        {p.notes && <span className="truncate">· {p.notes}</span>}
      </div>
    </div>
  );
}

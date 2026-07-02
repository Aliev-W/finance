import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Loader2, AlertCircle, AlertTriangle, Wallet, Trash2, Calendar, ChevronDown, CheckCircle, Landmark
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
  category: 'Boshqa', interest_rate: '', notes: '', date: todayStr()
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
  const [overdueCount, setOverdueCount] = useState(0);
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
      setOverdueCount(d.overdue_count);
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
        interest_rate: form.category === 'Qarz' && form.interest_rate ? parseFloat(form.interest_rate) : 0,
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

      {/* Debts overview — all-time, independent of month filter */}
      {!debtsLoading && debts.length > 0 && (
        <DebtsOverview
          debts={debts}
          totals={debtTotals}
          overdueCount={overdueCount}
          onDelete={id => setDeleteId(id)}
          onChanged={loadAll}
        />
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

          {form.category === 'Qarz' && (
            <div>
              <label className="label">
                Foiz (%) <span className="text-xs text-gray-400 font-normal">(ixtiyoriy)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.interest_rate}
                onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))}
                placeholder="0"
                className="input-field"
              />
            </div>
          )}

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
            <OtherPaymentCard
              key={p.id}
              p={p}
              onDelete={() => setDeleteId(p.id)}
              onChanged={loadAll}
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

function DebtsOverview({ debts, totals, overdueCount, onDelete, onChanged }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card border-2 border-amber-100 bg-amber-50/40">
      <button type="button" onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800 text-sm">Qarzdorlik ({debts.length})</span>
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> {overdueCount} kechikkan
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <div className="mt-2 flex gap-3 flex-wrap">
        {totals.UZS > 0 && <span className="text-lg font-bold text-gray-900">{formatMoney(totals.UZS, 'UZS')}</span>}
        {totals.USD > 0 && <span className="text-lg font-bold text-gray-900">{formatMoney(totals.USD, 'USD')}</span>}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {debts.map(d => (
            <OtherPaymentCard key={d.id} p={d} onDelete={() => onDelete(d.id)} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function OtherPaymentCard({ p, onDelete, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [repayments, setRepayments] = useState([]);
  const [loadingRepayments, setLoadingRepayments] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNote, setRepayNote] = useState('');
  const [repayDate, setRepayDate] = useState(todayStr());
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayError, setRepayError] = useState(null);
  const [deleteRepayId, setDeleteRepayId] = useState(null);

  const isLoan = p.category === 'Qarz';
  const remaining = Number(p.remaining ?? p.amount);
  const hasInterest = isLoan && Number(p.interest_rate || 0) > 0;
  const isSettled = isLoan && remaining <= 0.01;

  const loadRepayments = async () => {
    setLoadingRepayments(true);
    try {
      setRepayments(await getLoanRepayments(p.id));
    } catch (e) {
      // ignore, list just stays empty
    } finally {
      setLoadingRepayments(false);
    }
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadRepayments();
  };

  const handleAddRepayment = async (e) => {
    e.preventDefault();
    if (!repayAmount || parseFloat(repayAmount) <= 0) { setRepayError('Miqdor kiritilishi shart'); return; }
    setRepaySaving(true);
    setRepayError(null);
    try {
      const paidAt = new Date(`${repayDate}T12:00:00`).toISOString();
      await addLoanRepayment(p.id, { amount: parseFloat(repayAmount), notes: repayNote, paid_at: paidAt });
      setRepayAmount(''); setRepayNote(''); setRepayDate(todayStr());
      setShowRepayForm(false);
      setExpanded(true);
      await loadRepayments();
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
    <div className={`card ${p.is_overdue ? 'border-red-200 bg-red-50/30' : ''}`}>
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
              {isSettled && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" /> Qaytarildi
                </span>
              )}
              {p.is_overdue && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> {p.days_old} kun kechikdi
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

      {isLoan && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          {hasInterest && (
            <p className="text-xs text-gray-400 mb-1.5">
              Asl qarz: {formatMoney(p.amount, p.currency)} + {p.interest_rate}% foiz = {formatMoney(p.total_due, p.currency)}
            </p>
          )}
          <div className="flex items-center justify-between">
            {isSettled ? (
              <span className="text-xs text-green-600 font-semibold">To'liq qaytarildi</span>
            ) : (
              <span className="text-xs text-amber-600 font-semibold">
                Qoldi: {formatMoney(remaining, p.currency)}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {!isSettled && (
                <button
                  type="button"
                  onClick={() => { setShowRepayForm(s => !s); setRepayError(null); }}
                  className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Qaytarish
                </button>
              )}
              <button type="button" onClick={toggleExpand} className="text-gray-400 p-1">
                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showRepayForm && (
            <form onSubmit={handleAddRepayment} className="mt-3 space-y-2 bg-gray-50 rounded-xl p-3">
              {repayError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {repayError}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Qaytarilayotgan miqdor <span className="font-semibold text-gray-600">({p.currency === 'USD' ? 'dollarda' : "so'mda"})</span> · Max {formatMoney(remaining, p.currency)}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={repayAmount}
                    onChange={e => setRepayAmount(e.target.value)}
                    placeholder="0"
                    className="input-field py-2 text-sm pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                    {p.currency === 'USD' ? '$' : "so'm"}
                  </span>
                </div>
                <input
                  type="date"
                  value={repayDate}
                  onChange={e => setRepayDate(e.target.value)}
                  className="input-field py-2 text-sm w-36"
                />
              </div>
              <input
                type="text"
                value={repayNote}
                onChange={e => setRepayNote(e.target.value)}
                placeholder="Izoh (ixtiyoriy)..."
                className="input-field py-2 text-sm"
              />
              <button type="submit" disabled={repaySaving} className="btn-primary w-full py-2 text-sm">
                {repaySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Saqlash'}
              </button>
            </form>
          )}

          {expanded && (
            <div className="mt-3 space-y-1.5">
              {loadingRepayments ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
              ) : repayments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Hali qaytarish yo'q</p>
              ) : (
                repayments.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-700">{formatMoney(r.amount, p.currency)}</span>
                      <span className="text-gray-400 ml-2">{formatDateShort(r.paid_at)}</span>
                      {r.notes && <div className="text-gray-400 truncate">{r.notes}</div>}
                    </div>
                    <button onClick={() => setDeleteRepayId(r.id)} className="text-red-400 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
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

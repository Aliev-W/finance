import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, AlertCircle, HandCoins, Trash2, ChevronDown } from 'lucide-react';
import {
  createOtherPayment, deleteOtherPayment, getWorkers,
  getLoanRepayments, addLoanRepayment, deleteLoanRepayment, getDebtsSummary
} from '../api';
import { formatMoney, formatDateShort, monthLabel, MONTHS_LIST } from '../utils';
import { ConfirmModal } from '../components/Modal';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = () => ({
  recipient_name: '', amount: '', currency: 'UZS', notes: '', date: todayStr()
});

export default function OtherPayments() {
  const [workers, setWorkers] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState(null);

  const [debts, setDebts] = useState([]);
  const [debtTotals, setDebtTotals] = useState({});
  const [debtsLoading, setDebtsLoading] = useState(true);
  const [debtMonthFilter, setDebtMonthFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadDebts = useCallback(async () => {
    setDebtsLoading(true);
    try {
      const d = await getDebtsSummary();
      setDebts(d.debts);
      setDebtTotals(d.totals);
      setError(null);
    } catch (e) {
      setError("Qarzlar ro'yxatini yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.");
    } finally {
      setDebtsLoading(false);
    }
  }, []);

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
        category: 'Qarz',
        notes: form.notes,
        paid_at: paidAt
      });
      setForm(emptyForm());
      setShowForm(false);
      loadDebts();
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
      loadDebts();
    } catch (e) {
      setError("O'chirib bo'lmadi: " + e.message);
    }
  };

  const filteredDebts = debtMonthFilter === 'all'
    ? debts
    : debts.filter(d => d.paid_at.slice(0, 7) === debtMonthFilter);
  const filteredDebtTotals = {};
  filteredDebts.forEach(d => {
    filteredDebtTotals[d.currency] = (filteredDebtTotals[d.currency] || 0) + d.remaining;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Qarzlar</h1>
          <p className="text-sm text-gray-500">Kimga qancha qarz berganingiz</p>
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

          <div>
            <label className="label">Sana</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="input-field"
            />
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

      {error && (
        <div className="card flex items-center gap-3 text-red-600 bg-red-50 border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {debtsLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        </div>
      )}

      {!debtsLoading && !error && debts.length === 0 && (
        <div className="card text-center py-10">
          <HandCoins className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Hali qarzdorlar yo'q</p>
        </div>
      )}

      {/* Debts overview — filterable by the month a loan was given, all-time by default */}
      {!debtsLoading && debts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3 gap-2">
            <span className="text-sm font-semibold text-gray-500 flex-shrink-0">Qarzdorlarim</span>
            <select
              value={debtMonthFilter}
              onChange={e => setDebtMonthFilter(e.target.value)}
              className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Barcha vaqt</option>
              {MONTHS_LIST().map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            {filteredDebtTotals.UZS > 0 && <span className="text-3xl font-bold text-gray-900 leading-tight">{formatMoney(filteredDebtTotals.UZS, 'UZS')}</span>}
            {filteredDebtTotals.USD > 0 && <span className="text-3xl font-bold text-gray-900 leading-tight">{formatMoney(filteredDebtTotals.USD, 'USD')}</span>}
            {filteredDebtTotals.UZS === undefined && filteredDebtTotals.USD === undefined && (
              <span className="text-lg font-semibold text-gray-500">Qarz yo'q</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredDebts.length} kishi qarzdor{debtMonthFilter !== 'all' ? ` · ${monthLabel(debtMonthFilter)}da berilgan` : ''}
          </p>

          {filteredDebts.length > 0 && (
            <div className="divide-y divide-gray-100 mt-3">
              {filteredDebts.map(d => (
                <DebtRow key={d.id} debt={d} onDelete={() => setDeleteId(d.id)} onChanged={loadDebts} />
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Qarz yozuvini o'chirish"
        message="Bu qarz yozuvini o'chirishni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi."
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
  const [repayCurrency, setRepayCurrency] = useState(p.currency);
  const [repayEquivalent, setRepayEquivalent] = useState('');
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayError, setRepayError] = useState(null);
  const [deleteRepayId, setDeleteRepayId] = useState(null);

  const remaining = Number(p.remaining ?? p.amount);
  const originalAmount = Number(p.amount);
  const hasPartialRepayment = remaining > 0.01 && remaining < originalAmount - 0.01;
  const otherCurrency = p.currency === 'USD' ? 'UZS' : 'USD';
  const isCrossCurrency = repayCurrency !== p.currency;

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
    if (repaySaving) return;
    if (!repayAmount || parseFloat(repayAmount) <= 0) { setRepayError('Miqdor kiritilishi shart'); return; }
    if (isCrossCurrency && (!repayEquivalent || parseFloat(repayEquivalent) <= 0)) {
      setRepayError(`${p.currency === 'USD' ? '$' : "so'm"} hisobida nechaga tengligini kiriting`);
      return;
    }
    const reductionAmount = isCrossCurrency ? parseFloat(repayEquivalent) : parseFloat(repayAmount);
    if (reductionAmount > remaining + 0.01) {
      setRepayError(`Miqdor qolgan qarzdan (${formatMoney(remaining, p.currency)}) oshib ketmasligi kerak`);
      return;
    }
    setRepaySaving(true);
    setRepayError(null);
    try {
      const notes = isCrossCurrency
        ? `${formatMoney(parseFloat(repayAmount), repayCurrency)} qabul qilindi`
        : '';
      await addLoanRepayment(p.id, { amount: reductionAmount, notes, paid_at: new Date().toISOString() });
      setRepayAmount('');
      setRepayEquivalent('');
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
        <button type="button" onClick={toggleHistory} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0 text-sm">
            {p.recipient_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{p.recipient_name}</p>
            <p className="text-xs text-gray-400">{formatDateShort(p.paid_at)}</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-300 flex-shrink-0 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </button>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{formatMoney(remaining, p.currency)}</p>
          {hasPartialRepayment && (
            <p className="text-[11px] text-gray-400 leading-tight">{formatMoney(originalAmount, p.currency)} dan</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowRepayForm(s => !s);
            setRepayError(null);
            setRepayAmount('');
            setRepayCurrency(p.currency);
            setRepayEquivalent('');
          }}
          className={`text-xs font-semibold px-3 py-2.5 rounded-lg flex-shrink-0 transition-colors ${
            showRepayForm ? 'bg-blue-600 text-white' : 'text-blue-600 bg-blue-50'
          }`}
        >
          {showRepayForm ? 'Bekor qilish' : 'Qaytarish'}
        </button>
      </div>

      {showRepayForm && (
        <form onSubmit={handleRepay} className="mt-3 flex flex-col gap-2 pl-12 page-enter">
          {repayError && <p className="text-xs text-red-600">{repayError}</p>}
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              placeholder={isCrossCurrency ? '0' : `Max ${formatMoney(remaining, p.currency)}`}
              className="input-field py-2 text-sm flex-1"
            />
            <select
              value={repayCurrency}
              onChange={e => { setRepayCurrency(e.target.value); setRepayEquivalent(''); }}
              className="input-field py-2 text-sm w-24 flex-shrink-0"
            >
              <option value={p.currency}>{p.currency === 'USD' ? '$' : "so'm"}</option>
              <option value={otherCurrency}>{otherCurrency === 'USD' ? '$' : "so'm"}</option>
            </select>
          </div>

          {isCrossCurrency && (
            <div>
              <p className="text-xs text-gray-400 mb-1">
                Bu {p.currency === 'USD' ? 'dollarda' : "so'mda"} nechaga teng? · Max {formatMoney(remaining, p.currency)}
              </p>
              <input
                type="number"
                min="0"
                step="any"
                value={repayEquivalent}
                onChange={e => setRepayEquivalent(e.target.value)}
                placeholder="0"
                className="input-field py-2 text-sm w-full"
              />
            </div>
          )}

          <button type="submit" disabled={repaySaving} className="btn-primary py-2 text-sm">
            {repaySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Saqlash'}
          </button>
        </form>
      )}

      {showHistory && (
        <div className="mt-3 ml-12 pl-3 border-l-2 border-gray-100 space-y-2.5 page-enter">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              <span className="text-gray-400">Qarz berildi</span> · {formatDateShort(p.paid_at)}
            </span>
            <span className="font-semibold text-gray-700">{formatMoney(originalAmount, p.currency)}</span>
          </div>
          {p.notes && <p className="text-xs text-gray-400 -mt-1.5">{p.notes}</p>}

          {loadingHistory ? (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /></div>
          ) : repayments.length === 0 ? (
            <p className="text-xs text-gray-400">Hali qaytarilmagan</p>
          ) : (
            repayments.map(r => (
              <div key={r.id} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    <span className="text-green-600">Qaytardi</span> · {formatDateShort(r.paid_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">{formatMoney(r.amount, p.currency)}</span>
                    <button onClick={() => setDeleteRepayId(r.id)} className="text-red-400 p-2 -m-2 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {r.notes && <p className="text-gray-400 mt-0.5">{r.notes}</p>}
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

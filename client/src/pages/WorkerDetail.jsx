import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Phone, UserX, UserCheck,
  CircleDollarSign, ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock, XCircle, FileText,
  Wallet, AlertTriangle
} from 'lucide-react';
import { getWorker, getWorkerReport, toggleWorkerActive, openPaymentReceipt, getOtherPayments } from '../api';
import { formatMoney, formatDate, formatDateShort, monthLabel, currentMonth, prevMonth, nextMonth } from '../utils';
import { ConfirmModal } from '../components/Modal';

export default function WorkerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [worker, setWorker] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [otherPayments, setOtherPayments] = useState([]);
  const [otherLoading, setOtherLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, r] = await Promise.all([
        getWorker(id),
        getWorkerReport(id, selectedMonth)
      ]);
      setWorker(w);
      setReport(r);
    } catch (e) {
      navigate('/workers');
    } finally {
      setLoading(false);
    }
  }, [id, selectedMonth, navigate]);

  const loadOther = useCallback(async () => {
    setOtherLoading(true);
    try {
      setOtherPayments(await getOtherPayments({ worker_id: id }));
    } catch (e) {
      // non-critical section, fail silently
    } finally {
      setOtherLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOther(); }, [loadOther]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const updated = await toggleWorkerActive(id);
      setWorker(updated);
    } finally {
      setToggling(false);
    }
  };

  const monthPayments = report?.payments || [];
  const totalPaidUZS = monthPayments.filter(p => p.currency === 'UZS').reduce((s, p) => s + p.amount, 0);
  const totalPaidUSD = monthPayments.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0);
  const hasFull = monthPayments.some(p => p.payment_type === 'full');

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (!worker) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/workers')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{worker.name}</h1>
        <button
          onClick={() => navigate(`/workers/${id}/edit`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm"
        >
          <Edit className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Worker Info Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0 ${
            worker.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {worker.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-lg">{worker.name}</h2>
            <p className="text-gray-500">{worker.position || 'Lavozim ko\'rsatilmagan'}</p>
            <span className={worker.is_active ? 'badge-green' : 'badge-gray'}>
              {worker.is_active ? '● Faol' : '● Nofaol'}
            </span>
          </div>
        </div>

        {worker.phone && (
          <a href={`tel:${worker.phone}`} className="flex items-center gap-2 text-blue-600 text-sm font-medium">
            <Phone className="w-4 h-4" /> {worker.phone}
          </a>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
          <div className="text-sm text-gray-500">Oylik maosh</div>
          <div className="font-bold text-gray-900">{formatMoney(worker.salary_amount, worker.salary_currency)}</div>
        </div>

        {worker.notes && (
          <p className="text-sm text-gray-500 italic">{worker.notes}</p>
        )}
      </div>

      {/* Family Members */}
      {worker.family_members?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">👨‍👩‍👧 Oila azolari</h3>
          <div className="space-y-2">
            {worker.family_members.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.relationship}{m.is_primary ? ' · Asosiy' : ''}</p>
                </div>
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="text-blue-500">
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(`/workers/${id}/edit`)}
            className="mt-3 text-xs text-blue-600 font-medium"
          >
            + Oila azosi qo'shish
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!!worker.is_active && (
          <button
            onClick={() => navigate(`/pay?worker=${id}&month=${selectedMonth}`)}
            className="btn-primary flex-1"
          >
            <CircleDollarSign className="w-5 h-5" />
            Oylik to'lash
          </button>
        )}
        <button
          onClick={() => setShowToggleConfirm(true)}
          className={`${worker.is_active ? 'btn-secondary' : 'btn-success'} flex-1`}
          disabled={toggling}
        >
          {worker.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
          {worker.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
        </button>
      </div>

      {/* Month Payment Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 text-sm">To'lovlar tarixi</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-blue-600 min-w-[90px] text-center">{monthLabel(selectedMonth)}</span>
            <button onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
              disabled={selectedMonth >= currentMonth()}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Month status */}
        {/* Remaining salary calculation */}
        {(() => {
          const remainingSalary = worker.salary_currency === 'UZS'
            ? worker.salary_amount - totalPaidUZS
            : worker.salary_amount - totalPaidUSD;
          const showRemaining = !hasFull && monthPayments.length > 0 && remainingSalary > 0;

          return monthPayments.length === 0 ? (
            <div className="flex items-center gap-3 bg-red-50 rounded-xl p-4">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700">{monthLabel(selectedMonth)} — To'lanmagan</p>
                <p className="text-xs text-red-500 mt-0.5">Bu oy hali oylik berilmagan</p>
              </div>
            </div>
          ) : hasFull ? (
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-700">{monthLabel(selectedMonth)} — To'liq to'landi</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {totalPaidUZS > 0 && formatMoney(totalPaidUZS, 'UZS')}
                  {totalPaidUZS > 0 && totalPaidUSD > 0 && ' + '}
                  {totalPaidUSD > 0 && formatMoney(totalPaidUSD, 'USD')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-700">{monthLabel(selectedMonth)} — Qisman to'landi</p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    Berildi: {totalPaidUZS > 0 && formatMoney(totalPaidUZS, 'UZS')}{totalPaidUZS > 0 && totalPaidUSD > 0 && ' + '}{totalPaidUSD > 0 && formatMoney(totalPaidUSD, 'USD')}
                  </p>
                </div>
              </div>
              {showRemaining && (
                <div className="mt-3 pt-3 border-t border-yellow-200 flex items-center justify-between">
                  <span className="text-sm text-yellow-700 font-medium">Qolgan oylik:</span>
                  <span className="text-base font-bold text-yellow-800">{formatMoney(remainingSalary, worker.salary_currency)}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Payment list */}
        {monthPayments.length > 0 && (
          <div className="space-y-2">
            {monthPayments.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                {/* Top row: type badge + amount + PDF */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    p.payment_type === 'full' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.payment_type === 'full' ? "To'liq" : 'Avansi'}
                  </span>
                  <span className="font-bold text-gray-900 text-sm flex-1">{formatMoney(p.amount, p.currency)}</span>
                  <button
                    onClick={() => openPaymentReceipt(p.id)}
                    title="PDF Kvitansiya"
                    className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>

                {/* Receiver */}
                {p.receiver_name && (
                  <p className="text-xs text-gray-500">
                    Qabul qildi: <span className="font-medium">{p.receiver_name}</span>
                    {p.receiver_relation && ` (${p.receiver_relation})`}
                  </p>
                )}

                <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>

                {/* Attachments row */}
                {(p.signature_photo || p.photo_url) && (
                  <div className="flex items-center gap-2 pt-1">
                    {p.signature_photo && (
                      <a href={p.signature_photo} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 transition-colors">
                        <img src={p.signature_photo} alt="Imzo"
                          className="w-14 h-10 object-contain bg-gray-50 flex-shrink-0 border-r border-gray-100" />
                        <span className="text-xs text-gray-500 px-1 truncate">✍️ Imzo</span>
                      </a>
                    )}
                    {p.photo_url && (
                      <a href={p.photo_url} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 transition-colors">
                        <img src={p.photo_url} alt="Rasm"
                          className="w-14 h-10 object-cover bg-gray-50 flex-shrink-0 border-r border-gray-100" />
                        <span className="text-xs text-gray-500 px-1 truncate">📷 Rasm</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other payments (bonus/loan/etc) — unified view outside salary */}
      {!otherLoading && otherPayments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" /> Boshqa to'lovlar
          </h3>
          <div className="space-y-2">
            {otherPayments.map(p => {
              const isLoan = p.category === 'Qarz';
              const remaining = Number(p.remaining ?? p.amount);
              const isSettled = isLoan && remaining <= 0.01;
              return (
                <div key={p.id} className={`bg-gray-50 rounded-xl p-3 ${p.is_overdue ? 'border border-red-200 bg-red-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">{p.category}</span>
                      <span className="text-xs text-gray-400 truncate">{formatDateShort(p.paid_at)}</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm flex-shrink-0">{formatMoney(p.amount, p.currency)}</span>
                  </div>
                  {isLoan && (
                    <div className="mt-1.5 flex items-center justify-between flex-wrap gap-1">
                      {isSettled ? (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Qaytarildi
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold">Qoldi: {formatMoney(remaining, p.currency)}</span>
                      )}
                      {p.is_overdue && (
                        <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {p.days_old} kun kechikdi
                        </span>
                      )}
                    </div>
                  )}
                  {p.notes && <p className="text-xs text-gray-400 mt-1 truncate">{p.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        open={showToggleConfirm}
        onClose={() => setShowToggleConfirm(false)}
        onConfirm={handleToggleActive}
        title={worker.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
        message={worker.is_active
          ? `${worker.name}ni nofaol qilishni tasdiqlaysizmi? Oylik berish to'xtatiladi.`
          : `${worker.name}ni faollashtirmoqchimisiz?`}
        confirmText={worker.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
        confirmClass={worker.is_active ? 'btn-danger' : 'btn-success'}
      />
    </div>
  );
}

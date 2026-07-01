import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Users, TrendingUp,
  DollarSign, Banknote, AlertCircle, Loader2, RefreshCw,
  ArrowRight, Phone, X, FileSpreadsheet, Printer, Bell, Settings
} from 'lucide-react';
import { getMonthlyReport, downloadExcel, openPrintReport } from '../api';
import { currentMonth, monthLabel, prevMonth, nextMonth, formatMoney, formatDate } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [month, setMonth] = useState(() => {
    const m = searchParams.get('month');
    return (m && /^\d{4}-\d{2}$/.test(m)) ? m : currentMonth();
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await getMonthlyReport(month);
      setData(report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const canGoNext = month < currentMonth();

  // Month-end alert: last 5 days of current month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isMonthEnd = today.getDate() >= daysInMonth - 4;
  const showAlert = isMonthEnd && month === currentMonth() && data?.unpaid > 0;

  const openModal = (type) => {
    if (!data) return;
    const all = data.all_workers || [];
    const maps = {
      all:     { title: `Barcha faol ishchilar (${data.total_active})`, workers: all },
      full:    { title: `To'liq to'langan (${data.paid_full})`,         workers: all.filter(w => w.status === 'full') },
      partial: { title: `Qisman to'langan (${data.paid_partial})`,      workers: all.filter(w => w.status === 'partial') },
      unpaid:  { title: `To'lanmaganlar (${data.unpaid})`,              workers: all.filter(w => w.status === 'unpaid') },
    };
    if (maps[type]) setModal({ type, ...maps[type] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bosh sahifa</h1>
          <p className="text-sm text-gray-400">Oylik to'lovlar holati</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={load} className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Month-end warning */}
      {showAlert && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Oy tugayapti!</p>
            <p className="text-xs text-amber-600 mt-0.5">{data.unpaid} ta ishchiga hali oylik berilmagan. Oy tugashiga {daysInMonth - today.getDate()} kun qoldi.</p>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between px-2 py-3">
        <button onClick={() => setMonth(prevMonth(month))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-900 text-lg leading-tight">{monthLabel(month)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{month === currentMonth() ? '● Joriy oy' : 'O\'tgan oy'}</div>
        </div>
        <button onClick={() => canGoNext && setMonth(nextMonth(month))} disabled={!canGoNext}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-25">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {data.total_active > 0 && (
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>To'lov holati — {monthLabel(month)}</span>
                  <span>{data.total_active > 0 ? Math.round((data.paid_full + data.paid_partial) / data.total_active * 100) : 0}% bajarildi</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500 transition-all" style={{width: `${data.total_active ? data.paid_full/data.total_active*100 : 0}%`}} />
                  <div className="h-full bg-amber-400 transition-all" style={{width: `${data.total_active ? data.paid_partial/data.total_active*100 : 0}%`}} />
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>To'liq</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Qisman</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/>To'lanmagan</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2">
              <StatCard dotColor="bg-blue-500"  value={data.total_active}  label="Faol ishchilar"  sub="Jami ro'yxatda"    border="border-r border-b border-gray-50" onClick={() => openModal('all')} />
              <StatCard dotColor="bg-green-500" value={data.paid_full}     label="To'liq to'landi" sub="Oylik to'liq berildi" border="border-b border-gray-50" onClick={() => openModal('full')} />
              <StatCard dotColor="bg-amber-400" value={data.paid_partial}  label="Qisman to'landi" sub="Avansi berilgan"   border="border-r border-gray-50" onClick={() => openModal('partial')} />
              <StatCard dotColor="bg-red-400"   value={data.unpaid}        label="To'lanmagan"     sub="Kutilmoqda"        border="" onClick={() => openModal('unpaid')} />
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => openPrintReport(month)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-500" /> Chop etish
            </button>
            <button
              onClick={() => downloadExcel(month)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
            </button>
          </div>

          {/* Money Summary */}
          {(data.total_uzs > 0 || data.total_usd > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-600 text-sm">Jami to'langan</span>
              </div>
              <div className="space-y-2.5">
                {data.total_uzs > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Banknote className="w-4 h-4" /> So'm
                    </div>
                    <span className="font-bold text-gray-900 text-base">{formatMoney(data.total_uzs, 'UZS')}</span>
                  </div>
                )}
                {data.total_usd > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <DollarSign className="w-4 h-4" /> Dollar
                    </div>
                    <span className="font-bold text-gray-900 text-base">{formatMoney(data.total_usd, 'USD')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unpaid + Partial quick list */}
          {(data.unpaid_workers?.length > 0 || data.partial_workers?.length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">Oylik berilishi kerak</span>
                <span className="text-xs text-gray-400">{(data.unpaid_workers?.length || 0) + (data.partial_workers?.length || 0)} ta</span>
              </div>
              <div>
                {[...(data.partial_workers || []), ...(data.unpaid_workers || [])].map((w, i, arr) => (
                  <div key={w.id} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      w.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {w.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{w.name}</p>
                      <p className="text-xs text-gray-400 truncate">{w.position || '—'}</p>
                      {w.status === 'partial' && w.salary_currency && (
                        <p className="text-xs text-amber-600 font-medium">
                          Qoldi: {formatMoney(
                            w.salary_amount - (w.salary_currency === 'UZS' ? w.totalPaidUZS : w.totalPaidUSD),
                            w.salary_currency
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/pay?worker=${w.id}&month=${month}`)}
                        className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
                      >
                        To'lash
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {data.recent_payments?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">So'nggi to'lovlar</span>
                <button onClick={() => navigate(`/history?month=${month}`)}
                  className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  Hammasi <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div>
                {data.recent_payments.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < data.recent_payments.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center font-bold text-green-700 text-sm flex-shrink-0">
                      {(p.worker_name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.worker_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-sm">{formatMoney(p.amount, p.currency)}</p>
                      <span className={`text-xs font-medium ${p.payment_type === 'full' ? 'text-green-600' : 'text-amber-600'}`}>
                        {p.payment_type === 'full' ? "✓ To'liq" : '⏳ Avansi'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.total_active === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
              <Users className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">Ishchilar yo'q</p>
              <p className="text-sm text-gray-400 mt-1">Avval ishchi qo'shing</p>
              <button onClick={() => navigate('/workers/new')} className="btn-primary mt-5 mx-auto w-fit">
                Ishchi qo'shish
              </button>
            </div>
          )}
        </>
      )}

      {modal && (
        <WorkerListModal
          title={modal.title}
          workers={modal.workers}
          type={modal.type}
          month={month}
          onClose={() => setModal(null)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

function StatCard({ dotColor, value, label, sub, border, onClick }) {
  return (
    <button onClick={onClick} className={`p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-xs text-gray-400 font-medium truncate">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 leading-none mb-1">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{sub}</span>
        <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
      </div>
    </button>
  );
}

function WorkerListModal({ title, workers, type, month, onClose, onNavigate }) {
  const colors = {
    all:     { avatar: 'bg-blue-100 text-blue-700',    badge: 'bg-blue-50 text-blue-600' },
    full:    { avatar: 'bg-green-100 text-green-700',  badge: 'bg-green-50 text-green-700' },
    partial: { avatar: 'bg-amber-100 text-amber-700',  badge: 'bg-amber-50 text-amber-700' },
    unpaid:  { avatar: 'bg-red-100 text-red-600',      badge: 'bg-red-50 text-red-600' },
  };
  const c = colors[type] || colors.all;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{month} · {workers.length} ta</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-6">
          {workers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Ishchilar yo'q</p>
            </div>
          ) : (
            workers.map((w, i) => (
              <div key={w.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < workers.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${c.avatar}`}>
                  {w.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onNavigate(`/workers/${w.id}`); onClose(); }}>
                  <p className="font-semibold text-gray-900 text-sm">{w.name}</p>
                  <p className="text-xs text-gray-400 truncate">{w.position || '—'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{formatMoney(w.salary_amount, w.salary_currency)}</span>
                    {type !== 'all' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                        {type === 'full' ? "✓ To'liq" : type === 'partial' ? '⏳ Qisman' : "✗ To'lanmadi"}
                      </span>
                    )}
                    {w.status === 'partial' && (
                      <span className="text-xs text-amber-600 font-medium">
                        Qoldi: {formatMoney(
                          w.salary_amount - (w.salary_currency === 'UZS' ? w.totalPaidUZS : w.totalPaidUSD),
                          w.salary_currency
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {w.phone && (
                    <a href={`tel:${w.phone}`} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200">
                      <Phone className="w-3.5 h-3.5 text-gray-600" />
                    </a>
                  )}
                  {(type === 'unpaid' || type === 'partial') && (
                    <button
                      onClick={() => { onNavigate(`/pay?worker=${w.id}&month=${month}`); onClose(); }}
                      className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      To'lash
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


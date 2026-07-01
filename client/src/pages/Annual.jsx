import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, TrendingUp, Banknote, DollarSign } from 'lucide-react';
import { getAnnualReport } from '../api';
import { formatMoney } from '../utils';

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

export default function Annual() {
  const navigate = useNavigate();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentYear = String(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAnnualReport(year);
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const yearTotalUZS = data?.months.reduce((s, m) => s + m.total_uzs, 0) || 0;
  const yearTotalUSD = data?.months.reduce((s, m) => s + m.total_usd, 0) || 0;
  const yearPaid = data?.months.reduce((s, m) => s + m.paid_full + m.paid_partial, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate('/settings')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Yillik ko'rinish</h1>
          <p className="text-sm text-gray-400">12 oylik umumiy hisobot</p>
        </div>
      </div>

      {/* Year Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between px-3 py-3">
        <button onClick={() => setYear(y => String(parseInt(y) - 1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-900 text-2xl">{year}</div>
          <div className="text-xs text-gray-400">{year === currentYear ? '● Joriy yil' : 'O\'tgan yil'}</div>
        </div>
        <button onClick={() => setYear(y => String(parseInt(y) + 1))} disabled={year >= currentYear}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-25">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : (
        <>
          {/* Year totals */}
          {(yearTotalUZS > 0 || yearTotalUSD > 0) && (
            <div className="bg-blue-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3 opacity-80">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{year} yil jami to'lovlar</span>
              </div>
              <div className="space-y-1.5">
                {yearTotalUZS > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 opacity-80"><Banknote className="w-3.5 h-3.5" /><span className="text-sm">So'm</span></div>
                    <span className="font-bold text-lg">{formatMoney(yearTotalUZS, 'UZS')}</span>
                  </div>
                )}
                {yearTotalUSD > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 opacity-80"><DollarSign className="w-3.5 h-3.5" /><span className="text-sm">Dollar</span></div>
                    <span className="font-bold text-lg">{formatMoney(yearTotalUSD, 'USD')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 12-month grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.months || []).map((m, idx) => {
              const hasData = m.total_paid > 0;
              const paidPct = m.total_active > 0 ? (m.paid_full / m.total_active * 100) : 0;
              const partialPct = m.total_active > 0 ? (m.paid_partial / m.total_active * 100) : 0;
              const isFuture = m.month > `${currentYear}-${String(new Date().getMonth() + 1).padStart(2,'0')}`;
              const isCurrent = m.month === `${currentYear}-${String(new Date().getMonth() + 1).padStart(2,'0')}`;

              return (
                <button
                  key={m.month}
                  onClick={() => navigate(`/?month=${m.month}`)}
                  className={`bg-white rounded-2xl border shadow-sm p-4 text-left transition-all hover:shadow-md active:scale-[0.98] ${
                    isCurrent ? 'border-blue-200 ring-1 ring-blue-300' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-base ${isFuture ? 'text-gray-300' : 'text-gray-900'}`}>
                      {MONTHS_UZ[idx]}
                    </span>
                    {isCurrent && <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Joriy</span>}
                  </div>

                  {isFuture ? (
                    <p className="text-xs text-gray-300">Hali kelmagan</p>
                  ) : (
                    <>
                      {/* Progress */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2">
                        <div className="h-full bg-green-500" style={{width: `${paidPct}%`}} />
                        <div className="h-full bg-amber-400" style={{width: `${partialPct}%`}} />
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 font-semibold">{m.paid_full} to'liq</span>
                        {m.paid_partial > 0 && <span className="text-amber-600">{m.paid_partial} qisman</span>}
                        {m.unpaid > 0 && <span className="text-red-400">{m.unpaid} to'lanmadi</span>}
                      </div>

                      {(m.total_uzs > 0 || m.total_usd > 0) && (
                        <div className="mt-2 pt-2 border-t border-gray-50 space-y-0.5">
                          {m.total_uzs > 0 && <p className="text-xs text-gray-500 font-medium">{formatMoney(m.total_uzs, 'UZS')}</p>}
                          {m.total_usd > 0 && <p className="text-xs text-gray-500 font-medium">{formatMoney(m.total_usd, 'USD')}</p>}
                        </div>
                      )}

                      {!hasData && (
                        <p className="text-xs text-gray-300 mt-1">To'lovlar yo'q</p>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

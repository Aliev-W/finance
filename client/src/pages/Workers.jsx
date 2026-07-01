import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, ChevronRight, Phone, UserX, UserCheck, Loader2, AlertCircle
} from 'lucide-react';
import { getWorkers, getMonthlyReport } from '../api';
import { formatMoney, currentMonth } from '../utils';

export default function Workers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [payStatus, setPayStatus] = useState({}); // workerId -> 'full'|'partial'|'unpaid'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active'); // active | inactive

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getWorkers({ active: tab === 'active' ? 1 : 0 });
      setWorkers(list);
      if (tab === 'active') {
        const report = await getMonthlyReport(currentMonth()).catch(() => null);
        if (report?.all_workers) {
          const map = {};
          report.all_workers.forEach(w => { map[w.id] = w.status; });
          setPayStatus(map);
        }
      } else {
        setPayStatus({});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.phone || '').includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ishchilar</h1>
          <p className="text-sm text-gray-500">{workers.length} ta ishchi</p>
        </div>
        <button
          onClick={() => navigate('/workers/new')}
          className="btn-primary py-2.5 px-4 text-sm"
        >
          <Plus className="w-4 h-4" />
          Qo'shish
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Faol
        </button>
        <button
          onClick={() => setTab('inactive')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'inactive' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Nofaol
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Ism, lavozim yoki telefon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="card flex items-center gap-3 text-red-600 bg-red-50 border-red-100">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card text-center py-10">
          {search ? (
            <>
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="font-semibold text-gray-500">Topilmadi</p>
              <p className="text-sm text-gray-400">Qidiruv natijasi bo'sh</p>
            </>
          ) : tab === 'active' ? (
            <>
              <Plus className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="font-semibold text-gray-500">Ishchilar yo'q</p>
              <p className="text-sm text-gray-400 mt-1">Birinchi ishchingizni qo'shing</p>
              <button onClick={() => navigate('/workers/new')} className="btn-primary mt-4 mx-auto w-fit">
                <Plus className="w-4 h-4" /> Ishchi qo'shish
              </button>
            </>
          ) : (
            <>
              <UserX className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="font-semibold text-gray-500">Nofaol ishchilar yo'q</p>
            </>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(w => (
            <button
              key={w.id}
              onClick={() => navigate(`/workers/${w.id}`)}
              className="card w-full text-left hover:shadow-md active:shadow-sm transition-shadow flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                w.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {w.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{w.name}</p>
                <p className="text-sm text-gray-400 truncate">{w.position || 'Lavozim ko\'rsatilmagan'}</p>
                {w.phone && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{w.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-bold text-gray-900 text-sm">{formatMoney(w.salary_amount, w.salary_currency)}</p>
                {tab === 'active' && payStatus[w.id] ? (
                  <div className={`mt-1 text-xs font-semibold ${
                    payStatus[w.id] === 'full' ? 'text-green-600' :
                    payStatus[w.id] === 'partial' ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {payStatus[w.id] === 'full' ? '✓ To\'liq' :
                     payStatus[w.id] === 'partial' ? '⏳ Qisman' : '✗ To\'lanmagan'}
                  </div>
                ) : (
                  <div className={`mt-1 text-xs font-medium ${w.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {w.is_active ? '● Faol' : '● Nofaol'}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

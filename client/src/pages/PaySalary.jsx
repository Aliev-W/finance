import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Loader2, AlertCircle, User, PenLine, Camera, ChevronDown, Check, X
} from 'lucide-react';
import { getWorkers, getWorker, getWorkerReport, createPayment, uploadPhoto } from '../api';
import { formatMoney, currentMonth, MONTHS_LIST, RELATIONS, paymentTypeLabel } from '../utils';
import PhotoCapture from '../components/PhotoCapture';
import SignaturePad from '../components/SignaturePad';

export default function PaySalary() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [family, setFamily] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerList, setShowWorkerList] = useState(false);

  const [form, setForm] = useState({
    payment_month: params.get('month') || currentMonth(),
    amount: '',
    currency: 'UZS',
    payment_type: 'full',
    receiver_name: '',
    receiver_relation: "O'zi",
    family_member_id: '',
    notes: ''
  });

  const [existingPayments, setExistingPayments] = useState([]);
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWorkers({ active: 1 }).then(list => { if (!cancelled) setWorkers(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const workerId = params.get('worker');
  useEffect(() => {
    if (!workerId) return;
    let cancelled = false;
    getWorker(workerId).then(w => { if (!cancelled) selectWorker(w); }).catch(() => {});
    return () => { cancelled = true; };
  }, [workerId]);

  const selectWorker = useCallback((w) => {
    setSelectedWorker(w);
    setFamily(w.family_members || []);
    setWorkerSearch(w.name);
    setShowWorkerList(false);
    setSignatureFile(null);
    setPhotoFile(null);
    setForm(p => ({
      ...p,
      amount: w.salary_amount || '',
      currency: w.salary_currency || 'UZS',
    }));

    // Auto-select primary family member
    const primary = (w.family_members || []).find(m => m.is_primary);
    if (primary) {
      setForm(p => ({
        ...p,
        receiver_name: primary.name,
        receiver_relation: primary.relationship,
        family_member_id: primary.id
      }));
    }
  }, []);

  const handleFamilySelect = (e) => {
    const fid = e.target.value;
    if (!fid) {
      setForm(p => ({ ...p, family_member_id: '', receiver_name: '', receiver_relation: "O'zi" }));
      return;
    }
    const member = family.find(m => String(m.id) === String(fid));
    if (member) {
      setForm(p => ({
        ...p,
        family_member_id: member.id,
        receiver_name: member.name,
        receiver_relation: member.relationship
      }));
    }
  };

  // Fetch existing payments for selected worker + month
  useEffect(() => {
    if (!selectedWorker) { setExistingPayments([]); return; }
    let cancelled = false;
    getWorkerReport(selectedWorker.id, form.payment_month)
      .then(r => { if (!cancelled) setExistingPayments(r.payments || []); })
      .catch(() => { if (!cancelled) setExistingPayments([]); });
    return () => { cancelled = true; };
  }, [selectedWorker?.id, form.payment_month]);

  const paidThisMonth = existingPayments.reduce((s, p) => {
    if (p.currency === selectedWorker?.salary_currency) return s + Number(p.amount);
    return s;
  }, 0);
  const paidThisMonthOtherCurrency = existingPayments.reduce((s, p) => {
    if (p.currency !== selectedWorker?.salary_currency) return s + Number(p.amount);
    return s;
  }, 0);
  const remainingSalary = selectedWorker ? Math.max(0, selectedWorker.salary_amount - paidThisMonth) : 0;
  const hasExistingFull = existingPayments.some(p => p.payment_type === 'full');

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
    (w.position || '').toLowerCase().includes(workerSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker) { setError('Ishchi tanlang'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Miqdor kiritilishi shart'); return; }
    if (hasExistingFull) { setError("Bu oy uchun to'liq oylik allaqachon to'langan"); return; }

    setSaving(true);
    setError(null);

    try {
      let signaturePhotoUrl = '';
      let photoUrlVal = '';

      if (signatureFile) {
        const uploaded = await uploadPhoto(signatureFile);
        signaturePhotoUrl = uploaded.url;
      }
      if (photoFile) {
        const uploaded = await uploadPhoto(photoFile);
        photoUrlVal = uploaded.url;
      }

      await createPayment({
        worker_id: selectedWorker.id,
        family_member_id: form.family_member_id || null,
        payment_month: form.payment_month,
        amount: parseFloat(form.amount),
        currency: form.currency,
        payment_type: form.payment_type,
        receiver_name: form.receiver_name,
        receiver_relation: form.receiver_relation,
        signature_photo: signaturePhotoUrl,
        photo_url: photoUrlVal,
        notes: form.notes
      });

      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">To'lov muvaffaqiyatli!</h2>
          <p className="text-gray-500 mt-2">
            {selectedWorker?.name} uchun {form.payment_month} oyi oyligi belgilandi
          </p>
          <p className="text-xl font-bold text-gray-900 mt-2">{formatMoney(parseFloat(form.amount), form.currency)}</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setSuccess(false);
              setSelectedWorker(null);
              setWorkerSearch('');
              setFamily([]);
              setExistingPayments([]);
              setSignatureFile(null);
              setPhotoFile(null);
              setShowSignature(false);
              setShowPhoto(false);
              setForm(prev => ({
                payment_month: prev.payment_month,
                amount: '',
                currency: 'UZS',
                payment_type: 'full',
                receiver_name: '',
                receiver_relation: "O'zi",
                family_member_id: '',
                notes: ''
              }));
            }}
            className="btn-secondary flex-1"
          >
            Yana to'lash
          </button>
          <button onClick={() => navigate('/')} className="btn-primary flex-1">
            Bosh sahifa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Oylik to'lash</h1>
          <p className="text-sm text-gray-500">To'lov ma'lumotlarini kiriting</p>
        </div>
      </div>

      {error && (
        <div className="card flex items-center gap-3 text-red-600 bg-red-50 border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Worker Selection */}
        <div className="card space-y-3">
          <label className="label">Ishchi tanlang *</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ism bilan qidiring..."
              value={workerSearch}
              onChange={e => { setWorkerSearch(e.target.value); setShowWorkerList(true); setSelectedWorker(null); }}
              onFocus={() => setShowWorkerList(true)}
              className="input-field pl-11 pr-11"
            />
            {workerSearch && (
              <button
                type="button"
                onClick={() => { setWorkerSearch(''); setSelectedWorker(null); setShowWorkerList(true); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600"
                aria-label="Qidiruvni tozalash"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showWorkerList && workerSearch && (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-md max-h-60 overflow-y-auto">
              {filteredWorkers.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">Topilmadi</div>
              ) : (
                filteredWorkers.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWorker(w)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                      {w.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{w.name}</p>
                      <p className="text-xs text-gray-400">{w.position} · {formatMoney(w.salary_amount, w.salary_currency)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedWorker && (
            <p className="text-xs text-gray-500">
              {selectedWorker.position} · Oylik: {formatMoney(selectedWorker.salary_amount, selectedWorker.salary_currency)}
            </p>
          )}

          {selectedWorker && existingPayments.length > 0 && !hasExistingFull && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">Bu oy uchun mavjud to'lovlar:</p>
              {existingPayments.map(p => (
                <p key={p.id} className="text-xs text-amber-600">
                  {paymentTypeLabel(p.payment_type)}: {formatMoney(p.amount, p.currency)}
                  {p.receiver_name ? ` — ${p.receiver_name}` : ''}
                </p>
              ))}
              {remainingSalary > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-700 font-medium">Qolgan oylik:</span>
                    <span className="text-sm font-bold text-amber-800">{formatMoney(remainingSalary, selectedWorker.salary_currency)}</span>
                  </div>
                  {paidThisMonthOtherCurrency > 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      * Boshqa valyutadagi to'lov bu hisobga kiritilmagan — yuqoridagi ro'yxatga qarang
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedWorker && hasExistingFull && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              Bu oy uchun to'liq oylik allaqachon to'langan
            </p>
          )}
        </div>

        {/* Month & Amount */}
        <div className="card space-y-4">
          <div>
            <label className="label">Oy</label>
            <select
              value={form.payment_month}
              onChange={e => setForm(p => ({ ...p, payment_month: e.target.value }))}
              className="input-field"
            >
              {MONTHS_LIST(6).map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Miqdor *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                min="0"
                step="any"
                className="input-field"
                required
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

          {selectedWorker && form.currency === selectedWorker.salary_currency &&
            parseFloat(form.amount) + paidThisMonth > selectedWorker.salary_amount && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Jami to'lov maoshdan ({formatMoney(selectedWorker.salary_amount, selectedWorker.salary_currency)}) oshib ketadi!
              </p>
            </div>
          )}

          {selectedWorker && form.currency !== selectedWorker.salary_currency &&
            form.amount && parseFloat(form.amount) > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Diqqat: oylik {formatMoney(selectedWorker.salary_amount, selectedWorker.salary_currency)} da,
                siz {form.currency === 'USD' ? 'dollarda' : "so'mda"} kirityapsiz — miqdorni qo'lda tekshiring.
              </p>
            </div>
          )}

          {/* Payment Type */}
          <div>
            <label className="label">To'lov turi</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, payment_type: 'full' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  form.payment_type === 'full'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                To'liq oylik
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, payment_type: 'partial' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  form.payment_type === 'partial'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                Qisman / Avans
              </button>
            </div>
          </div>
        </div>

        {/* Receiver Info */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Qabul qiluvchi</h2>

          {family.length > 0 && (
            <select
              value={form.family_member_id}
              onChange={handleFamilySelect}
              className="input-field"
            >
              <option value="">— Qo'lda kiriting —</option>
              {family.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
              ))}
            </select>
          )}

          {form.family_member_id ? (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                {(form.receiver_name || '?').charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{form.receiver_name}</p>
                <p className="text-xs text-gray-500">{form.receiver_relation}</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={form.receiver_name}
                onChange={e => setForm(p => ({ ...p, receiver_name: e.target.value }))}
                placeholder="Ismi..."
                className="input-field flex-1 min-w-0"
              />
              <select
                value={form.receiver_relation}
                onChange={e => setForm(p => ({ ...p, receiver_relation: e.target.value }))}
                className="input-field min-w-[8rem] flex-shrink-0"
              >
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Signature - collapsible */}
        <div className="card">
          <button
            type="button"
            onClick={() => setShowSignature(s => !s)}
            className="flex items-center justify-between w-full py-2"
          >
            <span className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4 text-gray-400" />
              Imzo
              <span className="text-xs text-gray-400 font-normal">(ixtiyoriy)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {signatureFile && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Saqlandi
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSignature ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showSignature && (
            <div className="mt-3">
              <SignaturePad
                key={`sig-${selectedWorker?.id}`}
                onCapture={setSignatureFile}
                onClear={() => setSignatureFile(null)}
              />
            </div>
          )}
        </div>

        {/* Photo - collapsible */}
        <div className="card">
          <button
            type="button"
            onClick={() => setShowPhoto(s => !s)}
            className="flex items-center justify-between w-full py-2"
          >
            <span className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              Rasm biriktirish
              <span className="text-xs text-gray-400 font-normal">(ixtiyoriy)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {photoFile && <Check className="w-3.5 h-3.5 text-green-600" />}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPhoto ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showPhoto && (
            <div className="mt-3">
              <PhotoCapture onFileSelect={setPhotoFile} label="Rasm olish yoki yuklash" />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !selectedWorker}
          className="btn-primary w-full text-base py-4"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saqlanmoqda...</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> To'lovni tasdiqlash</>
          )}
        </button>
      </form>
    </div>
  );
}

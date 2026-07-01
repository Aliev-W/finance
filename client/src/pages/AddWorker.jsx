import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, Plus, Trash2, Loader2 } from 'lucide-react';
import { getWorker, createWorker, updateWorker, addFamilyMember, deleteFamilyMember } from '../api';
import { RELATIONS } from '../utils';
import Modal from '../components/Modal';

export default function AddWorker() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '', position: '', phone: '',
    salary_amount: '', salary_currency: 'UZS', notes: ''
  });

  const [family, setFamily] = useState([]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: '', relationship: "O'zi", phone: '', is_primary: false });
  const [savingFamily, setSavingFamily] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getWorker(id).then(w => {
      setForm({
        name: w.name, position: w.position || '', phone: w.phone || '',
        salary_amount: w.salary_amount || '', salary_currency: w.salary_currency || 'UZS',
        notes: w.notes || ''
      });
      setFamily(w.family_members || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Ism kiritilishi shart'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = { ...form, salary_amount: parseFloat(form.salary_amount) || 0 };
      if (isEdit) {
        await updateWorker(id, data);
      } else {
        await createWorker(data);
      }
      navigate('/workers');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFamily = async (e) => {
    e.preventDefault();
    if (!familyForm.name.trim()) return;
    setSavingFamily(true);
    try {
      const member = await addFamilyMember(id, familyForm);
      setFamily(p => [...p, member]);
      setFamilyForm({ name: '', relationship: "O'zi", phone: '', is_primary: false });
      setShowFamilyModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingFamily(false);
    }
  };

  const handleDeleteFamily = async (fid) => {
    if (!confirm('Oila azosini o\'chirishni tasdiqlaysizmi?')) return;
    try {
      await deleteFamilyMember(id, fid);
      setFamily(p => p.filter(m => m.id !== fid));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Ishchini tahrirlash' : 'Yangi ishchi'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="card text-red-600 text-sm bg-red-50 border-red-100">{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Asosiy ma'lumotlar
          </h2>
          <div>
            <label className="label">Ism va familiya *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Aliyev Jamshid" className="input-field" required />
          </div>
          <div>
            <label className="label">Lavozim</label>
            <input name="position" value={form.position} onChange={handleChange}
              placeholder="Elektrik, usta, suvchi..." className="input-field" />
          </div>
          <div>
            <label className="label">Telefon raqami</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              placeholder="+998 90 000 00 00" type="tel" className="input-field" />
          </div>
          <div>
            <label className="label">Izoh</label>
            <textarea name="notes" value={form.notes} onChange={handleChange}
              placeholder="Qo'shimcha ma'lumot..." className="input-field" rows={2} />
          </div>
        </div>

        {/* Salary */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">💰 Oylik maosh</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Miqdor</label>
              <input
                name="salary_amount"
                value={form.salary_amount}
                onChange={handleChange}
                placeholder="2500000"
                type="number"
                min="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Valyuta</label>
              <select
                name="salary_currency"
                value={form.salary_currency}
                onChange={handleChange}
                className="input-field w-28"
              >
                <option value="UZS">So'm</option>
                <option value="USD">Dollar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Family Members - only show when editing */}
        {isEdit && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">👨‍👩‍👧 Oila azolari</h2>
              <button
                type="button"
                onClick={() => setShowFamilyModal(true)}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Qo'shish
              </button>
            </div>
            {family.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Oila azolari qo'shilmagan</p>
            ) : (
              <div className="space-y-2">
                {family.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.relationship} {m.is_primary ? '· Asosiy' : ''}</p>
                      {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFamily(m.id)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isEdit && (
          <div className="card bg-blue-50 border-blue-100">
            <p className="text-sm text-blue-700">
              💡 Ishchini saqlangandan so'ng oila azolarini qo'shishingiz mumkin
            </p>
          </div>
        )}

        {/* Save Button */}
        <button type="submit" disabled={saving} className="btn-primary w-full text-base py-4">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saqlanmoqda...' : (isEdit ? 'O\'zgarishlarni saqlash' : 'Ishchi qo\'shish')}
        </button>
      </form>

      {/* Add Family Modal */}
      <Modal open={showFamilyModal} onClose={() => setShowFamilyModal(false)} title="Oila azosi qo'shish">
        <form onSubmit={handleAddFamily} className="space-y-4">
          <div>
            <label className="label">Ism va familiya *</label>
            <input
              value={familyForm.name}
              onChange={e => setFamilyForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Aliyeva Mahliyo"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Qarindoshlik</label>
            <select
              value={familyForm.relationship}
              onChange={e => setFamilyForm(p => ({ ...p, relationship: e.target.value }))}
              className="input-field"
            >
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Telefon</label>
            <input
              value={familyForm.phone}
              onChange={e => setFamilyForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+998 90 000 00 00"
              type="tel"
              className="input-field"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={familyForm.is_primary}
              onChange={e => setFamilyForm(p => ({ ...p, is_primary: e.target.checked }))}
              className="w-5 h-5 rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Asosiy qabul qiluvchi</span>
          </label>
          <button type="submit" disabled={savingFamily} className="btn-primary w-full">
            {savingFamily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Qo'shish
          </button>
        </form>
      </Modal>
    </div>
  );
}

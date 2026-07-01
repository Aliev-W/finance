const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Xatolik yuz berdi' }));
    throw new Error(err.error || 'Server xatosi');
  }
  return res.json();
}

// Workers
export const getWorkers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/workers${q ? '?' + q : ''}`);
};
export const getWorker = (id) => request(`/workers/${id}`);
export const createWorker = (data) => request('/workers', { method: 'POST', body: JSON.stringify(data) });
export const updateWorker = (id, data) => request(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleWorkerActive = (id) => request(`/workers/${id}/toggle-active`, { method: 'PATCH' });
export const deleteWorker = (id) => request(`/workers/${id}`, { method: 'DELETE' });

// Family
export const getFamily = (workerId) => request(`/workers/${workerId}/family`);
export const addFamilyMember = (workerId, data) =>
  request(`/workers/${workerId}/family`, { method: 'POST', body: JSON.stringify(data) });
export const updateFamilyMember = (workerId, fid, data) =>
  request(`/workers/${workerId}/family/${fid}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFamilyMember = (workerId, fid) =>
  request(`/workers/${workerId}/family/${fid}`, { method: 'DELETE' });

// Payments
export const getPayments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/payments${q ? '?' + q : ''}`);
};
export const getPayment = (id) => request(`/payments/${id}`);
export const createPayment = (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) });
export const deletePayment = (id) => request(`/payments/${id}`, { method: 'DELETE' });

// Reports
export const getMonthlyReport = (month) => request(`/reports/monthly?month=${month}`);
export const getWorkerReport = (id, month) =>
  request(`/reports/worker/${id}${month ? '?month=' + month : ''}`);
export const getAnnualReport = (year) => request(`/reports/annual?year=${year}`);

// Export
export const downloadExcel = (month) => { window.location.href = `/api/export/excel?month=${month}`; };
export const openPrintReport = (month) => { window.open(`/api/export/print?month=${month}`, '_blank'); };
export const openPaymentReceipt = (id) => { window.open(`/api/export/payment/${id}`, '_blank'); };

// Backup
export const downloadBackup = () => { window.location.href = '/api/backup/download'; };
export async function restoreBackup(file) {
  const fd = new FormData();
  fd.append('backup', file);
  const res = await fetch('/api/backup/restore', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tiklashda xatolik');
  return data;
}

// Photo upload
export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Rasm yuklanmadi');
  return res.json();
}

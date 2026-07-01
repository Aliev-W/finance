const BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new Event('app:unauthorized'));
    throw new Error('Tizimga kiring');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Xatolik yuz berdi' }));
    throw new Error(err.error || 'Server xatosi');
  }
  return res.json();
}

// Auth
export const loginUser = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const checkAuth = () => request('/auth/check');

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

// Export — token passed as query param since these use window.location.href
export const downloadExcel = (month) => {
  window.location.href = `/api/export/excel?month=${month}&token=${getToken()}`;
};
export const openPrintReport = (month) => {
  window.open(`/api/export/print?month=${month}&token=${getToken()}`, '_blank');
};
export const openPaymentReceipt = (id) => {
  window.open(`/api/export/payment/${id}?token=${getToken()}`, '_blank');
};

// Backup
export const downloadBackup = () => {
  window.location.href = `/api/backup/download?token=${getToken()}`;
};
export async function restoreBackup(file) {
  const fd = new FormData();
  fd.append('backup', file);
  const token = getToken();
  const res = await fetch('/api/backup/restore', {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tiklashda xatolik');
  return data;
}

// Photo upload
export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const token = getToken();
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new Event('app:unauthorized'));
    throw new Error('Tizimga kiring');
  }
  if (!res.ok) throw new Error('Rasm yuklanmadi');
  return res.json();
}

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

// Simple in-memory cache (cleared after any mutation)
const _cache = new Map();
const CACHE_TTL = 20_000; // 20 seconds

function cacheGet(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > CACHE_TTL) { _cache.delete(key); return null; }
  return e.d;
}
function cacheSet(key, data) { _cache.set(key, { d: data, t: Date.now() }); }
export function clearCache() { _cache.clear(); }

async function cachedRequest(key, path) {
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await request(path);
  cacheSet(key, data);
  return data;
}

// Auth
export const loginUser = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const checkAuth = () => request('/auth/check');

// Workers
export const getWorkers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return cachedRequest(`workers:${q}`, `/workers${q ? '?' + q : ''}`);
};
export const getWorker = (id) => request(`/workers/${id}`);
export const createWorker = (data) =>
  request('/workers', { method: 'POST', body: JSON.stringify(data) }).then(r => { clearCache(); return r; });
export const updateWorker = (id, data) =>
  request(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => { clearCache(); return r; });
export const toggleWorkerActive = (id) =>
  request(`/workers/${id}/toggle-active`, { method: 'PATCH' }).then(r => { clearCache(); return r; });
export const deleteWorker = (id) =>
  request(`/workers/${id}`, { method: 'DELETE' }).then(r => { clearCache(); return r; });

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
  return cachedRequest(`payments:${q}`, `/payments${q ? '?' + q : ''}`);
};
export const getPayment = (id) => request(`/payments/${id}`);
export const createPayment = (data) =>
  request('/payments', { method: 'POST', body: JSON.stringify(data) }).then(r => { clearCache(); return r; });
export const deletePayment = (id) =>
  request(`/payments/${id}`, { method: 'DELETE' }).then(r => { clearCache(); return r; });

// Other payments (non-salary)
export const getOtherPayments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/other-payments${q ? '?' + q : ''}`);
};
export const getOtherPaymentsSummary = (month) =>
  request(`/other-payments/summary?month=${month}`);
export const getDebtsSummary = () =>
  request('/other-payments/debts');
export const createOtherPayment = (data) =>
  request('/other-payments', { method: 'POST', body: JSON.stringify(data) }).then(r => { clearCache(); return r; });
export const deleteOtherPayment = (id) =>
  request(`/other-payments/${id}`, { method: 'DELETE' }).then(r => { clearCache(); return r; });

// Loan repayments
export const getLoanRepayments = (loanId) =>
  request(`/other-payments/${loanId}/repayments`);
export const addLoanRepayment = (loanId, data) =>
  request(`/other-payments/${loanId}/repayments`, { method: 'POST', body: JSON.stringify(data) }).then(r => { clearCache(); return r; });
export const deleteLoanRepayment = (repaymentId) =>
  request(`/other-payments/repayments/${repaymentId}`, { method: 'DELETE' }).then(r => { clearCache(); return r; });

// Reports
export const getMonthlyReport = (month) =>
  cachedRequest(`report:${month}`, `/reports/monthly?month=${month}`);
export const getWorkerReport = (id, month) =>
  request(`/reports/worker/${id}${month ? '?month=' + month : ''}`);
export const getAnnualReport = (year) =>
  cachedRequest(`annual:${year}`, `/reports/annual?year=${year}`);

// Export — token passed as query param since these use window.location.href
export const downloadExcel = (month) => {
  window.location.href = `/api/export/excel?month=${month}&token=${getToken()}`;
};
export const openPrintReport = (month) => {
  const url = `/api/export/print?month=${month}&token=${getToken()}`;
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
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
  clearCache();
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

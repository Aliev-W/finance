const UZS_LOCALE = 'uz-UZ';

export function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(amount);
  }
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount) + ' so\'m';
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function prevMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function statusLabel(status) {
  if (status === 'full') return "To'liq to'landi";
  if (status === 'partial') return "Qisman to'landi";
  return "To'lanmadi";
}

export function statusClass(status) {
  if (status === 'full') return 'badge-green';
  if (status === 'partial') return 'badge-yellow';
  return 'badge-red';
}

export const RELATIONS = [
  "O'zi",
  "Xotini",
  "Eri",
  "Otasi",
  "Onasi",
  "O'g'li",
  "Qizi",
  "Akasi/Ukasi",
  "Singlisi/Opasi",
  "Boshqa"
];

export const MONTHS_LIST = (count = 24) => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ value: val, label: monthLabel(val) });
  }
  return months;
};

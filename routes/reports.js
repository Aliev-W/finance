const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');

router.get('/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Oy parametri kerak (YYYY-MM)' });

    const activeWorkers = await query('SELECT * FROM workers WHERE is_active = 1 ORDER BY name', []);
    const paymentsThisMonth = await query(
      'SELECT worker_id, payment_type, amount, currency FROM payments WHERE payment_month = ?',
      [month]
    );

    const byWorker = {};
    paymentsThisMonth.forEach(p => {
      if (!byWorker[p.worker_id]) byWorker[p.worker_id] = [];
      byWorker[p.worker_id].push(p);
    });

    let paidFull = 0, paidPartial = 0, unpaid = 0;
    let totalUZS = 0, totalUSD = 0;

    const workersWithStatus = activeWorkers.map(w => {
      const payments = byWorker[w.id] || [];
      const hasFull = payments.some(p => p.payment_type === 'full');
      const hasPartial = payments.length > 0 && !hasFull;

      let status = 'unpaid';
      if (hasFull) { status = 'full'; paidFull++; }
      else if (hasPartial) { status = 'partial'; paidPartial++; }
      else unpaid++;

      payments.forEach(p => {
        if (p.currency === 'USD') totalUSD += Number(p.amount);
        else totalUZS += Number(p.amount);
      });

      const totalPaidUZS = payments.filter(p => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0);
      const totalPaidUSD = payments.filter(p => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0);

      return { ...w, status, payments, totalPaidUZS, totalPaidUSD };
    });

    const recentPayments = await query(`
      SELECT p.*, w.name as worker_name, w.position as worker_position
      FROM payments p JOIN workers w ON p.worker_id = w.id
      WHERE p.payment_month = ?
      ORDER BY p.paid_at DESC LIMIT 10
    `, [month]);

    res.json({
      month,
      total_active: activeWorkers.length,
      paid_full: paidFull,
      paid_partial: paidPartial,
      unpaid,
      total_uzs: totalUZS,
      total_usd: totalUSD,
      unpaid_workers: workersWithStatus.filter(w => w.status === 'unpaid'),
      partial_workers: workersWithStatus.filter(w => w.status === 'partial'),
      recent_payments: recentPayments,
      all_workers: workersWithStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/annual', async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'Yil kiritilishi shart' });

    const activeRows = await query('SELECT count(*) as c FROM workers WHERE is_active = 1', []);
    const activeCount = activeRows[0]?.c || 0;

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, '0')}`;
      const payments = await query('SELECT worker_id, payment_type, amount, currency FROM payments WHERE payment_month = ?', [month]);
      const byW = {};
      payments.forEach(p => { if (!byW[p.worker_id]) byW[p.worker_id] = []; byW[p.worker_id].push(p); });
      let full = 0, partial = 0;
      Object.values(byW).forEach(ps => {
        if (ps.some(p => p.payment_type === 'full')) full++;
        else partial++;
      });
      const totalUZS = payments.filter(p => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0);
      const totalUSD = payments.filter(p => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0);
      months.push({ month, paid_full: full, paid_partial: partial, total_paid: full + partial, unpaid: Math.max(0, activeCount - full - partial), total_active: activeCount, total_uzs: totalUZS, total_usd: totalUSD });
    }

    res.json({ year, total_active: activeCount, months });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/worker/:id', async (req, res) => {
  try {
    const { month } = req.query;
    const worker = await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
    if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });

    const payments = month
      ? await query('SELECT * FROM payments WHERE worker_id = ? AND payment_month = ? ORDER BY paid_at DESC', [req.params.id, month])
      : await query('SELECT * FROM payments WHERE worker_id = ? ORDER BY paid_at DESC', [req.params.id]);

    res.json({ worker, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

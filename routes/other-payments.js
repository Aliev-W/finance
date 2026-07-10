const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

const OVERDUE_DAYS = 30;

function withDebtFields(row) {
  const totalDue = Number(row.amount) + Number(row.amount) * Number(row.interest_rate || 0) / 100;
  const repaid = Number(row.repaid_amount || 0);
  const remaining = Math.max(0, totalDue - repaid);
  const daysOld = Math.floor((Date.now() - new Date(row.paid_at).getTime()) / 86400000);
  return {
    ...row,
    total_due: totalDue,
    remaining,
    days_old: daysOld,
    is_overdue: row.category === 'Qarz' && remaining > 0.01 && daysOld > OVERDUE_DAYS
  };
}

router.get('/', async (req, res) => {
  try {
    const { month, worker_id, category, recipient_name, limit = 200, offset = 0 } = req.query;
    const lim = parseInt(limit); const off = parseInt(offset);
    let sql = `
      SELECT op.*, w.name as worker_name,
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.other_payment_id = op.id), 0) as repaid_amount
      FROM other_payments op
      LEFT JOIN workers w ON op.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];
    if (month) { sql += ' AND substr(op.paid_at,1,7) = ?'; params.push(month); }
    if (worker_id) { sql += ' AND op.worker_id = ?'; params.push(worker_id); }
    if (category) { sql += ' AND op.category = ?'; params.push(category); }
    if (recipient_name) { sql += ' AND op.recipient_name = ?'; params.push(recipient_name); }
    sql += ' ORDER BY op.paid_at DESC LIMIT ? OFFSET ?';
    params.push(isNaN(lim) || lim < 0 ? 200 : lim, isNaN(off) || off < 0 ? 0 : off);
    const rows = await query(sql, params);
    res.json(rows.map(withDebtFields));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Oy kiritilishi shart' });
    const rows = await query(
      `SELECT currency, SUM(amount) as total, COUNT(*) as cnt FROM other_payments
       WHERE substr(paid_at,1,7) = ? GROUP BY currency`,
      [month]
    );
    const summary = { month, total_uzs: 0, total_usd: 0, count: 0 };
    rows.forEach(r => {
      summary.count += Number(r.cnt);
      if (r.currency === 'USD') summary.total_usd = Number(r.total);
      else summary.total_uzs = Number(r.total);
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All-time outstanding debts (not month-scoped) with totals + overdue flag
router.get('/debts', async (req, res) => {
  try {
    const rows = await query(
      `SELECT op.*, w.name as worker_name,
        COALESCE((SELECT SUM(lr.amount) FROM loan_repayments lr WHERE lr.other_payment_id = op.id), 0) as repaid_amount
       FROM other_payments op
       LEFT JOIN workers w ON op.worker_id = w.id
       WHERE op.category = 'Qarz'
       ORDER BY op.paid_at ASC`,
      []
    );
    const debts = rows.map(withDebtFields).filter(d => d.remaining > 0.01);

    const totals = {};
    let overdueCount = 0;
    debts.forEach(d => {
      totals[d.currency] = (totals[d.currency] || 0) + d.remaining;
      if (d.is_overdue) overdueCount++;
    });

    res.json({ debts, totals, overdue_count: overdueCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { recipient_name, worker_id, amount, currency, category, interest_rate, notes, paid_at } = req.body;
    if (!recipient_name || !recipient_name.trim())
      return res.status(400).json({ error: "Qabul qiluvchi ismi kiritilishi shart" });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ error: "Miqdor 0 dan katta bo'lishi shart" });

    const parsedInterest = parseFloat(interest_rate);
    const finalInterest = isNaN(parsedInterest) || parsedInterest < 0 ? 0 : parsedInterest;

    let linkedWorkerId = worker_id || null;
    if (!linkedWorkerId) {
      const match = await queryOne('SELECT id FROM workers WHERE name = ?', [recipient_name.trim()]);
      if (match) linkedWorkerId = match.id;
    }

    const result = await run(
      `INSERT INTO other_payments (recipient_name, worker_id, amount, currency, category, interest_rate, notes, paid_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [recipient_name.trim(), linkedWorkerId, parsedAmount, currency || 'UZS',
       category || 'Boshqa', finalInterest, notes || '', paid_at || new Date().toISOString()]
    );
    const created = await queryOne(
      `SELECT op.*, w.name as worker_name FROM other_payments op
       LEFT JOIN workers w ON op.worker_id = w.id WHERE op.id = ?`,
      [result.lastInsertRowid]
    );
    res.status(201).json(withDebtFields({ ...created, repaid_amount: 0 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const p = await queryOne('SELECT id FROM other_payments WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: "To'lov topilmadi" });
    await run('DELETE FROM loan_repayments WHERE other_payment_id = ?', [req.params.id]);
    await run('DELETE FROM other_payments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Loan repayments
router.get('/:id/repayments', async (req, res) => {
  try {
    const loan = await queryOne('SELECT id FROM other_payments WHERE id = ?', [req.params.id]);
    if (!loan) return res.status(404).json({ error: "Qarz yozuvi topilmadi" });
    res.json(await query(
      'SELECT * FROM loan_repayments WHERE other_payment_id = ? ORDER BY paid_at DESC',
      [req.params.id]
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/repayments', async (req, res) => {
  try {
    const { amount, notes, paid_at } = req.body;
    const loan = await queryOne('SELECT * FROM other_payments WHERE id = ?', [req.params.id]);
    if (!loan) return res.status(404).json({ error: "Qarz yozuvi topilmadi" });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ error: "Miqdor 0 dan katta bo'lishi shart" });

    const repaidRow = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as repaid FROM loan_repayments WHERE other_payment_id = ?',
      [req.params.id]
    );
    const { remaining } = withDebtFields({ ...loan, repaid_amount: repaidRow.repaid });
    if (parsedAmount > remaining + 0.01)
      return res.status(400).json({ error: `Qaytarish miqdori qolgan qarzdan (${remaining}) oshib ketmasligi kerak` });

    const result = await run(
      `INSERT INTO loan_repayments (other_payment_id, amount, notes, paid_at) VALUES (?,?,?,?)`,
      [req.params.id, parsedAmount, notes || '', paid_at || new Date().toISOString()]
    );
    res.status(201).json(await queryOne('SELECT * FROM loan_repayments WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/repayments/:rid', async (req, res) => {
  try {
    const r = await queryOne('SELECT id FROM loan_repayments WHERE id = ?', [req.params.rid]);
    if (!r) return res.status(404).json({ error: "Qaytarish yozuvi topilmadi" });
    await run('DELETE FROM loan_repayments WHERE id = ?', [req.params.rid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

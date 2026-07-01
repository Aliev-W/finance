const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { month, worker_id, limit = 100, offset = 0 } = req.query;
    const lim = parseInt(limit); const off = parseInt(offset);
    let sql = `
      SELECT p.*, w.name as worker_name, w.position as worker_position,
             w.salary_amount as worker_salary, w.salary_currency as worker_salary_currency
      FROM payments p
      JOIN workers w ON p.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];
    if (month) { sql += ' AND p.payment_month = ?'; params.push(month); }
    if (worker_id) { sql += ' AND p.worker_id = ?'; params.push(worker_id); }
    sql += ' ORDER BY p.paid_at DESC LIMIT ? OFFSET ?';
    params.push(isNaN(lim) || lim < 0 ? 100 : lim, isNaN(off) || off < 0 ? 0 : off);
    res.json(await query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await queryOne(`
      SELECT p.*, w.name as worker_name, w.position as worker_position,
             w.salary_amount as worker_salary, w.salary_currency as worker_salary_currency
      FROM payments p JOIN workers w ON p.worker_id = w.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (!p) return res.status(404).json({ error: "To'lov topilmadi" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { worker_id, family_member_id, payment_month, amount, currency,
      payment_type, receiver_name, receiver_relation, signature_photo, photo_url, notes } = req.body;

    if (!worker_id || !payment_month || !amount)
      return res.status(400).json({ error: 'Ishchi, oy va miqdor kiritilishi shart' });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ error: "Miqdor 0 dan katta bo'lishi shart" });

    const worker = await queryOne('SELECT * FROM workers WHERE id = ?', [worker_id]);
    if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });

    const finalCurrency = currency || worker.salary_currency;
    const rawType = (payment_type || 'full').toLowerCase();
    const finalType = rawType === 'partial' ? 'partial' : 'full';

    if (finalType === 'full') {
      const existingFull = await queryOne(
        "SELECT id FROM payments WHERE worker_id = ? AND payment_month = ? AND payment_type = 'full'",
        [worker_id, payment_month]
      );
      if (existingFull) return res.status(400).json({ error: "Bu oy uchun to'liq to'lov allaqachon mavjud" });
    }

    const result = await run(`
      INSERT INTO payments
      (worker_id, family_member_id, payment_month, amount, currency, payment_type,
       receiver_name, receiver_relation, signature_photo, photo_url, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      worker_id, family_member_id || null, payment_month,
      parsedAmount, finalCurrency,
      finalType, receiver_name || '', receiver_relation || '',
      signature_photo || '', photo_url || '', notes || ''
    ]);

    res.status(201).json({
      id: result.lastInsertRowid,
      worker_id, family_member_id: family_member_id || null,
      payment_month, amount: parsedAmount,
      currency: finalCurrency, payment_type: finalType,
      receiver_name: receiver_name || '', receiver_relation: receiver_relation || '',
      signature_photo: signature_photo || '', photo_url: photo_url || '',
      notes: notes || '', paid_at: new Date().toISOString(),
      worker_name: worker.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const p = await queryOne('SELECT id FROM payments WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: "To'lov topilmadi" });
    await run('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

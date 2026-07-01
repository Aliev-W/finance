const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query, queryOne, run } = require('../database');

router.get('/', (req, res) => {
  const { month, worker_id, limit = 100, offset = 0 } = req.query;
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
  params.push(parseInt(limit), parseInt(offset));
  res.json(query(sql, params));
});

router.get('/:id', (req, res) => {
  const p = queryOne(`
    SELECT p.*, w.name as worker_name, w.position as worker_position,
           w.salary_amount as worker_salary, w.salary_currency as worker_salary_currency
    FROM payments p JOIN workers w ON p.worker_id = w.id
    WHERE p.id = ?
  `, [req.params.id]);
  if (!p) return res.status(404).json({ error: "To'lov topilmadi" });
  res.json(p);
});

router.post('/', (req, res) => {
  const { worker_id, family_member_id, payment_month, amount, currency,
    payment_type, receiver_name, receiver_relation, signature_photo, photo_url, notes } = req.body;

  if (!worker_id || !payment_month || !amount)
    return res.status(400).json({ error: 'Ishchi, oy va miqdor kiritilishi shart' });

  const worker = queryOne('SELECT * FROM workers WHERE id = ?', [worker_id]);
  if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });

  const result = run(`
    INSERT INTO payments
    (worker_id, family_member_id, payment_month, amount, currency, payment_type,
     receiver_name, receiver_relation, signature_photo, photo_url, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `, [
    worker_id, family_member_id || null, payment_month,
    parseFloat(amount), currency || worker.salary_currency,
    payment_type || 'full', receiver_name || '', receiver_relation || '',
    signature_photo || '', photo_url || '', notes || ''
  ]);

  res.status(201).json(queryOne(`
    SELECT p.*, w.name as worker_name FROM payments p
    JOIN workers w ON p.worker_id = w.id WHERE p.id = ?
  `, [result.lastInsertRowid]));
});

router.delete('/:id', (req, res) => {
  const p = queryOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: "To'lov topilmadi" });

  for (const field of [p.signature_photo, p.photo_url]) {
    if (field) {
      const filePath = path.join(__dirname, '..', 'uploads', path.basename(field));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }
  }

  run('DELETE FROM payments WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;

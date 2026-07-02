const express = require('express');
const router = express.Router();
const multer = require('multer');
const { query, transaction } = require('../database');

router.get('/download', async (req, res) => {
  try {
    const workers = await query('SELECT * FROM workers', []);
    const family_members = await query('SELECT * FROM family_members', []);
    const payments = await query('SELECT * FROM payments', []);
    const other_payments = await query('SELECT * FROM other_payments', []);

    const backup = {
      version: 3,
      exported_at: new Date().toISOString(),
      workers,
      family_members,
      payments,
      other_payments
    };

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const fileName = `oylik_zaxira_${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/restore', upload.single('backup'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
  try {
    const data = JSON.parse(req.file.buffer.toString('utf8'));
    if (!data.workers || !data.payments)
      return res.status(400).json({ error: "Noto'g'ri backup fayl formati" });

    const statements = [
      { sql: 'DELETE FROM other_payments', args: [] },
      { sql: 'DELETE FROM payments', args: [] },
      { sql: 'DELETE FROM family_members', args: [] },
      { sql: 'DELETE FROM workers', args: [] },
    ];

    for (const w of data.workers) {
      statements.push({
        sql: `INSERT INTO workers (id, name, position, phone, salary_amount, salary_currency, is_active, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        args: [w.id, w.name||'', w.position||'', w.phone||'', w.salary_amount||0, w.salary_currency||'UZS', w.is_active??1, w.notes||'', w.created_at||new Date().toISOString()]
      });
    }

    for (const m of (data.family_members || [])) {
      statements.push({
        sql: `INSERT INTO family_members (id, worker_id, name, relationship, phone, is_primary) VALUES (?,?,?,?,?,?)`,
        args: [m.id, m.worker_id, m.name, m.relationship||'Oila azosi', m.phone||'', m.is_primary||0]
      });
    }

    for (const p of data.payments) {
      statements.push({
        sql: `INSERT INTO payments (id, worker_id, family_member_id, payment_month, amount, currency, payment_type, receiver_name, receiver_relation, signature_photo, photo_url, notes, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [p.id, p.worker_id, p.family_member_id||null, p.payment_month, p.amount, p.currency||'UZS', p.payment_type||'full', p.receiver_name||'', p.receiver_relation||'', p.signature_photo||'', p.photo_url||'', p.notes||'', p.paid_at||new Date().toISOString()]
      });
    }

    for (const op of (data.other_payments || [])) {
      statements.push({
        sql: `INSERT INTO other_payments (id, recipient_name, worker_id, amount, currency, category, notes, paid_at) VALUES (?,?,?,?,?,?,?,?)`,
        args: [op.id, op.recipient_name, op.worker_id||null, op.amount, op.currency||'UZS', op.category||'Boshqa', op.notes||'', op.paid_at||new Date().toISOString()]
      });
    }

    await transaction(statements);
    res.json({ success: true, message: "Ma'lumotlar muvaffaqiyatli tiklandi" });
  } catch (err) {
    res.status(500).json({ error: 'Tiklashda xatolik: ' + err.message });
  }
});

module.exports = router;

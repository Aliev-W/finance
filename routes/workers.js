const express = require('express');
const router = express.Router();
const { query, queryOne, run, transaction } = require('../database');

// Handles boolean, 0/1, and their string forms — a stray "false" string must not
// coerce truthy (JS treats any non-empty string as truthy) and flip a worker active.
function toActiveFlag(value, fallback) {
  if (value === undefined) return fallback;
  if (value === false || value === 0 || value === 'false' || value === '0') return 0;
  return value ? 1 : 0;
}

router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let sql = 'SELECT * FROM workers WHERE 1=1';
    const params = [];
    if (active === 'true' || active === '1') {
      sql += ' AND is_active = ?'; params.push(1);
    } else if (active === 'false' || active === '0') {
      sql += ' AND is_active = ?'; params.push(0);
    }
    // any other/unrecognized value for `active` is ignored rather than silently
    // treated as "inactive" (e.g. a typo like ?active=yes used to filter to inactive-only)
    if (search) {
      sql += ' AND (name LIKE ? OR position LIKE ? OR phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY name ASC';
    res.json(await query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const worker = await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
    if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });
    const family = await query('SELECT * FROM family_members WHERE worker_id = ? ORDER BY is_primary DESC, id ASC', [req.params.id]);
    res.json({ ...worker, family_members: family });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, position, phone, salary_amount, salary_currency, notes, hire_date } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    const salaryNum = parseFloat(salary_amount);
    if (!isNaN(salaryNum) && salaryNum < 0) return res.status(400).json({ error: "Maosh manfiy bo'lishi mumkin emas" });
    const result = await run(
      `INSERT INTO workers (name, position, phone, salary_amount, salary_currency, notes, hire_date) VALUES (?,?,?,?,?,?,?)`,
      [name.trim(), position || '', phone || '', isNaN(salaryNum) ? 0 : salaryNum, salary_currency || 'UZS', notes || '', hire_date || '']
    );
    res.status(201).json(await queryOne('SELECT * FROM workers WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, position, phone, salary_amount, salary_currency, is_active, notes, hire_date } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    const salaryNum = parseFloat(salary_amount);
    if (!isNaN(salaryNum) && salaryNum < 0) return res.status(400).json({ error: "Maosh manfiy bo'lishi mumkin emas" });
    const existing = await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ishchi topilmadi' });
    await run(
      `UPDATE workers SET name=?,position=?,phone=?,salary_amount=?,salary_currency=?,is_active=?,notes=?,hire_date=? WHERE id=?`,
      [name.trim(), position || '', phone || '', isNaN(salaryNum) ? 0 : salaryNum,
       salary_currency || 'UZS',
       toActiveFlag(is_active, existing.is_active),
       notes || '', hire_date || '', req.params.id]
    );
    res.json(await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const worker = await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
    if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });
    const newStatus = worker.is_active ? 0 : 1;
    await run('UPDATE workers SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json(await queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT id FROM workers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ishchi topilmadi' });
    await run('UPDATE workers SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/family', async (req, res) => {
  try {
    res.json(await query('SELECT * FROM family_members WHERE worker_id = ? ORDER BY is_primary DESC', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/family', async (req, res) => {
  try {
    const { name, relationship, phone, is_primary } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    const worker = await queryOne('SELECT id FROM workers WHERE id = ?', [req.params.id]);
    if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });

    // Reset-old-primary + insert-new must be atomic, or a crash/failure between the two
    // steps can leave the worker with zero primary family members.
    const statements = [];
    if (is_primary) statements.push({ sql: 'UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', args: [req.params.id] });
    statements.push({
      sql: `INSERT INTO family_members (worker_id, name, relationship, phone, is_primary) VALUES (?,?,?,?,?)`,
      args: [req.params.id, name.trim(), relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0]
    });
    await transaction(statements);

    const created = await queryOne('SELECT * FROM family_members WHERE worker_id = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/family/:fid', async (req, res) => {
  try {
    const { name, relationship, phone, is_primary } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    const existing = await queryOne('SELECT id FROM family_members WHERE id = ? AND worker_id = ?', [req.params.fid, req.params.id]);
    if (!existing) return res.status(404).json({ error: "Oila a'zosi topilmadi" });

    const statements = [];
    if (is_primary) statements.push({ sql: 'UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', args: [req.params.id] });
    statements.push({
      sql: `UPDATE family_members SET name=?,relationship=?,phone=?,is_primary=? WHERE id=? AND worker_id=?`,
      args: [name.trim(), relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0, req.params.fid, req.params.id]
    });
    await transaction(statements);

    res.json(await queryOne('SELECT * FROM family_members WHERE id = ?', [req.params.fid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/family/:fid', async (req, res) => {
  try {
    const existing = await queryOne('SELECT id FROM family_members WHERE id = ? AND worker_id = ?', [req.params.fid, req.params.id]);
    if (!existing) return res.status(404).json({ error: "Oila a'zosi topilmadi" });
    await run('DELETE FROM family_members WHERE id = ? AND worker_id = ?', [req.params.fid, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

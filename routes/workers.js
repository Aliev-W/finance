const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let sql = 'SELECT * FROM workers WHERE 1=1';
    const params = [];
    if (active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    }
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
    if (!name) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    const result = await run(
      `INSERT INTO workers (name, position, phone, salary_amount, salary_currency, notes, hire_date) VALUES (?,?,?,?,?,?,?)`,
      [name, position || '', phone || '', salary_amount || 0, salary_currency || 'UZS', notes || '', hire_date || '']
    );
    res.status(201).json(await queryOne('SELECT * FROM workers WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, position, phone, salary_amount, salary_currency, is_active, notes, hire_date } = req.body;
    if (!await queryOne('SELECT id FROM workers WHERE id = ?', [req.params.id]))
      return res.status(404).json({ error: 'Ishchi topilmadi' });
    await run(
      `UPDATE workers SET name=?,position=?,phone=?,salary_amount=?,salary_currency=?,is_active=?,notes=?,hire_date=? WHERE id=?`,
      [name, position || '', phone || '', salary_amount || 0, salary_currency || 'UZS',
       is_active !== undefined ? (is_active ? 1 : 0) : 1, notes || '', hire_date || '', req.params.id]
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
    if (!name) return res.status(400).json({ error: 'Ism kiritilishi shart' });
    if (is_primary) await run('UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', [req.params.id]);
    const result = await run(
      `INSERT INTO family_members (worker_id, name, relationship, phone, is_primary) VALUES (?,?,?,?,?)`,
      [req.params.id, name, relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0]
    );
    res.status(201).json(await queryOne('SELECT * FROM family_members WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/family/:fid', async (req, res) => {
  try {
    const { name, relationship, phone, is_primary } = req.body;
    if (is_primary) await run('UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', [req.params.id]);
    await run(
      `UPDATE family_members SET name=?,relationship=?,phone=?,is_primary=? WHERE id=? AND worker_id=?`,
      [name, relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0, req.params.fid, req.params.id]
    );
    res.json(await queryOne('SELECT * FROM family_members WHERE id = ?', [req.params.fid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/family/:fid', async (req, res) => {
  try {
    await run('DELETE FROM family_members WHERE id = ? AND worker_id = ?', [req.params.fid, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

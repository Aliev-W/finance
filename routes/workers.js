const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

router.get('/', (req, res) => {
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
  res.json(query(sql, params));
});

router.get('/:id', (req, res) => {
  const worker = queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });
  const family = query('SELECT * FROM family_members WHERE worker_id = ? ORDER BY is_primary DESC, id ASC', [req.params.id]);
  res.json({ ...worker, family_members: family });
});

router.post('/', (req, res) => {
  const { name, position, phone, salary_amount, salary_currency, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Ism kiritilishi shart' });
  const result = run(
    `INSERT INTO workers (name, position, phone, salary_amount, salary_currency, notes) VALUES (?,?,?,?,?,?)`,
    [name, position || '', phone || '', salary_amount || 0, salary_currency || 'UZS', notes || '']
  );
  res.status(201).json(queryOne('SELECT * FROM workers WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/:id', (req, res) => {
  const { name, position, phone, salary_amount, salary_currency, is_active, notes } = req.body;
  if (!queryOne('SELECT id FROM workers WHERE id = ?', [req.params.id]))
    return res.status(404).json({ error: 'Ishchi topilmadi' });
  run(
    `UPDATE workers SET name=?,position=?,phone=?,salary_amount=?,salary_currency=?,is_active=?,notes=? WHERE id=?`,
    [name, position || '', phone || '', salary_amount || 0, salary_currency || 'UZS',
     is_active !== undefined ? (is_active ? 1 : 0) : 1, notes || '', req.params.id]
  );
  res.json(queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]));
});

router.patch('/:id/toggle-active', (req, res) => {
  const worker = queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return res.status(404).json({ error: 'Ishchi topilmadi' });
  const newStatus = worker.is_active ? 0 : 1;
  run('UPDATE workers SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
  res.json(queryOne('SELECT * FROM workers WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  run('UPDATE workers SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Family members
router.get('/:id/family', (req, res) => {
  res.json(query('SELECT * FROM family_members WHERE worker_id = ? ORDER BY is_primary DESC', [req.params.id]));
});

router.post('/:id/family', (req, res) => {
  const { name, relationship, phone, is_primary } = req.body;
  if (!name) return res.status(400).json({ error: 'Ism kiritilishi shart' });
  if (is_primary) run('UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', [req.params.id]);
  const result = run(
    `INSERT INTO family_members (worker_id, name, relationship, phone, is_primary) VALUES (?,?,?,?,?)`,
    [req.params.id, name, relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0]
  );
  res.status(201).json(queryOne('SELECT * FROM family_members WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/:id/family/:fid', (req, res) => {
  const { name, relationship, phone, is_primary } = req.body;
  if (is_primary) run('UPDATE family_members SET is_primary = 0 WHERE worker_id = ?', [req.params.id]);
  run(
    `UPDATE family_members SET name=?,relationship=?,phone=?,is_primary=? WHERE id=? AND worker_id=?`,
    [name, relationship || 'Oila azosi', phone || '', is_primary ? 1 : 0, req.params.fid, req.params.id]
  );
  res.json(queryOne('SELECT * FROM family_members WHERE id = ?', [req.params.fid]));
});

router.delete('/:id/family/:fid', (req, res) => {
  run('DELETE FROM family_members WHERE id = ? AND worker_id = ?', [req.params.fid, req.params.id]);
  res.json({ success: true });
});

module.exports = router;

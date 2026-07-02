const { createClient } = require('@libsql/client');

let client = null;

async function initDB() {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:salary_manager.sqlite',
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  await client.batch([
    `CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      salary_amount REAL DEFAULT 0,
      salary_currency TEXT DEFAULT 'UZS',
      is_active INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT DEFAULT 'Oila azosi',
      phone TEXT DEFAULT '',
      is_primary INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      family_member_id INTEGER,
      payment_month TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UZS',
      payment_type TEXT DEFAULT 'full',
      receiver_name TEXT DEFAULT '',
      receiver_relation TEXT DEFAULT '',
      signature_photo TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      paid_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS other_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_name TEXT NOT NULL,
      worker_id INTEGER,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UZS',
      category TEXT DEFAULT 'Boshqa',
      interest_rate REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      paid_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS loan_repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      other_payment_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT DEFAULT '',
      paid_at TEXT DEFAULT (datetime('now'))
    )`,
  ], 'write');

  try {
    await client.execute("ALTER TABLE payments ADD COLUMN photo_url TEXT DEFAULT ''");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE workers ADD COLUMN hire_date TEXT DEFAULT ''");
  } catch (e) {}

  try {
    await client.execute("ALTER TABLE other_payments ADD COLUMN interest_rate REAL DEFAULT 0");
  } catch (e) {}

  return client;
}

async function query(sql, params = []) {
  const result = await client.execute({ sql, args: params });
  return result.rows.map(row => ({ ...row }));
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const result = await client.execute({ sql, args: params });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
}

async function transaction(statements) {
  await client.batch(statements.map(s => ({ sql: s.sql, args: s.args || [] })), 'write');
}

function saveNow() {}
async function reinitDB() {}

module.exports = { initDB, reinitDB, saveNow, query, queryOne, run, transaction };

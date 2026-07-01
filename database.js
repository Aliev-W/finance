const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'salary_manager.sqlite');

let SQL = null;
let db = null;
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (db) {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
  }, 300);
}

function saveNow() {
  clearTimeout(saveTimer);
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function reinitDB() {
  clearTimeout(saveTimer);
  if (db) db.close();
  const buf = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buf);
  scheduleSave();
}

async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      salary_amount REAL DEFAULT 0,
      salary_currency TEXT DEFAULT 'UZS',
      is_active INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT DEFAULT 'Oila azosi',
      phone TEXT DEFAULT '',
      is_primary INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
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
    );
  `);

  // Migrate existing databases: add photo_url column if missing
  try { db.run("ALTER TABLE payments ADD COLUMN photo_url TEXT DEFAULT ''"); } catch (e) {}

  scheduleSave();
  return db;
}

// Synchronous query wrappers using sql.js API
function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  scheduleSave();
  return { lastInsertRowid: lastId ? lastId.id : null };
}

module.exports = { initDB, reinitDB, saveNow, query, queryOne, run };

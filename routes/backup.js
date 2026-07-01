const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { saveNow, reinitDB } = require('../database');

const DB_PATH = path.join(__dirname, '..', 'salary_manager.sqlite');

// Download current database as backup
router.get('/download', (req, res) => {
  saveNow();
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ error: "Ma'lumotlar bazasi topilmadi" });
  }
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const fileName = `oylik_zaxira_${dateStr}.sqlite`;
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(DB_PATH, fileName);
});

// Restore from uploaded backup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/restore', upload.single('backup'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
  try {
    fs.writeFileSync(DB_PATH, req.file.buffer);
    await reinitDB();
    res.json({ success: true, message: "Ma'lumotlar muvaffaqiyatli tiklandi" });
  } catch (err) {
    res.status(500).json({ error: 'Tiklashda xatolik: ' + err.message });
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { initDB } = require('./database');

const APP_USERNAME = process.env.APP_USERNAME || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';
const SECRET_KEY = process.env.SECRET_KEY || 'salary-secret-2024';

function generateToken() {
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(APP_USERNAME + ':' + APP_PASSWORD)
    .digest('hex');
}

function checkToken(req) {
  const headerToken = req.headers.authorization?.split(' ')[1];
  const queryToken = req.query.token;
  return (headerToken || queryToken) === generateToken();
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Faqat rasm fayllari yuklanishi mumkin'));
  }
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });
  const base64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
  res.json({ url: dataUrl });
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === APP_USERNAME && password === APP_PASSWORD) {
    res.json({ token: generateToken(), username: APP_USERNAME });
  } else {
    res.status(401).json({ error: "Noto'g'ri login yoki parol" });
  }
});

app.get('/api/auth/check', (req, res) => {
  if (checkToken(req)) {
    res.json({ ok: true, username: APP_USERNAME });
  } else {
    res.status(401).json({ error: 'Avtorizatsiya kerak' });
  }
});

app.use('/api', (req, res, next) => {
  if (!checkToken(req)) return res.status(401).json({ error: 'Tizimga kiring' });
  next();
});

app.use('/api/workers', require('./routes/workers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/export', require('./routes/export'));
app.use('/api/backup', require('./routes/backup'));

const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

async function main() {
  try {
    await initDB();
    console.log('Malumotlar bazasi tayyor.');

    app.listen(PORT, '0.0.0.0', () => {
      const ip = getLocalIP();
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║     OYLIK BOSHQARUV TIZIMI — TAYYOR   ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║  Kompyuter:  http://localhost:${PORT}      ║`);
      console.log(`║  Telefon:    http://${ip}:${PORT}    ║`);
      console.log('╚════════════════════════════════════════╝\n');
    });
  } catch (err) {
    console.error('Server ishga tushmadi:', err);
    process.exit(1);
  }
}

main();

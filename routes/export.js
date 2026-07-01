const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { query, queryOne } = require('../database');

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

function getMonthName(month) {
  const [y, m] = month.split('-');
  return `${MONTHS_UZ[parseInt(m) - 1]} ${y}`;
}

// Excel export
router.get('/excel', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Oy kiritilishi shart' });

  const allWorkers = query('SELECT * FROM workers WHERE is_active = 1 ORDER BY name', []);
  const payments = query(`
    SELECT p.*, w.name as worker_name
    FROM payments p JOIN workers w ON p.worker_id = w.id
    WHERE p.payment_month = ?
    ORDER BY w.name, p.paid_at
  `, [month]);

  const payByWorker = {};
  payments.forEach(p => {
    if (!payByWorker[p.worker_id]) payByWorker[p.worker_id] = [];
    payByWorker[p.worker_id].push(p);
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Oylik Tizimi';
  const sheet = workbook.addWorksheet(getMonthName(month));

  // Title row
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${getMonthName(month)} — Oylik Hisoboti`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  sheet.getRow(1).height = 38;
  sheet.addRow([]);

  // Column widths
  sheet.columns = [
    { key: 'num',      width: 5  },
    { key: 'name',     width: 26 },
    { key: 'position', width: 20 },
    { key: 'salary',   width: 22 },
    { key: 'paid',     width: 18 },
    { key: 'currency', width: 10 },
    { key: 'type',     width: 12 },
    { key: 'receiver', width: 22 },
    { key: 'date',     width: 14 },
    { key: 'status',   width: 18 },
  ];

  const headerRow = sheet.addRow([
    '№', 'Ishchi ismi', 'Lavozim', "Belgilangan oylik",
    "To'langan", 'Valyuta', "Turi",
    'Qabul qiluvchi', 'Sana', 'Holat'
  ]);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } } };
  });
  headerRow.height = 28;

  let num = 1;
  let rowIdx = 4;

  allWorkers.forEach(w => {
    const wPays = payByWorker[w.id] || [];
    const hasFull = wPays.some(p => p.payment_type === 'full');
    const statusText = hasFull ? "To'liq to'landi" : wPays.length > 0 ? "Qisman to'landi" : "To'lanmadi";
    const statusBg   = hasFull ? 'FFD1FAE5' : wPays.length > 0 ? 'FFFEF3C7' : 'FFFECACA';
    const statusFont = hasFull ? 'FF065F46' : wPays.length > 0 ? 'FF78350F' : 'FFB91C1C';
    const isEven = rowIdx % 2 === 0;
    const rowBg = isEven ? 'FFF8FAFF' : 'FFFFFFFF';

    const addRow = (cells, isFirst) => {
      const row = sheet.addRow(cells);
      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
        if (col !== 10) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });
      if (isFirst) {
        const statusCell = row.getCell(10);
        statusCell.value = statusText;
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
        statusCell.font = { bold: true, size: 10, color: { argb: statusFont } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      row.getCell(5).numFmt = '#,##0';
      rowIdx++;
    };

    if (wPays.length === 0) {
      addRow([num++, w.name, w.position || '', `${w.salary_amount} ${w.salary_currency}`, 0, w.salary_currency, "To'liq oylik", '', '', ''], true);
    } else {
      wPays.forEach((p, i) => {
        const payDate = p.paid_at ? new Date(p.paid_at).toLocaleDateString('ru-RU') : '';
        addRow([
          i === 0 ? num++ : '',
          i === 0 ? w.name : '',
          i === 0 ? (w.position || '') : '',
          i === 0 ? `${w.salary_amount} ${w.salary_currency}` : '',
          Number(p.amount),
          p.currency,
          p.payment_type === 'full' ? "To'liq" : 'Avansi',
          p.receiver_name || '',
          payDate,
          ''
        ], i === 0);
      });
    }
  });

  // Totals
  sheet.addRow([]);
  const totalUZS = payments.filter(p => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0);
  const totalUSD = payments.filter(p => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0);
  if (totalUZS > 0) {
    const r = sheet.addRow(['', "JAMI (So'm):", '', '', totalUZS, 'UZS', '', '', '', '']);
    r.getCell(2).font = { bold: true }; r.getCell(5).font = { bold: true }; r.getCell(5).numFmt = '#,##0';
  }
  if (totalUSD > 0) {
    const r = sheet.addRow(['', 'JAMI (Dollar):', '', '', totalUSD, 'USD', '', '', '', '']);
    r.getCell(2).font = { bold: true }; r.getCell(5).font = { bold: true }; r.getCell(5).numFmt = '#,##0.00';
  }

  const [y, m] = month.split('-');
  const fileName = `${MONTHS_UZ[parseInt(m) - 1]}_${y}_oylik.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  await workbook.xlsx.write(res);
  res.end();
});

// Print HTML report
router.get('/print', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Oy kiritilishi shart' });

  const allWorkers = query('SELECT * FROM workers WHERE is_active = 1 ORDER BY name', []);
  const payments = query(`
    SELECT p.* FROM payments p WHERE p.payment_month = ?
  `, [month]);

  const byWorker = {};
  payments.forEach(p => { if (!byWorker[p.worker_id]) byWorker[p.worker_id] = []; byWorker[p.worker_id].push(p); });

  let paidFull = 0, paidPartial = 0, unpaid = 0, totalUZS = 0, totalUSD = 0;
  allWorkers.forEach(w => {
    const wp = byWorker[w.id] || [];
    const hasFull = wp.some(p => p.payment_type === 'full');
    if (hasFull) paidFull++;
    else if (wp.length > 0) paidPartial++;
    else unpaid++;
    wp.forEach(p => { if (p.currency === 'UZS') totalUZS += Number(p.amount); else totalUSD += Number(p.amount); });
  });

  const printDate = new Date().toLocaleDateString('ru-RU');
  const monthName = getMonthName(month);

  const rows = allWorkers.map((w, idx) => {
    const wp = byWorker[w.id] || [];
    const hasFull = wp.some(p => p.payment_type === 'full');
    const hasPartial = wp.length > 0 && !hasFull;
    const wUZS = wp.filter(p => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0);
    const wUSD = wp.filter(p => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0);
    const statusCls = hasFull ? 'full' : hasPartial ? 'partial' : 'unpaid';
    const statusTxt = hasFull ? "To'liq to'landi" : hasPartial ? "Qisman to'landi" : "To'lanmadi";
    const paidStr = [wUZS > 0 ? wUZS.toLocaleString('ru-RU') + " so'm" : '', wUSD > 0 ? '$' + wUSD.toLocaleString('en-US') : ''].filter(Boolean).join(' + ') || '—';
    const receiver = wp[0]?.receiver_name || '—';
    const payDate = wp[0]?.paid_at ? new Date(wp[0].paid_at).toLocaleDateString('ru-RU') : '—';
    return `<tr><td>${idx + 1}</td><td><strong>${w.name}</strong></td><td>${w.position || '—'}</td><td>${Number(w.salary_amount).toLocaleString('ru-RU')} ${w.salary_currency}</td><td>${paidStr}</td><td>${receiver}</td><td>${payDate}</td><td><span class="st ${statusCls}">${statusTxt}</span></td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><title>Oylik — ${monthName}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px}
.np{text-align:right;margin-bottom:15px}
.pbtn{background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;margin-left:8px}
.pbtn:hover{background:#1d4ed8}
.gbtn{background:#64748b}
.hdr{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:16px}
.hdr h1{font-size:19px;color:#1e3a5f}
.hdr p{color:#666;font-size:12px;margin-top:4px}
.stats{display:flex;gap:10px;margin-bottom:16px}
.sb{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
.sb .v{font-size:22px;font-weight:bold}
.sb .l{font-size:10px;color:#666;margin-top:2px}
.sg .v{color:#16a34a}.sa .v{color:#d97706}.sr .v{color:#dc2626}
table{width:100%;border-collapse:collapse}
thead{background:#1e40af}
th{color:#fff;padding:8px 6px;text-align:left;font-size:10px;font-weight:bold}
td{padding:6px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
tr:nth-child(even){background:#f8f9ff}
.st{padding:2px 7px;border-radius:10px;font-size:10px;font-weight:bold;white-space:nowrap}
.full{background:#d1fae5;color:#065f46}.partial{background:#fef3c7;color:#78350f}.unpaid{background:#fee2e2;color:#b91c1c}
.sum{margin-top:16px;padding:12px 16px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe}
.sum h3{font-size:12px;color:#1e40af;margin-bottom:8px}
.sum p{font-size:12px;margin:3px 0}
.ft{text-align:center;color:#999;font-size:10px;margin-top:16px;padding-top:10px;border-top:1px solid #e5e7eb}
@media print{.np{display:none}body{padding:8px}th{background:#1e40af!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.st{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="np">
  <button class="pbtn" onclick="window.print()">🖨️ Chop etish</button>
  <button class="pbtn gbtn" onclick="window.close()">✕ Yopish</button>
</div>
<div class="hdr"><h1>💰 Oylik To'lovlar Hisoboti</h1><p>${monthName} · Sana: ${printDate}</p></div>
<div class="stats">
  <div class="sb sg"><div class="v">${paidFull}</div><div class="l">To'liq to'landi</div></div>
  <div class="sb sa"><div class="v">${paidPartial}</div><div class="l">Qisman to'landi</div></div>
  <div class="sb sr"><div class="v">${unpaid}</div><div class="l">To'lanmadi</div></div>
  <div class="sb"><div class="v">${allWorkers.length}</div><div class="l">Jami ishchilar</div></div>
</div>
<table><thead><tr><th style="width:28px">№</th><th>Ishchi ismi</th><th>Lavozim</th><th>Oylik maosh</th><th>To'langan</th><th>Qabul qiluvchi</th><th>Sana</th><th>Holat</th></tr></thead><tbody>${rows}</tbody></table>
${(totalUZS > 0 || totalUSD > 0) ? `<div class="sum"><h3>📊 Jami to'lovlar</h3>${totalUZS > 0 ? `<p>So'm: <strong>${totalUZS.toLocaleString('ru-RU')} so'm</strong></p>` : ''}${totalUSD > 0 ? `<p>Dollar: <strong>$${totalUSD.toLocaleString('en-US')}</strong></p>` : ''}</div>` : ''}
<div class="ft">Oylik Boshqaruv Tizimi · ${printDate}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},700);};</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Single payment receipt (PDF-printable HTML)
router.get('/payment/:id', (req, res) => {
  const p = queryOne(`
    SELECT p.*, w.name as worker_name, w.position as worker_position,
           w.salary_amount as worker_salary, w.salary_currency as worker_salary_currency
    FROM payments p JOIN workers w ON p.worker_id = w.id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!p) return res.status(404).json({ error: "To'lov topilmadi" });

  const paidAt = p.paid_at ? new Date(p.paid_at) : new Date();
  const dateStr = paidAt.toLocaleDateString('ru-RU');
  const timeStr = paidAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const monthName = getMonthName(p.payment_month);
  const typeLabel = p.payment_type === 'full' ? "To'liq oylik" : "Avans / Qisman";
  const amountFmt = Number(p.amount).toLocaleString('ru-RU') + (p.currency === 'UZS' ? " so'm" : ' $');

  const sigBlock = p.signature_photo
    ? `<div class="img-block">
        <p class="img-lbl">✍️ Imzo</p>
        <img src="${p.signature_photo}" alt="Imzo" class="sig-img">
       </div>`
    : '';

  const photoBlock = p.photo_url
    ? `<div class="img-block">
        <p class="img-lbl">📷 Rasm</p>
        <img src="${p.photo_url}" alt="Rasm" class="photo-img">
       </div>`
    : '';

  const html = `<!DOCTYPE html><html lang="uz"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kvitansiya #${p.id} — ${p.worker_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#f5f7fa;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:20px}
.actions{display:flex;gap:10px;margin-bottom:20px;width:100%;max-width:480px}
.btn{flex:1;padding:10px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold}
.btn-print{background:#2563eb;color:#fff}
.btn-print:hover{background:#1d4ed8}
.btn-close{background:#e5e7eb;color:#374151}
.btn-close:hover{background:#d1d5db}
.receipt{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:100%;max-width:480px;overflow:hidden}
.hdr{background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;text-align:center;padding:20px 16px}
.hdr h1{font-size:16px;letter-spacing:.5px;margin-bottom:4px}
.hdr p{font-size:11px;opacity:.8}
.badge{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;padding:3px 12px;font-size:11px;margin-top:8px}
.section{padding:14px 18px;border-bottom:1px solid #f0f0f0}
.section:last-child{border-bottom:none}
.section-title{font-size:10px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7px}
.row:last-child{margin-bottom:0}
.row .lbl{color:#6b7280;font-size:12px}
.row .val{font-weight:bold;font-size:12px;text-align:right;max-width:60%}
.amount-big{font-size:22px;font-weight:bold;color:#1e40af;text-align:center;padding:14px 18px;border-bottom:1px solid #f0f0f0}
.type-badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:bold}
.type-full{background:#d1fae5;color:#065f46}
.type-partial{background:#fef3c7;color:#78350f}
.img-block{padding:14px 18px;border-bottom:1px solid #f0f0f0}
.img-lbl{font-size:10px;font-weight:bold;color:#9ca3af;text-transform:uppercase;margin-bottom:8px}
.sig-img{max-width:100%;max-height:160px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;display:block}
.photo-img{max-width:100%;max-height:220px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;display:block}
.footer{text-align:center;color:#9ca3af;font-size:10px;padding:12px 18px}
.no-imgs{padding:14px 18px;text-align:center;color:#d1d5db;font-size:12px;border-bottom:1px solid #f0f0f0}
@media print{
  body{background:#fff;padding:0}
  .actions{display:none}
  .receipt{box-shadow:none;border-radius:0;max-width:100%}
  .sig-img,.photo-img{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style></head><body>
<div class="actions">
  <button class="btn btn-print" onclick="window.print()">🖨️ Chop etish / PDF</button>
  <button class="btn btn-close" onclick="if(history.length>1){history.back()}else{window.close()}">← Orqaga</button>
</div>
<div class="receipt">
  <div class="hdr">
    <h1>💰 TO'LOV KVITANSIYASI</h1>
    <p>Oylik Boshqaruv Tizimi</p>
    <span class="badge">№ ${p.id} · ${dateStr} ${timeStr}</span>
  </div>

  <div class="section">
    <div class="section-title">Ishchi ma'lumoti</div>
    <div class="row"><span class="lbl">Ismi:</span><span class="val">${p.worker_name}</span></div>
    ${p.worker_position ? `<div class="row"><span class="lbl">Lavozimi:</span><span class="val">${p.worker_position}</span></div>` : ''}
    <div class="row"><span class="lbl">Oylik maoshi:</span><span class="val">${Number(p.worker_salary).toLocaleString('ru-RU')} ${p.worker_salary_currency === 'UZS' ? "so'm" : '$'}</span></div>
  </div>

  <div class="amount-big">${amountFmt}</div>

  <div class="section">
    <div class="section-title">To'lov tafsiloti</div>
    <div class="row"><span class="lbl">Oy:</span><span class="val">${monthName}</span></div>
    <div class="row"><span class="lbl">To'lov turi:</span><span class="val"><span class="type-badge ${p.payment_type === 'full' ? 'type-full' : 'type-partial'}">${typeLabel}</span></span></div>
    ${p.receiver_name ? `<div class="row"><span class="lbl">Qabul qildi:</span><span class="val">${p.receiver_name}${p.receiver_relation ? ' (' + p.receiver_relation + ')' : ''}</span></div>` : ''}
    <div class="row"><span class="lbl">Sana:</span><span class="val">${dateStr} ${timeStr}</span></div>
  </div>

  ${sigBlock}
  ${photoBlock}
  ${!sigBlock && !photoBlock ? `<div class="no-imgs">Imzo yoki rasm biriktirilmagan</div>` : ''}

  <div class="footer">Oylik Boshqaruv Tizimi · ${dateStr}</div>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;

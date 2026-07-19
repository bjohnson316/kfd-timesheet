const HOUR_KEYS = ['regular', 'dplr', 'flsa', 'dpflsa', 'ot', 'dplo', 'sick', 'vacation', 'holiday', 'other'];
const HOUR_LABELS = {
  regular: 'Regular Hours', dplr: 'DPLR', flsa: 'FLSA', dpflsa: 'DPFLSA',
  ot: 'Overtime Hours', dplo: 'DPLO', sick: 'Sick', vacation: 'Vacation',
  holiday: 'Holiday', other: 'Other'
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let sigPad;
let citySealDataUrl = null;

function loadImageAsDataUrl(path) {
  return fetch(path)
    .then(resp => resp.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .catch(err => {
      console.error('Could not load image', path, err);
      return null;
    });
}

function formatDate(d) {
  return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function buildWeekRows(tbody, startIndex) {
  tbody.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const dayOffset = startIndex + i;
    const tr = document.createElement('tr');
    tr.dataset.dayOffset = dayOffset;

    const dayTd = document.createElement('td');
    dayTd.className = 'col-day-cell';
    dayTd.dataset.role = 'day-label';
    dayTd.textContent = '—';
    tr.appendChild(dayTd);

    const inTd = document.createElement('td');
    const inInput = document.createElement('input');
    inInput.type = 'time';
    inInput.dataset.field = 'in';
    inTd.appendChild(inInput);
    tr.appendChild(inTd);

    const outTd = document.createElement('td');
    const outInput = document.createElement('input');
    outInput.type = 'time';
    outInput.dataset.field = 'out';
    outTd.appendChild(outInput);
    tr.appendChild(outTd);

    HOUR_KEYS.forEach(key => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '0.25';
      input.dataset.field = key;
      input.setAttribute('aria-label', HOUR_LABELS[key] + ' hours');
      td.appendChild(input);
      tr.appendChild(td);
    });

    const totalTd = document.createElement('td');
    totalTd.className = 'total-cell';
    totalTd.dataset.role = 'row-total';
    totalTd.textContent = '0';
    tr.appendChild(totalTd);

    tbody.appendChild(tr);
  }
}

function recalcAll() {
  const start = document.getElementById('payPeriodStart').value;
  const grand = {};
  HOUR_KEYS.forEach(k => grand[k] = 0);
  grand.total = 0;

  [1, 2].forEach(weekNum => {
    const table = document.getElementById(`table-week-${weekNum}`);
    const tbody = table.querySelector('tbody');
    const weekTotals = {};
    HOUR_KEYS.forEach(k => weekTotals[k] = 0);
    let weekGrandTotal = 0;

    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
      const offset = parseInt(tr.dataset.dayOffset, 10);
      const dayLabelTd = tr.querySelector('[data-role="day-label"]');
      if (start) {
        const d = addDays(new Date(start + 'T00:00:00'), offset);
        dayLabelTd.textContent = formatDate(d);
      } else {
        dayLabelTd.textContent = `Day ${offset + 1}`;
      }

      let rowTotal = 0;
      HOUR_KEYS.forEach(key => {
        const input = tr.querySelector(`input[data-field="${key}"]`);
        const val = parseFloat(input.value) || 0;
        rowTotal += val;
        weekTotals[key] += val;
      });
      rowTotal = round2(rowTotal);
      weekGrandTotal += rowTotal;
      tr.querySelector('[data-role="row-total"]').textContent = rowTotal.toFixed(2).replace(/\.00$/, '');
    });

    weekGrandTotal = round2(weekGrandTotal);
    const tfoot = table.querySelector('tfoot');
    HOUR_KEYS.forEach(key => {
      weekTotals[key] = round2(weekTotals[key]);
      grand[key] += weekTotals[key];
      tfoot.querySelector(`[data-total="${key}"]`).textContent = weekTotals[key].toFixed(2).replace(/\.00$/, '');
    });
    tfoot.querySelector('[data-total="total"]').textContent = weekGrandTotal.toFixed(2).replace(/\.00$/, '');
    grand.total += weekGrandTotal;
  });

  HOUR_KEYS.forEach(key => {
    grand[key] = round2(grand[key]);
    document.querySelector(`[data-grand="${key}"]`).textContent = grand[key].toFixed(2).replace(/\.00$/, '');
  });
  grand.total = round2(grand.total);
  document.querySelector('[data-grand="total"]').textContent = grand.total.toFixed(2).replace(/\.00$/, '');

  updatePayPeriodDisplay();
}

function updatePayPeriodDisplay() {
  const startVal = document.getElementById('payPeriodStart').value;
  const el = document.getElementById('payPeriodDisplay');
  if (!startVal) { el.textContent = '— select a start date —'; return; }
  const start = new Date(startVal + 'T00:00:00');
  const end = addDays(start, 13);
  el.textContent = `${isoDate(start)}  \u2192  ${isoDate(end)}`;
}

function collectData() {
  const employeeName = document.getElementById('employeeName').value.trim();
  const start = document.getElementById('payPeriodStart').value;
  const schedule = document.getElementById('scheduleCode').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const recipient = document.getElementById('recipientEmail').value.trim();
  const sigDate = document.getElementById('sigDate').value;

  const weeks = [1, 2].map(weekNum => {
    const table = document.getElementById(`table-week-${weekNum}`);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
      const row = { day: tr.querySelector('[data-role="day-label"]').textContent };
      row.in = tr.querySelector('input[data-field="in"]').value;
      row.out = tr.querySelector('input[data-field="out"]').value;
      HOUR_KEYS.forEach(key => {
        row[key] = tr.querySelector(`input[data-field="${key}"]`).value || '0';
      });
      row.total = tr.querySelector('[data-role="row-total"]').textContent;
      return row;
    });
    const tfoot = table.querySelector('tfoot');
    const totals = {};
    HOUR_KEYS.concat(['total']).forEach(key => {
      totals[key] = tfoot.querySelector(`[data-total="${key}"]`).textContent;
    });
    return { rows, totals };
  });

  const grand = {};
  HOUR_KEYS.concat(['total']).forEach(key => {
    grand[key] = document.querySelector(`[data-grand="${key}"]`).textContent;
  });

  return { employeeName, start, schedule, notes, recipient, sigDate, weeks, grand };
}

function drawSolidRow(doc, marginX, pageWidth, startY, values, fillColor, textColor) {
  const rowHeight = 20;
  const firstColWidth = 90;
  const totalWidth = pageWidth - marginX * 2;
  const colWidth = (totalWidth - firstColWidth) / (values.length - 1);

  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.rect(marginX, startY, totalWidth, rowHeight, 'F');

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  const textY = startY + rowHeight / 2 + 3;
  doc.text(String(values[0]), marginX + 6, textY, { align: 'left' });
  for (let i = 1; i < values.length; i++) {
    const cx = marginX + firstColWidth + (i - 1) * colWidth + colWidth / 2;
    doc.text(String(values[i]), cx, textY, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);
  return startY + rowHeight;
}

function buildPdf(data, signatureDataUrl, citySealImg) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const marginX = 32;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  if (citySealImg) {
    const sealSize = 44;
    const sealX = pageWidth - marginX - sealSize;
    const sealY = 12;
    doc.addImage(citySealImg, 'PNG', sealX, sealY, sealSize, sealSize);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('14 Day Schedule Time Record (non-exempt)', marginX, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.schedule || '', pageWidth - marginX - 50, y + 24, { align: 'right' });

  y += 20;
  doc.setFontSize(11);
  doc.text(`Employee: ${data.employeeName}`, marginX, y);
  const start = data.start ? new Date(data.start + 'T00:00:00') : null;
  const end = start ? addDays(start, 13) : null;
  doc.text(`Pay period: ${start ? isoDate(start) : ''}  to  ${end ? isoDate(end) : ''}`, 400, y);

  const head = [['Day / Date', 'In', 'Out', 'Reg', 'DPLR', 'FLSA', 'DPFLSA', 'OT', 'DPLO', 'Sick', 'Vac', 'Hol', 'Other', 'Total']];

  y += 14;
  data.weeks.forEach((week, idx) => {
    const body = week.rows.map(r => [
      r.day, r.in || '', r.out || '', r.regular, r.dplr, r.flsa, r.dpflsa, r.ot, r.dplo, r.sick, r.vacation, r.holiday, r.other, r.total
    ]);

    doc.autoTable({
      head, body,
      startY: y,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [28, 43, 43], textColor: 255 },
      columnStyles: { 0: { halign: 'left', cellWidth: 90 } }
    });

    const weekTotalY = drawSolidRow(
      doc, marginX, pageWidth, doc.lastAutoTable.finalY,
      [
        `WEEK ${idx + 1} TOTAL`, '', '',
        week.totals.regular, week.totals.dplr, week.totals.flsa, week.totals.dpflsa,
        week.totals.ot, week.totals.dplo, week.totals.sick, week.totals.vacation,
        week.totals.holiday, week.totals.other, week.totals.total
      ],
      [28, 43, 43], [255, 255, 255]
    );

    y = weekTotalY + 14;
  });

  y = drawSolidRow(
    doc, marginX, pageWidth, y,
    [
      'PAY PERIOD TOTALS', '', '',
      data.grand.regular, data.grand.dplr, data.grand.flsa, data.grand.dpflsa,
      data.grand.ot, data.grand.dplo, data.grand.sick, data.grand.vacation,
      data.grand.holiday, data.grand.other, data.grand.total
    ],
    [165, 55, 44], [255, 255, 255]
  );
  y += 18;

  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(data.notes, 700);
    doc.text(split, marginX, y + 14);
    y += 14 + split.length * 12 + 10;
  }

  y += 10;
  const sigColWidth = 340;
  const directorX = marginX + sigColWidth + 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Employee signature:', marginX, y);
  doc.text('Director signature:', directorX, y);

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, 'PNG', marginX, y + 8, 180, 55);
  }
  doc.setDrawColor(120);
  doc.line(directorX, y + 55, directorX + 200, y + 55);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Sign here (print & sign by hand)', directorX, y + 66);
  doc.setTextColor(0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${data.employeeName || ''}`, marginX, y + 72);
  doc.text(`Date: ${data.sigDate || ''}`, marginX, y + 86);

  doc.text('Name: ______________________', directorX, y + 84);
  doc.text('Date: ______________', directorX, y + 98);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Submitted electronically ${new Date().toLocaleString()}`, marginX, 570);

  return doc;
}

function setStatus(msg, kind) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'status-msg' + (kind ? ' ' + kind : '');
}

function submitViaHiddenIframe(fields) {
  return new Promise((resolve) => {
    const iframeName = 'submitFrame_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = iframeName;

    Object.keys(fields).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = fields[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);

    let settled = false;
    iframe.addEventListener('load', () => {
      if (settled) return;
      settled = true;
      resolve(true);
      setTimeout(() => { iframe.remove(); form.remove(); }, 500);
    });

    form.submit();

    // Fallback in case the load event doesn't fire in some browsers.
    setTimeout(() => {
      if (!settled) { settled = true; resolve(true); }
    }, 8000);
  });
}

function init() {
  // Wire the submit button up FIRST, before anything else runs, so that even
  // if a later setup step throws, clicking the button still does *something*
  // (shows an error) instead of silently doing nothing.
  document.getElementById('submitBtn').addEventListener('click', onSubmit);

  window.addEventListener('error', (e) => {
    setStatus('Something went wrong on this page (' + e.message + '). Try refreshing.', 'error');
  });

  try {
    const week1Tbody = document.querySelector('#table-week-1 tbody');
    const week2Tbody = document.querySelector('#table-week-2 tbody');
    buildWeekRows(week1Tbody, 0);
    buildWeekRows(week2Tbody, 7);

    const today = new Date();
    document.getElementById('sigDate').value = isoDate(today);

    document.getElementById('payPeriodStart').addEventListener('change', recalcAll);
    document.body.addEventListener('input', (e) => {
      if (e.target.closest('table.timesheet-table')) recalcAll();
    });

    sigPad = createSignaturePad(document.getElementById('sigPad'));
    document.getElementById('clearSig').addEventListener('click', () => sigPad.clear());

    loadImageAsDataUrl('assets/city-of-krum-seal.png').then(dataUrl => { citySealDataUrl = dataUrl; });

    recalcAll();
  } catch (err) {
    console.error('Error while setting up the form:', err);
    setStatus('The form did not load correctly (' + err.message + '). Try refreshing the page.', 'error');
  }
}

async function onSubmit() {
  if (!sigPad) {
    setStatus('The signature pad did not load correctly. Try refreshing the page.', 'error');
    return;
  }
  const data = collectData();

  if (!data.employeeName) { setStatus('Enter the employee name.', 'error'); return; }
  if (!data.start) { setStatus('Select a pay period start date.', 'error'); return; }
  if (!data.recipient) { setStatus('Enter the recipient email address.', 'error'); return; }
  if (!document.getElementById('attestCheck').checked) { setStatus('Check the certification box before submitting.', 'error'); return; }
  if (sigPad.isEmpty()) { setStatus('Employee signature is required before submitting.', 'error'); return; }
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PASTE_YOUR') === 0) {
    setStatus('This app is not yet connected to an email backend. See README.md (js/config.js).', 'error');
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    setStatus('The PDF library did not load (check your internet connection or ad blocker) and try again.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  setStatus('Generating PDF…', 'pending');

  try {
    if (citySealDataUrl === null) {
      citySealDataUrl = await loadImageAsDataUrl('assets/city-of-krum-seal.png');
    }
    const signatureDataUrl = sigPad.toDataURL();
    const doc = buildPdf(data, signatureDataUrl, citySealDataUrl);
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const filename = `Timesheet_${data.employeeName.replace(/\s+/g, '_')}_${data.start}.pdf`;

    setStatus('Sending email…', 'pending');

    await submitViaHiddenIframe({
      recipient: data.recipient,
      employeeName: data.employeeName,
      payPeriod: `${data.start} to ${isoDate(addDays(new Date(data.start + 'T00:00:00'), 13))}`,
      filename,
      pdfBase64
    });

    setStatus('Timesheet sent. A copy has also been downloaded for your records.', 'ok');
    doc.save(filename);
  } catch (err) {
    console.error(err);
    setStatus('Something went wrong generating or sending the timesheet. Try again.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', init);

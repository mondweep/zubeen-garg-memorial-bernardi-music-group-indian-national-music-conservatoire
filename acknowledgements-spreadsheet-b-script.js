/**
 * Seven Sisters Global Music Workshop 2026 — Acknowledgement Dashboard
 * ─────────────────────────────────────────────────────────────────────
 * Lives in SPREADSHEET B (a NEW spreadsheet). Reads the live registration
 * spreadsheet (A) READ-ONLY — nothing in A or its script is ever touched.
 *
 * What it does:
 *   • Sync:  imports rows from A that aren't already in B (key: Timestamp+Email)
 *   • Send:  emails a welcome/acknowledgement to registrants who gave consent
 *            and whose EMAIL has never been acknowledged before (one per person)
 *   • Front end: deploy as a web app → a private dashboard page with a
 *     "Sync & Send" button and a pending list. Manual trigger only.
 *
 * Setup: paste into Extensions → Apps Script of Spreadsheet B, set
 * SOURCE_SPREADSHEET_ID below, run previewPending() once to authorize,
 * then Deploy → New deployment → Web app (Execute as: Me, Access: Only myself).
 */

var CONFIG = {
  // ← REQUIRED: the ID from Spreadsheet A's URL:
  // https://docs.google.com/spreadsheets/d/THIS_LONG_ID/edit
  SOURCE_SPREADSHEET_ID: 'PASTE_SPREADSHEET_A_ID_HERE',

  // Tab in Spreadsheet A holding registrations. '' = first sheet.
  SOURCE_SHEET_NAME: '',

  // Tab created in THIS spreadsheet (B) to hold the copy.
  LOCAL_SHEET_NAME: 'Registrations',

  FROM_NAME: 'Seven Sisters Conservatoire',
  REPLY_TO: 'hello@sevensistersconservatoire.org',
  CC: 'hello@sevensistersconservatoire.org',
  BCC: 'mondweep@bridgeconnect.biz',
  SUBJECT: 'Thank you for registering — Seven Sisters Global Music Workshop 2026',
  WHATSAPP_NUMBER_DISPLAY: '+44 7378 916534',
  WHATSAPP_LINK:
    'https://wa.me/447378916534?text=' +
    encodeURIComponent(
      "Hi Seven Sisters Conservatoire team, I've registered my interest in the Global Music Workshop 2026 and would like to know more."
    ),
};

// Column layout (0-based) — matches Spreadsheet A, plus Acknowledged in B.
var COLS = { ts: 0, name: 1, email: 2, phone: 3, interests: 4, message: 5, source: 6, consent: 7, ack: 8 };
var HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Interests', 'Message', 'Lead Source', 'Consent Given', 'Acknowledged'];

/* ── WEB APP FRONT END ───────────────────────────────────────────────── */

function doGet() {
  var html =
    '<!DOCTYPE html><html><head><base target="_top">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' +
    'body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 16px;color:#222;}' +
    'h1{font-size:1.3rem;letter-spacing:.05em;} .sub{color:#777;font-size:.9rem;}' +
    'button{background:#1a7f37;color:#fff;border:none;padding:12px 28px;border-radius:24px;font-size:1rem;cursor:pointer;font-family:Arial,sans-serif;}' +
    'button:disabled{background:#aaa;cursor:wait;}' +
    'table{border-collapse:collapse;width:100%;margin:18px 0;font-size:.9rem;font-family:Arial,sans-serif;}' +
    'th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;}th{background:#f5f2ea;}' +
    '#result{margin-top:16px;padding:12px;border-radius:8px;display:none;font-family:Arial,sans-serif;}' +
    '.ok{background:#e6f4ea;border:1px solid #1a7f37;} .err{background:#fdecea;border:1px solid #c0392b;}' +
    '</style></head><body>' +
    '<h1>Seven Sisters Workshop 2026 — Acknowledgements</h1>' +
    '<p class="sub">Reads the live registration sheet (read-only), imports new rows, and sends one welcome email per new registrant. Nothing sends without you clicking the button.</p>' +
    '<p><b id="status">Loading pending registrations…</b></p>' +
    '<div id="pending"></div>' +
    '<button id="go" onclick="run()" disabled>Sync &amp; Send Acknowledgements</button>' +
    '<div id="result"></div>' +
    '<script>' +
    'function refresh(){google.script.run.withSuccessHandler(show).withFailureHandler(fail).previewPending();}' +
    'function show(p){' +
    ' document.getElementById("status").textContent=p.pending.length+" pending ("+p.newInSource+" new in source sheet, "+p.alreadyAcked+" already acknowledged)";' +
    ' var h="";' +
    ' if(p.pending.length){h="<table><tr><th>Registered</th><th>Name</th><th>Email</th></tr>";' +
    '  p.pending.forEach(function(r){h+="<tr><td>"+r.ts+"</td><td>"+r.name+"</td><td>"+r.email+"</td></tr>";});h+="</table>";}' +
    ' document.getElementById("pending").innerHTML=h;' +
    ' document.getElementById("go").disabled=p.pending.length===0;}' +
    'function run(){var b=document.getElementById("go");b.disabled=true;b.textContent="Sending…";' +
    ' google.script.run.withSuccessHandler(done).withFailureHandler(fail).syncAndSend();}' +
    'function done(r){var el=document.getElementById("result");el.className="ok";el.style.display="block";' +
    ' el.textContent="Imported "+r.imported+" new row(s). Sent "+r.sent+" acknowledgement(s), skipped "+r.skipped+".";' +
    ' var b=document.getElementById("go");b.textContent="Sync & Send Acknowledgements";refresh();}' +
    'function fail(e){var el=document.getElementById("result");el.className="err";el.style.display="block";' +
    ' el.textContent="Error: "+(e&&e.message?e.message:e);document.getElementById("go").disabled=false;}' +
    'refresh();' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Acknowledgements — Seven Sisters 2026');
}

/* ── CORE ACTIONS (called from the page, or runnable from the editor) ── */

// Sync from A, then send to pending registrants. Returns a summary.
function syncAndSend() {
  var imported = syncFromSource_();
  var sheet = getLocalSheet_();
  var data = sheet.getDataRange().getValues();
  var ackedEmails = collectAckedEmails_(data);

  var sent = 0, skipped = 0;
  for (var r = 1; r < data.length; r++) {
    var email = normEmail_(data[r][COLS.email]);
    var eligible = isEligible_(data[r], ackedEmails);
    if (!eligible) { if (email) skipped++; continue; }

    sendWelcomeEmail_(email, String(data[r][COLS.name] || '').trim());
    sheet.getRange(r + 1, COLS.ack + 1).setValue(new Date());
    ackedEmails[email] = true; // dedup within this run too
    sent++;
    Utilities.sleep(500);
  }
  return { imported: imported, sent: sent, skipped: skipped };
}

// Dashboard preview: sync counts + who would receive an email.
function previewPending() {
  var newInSource = syncFromSource_();
  var data = getLocalSheet_().getDataRange().getValues();
  var ackedEmails = collectAckedEmails_(data);

  var pending = [], alreadyAcked = 0;
  var seen = {};
  for (var r = 1; r < data.length; r++) {
    var email = normEmail_(data[r][COLS.email]);
    if (!email) continue;
    if (data[r][COLS.ack] !== '' && data[r][COLS.ack] != null) { alreadyAcked++; continue; }
    if (isEligible_(data[r], ackedEmails) && !seen[email]) {
      seen[email] = true;
      pending.push({
        ts: formatTs_(data[r][COLS.ts]),
        name: String(data[r][COLS.name] || ''),
        email: email,
      });
    }
  }
  return { newInSource: newInSource, pending: pending, alreadyAcked: alreadyAcked };
}

// Editor-run test: sends the welcome email to yourself only.
function sendTestEmailToMyself() {
  sendWelcomeEmail_(Session.getActiveUser().getEmail(), 'Test User');
  Logger.log('Test email sent to ' + Session.getActiveUser().getEmail());
}

/* ── SYNC (read-only against Spreadsheet A) ──────────────────────────── */

function syncFromSource_() {
  var src = SpreadsheetApp.openById(CONFIG.SOURCE_SPREADSHEET_ID);
  var srcSheet = CONFIG.SOURCE_SHEET_NAME
    ? src.getSheetByName(CONFIG.SOURCE_SHEET_NAME)
    : src.getSheets()[0];
  if (!srcSheet) throw new Error('Source sheet not found. Check CONFIG.SOURCE_SHEET_NAME.');

  var srcData = srcSheet.getDataRange().getValues();
  var local = getLocalSheet_();
  var localData = local.getDataRange().getValues();

  // Existing keys in B: timestamp|email
  var keys = {};
  for (var r = 1; r < localData.length; r++) {
    keys[rowKey_(localData[r])] = true;
  }

  var added = 0;
  for (var s = 1; s < srcData.length; s++) {
    if (!normEmail_(srcData[s][COLS.email]) && !String(srcData[s][COLS.name] || '').trim()) continue; // blank row
    var key = rowKey_(srcData[s]);
    if (keys[key]) continue;
    local.appendRow([
      srcData[s][COLS.ts], srcData[s][COLS.name], srcData[s][COLS.email],
      srcData[s][COLS.phone], srcData[s][COLS.interests], srcData[s][COLS.message],
      srcData[s][COLS.source], srcData[s][COLS.consent], '', // Acknowledged empty
    ]);
    keys[key] = true;
    added++;
  }
  return added;
}

/* ── EMAIL ───────────────────────────────────────────────────────────── */

function sendWelcomeEmail_(email, name) {
  var firstName = name ? name.split(' ')[0] : 'Friend';

  var html =
    '<div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#222;line-height:1.6;">' +
    '<p>Dear ' + escapeHtml_(firstName) + ',</p>' +
    '<p>Thank you for registering your interest in the <b>Seven Sisters Global Music Workshop 2026</b> &mdash; we&rsquo;re delighted to have you with us.</p>' +
    '<p>Your registration has been received, and you&rsquo;ll be among the first to hear about programme details, dates and opportunities to take part as we approach October 2026. Together with the Bernardi Music Group, we&rsquo;re building something truly special in Assam &mdash; a celebration of the region&rsquo;s musical heritage on a global stage, honouring the legacy of Zubeen Garg.</p>' +
    '<p><b>Have a question, or want to get involved sooner?</b><br>The fastest way to reach the team is on WhatsApp:</p>' +
    '<p style="text-align:center;margin:24px 0;">' +
    '<a href="' + CONFIG.WHATSAPP_LINK + '" style="background:#25D366;color:#fff;padding:12px 28px;border-radius:28px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;">Chat with us on WhatsApp</a><br>' +
    '<span style="font-size:13px;color:#555;">' + CONFIG.WHATSAPP_NUMBER_DISPLAY + ' &mdash; tap and your message is pre-filled, just press send.</span></p>' +
    '<p>Prefer email? Write to us at <a href="mailto:' + CONFIG.REPLY_TO + '">' + CONFIG.REPLY_TO + '</a> &mdash; replying to this message reaches us there too.</p>' +
    '<p>We look forward to sharing this journey with you.</p>' +
    '<p>Warm regards,<br><b>The Seven Sisters Conservatoire Team</b><br>' +
    'Seven Sisters Global Music Workshop 2026<br>' +
    '<span style="font-size:13px;color:#555;">in association with the Bernardi Music Group</span></p>' +
    '<hr style="border:none;border-top:1px solid #ddd;">' +
    '<p style="font-size:12px;color:#888;">You are receiving this email because you registered your interest via our form and gave consent to be contacted. If this was not you, please reply to let us know.</p>' +
    '</div>';

  var plain =
    'Dear ' + firstName + ',\n\n' +
    'Thank you for registering your interest in the Seven Sisters Global Music Workshop 2026.\n\n' +
    'Your registration has been received, and you\'ll be among the first to hear about programme details as we approach October 2026.\n\n' +
    'The fastest way to reach the team is on WhatsApp: ' + CONFIG.WHATSAPP_NUMBER_DISPLAY + '\n' +
    CONFIG.WHATSAPP_LINK + '\n\n' +
    'Prefer email? Write to us at ' + CONFIG.REPLY_TO + ' — replying to this message reaches us there too.\n\n' +
    'Warm regards,\nThe Seven Sisters Conservatoire Team';

  MailApp.sendEmail({
    to: email,
    subject: CONFIG.SUBJECT,
    body: plain,
    htmlBody: html,
    name: CONFIG.FROM_NAME,
    replyTo: CONFIG.REPLY_TO,
    cc: CONFIG.CC,
    bcc: CONFIG.BCC,
  });
}

/* ── HELPERS ─────────────────────────────────────────────────────────── */

function getLocalSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.LOCAL_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOCAL_SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function isEligible_(row, ackedEmails) {
  var email = normEmail_(row[COLS.email]);
  if (!email) return false;
  if (row[COLS.ack] !== '' && row[COLS.ack] != null) return false;        // this row already acked
  if (ackedEmails[email]) return false;                                    // this PERSON already acked
  if (!/yes|agree|true/i.test(String(row[COLS.consent] || ''))) return false;
  return true;
}

function collectAckedEmails_(data) {
  var acked = {};
  for (var r = 1; r < data.length; r++) {
    if (data[r][COLS.ack] !== '' && data[r][COLS.ack] != null) {
      var e = normEmail_(data[r][COLS.email]);
      if (e) acked[e] = true;
    }
  }
  return acked;
}

function rowKey_(row) {
  var ts = row[COLS.ts];
  var t = (ts instanceof Date) ? ts.getTime() : String(ts);
  return t + '|' + normEmail_(row[COLS.email]);
}

function normEmail_(v) {
  return String(v || '').trim().toLowerCase();
}

function formatTs_(ts) {
  if (ts instanceof Date) {
    return Utilities.formatDate(ts, Session.getScriptTimeZone(), 'd MMM yyyy HH:mm');
  }
  return String(ts || '');
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

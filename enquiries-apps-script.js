/**
 * Seven Sisters Conservatoire — 2027 enquiry forms → one Google Sheet
 * ───────────────────────────────────────────────────────────────────
 * Receives submissions from three forms on sevensistersconservatoire.org:
 *   /lessons/       → tab "Lessons"        (private & group lessons interest)
 *   /universities/  → tab "Universities"   (membership enquiries)
 *   /get-involved/  → tab "Collaboration"  (ideas & offers for 2027 events)
 *
 * SETUP (about 5 minutes)
 *  1. Create a new Google Sheet, e.g. "Seven Sisters — Enquiries 2027".
 *  2. Extensions → Apps Script. Delete the placeholder, paste this whole file, Save.
 *  3. Run `setup` once from the function dropdown and authorise it
 *     (Review permissions → Allow; if warned "unverified app": Advanced → Go to project).
 *     This creates the three tabs with their header rows.
 *  4. Deploy → New deployment → ⚙️ → Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Deploy, then copy the Web app URL (ends in /exec) and send it to Claude.
 *     That URL goes into /assets/ssc-forms.js on the website.
 *  5. Optional: run `testAll` to write one test row to each tab, then delete those rows.
 *
 * Optional email alert on each new submission: set NOTIFY_EMAIL below.
 * If you edit this script later: Deploy → Manage deployments → ✏️ → New version → Deploy.
 */

var NOTIFY_EMAIL = ''; // e.g. 'hello@sevensistersconservatoire.org' — leave '' for no alerts

var TABS = {
  lessons: {
    name: 'Lessons',
    fields: [
      'respondent', 'learner_name', 'learner_age_band',
      'guardian_name', 'guardian_relationship',
      'contact_email', 'contact_phone', 'whatsapp_same',
      'city', 'state',
      'instruments', 'other_instrument', 'level',
      'lesson_format', 'times', 'goals',
      'workshop_2026', 'device', 'message',
      'guardian_consent', 'consent', 'page'
    ]
  },
  universities: {
    name: 'Universities',
    fields: [
      'institution', 'contact_name', 'designation',
      'contact_email', 'contact_phone', 'city', 'state',
      'level', 'areas', 'next_step', 'message',
      'consent', 'page'
    ]
  },
  collaboration: {
    name: 'Collaboration',
    fields: [
      'contact_name', 'organisation', 'role',
      'contact_email', 'contact_phone', 'country',
      'events', 'offer_types', 'idea', 'links',
      'consent', 'page'
    ]
  }
};

function doPost(e) {
  var d = (e && e.parameter) || {};

  // Honeypot: bots fill the hidden "website" field; humans never see it.
  if (d.website) return json_({ result: 'ignored' });

  var key = String(d.form || '').toLowerCase();
  var cfg = TABS[key];
  if (!cfg) return json_({ result: 'error', reason: 'unknown form' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = ensureTab_(cfg);
    var row = [new Date()].concat(cfg.fields.map(function (f) {
      return clean_(e.parameters && e.parameters[f] ? e.parameters[f].join('; ') : d[f]);
    }));
    row.push('New'); // Status column for your follow-up
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  if (NOTIFY_EMAIL) {
    try {
      MailApp.sendEmail(NOTIFY_EMAIL,
        'New ' + cfg.name + ' enquiry — sevensistersconservatoire.org',
        cfg.fields.map(function (f) { return f + ': ' + (d[f] || ''); }).join('\n'));
    } catch (err) { /* alerts are best-effort */ }
  }

  return json_({ result: 'success' });
}

function setup() {
  Object.keys(TABS).forEach(function (k) { ensureTab_(TABS[k]); });
}

function ensureTab_(cfg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name) || ss.insertSheet(cfg.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp'].concat(cfg.fields).concat(['status']));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, cfg.fields.length + 2).setFontWeight('bold');
  }
  return sheet;
}

// Stops spreadsheet formula injection (a value starting with = + - @ is stored as text).
function clean_(v) {
  v = (v === undefined || v === null) ? '' : String(v).slice(0, 5000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function testAll() {
  ['lessons', 'universities', 'collaboration'].forEach(function (k) {
    var p = { form: k, contact_email: 'test@example.com', consent: 'Yes', page: 'test' };
    p[k === 'lessons' ? 'learner_name' : 'contact_name'] = 'TEST ROW — delete me';
    Logger.log(doPost({ parameter: p, parameters: {} }).getContent());
  });
}

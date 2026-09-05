/**
 * BMG–GAEI 2026 Assam Programme — Interest Form → Google Sheets
 * + Automatic acknowledgement emails
 * ─────────────────────────────────────────────────────────────
 * COMBINED script: replaces the ENTIRE previous script project.
 * Your original doPost behaviour is preserved; an acknowledgement
 * email is now sent inside doPost after each registration.
 *
 * IMPORTANT — after saving, you MUST publish a new version:
 *   Deploy → Manage deployments → ✏️ Edit → Version: "New version" → Deploy
 * The web app URL stays the same; the brochure needs no changes.
 * Without this step the live URL keeps running the OLD code.
 *
 * Sheet columns (Row 1 headers):
 *   A: Timestamp  B: Name  C: Email  D: Phone  E: Interests
 *   F: Message    G: Lead Source    H: Consent Given
 *   I: Acknowledged  (auto-created; timestamp when email sent)
 */

var CONFIG = {
  FROM_NAME: 'Seven Sisters Conservatoire',
  SUBJECT: 'Thank you for registering — Seven Sisters Global Music Workshop 2026',
  WHATSAPP_NUMBER_DISPLAY: '+44 7378 916534',
  WHATSAPP_LINK:
    'https://wa.me/447378916534?text=' +
    encodeURIComponent(
      "Hi Seven Sisters Conservatoire team, I've registered my interest in the Global Music Workshop 2026 and would like to know more."
    ),
};

// Column positions (0-based) matching the headers above.
var COLS = { name: 1, email: 2, consent: 7, ack: 8 };

/* ── 1. FORM ENDPOINT — original behaviour + instant acknowledgement ── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var d = e.parameter;

  var row = [
    new Date(),                    // A — Timestamp
    d.name        || '',           // B — Full Name
    d.email       || '',           // C — Email Address
    d.phone       || '',           // D — Phone Number
    d.interests   || '',           // E — Areas of Interest
    d.message     || '',           // F — Message / Comments
    d.lead_source || 'Brochure',   // G — Lead Source
    d.consent     || '',           // H — Consent Given
  ];

  sheet.appendRow(row);
  var rowIndex = sheet.getLastRow();
  lock.releaseLock();

  // Acknowledgement email — must never break form logging, hence try/catch.
  try {
    var email = String(d.email || '').trim();
    var consentOk = /yes|agree|true/i.test(String(d.consent || ''));
    if (email && consentOk) {
      sendWelcomeEmail_(email, String(d.name || '').trim());
      ensureAckHeader_(sheet);
      sheet.getRange(rowIndex, COLS.ack + 1).setValue(new Date());
    }
  } catch (err) {
    Logger.log('Acknowledgement failed for row ' + rowIndex + ': ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success', rows: 1 }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── 2. MANUAL BACKFILL — run once for existing registrations ────────── */

function sendAcknowledgementsBackfill() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureAckHeader_(sheet);
  var data = sheet.getDataRange().getValues();

  var sent = 0, skipped = 0;
  for (var r = 1; r < data.length; r++) {
    var email = String(data[r][COLS.email] || '').trim();
    var name = String(data[r][COLS.name] || '').trim();
    var consentOk = /yes|agree|true/i.test(String(data[r][COLS.consent] || ''));
    var alreadyAcked = data[r][COLS.ack] !== '' && data[r][COLS.ack] != null;

    if (!email || alreadyAcked || !consentOk) { skipped++; continue; }

    sendWelcomeEmail_(email, name);
    sheet.getRange(r + 1, COLS.ack + 1).setValue(new Date());
    sent++;
    Utilities.sleep(500);
  }
  Logger.log('Backfill complete. Sent: ' + sent + ', skipped: ' + skipped);
}

/* ── 3. TEST FUNCTIONS ───────────────────────────────────────────────── */

// Sends the acknowledgement email to yourself only.
function sendTestEmailToMyself() {
  sendWelcomeEmail_(Session.getActiveUser().getEmail(), 'Test User');
  Logger.log('Test email sent to ' + Session.getActiveUser().getEmail());
}

// Original end-to-end test: writes a test row AND (now) sends an
// acknowledgement to the address below if consent is 'Yes'.
function testDoPost() {
  var mockEvent = {
    parameter: {
      name:        'Test User',
      email:       'test@example.com',   // change to your own address to test
      phone:       '+44 7700 900000',
      interests:   'Attending as a student/participant',
      message:     'This is a test submission from the brochure.',
      lead_source: 'Brochure',
      consent:     'Yes',
    }
  };
  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}

/* ── Internals ───────────────────────────────────────────────────────── */

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
    'Warm regards,\nThe Seven Sisters Conservatoire Team';

  MailApp.sendEmail({
    to: email,
    subject: CONFIG.SUBJECT,
    body: plain,
    htmlBody: html,
    name: CONFIG.FROM_NAME,
  });
}

function ensureAckHeader_(sheet) {
  var cell = sheet.getRange(1, COLS.ack + 1);
  if (cell.getValue() === '') cell.setValue('Acknowledged');
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

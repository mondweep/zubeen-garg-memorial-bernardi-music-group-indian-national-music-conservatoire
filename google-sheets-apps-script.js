/**
 * BMG–GAEI 2026 Assam Programme — Interest Form → Google Sheets
 * ─────────────────────────────────────────────────────────────
 * Deploy as:  Web app
 * Execute as: Me
 * Who has access: Anyone
 *
 * After pasting this into Extensions → Apps Script and deploying,
 * copy the Web App URL and paste it into the brochure's SHEET_URL constant.
 *
 * Google Sheet column order (Row 1 headers):
 *   A: Timestamp
 *   B: Name
 *   C: Email
 *   D: Phone
 *   E: Interests
 *   F: Message
 *   G: Lead Source
 *   H: Consent Given
 */

function doPost(e) {
  var sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getActiveSheet();

  var d = e.parameter;

  var row = [
    new Date(),                    // A — Timestamp
    d.name        || '',           // B — Full Name
    d.email       || '',           // C — Email Address
    d.phone       || '',           // D — Phone Number
    d.interests   || '',           // E — Areas of Interest (semicolon-separated)
    d.message     || '',           // F — Message / Comments
    d.lead_source || 'Brochure',   // G — Lead Source
    d.consent     || '',           // H — Consent Given
  ];

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success', rows: 1 }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this from the Apps Script editor to write a test row
 * and confirm the Sheet columns are correct before going live.
 */
function testDoPost() {
  var mockEvent = {
    parameter: {
      name:        'Test User',
      email:       'test@example.com',
      phone:       '+44 7700 900000',
      interests:   'Attending as a student/participant; Donating / supporting financially',
      message:     'This is a test submission from the brochure.',
      lead_source: 'Brochure',
      consent:     'Yes',
    }
  };
  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}

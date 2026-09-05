# Setup Guide — Acknowledgement Dashboard (Two-Spreadsheet, Zero-Risk Design)

**Design:** the live registration spreadsheet (A) and its web-app script are never modified. A NEW spreadsheet (B) holds a synced copy plus its own script, deployed as a private web dashboard. You click one button to sync new registrations from A and send acknowledgements — one email per person, ever.

Script file: `acknowledgements-spreadsheet-b-script.js`
(The earlier `acknowledgement-apps-script.js` combined-script approach is superseded — ignore that file.)

Time needed: ~15 minutes.

## Step 1 — Create Spreadsheet B

1. Create a new Google Sheet (e.g. "Workshop 2026 — Acknowledgements") under the same Workspace account.
2. Open **Extensions → Apps Script**, delete the placeholder, paste the full contents of `acknowledgements-spreadsheet-b-script.js`, and save.

## Step 2 — Point it at Spreadsheet A (read-only)

1. Open Spreadsheet A and copy the long ID from its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
2. In the script's `CONFIG`, paste it into `SOURCE_SPREADSHEET_ID`.
3. If A's registrations aren't on its first tab, set `SOURCE_SHEET_NAME` to the tab name; otherwise leave `''`.

The script only ever **reads** A — it cannot alter A's data, script, or deployment.

## Step 3 — First run & authorization

1. Function dropdown → **`previewPending`** → **Run**.
2. Authorize when prompted (**Review permissions → Allow**; if warned "unverified app": **Advanced → Go to project**). Permissions asked: read/write spreadsheets, send email as you.
3. This first run also creates the **Registrations** tab in B and imports all rows from A. Check they look right.
4. Optional: run **`sendTestEmailToMyself`** to see the welcome email in your own inbox (check the WhatsApp button on your phone).

## Step 4 — Deploy the dashboard

1. **Deploy → New deployment → ⚙️ → Web app**.
2. Settings: **Execute as: Me** · **Who has access: Only myself**.
3. **Deploy**, and copy the web app URL — bookmark it. That's your front end.

## Step 5 — Use it

Open the dashboard URL. It automatically syncs from A and shows who's pending (name, email, registration time). Click **Sync & Send Acknowledgements**. You get a summary: "Imported X new row(s). Sent Y, skipped Z."

Repeat whenever you like — daily, after a promotion push, etc. Nothing ever sends without your click.

## Safety properties

- **Spreadsheet A untouched:** read-only access; the brochure form and its web app cannot break.
- **No duplicate imports:** rows are keyed by Timestamp+Email; syncing twice never duplicates.
- **No duplicate emails:** one acknowledgement per email address, ever — enforced per-row (Acknowledged timestamp) and per-person (email checked against all previously acknowledged rows, including within the same run).
- **Consent respected:** only rows with Consent = Yes are emailed.
- **Manual only:** no triggers; the button is the only way emails go out.
- **Quota:** Workspace ~1,500 emails/day — ample.

## If you edit the email wording

Update `sendWelcomeEmail_` in the script and save. Since `previewPending`/`syncAndSend` run live (not from a pinned deployment version for `google.script.run` calls — but to be safe): **Deploy → Manage deployments → ✏️ → New version → Deploy** after any edit, so the dashboard uses the latest code.

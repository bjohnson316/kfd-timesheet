# Fire Hourly Timesheet — digital fill, sign & submit

A static web app that recreates the "14 Day Schedule TIME RECORD (non-exempt)"
timesheet as a fillable form: it auto-calculates row, week, and pay-period
totals the same way the spreadsheet formulas do, captures a hand-drawn
employee signature, and submits **the original spreadsheet file itself** —
same layout, same colors, same formulas, same cell formatting — with your
entries filled in, emailed to whoever you specify. No server required to
host it.

City Hall's requirement was that the submitted document must be the actual
spreadsheet, unchanged, not a redesigned copy — so this app doesn't rebuild
the timesheet from scratch. It opens the real `assets/timesheet-template.xlsx`
file (the one originally provided) in the browser, writes only the specific
cells that hold employee name, pay period, daily hours, notes, signature
date, and the signature image, and leaves every formula, column, color, and
border exactly as it was.

It's built as plain HTML/CSS/JS so it can be hosted for free on **GitHub
Pages**. Since GitHub Pages only serves static files, actually *sending* the
email is handled by a small **Google Apps Script** you deploy once under your
own Google account (free, no billing needed).

## How it works

```
Browser (GitHub Pages)  --fills cells in the original .xlsx-->  in-memory workbook
                                                                        |
                                                                        v
                                                         --submits filled .xlsx-->
                                                                        |
                                                                        v
                                                        Google Apps Script Web App
                                                                        |
                                                                        v
                                                             MailApp.sendEmail(...)
                                                                        |
                                                                        v
                                                       Recipient's inbox (.xlsx attached)
```

Nothing you type is stored anywhere except in that one outgoing email — there
is no database.

## 1. Deploy the email backend (Google Apps Script)

1. Go to [script.google.com](https://script.google.com) and sign in with the
   Google account you want emails to be sent *from*.
2. Click **New project**.
3. Delete the placeholder code and paste in the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
4. (Optional) Set `BCC_RECORD_KEEPING_EMAIL` near the top if you want every
   submission auto-BCC'd to an HR/records inbox.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**.
6. The first time, Google will ask you to authorize the script (it needs
   permission to send email on your behalf) — click through the consent
   screen (you may see an "unverified app" warning since it's your own
   private script; click **Advanced → Go to project (unsafe)** to proceed).
7. Copy the **Web app URL** it gives you — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

If you ever edit `Code.gs`, you need to **Deploy → Manage deployments →
Edit → New version** for the changes to go live at the same URL.

## 2. Connect the frontend to it

Open `js/config.js` in this repo and paste your URL in:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

## 3. Host it on GitHub Pages

1. Create a new GitHub repository and push everything in this folder to it —
   including `assets/timesheet-template.xlsx`, which the app needs at
   runtime to build each submission.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch",
   branch `main`, folder `/ (root)`. Save.
4. GitHub will give you a URL like `https://yourusername.github.io/reponame/`
   — that's the live app.

## 4. Using the app

1. Fill in employee name and the pay period start date — the app fills in
   the day/date for all 14 rows automatically and computes the end date.
2. Enter hours per day per column (Regular, DPLR, FLSA, DPFLSA, Overtime,
   DPLO, Sick, Vacation, Holiday, Other). Row totals, week totals, and the
   pay-period grand total update live in the browser, matching the original
   spreadsheet's `SUM` formulas (which also still live inside the file
   itself — opening the submitted `.xlsx` in Excel or Sheets recalculates
   them the normal way).
3. Add notes if needed.
4. Sign in the employee signature box, check the certification box, confirm
   the date.
5. Enter the recipient's email address (whoever should receive the
   completed timesheet).
6. Click **Sign & submit timesheet**. The app opens the original template,
   writes your entries into the correct cells, embeds the signature as an
   image over the employee signature line, emails the resulting `.xlsx`
   through your Apps Script, and also downloads a copy to the submitter's
   own computer as a receipt.

The **director signature** is not captured digitally — the submitted
spreadsheet's director signature line is left blank, matching the original
file, for the director to sign by hand after printing.

**Entries are saved automatically in the browser** (name, pay period, every
hour entered, notes, and the signature) as you type, so refreshing the page
or closing the tab by accident doesn't lose your work. This is stored only
in that browser (`localStorage`, nothing sent anywhere) and is cleared
automatically once a timesheet is successfully emailed. Use the **Start
fresh** button next to the pay-period field to manually clear it — handy on
a shared station computer, or if the form is being reused for a different
person or pay period without submitting first.

## Files

```
index.html                          the form
css/style.css                       styling
js/config.js                        <- put your Apps Script URL here
js/signature-pad.js                 dependency-free canvas signature capture
js/app.js                           calculations, spreadsheet filling, submission
apps-script/Code.gs                 paste into script.google.com
assets/timesheet-template.xlsx      the original spreadsheet — do not edit
```

## Customizing

- **Schedule label** ("FIRE 106 HOURS"): editable directly in the form; the
  value typed in is written into cell `N1` of the submitted spreadsheet.
- **Column set**: edit `HOUR_KEYS` / `HOUR_LABELS` / `HOUR_COLUMN_LETTERS`
  at the top of `js/app.js` and the matching `<th>` cells in `index.html`
  if your department's pay codes or column layout differ. `HOUR_COLUMN_LETTERS`
  must match the actual column letters in `timesheet-template.xlsx`.
- **Template changes**: if City Hall issues a revised spreadsheet, replace
  `assets/timesheet-template.xlsx` with the new file. As long as the cell
  addresses for employee name (`C3`), pay period start (`C5`), the daily
  rows (`8–14` and `18–24`), notes (`F31`), and the employee signature date
  (`D32`) stay the same, no code changes are needed. If the new template
  moves any of those, update the corresponding cell references in
  `buildXlsx()` in `js/app.js`.
- **Daily email cap**: MailApp on a free Gmail account is capped around
  100 emails/day, which is far more than one person will submit — fine for
  this use case even shared across a small crew.

## Limitations

- There's no login step — anyone with the page URL can submit a timesheet
  under any name they type in. If that's a concern, put the GitHub Pages
  URL behind your department's existing SSO/network restrictions, or add a
  shared passphrase check in `app.js` before enabling submission.
- The employee signature is embedded as a floating image positioned over
  the signature line — it doesn't go in a cell — so it won't show up if the
  file is opened in a tool that strips images, but will in Excel, Google
  Sheets, LibreOffice, and Numbers.

## Troubleshooting: "I submitted, but no email arrived"

The app now reports the actual result of the send (success, a specific
error, or "couldn't confirm") in the status line under the submit button —
if you haven't seen that message yet, submit again and read it first, since
it usually points straight at the problem.

Most common causes, in order of likelihood:

1. **`Code.gs` on script.google.com is out of date.** If you ever edit
   `apps-script/Code.gs` in this repo, that change does nothing on its own —
   you have to paste the updated code into the script at
   [script.google.com](https://script.google.com) and then
   **Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy**.
   Editing the file in GitHub and editing the live script are two separate
   places; keeping them in sync is manual.
2. **Check spam/junk** in the recipient's inbox.
3. **Check the Apps Script execution log.** In script.google.com, open the
   project → **Executions** (left sidebar) → look at the most recent
   `doPost` run. This shows the actual error if something failed inside the
   script (bad recipient, quota exceeded, etc.), which is much more precise
   than anything the browser can tell you.
4. **Quota exceeded.** A plain Gmail account is capped around 100
   `MailApp.sendEmail` calls/day. Unlikely for normal use, but shows up in
   the Executions log if it happens.
5. **Wrong Apps Script URL.** Confirm `js/config.js` has the `/exec` URL
   (not `/dev`) from your most recent deployment — every new deployment
   version can get a new URL depending on how you deployed it.

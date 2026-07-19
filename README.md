# Fire Hourly Timesheet — digital fill, sign & submit

A static web app that recreates the "14 Day Schedule TIME RECORD (non-exempt)"
timesheet as a fillable form: it auto-calculates row, week, and pay-period
totals the same way the spreadsheet formulas do, captures a hand-drawn
signature, generates a matching PDF, and emails it to whoever you specify —
no server required to host it.

It's built as plain HTML/CSS/JS so it can be hosted for free on **GitHub
Pages**. Since GitHub Pages only serves static files, actually *sending* the
email is handled by a small **Google Apps Script** you deploy once under your
own Google account (free, no billing needed).

## How it works

```
Browser (GitHub Pages)  --submits form data + PDF-->  Google Apps Script Web App
                                                              |
                                                              v
                                                   MailApp.sendEmail(...)
                                                              |
                                                              v
                                                   Recipient's inbox (PDF attached)
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

1. Create a new GitHub repository and push everything in this folder to it.
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
   pay-period grand total update live, matching the original spreadsheet's
   `SUM` formulas.
3. Add notes if needed.
4. Sign in the employee signature box, check the certification box, confirm
   the date.
5. Enter the recipient's email address (whoever should receive the
   completed timesheet).
6. Click **Sign & submit timesheet**. The app generates a PDF, emails it
   through your Apps Script, and also downloads a copy to the submitter's
   own computer as a receipt.

The **director signature** is not captured digitally — the generated PDF
includes a blank signature line for the director, who signs it by hand
after it's printed, matching the original spreadsheet's second signature
line.

## Files

```
index.html              the form
css/style.css            styling
js/config.js              <- put your Apps Script URL here
js/signature-pad.js      dependency-free canvas signature capture
js/app.js                calculations, PDF generation, submission
apps-script/Code.gs      paste into script.google.com
```

## Customizing

- **Schedule label** ("FIRE 106 HOURS"): editable directly in the form; the
  value typed in is just carried into the PDF, no need to edit code.
- **Column set**: edit `HOUR_KEYS` / `HOUR_LABELS` at the top of `js/app.js`
  and the matching `<th>` cells in `index.html` if your department's pay
  codes differ.
- **Daily email cap**: MailApp on a free Gmail account is capped around
  100 emails/day, which is far more than one person will submit — fine for
  this use case even shared across a small crew.

## Limitations

- This sends a **PDF**, not the original `.xlsx` — it's a faithful visual
  copy of the layout (day/date, in/out, all hour columns, week and
  pay-period totals, notes, signature, timestamp), designed to be printed
  or filed like the original.
- There's no login step — anyone with the page URL can submit a timesheet
  under any name they type in. If that's a concern, put the GitHub Pages
  URL behind your department's existing SSO/network restrictions, or add a
  shared passphrase check in `app.js` before enabling submission.

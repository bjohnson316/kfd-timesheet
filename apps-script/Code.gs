/**
 * Timesheet submission handler.
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app):
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Then copy the resulting /exec URL into js/config.js as APPS_SCRIPT_URL.
 *
 * Emails are sent from the Google account you deploy this script under,
 * using that account's MailApp quota (roughly 100/day for a plain
 * Gmail account, much higher for Google Workspace).
 */

// Optional: also send a copy to yourself / HR for record-keeping.
// Leave blank ("") to only email the recipient the submitter typed in.
var BCC_RECORD_KEEPING_EMAIL = "";

function doPost(e) {
  try {
    var params = e.parameter;
    var recipient = params.recipient;
    var employeeName = params.employeeName || "Unknown";
    var payPeriod = params.payPeriod || "";
    var filename = params.filename || "Timesheet.pdf";
    var pdfBase64 = params.pdfBase64;

    if (!recipient || !pdfBase64) {
      return jsonResponse({ status: "error", message: "Missing recipient or PDF data." });
    }

    var pdfBlob = Utilities.newBlob(
      Utilities.base64Decode(pdfBase64),
      "application/pdf",
      filename
    );

    var subject = "Timesheet submission - " + employeeName + " (" + payPeriod + ")";
    var body =
      "A signed timesheet has been submitted.\n\n" +
      "Employee: " + employeeName + "\n" +
      "Pay period: " + payPeriod + "\n\n" +
      "The completed, signed timesheet is attached as a PDF.";

    var mailOptions = { attachments: [pdfBlob] };
    if (BCC_RECORD_KEEPING_EMAIL) {
      mailOptions.bcc = BCC_RECORD_KEEPING_EMAIL;
    }

    MailApp.sendEmail(recipient, subject, body, mailOptions);

    return jsonResponse({ status: "success" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

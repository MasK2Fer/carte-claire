// Reçoit les réponses du sondage Carte Claire et les ajoute au Google Sheet.
// Mise en place : voir LISEZMOI.md dans ce dossier.
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = JSON.parse(e.postData.contents);
  let header = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  const missing = Object.keys(data).filter(k => header.indexOf(k) === -1);
  if (missing.length) {
    header = header.concat(missing);
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
  sheet.appendRow(header.map(k => data[k] ?? ""));
  return ContentService.createTextOutput("ok");
}

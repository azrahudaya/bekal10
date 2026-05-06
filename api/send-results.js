const {
  buildSendResultsMessage,
  sendAdminResultsEmail,
  sendUserAttemptEmail,
  readBody,
  saveResultJson,
  sendJson,
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method tidak didukung." });
    return;
  }

  try {
    const body = await readBody(req);
    const savedPath = saveResultJson(body);
    const userEmailResult = await sendUserAttemptEmail(body);
    const adminEmailResult = await sendAdminResultsEmail(body);

    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: adminEmailResult.sent,
      adminEmailSent: adminEmailResult.sent,
      userEmailSent: userEmailResult.sent,
      jsonFile: savedPath,
      message: buildSendResultsMessage(userEmailResult, adminEmailResult),
    });
  } catch (error) {
    sendJson(res, 200, {
      ok: true,
      saved: false,
      emailSent: false,
      message: "Hasil diterima, tapi proses email gagal.",
    });
  }
};

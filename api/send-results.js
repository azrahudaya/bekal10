const {
  buildResultsEmail,
  getSmtpConfig,
  readBody,
  saveResultJson,
  sendJson,
  sendSmtpMail,
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method tidak didukung." });
    return;
  }

  try {
    const body = await readBody(req);
    const savedPath = saveResultJson(body);
    const riasec = body.riasec;
    const vark = body.vark;

    if (!riasec || !vark) {
      sendJson(res, 200, {
        ok: true,
        saved: true,
        emailSent: false,
        jsonFile: savedPath,
        message: process.env.VERCEL
          ? "Hasil diterima. Email dikirim setelah RIASEC dan VARK selesai."
          : "JSON tersimpan. Email dikirim setelah RIASEC dan VARK selesai.",
      });
      return;
    }

    const fingerprint = `${riasec.id}:${vark.id}`;
    if (body.participant?.emailSentFingerprint === fingerprint) {
      sendJson(res, 200, {
        ok: true,
        saved: true,
        emailSent: false,
        jsonFile: savedPath,
        message: "Rekap email sudah pernah dikirim.",
      });
      return;
    }

    const smtpConfig = getSmtpConfig();
    if (!smtpConfig.ready) {
      sendJson(res, 200, {
        ok: true,
        saved: true,
        emailSent: false,
        jsonFile: savedPath,
        message: "SMTP belum lengkap di Environment Variables.",
      });
      return;
    }

    const email = buildResultsEmail(body);
    await sendSmtpMail({
      ...smtpConfig,
      subject: `Hasil Tes Bekal10 ${body.participant?.name || "Peserta"}`,
      text: email.text,
      html: email.html,
    });

    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: true,
      jsonFile: savedPath,
      message: "Rekap email terkirim.",
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

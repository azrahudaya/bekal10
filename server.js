const http = require("http");
const fs = require("fs");
const path = require("path");
const tls = require("tls");

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.cwd();
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/send-results") {
      await handleSendResults(req, res);
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { message: "Method tidak didukung." });
  } catch (error) {
    sendJson(res, 500, { message: "Server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Bekal10 jalan di http://localhost:${PORT}`);
});

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  const fileName = path.basename(filePath);

  if (!filePath.startsWith(PUBLIC_DIR) || fileName === ".env") {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

async function handleChat(req, res) {
  if (!process.env.DEEPSEEK_API_KEY) {
    sendJson(res, 500, { message: "DEEPSEEK_API_KEY belum ada di .env." });
    return;
  }

  const body = await readJson(req);
  const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: buildChatMessages(body),
      temperature: 0.2,
      max_tokens: 1200,
      stream: false,
      user_id: sanitizeUserId(body.participant?.id || "bekal10-user"),
    }),
  });

  const data = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    sendJson(res, apiResponse.status, {
      message: data.error?.message || "Gagal memanggil DeepSeek.",
    });
    return;
  }

  const reply = cleanReply(getDeepSeekReply(data)) || buildFallbackReply(body);
  sendJson(res, 200, { reply });
}

async function handleSendResults(req, res) {
  const body = await readJson(req);
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
}

async function sendUserAttemptEmail(body) {
  const participant = body.participant || {};
  const attempt = body.attempt || {};
  const recipient = String(participant.email || "").trim();
  const testLabel = attempt.testLabel || "tes";

  if (!attempt.testId || !attempt.scores) {
    return { sent: false, skipped: true, reason: "NO_ATTEMPT", message: "Tidak ada hasil tes baru untuk email peserta." };
  }

  if (!isValidEmailAddress(recipient)) {
    return { sent: false, skipped: true, reason: "NO_USER_EMAIL", message: "Email peserta belum valid." };
  }

  const smtpConfig = getSmtpConfig([recipient]);
  if (!smtpConfig.ready) {
    return { sent: false, skipped: true, reason: "SMTP_MISSING", message: "SMTP belum lengkap, email peserta belum terkirim." };
  }

  const email = await buildUserResultsEmail(body);
  try {
    await sendSmtpMail({
      ...smtpConfig,
      subject: `Hasil ${testLabel} Bekal10`,
      text: email.text,
      html: email.html,
    });

    return { sent: true, skipped: false, reason: "SENT", message: `Email hasil ${testLabel} terkirim ke peserta.` };
  } catch (error) {
    return { sent: false, skipped: false, reason: "USER_EMAIL_FAILED", message: `Email hasil ${testLabel} gagal dikirim ke peserta.` };
  }
}

async function sendAdminResultsEmail(body) {
  const riasec = body.riasec;
  const vark = body.vark;

  if (!riasec || !vark) {
    return { sent: false, skipped: true, reason: "WAITING_FOR_BOTH_TESTS", message: "Rekap admin dikirim setelah RIASEC dan VARK selesai." };
  }

  const fingerprint = `${riasec.id}:${vark.id}`;
  if (body.participant?.emailSentFingerprint === fingerprint) {
    return { sent: false, skipped: true, reason: "ADMIN_ALREADY_SENT", message: "Rekap admin sudah pernah dikirim." };
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig.ready) {
    return { sent: false, skipped: true, reason: "SMTP_MISSING", message: "SMTP belum lengkap, rekap admin belum terkirim." };
  }

  const email = buildResultsEmail(body);
  try {
    await sendSmtpMail({
      ...smtpConfig,
      subject: `Hasil Tes Bekal10 ${body.participant?.name || "Peserta"}`,
      text: email.text,
      html: email.html,
    });

    return { sent: true, skipped: false, reason: "SENT", message: "Rekap admin terkirim." };
  } catch (error) {
    return { sent: false, skipped: false, reason: "ADMIN_EMAIL_FAILED", message: "Rekap admin gagal dikirim." };
  }
}

function buildSendResultsMessage(userEmailResult, adminEmailResult) {
  return [
    "JSON tersimpan.",
    userEmailResult.message,
    adminEmailResult.message,
  ].filter(Boolean).join(" ");
}

function buildChatMessages(body) {
  const scope = body.testId === "vark"
    ? "VARK, gaya belajar, hasil skor VARK, saran belajar, rekomendasi jurusan/prodi/kuliah/kampus, dan hubungan gaya belajar dengan pilihan studi. Jika hasil RIASEC tersedia, gunakan sebagai dasar utama."
    : "RIASEC, minat karier, hasil skor RIASEC, saran jurusan/prodi/kuliah/kampus, arah karier, dan cara mengembangkan minat.";

  const scores = body.result?.scores
    ? Object.entries(body.result.scores)
        .map(([key, value]) => `${body.traits?.[key] || key}: ${value}`)
        .join(", ")
    : "belum ada";
  const riasecScores = formatScores(body.latestResults?.riasec?.scores, body.labels?.riasec);
  const varkScores = formatScores(body.latestResults?.vark?.scores, body.labels?.vark);

  const system = [
    "Kamu adalah chatbot Bekal10.",
    "Jawab dalam Bahasa Indonesia.",
    "Jawaban harus rapi, jelas, dan tidak terlalu panjang.",
    "Jangan menulis semuanya dalam satu paragraf panjang.",
    "Gunakan maksimal 2 paragraf pendek dan maksimal 5 poin list.",
    "Selesaikan jawaban secara utuh, jangan berhenti di tengah kalimat.",
    "Gunakan markdown sederhana untuk penekanan, misalnya **Social (21)**.",
    `Topik yang boleh dibahas hanya: ${scope}`,
    "Pertanyaan tentang jurusan, prodi, kuliah, kampus, SMK/SMA lanjut, pekerjaan, portofolio, dan cara belajar masih termasuk topik.",
    "Kalau pertanyaan benar-benar di luar topik pendidikan/tes, jawab singkat: Maaf, aku hanya bisa membahas hasil tes dan rencana pendidikan/karier.",
    "Kalau user bertanya jurusan/prodi/kuliah/kampus, berikan rekomendasi praktis. Gunakan RIASEC sebagai dasar utama dan VARK sebagai pendukung cara belajar.",
    `Nama peserta: ${body.participant?.name || "-"}.`,
    `Tes aktif: ${body.testLabel || body.testId}.`,
    `Skor tes aktif: ${scores}.`,
    `Skor RIASEC terbaru: ${riasecScores || "belum ada"}.`,
    `Skor VARK terbaru: ${varkScores || "belum ada"}.`,
  ].join("\n");

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const mappedHistory = history
    .filter((item) => item.text && item.text !== "Menjawab...")
    .map((item) => ({
      role: item.sender === "user" ? "user" : "assistant",
      content: String(item.text).slice(0, 1800),
    }));

  return [
    { role: "system", content: system },
    ...mappedHistory,
    { role: "user", content: String(body.message || "").slice(0, 1800) },
  ];
}

function getDeepSeekReply(data) {
  return data.choices?.[0]?.message?.content
    || data.choices?.[0]?.delta?.content
    || data.choices?.[0]?.text
    || "";
}

function cleanReply(value) {
  const reply = String(value || "").trim();
  if (!reply) return "";
  if (/^tidak ada balasan\.?$/i.test(reply)) return "";
  if (/^null$/i.test(reply)) return "";
  return reply;
}

function formatScores(scores = {}, labels = {}) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `${labels[key] || key}: ${value}`)
    .join(", ");
}

function buildFallbackReply(body) {
  const message = String(body.message || "").toLowerCase();
  const riasecScores = body.latestResults?.riasec?.scores;
  const varkScores = body.latestResults?.vark?.scores || body.result?.scores;
  const riasecTop = topScores(riasecScores, body.labels?.riasec);
  const varkTop = topScores(varkScores, body.labels?.vark || body.traits);

  if (isEducationQuestion(message)) {
    if (riasecTop.length) {
      const recommendations = recommendMajorsByRiasec(riasecTop[0].key);
      return [
        `Berdasarkan hasilmu, tipe terkuat adalah **${riasecTop.map((item) => `${item.label} (${item.score})`).join("**, **")}**.`,
        "",
        "Rekomendasi jurusan awal:",
        ...recommendations.map((item, index) => `${index + 1}. **${item}**`),
        "",
        varkTop.length
          ? `Hasil VARK kamu yang kuat: **${varkTop.map((item) => item.label).join(", ")}**. Gunakan itu untuk memilih cara belajar, bukan sebagai satu-satunya dasar memilih jurusan.`
          : "Untuk lebih akurat, selesaikan juga Tes VARK.",
      ].join("\n");
    }

    if (varkTop.length) {
      return [
        `Dari VARK, gaya belajar kuat kamu adalah **${varkTop.map((item) => `${item.label} (${item.score})`).join("**, **")}**.`,
        "",
        "VARK bukan tes minat jurusan, tapi bisa jadi pendukung. Jurusan yang banyak cocok dengan gaya belajar praktik/diskusi antara lain:",
        "1. **Pendidikan**",
        "2. **Komunikasi**",
        "3. **Keperawatan**",
        "4. **Pariwisata**",
        "5. **Desain atau bidang praktikum**",
        "",
        "Untuk rekomendasi jurusan yang lebih tepat, selesaikan juga Tes RIASEC.",
      ].join("\n");
    }
  }

  if (body.testId === "vark") {
    return [
      `Hasil VARK kamu yang menonjol: **${varkTop.map((item) => `${item.label} (${item.score})`).join("**, **") || "belum ada"}**.`,
      "",
      "Gunakan hasil ini untuk memilih cara belajar yang paling nyaman.",
      "Kalau mau rekomendasi jurusan, hasil RIASEC lebih tepat dijadikan dasar utama.",
    ].join("\n");
  }

  return [
    `Hasil RIASEC kamu yang menonjol: **${riasecTop.map((item) => `${item.label} (${item.score})`).join("**, **") || "belum ada"}**.`,
    "",
    "Kamu bisa tanya rekomendasi jurusan, karier, atau cara mengembangkan minat dari hasil ini.",
  ].join("\n");
}

function isEducationQuestion(message) {
  return [
    "jurusan",
    "prodi",
    "kuliah",
    "kampus",
    "universitas",
    "politeknik",
    "sekolah",
    "smk",
    "sma",
    "karier",
    "kerja",
    "pekerjaan",
    "dimana",
    "di mana",
  ].some((keyword) => message.includes(keyword));
}

function topScores(scores = {}, labels = {}) {
  const sorted = Object.entries(scores)
    .map(([key, score]) => ({ key, label: labels[key] || key, score }))
    .sort((a, b) => b.score - a.score);

  if (!sorted.length) return [];
  const topScore = sorted[0].score;
  return sorted.filter((item) => item.score === topScore);
}

function recommendMajorsByRiasec(trait) {
  const map = {
    realistic: ["Teknik Mesin", "Teknik Elektro", "Teknik Sipil", "Agribisnis", "Desain Produk"],
    investigative: ["Kedokteran", "Farmasi", "Data Science", "Teknik Informatika", "Biologi"],
    artistic: ["Desain Komunikasi Visual", "Seni Rupa", "Film", "Sastra", "Arsitektur"],
    social: ["Pendidikan", "Bimbingan dan Konseling", "Psikologi", "Keperawatan", "Ilmu Komunikasi"],
    enterprising: ["Manajemen", "Bisnis Digital", "Marketing", "Ilmu Komunikasi", "Hukum"],
    conventional: ["Akuntansi", "Administrasi Bisnis", "Manajemen Perkantoran", "Sistem Informasi", "Perpajakan"],
  };

  return map[trait] || ["Manajemen", "Ilmu Komunikasi", "Sistem Informasi", "Pendidikan", "Bisnis Digital"];
}

function getSmtpConfig(toOverride = null) {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  const from = process.env.SMTP_FROM || user;
  const to = Array.isArray(toOverride)
    ? toOverride.filter(isValidEmailAddress)
    : splitEmails(process.env.SMTP_TO || process.env.EMAIL_TO);

  return {
    ready: Boolean(user && pass && from && to.length),
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    user,
    pass,
    from,
    to,
  };
}

function buildResultsEmail(body) {
  const participant = body.participant || {};
  const attempt = body.attempt || {};
  const riasecRows = scoreRows(body.riasec?.scores, body.labels?.riasec);
  const varkRows = scoreRows(body.vark?.scores, body.labels?.vark);

  const text = [
    "Hasil Tes Bekal10",
    "",
    `Tes selesai: ${attempt.testLabel || "-"}`,
    `Waktu submit: ${formatDate(attempt.createdAt)}`,
    "",
    `Nama: ${participant.name || "-"}`,
    `Kelas: ${participant.studentClass || "-"}`,
    `Umur: ${participant.age || "-"}`,
    `No. HP: ${participant.phone || "-"}`,
    `Email: ${participant.email || "-"}`,
    "",
    "Hasil RIASEC:",
    ...(riasecRows.length ? riasecRows.map((row) => `- ${row.label}: ${row.score}`) : ["- Belum selesai"]),
    "",
    "Hasil VARK:",
    ...(varkRows.length ? varkRows.map((row) => `- ${row.label}: ${row.score}`) : ["- Belum selesai"]),
  ].join("\n");

  const html = `
    <h2>Hasil Tes Bekal10</h2>
    <p><strong>Tes selesai:</strong> ${escapeHtml(attempt.testLabel || "-")}</p>
    <p><strong>Waktu submit:</strong> ${escapeHtml(formatDate(attempt.createdAt))}</p>
    <h3>Data Peserta</h3>
    <table cellpadding="6" cellspacing="0" border="1">
      <tr><td>Nama</td><td>${escapeHtml(participant.name || "-")}</td></tr>
      <tr><td>Kelas</td><td>${escapeHtml(participant.studentClass || "-")}</td></tr>
      <tr><td>Umur</td><td>${escapeHtml(participant.age || "-")}</td></tr>
      <tr><td>No. HP</td><td>${escapeHtml(participant.phone || "-")}</td></tr>
      <tr><td>Email</td><td>${escapeHtml(participant.email || "-")}</td></tr>
    </table>
    <h3>Hasil RIASEC</h3>
    ${riasecRows.length ? scoreTable(riasecRows) : "<p>Belum selesai.</p>"}
    <h3>Hasil VARK</h3>
    ${varkRows.length ? scoreTable(varkRows) : "<p>Belum selesai.</p>"}
  `;

  return { text, html };
}

async function buildUserResultsEmail(body) {
  const participant = body.participant || {};
  const attempt = body.attempt || {};
  const labels = body.labels?.[attempt.testId] || {};
  const rows = scoreRows(attempt.scores, labels);
  const topRows = getTopScoreRows(rows);
  const summary = await buildAiEmailSummary(body, rows);
  const testLabel = attempt.testLabel || "Tes Bekal10";

  const text = [
    `Hasil ${testLabel} Bekal10`,
    "",
    `Halo ${participant.name || "Peserta"},`,
    `Tes selesai: ${testLabel}`,
    `Waktu submit: ${formatDate(attempt.createdAt)}`,
    "",
    `Kategori tertinggi: ${topRows.map((row) => `${row.label} (${row.score})`).join(", ") || "-"}`,
    "",
    "Skor:",
    ...(rows.length ? rows.map((row) => `- ${row.label}: ${row.score}`) : ["- Belum ada skor"]),
    "",
    "Ringkasan:",
    summary,
  ].join("\n");

  const html = buildUserResultsEmailHtml({
    participant,
    attempt,
    rows,
    summary,
    testLabel,
    topRows,
  });

  return { text, html };
}

async function buildAiEmailSummary(body, rows) {
  const fallback = buildFallbackEmailSummary(body, rows);
  if (!process.env.DEEPSEEK_API_KEY) return fallback;

  try {
    const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: buildEmailSummaryMessages(body, rows),
        temperature: 0.2,
        max_tokens: 550,
        stream: false,
        user_id: sanitizeUserId(body.participant?.id || "bekal10-user"),
      }),
    });

    const data = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) return fallback;

    return cleanReply(getDeepSeekReply(data)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function buildEmailSummaryMessages(body, rows) {
  const participant = body.participant || {};
  const attempt = body.attempt || {};
  const labels = body.labels || {};
  const scoreText = rows.map((row) => `${row.label}: ${row.score}`).join(", ");
  const riasecScores = formatScores(body.riasec?.scores, labels.riasec);
  const varkScores = formatScores(body.vark?.scores, labels.vark);

  return [
    {
      role: "system",
      content: [
        "Kamu menulis ringkasan hasil tes Bekal10 untuk email peserta.",
        "Jawab dalam Bahasa Indonesia.",
        "Gunakan plain text saja, tanpa markdown tebal dan tanpa tabel.",
        "Tulis 1 paragraf pembuka pendek dan 3 bullet yang diawali tanda '-'.",
        "Fokus pada tes yang baru selesai. Jika hasil tes lain tersedia, sebutkan hanya sebagai konteks pendukung.",
        "Jangan memberi diagnosis psikologis, jangan membuat klaim pasti, dan jangan terlalu panjang.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Nama: ${participant.name || "Peserta"}`,
        `Kelas: ${participant.studentClass || "-"}`,
        `Umur: ${participant.age || "-"}`,
        `Tes yang baru selesai: ${attempt.testLabel || attempt.testId || "-"}`,
        `Skor tes ini: ${scoreText || "belum ada"}`,
        `Skor RIASEC terbaru: ${riasecScores || "belum ada"}`,
        `Skor VARK terbaru: ${varkScores || "belum ada"}`,
      ].join("\n"),
    },
  ];
}

function buildFallbackEmailSummary(body, rows) {
  const attempt = body.attempt || {};
  const topRows = getTopScoreRows(rows);
  const topText = topRows.map((row) => `${row.label} (${row.score})`).join(", ") || "belum terlihat jelas";

  if (attempt.testId === "vark") {
    return [
      `Hasil VARK kamu paling menonjol pada ${topText}. Ini bisa dipakai untuk memilih cara belajar yang terasa paling nyaman.`,
      "- Gunakan gaya belajar terkuat sebagai strategi utama saat memahami materi baru.",
      "- Kombinasikan dengan gaya belajar lain agar proses belajar tidak terlalu sempit.",
      "- Jika ingin memilih jurusan atau karier, jadikan hasil RIASEC sebagai dasar utama dan VARK sebagai pendukung cara belajar.",
    ].join("\n");
  }

  const recommendations = topRows.length ? recommendMajorsByRiasec(topRows[0].key) : [];
  return [
    `Hasil RIASEC kamu paling menonjol pada ${topText}. Ini menunjukkan area minat yang bisa mulai kamu eksplorasi lebih serius.`,
    "- Perhatikan aktivitas yang membuat kamu nyaman, penasaran, dan tahan mengerjakannya lebih lama.",
    "- Gunakan hasil ini sebagai titik awal diskusi jurusan, kegiatan, portofolio, atau pilihan karier.",
    recommendations.length
      ? `- Rekomendasi awal yang bisa dipertimbangkan: ${recommendations.slice(0, 3).join(", ")}.`
      : "- Lengkapi juga tes lain agar gambaran belajar dan minat kamu lebih utuh.",
  ].join("\n");
}

function buildUserResultsEmailHtml({ participant, attempt, rows, summary, testLabel, topRows }) {
  const topText = topRows.map((row) => `${row.label} (${row.score})`).join(", ") || "-";
  const preheader = `Hasil ${testLabel} kamu sudah siap.`;

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,Helvetica,sans-serif;color:#111111;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:2px solid #111111;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#ffd000;border-bottom:2px solid #111111;padding:24px 26px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#111111;">Bekal10</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.15;color:#111111;">Hasil ${escapeHtml(testLabel)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Halo <strong>${escapeHtml(participant.name || "Peserta")}</strong>, ini hasil tes yang baru kamu selesaikan.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #dddddd;border-radius:8px;">
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #eeeeee;font-size:13px;color:#666666;">Tes selesai</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #eeeeee;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(testLabel)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #eeeeee;font-size:13px;color:#666666;">Waktu submit</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #eeeeee;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(formatDate(attempt.createdAt))}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;font-size:13px;color:#666666;">Kategori tertinggi</td>
                    <td style="padding:12px 14px;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(topText)}</td>
                  </tr>
                </table>

                <h2 style="margin:22px 0 12px;font-size:18px;line-height:1.3;color:#111111;">Skor</h2>
                ${scoreEmailTable(rows, attempt.testId)}

                <h2 style="margin:24px 0 12px;font-size:18px;line-height:1.3;color:#111111;">Ringkasan AI</h2>
                <div style="border-left:4px solid #ffd000;padding:2px 0 2px 14px;">
                  ${summaryToHtml(summary)}
                </div>

                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#666666;">Hasil ini adalah bahan refleksi awal, bukan penentu tunggal pilihan jurusan atau karier. Gunakan bersama diskusi dengan orang tua, guru, atau konselor.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function scoreEmailTable(rows, testId) {
  if (!rows.length) return `<p style="margin:0;font-size:14px;line-height:1.6;">Belum ada skor.</p>`;

  const maxScore = maxScoreForTest(testId, rows);
  const body = rows.map((row) => {
    const percent = Math.max(0, Math.min(100, Math.round((Number(row.score) / maxScore) * 100)));
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
          <div style="font-size:14px;font-weight:700;color:#111111;">${escapeHtml(row.label)}</div>
          <div style="margin-top:8px;background:#eeeeee;border-radius:999px;height:8px;overflow:hidden;">
            <div style="background:#111111;width:${percent}%;height:8px;line-height:8px;">&nbsp;</div>
          </div>
        </td>
        <td style="padding:12px 0 12px 14px;border-bottom:1px solid #eeeeee;text-align:right;font-size:14px;font-weight:700;color:#111111;white-space:nowrap;">${escapeHtml(row.score)} / ${escapeHtml(maxScore)}</td>
      </tr>
    `;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${body}</table>`;
}

function summaryToHtml(summary) {
  const lines = String(summary || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const paragraphs = [];
  const bullets = [];

  lines.forEach((line) => {
    if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ""));
    } else {
      paragraphs.push(line);
    }
  });

  const paragraphHtml = paragraphs
    .map((line) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#222222;">${escapeHtml(line)}</p>`)
    .join("");
  const bulletHtml = bullets.length
    ? `<ul style="margin:8px 0 0 18px;padding:0;font-size:14px;line-height:1.6;color:#222222;">${bullets.map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`).join("")}</ul>`
    : "";

  return paragraphHtml + bulletHtml;
}

function saveResultJson(body) {
  const resultDir = path.resolve(process.cwd(), process.env.RESULT_DIR || "data/results");
  fs.mkdirSync(resultDir, { recursive: true });

  const participantName = safeFilePart(body.participant?.name || "peserta");
  const testId = safeFilePart(body.attempt?.testId || "test");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}_${participantName}_${testId}.json`;
  const filePath = path.join(resultDir, fileName);
  const payload = {
    savedAt: new Date().toISOString(),
    participant: body.participant || null,
    submittedTest: body.attempt || null,
    latestResults: {
      riasec: body.riasec || null,
      vark: body.vark || null,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  upsertHasilJson(resultDir, payload);
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function upsertHasilJson(resultDir, payload) {
  const hasilPath = path.join(resultDir, "hasil.json");
  let collection = [];

  if (fs.existsSync(hasilPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(hasilPath, "utf8"));
      collection = Array.isArray(existing) ? existing : [];
    } catch {
      collection = [];
    }
  }

  const participantId = payload.participant?.id;
  const existingIndex = collection.findIndex((item) => item.participant?.id === participantId);

  if (existingIndex >= 0) {
    collection[existingIndex] = payload;
  } else {
    collection.push(payload);
  }

  fs.writeFileSync(hasilPath, JSON.stringify(collection, null, 2), "utf8");
}

function safeFilePart(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "data";
}

function scoreRows(scores = {}, labels = {}) {
  return Object.entries(scores)
    .map(([key, score]) => ({
      key,
      label: labels[key] || key,
      score,
    }))
    .sort((a, b) => b.score - a.score);
}

function getTopScoreRows(rows) {
  if (!rows.length) return [];
  const topScore = rows[0].score;
  return rows.filter((row) => row.score === topScore);
}

function maxScoreForTest(testId, rows = []) {
  if (testId === "riasec") return 28;
  if (testId === "vark") return 16;
  return Math.max(1, ...rows.map((row) => Number(row.score) || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function scoreTable(rows) {
  const body = rows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.score)}</td></tr>`)
    .join("");

  return `<table cellpadding="6" cellspacing="0" border="1"><tr><th>Kategori</th><th>Skor</th></tr>${body}</table>`;
}

async function sendSmtpMail({ host, port, user, pass, from, to, subject, text, html }) {
  const socket = tls.connect({ host, port, servername: host });
  socket.setEncoding("utf8");

  try {
    await readSmtp(socket);
    await smtpCommand(socket, `EHLO localhost`, [250]);
    await smtpCommand(socket, "AUTH LOGIN", [334]);
    await smtpCommand(socket, Buffer.from(user).toString("base64"), [334]);
    await smtpCommand(socket, Buffer.from(pass).toString("base64"), [235]);
    await smtpCommand(socket, `MAIL FROM:<${extractEmail(from)}>`, [250]);

    for (const recipient of to) {
      await smtpCommand(socket, `RCPT TO:<${extractEmail(recipient)}>`, [250, 251]);
    }

    await smtpCommand(socket, "DATA", [354]);
    await smtpCommand(socket, buildMimeMessage({ from, to, subject, text, html }), [250], true);
    await smtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

function buildMimeMessage({ from, to, subject, text, html }) {
  const boundary = `bekal10-${Date.now()}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const lines = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(text),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(html),
    "",
    `--${boundary}--`,
    "",
    ".",
    "",
  ];

  return lines.join("\r\n");
}

function dotStuff(value) {
  return String(value).replace(/(^|\r?\n)\./g, "$1..");
}

function smtpCommand(socket, command, expectedCodes, isData = false) {
  socket.write(isData ? command : `${command}\r\n`);
  return readSmtp(socket).then((response) => {
    const code = Number(response.slice(0, 3));
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP error ${response}`);
    }
    return response;
  });
}

function readSmtp(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk;
      if (/\r?\n\d{3} /.test(buffer) || /^\d{3} /.test(buffer)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 200_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function splitEmails(value = "") {
  return String(value)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function extractEmail(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function sanitizeUserId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 512);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

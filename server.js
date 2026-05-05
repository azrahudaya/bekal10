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
  const riasec = body.riasec;
  const vark = body.vark;

  if (!riasec || !vark) {
    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: false,
      jsonFile: savedPath,
      message: "JSON tersimpan. Email dikirim setelah RIASEC dan VARK selesai.",
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
      message: "JSON tersimpan. Rekap email sudah pernah dikirim.",
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
      message: "JSON tersimpan. SMTP belum lengkap di .env.",
    });
    return;
  }

  const email = buildResultsEmail(body);
  try {
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
      message: "JSON tersimpan. Rekap email terkirim.",
    });
  } catch (error) {
    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: false,
      jsonFile: savedPath,
      message: "JSON tersimpan. Email gagal dikirim.",
    });
  }
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

function getSmtpConfig() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  const from = process.env.SMTP_FROM || user;
  const to = splitEmails(process.env.SMTP_TO || process.env.EMAIL_TO);

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
    </table>
    <h3>Hasil RIASEC</h3>
    ${riasecRows.length ? scoreTable(riasecRows) : "<p>Belum selesai.</p>"}
    <h3>Hasil VARK</h3>
    ${varkRows.length ? scoreTable(varkRows) : "<p>Belum selesai.</p>"}
  `;

  return { text, html };
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
      label: labels[key] || key,
      score,
    }))
    .sort((a, b) => b.score - a.score);
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

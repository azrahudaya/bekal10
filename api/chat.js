const {
  buildChatMessages,
  buildFallbackReply,
  cleanReply,
  getDeepSeekReply,
  readBody,
  sanitizeUserId,
  sendJson,
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method tidak didukung." });
    return;
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    sendJson(res, 500, { message: "DEEPSEEK_API_KEY belum diatur di Vercel." });
    return;
  }

  try {
    const body = await readBody(req);
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
    const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

    const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
  } catch (error) {
    sendJson(res, 500, { message: "Chatbot gagal merespons." });
  }
};

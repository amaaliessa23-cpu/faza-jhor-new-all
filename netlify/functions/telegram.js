/**
 * Netlify Function: telegram
 *
 * Proxies Telegram Bot API calls server-side so the bot token
 * is never exposed in client-side code.
 *
 * Sends every message to the configured bot.
 *
 * Client usage:
 *   fetch("/.netlify/functions/telegram", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ method: "sendMessage", text: "...", ... })
 *   });
 */

const ALLOWED_METHODS = [
  "sendMessage",
  "editMessageText",
  "answerCallbackQuery",
  "getUpdates",
  "deleteWebhook",
];

const PRIMARY_TOKEN   = process.env.TELEGRAM_TOKEN   || "8695935313:AAEAGPtludznpI32kbn1aYH_QXd7vBsAYu8";
const PRIMARY_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8803418667";

async function callTelegram(token, method, body) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json().catch(() => null);
    return { statusCode: response.status, data };
  } catch (err) {
    console.error(`Telegram error [${token.slice(0, 10)}...]:`, err);
    return { statusCode: 502, data: null };
  }
}

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  // Parse request body
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
    };
  }

  const { method, ...body } = payload;

  // Whitelist allowed Telegram methods
  if (!method || !ALLOWED_METHODS.includes(method)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ ok: false, error: "Method not permitted" }),
    };
  }

  // Inject chat_id if the client didn't supply one
  const requestBody = { ...body };
  if (method === "sendMessage" && !requestBody.chat_id) {
    requestBody.chat_id = PRIMARY_CHAT_ID;
  }

  const result = await callTelegram(PRIMARY_TOKEN, method, requestBody);

  return {
    statusCode: result.statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.data ?? { ok: false }),
  };
};

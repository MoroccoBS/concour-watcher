type TelegramOptions = {
  token?: string;
  chatId?: string;
};

export async function sendTelegramMessage(
  text: string,
  options: TelegramOptions = {},
) {
  const token = options.token ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { skipped: true };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram send failed: ${response.status}`);
  }

  return { skipped: false };
}

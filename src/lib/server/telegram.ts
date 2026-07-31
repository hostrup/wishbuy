import { env } from '$env/dynamic/private';

export interface TelegramResult {
	success: boolean;
	error?: string;
}

/**
 * Sender en besked til Telegram chat via Telegram Bot API.
 * Benytter TELEGRAM_TOKEN og TELEGRAM_CHAT_ID fra miljøvariabler.
 */
export async function sendTelegramMessage(message: string): Promise<TelegramResult> {
	const token = env.TELEGRAM_TOKEN || process.env.TELEGRAM_TOKEN;
	const chatId = env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

	if (!token || !chatId) {
		const warning = '[Telegram] TELEGRAM_TOKEN eller TELEGRAM_CHAT_ID mangler i konfigurationen.';
		console.warn(warning);
		return { success: false, error: warning };
	}

	try {
		const response = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId.trim(),
				text: message,
				parse_mode: 'HTML',
				disable_web_page_preview: true
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			const errorMsg = `[Telegram] API-fejl (${response.status}): ${errorText}`;
			console.error(errorMsg);
			return { success: false, error: errorMsg };
		}

		return { success: true };
	} catch (err) {
		const errorMsg = `[Telegram] Kunne ikke sende besked: ${err instanceof Error ? err.message : 'Ukendt netværksfejl'}`;
		console.error(errorMsg);
		return { success: false, error: errorMsg };
	}
}

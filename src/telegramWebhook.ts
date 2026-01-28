interface TelegramWebhookResponse {
  ok: boolean;
  result: boolean;
  description: string;
}

export class TelegramWebhookManager {
  private readonly botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  async setWebhook(webhookUrl: string): Promise<TelegramWebhookResponse> {
    console.log(`[TelegramWebhook] Setting webhook to: ${webhookUrl}`);

    // Remove 'bot' prefix if user accidentally included it
    const cleanToken = this.botToken.startsWith('bot') 
      ? this.botToken.slice(3) 
      : this.botToken;

    const apiUrl = `https://api.telegram.org/bot${cleanToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    const data = await response.json() as TelegramWebhookResponse;

    if (!response.ok || !data.ok) {
      console.error(`[TelegramWebhook] API Response:`, JSON.stringify(data));
      throw new Error(
        `Failed to set Telegram webhook: ${data.description || response.statusText}`
      );
    }

    console.log(`[TelegramWebhook] Webhook set successfully: ${data.description}`);
    return data;
  }

  async deleteWebhook(): Promise<TelegramWebhookResponse> {
    console.log('[TelegramWebhook] Deleting webhook...');

    const apiUrl = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;

    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete Telegram webhook: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as TelegramWebhookResponse;

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    console.log(`[TelegramWebhook] Webhook deleted: ${data.description}`);
    return data;
  }

  async getWebhookInfo(): Promise<unknown> {
    const apiUrl = `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`;

    const response = await fetch(apiUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get Telegram webhook info: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

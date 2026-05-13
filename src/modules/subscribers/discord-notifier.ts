import { Logger } from '@nestjs/common';

const logger = new Logger('DiscordNotifier');

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Envía un mensaje a Discord vía webhook. Fire-and-forget: si falla,
 * loguea pero no propaga el error para no romper el flujo del request.
 */
export async function notifyDiscord(
  webhookUrl: string | undefined,
  payload: DiscordWebhookPayload,
): Promise<void> {
  if (!webhookUrl) {
    logger.warn('notifyDiscord: webhook URL vacía — env no cargada o no seteada');
    return;
  }

  logger.log(`Enviando notificación a Discord (${webhookUrl.slice(0, 60)}...)`);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(`Discord webhook respondió ${res.status}: ${body}`);
    } else {
      logger.log('Notificación a Discord enviada OK');
    }
  } catch (err) {
    logger.warn(`Discord webhook falló: ${err}`);
  }
}

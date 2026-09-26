import axios, { AxiosError } from 'axios';
import { URL } from 'url';

export interface WebhookPayload {
  proposal_id: string;
  old_state: string;
  new_state: string;
  timestamp: number;
}

export interface WebhookRegistration {
  address: string;
  webhook_url: string;
  created_at: number;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Validates that the provided URL is a valid HTTPS URL
 */
export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Calculates exponential backoff delay in milliseconds
 */
function getBackoffDelay(retryCount: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, retryCount);
}

/**
 * Sends a webhook with exponential backoff retry logic
 */
export async function sendWebhookWithRetry(
  webhookUrl: string,
  payload: WebhookPayload,
  retryCount: number = 0
): Promise<boolean> {
  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Consider 2xx status codes as success
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = getBackoffDelay(retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWebhookWithRetry(webhookUrl, payload, retryCount + 1);
    }

    // Log final failure (in production, use proper logging service)
    console.error(
      `[Webhook] Failed to deliver to ${webhookUrl} after ${MAX_RETRIES} retries`,
      error instanceof AxiosError ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Sends webhooks to all registered listeners for a proposal state change
 */
export async function notifyProposalStateChange(
  registrations: WebhookRegistration[],
  payload: WebhookPayload
): Promise<{ successful: number; failed: number }> {
  const results = await Promise.all(
    registrations.map((reg) => sendWebhookWithRetry(reg.webhook_url, payload))
  );

  return {
    successful: results.filter((r) => r).length,
    failed: results.filter((r) => !r).length,
  };
}

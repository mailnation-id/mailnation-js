export const DEFAULT_BASE_URL = "https://api.mailnation.id";

export const StatusQueued = "queued";
export const StatusDelivered = "delivered";
export const StatusPartial = "partial";
export const StatusFailed = "failed";

export type Addresses = string | string[];

export type Attachment = {
  filename: string;
  content: string;
  content_type?: string;
  content_id?: string;
};

export type AttachmentMeta = {
  filename?: string;
  content_type?: string;
  size?: number;
  content_id?: string;
};

export type SendRequest = {
  from: string;
  to: Addresses;
  cc?: Addresses;
  bcc?: Addresses;
  reply_to?: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  tags?: string | string[];
  attachments?: Attachment[];
  /** Sent as Idempotency-Key. Generated as js-<uuid> when omitted. */
  idempotencyKey?: string;
};

export type SendResponse = {
  id: string;
  status: string;
  source: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  subject?: string;
  billing_status?: string;
  recipient_count?: number;
  credits_reserved?: number;
  headers?: Record<string, string>;
  tags?: string[];
  attachments?: AttachmentMeta[];
  request_id: string;
};

export type Recipient = {
  id?: string;
  email?: string;
  status?: string;
  billing_status?: string;
  attempt_count?: number;
  last_smtp_code?: number | null;
  last_smtp_response?: string | null;
  delivered_at?: string | null;
  bounced_at?: string | null;
};

export type Email = {
  id: string;
  status: string;
  source?: string;
  from?: string;
  subject?: string;
  billing_status?: string;
  recipient_count?: number;
  credits_reserved?: number;
  created_at?: string;
  recipients?: Recipient[];
  request_id?: string;
};

export type ClientOptions = {
  baseURL?: string;
  username?: string;
  password?: string;
  bearer?: string;
  userAgent?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export type WaitOptions = {
  intervalMs?: number;
  terminal?: string[];
};

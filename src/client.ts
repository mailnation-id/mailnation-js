import { MailnationError } from "./errors.js";
import {
  DEFAULT_BASE_URL,
  StatusDelivered,
  StatusFailed,
  StatusPartial,
  type ClientOptions,
  type Email,
  type SendRequest,
  type SendResponse,
  type WaitOptions,
} from "./types.js";

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true },
    );
  });
}

export class EmailsService {
  constructor(private readonly client: Client) {}

  async send(req: SendRequest, init?: { signal?: AbortSignal }): Promise<SendResponse> {
    if (!req?.from) throw new Error("mailnation: from is required");
    if (req.to == null || (Array.isArray(req.to) && req.to.length === 0) || req.to === "") {
      throw new Error("mailnation: to is required");
    }
    if (!req.subject) throw new Error("mailnation: subject is required");
    if (!req.text && !req.html && !(req.attachments && req.attachments.length)) {
      throw new Error("mailnation: provide text, html, and/or attachments");
    }

    const key = req.idempotencyKey || `js-${crypto.randomUUID()}`;
    const { idempotencyKey: _, ...body } = req;
    return this.client.request<SendResponse>("POST", "/emails", body, { "Idempotency-Key": key }, init?.signal);
  }

  async get(id: string, init?: { signal?: AbortSignal }): Promise<Email> {
    if (!id) throw new Error("mailnation: id is required");
    return this.client.request<Email>("GET", `/emails/${encodeURIComponent(id)}`, undefined, undefined, init?.signal);
  }

  async wait(id: string, opts: WaitOptions = {}, init?: { signal?: AbortSignal }): Promise<Email> {
    if (!id) throw new Error("mailnation: id is required");
    const interval = opts.intervalMs && opts.intervalMs > 0 ? opts.intervalMs : 2000;
    const terminal = new Set(opts.terminal ?? [StatusDelivered, StatusPartial, StatusFailed]);
    for (;;) {
      const email = await this.get(id, init);
      if (terminal.has(email.status)) return email;
      await sleep(interval, init?.signal);
    }
  }
}

export class Client {
  readonly emails: EmailsService;
  private readonly baseURL: string;
  private readonly username: string;
  private readonly password: string;
  private readonly bearer: string;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: ClientOptions = {}) {
    this.baseURL = (opts.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.username = opts.username ?? "";
    this.password = opts.password ?? "";
    this.bearer = opts.bearer ?? "";
    this.userAgent = opts.userAgent ?? "mailnation-js";
    this.fetchImpl = opts.fetch ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.emails = new EmailsService(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    const onAbort = () => ac.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });

    const hdr: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": this.userAgent,
      ...headers,
    };
    if (body !== undefined) hdr["Content-Type"] = "application/json";
    if (this.bearer) hdr.Authorization = `Bearer ${this.bearer}`;
    else if (this.username || this.password) {
      hdr.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }

    try {
      const res = await this.fetchImpl(this.baseURL + path, {
        method,
        headers: hdr,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ac.signal,
      });
      const raw = await res.text();
      const requestId = res.headers.get("X-Request-ID") ?? "";
      if (!res.ok) {
        let message = raw.trim() || res.statusText;
        let code = "";
        let rid = requestId;
        try {
          const parsed = JSON.parse(raw) as { error?: string; code?: string; request_id?: string };
          if (parsed.error) message = parsed.error;
          if (parsed.code) code = parsed.code;
          if (parsed.request_id) rid = parsed.request_id;
        } catch {
          /* keep text */
        }
        throw new MailnationError({ message, code, statusCode: res.status, requestId: rid });
      }
      if (!raw) return undefined as T;
      return JSON.parse(raw) as T;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}

export function attachmentFromBytes(
  filename: string,
  data: Uint8Array | Buffer,
  contentType?: string,
  contentId?: string,
): { filename: string; content: string; content_type?: string; content_id?: string } {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return {
    filename,
    content: buf.toString("base64"),
    content_type: contentType,
    content_id: contentId,
  };
}

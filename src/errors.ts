export const CodeInvalidRequest = "invalid_request";
export const CodeUnauthorized = "unauthorized";
export const CodeForbidden = "forbidden";
export const CodeNotFound = "not_found";
export const CodeConflict = "conflict";
export const CodeInsufficientCredits = "insufficient_credits";
export const CodeRateLimited = "rate_limited";
export const CodeWarmupLimited = "warmup_limited";
export const CodeAccountSuspended = "account_suspended";
export const CodePayloadTooLarge = "payload_too_large";
export const CodeServiceUnavailable = "service_unavailable";
export const CodeTemporaryFailure = "temporary_failure";
export const CodeInternalError = "internal_error";
export const CodeIdempotencyConflict = "idempotency_conflict";
export const CodeIdempotencyInProgress = "idempotency_in_progress";

export class MailnationError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId: string;

  constructor(opts: { message: string; code?: string; statusCode: number; requestId?: string }) {
    super(
      opts.requestId
        ? `mailnation: ${opts.message} (${opts.code ?? ""}) status=${opts.statusCode} request_id=${opts.requestId}`
        : `mailnation: ${opts.message} (${opts.code ?? ""}) status=${opts.statusCode}`,
    );
    this.name = "MailnationError";
    this.statusCode = opts.statusCode;
    this.code = opts.code ?? "";
    this.requestId = opts.requestId ?? "";
  }
}

export function isMailnationError(err: unknown): err is MailnationError {
  return err instanceof MailnationError;
}

export function isUnauthorized(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeUnauthorized;
}

export function isNotFound(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeNotFound;
}

export function isInsufficientCredits(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeInsufficientCredits;
}

export function isRateLimited(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeRateLimited;
}

export function isIdempotencyConflict(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeIdempotencyConflict;
}

export function isIdempotencyInProgress(err: unknown): boolean {
  return isMailnationError(err) && err.code === CodeIdempotencyInProgress;
}

export function isRetryable(err: unknown): boolean {
  if (!isMailnationError(err)) return false;
  switch (err.code) {
    case CodeRateLimited:
    case CodeServiceUnavailable:
    case CodeTemporaryFailure:
    case CodeIdempotencyInProgress:
      return true;
  }
  return [429, 502, 503, 504].includes(err.statusCode);
}

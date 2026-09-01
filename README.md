# mailnation

Official Node.js SDK for the [Mailnation Email API](https://docs.mailnation.id).

- `POST /emails` — send (html/text, attachments, headers, tags)
- `GET /emails/{id}` — status + recipients
- HTTP Basic (SMTP credentials) or Bearer JWT
- Automatic `Idempotency-Key` when unset
- Typed API errors (`insufficient_credits`, idempotency conflicts, …)
- `wait()` helper for polling delivery

OpenAPI: [openapi.yaml](./openapi.yaml) · Live: https://api.mailnation.id/openapi.yaml

## Install

```bash
npm install mailnation
```

Requires Node.js 18+.

## Quickstart

```ts
import { Client } from "mailnation";

const client = new Client({
  username: process.env.MAILNATION_SMTP_USER!,
  password: process.env.MAILNATION_SMTP_PASSWORD!,
});

const res = await client.emails.send({
  from: "noreply@your-domain.id",
  to: "user@gmail.com",
  subject: "OTP",
  html: "<p>847291</p>",
  text: "847291",
});

console.log(res.id, res.status);
```

## Attachment

```ts
import { readFile } from "node:fs/promises";
import { attachmentFromBytes } from "mailnation";

const att = attachmentFromBytes("invoice.pdf", await readFile("invoice.pdf"), "application/pdf");
req.attachments = [att];
```

Inline image: set `content_id` and use `cid:` in HTML.

## Wait for delivery

```ts
const email = await client.emails.wait(res.id);
```

## Errors

```ts
import { isInsufficientCredits, isIdempotencyConflict, isRetryable } from "mailnation";

if (isInsufficientCredits(err)) { /* top up */ }
if (isIdempotencyConflict(err)) { /* same key, different body */ }
if (isRetryable(err)) { /* retry with same Idempotency-Key */ }
```

## Auth

```ts
new Client({ username, password }); // SMTP credentials (recommended for apps)
new Client({ bearer: jwt });        // dashboard customer JWT
```

## License

MIT

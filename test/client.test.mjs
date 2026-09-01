import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import assert from "node:assert/strict";
import { Client, isInsufficientCredits, StatusDelivered, StatusQueued } from "../dist/index.js";

function listen(handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  return once(server, "listening").then(() => {
    const addr = server.address();
    return {
      url: `http://127.0.0.1:${addr.port}`,
      close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
    };
  });
}

test("send and get", async () => {
  let sawKey = "";
  const srv = await listen((req, res) => {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Basic ${Buffer.from("user:pass").toString("base64")}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no", code: "unauthorized", request_id: "req_1" }));
      return;
    }
    if (req.method === "POST" && req.url === "/emails") {
      sawKey = String(req.headers["idempotency-key"] ?? "");
      res.writeHead(202, { "Content-Type": "application/json", "X-Request-ID": "req_send" });
      res.end(JSON.stringify({ id: "01JTEST", status: StatusQueued, source: "api", request_id: "req_send" }));
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/emails/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "01JTEST",
          status: StatusDelivered,
          request_id: "req_get",
          recipients: [{ email: "user@gmail.com", status: "delivered" }],
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  try {
    const c = new Client({ baseURL: srv.url, username: "user", password: "pass" });
    const res = await c.emails.send({
      from: "noreply@example.com",
      to: "user@gmail.com",
      subject: "OTP",
      text: "847291",
    });
    assert.equal(res.id, "01JTEST");
    assert.ok(sawKey.startsWith("js-"));
    const got = await c.emails.get(res.id);
    assert.equal(got.status, StatusDelivered);
  } finally {
    await srv.close();
  }
});

test("insufficient credits", async () => {
  const srv = await listen((_req, res) => {
    res.writeHead(402, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "need credits", code: "insufficient_credits", request_id: "req_x" }));
  });
  try {
    const c = new Client({ baseURL: srv.url, username: "u", password: "p" });
    await assert.rejects(
      () => c.emails.send({ from: "a@x.com", to: "b@x.com", subject: "x", text: "y" }),
      (err) => isInsufficientCredits(err),
    );
  } finally {
    await srv.close();
  }
});

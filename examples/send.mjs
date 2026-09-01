import { Client } from "mailnation";

const user = process.env.MAILNATION_SMTP_USER;
const pass = process.env.MAILNATION_SMTP_PASSWORD;
if (!user || !pass) {
  console.error("set MAILNATION_SMTP_USER and MAILNATION_SMTP_PASSWORD");
  process.exit(1);
}

const client = new Client({ username: user, password: pass });
const res = await client.emails.send({
  from: process.env.MAILNATION_FROM || "noreply@example.com",
  to: process.env.MAILNATION_TO || "user@gmail.com",
  subject: "OTP",
  html: "<p>847291</p>",
  text: "847291",
});
console.log(`queued id=${res.id} request_id=${res.request_id}`);

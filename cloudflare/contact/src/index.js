import { EmailMessage } from "cloudflare:email";

const MAX_NAME = 100;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function sanitiseHeader(str) {
  return (str ?? "").replaceAll(/[\r\n]+/g, " ").trim();
}

function buildRawEmail(from, to, replyTo, subject, body) {
  return [
    `From: Shadow Computers Contact Form <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${replyTo}`,
    `Subject: [Contact Form] ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
  ].join("\r\n");
}

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token ?? "",
        remoteip: ip ?? "",
      }),
    },
  );
  const data = await res.json();
  return data.success === true;
}

function json(body, status = 200) {
  return Response.json(body, { status });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let name, email, subject, message, turnstileToken;
    try {
      const ct = request.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const b = await request.json();
        name = b.name;
        email = b.email;
        subject = b.subject;
        message = b.message;
        turnstileToken = b["cf-turnstile-response"];
      } else {
        const fd = await request.formData();
        name = fd.get("name");
        email = fd.get("email");
        subject = fd.get("subject");
        message = fd.get("message");
        turnstileToken = fd.get("cf-turnstile-response");
      }
    } catch {
      return json({ ok: false, error: "Invalid request body." }, 400);
    }

    name = sanitiseHeader(name);
    email = sanitiseHeader(email);
    subject = sanitiseHeader(subject);
    message = (message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return json({ ok: false, error: "All fields are required." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(
        { ok: false, error: "Please enter a valid email address." },
        400,
      );
    }

    if (
      name.length > MAX_NAME ||
      subject.length > MAX_SUBJECT ||
      message.length > MAX_MESSAGE
    ) {
      return json(
        {
          ok: false,
          error: "One or more fields exceed the maximum allowed length.",
        },
        400,
      );
    }

    if (env.TURNSTILE_SECRET) {
      const ip = request.headers.get("CF-Connecting-IP") ?? "";
      const valid = await verifyTurnstile(
        turnstileToken,
        env.TURNSTILE_SECRET,
        ip,
      );
      if (!valid) {
        return json(
          {
            ok: false,
            error:
              "Security check failed. Please refresh the page and try again.",
          },
          400,
        );
      }
    }

    const toAddress = env.CONTACT_EMAIL ?? "hello@shadowcomputers.co.uk";
    const fromAddress = env.FROM_EMAIL ?? "contact@shadowcomputers.co.uk";

    const emailBody = [
      `Name:    ${name}`,
      `Email:   ${email}`,
      ``,
      message,
    ].join("\n");

    const raw = buildRawEmail(
      fromAddress,
      toAddress,
      `"${name}" <${email}>`,
      subject,
      emailBody,
    );

    try {
      const msg = new EmailMessage(fromAddress, toAddress, raw);
      await env.CONTACT_SEND_EMAIL.send(msg);
    } catch (err) {
      console.error("Email send failed:", err);
      return json(
        {
          ok: false,
          error: `Message could not be sent. Please email ${toAddress} directly.`,
        },
        500,
      );
    }

    return json({ ok: true });
  },
};

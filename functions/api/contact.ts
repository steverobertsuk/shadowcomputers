import { AwsClient } from 'aws4fetch';

interface Env {
  TURNSTILE_SECRET_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  SES_FROM_EMAIL: string;
  SES_TO_EMAIL: string;
}

const MAX_NAME = 100;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function sanitiseHeader(str: unknown): string {
  return String(str ?? '')
    .replaceAll(/[\r\n]+/g, ' ')
    .trim();
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const name = sanitiseHeader(body.name);
  const email = sanitiseHeader(body.email);
  const subject = sanitiseHeader(body.subject);
  const message = String(body.message ?? '').trim();
  const turnstileToken = String(body['cf-turnstile-response'] ?? '');

  if (!name || !email || !subject || !message) {
    return json({ ok: false, error: 'All fields are required.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }

  if (
    name.length > MAX_NAME ||
    subject.length > MAX_SUBJECT ||
    message.length > MAX_MESSAGE
  ) {
    return json(
      { ok: false, error: 'One or more fields exceed the maximum allowed length.' },
      400,
    );
  }

  console.log('[contact] validation passed', {
    nameLength: name.length,
    emailDomain: email.split('@')[1],
    subjectLength: subject.length,
    messageLength: message.length,
    hasTurnstileToken: turnstileToken.length > 0,
  });

  // Log env config shape (never values) to catch misconfiguration
  console.log('[contact] env check', {
    hasTurnstileSecret: Boolean(env.TURNSTILE_SECRET_KEY),
    awsKeyIdPrefix: (env.AWS_ACCESS_KEY_ID ?? '').slice(0, 4),
    awsKeyIdLength: (env.AWS_ACCESS_KEY_ID ?? '').length,
    hasAwsSecret: Boolean(env.AWS_SECRET_ACCESS_KEY),
    awsSecretLength: (env.AWS_SECRET_ACCESS_KEY ?? '').length,
    region: env.AWS_REGION,
    fromEmail: env.SES_FROM_EMAIL,
    toEmail: env.SES_TO_EMAIL,
  });

  // Verify Turnstile token
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const tsResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: ip,
    }),
  });
  const tsData = (await tsResp.json()) as { success: boolean; 'error-codes'?: string[] };
  console.log('[contact] turnstile result', {
    status: tsResp.status,
    success: tsData.success,
    errorCodes: tsData['error-codes'] ?? [],
  });
  if (!tsData.success) {
    return json(
      { ok: false, error: 'Security check failed. Please refresh the page and try again.' },
      400,
    );
  }

  // Send via SES v2 API
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    service: 'ses',
  });

  const sesPayload = {
    FromEmailAddress: `"Shadow Computers Contact Form" <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [env.SES_TO_EMAIL] },
    ReplyToAddresses: [email],
    Content: {
      Simple: {
        Subject: {
          Data: `ShadowComputers.uk Contact: ${subject} from ${name}`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: [`Name:    ${name}`, `Email:   ${email}`, '', message].join('\n'),
            Charset: 'UTF-8',
          },
        },
      },
    },
  };

  const sesEndpoint = `https://email.${env.AWS_REGION}.amazonaws.com/v2/email/outbound-emails`;
  console.log('[contact] sending via SES v2', { endpoint: sesEndpoint });

  let sesResp: Response;
  try {
    sesResp = await aws.fetch(sesEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sesPayload),
    });
  } catch (err) {
    console.error('[contact] SES fetch threw', err instanceof Error ? err.message : String(err));
    return json(
      {
        ok: false,
        error: `Message could not be sent. Please email ${env.SES_TO_EMAIL} directly.`,
      },
      500,
    );
  }

  const sesBody = await sesResp.text();
  console.log('[contact] SES response', { status: sesResp.status, body: sesBody });

  if (!sesResp.ok) {
    console.error('[contact] SES error', sesResp.status, sesBody);
    return json(
      {
        ok: false,
        error: `Message could not be sent. Please email ${env.SES_TO_EMAIL} directly.`,
      },
      500,
    );
  }

  console.log('[contact] message sent successfully');
  return json({ ok: true });
};

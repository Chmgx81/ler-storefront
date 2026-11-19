import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config';

type Mail = { to: string; subject: string; text: string; html: string };

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function wrap(title: string, content: string) {
  return `<!doctype html><html lang="en"><body style="margin:0;padding:32px;background:#f2ece1;color:#221f19;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:auto">
    <p style="font-size:26px;margin:0 0 28px">ler<span style="color:#8b4a2c">.</span></p>
    <h1 style="font-size:26px;font-weight:normal;margin:0 0 20px">${escapeHtml(title)}</h1>
    ${content}
    <p style="font-size:12px;color:#6b6458;margin-top:32px">LER Studio · Copenhagen · hello@ler.studio</p>
  </div></body></html>`;
}

export function textMail(to: string, subject: string, body: string) {
  return { to, subject, text: body, html: wrap(subject, `<p style="line-height:1.6">${escapeHtml(body).replaceAll('\n', '<br>')}</p>`) };
}

/** Writes a real .eml-style file locally when no email provider is configured. */
export async function sendMail(mail: Mail) {
  if (config.mail.mode === 'resend' || (config.mail.mode === 'auto' && config.resendKey)) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.mail.from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`Mail provider returned ${response.status}`);
    }
    return;
  }

  await mkdir(config.outboxPath, { recursive: true });
  const file = join(config.outboxPath, `${Date.now()}-${randomUUID()}.json`);
  await writeFile(
    file,
    JSON.stringify({ ...mail, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
  console.log(`[mail] saved to ${file}`);
}

export async function sendReceipt(input: {
  to: string;
  name: string;
  number: string;
  total: string;
  orderUrl: string;
}) {
  const body = [
    `Thank you, ${input.name}.`,
    '',
    `Your order ${input.number} is confirmed. Total: ${input.total}.`,
    '',
    `View your order: ${input.orderUrl}`,
    '',
    'This is a demo shop. No payment was taken and nothing will ship.',
  ].join('\n');

  await sendMail({
    to: input.to,
    subject: `Your LER order ${input.number}`,
    text: body,
    html: wrap(
      `Thank you, ${escapeHtml(input.name)}.`,
      `<p style="line-height:1.6">Your order <strong>${escapeHtml(input.number)}</strong> is confirmed. Total: ${escapeHtml(input.total)}.</p>
       <p style="margin:24px 0"><a href="${escapeHtml(input.orderUrl)}" style="color:#8b4a2c">View your order</a></p>
       <p style="font-size:12px;color:#6b6458">This is a demo shop. No payment was taken and nothing will ship.</p>`,
    ),
  });
}

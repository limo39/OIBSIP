const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const tmpDir = path.join(__dirname, '../../tmp');

let transporter;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return transporter;
  }
  transporter = nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

function shell({ title, body }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4efe6;font-family:Georgia,serif;color:#141210;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#fbf7f1;border:1px solid #e4ddd2;">
            <tr>
              <td style="padding:28px 32px 0;font-family:Georgia,serif;font-size:28px;">Forno</td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                  <td style="width:28px;height:4px;background:#141210;"></td>
                  <td style="width:28px;height:4px;background:#c8102e;"></td>
                  <td style="width:28px;height:4px;background:#146c43;"></td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 32px 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#146c43;">
                Nairobi
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#c8102e;">
                ${escapeHtml(title)}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#141210;">
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendMail({ to, subject, text, html }) {
  const tx = await getTransporter();
  const from = process.env.MAIL_FROM || 'Forno <noreply@forno.local>';
  const info = await tx.sendMail({ from, to, subject, text, html });

  fs.mkdirSync(tmpDir, { recursive: true });
  const record = { to, subject, text, at: new Date().toISOString() };
  fs.appendFileSync(path.join(tmpDir, 'emails.jsonl'), `${JSON.stringify(record)}\n`);
  fs.writeFileSync(path.join(tmpDir, 'last-email.json'), JSON.stringify(record, null, 2));

  if (!process.env.SMTP_HOST) {
    console.log('\n========== FORNO EMAIL ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('=================================\n');
  }
  return info;
}

function clientUrl(pathname) {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${pathname}`;
}

async function sendVerificationEmail(to, rawToken) {
  const url = clientUrl(`/verify-email/${rawToken}`);
  await sendMail({
    to,
    subject: 'Confirm your Forno account',
    text: `Karibu. Confirm your email to start ordering from Nairobi.\n\n${url}\n\nThis link expires in 24 hours.`,
    html: shell({
      title: 'Confirm your email',
      body: `<p>Karibu. Confirm your email and the Nairobi menu opens.</p>
        <p><a href="${url}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 18px;">Verify email</a></p>
        <p style="font-size:13px;color:#5c5148;">Or paste this link:<br>${escapeHtml(url)}</p>
        <p style="font-size:13px;color:#5c5148;">The link expires in 24 hours.</p>`,
    }),
  });
  return url;
}

async function sendResetEmail(to, rawToken) {
  const url = clientUrl(`/reset-password/${rawToken}`);
  await sendMail({
    to,
    subject: 'Reset your Forno password',
    text: `Reset your password.\n\n${url}\n\nThis link expires in 30 minutes. If you did not ask for it, ignore this email.`,
    html: shell({
      title: 'Reset password',
      body: `<p>Use the link below to choose a new password. It expires in 30 minutes.</p>
        <p><a href="${url}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 18px;">Reset password</a></p>
        <p style="font-size:13px;color:#5c5148;">Or paste this link:<br>${escapeHtml(url)}</p>`,
    }),
  });
  return url;
}

async function sendLowStockEmail(to, items) {
  const lines = items
    .map((item) => `${item.name} (${item.category}): ${item.stock} left, threshold ${item.threshold}`)
    .join('\n');
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.category)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.stock}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.threshold}</td>
        </tr>`
    )
    .join('');

  await sendMail({
    to,
    subject: `Forno stock alert: ${items.length} item${items.length === 1 ? '' : 's'} below threshold`,
    text: `These inventory items are below their threshold.\n\n${lines}\n\nUpdate stock from the Nairobi kitchen inventory desk.`,
    html: shell({
      title: 'Stock below threshold',
      body: `<p>These items need a restock before the Westlands service gets ahead of the walk-in.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <th align="left">Item</th><th align="left">Category</th><th align="left">Stock</th><th align="left">Threshold</th>
          </tr>
          ${rows}
        </table>`,
    }),
  });
}

function devPreviewEnabled() {
  return process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST;
}

module.exports = {
  sendVerificationEmail,
  sendResetEmail,
  sendLowStockEmail,
  devPreviewEnabled,
};

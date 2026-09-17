const { Resend } = require('resend');
const { escapeHtml } = require('./validate');

let resend = null;
function getClient() {
  if (!resend && process.env.RESEND_API_KEY) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function sendContactEmail({ name, email, message }) {
  const client = getClient();
  if (!client) {
    console.warn('RESEND_API_KEY not set — skipping email send.');
    return { sent: false };
  }

  const { error } = await client.emails.send({
    from: 'Portfolio Contact <onboarding@resend.dev>',
    to: [process.env.OWNER_EMAIL],
    replyTo: email,
    subject: `[Portfolio] New message from ${name.trim()}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#0f172a;margin-bottom:4px;">New contact form submission</h2>
        <p style="color:#64748b;margin-bottom:24px;font-size:14px;">Sent from your portfolio contact form</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;font-weight:600;color:#0f172a;width:80px;vertical-align:top;">Name</td>
            <td style="padding:10px 0;color:#334155;">${escapeHtml(name.trim())}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-weight:600;color:#0f172a;vertical-align:top;">Email</td>
            <td style="padding:10px 0;color:#334155;"><a href="mailto:${escapeHtml(email)}" style="color:#0ea5e9;">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-weight:600;color:#0f172a;vertical-align:top;">Message</td>
            <td style="padding:10px 0;color:#334155;white-space:pre-wrap;">${escapeHtml(message.trim())}</td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;">Reply directly to this email to respond to ${escapeHtml(name.trim())}.</p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return { sent: false, error };
  }
  return { sent: true };
}

module.exports = { sendContactEmail };

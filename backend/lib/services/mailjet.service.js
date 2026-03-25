// Mailjet REST API v3.1 — no SDK required, uses fetch
// Docs: https://dev.mailjet.com/email/guides/send-api-v31/

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'hello@freelanceiq.app';
const FROM_NAME = 'FreelanceIQ';

function isConfigured() {
  return !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
}

async function sendEmail({ to, toName, subject, htmlContent, textContent }) {
  if (!isConfigured()) {
    console.warn('[Mailjet] Not configured — skipping email to:', to);
    return { skipped: true };
  }

  const credentials = Buffer.from(
    `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`
  ).toString('base64');

  const body = {
    Messages: [
      {
        From: { Email: FROM_EMAIL, Name: FROM_NAME },
        To: [{ Email: to, Name: toName || to }],
        Subject: subject,
        HTMLPart: htmlContent,
        TextPart: textContent || subject,
      },
    ],
  };

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mailjet API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  console.log(`[Mailjet] Email sent to ${to} — status: ${result.Messages?.[0]?.Status}`);
  return result;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseTemplate(previewText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>FreelanceIQ</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, #bodyTable { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    #bodyTable { border-spacing: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); padding: 32px 40px; border-radius: 16px 16px 0 0; }
    .body-card { background: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; }
    .footer { padding: 24px 40px; text-align: center; }
    h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .logo-dot { color: #60a5fa; }
    h2 { margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700; }
    p { margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.65; }
    .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; margin: 8px 0 24px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 8px 0; }
    .stat-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
    .stat-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer-text a { color: #64748b; }
    .green { color: #059669; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; background: #dbeafe; color: #1d4ed8; }
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .header, .body-card, .footer { padding: 24px 20px !important; }
    }
  </style>
</head>
<body>
  <span style="display:none;font-size:1px;color:#f1f5f9;max-height:0">${previewText}&nbsp;</span>
  <table id="bodyTable" role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding: 24px 16px;">
      <div class="wrapper">
        <!-- Header -->
        <div class="header">
          <h1>Freelance<span class="logo-dot">IQ</span></h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">AI-powered bidding intelligence</p>
        </div>
        <!-- Body -->
        <div class="body-card">
          ${bodyHtml}
        </div>
        <!-- Footer -->
        <div class="footer">
          <p class="footer-text">
            FreelanceIQ · <a href="https://freelanceiq.app">freelanceiq.app</a><br/>
            You're receiving this because you have a FreelanceIQ account.<br/>
            <a href="https://freelanceiq.app/settings">Manage email preferences</a>
          </p>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── sendWelcome ──────────────────────────────────────────────────────────────

async function sendWelcome({ email, name }) {
  const firstName = name?.split(' ')[0] || 'there';
  const subject = `Welcome to FreelanceIQ, ${firstName}! 🎉`;

  const body = `
    <h2>Welcome aboard, ${firstName}!</h2>
    <p>You've joined <strong>FreelanceIQ</strong> — the AI that helps freelancers bid smarter on Upwork and match CV-first on LinkedIn.</p>
    <p>Here's what to do first:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" valign="middle" style="padding-right:16px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:10px;text-align:center;line-height:36px;font-size:16px;font-weight:800;color:#ffffff;">1</div>
              </td>
              <td valign="middle">
                <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Paste a job URL</div>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">Head to your dashboard and analyse your first job. Takes 5 seconds.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" valign="middle" style="padding-right:16px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:10px;text-align:center;line-height:36px;font-size:16px;font-weight:800;color:#ffffff;">2</div>
              </td>
              <td valign="middle">
                <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Complete your profile</div>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">Add your skills and hourly rate so the AI tailors your bid recommendations.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" valign="middle" style="padding-right:16px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:10px;text-align:center;line-height:36px;font-size:16px;font-weight:800;color:#ffffff;">3</div>
              </td>
              <td valign="middle">
                <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Use the AI cover letter</div>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">Every analysis generates a personalised proposal. Copy, tweak, send.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <center>
      <a href="https://freelanceiq.app/dashboard" class="btn">Go to your dashboard →</a>
    </center>

    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">You're on the <strong>Free plan</strong> — 5 analyses per month. <a href="https://freelanceiq.app/billing" style="color:#2563eb;font-weight:600;">Upgrade to Pro</a> for unlimited analyses + advanced templates.</p>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject,
    htmlContent: baseTemplate(`Welcome to FreelanceIQ, ${firstName}!`, body),
    textContent: `Welcome to FreelanceIQ, ${firstName}! Visit https://freelanceiq.app/dashboard to get started.`,
  });
}

// ─── sendFirstAnalysis ────────────────────────────────────────────────────────

async function sendFirstAnalysis({ email, name, analysis }) {
  const firstName = name?.split(' ')[0] || 'there';
  const { job, result, proposal } = analysis;
  const score = result.bid_score;
  const scoreColor = score >= 70 ? '#059669' : score >= 45 ? '#d97706' : '#dc2626';

  const subject = `Your first bid score is in: ${score}/100 for "${job.title}"`;

  const body = `
    <h2>Your first analysis is ready!</h2>
    <p>Here's what FreelanceIQ found for <strong>${job.title}</strong> on ${job.platform}:</p>

    <div class="stat-box" style="text-align:center;margin-bottom:20px;">
      <div class="stat-label">Bid Score</div>
      <div class="stat-value" style="color:${scoreColor};font-size:48px;">${score}<span style="font-size:24px;">/100</span></div>
      <div style="margin-top:8px;">
        <span class="badge" style="background:${result.win_probability === 'High' ? '#d1fae5' : result.win_probability === 'Medium' ? '#fef3c7' : '#fee2e2'};color:${result.win_probability === 'High' ? '#065f46' : result.win_probability === 'Medium' ? '#92400e' : '#991b1b'};">
          ${result.win_probability} win probability
        </span>
      </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="8">
      <tr>
        <td width="48%">
          <div class="stat-box">
            <div class="stat-label">Suggested Bid Range</div>
            <div class="stat-value">$${result.bid_min}–$${result.bid_max}</div>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%">
          <div class="stat-box">
            <div class="stat-label">Competition</div>
            <div class="stat-value" style="font-size:18px;">${result.competition_level}</div>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin-top:20px;"><strong>AI reasoning:</strong> ${result.score_reasoning}</p>

    ${proposal?.cover_letter ? `
    <div class="stat-box" style="margin-top:16px;">
      <div class="stat-label" style="margin-bottom:8px;">AI Cover Letter Preview</div>
      <p style="margin:0;font-size:14px;color:#334155;font-style:italic;">"${proposal.cover_letter.slice(0, 200)}…"</p>
    </div>` : ''}

    <center style="margin-top:24px;">
      <a href="https://freelanceiq.app/analysis/${analysis._id}" class="btn">View full analysis →</a>
    </center>

    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">Want unlimited analyses? <a href="https://freelanceiq.app/billing" style="color:#2563eb;font-weight:600;">Upgrade to Pro for $9/mo</a>.</p>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject,
    htmlContent: baseTemplate(`Your bid score: ${score}/100`, body),
    textContent: `Your first FreelanceIQ analysis: ${score}/100 for "${job.title}". Suggested bid: $${result.bid_min}–$${result.bid_max}. View at https://freelanceiq.app/analysis/${analysis._id}`,
  });
}

// ─── sendWeeklyDigest ─────────────────────────────────────────────────────────

async function sendWeeklyDigest({ email, name, stats }) {
  const firstName = name?.split(' ')[0] || 'there';
  const { total_this_week, avg_score, win_rate, analyses_remaining } = stats;

  const subject = `Your weekly FreelanceIQ digest — ${total_this_week} analyses this week`;

  const body = `
    <h2>Your week in review, ${firstName}</h2>
    <p>Here's how you used FreelanceIQ this week:</p>

    <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
      <tr>
        <td width="31%">
          <div class="stat-box" style="text-align:center;">
            <div class="stat-label">Analyses</div>
            <div class="stat-value">${total_this_week}</div>
          </div>
        </td>
        <td width="2%"></td>
        <td width="31%">
          <div class="stat-box" style="text-align:center;">
            <div class="stat-label">Avg Score</div>
            <div class="stat-value">${avg_score}/100</div>
          </div>
        </td>
        <td width="2%"></td>
        <td width="31%">
          <div class="stat-box" style="text-align:center;">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value">${Math.round((win_rate || 0) * 100)}%</div>
          </div>
        </td>
      </tr>
    </table>

    ${analyses_remaining !== null ? `
    <div class="stat-box" style="border-color:#bfdbfe;background:#eff6ff;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div class="stat-label" style="color:#1d4ed8;">Analyses Remaining</div>
          <div class="stat-value" style="color:#1e3a8a;font-size:20px;">${analyses_remaining} left this month</div>
        </div>
        <a href="https://freelanceiq.app/billing" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:10px;">Upgrade →</a>
      </div>
    </div>` : ''}

    <center style="margin-top:28px;">
      <a href="https://freelanceiq.app/dashboard" class="btn">Go to dashboard →</a>
    </center>

    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">
      <a href="https://freelanceiq.app/settings" style="color:#2563eb;">Unsubscribe from weekly digest</a>
    </p>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject,
    htmlContent: baseTemplate(`Your week: ${total_this_week} analyses, ${Math.round((win_rate || 0) * 100)}% win rate`, body),
    textContent: `FreelanceIQ weekly digest: ${total_this_week} analyses, avg score ${avg_score}/100, win rate ${Math.round((win_rate || 0) * 100)}%. Visit https://freelanceiq.app/dashboard`,
  });
}

// ─── sendPasswordReset ────────────────────────────────────────────────────────

async function sendPasswordReset({ email, name, resetUrl }) {
  const firstName = name?.split(' ')[0] || 'there';
  const subject = 'Reset your FreelanceIQ password';

  const body = `
    <h2>Password reset request</h2>
    <p>Hi ${firstName}, we received a request to reset your FreelanceIQ password. Click the button below to create a new one.</p>

    <center style="margin: 24px 0;">
      <a href="${resetUrl}" class="btn">Reset my password →</a>
    </center>

    <div class="stat-box" style="border-color:#fde68a;background:#fffbeb;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⚠️ This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.
      </p>
    </div>

    <hr class="divider" />
    <p style="font-size:12px;color:#94a3b8;">
      If the button above doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${resetUrl}" style="color:#64748b;word-break:break-all;">${resetUrl}</a>
    </p>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject,
    htmlContent: baseTemplate('Reset your FreelanceIQ password', body),
    textContent: `Hi ${firstName}, reset your FreelanceIQ password here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

module.exports = { sendWelcome, sendFirstAnalysis, sendWeeklyDigest, sendPasswordReset };

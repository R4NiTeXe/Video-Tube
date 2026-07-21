export const otpEmailTemplate = (otp, purpose, userName) => {
  const purposeLabels = {
    registration: "Account Registration",
    "forgot-password": "Password Reset",
    "change-password": "Password Change Verification",
    "verify-email": "Email Verification",
    "social-link": "Social Account Linking",
    login: "Sign-In Verification",
    "email-registration": "Email Registration",
    "delete-account": "Account Deletion Confirmation",
    "forgot-password-change": "Password Reset",
    reset: "Verification",
  };

  const label = purposeLabels[purpose] || "Verification";
  const expiryMinutes = 10;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${label} — VideoTube</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: #fecaca;">Tube</span></span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">${label}</h1>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
                ${userName ? `Hi ${userName},` : "Hello,"}
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                Use the verification code below to complete your ${label.toLowerCase()}. This code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fecaca; border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px 40px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 600; color: #dc2626; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Verification Code</div>
                          <div style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace; font-size: 36px; font-weight: 800; color: #dc2626; letter-spacing: 8px; line-height: 1.2;">
                            ${otp.match(/.{1,3}/g).join("&nbsp;&nbsp;")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
                If you didn't request this, you can safely ignore this email. Your account security is important to us.
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="background: #fef2f2; border-top: 1px solid #fecaca; padding: 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 24px; vertical-align: top;">
                    <span style="font-size: 16px;">⚠</span>
                  </td>
                  <td style="font-size: 12px; color: #991b1b; line-height: 1.6;">
                    <strong>Security Notice:</strong> Never share this code with anyone. VideoTube will never ask for your verification code via phone, email, or social media. If someone requests this code, it's a scam.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Need help? Contact our support team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const notificationEmailTemplate = ({ title, message, userName, actionUrl, actionText, details = [], warning = false }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — VideoTube</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: #fecaca;">Tube</span></span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">${title}</h1>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
                ${userName ? `Hi ${userName},` : "Hello,"}
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                ${message}
              </p>

              ${details.length > 0 ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                ${details.map(d => `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151; font-size: 14px;">${d.label}:</strong>
                    <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">${d.value}</span>
                  </td>
                </tr>
                `).join("")}
              </table>
              ` : ""}

              ${actionUrl && actionText ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 8px;">
                          <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${actionText}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${warning ? `
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">
                  <strong>⚠ Security Alert:</strong> If you did not perform this action, please secure your account immediately by changing your password and contacting support.
                </p>
              </div>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Need help? Contact our support team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const securityEventEmailTemplate = (event) => {
  const eventTemplates = {
    "login": {
      title: "New Sign-In Detected",
      message: "A new sign-in was detected on your VideoTube account.",
      actionText: "Review Activity",
    },
    "password-changed": {
      title: "Password Changed Successfully",
      message: "Your VideoTube account password has been changed.",
      actionText: "View Security Settings",
      warning: false,
    },
    "email-changed": {
      title: "Email Address Updated",
      message: "The email address on your VideoTube account has been updated.",
      actionText: "Review Account Settings",
      warning: true,
    },
    "account-deleted": {
      title: "Account Deletion Confirmed",
      message: "Your VideoTube account has been permanently deleted as requested.",
      actionText: "Contact Support",
      warning: false,
    },
    "security-settings-updated": {
      title: "Security Settings Updated",
      message: "Your VideoTube security settings have been modified.",
      actionText: "Review Security Settings",
      warning: true,
    },
    "new-device-login": {
      title: "New Device Sign-In",
      message: "A sign-in was detected from a new device or location.",
      actionText: "Review Devices",
      warning: true,
    },
    "2fa-enabled": {
      title: "Two-Factor Authentication Enabled",
      message: "Two-factor authentication has been enabled on your account.",
      actionText: "View Security Settings",
      warning: false,
    },
    "2fa-disabled": {
      title: "Two-Factor Authentication Disabled",
      message: "Two-factor authentication has been disabled on your account.",
      actionText: "Review Security Settings",
      warning: true,
    },
  };

  const template = eventTemplates[event.type] || {
    title: "Account Activity",
    message: event.message || "An important account activity occurred.",
    actionText: "View Details",
    warning: false,
  };

  return notificationEmailTemplate({
    title: template.title,
    message: template.message,
    userName: event.userName,
    actionUrl: event.actionUrl,
    actionText: template.actionText,
    details: event.details || [],
    warning: template.warning,
  });
};

export const passwordChangedEmailTemplate = (userName) => {
  return notificationEmailTemplate({
    title: "Password Changed Successfully",
    message: "Your VideoTube account password has been changed.",
    userName,
    actionUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/settings/security`,
    actionText: "View Security Settings",
    details: [
      { label: "Time", value: new Date().toLocaleString() },
      { label: "Action", value: "Password Change" },
    ],
    warning: false,
  });
};

export const welcomeEmailTemplate = (userName) => {
  return notificationEmailTemplate({
    title: "Welcome to VideoTube!",
    message: "Thanks for joining VideoTube. We're excited to have you on board.",
    userName,
    actionUrl: "https://videotube.app",
    actionText: "Explore VideoTube",
    details: [],
    warning: false,
  });
};

export const accountDeletedEmailTemplate = (userName) => {
  return notificationEmailTemplate({
    title: "Account Deletion Confirmed",
    message: "Your VideoTube account has been permanently deleted. If this was a mistake, please contact support immediately.",
    userName,
    actionUrl: "https://videotube.app/support",
    actionText: "Contact Support",
    details: [
      { label: "Deletion Date", value: new Date().toLocaleString() },
      { label: "Status", value: "Completed" },
    ],
    warning: false,
  });
};
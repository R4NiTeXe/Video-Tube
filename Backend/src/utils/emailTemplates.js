export const formatDate = (dateObj = new Date(), timezone = undefined) => {
  try {
    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    };
    return new Intl.DateTimeFormat("en-GB", options).format(dateObj);
  } catch {
    const fallback = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    };
    return new Intl.DateTimeFormat("en-GB", fallback).format(dateObj);
  }
};

export const getThemeConfig = (themeType) => {
  switch (themeType) {
    case "success":
      return {
        gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
        border: "#86efac",
        bgLight: "#f0fdf4",
        textAlert: "#166534"
      };
    case "warning":
      return {
        gradient: "linear-gradient(135deg, #ca8a04 0%, #eab308 100%)",
        border: "#fef08a",
        bgLight: "#fefce8",
        textAlert: "#854d0e"
      };
    case "destructive":
      return {
        gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
        border: "#fecaca",
        bgLight: "#fef2f2",
        textAlert: "#991b1b"
      };
    case "standard":
    default:
      return {
        gradient: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
        border: "#c7d2fe",
        bgLight: "#eef2ff",
        textAlert: "#3730a3"
      };
  }
};

export const otpEmailTemplate = (otp, purpose, userName, locationInfo = null) => {
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
  
  const theme = getThemeConfig(purpose === "delete-account" ? "destructive" : "standard");

  const locationHtml = locationInfo ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
      <tr><td style="padding: 12px 16px;"><strong style="color:#374151; font-size: 13px;">Location:</strong> <span style="color:#6b7280; font-size: 13px;">${locationInfo.location || 'Unknown'}</span></td></tr>
      <tr><td style="padding: 12px 16px; border-top: 1px solid #e5e7eb;"><strong style="color:#374151; font-size: 13px;">Device:</strong> <span style="color:#6b7280; font-size: 13px;">${locationInfo.device || 'Unknown'}</span></td></tr>
    </table>
  ` : "";

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
          <tr>
            <td style="background: ${theme.gradient}; padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: ${theme.border};">Tube</span></span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">${label}</h1>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
                ${userName ? `Hi ${userName},` : "Hello,"}
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                Use the verification code below to complete your ${label.toLowerCase()}. This code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="background: ${theme.bgLight}; border: 2px solid ${theme.border}; border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px 40px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 600; color: ${theme.textAlert}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Verification Code</div>
                          <div style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace; font-size: 36px; font-weight: 800; color: ${theme.textAlert}; letter-spacing: 8px; line-height: 1.2;">
                            ${otp.match(/.{1,3}/g).join("&nbsp;&nbsp;")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${locationHtml}

              <p style="margin: 28px 0 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
                If you didn't request this, you can safely ignore this email. Your account security is important to us.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #fef2f2; border-top: 1px solid #fecaca; padding: 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 24px; vertical-align: top;">
                    <span style="font-size: 16px;">⚠</span>
                  </td>
                  <td style="font-size: 12px; color: #991b1b; line-height: 1.6;">
                    <strong>Security Notice:</strong> Never share this code with anyone. VideoTube will never ask for your verification code via phone, email, or social media.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
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

export const notificationEmailTemplate = ({ title, message, userName, actionUrl, actionText, details = [], warning = false, themeType = "standard" }) => {
  const theme = getThemeConfig(themeType);
  
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
          <tr>
            <td style="background: ${theme.gradient}; padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: ${theme.border};">Tube</span></span>
              </div>
            </td>
          </tr>
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${details.map((d, index) => `
                <tr>
                  <td style="padding: 12px 16px; ${index < details.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                    <strong style="color: #374151; font-size: 13px;">${d.label}:</strong>
                    <span style="color: #6b7280; font-size: 13px; margin-left: 8px;">${d.value}</span>
                  </td>
                </tr>
                `).join("")}
              </table>
              ` : ""}

              ${actionUrl && actionText ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" target="_blank" style="background: ${theme.gradient}; display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${actionText}</a>
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
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
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

export const accountRegisteredTemplate = (user, locationInfo) => {
  const details = [];
  if (locationInfo?.location) details.push({ label: "Location", value: locationInfo.location });
  if (locationInfo?.device) details.push({ label: "Device", value: locationInfo.device });
  
  return notificationEmailTemplate({
    title: "Welcome to VideoTube!",
    message: "Your account was successfully registered. We're excited to have you on board.",
    userName: user.fullName || user.username,
    actionUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}`,
    actionText: "Explore VideoTube",
    details,
    warning: false,
    themeType: "success"
  });
};

export const accountDeletedTemplate = (user) => {
  return notificationEmailTemplate({
    title: "Account Deletion Confirmed",
    message: "Your VideoTube account has been permanently deleted as requested. We're sad to see you go.",
    userName: user.fullName || user.username,
    details: [
      { label: "Deletion Date", value: formatDate() },
      { label: "Status", value: "Permanently Deleted" }
    ],
    warning: false,
    themeType: "destructive"
  });
};

export const suspiciousLoginTemplate = (user, locationInfo, platform, lastLoginDate = null) => {
  const tz = locationInfo?.timezone;
  const details = [
    { label: "Login Method", value: platform },
    { label: "Last Login", value: lastLoginDate ? formatDate(new Date(lastLoginDate), tz) : formatDate(undefined, tz) }
  ];
  if (locationInfo?.location) details.push({ label: "Location", value: locationInfo.location });
  if (locationInfo?.device) details.push({ label: "Device", value: locationInfo.device });

  return notificationEmailTemplate({
    title: "New Sign-In Detected",
    message: "We noticed a sign-in to your VideoTube account after a long period of inactivity.",
    userName: user.fullName || user.username,
    details,
    warning: true,
    themeType: "warning"
  });
};

export const accountRecoveryTemplate = (user, locationInfo, platform) => {
  const details = [
    { label: "Recovery Method", value: platform },
    { label: "Time", value: formatDate(undefined, locationInfo?.timezone) }
  ];
  if (locationInfo?.location) details.push({ label: "Location", value: locationInfo.location });
  if (locationInfo?.device) details.push({ label: "Device", value: locationInfo.device });

  return notificationEmailTemplate({
    title: "Account Recovery Successful",
    message: "Your VideoTube account was successfully accessed via Skip & Login recovery.",
    userName: user.fullName || user.username,
    details,
    warning: true,
    themeType: "warning"
  });
};

export const passwordChangedEmailTemplate = (user, locationInfo) => {
  const details = [
    { label: "Action", value: "Password Changed" },
    { label: "Time", value: formatDate(undefined, locationInfo?.timezone) }
  ];
  if (locationInfo?.location) details.push({ label: "Location", value: locationInfo.location });
  if (locationInfo?.device) details.push({ label: "Device", value: locationInfo.device });

  return notificationEmailTemplate({
    title: "Password Changed Successfully",
    message: "Your VideoTube account password has been changed successfully.",
    userName: user.fullName || user.username,
    details,
    warning: false,
    themeType: "success"
  });
};

export const identifierUpdatedTemplate = (user, identifierType, newIdentifier) => {
  return notificationEmailTemplate({
    title: `${identifierType === 'email' ? 'Email' : 'Mobile Number'} Updated`,
    message: `Your VideoTube profile was successfully updated. Your new ${identifierType} is ${newIdentifier}.`,
    userName: user.fullName || user.username,
    actionUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/edit-profile`,
    actionText: "View Profile",
    details: [
      { label: "Action", value: `${identifierType === 'email' ? 'Email' : 'Mobile'} Updated` },
      { label: "Time", value: formatDate() }
    ],
    warning: false,
    themeType: "success"
  });
};

export const identifierDeletedTemplate = (user, identifierType) => {
  return notificationEmailTemplate({
    title: `${identifierType === 'email' ? 'Email' : 'Mobile Number'} Removed`,
    message: `A ${identifierType} was successfully removed from your VideoTube account.`,
    userName: user.fullName || user.username,
    actionUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/edit-profile`,
    actionText: "View Profile",
    details: [
      { label: "Action", value: `${identifierType === 'email' ? 'Email' : 'Mobile'} Removed` },
      { label: "Time", value: formatDate() }
    ],
    warning: true,
    themeType: "warning"
  });
};

export const contactOwnerTemplate = ({ name, email, subject, message, time, ip, userAgent }) => {
  const details = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    { label: "Subject", value: subject },
    { label: "Message", value: message },
    { label: "Time", value: time },
    { label: "IP", value: ip },
    { label: "User Agent", value: userAgent },
  ];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message — VideoTube</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: #c7d2fe;">Tube</span></span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">New Contact Message</h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; text-align: center;">A user has submitted a contact form.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                ${details.map((d, index) => `
                <tr>
                  <td style="padding: 12px 16px; ${index < details.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                    <strong style="color: #374151; font-size: 13px; display: block; margin-bottom: 2px;">${d.label}:</strong>
                    <span style="color: #6b7280; font-size: 13px; word-break: break-word;">${d.value}</span>
                  </td>
                </tr>
                `).join("")}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification from the VideoTube contact form.</p>
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

export const contactUserConfirmationTemplate = (name) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your message — VideoTube</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: #86efac;">Tube</span></span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">We received your message</h1>
              <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
                Hello ${name},
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                Thank you for contacting VideoTube.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                Your message has been received successfully. We appreciate your feedback and will review it as soon as possible.
              </p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af; text-align: center;">
                This is an automated confirmation email.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                Regards,<br>VideoTube
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
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
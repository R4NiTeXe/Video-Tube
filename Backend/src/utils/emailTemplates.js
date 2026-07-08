export const otpEmailTemplate = (otp, purpose) => {
  const titles = {
    "forgot-password": "Account Recovery",
    "change-password": "Security Alert",
    "verify-email": "Welcome to VideoTube",
    "registration": "Welcome to VideoTube",
    "login": "Sign-In Verification",
    "social-link": "Link Your Social Account",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fafafa; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e8; }
        .header { background: #6366f1; padding: 24px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; }
        .body { padding: 28px 24px; }
        .greeting { color: #333; font-size: 15px; margin-bottom: 16px; }
        .message { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .otp-box { background: #f8f7ff; border: 1px solid #e0e0ff; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
        .otp-label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .otp-code { font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: 6px; font-family: 'Courier New', monospace; }
        .note { color: #999; font-size: 12px; line-height: 1.5; margin-top: 20px; }
        .footer { padding: 16px 24px; text-align: center; color: #bbb; font-size: 11px; border-top: 1px solid #f0f0f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VideoTube</h1>
        </div>
        <div class="body">
          <p class="greeting">Hello,</p>
          <p class="message">${titles[purpose] || "Here is your verification code"}:</p>
          <div class="otp-box">
            <div class="otp-label">Your Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          <p class="note">This code will expire in 10 minutes. If you did not request this, you can safely ignore this message.</p>
        </div>
        <div class="footer">
          <p>VideoTube &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const passwordChangedEmailTemplate = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 30px; text-align: center; }
        .text { color: #555; font-size: 14px; line-height: 1.6; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Changed</h1>
        </div>
        <div class="body">
          <h2 style="color:#333;">Your password has been changed</h2>
          <p class="text">Your VideoTube account password was recently changed. If you didn't make this change, please secure your account immediately.</p>
        </div>
        <div class="footer">
          <p>VideoTube &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

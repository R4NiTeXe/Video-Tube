export const otpEmailTemplate = (otp, purpose) => {
  const titles = {
    "forgot-password": "Reset Your Password",
    "change-password": "Change Your Password",
    "verify-email": "Verify Your Email",
    "social-link": "Link Your Social Account",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 30px; text-align: center; }
        .otp-box { background: #f8f7ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: 800; color: #6366f1; letter-spacing: 8px; }
        .text { color: #555; font-size: 14px; line-height: 1.6; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VideoTube</h1>
        </div>
        <div class="body">
          <h2 style="color:#333;margin-bottom:10px;">${titles[purpose] || "Verify Your Identity"}</h2>
          <p class="text">Use the following OTP to complete your request. This code expires in <strong>10 minutes</strong>.</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="text">If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>VideoTube &copy; ${new Date().getFullYear()} &mdash; Do not share this OTP with anyone.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const welcomeEmailTemplate = (username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 30px; text-align: center; }
        .text { color: #555; font-size: 14px; line-height: 1.6; }
        .btn { display: inline-block; padding: 12px 30px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to VideoTube!</h1>
        </div>
        <div class="body">
          <h2 style="color:#333;">Hey ${username}!</h2>
          <p class="text">Your account has been created successfully. Start exploring videos, create content, and join our community.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Explore Videos</a>
          <p class="text">If you have any questions, feel free to reach out to our support team.</p>
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

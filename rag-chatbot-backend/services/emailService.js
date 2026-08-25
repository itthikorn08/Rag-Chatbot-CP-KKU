const nodemailer = require("nodemailer");
const dns = require("dns");
const https = require("https");

// Force IPv4 first because cloud containers often do not have IPv6 routing
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const buildTransportConfig = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = process.env.SMTP_SECURE !== "false" ? false : (port === 465);

  return {
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
};

const transporter = nodemailer.createTransport(buildTransportConfig());

const sendOtpEmail = async (toEmail, otp) => {
  const subject = "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - CP KKU Chatbot";
  const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#f0f2f5; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0d1642 0%,#1a237e 40%,#283593 100%); padding:32px 24px; text-align:center;">
                    <div style="width:56px; height:56px; background:rgba(255,255,255,0.15); border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
                      <span style="font-size:28px;">🎓</span>
                    </div>
                    <h1 style="color:#ffffff; margin:0; font-size:20px; font-weight:700;">CP KKU Chatbot</h1>
                    <p style="color:rgba(255,255,255,0.7); margin:4px 0 0; font-size:13px;">Password Reset Request</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 24px;">
                    <p style="color:#333; font-size:15px; margin:0 0 8px; line-height:1.5;">สวัสดีค่ะ,</p>
                    <p style="color:#555; font-size:14px; margin:0 0 24px; line-height:1.6;">เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยันตัวตน:</p>
                    
                    <div style="background:linear-gradient(135deg,#f8f9ff,#eef0ff); border:2px solid #c5cae9; border-radius:12px; padding:24px; text-align:center; margin-bottom:24px;">
                      <p style="color:#666; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin:0 0 8px; font-weight:600;">รหัส OTP ของคุณ</p>
                      <div style="font-size:36px; font-weight:800; color:#1a237e; letter-spacing:8px; font-family:'Courier New',monospace;">${otp}</div>
                    </div>
                    
                    <div style="background:#fff8e1; border-left:4px solid #c8a415; border-radius:0 8px 8px 0; padding:12px 16px; margin-bottom:24px;">
                      <p style="color:#856404; font-size:13px; margin:0; line-height:1.5;">
                        ⏱️ รหัส OTP นี้จะหมดอายุใน <strong>10 นาที</strong><br>
                        🔒 หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8f9fa; padding:20px 24px; border-top:1px solid #eee; text-align:center;">
                    <p style="color:#999; font-size:12px; margin:0;">© ${new Date().getFullYear()} CP KKU Admission Chatbot</p>
                    <p style="color:#bbb; font-size:11px; margin:4px 0 0;">วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
  `;

  // Use Resend if API key is provided
  if (process.env.RESEND_API_KEY) {
    return new Promise((resolve, reject) => {
      // By default, free tier uses onboarding@resend.dev and can only send to your own registered email.
      // If you added a domain in Resend, you can change this to your domain (e.g., info@yourdomain.com)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      
      const payload = JSON.stringify({
        from: `"CP KKU Chatbot" <${fromEmail}>`,
        to: [toEmail],
        subject: subject,
        html: htmlContent
      });

      const options = {
        hostname: "api.resend.com",
        port: 443,
        path: "/emails",
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => { responseBody += chunk; });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(responseBody));
          } else {
            reject(new Error(`Resend API Error: ${res.statusCode} ${responseBody}`));
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.write(payload);
      req.end();
    });
  }

  // Fallback to Nodemailer SMTP
  const mailOptions = {
    from: `"CP KKU Chatbot" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };

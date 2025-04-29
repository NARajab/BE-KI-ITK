const verificationMail = ({ fullname, verificationLink }) => {
  return `
      <html>
        <head>
          <style>
            .email-container {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              padding: 20px;
              border-radius: 10px;
              max-width: 600px;
              margin: 0 auto;
            }
            .email-header {
              text-align: center;
              padding-bottom: 20px;
            }
            .email-content {
              background-color: #fff;
              padding: 20px;
              border-radius: 10px;
            }
            .email-button {
              display: block;
              width: 200px;
              margin: 20px auto;
              padding: 10px 0;
              background-color: #007bff;
              color: #fff;
              text-align: center;
              border-radius: 5px;
              text-decoration: none;
            }
            .email-footer {
              text-align: center;
              font-size: 12px;
              color: #888;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h2>Verify Your Account</h2>
            </div>
            <div class="email-content">
              <p>Halo ${fullname},</p>
              <p>Thank you for registering. Please click the button below to verify your account:</p>
              <a href="${verificationLink}" class="email-button">Verify Account</a>
              <p>If you did not register, please ignore this email.</p>
              <p>Thank you,</p>
              <p>Support Team</p>
            </div>
            <div class="email-footer">
              <p>&copy; 2025 KI-ITK. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
};

module.exports = verificationMail;

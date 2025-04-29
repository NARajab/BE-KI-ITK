const resetPasswordMail = ({ fullname, resetUrl }) => {
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
                <h2>Reset Password</h2>
              </div>
              <div class="email-content">
                <p>Halo ${fullname},</p>
                <p>Anda telah meminta untuk mengatur ulang kata sandi Anda. Klik tombol di bawah ini untuk mengatur ulang kata sandi Anda:</p>
                <a href="${resetUrl}" class="email-button">Atur Ulang Kata Sandi</a>
                <p>Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini.</p>
                <p><b>Catatan:</b> Email ini hanya berlaku selama 1 jam.</p>
                <p>Terima kasih,</p>
                <p>Tim Support</p>
              </div>
              <div class="email-footer">
                <p>&copy; 2025 KI-ITK. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
    `;
};

module.exports = resetPasswordMail;

const helpCenterMailAdmin = ({ fullname, message }) => {
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
              <h2>Pusat Bantuan</h2>
            </div>
            <div class="email-content">
              <p>Halo <strong>${fullname}</strong>,</p>
              <p>Terima kasih telah menghubungi Pusat Bantuan KI-ITK.</p>
              <p>Berikut ini adalah respon dari admin terkait pertanyaan atau laporan Anda:</p>
              <blockquote style="margin: 20px 0; padding: 10px; background-color: #f0f0f0; border-left: 4px solid #007bff;">
                ${message}
              </blockquote>
              <p>Terima kasih atas perhatian dan kerja sama Anda.</p>
            </div>
            <div class="email-footer">
              <p>&copy; ${new Date().getFullYear()} KI-ITK. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
};

module.exports = helpCenterMailAdmin;

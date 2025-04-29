const patentSubmissionMail = ({ fullname, email }) => {
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
              <h2>Pengajuan Patent Baru</h2>
            </div>
            <div class="email-content">
              <p><strong>Pengguna:</strong> ${fullname} (${email})</p>
              <p>Pengguna telah membuat pengajuan Patent baru dan perlu ditinjau oleh admin.</p>
              <p>Terima kasih,</p>
            </div>
            <div class="email-footer">
              <p>&copy; ${new Date().getFullYear()} KI-ITK. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
};

module.exports = patentSubmissionMail;

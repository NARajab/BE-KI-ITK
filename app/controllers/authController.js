const welcome = (req, res) => {
  res.status(200).type("text/html").send(`
    <html>
      <head>
        <style>
          body {
            background-color: #001529; /* Darker Navy Blue */
            color: #ffffff; /* White */
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
          }

          div {
            margin-bottom: 20px;
          }

          strong {
            font-size: 1.2em;
          }

          p {
            margin: 0;
            line-height: 1.5;
          }

          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007BFF; /* Button Blue */
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s;
          }

          .button:hover {
            background-color: #0056b3; /* Darker Button Blue on hover */
          }
        </style>
      </head>
      <body>
        <div>
          <strong>Status:</strong> Success
        </div>
        <div>
          <strong>Message:</strong>
          <p>Selamat datang di API Aplikasi Belajar</p>
          <p>Untuk menggunakan API silahkan klik tombol dibawah:</p>
          <a href="https://backend-production-f9e7.up.railway.app/api-docs" class="button">Klik disini</a>
        </div>
      </body>
    </html>
  `);
};

module.exports = { welcome };

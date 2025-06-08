const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const ApiError = require("../utils/apiError");
const errorHandler = require("./controllers/errorController");
const router = require("./routes");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(morgan("dev"));
app.use(router);

app.get("/", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Welcome</title>
      <style>
        /* Dark theme background & text */
        body {
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #121212;
          color: #eee;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container {
          text-align: center;
          padding: 40px 60px;
          border-radius: 12px;
          background: linear-gradient(145deg, #1f1f1f, #2c2c2c);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
          max-width: 650px;
          width: 100%;
        }

        h1 {
          font-size: 2.8rem;
          margin-bottom: 10px;
          letter-spacing: 1.2px;
        }

        p {
          font-size: 1.2rem;
          color: #bbb;
        }

        /* subtle glowing effect */
        h1 {
          text-shadow: 0 0 8px #0af, 0 0 20px #08f;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to Backend App Central KI-ITK</h1>
        <p>Your backend is up and running!</p>
      </div>
    </body>
    </html>
  `);
});

app.all("*any", (req, res, next) => {
  next(new ApiError("Routes does not exist", 404));
});

app.use(errorHandler);

module.exports = app;

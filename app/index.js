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

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.use(router);

app.all("/{*any}", (req, res, next) => {
  next(new ApiError("Routes does not exist", 404));
});

app.use(errorHandler);

module.exports = app;

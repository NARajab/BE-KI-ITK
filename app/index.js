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
  res.status(200).json({
    status: "success",
    message: "Success connected",
  });
});

app.all("*any", (req, res, next) => {
  next(new ApiError("Routes does not exist", 404));
});

app.use(errorHandler);

module.exports = app;

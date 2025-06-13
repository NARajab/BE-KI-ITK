"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Faqs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Faqs.init(
    {
      type: DataTypes.STRING,
      question: DataTypes.TEXT,
      answer: DataTypes.TEXT,
      process: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Faqs",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Faqs;
};

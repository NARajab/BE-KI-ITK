"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class HelpCenters extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  HelpCenters.init(
    {
      email: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      problem: DataTypes.STRING,
      message: DataTypes.TEXT,
      answer: DataTypes.TEXT,
      document: DataTypes.STRING,
      status: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "HelpCenters",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return HelpCenters;
};

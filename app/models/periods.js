"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Periods extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Periods.init(
    {
      group: DataTypes.STRING,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      year: DataTypes.STRING,
      patentQuota: DataTypes.INTEGER,
      remainingPatentQuota: DataTypes.INTEGER,
      copyrightQuota: DataTypes.INTEGER,
      remainingCopyrightQuota: DataTypes.INTEGER,
      industrialDesignQuota: DataTypes.INTEGER,
      remainingIndustrialDesignQuota: DataTypes.INTEGER,
      brandQuota: DataTypes.INTEGER,
      remainingBrandQuota: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Periods",
    }
  );
  return Periods;
};

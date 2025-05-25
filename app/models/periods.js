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
      Periods.hasMany(models.Submissions, {
        foreignKey: "periodId",
        as: "submission",
      });
      Periods.hasMany(models.Groups, {
        foreignKey: "periodId",
        as: "group",
      });
    }
  }
  Periods.init(
    {
      year: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Periods",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Periods;
};

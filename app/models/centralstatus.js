"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CentralStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CentralStatus.hasOne(models.UserSubmissions, {
        foreignKey: "centralStatusId",
        as: "userSubmission",
      });
    }
  }
  CentralStatus.init(
    {
      name: DataTypes.STRING,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CentralStatus",
      tableName: "CentralStatus",
    }
  );
  return CentralStatus;
};

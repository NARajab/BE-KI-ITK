"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Quotas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Quotas.belongsTo(models.Groups, {
        foreignKey: "groupId",
        as: "group",
      });
    }
  }
  Quotas.init(
    {
      groupId: DataTypes.INTEGER,
      title: DataTypes.INTEGER,
      quota: { type: DataTypes.INTEGER, defaultValue: 0 },
      remainingQuota: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "Quotas",
    }
  );
  return Quotas;
};

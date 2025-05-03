"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ActivityLogs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ActivityLogs.belongsTo(models.Users, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
  ActivityLogs.init(
    {
      userId: DataTypes.INTEGER,
      action: DataTypes.STRING,
      description: DataTypes.STRING,
      device: DataTypes.STRING,
      ip_address: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "ActivityLogs",
    }
  );
  return ActivityLogs;
};

"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserSubmissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UserSubmissions.belongsTo(models.Submissions, {
        foreignKey: "submissionId",
        as: "submission",
      });
      UserSubmissions.belongsTo(models.Users, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
  UserSubmissions.init(
    {
      userId: DataTypes.INTEGER,
      submissionId: DataTypes.INTEGER,
      centralStatus: DataTypes.STRING,
      reviewStatus: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "UserSubmissions",
    }
  );
  return UserSubmissions;
};

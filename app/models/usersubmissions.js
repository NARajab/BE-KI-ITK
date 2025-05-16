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
      UserSubmissions.belongsTo(models.Users, {
        foreignKey: "reviewerId",
        as: "reviewer",
      });
      UserSubmissions.hasMany(models.Progresses, {
        foreignKey: "userSubmissionId",
        as: "progress",
      });
    }
  }
  UserSubmissions.init(
    {
      userId: DataTypes.INTEGER,
      reviewerId: DataTypes.INTEGER,
      submissionId: DataTypes.INTEGER,
      centralStatus: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "UserSubmissions",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return UserSubmissions;
};

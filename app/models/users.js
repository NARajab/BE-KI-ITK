"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Users.hasMany(models.UserSubmissions, {
        foreignKey: "userId",
        as: "userSubmissions",
      });
      Users.hasMany(models.ActivityLogs, {
        foreignKey: "userId",
        as: "activityLogs",
      });
    }
  }
  Users.init(
    {
      firebase_uid: DataTypes.STRING,
      email: DataTypes.STRING,
      fullname: DataTypes.STRING,
      image: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      faculty: DataTypes.STRING,
      studyProgram: DataTypes.STRING,
      institution: DataTypes.STRING,
      isVerified: DataTypes.BOOLEAN,
      role: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Users",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Users;
};

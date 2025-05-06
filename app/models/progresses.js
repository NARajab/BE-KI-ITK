"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Progresses extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Progresses.belongsTo(models.UserSubmissions, {
        foreignKey: "userSubmissionId",
        as: "userSubmission",
      });

      Progresses.hasMany(models.RevisionFiles, {
        foreignKey: "progressId",
        as: "revisionFile",
      });
    }
  }
  Progresses.init(
    {
      userSubmissionId: DataTypes.INTEGER,
      status: DataTypes.STRING,
      comment: DataTypes.TEXT,
      createdBy: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Progresses",
    }
  );
  return Progresses;
};

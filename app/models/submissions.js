"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Submissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Submissions.hasMany(models.UserSubmissions, {
        foreignKey: "submissionId",
        as: "userSubmissions",
      });

      Submissions.belongsTo(models.Periods, {
        foreignKey: "periodId",
        as: "period",
      });

      Submissions.belongsToMany(models.TermsConditions, {
        through: "SubmissionTerms",
        foreignKey: "submissionId",
        as: "termsConditions",
      });

      Submissions.hasMany(models.PersonalDatas, {
        foreignKey: "submissionId",
        as: "personalDatas",
      });

      Submissions.belongsTo(models.Copyrights, {
        foreignKey: "copyrightId",
        as: "copyright",
      });

      Submissions.belongsTo(models.Patents, {
        foreignKey: "patentId",
        as: "patent",
      });

      Submissions.belongsTo(models.Brands, {
        foreignKey: "brandId",
        as: "brand",
      });

      Submissions.belongsTo(models.IndustrialDesigns, {
        foreignKey: "industrialDesignId",
        as: "industrialDesign",
      });

      Submissions.belongsTo(models.SubmissionTypes, {
        foreignKey: "submissionTypeId",
        as: "submissionType",
      });
    }
  }
  Submissions.init(
    {
      submissionTypeId: DataTypes.INTEGER,
      patentId: DataTypes.INTEGER,
      copyrightId: DataTypes.INTEGER,
      industrialDesignId: DataTypes.INTEGER,
      brandId: DataTypes.INTEGER,
      periodId: DataTypes.INTEGER,
      comments: DataTypes.TEXT,
      submissionScheme: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Submissions",
    }
  );
  return Submissions;
};

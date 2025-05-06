"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SubmissionTerms extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SubmissionTerms.belongsTo(models.Submissions, {
        foreignKey: "submissionId",
        as: "submission",
      });
      SubmissionTerms.belongsTo(models.TermsConditions, {
        foreignKey: "termsConditionId",
        as: "termsCondition",
      });
    }
  }
  SubmissionTerms.init(
    {
      submissionId: DataTypes.INTEGER,
      termsConditionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SubmissionTerms",
    }
  );
  return SubmissionTerms;
};

"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Patents extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Patents.hasOne(models.Submissions, {
        foreignKey: "patentId",
        as: "submission",
      });
      Patents.belongsTo(models.PatentTypes, {
        foreignKey: "patentTypeId",
        as: "patentType",
      });
    }
  }
  Patents.init(
    {
      draftPatentApplicationFile: DataTypes.STRING,
      entirePatentDocument: DataTypes.STRING,
      inventionTitle: DataTypes.STRING,
      patentTypeId: DataTypes.INTEGER,
      numberClaims: DataTypes.STRING,
      description: DataTypes.STRING,
      abstract: DataTypes.STRING,
      claim: DataTypes.STRING,
      inventionImage: DataTypes.STRING,
      statementInventionOwnership: DataTypes.STRING,
      letterTransferRightsInvention: DataTypes.STRING,
      letterPassedReviewStage: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Patents",
    }
  );
  return Patents;
};

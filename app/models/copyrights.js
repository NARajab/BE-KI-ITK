"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Copyrights extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Copyrights.hasOne(models.Submissions, {
        foreignKey: "copyrightId",
        as: "submission",
      });
      Copyrights.belongsTo(models.TypeCreations, {
        foreignKey: "typeCreationId",
        as: "typeCreation",
      });

      Copyrights.belongsTo(models.SubTypeCreations, {
        foreignKey: "subTypeCreationId",
        as: "subTypeCreation",
      });
    }
  }
  Copyrights.init(
    {
      titleInvention: DataTypes.STRING,
      typeCreationId: DataTypes.INTEGER,
      subTypeCreationId: DataTypes.INTEGER,
      countryFirstAnnounced: DataTypes.STRING,
      cityFirstAnnounced: DataTypes.STRING,
      timeFirstAnnounced: DataTypes.STRING,
      briefDescriptionCreation: DataTypes.TEXT,
      statementLetter: DataTypes.STRING,
      letterTransferCopyright: DataTypes.STRING,
      exampleCreation: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Copyrights",
    }
  );
  return Copyrights;
};

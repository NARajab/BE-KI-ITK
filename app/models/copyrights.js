'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Copyrights extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Copyrights.init({
    titleInvention: DataTypes.STRING,
    typeCreation: DataTypes.STRING,
    subTypeCreation: DataTypes.STRING,
    countryFirstAnnounced: DataTypes.STRING,
    cityFirstAnnounced: DataTypes.STRING,
    timeFirstAnnounced: DataTypes.STRING,
    briefDescriptionCreation: DataTypes.TEXT,
    statementLetter: DataTypes.STRING,
    letterTransferCopyright: DataTypes.STRING,
    exampleCreation: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Copyrights',
  });
  return Copyrights;
};
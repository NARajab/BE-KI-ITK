'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class IndustrialDesigns extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  IndustrialDesigns.init({
    titleDesign: DataTypes.STRING,
    type: DataTypes.STRING,
    typeDesign: DataTypes.STRING,
    subtypeDesign: DataTypes.STRING,
    claim: DataTypes.STRING,
    looksPerspective: DataTypes.STRING,
    frontView: DataTypes.STRING,
    backView: DataTypes.STRING,
    rightSideView: DataTypes.STRING,
    lefttSideView: DataTypes.STRING,
    topView: DataTypes.STRING,
    downView: DataTypes.STRING,
    moreImages: DataTypes.STRING,
    letterTransferDesignRights: DataTypes.STRING,
    designOwnershipLetter: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'IndustrialDesigns',
  });
  return IndustrialDesigns;
};
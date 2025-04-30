'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Quotas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Quotas.init({
    groupId: DataTypes.INTEGER,
    copyrightQuota: DataTypes.INTEGER,
    remainingCopyrightQuota: DataTypes.INTEGER,
    patentQuota: DataTypes.INTEGER,
    remainingPatentQuota: DataTypes.INTEGER,
    industrialDesignQuota: DataTypes.INTEGER,
    remainingIndustrialDesignQuota: DataTypes.INTEGER,
    brandQuota: DataTypes.INTEGER,
    remainingBrandQuota: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Quotas',
  });
  return Quotas;
};
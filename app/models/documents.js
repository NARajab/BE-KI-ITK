'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Documents extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Documents.init({
    submissionTypeId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    document: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Documents',
  });
  return Documents;
};
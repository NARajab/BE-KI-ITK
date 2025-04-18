'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Submissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Submissions.init({
    submissionTypeId: DataTypes.INTEGER,
    patentId: DataTypes.INTEGER,
    copyrightId: DataTypes.INTEGER,
    industrialDesignId: DataTypes.INTEGER,
    brandId: DataTypes.INTEGER,
    periodId: DataTypes.INTEGER,
    comments: DataTypes.TEXT,
    submissionScheme: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Submissions',
  });
  return Submissions;
};
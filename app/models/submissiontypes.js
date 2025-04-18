'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubmissionTypes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SubmissionTypes.init({
    title: DataTypes.STRING,
    isPublish: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'SubmissionTypes',
  });
  return SubmissionTypes;
};
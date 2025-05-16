"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PatentTypes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  PatentTypes.init(
    {
      title: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "PatentTypes",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return PatentTypes;
};

"use strict";
const { Model } = require("sequelize");
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
  Documents.init(
    {
      type: DataTypes.STRING,
      title: DataTypes.STRING,
      document: DataTypes.STRING,
      cover: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Documents",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Documents;
};

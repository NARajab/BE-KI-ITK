"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AdditionalDatas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AdditionalDatas.belongsTo(models.Brands, {
        foreignKey: "brandId",
        as: "brands",
      });
    }
  }
  AdditionalDatas.init(
    {
      brandId: DataTypes.INTEGER,
      fileName: DataTypes.STRING,
      size: DataTypes.STRING,
      description: DataTypes.TEXT,
      file: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "AdditionalDatas",
    }
  );
  return AdditionalDatas;
};

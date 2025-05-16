"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Brands extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Brands.hasOne(models.Submissions, {
        foreignKey: "brandId",
        as: "submission",
      });

      Brands.hasMany(models.AdditionalDatas, {
        foreignKey: "brandId",
        as: "additionalDatas",
      });
    }
  }
  Brands.init(
    {
      applicationType: DataTypes.STRING,
      brandTypeId: DataTypes.INTEGER,
      referenceName: DataTypes.STRING,
      elementColor: DataTypes.STRING,
      translate: DataTypes.STRING,
      pronunciation: DataTypes.STRING,
      disclaimer: DataTypes.STRING,
      description: DataTypes.STRING,
      documentType: DataTypes.STRING,
      information: DataTypes.STRING,
      labelBrand: DataTypes.STRING,
      fileUploade: DataTypes.STRING,
      signature: DataTypes.STRING,
      InformationLetter: DataTypes.STRING,
      letterStatment: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Brands",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Brands;
};

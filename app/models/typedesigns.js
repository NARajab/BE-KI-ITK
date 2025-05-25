"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TypeDesigns extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TypeDesigns.hasOne(models.IndustrialDesigns, {
        foreignKey: "typeDesignId",
        as: "industrialDesign",
      });
      TypeDesigns.hasMany(models.SubTypeDesigns, {
        foreignKey: "typeDesignId",
        as: "subTypeDesign",
      });
    }
  }
  TypeDesigns.init(
    {
      title: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "TypeDesigns",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return TypeDesigns;
};

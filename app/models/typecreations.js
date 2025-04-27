"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TypeCreations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TypeCreations.hasOne(models.Copyrights, {
        foreignKey: "typeCreationId",
        as: "copyright",
      });
      TypeCreations.hasMany(models.SubTypeCreations, {
        foreignKey: "typeCreationId",
        as: "subTypeCreation",
      });
    }
  }
  TypeCreations.init(
    {
      title: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "TypeCreations",
    }
  );
  return TypeCreations;
};

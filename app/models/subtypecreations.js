"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SubTypeCreations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SubTypeCreations.belongsTo(models.TypeCreations, {
        foreignKey: "typeCreationId",
        as: "typeCreation",
      });
    }
  }
  SubTypeCreations.init(
    {
      title: DataTypes.STRING,
      typeCreationId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SubTypeCreations",
    }
  );
  return SubTypeCreations;
};

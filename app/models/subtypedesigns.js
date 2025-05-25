"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SubTypeDesigns extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SubTypeDesigns.belongsTo(models.TypeDesigns, {
        foreignKey: "typeDesignId",
        as: "typeDesign",
      });
    }
  }
  SubTypeDesigns.init(
    {
      title: DataTypes.STRING,
      typeDesignId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SubTypeDesigns",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return SubTypeDesigns;
};

"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RevisionFiles extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RevisionFiles.belongsTo(models.Progresses, {
        foreignKey: "progressId",
        as: "progress",
      });
    }
  }
  RevisionFiles.init(
    {
      progressId: DataTypes.INTEGER,
      fileName: DataTypes.STRING,
      file: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "RevisionFiles",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return RevisionFiles;
};

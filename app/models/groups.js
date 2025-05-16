"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Groups extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Groups.belongsTo(models.Periods, {
        foreignKey: "periodId",
        as: "period",
      });
      Groups.hasMany(models.Quotas, {
        foreignKey: "groupId",
        as: "quota",
      });
      Groups.hasMany(models.Submissions, {
        foreignKey: "groupId",
        as: "submissions",
      });
    }
  }
  Groups.init(
    {
      periodId: DataTypes.INTEGER,
      group: DataTypes.STRING,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Groups",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Groups;
};

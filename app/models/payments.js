"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Payments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Payments.belongsTo(models.Submissions, {
        foreignKey: "submissionId",
        as: "submission",
      });
    }
  }
  Payments.init(
    {
      userId: DataTypes.INTEGER,
      submissionId: DataTypes.INTEGER,
      billingCode: DataTypes.STRING,
      proofPayment: DataTypes.STRING,
      paymentStatus: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Payments",
      paranoid: true,
      deletedAt: "deletedAt",
      timestamps: true,
    }
  );
  return Payments;
};

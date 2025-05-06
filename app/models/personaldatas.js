"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PersonalDatas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PersonalDatas.belongsTo(models.Submissions, {
        foreignKey: "submissionId",
        as: "submission",
      });
    }
  }
  PersonalDatas.init(
    {
      submissionId: DataTypes.INTEGER,
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      institution: DataTypes.STRING,
      work: DataTypes.STRING,
      nationalState: DataTypes.STRING,
      countryResidence: DataTypes.STRING,
      province: DataTypes.STRING,
      city: DataTypes.STRING,
      subdistrict: DataTypes.STRING,
      ward: DataTypes.STRING,
      postalCode: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      address: DataTypes.TEXT,
      ktp: DataTypes.STRING,
      isLeader: DataTypes.BOOLEAN,
      facebook: DataTypes.STRING,
      whatsapp: DataTypes.STRING,
      instagram: DataTypes.STRING,
      twitter: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "PersonalDatas",
    }
  );
  return PersonalDatas;
};

"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Brands", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      applicationType: {
        type: Sequelize.STRING,
      },
      brandTypeId: {
        type: Sequelize.INTEGER,
      },
      referenceName: {
        type: Sequelize.STRING,
      },
      elementColor: {
        type: Sequelize.STRING,
      },
      translate: {
        type: Sequelize.STRING,
      },
      pronunciation: {
        type: Sequelize.STRING,
      },
      disclaimer: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.STRING,
      },
      documentType: {
        type: Sequelize.STRING,
      },
      information: {
        type: Sequelize.STRING,
      },
      labelBrand: {
        type: Sequelize.STRING,
      },
      fileUploade: {
        type: Sequelize.STRING,
      },
      signature: {
        type: Sequelize.STRING,
      },
      InformationLetter: {
        type: Sequelize.STRING,
      },
      letterStatment: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Brands");
  },
};

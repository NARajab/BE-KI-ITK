"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("IndustrialDesigns", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      titleDesign: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.STRING,
      },
      typeDesignId: {
        type: Sequelize.INTEGER,
      },
      subtypeDesignId: {
        type: Sequelize.INTEGER,
      },
      claim: {
        type: Sequelize.STRING,
      },
      looksPerspective: {
        type: Sequelize.STRING,
      },
      frontView: {
        type: Sequelize.STRING,
      },
      backView: {
        type: Sequelize.STRING,
      },
      rightSideView: {
        type: Sequelize.STRING,
      },
      lefttSideView: {
        type: Sequelize.STRING,
      },
      topView: {
        type: Sequelize.STRING,
      },
      downView: {
        type: Sequelize.STRING,
      },
      moreImages: {
        type: Sequelize.STRING,
      },
      letterTransferDesignRights: {
        type: Sequelize.STRING,
      },
      designOwnershipLetter: {
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
    await queryInterface.dropTable("IndustrialDesigns");
  },
};

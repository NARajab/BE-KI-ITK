'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Patents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      draftPatentApplicationFile: {
        type: Sequelize.STRING
      },
      entirePatentDocument: {
        type: Sequelize.STRING
      },
      inventionTitle: {
        type: Sequelize.STRING
      },
      patentType: {
        type: Sequelize.STRING
      },
      numberClaims: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      abstract: {
        type: Sequelize.STRING
      },
      claim: {
        type: Sequelize.STRING
      },
      inventionImage: {
        type: Sequelize.STRING
      },
      statementInventionOwnership: {
        type: Sequelize.STRING
      },
      letterTransferRightsInvention: {
        type: Sequelize.STRING
      },
      letterPassedReviewStage: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Patents');
  }
};
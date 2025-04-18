'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Copyrights', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      titleInvention: {
        type: Sequelize.STRING
      },
      typeCreation: {
        type: Sequelize.STRING
      },
      subTypeCreation: {
        type: Sequelize.STRING
      },
      countryFirstAnnounced: {
        type: Sequelize.STRING
      },
      cityFirstAnnounced: {
        type: Sequelize.STRING
      },
      timeFirstAnnounced: {
        type: Sequelize.STRING
      },
      briefDescriptionCreation: {
        type: Sequelize.TEXT
      },
      statementLetter: {
        type: Sequelize.STRING
      },
      letterTransferCopyright: {
        type: Sequelize.STRING
      },
      exampleCreation: {
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
    await queryInterface.dropTable('Copyrights');
  }
};
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Submissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      submissionTypeId: {
        type: Sequelize.INTEGER
      },
      patentId: {
        type: Sequelize.INTEGER
      },
      copyrightId: {
        type: Sequelize.INTEGER
      },
      industrialDesignId: {
        type: Sequelize.INTEGER
      },
      brandId: {
        type: Sequelize.INTEGER
      },
      periodId: {
        type: Sequelize.INTEGER
      },
      comments: {
        type: Sequelize.TEXT
      },
      submissionScheme: {
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
    await queryInterface.dropTable('Submissions');
  }
};
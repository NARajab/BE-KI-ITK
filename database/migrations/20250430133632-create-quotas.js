'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Quotas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      groupId: {
        type: Sequelize.INTEGER
      },
      copyrightQuota: {
        type: Sequelize.INTEGER
      },
      remainingCopyrightQuota: {
        type: Sequelize.INTEGER
      },
      patentQuota: {
        type: Sequelize.INTEGER
      },
      remainingPatentQuota: {
        type: Sequelize.INTEGER
      },
      industrialDesignQuota: {
        type: Sequelize.INTEGER
      },
      remainingIndustrialDesignQuota: {
        type: Sequelize.INTEGER
      },
      brandQuota: {
        type: Sequelize.INTEGER
      },
      remainingBrandQuota: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('Quotas');
  }
};
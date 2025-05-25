"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("UserSubmissions", "reviewStatus");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("UserSubmissions", "reviewStatus", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

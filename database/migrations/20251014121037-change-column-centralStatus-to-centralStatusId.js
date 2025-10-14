"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("UserSubmissions", "centralStatus");
    await queryInterface.addColumn("UserSubmissions", "centralStatusId", {
      type: Sequelize.INTEGER(Sequelize.INTEGER),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("UserSubmissions", "centralStatusId");
    await queryInterface.addColumn("UserSubmissions", "centralStatus", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};

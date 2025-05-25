"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Payments", "billingCode", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Payments", "proofPayment", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Payments", "billingCode");
    await queryInterface.removeColumn("Payments", "proofPayment");
  },
};

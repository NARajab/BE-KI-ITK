"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("IndustrialDesigns", "claim");
    await queryInterface.addColumn("IndustrialDesigns", "claim", {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("IndustrialDesigns", "claim");
    await queryInterface.addColumn("IndustrialDesigns", "claim", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};

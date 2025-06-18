"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Faqs", "question", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn("Faqs", "answer", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Faqs", "question", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("Faqs", "answer", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

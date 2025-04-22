"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("SubmissionTypes", [
      {
        title: "Hak Cipta",
        isPublish: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Paten",
        isPublish: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Merek",
        isPublish: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Desain Industri",
        isPublish: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("SubmisionTypes", null, {});
  },
};

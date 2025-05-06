"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "RevisionFiles",
      "submissionId",
      "progressId"
    );

    await queryInterface.addColumn("Progresses", "comment", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "RevisionFiles",
      "progressId",
      "submissionId"
    );

    await queryInterface.removeColumn("Progresses", "comment");
  },
};

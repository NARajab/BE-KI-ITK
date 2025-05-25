"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Submissions", "groupId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("Documents", "cover", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.removeColumn("Submissions", "comments");

    await queryInterface.addColumn("PersonalDatas", "faculty", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("PersonalDatas", "studyProgram", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Submissions", "groupId");

    await queryInterface.removeColumn("Documents", "cover");

    await queryInterface.addColumn("Submissions", "comments", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.removeColumn("PersonalDatas", "faculty");

    await queryInterface.removeColumn("PersonalDatas", "studyProgram");
  },
};

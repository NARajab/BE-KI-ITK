"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      "Users",
      "Periods",
      "Groups",
      "Quotas",
      "UserSubmissions",
      "Submissions",
      "PersonalDatas",
      "Copyrights",
      "Patents",
      "IndustrialDesigns",
      "Brands",
      "Progresses",
      "PatentTypes",
      "BrandTypes",
      "TypeCreations",
      "SubTypeCreations",
      "TypeDesigns",
      "SubTypeDesigns",
      "Documents",
      "SubmissionTerms",
      "TermsConditions",
      "Payments",
      "Faqs",
      "Notifications",
      "RevisionFiles",
      "AdditionalDatas",
      "SubmissionTypes",
      "HelpCenters",
      "ActivityLogs",
    ];

    for (const table of tables) {
      await queryInterface.addColumn(table, "deletedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = [
      "Users",
      "Periods",
      "Groups",
      "Quotas",
      "UserSubmissions",
      "Submissions",
      "PersonalDatas",
      "Copyrights",
      "Patents",
      "IndustrialDesigns",
      "Brands",
      "Progresses",
      "PatentTypes",
      "BrandTypes",
      "TypeCreations",
      "SubTypeCreations",
      "TypeDesigns",
      "SubTypeDesigns",
      "Documents",
      "SubmissionTerms",
      "TermsConditions",
      "Payments",
      "Faqs",
      "Notifications",
      "RevisionFiles",
      "AdditionalDatas",
      "SubmissionTypes",
      "HelpCenters",
      "ActivityLogs",
    ];

    for (const table of tables) {
      await queryInterface.removeColumn(table, "deletedAt");
    }
  },
};

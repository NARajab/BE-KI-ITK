'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PersonalDatas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      submissionId: {
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      institution: {
        type: Sequelize.STRING
      },
      work: {
        type: Sequelize.STRING
      },
      nationalState: {
        type: Sequelize.STRING
      },
      countryResidence: {
        type: Sequelize.STRING
      },
      province: {
        type: Sequelize.STRING
      },
      city: {
        type: Sequelize.STRING
      },
      subdistrict: {
        type: Sequelize.STRING
      },
      ward: {
        type: Sequelize.STRING
      },
      postalCode: {
        type: Sequelize.STRING
      },
      phoneNumber: {
        type: Sequelize.STRING
      },
      ktp: {
        type: Sequelize.STRING
      },
      isLeader: {
        type: Sequelize.BOOLEAN
      },
      facebook: {
        type: Sequelize.STRING
      },
      whatsapp: {
        type: Sequelize.STRING
      },
      instagram: {
        type: Sequelize.STRING
      },
      twitter: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('PersonalDatas');
  }
};
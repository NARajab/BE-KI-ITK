"use strict";

const bcrypt = require("bcrypt");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const superAdminPassword = process.env.PASSWORD_HASH_SUPERADMIN;
    const adminPassword = process.env.PASSWORD_HASH_ADMIN;
    const saltRounds = 10;
    const hashedPasswordSuperAdmin = bcrypt.hashSync(
      superAdminPassword,
      saltRounds
    );
    const hashedPasswordAdmin = bcrypt.hashSync(adminPassword, saltRounds);

    await queryInterface.bulkInsert("Users", [
      {
        fullname: "Super Admin",
        email: "user@superadmin.com",
        password: hashedPasswordSuperAdmin,
        role: "superAdmin",
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullname: "Admin",
        email: "user@admin.com",
        password: hashedPasswordAdmin,
        role: "admin",
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", null, {});
  },
};

const admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const client = new OAuth2Client(process.env.CLIENT_ID);

module.exports = { admin };

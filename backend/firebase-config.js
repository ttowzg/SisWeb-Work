const admin = require('firebase-admin');

// TODO: Download your Firebase service account key JSON file and
// save it in the 'backend' directory. Replace 'path/to/your/serviceAccountKey.json'
// with the actual path to the file.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
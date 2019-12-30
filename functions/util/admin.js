// Firebase admin and API key imports

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://monkeytime-9a89a.firebaseio.com',
  storageBucket: 'monkeytime-9a89a.appspot.com',
});

const db = admin.firestore();

module.exports = {admin, db};


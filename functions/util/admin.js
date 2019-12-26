// Firebase admin and API key imports 

let admin = require('firebase-admin');
let serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://monkeytime-9a89a.firebaseio.com',
  });

const db = admin.firestore();

module.exports = {admin, db};


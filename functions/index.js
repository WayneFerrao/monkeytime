/* eslint-disable one-var */
const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const {db} = require('./util/admin');

const {
  getAllShouts,
  postAShout,
  getAShout,
  commentOnShout,
  likeShout,
  unlikeShout,
  deleteShout,
} = require('./handlers/shouts');

const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require('./handlers/users');

// Express allows us to use the same endpoint name,'shouts', but handle 2 endpoints; GET, POST etc.
// Without express, you'd have to check whether we're doing POST or GET and respond accordingly.
// The first param is name of route and 2nd is the handler.
// These function access the same endpoint name, but with different request types.

// In any route with FBAuth as middleware, before we even enter code block, we've been authenticated

app.get('/shouts', getAllShouts);
app.post('/shout', FBAuth, postAShout);// Post 1 shout
app.get('/shout/:shoutId', getAShout); // :shoutID is a route param
app.post('/shout/:shoutId/comment', FBAuth, commentOnShout);
app.delete('/shout/:shoutId/', FBAuth, deleteShout);
app.get('/shout/:shoutId/like', FBAuth, likeShout);
app.get('/shout/:shoutId/unlike', FBAuth, unlikeShout);


// Users routes
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage); // Protected route so we need middleware
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);


exports.createNotificationOnLike = functions.region('us-central1').firestore.document('likes/{id}')
// .onCreate is ran whenever a document is created represented by snapshot
    .onCreate((snapshot) =>{
      // Need the data from the shout, which is extracted from the snapshot data
      db.doc(`/shouts/${snapshot.data().shoutId}`).get()
          .then((doc) =>{ // doc refers to this shout that was fetched
            if (doc.exists) {
              // Rmb that set creates document
              return db.doc(`/notifications/${snapshot.id}`).set({// Notif ID = like/comment ID
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                shoutId: doc.id,
              });
            }
          })
          .then(() => {
            return;
          })
          .catch( (err) => {
            console.error(err);
            return; // Don't need to send back a res bc this is a db trigger, not an API endpoint.
          });
    });

exports.deleteNotificationonUnlike = functions.region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete((snapshot) =>{
      db.doc(`/notifications/${snapshot.id}`)
          .delete()
          .then(()=>{
            return;
          })
          .catch((err) => {
            console.error(err);
            return;
          });
    });

exports.createNotificationOnComment = functions.region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {
      db.doc(`/shouts/${snapshot.data().shoutId}`).get()
          .then((doc) =>{
            if (doc.exists) {
              return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'comment',
                read: false,
                shoutId: doc.id,
              });
            }
          })
          .then(() => {
            return;
          })
          .catch( (err) => {
            console.error(err);
            return;
          });
    });

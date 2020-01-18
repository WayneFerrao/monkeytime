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
app.delete('/shout/:shoutId', FBAuth, deleteShout);
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
      return db.doc(`/shouts/${snapshot.data().shoutId}`).get()
          .then((doc) =>{ // doc refers to this shout that was fetched
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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
          .catch((err) => {
            console.error(err);
            // Don't need to send back a res bc this is a db trigger, not an API endpoint.
          });
    });

exports.deleteNotificationOnUnlike = functions
    .firestore.document('likes/{id}')
    // When a user unlikes a post, that corresponding document is deleted
    .onDelete((snapshot) =>{
      // Delete the notification with the corresponding ID
      return db.doc(`/notifications/${snapshot.id}`)
          .delete()
          .catch((err) => {
            console.error(err);
            return;
          });
    });

exports.createNotificationOnComment = functions
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {
      return db.doc(`/shouts/${snapshot.data().shoutId}`).get()
          .then((doc) =>{
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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
          .catch( (err) => {
            console.error(err);
            return;
          });
    });

exports.onUserImageChange = functions
    .firestore.document('/users/{userId}')// listen to this document
    .onUpdate((change) =>{
      console.log(change.before.data());
      console.log(change.after.data());
      // Change the image on the post that the user created
      if (change.before.data().imageUrl !== change.after.data().imageUrl) {
        console.log('Image has changed');
        const batch = db.batch();
        return db
            .collection('shouts')
            .where('userHandle', '==', change.before.data().handle)
            .get()
            .then((data) => {
              // For each doc that this user created
              data.forEach((doc) => {
                const shout = db.doc(`/shouts/${doc.id}`);
                batch.update(shout, {userImage: change.after.data().imageUrl});
              });
              return batch.commit();
            });
      } else return true;
    });

exports.onShoutDelete = functions
    .firestore.document('/shouts/{shoutId}')
    .onDelete((snapshot, context) => {
      const shoutId = context.params.shoutId;
      const batch = db.batch();
      // Find all comments with this shoutID
      return db.collection('comments').where('shoutId', '==', shoutId).get()
          .then((data) =>{
            data.forEach((doc) => {
              batch.delete(db.doc(`/comments/${doc.id}`));
            });
            // Find all like documents on this shout by fetching those with the shoutID
            return db.collection('likes').where('shoutId', '==', shoutId).get();
          })
          .then((data) => {
            data.forEach((doc) => {
              batch.delete(db.doc(`/likes/${doc.id}`));
            });
            // Find all notif documents for this shout by fetching those with the shoutID
            return db.collection('notifications').where('shoutId', '==', shoutId).get();
          })
          .then((data) => {
            data.forEach((doc) => {
              batch.delete(db.doc(`/notifications/${doc.id}`));
            });
            return batch.commit();
          })
          .catch((err) => {
            console.error(err);
          });
    });

/* eslint-disable one-var */
const functions = require('firebase-functions');
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const {
  getAllShouts,
  postAShout,
  getAShout,
  commentOnShout,
  likeShout,
  unlikeShout,
} = require('./handlers/shouts');

const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
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
// TODO: delete shout
// TODO: like a shout
app.get('/shout/:shoutId/like', FBAuth, likeShout);
app.get('/shout/:shoutId/unlike', FBAuth, unlikeShout);

// TODO: unlike a shout


// Users routes
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage); // Protected route so we need middleware
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);

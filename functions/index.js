/* eslint-disable one-var */
const functions = require('firebase-functions');
const app = require('express')();

const FBAuth = require('./util/fbAuth');  

const { getAllShouts, postAShout } = require('./handlers/shouts');
const {signUp, login, uploadImage} =  require('./handlers/users');

// Express allows us to use the same endpoint name,'shouts', but handle 2 endpoints; GET, POST etc.
// Without express, you'd have to check whether we're doing POST or GET and respond accordingly.
// The first param is name of route and 2nd is the handler
app.get('/shouts', getAllShouts);
// This function also accesses the same endpoint name, but with a POST request.
// In this/any route where we add FBAuth as middleware, before we even enter code block,
// we've already been authenticated
// Post 1 shout
app.post('/shout', FBAuth, postAShout);

// Users routes
app.post('/signup',signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage); //Protected route so we need middleware
exports.api = functions.https.onRequest(app);

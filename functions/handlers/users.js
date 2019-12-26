// This contains the handlers for all the requests to the users route
const { db } = require('../util/admin');
const  firebase = require('firebase');
const config = require('../util/config');
firebase.initializeApp(config);

const  {validateSignUpData, validateLoginData} = require('../util/validators');

exports.signUp = (req, res)=>{
    // Assign the data sent in request body to newUser
    const newUser = {
        email: req.body.email,
        password: req .body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };
    
    const {valid , errors } = validateSignUpData(newUser);
    if(!valid) return res.status(400).json(errors);
    
    let token, userId;
    // Go into users collection and see if there's already a user with
    // the handle just passed in by the request.
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) =>{
            if (doc.exists) {
                // 400 = Bad Request
                return res.status(400)
                // Err's name is handle
                .json({handle: 'This handle is already taken.'});
            } else { // if there's isnt'a  user then create one.
                return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        // this .then is for when the getIdToken comes back/returns
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId,
            };
            // Create new user document in the "users" collection & names it handle that
            // it was passed by the req body. Creates collection if it doesn't exist.
            // Set creates document.
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })// this .then is for when the set function returns
        .then(() =>{
            return res.status(201).json({token});
        })
        .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                // 400 client error/bad request
                return res.status(400).json({email: 'Bruh this email taken'});
            } else {
                res.status(501).json({error: err.code}); // 500 = Server error
            }
        });
}

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    const {valid , errors } = validateLoginData(user);
    if(!valid) return res.status(400).json(errors);

   
    

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({token});
        })
        .catch((err) => {
            console.error(err);
            if (err.code === 'auth/wrong-password') {
                return res.status(403).json({general: 'Wrong credentials, please try again'});
            } else return res.status(500).json({error: err.code});
        });
}
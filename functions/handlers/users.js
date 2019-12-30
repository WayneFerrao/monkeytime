// This contains the handlers for all the requests to the users route
const {db, admin} = require('../util/admin');
const firebase = require('firebase');
const config = require('../util/config');
firebase.initializeApp(config);

const {validateSignUpData, validateLoginData} = require('../util/validators');

exports.signUp = (req, res) => {
  // Assign the data sent in request body to newUser
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const {valid, errors} = validateSignUpData(newUser);
  if (!valid) return res.status(400).json(errors);

  const noImg = 'default-profile.png';

  let token; let userId;
  // Go into users collection and see if there's already a user with
  // the handle just passed in by the request.
  db.doc(`/users/${newUser.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
        // 400 = Bad Request
          return (
            res
                .status(400)
            // Err's name is handle
                .json({handle: 'This handle is already taken.'})
          );
        } else {
        // if there's isnt'a  user then create one.
          return firebase
              .auth()
              .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
      })
      .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
      }) // this .then is for when the getIdToken comes back/returns
      .then((idToken) => {
        token = idToken;
        const userCredentials = {
          handle: newUser.handle,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
          userId,
        };
        // Create new user document in the "users" collection & names it handle that
        // it was passed by the req body. Creates collection if it doesn't exist.
        // Set creates document.
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
      }) // this .then is for when the set function returns
      .then(() => {
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
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const {valid, errors} = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({token});
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 'auth/wrong-password') {
          return res
              .status(403)
              .json({general: 'Wrong credentials, please try again'});
        } else return res.status(500).json({error: err.code});
      });
};

// TODO Add user details function

exports.uploadImage = (req, res) => {
  const Busboy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');
  const busboy = new Busboy({headers: req.headers});

  let imageFileName;
  let imageToBeUploaded = {};

  // Event name is called file for file uploads
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res
          .status(400)
          .json({
            error: 'Wrong file type, please upload a jpeg or png instead',
          });
    }
    // We need to extract image type.
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    // The next line creates 82932894.png for example
    imageFileName = `${Math.round(
        Math.random() * 10000000000,
    )}.${imageExtension}`;
    // tmpdir bc this is a cloud function,not actual server
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {filepath, mimetype};
    file.pipe(fs.createWriteStream(filepath)); // Creates file
  });
  busboy.on('finish', () => {
    admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        })
        .then(() => {
        // Construct image url to add it to our user.
        // Without alt media, it would automatically dl. alt=media displays it to our browser
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
          // Add image url to user's document
          return db.doc(`/users/${req.user.handle}`).update({imageUrl});
        })
        .then(() => {
          return res.json({message: 'Image uploaded successfully'});
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({error: err.code});
        });
  });
  busboy.end(req.rawBody);
};

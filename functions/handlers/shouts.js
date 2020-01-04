// Handlers for all requests in the shouts route
const {db} = require('../util/admin');

exports.getAllShouts = (req, res) => {
  // .get returns a promise which holds a querySnapshot, containing an array of documents
  db.collection('shouts')
      .orderBy('createdAt', 'desc')
      .get() // returns all documents as an array
      .then((data) => {
        const posts = [];
        // doc is just a reference. Use .data() returns data inside document
        data.forEach((doc) => {
          posts.push({
            shoutId: doc.id,
            body: doc.data().body,
            userHandle: doc.data().userHandle,
            createdAt: doc.data().createdAt,
          });
        });
        return res.json(posts);
      })// Returns a Promise -> good prac to put catch for potential errors.
      .catch((err) => console.error(err));
};

exports.postAShout = (req, res) => {
  // Assigns data in request body to newShout
  if (req.body.body.trim() === '') {
    return res.status(400).json({body: 'Body must not be empty'});
  }
  const newShout = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  db.collection('shouts')
      .add(newShout) // add newShout as a document to 'shouts' collection
      .then((doc) =>{
        res.json({message: `document ${doc.id} creation all good`});
      }).catch((err) => {
        res.status(500).json({error: 'Something fked up bruh'});
        console.error(err);
      });
};

// Fetch a shout
exports.getAShout = (req, res) => {
  let shoutData = {};
  db.doc(`/shouts/${req.params.shoutId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({error: 'Shout not found'});
        }
        shoutData = doc.data();
        shoutData.shoutId = doc.id;
        return db
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .where('shoutId', '==', req.params.shoutId)
            .get();
      })
      .then((data) => {
        shoutData.comments = [];
        data.forEach((doc) =>{
          shoutData.comments.push(doc.data());
        });
        return res.json(shoutData);
      })
      .catch((err) =>{
        console.error(err);
        res.status(500).json({error: err.code});
      });
};

// Comment on a shout
exports.commentOnShout = (req, res) =>{
  if (req.body.body.trim() === '') return res.status(400).json({error: 'Must not be empty'});

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    shoutId: req.params.shoutId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
  db.doc(`/shouts/${req.params.shoutId}`).get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({error: 'Shout not found'});
        }
        return db.collection('comments').add(newComment);
      })
      .then(() => {
        res.json(newComment);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({error: 'Smth fked up bruh'});
      });
};

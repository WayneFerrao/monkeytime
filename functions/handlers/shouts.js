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
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };
  db.collection('shouts')
      .add(newShout) // add newShout as a document to 'shouts' collection
      .then((doc) =>{
        const resShout = newShout;
        resShout.shoutId = doc.id;
        res.json(resShout);
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

// Like a shout
// Note: Generally with query languages, you need to fetch whole document to get any property.
// It's more efficient to spread likes and comments in different collections instead of having all
// likes and comments for a shout in 1 collection.
exports.likeShout = (req, res) => {
  const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('shoutId', '==', req.params.shoutId)
      .limit(1);

  const shoutDocument = db.doc(`/shouts/${req.params.shoutId}`);

  let shoutData;

  shoutDocument
      .get()
      .then((doc) => {
        if (doc.exists) { // Extract shout data
          shoutData = doc.data();
          shoutData.shoutId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({error: 'Shout not found'});
        }
      })
      .then((data) => {
        if (data.empty) {// We don't have the like
          return db
              .collection('likes')
              .add({ // add a like as the current user
                shoutId: req.params.shoutId,
                userHandle: req.user.handle,
              })
              .then(() => { // Can't return yet, must first update # of likes property in the shout.
                shoutData.likeCount++;
                return shoutDocument.update({likeCount: shoutData.likeCount});
              })
              .then(() =>{
                return res.json(shoutData); // return shout with new like count
              });
        } else { // Shout already liked by this user
          return res.status(400).json({error: 'Shout already liked'});
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({error: err.code});
      });
};

exports.unlikeShout = (req, res) => {
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
      .where('shoutId', '==', req.params.shoutId).limit(1);

  const shoutDocument = db.doc(`/shouts/${req.params.shoutId}`);

  let shoutData = {};

  shoutDocument.get()
      .then((doc) => {
        if (doc.exists) { // Get shout data
          shoutData = doc.data();
          shoutData.shoutId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({error: 'Shout not found'});
        }
      })
      .then((data) =>{
        if (data.empty) {// We don't have the like
          return res.status(400).json({error: 'Shout not liked, so can\'t unlike'});
        } else { // Shout already liked by this user
          return db
              .doc(`/likes/${data.docs[0].id}`).delete()
              .then(() => {
                shoutData.likeCount--;
                return shoutDocument.update({likeCount: shoutData.likeCount});
              })
              .then(() =>{
                res.json(shoutData);
              });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({error: err.code});
      });
};

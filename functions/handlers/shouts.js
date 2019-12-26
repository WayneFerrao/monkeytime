// This file contains the handlers for all of the requests in the shouts route

const { db } = require('../util/admin'); 

exports.getAllShouts = (req, res) => {
    // .get returns a promise which holds a querySnapshot, containing an array of documents
    db.collection('shouts')
        .orderBy('createdAt', 'desc')
        .get() // returns all documents as an array
        .then((data) => {
            let posts = [];
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
}

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
}
const express = require('express');
const mongoose = require('mongoose');
const Models = require('./models.js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

//Middleware
app.use(cors());
app.use(bodyParser.json());

require('dotenv').config();

const Groups = Models.Group;
const Users = Models.User;

//connections
const connect = process.env.CONNECT_URI;

mongoose
  .connect(process.env.CONNECT_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

app.get('/', (req, res) => {
  res.send('Base rendered successfully');
});

//ENDPOINTS
app.get('/clubs', (req, res) => {
  Groups.find()
    .then((items) => {
      res.status(201).json(items);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong fetching all groups');
    });
});

//Can use this to get any aspect of a certain club, members, posts, etc.
app.get('/clubs/:name', (req, res) => {
  Groups.findOne({ name: req.params.name })
    .then((item) => {
      res.status(201).json(item);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong fetching specific group');
    });
});

app.get('/users', (req, res) => {
  Users.find()
    .then((items) => {
      res.status(201).json(items);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong when fetching all users');
    });
});

app.get('/users/:userId', (req, res) => {
  Users.findOne({ username: req.params.userId })
    .then((profile) => {
      res.status(201).json(profile);
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong getting a specific user');
    });
});

//POST REQUESTS

//add middleware to check password, etc during this process

//---------------------------------------------------------
app.post('/users', (req, res) => {
  //hashes submitted password to then store hashed password
  let hashedPassword = Users.hashPassword(req.body.password);

  Users.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res
          .status(400)
          .send('Account with that username already exists');
      } else {
        Users.create({
          username: req.body.username,
          password: hashedPassword,
          bio: req.body.bio,
          profilePic: req.body.profilePic,
        })
          .then((prof) => {
            res.status(201).json(prof);
          })
          .catch((err) => {
            console.log(err);
            console.log('Something went wrong creating a new user profile');
          });
      }
    })
    .catch((prob) => {
      console.log(prob);
      console.log('problem within the outer process of account creation');
    });
});

/*
Need to find a way to find the original creator or the group, 
so that we can push them in to be the first member of the group.

Possibly upon group creation, run a request to the update group members endpoint to immediately put the current user into the group???
*/

app.post('/clubs', (req, res) => {
  Groups.findOne({ name: req.body.name })
    .then((thing) => {
      if (thing) {
        return res.status(400).send('A group with that name already exists');
      } else {
        Groups.create({
          name: req.body.name,
          description: req.body.description,
          members: [],
          books: [],
          posts: [],
        })
          .then((newGroup) => {
            res.status(201).json(newGroup);
          })
          .catch((err) => {
            console.log(err);
            console.log('Something went wrong with group creation');
          });
      }
    })
    .catch((prob) => {
      console.log(prob);
      console.log(
        'Something went wrong within the outer process of group creation'
      );
    });
});

//update

//Need one to update leaving the groups members array
//rough start to update for members leaving the group
/*
Pretty sure this may be able to be done within just one findOneAndUpdate, will require some more thinking, this is
just to get the idea of what we are going for
*/
app.put('/clubs/:name/:username/leave', (req, res) => {
  Groups.findOne({ name: req.params.name })
    .then((item) => res.status(201).json(item))
    .then((data) => {
      let currentGroupMembers = data.members;
    })
    .catch((err0r) => {
      console.log(err0r);
      console.log(
        'something went wrong when looking for the group wto update after a member has left'
      );
    });

  let newGroupMembers = currentGroupMembers.filter(
    (memberName) => memberName !== req.params.username
  );

  Groups.findOneAndUpdate(
    { name: req.params.name },
    { $push: { members: newGroupMembers } },
    { new: true }
  )
    .then((updatedGroup) => {
      res.json(updatedGroup);
    })
    .catch((err) => {
      console.log(err);
      console.log('there was an error when updating group after a member left');
    });
});

//update group current book
//current book will be at the end of storage array, past ones will be further back in array

//----------------------------------------------------
app.put('/clubs/:name/updatebooks', (req, res) => {
  //variable to hold current book that we are looking at
  Groups.findOneAndUpdate(
    { name: req.params.name },
    { $push: { books: req.body.book } },
    { new: true }
  )
    .then((updateDoc) => {
      console.log(updateDoc);
      res.json(updateDoc);
    })
    .catch((err) => {
      console.log(err);
      console.log(
        'There was an error pushing a new book into a groups books array'
      );
    });
});

//update profile
app.put('/users/update/:username', (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    {
      $set: {
        username: req.body.newUsername,
        bio: req.body.newBio,
        profilePic: req.body.newProfilePic,
      },
    },
    { new: true }
  )
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.log(err);
      console.log('Something went wrong when updating user details');
    });
});

//Update Password
app.put('/user/updatepassword/:username', (req, res) => {
  Users.findOneAndUpdate(
    { username: req.params.username },
    { $set: { password: req.body.password } },
    { new: true }
  )
    .then((updatedUser) => {
      console.log(updatedUser);
      res.json(updatedUser);
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong when changing password');
    });
});

//updates posts to a clubs page
//SUPER IMPORTANT BELOW
/*
Posts need to be made in object format, so that we can add a date, etc, for filtering/presenting posts in order of most recent by default, etc.
*/
app.put('/clubs/:name/posts', (req, res) => {
  Groups.findOneAndUpdate(
    { name: req.params.name },
    { $push: { posts: req.body.post } },
    { new: true }
  )
    .then((newPost) => {
      console.log('Post successfully made');
      res.json(newPost);
    })
    .catch((err) => {
      console.log(err);
    });
});

//Delete requests

//Delete

//------------------------------------------

app.delete('/user/:username', (req, res) => {
  Users.findOneAndRemove({ username: req.params.username })
    .then((user) => {
      if (!user) {
        console.log('user does not exist');
      } else {
        res.send('User was deleted');
        //add functionality to remove user from state
      }
    })
    .catch((err) => {
      console.log(err);
      console.log('something went wrong in account deletion');
    });
});

app.delete('/clubs/:name', (req, res) => {
  //Add logic to check and make sure that the user deleting the club is the one that created the club
  //Does current user === group member[0] maybe????
  Groups.findOneAndRemove({ name: req.params.name }).then((club) => {
    if (!club) {
      console.log('This club does not exist');
      res.send('This club cannot be found');
    } else {
      res.send('Club was deleted');
    }
  });
});

const port = 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port: ${port}`);
});

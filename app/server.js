const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();

// express parses request bodies itself, so body-parser is not a separate dependency
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// use when starting application locally with node command
const mongoUrlLocal = "mongodb://admin:password@localhost:27017";

// use when starting application as docker container, part of docker-compose
const mongoUrlDockerCompose = "mongodb://admin:password@mongodb";

// "user-account" in demo with docker
const databaseName = "user-account";
const collectionName = "users";

// one client for the whole application, reused by every request
const mongoClient = new MongoClient(mongoUrlLocal);

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/profile-picture', function (req, res) {
  const img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

app.get('/get-profile', async function (req, res) {
  const db = mongoClient.db(databaseName);

  const query = { userid: 1 };

  const result = await db.collection(collectionName).findOne(query);

  // send response
  res.send(result ? result : {});
});

app.post('/update-profile', async function (req, res) {
  const userObj = req.body;
  userObj['userid'] = 1;

  const db = mongoClient.db(databaseName);

  const query = { userid: 1 };
  const newValues = { $set: userObj };

  await db.collection(collectionName).updateOne(query, newValues, { upsert: true });
  
  res.send(userObj);
});

// express forwards errors thrown inside async handlers here automatically
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).send({ error: "something went wrong" });
});

// connect to the database once on startup, then start listening
mongoClient.connect()
  .then(function () {
    console.log("connected to mongodb!");
    app.listen(3000, function () {
      console.log("app listening on port 3000!");
    });
  })
  .catch(function (err) {
    console.error("could not connect to mongodb", err);
    process.exit(1);
  });

// close the database connection when the container is stopped
process.on('SIGINT', async function () {
  await mongoClient.close();
  process.exit(0);
});

process.on('SIGTERM', async function () {
  await mongoClient.close();
  process.exit(0);
});

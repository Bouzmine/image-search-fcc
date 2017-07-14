var express = require('express');
var fetch = require('node-fetch');
var path = require("path");
var MongoClient = require("mongodb").MongoClient;

var app = express();

var dbUrl = process.env.DB_URL;
var apiUrl = "https://api.cognitive.microsoft.com/bing/v5.0/images/search";

app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + '/views/index.html'));
});

app.get("/search", function (request, response) {
  let query = request.query.q;
  let offset = request.query.offset || 0;
  let count = 10;
  MongoClient.connect(dbUrl, (err, db) => {
    if(err) {
      console.log(err);
      return response.sendStatus(503);
    }
    
    let collection = db.collection("image-search");
    
    collection.insertOne({
      query: query,
      time: new Date().toISOString()
    }, (err, r) => {
      if(err) {
        console.log(err);
        return response.sendStatus(503);
      }
      
      fetch(apiUrl + "?q=" + query + "&offset=" + offset + "&count=" + count, {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.SECRET
        }
      })
        .then((response) => response.json())
        .then((result) => {
          console.log(result);
          let returnStruct = result.value.map((val, i) => {
            return {
              url: val.contentUrl,
              snippet: val.name,
              thumbnail: val.thumbnailUrl,
              context: val.hostPageUrl
            };
          });
        
          response.json(returnStruct);
        });
    });
  });
});

app.get("/trending", function (request, response) {
  MongoClient.connect(dbUrl, (err, db) => {
    if(err) {
      console.log(err);
      return response.end("Error 500");
    }
    
    let collection = db.collection("image-search");
    
    collection.find().sort({ $natural: -1 }).limit(10).toArray((err, arr) => {
      if(err) {
        console.log(err);
        return response.end("Error 500");
      }
      
      response.json(arr.map((val) => {
        return {
          term: val.query,
          when: val.time
        }
      }));
    });
  });
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

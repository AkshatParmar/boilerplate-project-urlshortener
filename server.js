require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
var bodyParser = require('body-parser');
const app = express();
const router = express.Router();
var validUrl = require('valid-url');
// DB
var mongoose = require('mongoose');
var mongodb = require('mongodb');

// Connect to DB
mongoose.connect(process.env.MONGO_URI,{ 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});
// Create Schema
const { Schema } = mongoose;

var urlSchema = new Schema({
  original: String,
  shortened: Number
});

// Check Status
app.get("/is-mongoose-ok", function (req, res) {
  if (mongoose) {
    res.json({ isMongooseOk: !!mongoose.connection.readyState });
  } else {
    res.json({ isMongooseOk: false });
  }
});

var ShortURL = mongoose.model('URL', urlSchema);

// Creating doc instance
var createAndSaveURL = (orig, done) => {
  let shortened_url = Math.floor(Math.random()*1000);
  // console.log(shortened_url);

  var example = new ShortURL({
    original: orig,
    shortened: shortened_url
  });
  // console.log(example);

  example.save(function(err, data){
    if (err) return console.log(err);
    // console.log(data);
    done(null, data);
  })
};
// Create call
app.get("/create", function(req, res, next) {
  createAndSaveURL("http://facebook.com", function (err, data) {
    if (err) {
      return next(err);
    }
    if (!data) {
      console.log("Missing");
      return next({ message: "Misisng"});
    }
    ShortURL.findById(data._id, function(err, url) {
      if (err) return next(err);
      console.log(url);
      res.json(url);
      url.remove();
    })
  })
})

// Basic Configuration
const port = process.env.PORT || 3000;

// JSON Parser
var jsonParser = bodyParser.json();

// x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});

// CORS Headers
app.use(cors());

// Use Public endpoint to serve static HTML
app.use('/public', express.static(`${process.cwd()}/public`));

// Base PATH
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Remove
app.post('/removeAll', urlencodedParser, function(req, res) {
  console.log(req.body);
  const nameToRemove = req.body.url;
  ShortURL.remove({ original: nameToRemove }, function(err, data) {
    if (err) return console.log(err);
    console.log(data);
    res.status(200).json({
      "deleted": nameToRemove
    });
  });
})

app.post('/api/shorturl', urlencodedParser, (req, res) => {
  // Parse input
  input_url = req.body.url;
  
  // Input Validation
  if (!validUrl.isWebUri(input_url)) {
    res.status(401).json({
      "error":"invalid url" 
    });
  } else {
    // Check if object exists
    ShortURL.find({ original: input_url}, function(err, data) {
      if (err) return console.log(err);
      if (data.length != 0) {
        console.log("Exists", data);
        const shorty = data[0]['shortened'];
        res.status(200).json({
          original_url: input_url,
          short_url: shorty
        });
      } else {
        console.log("None found");
        createAndSaveURL(input_url, function(err, data) {
          if (err) return console.log(err);
          if (!data) return console.log("Missing");
          console.log("New entry", data);
          res.status(200).json({
            original_url:input_url,
            short_url:data['shortened']
          });
        });
      }
    });  
  }
});

app.get('/api/shorturl/:short_url', (req, res) => {
  shorty = req.params.short_url;
  ShortURL.find({ shortened: shorty}, function(err, data) {
    if (err) return console.log(err);
    console.log(data);
    res.redirect(data[0]['original']);
  })
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

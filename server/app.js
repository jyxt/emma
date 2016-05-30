var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
var jwt = require('express-jwt');
var cors = require('cors');
var http = require('http');


var routes = require('./routes/index');

var db;
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://localhost/emma", function(err, database) {
  if(err) { return console.dir(err); }
  db = database;
});


var app = express();
var router = express.Router();

var config = require('./config')

dotenv.load();

var authenticate = jwt({
  secret: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
  audience: process.env.AUTH0_CLIENT_ID
});

app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


app.use('/', routes);
app.use('/secured', authenticate);

var port = process.env.PORT || 3001;

http.createServer(app).listen(port, function (err) {
  console.log('listening in http://localhost:' + port);
});

// emma

var request = require('request');

// search for cities
app.get('/cities', function(req,res){
  var url = 'http://hotelscombined.com/AutoUniversal.ashx?search=new&limit=5&languageCode=EN'
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body) // Show the HTML for the Google homepage.
    }
    var cities =json.parse(response.body)
    var arr = []
    for(var i=0; i<cities.length; i++){
      arr.push({
        id: i,
        text: cities[i].n
      })
    }
    res.json(arr)
  })
})

// get price from hotelcombiend api
app.get('/hc', function(req, res){

  // first try to find in cache, if cache is fresher than 10 sec, use it
  var key = JSON.stringify(req.query) // use the query string as key..
  // if found in cache, return it
  db.collection('cache').findOne({key: key}, function(err, item) {
    if (err) console.log(err)
    if (item){
       var timestamp = item.created
       var diffInSeconds = (new Date() - timestamp)/1000
       console.log('diff is ', diffInSeconds)
       if (diffInSeconds < 10) {
         console.log('diff < 10, use cache')
         return res.send(item.body)
       }
    }

    // not found in cache, grab it from api
    var url = 'http://hotelscombined.com/api/1.0/hotels?onlyIfComplete=true&destination=place:'+req.query.city+'&rooms=2&checkin='+ req.query.checkIn +'&checkout='+ req.query.checkOut +'&sessionID=123&apiKey='+process.env.HC_KEY
    var options = {
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)'
      },
      timeout: 3000
    };

    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
      }
      db.collection('cache').update({
        key: key
      },{
          key: key,
          body: body,
          created: new Date()
        },
       {upsert: true},
       function(err, obj){
         if (err){
           console.log('insert error, ', error)
         } else{
         }
       }
      );
      res.send(body)
    })
  });

})


module.exports = app;

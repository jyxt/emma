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
var md5 = require("blueimp-md5");
var _ = require('lodash');


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

// tests...
app.get('/ean', function (req, res) {
  getEanResults('Toronto', '2016-07-28', '2016-07-29')
  .then(function (data) {
    res.send(data)
  })
  .catch(function (error) {
    console.log(error)
    res.send(error)
  })
})
app.get('/hctest', function (req, res) {
  getHcResults('Toronto', '2016-07-28', '2016-07-29').then(function(data){
    res.send(data)
  })
})
app.get('/findGoogleIds', function(req, res){
  getEanResults('Toronto', '2016-07-28', '2016-07-29').then(function(hotels){
    // res.send(hotels)
    var promises = []
    _.each(hotels, function (hotel) {
      promises.push(findGoogleId(hotel.latitude, hotel.longitude, hotel.name))
    })
    Promise.all(promises).then(function(values){
      res.send(values)
    })
  })
})
app.get('/findGoogleId', function (req, res) {
  findGoogleId(req.query.lat, req.query.long, req.query.name)
  .then(function(response){
    res.send(response)
  })
})


function getHcResults(city, checkIn, checkOut){
  // var city = "Toronto"
  // var checkIn = '2016-07-28'
  // var checkOut = '2016-07-29'
  return new Promise(function(fulfill, reject){
    var url = 'http://hotelscombined.com/api/1.0/hotels?onlyIfComplete=true&destination=place:'+city+'&rooms=2&checkin='+ checkIn +'&checkout='+ checkOut +'&sessionID=123&apiKey='+process.env.HC_KEY
    var options = {
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)'
      },
      timeout: 3000
    };
    request(options, function(error, response, body){
      if (error) reject(error)
      var data = JSON.parse(response.body)
      // res.send(data.HotelListResponse.HotelList)
      fulfill(data.results)
    })
  })
}

function getEanResults(city, checkIn, checkOut){
  function flipDate(d){ // change 2016-07-28 to 07-28-2016
    var components = d.split('-');
    return components[1] + '-' + components[2] +'-'+components[0];
  }
  checkIn = flipDate(checkIn)
  checkOut = flipDate(checkOut)
  return new Promise(function (fulfill, reject) {
    var apiKey = process.env.EAN_KEY
    var secret = process.env.EAN_SECRET
    var hash = md5(apiKey+secret+Math.floor(new Date() / 1000))
    var cid = 497952
    var url = 'http://api.ean.com/ean-services/rs/hotel/v3/list?apiKey='+apiKey+'&cid='+cid+'&sig='+hash+'&customerIpAddress=xxx&locale=en_US&currencyCode=USD&city='+city+'&arrivalDate='+checkIn+'&departureDate='+checkOut+'&room1=2'
    var options = {
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)',
        'content-type': 'application/json'
      }
    }
    request(options, function(error, response, body){
      if (error) reject(error)
      var data = JSON.parse(response.body)
      // res.send(data.HotelListResponse.HotelList)
      fulfill(data.HotelListResponse.HotelList.HotelSummary)
    })
  })
}

function joinSearchResults (hcHotels, eanHotels){
  return new Promise(function(fulfill, reject){

    var hcPromises = []
    _.each(hcHotels, function (hotel) {
      hcPromises.push(findGoogleId(hotel.latitude, hotel.longitude, hotel.name))
    })

    var eanPromises = []
    _.each(eanHotels, function(hotel){
      eanPromises.push(findGoogleId(hotel.latitude, hotel.longitude, hotel.name))
    })

    var counter = 0;

    Promise.all(hcPromises).then(function (values) {
      hc = values;
      counter += 1;
      console.log('counter is ', counter);
      if (counter >1 ){
        fulfill(combineResults([hc, ean]))
      }
    })

    var ean = []
    Promise.all(eanPromises).then(function (values) {
      ean = values;
      counter += 1;
      if (counter >1){
        fulfill(combineResults([hc, ean]))
      }
    })

    function combineResults(ids){
      console.log('combing')
      var hc = ids[0]
      var ean = ids[1]
      var combined = []
      for (var i=0; i< hc.length; i++){
        for(var j=0; j<ean.length; j++){
          if (hc[i] == ean[j]){
            combined.push({
              name: hcHotels[i].name,
              hcRate: hcHotels[i].lowestRate,
              eanRate: eanHotels[j].lowRate
            })
          }
        }
      }
      return combined;
    }

  })
}

// test: http://localhost:3001/join?city=Toronto&checkIn=2016-07-28&checkOut=2016-07-29
app.get('/join', function (req, res) {
  var promises = [getHcResults(req.query.city, req.query.checkIn, req.query.checkOut), getEanResults(req.query.city, req.query.checkIn, req.query.checkOut)]

  Promise.all(promises).then(function (values) {
    // res.send(values)
    return joinSearchResults(values[0], values[1])
  })
  .then(function(data){
    res.send(data)
  }).catch(function (error) {
    res.send(error)
  })
})


function findGoogleId(lat, long, name){
  return new Promise(function(fulfill, reject){
    var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+long+'&radius=500&key=AIzaSyCoGEddYvzYhEmHntK2nYMobKEdxyRaw5Q&name=Chelsea Hotel, Toronto'
    request(url, function (error, response, body) {
      if (error){
        reject(error);
      }
      else {
        var data = JSON.parse(response.body).results
        if (data.length >0){
          fulfill(data[0].id)
        }else{
          fulfill(null)
        }
      }
    })
  });
}

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

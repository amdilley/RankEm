var fs = require('fs');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();

var moment = require('moment');

var Database = require('./util/db');
var db = new Database();

var port = process.env.PORT || 3000;

var DEFAULT_OFFSET_DAYS = 0;
var DEFAULT_OFFSET_HOURS = 6;
var DEFAULT_OFFSET_MINUTES = 0;

function renderIndex(response) {
  response.sendFile(__dirname + '/public/index.html', function (err) {
    if (err) {
      console.error('err', err);
      response.status(err.status).end();
    } else {
      
    }
  });
}

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
// 'index': false prevents default routing behavior
app.use(express.static(__dirname + '/public', { 'index': false }));

app.use(bodyParser.urlencoded({ extended: false }));

// get list of finalized list items
app.get('/db/list/:listId', function (req, res) {
  db.getListItemsById(req.params.listId, function (queryResult) {
    res.json(queryResult);
  });
});

// get all categories
app.get('/db/categories', function (req, res) {
  db.getCategories(function (queryResult) {
    res.json(queryResult);
  });
});

// get all options associated with a given category
app.get('/db/options/:categoryId', function (req, res) {
  db.getCategoryOptions(req.params.categoryId, function (queryResult) {
    res.json(queryResult);
  });
});

// get list of cateogry options to choose from
app.get('/db/category-options/:alias', function (req, res) {
  db.getCategoryItemsByListId(req.params.alias, function (queryResult) {
    res.json(queryResult);
  });
});

// create new list
app.post('/db/list', function (req, res) {
  var days    = req.body.days !== undefined ? req.body.days : DEFAULT_OFFSET_DAYS;
  var hours   = req.body.hours !== undefined ? req.body.hours : DEFAULT_OFFSET_HOURS;
  var minutes = req.body.minutes !== undefined ? req.body.minutes : DEFAULT_OFFSET_MINUTES;

  var now = moment();
  now.format('YYYY-MM-DD HH:mm:ss Z');

  var expiration = now.add(days, 'days')
                      .add(hours, 'hours')
                      .add(minutes, 'minutes');

  var rankers = req.body.rankers;
  var aliases = db.generateAliases(rankers.split(',').length);

  db.createList(
    aliases.join(','),
    req.body.categoryId,
    req.body.message,
    expiration._d,
    rankers,
    req.body.itemsPerRanker, function () {
      res.json({
        result: 'list created'
      });
  });
});

// submit category option selection
app.post('/db/select', function (req, res) {
  var timestamp = new Date();

  db.submitSelection(req.body.alias, req.body.options, timestamp, function () {
    res.json({
      result: 'selection submitted'
    });
  });
});

// submit final ranking
app.post('/db/rank', function (req, res) {
  db.submitRanking(req.body.alias, req.body.ranking, function () {
    res.json({
      result: 'ranking submitted'
    });
  });
});

// create new category
app.post('/db/category', function (req, res) {
  db.createCategory(req.body.name, function () {
    res.json({
      result: 'category created'
    });
  });
});

// update category
app.post('/db/category/update', function (req, res) {
  db.editCategory(req.body.categoryId, req.body.name, req.body.children function () {
    res.json({
      result: 'category updated'
    });
  });
});

// create new category option
app.post('/db/option', function (req, res) {
  db.addCategoryOption(req.body.categoryId, req.body.name, function () {
    res.json({
      result: 'category option added'
    });
  });
});

// remove category option
app.post('/db/option', function (req, res) {
  db.removeCategoryOption(req.body.optionId, function () {
    res.json({
      result: 'category option removed'
    });
  });
});

app.get('/db/uuid', function (req, res) {
  var uuid = db.generateUUID();
  res.json({ uuid: uuid });
});

// set the home page route
app.get('/', function (req, res) {
  renderIndex(res);
});

app.listen(port, function () {
  console.log('Server listening on port ' + port);
});

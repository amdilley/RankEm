var pg = require('pg');
var uuid = require('uuid');

var Twilio = require('./twilio');
var twilio = new Twilio();

var BASE_ROOT = 'http://localhost:3000/#';
var SELECTION_ENDPOINT = BASE_ROOT + '/make-selection/';
var RANKING_ENDPOINT = BASE_ROOT + '/list/';

/**
 * Randomize array element order in-place
 * Using Fisher-Yates shuffle algorithm.
 * @return {array} shuffled array
 */
Array.prototype.shuffle = function () {
  for (var i = this.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
};

/**
 * Remove first instance of value from array.
 * @param value value to be removed
 * @return filtered array
 */
Array.prototype.removeVal = function (value) {
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] === value) {
      this.splice(i, 1);
      return this;
    }
  }
};

var Database = function () {
  this._endpoint = process.env.DATABASE_URL || 'postgres://amdilley@localhost/RankEm';
};

Database.prototype = {
  /**
   * Generic query handler for Database class.
   * @param {string} query PostgreSQL query
   * @param {array} queryData array of interpolated variables for query
   * @param {function} callback handler for query result
   * @param {string} errorMessage console message on query failure
   */
  runQuery: function (query, queryData, callback, errorMessage) {
    var client = new pg.Client(this._endpoint);

    client.connect(function (err) {
      if (err) {
        return console.error('could not connect to postgres', err);
      }

      client.query(query, queryData, function (err, result) {
        if (err) {
          return console.error(errorMessage, err);
        }

        callback(result);

        client.end();
      });
    });
  },

  /**
   * Retrieve list items.
   * @param {string} listId ID of list row in databse
   * @param {function} callback to be executed on query completion
   */
  getListItemsById: function (listId, callback) {
    // TODO: verify this works as intended with aliases.
    // List ranking should not be accesible until all selections are cast
    var listQuery = 'SELECT l.message, l.items FROM lists l ' +
                    'WHERE l.id = $1 ' +
                    'OR l.aliases LIKE $2';

    var _this = this;

    _this.runQuery(listQuery, [listId, '%' + listId + '%'], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var itemIds = Object.keys(JSON.parse(list.items));
        var formattedIds = itemIds.map(function (itemId) {
                             // double quotes used for string concatenation since
                             // postgresql requires single quotes to wrap text
                             return "o.id = '" + itemId + "'"; 
                           });

        var itemsQuery = 'SELECT o.id, o.name FROM category_options o ' +
                         'WHERE ' + formattedIds.join(' OR ') + ' ' +
                         'ORDER BY RANDOM()';

        _this.runQuery(itemsQuery, [], function (iResult) {
          if (iResult && iResult.rows) {
            callback({
              message: list.message,
              items: iResult.rows
            });
          }
        }, 'error retrieving items');
      }
    }, 'error retrieving list');
  },

  /**
   * Retrieve category items for a given list category.
   * @param {string} listId ID of alias in list row in databse
   * @param {function} callback to be executed on query completion
   */
  getCategoryItemsByListId: function (listId, callback) {
    var listQuery = 'SELECT l.categoryId, l.message, l.itemsPerRanker FROM lists l ' +
                    'WHERE l.id = $1 ' +
                    'OR l.aliases LIKE $2';

    var _this = this;

    _this.runQuery(listQuery, [listId, '%' + listId + '%'], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var categoryId = list.categoryid;
        var listPrompt = list.message;
        var numChoices = list.itemsperranker;

        callback({
          categoryId: categoryId,
          listPrompt: listPrompt,
          numChoices: numChoices
        });
      }
    }, 'error retrieving list');
  },

  /**
   * Retrieve categories.
   * @param {function} callback to be executed on query completion
   * @return {array} category list
   */
  getCategories: function (callback) {
    var categoryQuery = 'SELECT * FROM categories c '+
                        'ORDER BY c.name';

    this.runQuery(categoryQuery, [], function (cResult) {
      if (cResult && cResult.rows) {
        callback(cResult.rows);
      }
    }, 'error retrieving categories');
  },

  /**
   * Retrieve category options.
   * @param {string} categoryId ID of category to select options from
   * @param {function} callback to be executed on query completion
   * @return {array} category options
   */
  getCategoryOptions: function (categoryId, callback) {                  
    var optionsQuery = 'SELECT o.id, o.name FROM category_options o ' +
                       'WHERE o.categoryId = $1 ' +
                       'ORDER BY o.name';

    this.runQuery(optionsQuery, [categoryId], function (oResult) {
      if (oResult && oResult.rows) {
        callback(oResult.rows);
      }
    }, 'error retrieving options');
  },

  /**
   * Create category row.
   * @param {string} categoryName display name of new category
   * @param {function} callback to be executed on query completion
   * @return {object} category metadata
   */
  createCategory: function (categoryName, callback) {
    var categoryQuery = 'INSERT INTO categories ' +
                        'VALUES ($1, $2)';

    var categoryId = this.generateUUID();

    this.runQuery(categoryQuery, [categoryId, categoryName], function () {
      callback();
    });
  },

  /**
   * Create list row.
   * @param {string} aliases, comma separated list of UUIDs associated with list rankers
   * @param {string} categoryId ID of category containing available items
   * @param {string} message display text/prompt for list
   * @param {string} expiration timestamp marking when submissions are no longer valid (YYYY-MM-DD HH:MM:SSZ)
   * @param {string} rankers comma separated list of phone numbers
   * @param {number} itemsPerRanker number of items each ranker must select
   * @param {function} callback to be executed on query completion
   */
  createList: function (aliases, categoryId, message, expiration, rankers, itemsPerRanker, callback) {
    var listQuery = 'INSERT INTO lists ' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';

    var listId = this.generateUUID();

    this.runQuery(listQuery, [listId, aliases, categoryId, message, expiration, rankers, itemsPerRanker, ''], function () {
      // send links to rankers
      var rankersList = rankers.split(',');
      var aliasList = aliases.split(',');

      for (var i = 0, l = rankersList.length; i < l; i++) {
        twilio.send([rankersList[i]], message + ': ' + SELECTION_ENDPOINT + aliasList[i]);
      }

      callback();
    }, 'error creating list');
  },

  /**
   * Submit category option(s)
   * @param {string} alias ID of list row in databse
   * @param {string} options comma separated list of selected option(s)
   * @param {function} callback to be executed on query completion
   */
  submitSelection: function (alias, options, callback) {
    var listQuery   = 'SELECT l.id, l.aliases, l.rankers, l.items FROM lists l ' +
                      'WHERE l.aliases LIKE $1';
    var updateQuery = 'UPDATE lists ' +
                      'SET aliases = $1, items = $2 ' +
                      'WHERE id = $3';
    var aliasQuery  = 'UPDATE lists ' +
                      'SET aliases = $1 ' +
                      'WHERE id = $2';

    var _this = this;

    _this.runQuery(listQuery, ['%' + alias + '%'], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var listId = list.id;
        var rankers = list.rankers.split(',');
        var aliases = list.aliases.split(',');
        var items = list.items ? JSON.parse(list.items) : {};

        var remainingAliases = aliases.removeVal(alias).join(',');

        options = options.split(',');

        for (var i = 0, l = options.length; i < l; i++) {
          items[options[i]] = 0;
        }

        _this.runQuery(updateQuery, [remainingAliases, JSON.stringify(items), listId], function (uResult) {
          if (remainingAliases === '') {
            // TODO: alert rankers with rankable list link
            var numRankers = rankers.length;
            var newAliases = _this.generateAliases(numRankers);

            _this.runQuery(aliasQuery, [newAliases.join(','), listId], function (aResult) {
              for (var i = 0, l = numRankers; i < l; i++) {
                twilio.send([rankers[i]], 'Rank Em here: ' + RANKING_ENDPOINT + newAliases[i]);
              }

              callback();
            }, 'error sending out texts to rankers');
          }
        }, 'error updating list');
      }
    }, 'error retrieving list');
  },

  /**
   * Submit list ranking
   * @param {string} alias ID of list row in databse
   * @param {string} ranking hashmap
   * @param {function} callback to be executed on query completion
   */
  submitRanking: function (alias, ranking, callback) {
    var listQuery   = 'SELECT l.id, l.aliases, l.rankers, l.items FROM lists l ' +
                      'WHERE l.aliases LIKE $1';
    var updateQuery = 'UPDATE lists ' +
                      'SET aliases = $1, items = $2 ' +
                      'WHERE id = $3';

    var _this = this;

    _this.runQuery(listQuery, [alias], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var listId = list.id;
        var aliases = list.aliases.split(',');
        var rankers = list.rankers.split(',');
        var items = JSON.parse(list.items);

        var remainingAliases = aliases.removeVal(alias).join(',');

        ranking = JSON.parse(ranking);
        
        for (var itemId in ranking) {
          items[itemId] += ranking[itemId];
        }
        
        _this.runQuery(updateQuery, [remainingAliases, JSON.stringify(items), listId], function (uResult) {
          if (remainingAliases === '') {
            var numRankers = rankers.length;

            for (var i = 0, l = numRankers; i < l; i++) {
              twilio.send([rankers[i]], 'See results: ' + RANKING_ENDPOINT + listId);
            }
          }

          callback();
        }, 'error updating list');
      }
    }, 'error retrieving list');
  },

  /**
   * Generates a list of alias UUIDs
   * @param {number} number number of alias IDs needed
   * @return {array} list of generated UUIDs
   */
  generateAliases: function (number) {
    return (new Array(number)).join(',').split(',').map((function () {
        return this.generateUUID();
      }).bind(this));
  },

  /**
   * Returns randomly generated UUID.
   * @return {string} UUID
   */
  generateUUID: function () {
    return uuid.v4();
  }
};

module.exports = Database;

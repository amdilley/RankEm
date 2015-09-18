var pg = require('pg');
var uuid = require('uuid');

/**
 * Randomize array element order in-place
 * Using Fisher-Yates shuffle algorithm.
 * @param {array} arr array entries to be shuffled
 * @return {array} shuffled array
 */
Array.prototype.shuffle = function () {
  for (var i = this.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
}

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
   * @return {object} list items and relevant metadata
   */
  getListItemsById: function (listId, callback) {
    console.log(listId);
    var listQuery = 'SELECT l.message, l.items FROM lists l ' +
                    'WHERE l.id = $1 ' +
                    'AND l.aliases = $2';

    var _this = this;

    _this.runQuery(listQuery, [listId, ''], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var itemIds = list.items.split(',');
        var formattedIds = itemIds.map(function (itemId) {
                             // double quotes used for string concatenation since
                             // postgresql requires single quotes to wrap text
                             return "o.id = '" + itemId + "'"; 
                           });

        var itemsQuery = 'SELECT o.id, o.name FROM category_options o ' +
                         'WHERE ' + formattedIds.join(' OR ') + ' ' +
                         'ORDER BY RANDOM()';

        console.log(itemsQuery);

        _this.runQuery(itemsQuery, [], function (iResult) {
          if (iResult && iResult.rows) {
            callback({
              message: list.message,
              items: iResult.rows
            });
          }
        }, 'error retireving items');
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
    var listQuery   = 'SELECT l.id, l.aliases, l.items FROM lists l ' +
                      'WHERE l.aliases LIKE $1';
    var updateQuery = 'UPDATE lists ' +
                      'SET aliases = $1, items = $2 ' +
                      'WHERE id = $3'; 

    var _this = this;

    _this.runQuery(listQuery, ['%' + alias + '%'], function (lResult) {
      if (lResult && lResult.rows) {
        var list = lResult.rows[0];
        var listId = list.id;
        var aliases = list.aliases.split(',');
        var items = list.items ? list.items.split(',') : [];

        var remainingAliases = aliases.filter(function (id) {
          return id !== alias;
        }).join(',');

        options = options.split(',');

        for (var i = 0, l = options.length; i < l; i++) {
          if (items.indexOf(options[i]) === -1) {
            items.push(options[i]);
          }
        }

        _this.runQuery(updateQuery, [remainingAliases, items.join(','), listId], function (uResult) {
          if (remainingAliases === '') {
            // TODO: alert rankers with rankable list link
          }

          callback();
        }, 'error updating list');
      }
    }, 'error retireving list');
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

var moment = require('moment');
var pg = require('pg');
var schedule = require('node-schedule');
var uuid = require('uuid');

var Twilio = require('./twilio');
var twilio = new Twilio();

var BASE_ROOT = 'http://localhost:3000/#';
var SELECTION_ENDPOINT = BASE_ROOT + '/make-selection/';
var RANKING_ENDPOINT = BASE_ROOT + '/list/';

var _scheduledEvents = {};

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
   * @param {function} callback callback handler for query result
   * @param {string} errorMessage console message on query failure
   */
  runQuery: function (query, queryData, callback, errorMessage) {
    var client = new pg.Client(this._endpoint);
    var isSelectQuery = /^SELECT/.test(query);

    client.connect(function (err) {
      if (err) {
        return console.error('could not connect to postgres', err);
      }

      client.query(query, queryData, function (err, result) {
        if (err) {
          return console.error(errorMessage, err);
        }

        // UPDATE and INSERT queries won't return rows
        if (!isSelectQuery || (result && result.rows)) {
          callback(result);
        } else {
          return console.error("No results found");
        }

        client.end();
      });
    });
  },

  /**
   * Retrieve list items.
   * @param {string} listId ID of list row in databse
   * @param {function} callback callback to be executed on query completion
   */
  getListItemsById: function (listId, callback) {
    // List ranking should not be accesible until all selections are cast
    var listQuery = 'SELECT l.aliases, l.message, l.items FROM lists l ' +
                    'WHERE l.id = $1 ' +
                    'OR l.aliases LIKE $2';

    var _this = this;

    _this.runQuery(listQuery, [listId, '%' + listId + '%'], function (lResult) {
      var list = lResult.rows[0];
      var aliases = list.aliases;
      var isRankable = aliases !== '';
      var itemsObj = JSON.parse(list.items);
      var itemIds = Object.keys(itemsObj);
      var formattedIds = itemIds.map(function (itemId) {
                           // double quotes used for string concatenation since
                           // postgresql requires single quotes to wrap text
                           return "o.id = '" + itemId + "'"; 
                         });

      var itemsQuery = 'SELECT o.id, o.name FROM category_options o ' +
                       'WHERE ' + formattedIds.join(' OR ') + ' ' +
                       'ORDER BY RANDOM()';

      _this.runQuery(itemsQuery, [], function (iResult) {
        if (!isRankable) {
          iResult.rows.sort(function (itemA, itemB) {
            return itemsObj[itemA.id] - itemsObj[itemB.id]; // sort by count
          });
        }

        callback({
          message: list.message,
          items: iResult.rows,
          isRankable: isRankable
        });
      }, 'error retrieving items');
    }, 'error retrieving list');
  },

  /**
   * Retrieve category items for a given list category.
   * @param {string} listId ID of alias in list row in databse
   * @param {function} callback callback to be executed on query completion
   */
  getCategoryItemsByListId: function (listId, callback) {
    var listQuery = 'SELECT l.categoryId, l.message, l.itemsPerRanker FROM lists l ' +
                    'WHERE l.id = $1 ' +
                    'OR l.aliases LIKE $2';

    var _this = this;

    _this.runQuery(listQuery, [listId, '%' + listId + '%'], function (lResult) {
      var list = lResult.rows[0];
      var categoryId = list.categoryid;
      var listPrompt = list.message;
      var numChoices = list.itemsperranker;

      callback({
        categoryId: categoryId,
        listPrompt: listPrompt,
        numChoices: numChoices
      });
    }, 'error retrieving list');
  },

  /**
   * Retrieve single category.
   * @param {string} categoryId ID of category
   * @param {function} callback callback to be executed on query completion
   */
  getCategory: function (categoryId, callback) {
    var categoryQuery = 'SELECT * FROM categories c '+
                        'WHERE c.id = $1';

    this.runQuery(categoryQuery, [categoryId], function (cResult) {
      callback(cResult.rows[0]);
    }, 'error retrieving categories');
  },

  /**
   * Retrieve categories.
   * @param {function} callback callback to be executed on query completion
   */
  getCategories: function (callback) {
    var categoryQuery = 'SELECT * FROM categories c '+
                        'ORDER BY c.name';

    this.runQuery(categoryQuery, [], function (cResult) {
      callback(cResult.rows);
    }, 'error retrieving categories');
  },

  /**
   * Create category row.
   * @param {string} categoryName display name of new category
   * @param {function} callback callback to be executed on query completion
   */
  createCategory: function (categoryName, callback) {
    // initialize path_root as category ID
    var categoryQuery = 'INSERT INTO categories (id, name, path_root) ' +
                        'SELECT $1, $2, $1 ' +
                        'WHERE NOT EXISTS (' +
                          'SELECT * FROM categories WHERE name = $2' + 
                        ')';

    var categoryId = this.generateUUID();

    this.runQuery(categoryQuery, [categoryId, categoryName], function () {
      callback();
    }, 'error creating category');
  },

  /**
   * Edit category children.
   * @param {string} categoryId ID of category to edit
   * @param {string} childCategories comma separated list of child categories
   * @param {string} addedCategories comma separated list of added categories
   * @param {string} removedCategories comma separated list of removed categories
   * @param {function} callback callback to be executed on query completion
   */
  editCategoryChildren: function (categoryId, childCategories, addedCategories, removedCategories, callback) {
    var updateParentQuery  = 'UPDATE categories ' +
                             'SET child_categories = $2 ' +
                             'WHERE id = $1';
    var updateAddedQuery   = 'UPDATE categories ' +
                             'SET path_root = (' +
                               'SELECT c.path_root FROM categories c ' +
                               'WHERE c.id = $1' +
                             ')' +
                             'WHERE POSITION(id IN $2) <> 0';
    var updateRemovedQuery = 'UPDATE categories ' +
                             'SET path_root = id ' +
                             'WHERE POSITION(id IN $1) <> 0';

    var _this = this;
    
    _this.runQuery(updateParentQuery, [categoryId, childCategories], function (pResult) {
      _this.runQuery(updateAddedQuery, [categoryId, addedCategories], function (aResult) {
        _this.runQuery(updateRemovedQuery, [removedCategories], function (rResult) {
          callback();
        }, 'error updating path roots of removed categories');
      }, 'error updating path roots of new child categories');
    }, 'error updating parent category');
  },

  /**
   * Edit category name.
   * @param {string} categoryId ID of category to edit
   * @param {string} categoryName new name of category
   * @param {function} callback callback to be executed on query completion
   */
  updateCategoryName: function (categoryId, categoryName, callback) {
    var nameQuery = 'UPDATE categories ' +
                    'SET name = $2 ' +
                    'WHERE id = $1';

    this.runQuery(nameQuery, [categoryId, categoryName], function () {
      callback();
    }, 'error updating name');
  },

  /**
   * Return all categories not sharing a common ancestor.
   * @param {string} categoryId ID of category to gather child categories for
   * @param {function} callback callback to be executed on query completion
   */
  getEligibleChildCategories: function (categoryId, callback) {
    var eligibleCategoriesQuery = 'SELECT * FROM categories c ' +
                                  'WHERE c.path_root != (' +
                                      'SELECT cat.path_root FROM categories cat ' +
                                      'WHERE cat.id = $1' +
                                  ') ' +
                                  'ORDER BY c.name';

    this.runQuery(eligibleCategoriesQuery, [categoryId], function (eResult) {
      callback(eResult.rows);
    }, 'error retrieving eligible child categories');
  },

  /**
   * Return all categories/options that are direct descendents of specified category.
   * @param {string} categoryId ID of category to gather child categories for
   * @param {function} callback callback to be executed on query completion
   */
  getCurrentChildCategories: function (categoryId, callback) {
    var currentCategoriesQuery = 'SELECT * FROM categories c ' +
                                 'NATURAL FULL JOIN category_options o ' + 
                                 'WHERE POSITION(c.id IN (' +
                                     'SELECT cat.child_categories FROM categories cat ' +
                                     'WHERE cat.id = $1' +
                                 ')) <> 0 ' +
                                 'OR o.categoryid = $1 ' +
                                 'ORDER BY c.name, o.name';

    this.runQuery(currentCategoriesQuery, [categoryId], function (cResult) {
      callback(cResult.rows);
    }, 'error retrieving current child categories');
  },

  /**
   * Retrieve category options.
   * @param {string} categoryId ID of category to select options from
   * @param {function} callback callback to be executed on query completion
   */
  getCategoryOptions: function (categoryId, callback) {
    var optionsQuery = 'SELECT o.id, o.name ' +
                       'FROM category_options o ' +
                       'JOIN categories c ' +
                       'ON c.id = o.categoryid ' +
                       'WHERE c.id = $1 ' +
                       'OR c.child_categories LIKE $2 ' +
                       'ORDER BY o.name';

    this.runQuery(optionsQuery, [categoryId, '%' + categoryId + '%'], function (oResult) {
      callback(oResult.rows);
    }, 'error retrieving options');
  },

  /**
   * Add/Remove options associated with a specified category.
   * @param {string} categoryId ID of category associated with options
   * @param {string} newOptions ; delimited list of option display text to be added
   * @param {string} removedIds comma separated list of IDs of options to be removed from database
   * @param {function} callback callback to be executed on query completion
   */
  modifyOptions: function (categoryId, newOptions, removedIds, callback) {
    var newOptionsArray = newOptions.split(';');
    var removeOptionsArray = removedIds.split(',');
    var _this = this;
    
    if (removedIds && newOptions) {
      _this.removeCategoryOptions(removeOptionsArray, function () {
        _this.addCategoryOptions(categoryId, newOptionsArray, callback);
      });
    } else if (removedIds) {
      _this.removeCategoryOptions(removeOptionsArray, callback);
    } else {
      _this.addCategoryOptions(categoryId, newOptionsArray, callback);
    }
  },

  /**
   * Add category option.
   * @param {string} categoryId ID of category to add options to
   * @param {array} options array of display texts for options
   * @param {function} callback callback to be executed on query completion
   */
  addCategoryOptions: function (categoryId, options, callback) {
    var _this = this;
    var optionsValuesString = options.map(function (option) {
      var optionId = _this.generateUUID();
      return '(\'' + optionId + '\', \'' + categoryId + '\', \'' + option + '\')';
    }).join(',');
    var insertQuery = 'INSERT INTO category_options (id, categoryid, name) ' +
                      'VALUES ' + optionsValuesString;

    _this.runQuery(insertQuery, [], function () {
      callback();
    });
  },

  /**
   * Remove category option.
   * @param {array} optionIds array of IDs of options to remove 
   * @param {function} callback callback to be executed on query completion
   */
  removeCategoryOptions: function (optionIds, callback) {
    var optionIdsString = optionIds.map(function (id) {
      return 'id = \'' + id + '\'';
    }).join(' OR ');
    var deleteQuery = 'DELETE FROM category_options ' +
                      'WHERE ' + optionIdsString;
    
    this.runQuery(deleteQuery, [], function () {
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
   * @param {function} callback callback to be executed on query completion
   */
  createList: function (aliases, categoryId, message, expiration, rankers, itemsPerRanker, callback) {
    var listQuery = 'INSERT INTO lists ' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';

    var listId = this.generateUUID();

    var _this = this;

    _this.runQuery(listQuery, [listId, aliases, categoryId, message, expiration, rankers, itemsPerRanker, ''], function () {
      // send links to rankers
      var rankersList = rankers.split(',');
      var aliasList = aliases.split(',');

      for (var i = 0, l = rankersList.length; i < l; i++) {
        twilio.send([rankersList[i]], message + ': ' + SELECTION_ENDPOINT + aliasList[i]);
      }

      // TODO: fix job scheduler - currently breaking requests
      _scheduledEvents[listId] = schedule.scheduleJob(expiration, function () {
        _this.triggerFinalSelection(rankersList, listId, function () {
          console.log('selection submitted');
        });
      });

      callback();
    }, 'error creating list');
  },

  /**
   * Submit category option(s)
   * @param {string} alias ID of list row in databse
   * @param {string} options comma separated list of selected option(s)
   * @param {string} timestamp time selection request was submitted
   * @param {function} callback callback to be executed on query completion
   */
  submitSelection: function (alias, options, timestamp, callback) {
    var listQuery   = 'SELECT l.id, l.aliases, l.rankers, l.items, l.expiration FROM lists l ' +
                      'WHERE l.aliases LIKE $1';
    var updateQuery = 'UPDATE lists ' +
                      'SET aliases = $1, items = $2 ' +
                      'WHERE id = $3';

    var _this = this;

    _this.runQuery(listQuery, ['%' + alias + '%'], function (lResult) {
      var list = lResult.rows[0];
      var listId = list.id;
      var rankers = list.rankers.split(',');
      var aliases = list.aliases.split(',');
      var items = list.items ? JSON.parse(list.items) : {};
      var expiration = list.expiration;

      var remainingAliases = aliases.removeVal(alias).join(',');

      options = options.split(',');

      for (var i = 0, l = options.length; i < l; i++) {
        items[options[i]] = 0;
      }

      // Don't process selection submissions past expiration date
      if (moment(timestamp).isBefore(moment(expiration))) {
        _this.runQuery(updateQuery, [remainingAliases, JSON.stringify(items), listId], function (uResult) {
          if (remainingAliases === '') {
            _this.triggerFinalSelection(rankers, listId, function () {
              _scheduledEvents[listId].cancel();
              callback();
            });
          }
        }, 'error updating list');
      }
    }, 'error retrieving list');
  },

  /**
   * Submit list ranking
   * @param {string} alias ID of list row in databse
   * @param {string} ranking ranking hashmap
   * @param {function} callback callback to be executed on query completion
   */
  submitRanking: function (alias, ranking, callback) {
    var listQuery   = 'SELECT l.id, l.aliases, l.rankers, l.items FROM lists l ' +
                      'WHERE l.aliases LIKE $1';
    var updateQuery = 'UPDATE lists ' +
                      'SET aliases = $1, items = $2 ' +
                      'WHERE id = $3';

    var _this = this;

    _this.runQuery(listQuery, [alias], function (lResult) {
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
    }, 'error retrieving list');
  },

  /**
   * Triggers list row update and sends notification to rankers
   * @param {array} rankers list of ranker telephone numbers
   * @param {string} listId id of list row to be updated
   * @param {function} callback callback to be executed on query completion
   */
  triggerFinalSelection: function (rankers, listId, callback) {
    var numRankers = rankers.length;
    var newAliases = this.generateAliases(numRankers);
    var aliasQuery = 'UPDATE lists ' +
                     'SET aliases = $1 ' +
                     'WHERE id = $2';

    this.runQuery(aliasQuery, [newAliases.join(','), listId], function (aResult) {
      for (var i = 0, l = numRankers; i < l; i++) {
        twilio.send([rankers[i]], 'Rank Em here: ' + RANKING_ENDPOINT + newAliases[i]);
      }

      callback();
    }, 'error sending out texts to rankers');
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

const Dispatcher = require('flux').Dispatcher;

const AppDispatcher = new Dispatcher();

AppDispatcher.handleViewAction = function (action) {
  this.dispatch({
    action,
    source: 'VIEW_ACTION',
  });
};

module.exports = AppDispatcher;

const React = require('react');

// nested components
const MakeSelection = require('./MakeSelection.react');
const NewListForm = require('./NewListForm.react');
const RankedList = require('./RankedList.react');

// stores
const AppStore = require('../stores/AppStore');

const _path = window.location.hash.match(/#(.+)/)[1];

// route regexes
const CREATE_LIST_REGEX = /\/create\/list/;
const MAKE_SELECTION_REGEX = /\/make-selection\/([a-f\d\-]+)/;
const RANK_LIST_REGEX = /\/list\/([a-f\d\-]+)/;

function getComponentByRoute() {
  switch (true) {
    case CREATE_LIST_REGEX.test(_path):
      return (
          <NewListForm />
        );

    case MAKE_SELECTION_REGEX.test(_path):
      let alias = _path.match(MAKE_SELECTION_REGEX)[1];

      return (
          <MakeSelection alias={ alias } />
        );

    case RANK_LIST_REGEX.test(_path):
      let listId = _path.match(RANK_LIST_REGEX)[1];
      
      return (
          <RankedList listId={ listId } />
        );

    default:
      return null;
  }
}

const App = React.createClass({
  render() {
    return (
        <div id="app" className="container-fluid">
          { getComponentByRoute() }
        </div>
      );
  }
});

module.exports = App;

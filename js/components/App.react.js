const React = require('react');

// nested components
const EditCategoryForm = require('./EditCategoryForm.react');
const MakeSelection = require('./MakeSelection.react');
const NewCategoryForm = require('./NewCategoryForm.react');
const NewListForm = require('./NewListForm.react');
const RankedList = require('./RankedList.react');

// stores
const AppStore = require('../stores/AppStore');

const _path = window.location.hash.match(/#(.+)/)[1];

// route regexes
const CREATE_CATEGORY_REGEX = /\/create\/category/;
const CREATE_LIST_REGEX = /\/create\/list/;
const EDIT_CATEGORY = /\/edit\/category/;
const MAKE_SELECTION_REGEX = /\/make-selection\/([a-f\d\-]+)/;
const RANK_LIST_REGEX = /\/(list|results)\/([a-f\d\-]+)/;

function getComponentByRoute() {
  switch (true) {
    case CREATE_CATEGORY_REGEX.test(_path):
      return (
          <NewCategoryForm />
        );

    case CREATE_LIST_REGEX.test(_path):
      return (
          <NewListForm />
        );

    case EDIT_CATEGORY.test(_path):
      return (
          <EditCategoryForm />
        );

    case MAKE_SELECTION_REGEX.test(_path):
      let alias = _path.match(MAKE_SELECTION_REGEX)[1];

      return (
          <MakeSelection alias={ alias } />
        );

    case RANK_LIST_REGEX.test(_path):
      let listId = _path.match(RANK_LIST_REGEX)[2];
      
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

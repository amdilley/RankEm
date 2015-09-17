const React = require('react');

// nested components
const MakeSelection = require('./MakeSelection.react');
const NewListForm = require('./NewListForm.react');
const RankedList = require('./RankedList.react');

// stores
const AppStore = require('../stores/AppStore');

const _path = window.location.hash.match(/#(.+)/)[1];

function getComponentByRoute() {
  switch (true) {
    case /\/create\/list/.test(_path):
      return (
          <NewListForm />
        );

    case /\/make-selection\/[a-f\d\-]+/.test(_path):
      let alias = _path.match(/\/make-selection\/([a-f\d\-]+)/)[1];

      return (
          <MakeSelection alias={ alias } />
        );

    case /\/list\/[a-f\d\-]+/.test(_path):
      let listId = _path.match(/\/list\/([a-f\d\-]+)/)[1];
      
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

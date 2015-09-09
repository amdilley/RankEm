const React = require('react');

// nested components
const RankedList = require('./RankedList.react');
const NewListForm = require('./NewListForm.react');

// stores
const AppStore = require('../stores/AppStore');

const _path = window.location.hash.match(/#(.+)/)[1];

function getComponentByRoute() {
  switch (true) {
    case /\/create\/list/.test(_path):
      return (
          <NewListForm />
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

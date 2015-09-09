const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const RankedItem = require('./RankedItem.react');

// actions
const RankedListActions = require('../actions/RankedListActions');

// stores
const RankedListStore = require('../stores/RankedListStore');

function renderItems() {
  return RankedListStore.getRankedList().map((item, i) => {
    return (
        <RankedItem 
          text={ item.name }
          itemId={ item.id }
          initialPosition={ i }
          key={ i } />
      );
  });
}

const RankedList = React.createClass({
  propTypes: {
    listId: ReactPropTypes.string
  },

  getInitialState() {
    return {
      items: []
    };
  },

  componentDidMount() {
    RankedListStore.addChangeListener(() => {
      this._updateList();
    });

    $.get('/db/list/' + this.props.listId, (data) => {
      RankedListActions.update(data);
    });
  },

  componentWillUnmount() {
    RankedListStore.removeChangeListener(() => {
      this._updateList();
    });
  },

  render() {
    return (
        <div id="rankedList" className="row">
          { this.state.items }
        </div>
      );
  },

  _updateList() {
    this.setState({
      items: renderItems()
    });
  }
});

module.exports = RankedList;

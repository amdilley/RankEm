const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const RankedItem = require('./RankedItem.react');

// actions
const RankedListActions = require('../actions/RankedListActions');

// stores
const RankedListStore = require('../stores/RankedListStore');

const cx = require('classnames');

function renderItems(items) {
  return items.map((item, i) => {
    return (
        <RankedItem 
          text={ item.name }
          itemId={ item.id }
          initialPosition={ i }
          totalItems={ items.length }
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
      listPrompt: '',
      items: [],
      isRankable: true
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
    var classes = cx({
      'rankable': this.state.isRankable
    });

    return (
        <div className={ classes }>
          <h2>{ this.state.listPrompt }</h2>
          <div className="form-group submit-ranking">
            <div className="col-sm-10">
              <button
                className="btn btn-default"
                onClick={ this._submit } >Submit
              </button>
            </div>
          </div>
          <div id="rankedList" className="row">
            { this.state.items }
          </div>
        </div>
      );
  },

  /**
   * Builds ranking object from rendered items
   * @return {object} hashmap with item IDs and their submitted rank
   */
  _parseItemPositions() {
    let parsedItemPositions = {};

    for (let item of this.state.items) {
      let itemId = item.props.itemId;
      parsedItemPositions[itemId] = RankedListStore.getPositionByItemId(itemId);
    }

    return parsedItemPositions;
  },

  _submit(e) {
    e.preventDefault();
    
    let data = {
      alias: this.props.listId,
      ranking: JSON.stringify(this._parseItemPositions()) // easier to send object as text
    };
    
    $.ajax({
      type: 'POST',
      url: '/db/rank',
      data: data,
      success(result) {
        console.log(result);
      },
      error(xhr, err, text) {
        console.log(xhr, err, text);
      }
    });
  },

  _updateList() {
    this.setState({
      listPrompt: RankedListStore.getListMessage(),
      items: renderItems(RankedListStore.getRankedList()),
      isRankable: RankedListStore.getRankingState()
    });
  }
});

module.exports = RankedList;

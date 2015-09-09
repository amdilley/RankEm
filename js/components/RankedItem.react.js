const React = require('react');
const ReactPropTypes = React.PropTypes;

// actions
const RankedListActions = require('../actions/RankedListActions');

// stores
const RankedListStores = require('../stores/RankedListStore');

const RankedItem = React.createClass({
  propTypes: {
    initialPosition: ReactPropTypes.number,
    itemId: ReactPropTypes.string,
    text: ReactPropTypes.string
  },

  getInitialState() {
    return {
      position: this.props.initialPosition
    };
  },

  componentDidMount() {
    RankedListStores.addMoveListener(() => {
      this.setState({
        position: RankedListStores.getPositionByItemId(this.props.itemId)
      });
    });
  },

  componentWillUnmount() {
    RankedListStores.removeMoveListener(() => {

    });
  },

  render() {
    let classes = [ 'ranked-item', 'col-xs-12', 'item-' + this.state.position ];

    return (
        <div className={ classes.join(' ') }>
          <div className="item-text">{ this.props.text }</div>
          <div className="item-controls">
            <div className="move-up fa fa-chevron-up"
              onClick={ this._moveUp }>
            </div>
            <div className="move-down fa fa-chevron-down"
              onClick={ this._moveDown }>
            </div>
          </div>
        </div>
      );
  },

  _moveDown() {
    RankedListActions.moveDown(this.state.position);
  },

  _moveUp() {
    RankedListActions.moveUp(this.state.position);
  }
});

module.exports = RankedItem;

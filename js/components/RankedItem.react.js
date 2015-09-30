const React = require('react');
const ReactPropTypes = React.PropTypes;

// actions
const RankedListActions = require('../actions/RankedListActions');

// stores
const RankedListStores = require('../stores/RankedListStore');

const cx = require('classnames');

const RankedItem = React.createClass({
  propTypes: {
    initialPosition: ReactPropTypes.number,
    itemId: ReactPropTypes.string,
    text: ReactPropTypes.string,
    totalItems: ReactPropTypes.number
  },

  getInitialState() {
    return {
      position: this.props.initialPosition,
      isFirstItem: this.props.initialPosition === 0,
      isLastItem: this.props.initialPosition === this.props.totalItems - 1
    };
  },

  componentDidMount() {
    RankedListStores.addMoveListener(() => {
      let position = RankedListStores.getPositionByItemId(this.props.itemId);

      this.setState({
        position: position,
        isFirstItem: position === 0,
        isLastItem: position === this.props.totalItems - 1
      });
    });
  },

  componentWillUnmount() {
    RankedListStores.removeMoveListener(() => {

    });
  },

  render() {
    let classes = [ 'ranked-item', 'col-xs-12', 'item-' + this.state.position ];
    let upClasses = cx({
      'move-up': true,
      'fa': true,
      'fa-chevron-up': true,
      'disabled': this.state.isFirstItem
    });
    let downClasses = cx({
      'move-down': true,
      'fa': true,
      'fa-chevron-down': true,
      'disabled': this.state.isLastItem
    });

    return (
        <div className={ classes.join(' ') }>
          <div className="item-text">{ this.props.text }</div>
          <div className="item-controls">
            <div className={ upClasses }
              onClick={ this._moveUp }>
            </div>
            <div className={ downClasses }
              onClick={ this._moveDown }>
            </div>
          </div>
        </div>
      );
  },

  _moveDown() {
    if (!this.state.isLastItem) {
      RankedListActions.moveDown(this.state.position);
    }
  },

  _moveUp() {
    if (!this.state.isFirstItem) {
      RankedListActions.moveUp(this.state.position);
    }
  }
});

module.exports = RankedItem;

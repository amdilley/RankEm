const React = require('react');
const ReactPropTypes = React.PropTypes;

// actions
const RankedListActions = require('../actions/RankedListActions');

function renderOptions(options) {
  return options.map((option, i) => {
    return (
        <option value={ option.id } key={ i }>{ option.name }</option>
      );
  });
}

const SelectOptions = React.createClass({
  propTypes: {
    id: ReactPropTypes.string,
    numChoices: ReactPropTypes.number,
    path: ReactPropTypes.string
  },

  getInitialState() {
    return {
      options: []
    };
  },

  componentDidMount() {
    $.get(this.props.path, (data) => {
      RankedListActions.select(data[0].id);
      this.setState({
        options: renderOptions(data)
      });
    });
  },

  componentWillUnmount() {

  },

  render() {
    return (
        <select
          id={ this.props.id }
          className="form-control"
          multiple={ this.props.numChoices > 1 }
          onChange={ this._select } >
          { this.state.options }
        </select>
      );
  },

  _select(e) {
    var optionValues = $(e.target).val();

    RankedListActions.select(optionValues);
  }
});

module.exports = SelectOptions;

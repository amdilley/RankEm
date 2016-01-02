const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const Chosen = require('react-chosen');

function renderOptions(options) {
  // Make sure first option isn't auto selected
  options.unshift({
    id: '',
    value: ''
  });

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
    path: ReactPropTypes.string,
    placeholder: ReactPropTypes.string,
    loadHandler: ReactPropTypes.func,
    changeHandler: ReactPropTypes.func
  },

  getInitialState() {
    return {
      options: []
    };
  },

  componentDidMount() {
    $.get(this.props.path, (data) => {
      if (this.props.loadHandler) {
        this.props.loadHandler(data);
      }

      this.setState({
        options: renderOptions(data)
      });
    });
  },

  componentWillReceiveProps(props) {
    $.get(props.path, (data) => {
      if (props.loadHandler) {
        props.loadHandler(data);
      }

      this.setState({
        options: renderOptions(data)
      });
    });
  },

  render() {
    return (
        <Chosen
          id={ this.props.id }
          className="form-control"
          data-placeholder={ this.props.placeholder }
          multiple={ this.props.numChoices > 1 }
          maxSelectedOptions={ this.props.numChoices }
          width="100%"
          onChange={ this.props.changeHandler } >
          { this.state.options }
        </Chosen>
      );
  }
});

module.exports = SelectOptions;

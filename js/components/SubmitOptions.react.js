const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const SelectOptions = require('./SelectOptions.react');

// stores
const RankedListStore = require('../stores/RankedListStore');

const SubmitOptions = React.createClass({
  propTypes: {
    listId: ReactPropTypes.string
  },

  getInitialState() {
    return {
      listPrompt: '',
      categoryId: '',
      numChoices: 1,
      options: []
    };
  },

  componentDidMount() {
    RankedListStore.addChangeListener(() => {
      this._updateSelection();
    });
  },

  componentWillUnmount() {
    RankedListStore.removeChangeListener(() => {
      this._updateSelection();
    });
  },

  render() {
    return (
        <form>
          <h2>{ this.state.listPrompt }</h2>
          <div className="form-group">
            <label htmlFor="categoryOption">Option</label>
            <CategoryOptions
              id="categoryOption"
              numChoices={ this.state.numChoices }
              path={  '/db/options/' + this.state.categoryId } />
          </div>
          <div className="form-group">
            <div className="col-sm-10">
              <button
                className="btn btn-default"
                onClick={ this._submit } >Submit
              </button>
            </div>
          </div>
        </form>
      );
  },

  _submit(e) {
    e.preventDefault();

    let data = {
      listId: this.props.listId,
      options: this.state.options,
    };

    if (this._validateForm()) {
      $.ajax({
        type: 'POST',
        url: '/db/select',
        data: data,
        success(result) {
          console.log(result);
        },
        error(xhr, err, text) {
          console.log(xhr, err, text);
        }
      });
    }
  },

  _updateSelection() {
    this.setState({
      options: RankedListStore.getOptions()
    });
  },

  _validateForm() {
    return this._validateSelection();
  },

  _validateSelection() {
    return this.state.options.length <= this.state.numChoices;
  }
});

module.exports = SubmitOptions;

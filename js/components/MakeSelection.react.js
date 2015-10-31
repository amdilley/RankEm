const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const SelectOptions = require('./SelectOptions.react');

// actions
const RankedListActions = require('../actions/RankedListActions');

// stores
const RankedListStore = require('../stores/RankedListStore');

const cx = require('classnames');

const MakeSelection = React.createClass({
  propTypes: {
    alias: ReactPropTypes.string
  },

  getInitialState() {
    return {
      categoryId: '',
      isHidden: true,
      listPrompt: '',
      numChoices: 1,
      selectedOptions: [],
      renderedOptions: null
    };
  },

  componentDidMount() {
    RankedListStore.addChangeListener(() => {
      this._updateSelection();
    });

    $.get('/db/category-options/' + this.props.alias, (data) => {
      let renderedOptions = (
          <SelectOptions
            id="categoryOption"
            numChoices={ +data.numChoices }
            path={  '/db/options/' + data.categoryId }
            placeholder={ 'Select ' + data.numChoices }
            loadHandler={ this._onOptionsLoad }
            changeHandler={ this._onSelectChange } />
        );

      this.setState({
        categoryId: data.categoryId,
        isHidden: false,
        listPrompt: data.listPrompt,
        numChoices: data.numChoices,
        renderedOptions: renderedOptions
      });
    });
  },

  componentWillUnmount() {
    RankedListStore.removeChangeListener(() => {
      this._updateSelection();
    });
  },

  render() {
    let classes = cx({
      'hidden': this.state.isHidden
    });

    return (
        <form className={ classes } >
          <h2>
            { this.state.listPrompt }
          </h2>
          <div className="form-group">
            { this.state.renderedOptions }
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

  _onOptionsLoad(data) {
    RankedListActions.select(data[0].id);
  },

  _onSelectChange(e) {
    let optionValues = $(e.target).val();

    RankedListActions.select(optionValues);
  },

  _submit(e) {
    e.preventDefault();

    let data = {
      alias: this.props.alias,
      options: this.state.selectedOptions.join(','), // easier to send as string then parse on server
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
      selectedOptions: RankedListStore.getOptions()
    });
  },

  _validateForm() {
    return this._validateSelection();
  },

  _validateSelection() {
    return this.state.selectedOptions.length <= this.state.numChoices;
  }
});

module.exports = MakeSelection;

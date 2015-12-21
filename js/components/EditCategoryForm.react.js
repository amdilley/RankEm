const React = require('react');

const cx = require('classnames');

// nested components
const SelectOptions = require('./SelectOptions.react');

const EditCategoryForm = React.createClass({
  getInitialState() {
    return {
      isHidden: true,
      renderedCategories: null,
      renderedOptions: null
    };
  },

  componentDidMount() {
    let renderedCategories = (
        <SelectOptions
          id="categories"
          numChoices={ 1 }
          path="/db/categories"
          placeholder="Select category to edit"
          changeHandler={ this._onSelectChange } />
      );

    this.setState({
      isHidden: false,
      renderedCategories: renderedCategories,
    });
  },

  render() {
    let classes = cx({
      'hidden': this.state.isHidden
    });

    return (
        <form className={ classes } >
          <h2>Edit Categories</h2>
          <div className="form-group">
            { this.state.renderedCategories }
            { this.state.renderedOptions }
          </div>
        </form>
      );
  },

  _onOptionsChange(e) {
    let categoryOptionsId = $(e.target).val();

    // console.log(categoryOptionsId);
  },

  _onSelectChange(e) {
    let categoryId = $(e.target).val();

    this._renderCategoryOptions(categoryId);
  },

  _renderCategoryOptions(categoryId) {
    let renderCategoryOptions = (
        <SelectOptions
          id="options"
          numChoices={ 100 }
          path={ '/db/options/' + categoryId }
          placeholder="Select options to remove"
          changeHandler={ this._onOptionsChange } />
      );

    this.setState({
      renderedOptions: renderCategoryOptions
    });
  }
});

module.exports = EditCategoryForm;

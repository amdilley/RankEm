const React = require('react');

const cx = require('classnames');

// nested components
const SelectOptions = require('./SelectOptions.react');

const EditCategoryForm = React.createClass({
  getInitialState() {
    return {
      isHidden: true,
      renderedCategories: null
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
      renderedCategories: renderedCategories
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
          </div>
        </form>
      );
  },

  _onSelectChange(e) {
    let category = $(e.target).val();

    console.log(category);
  }
});

module.exports = EditCategoryForm;

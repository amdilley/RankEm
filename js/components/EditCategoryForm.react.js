const React = require('react');

const cx = require('classnames');

// nested components
const SelectOptions = require('./SelectOptions.react');

const EditCategoryForm = React.createClass({
  getInitialState() {
    return {
      isHidden: true,
      isParentCategory: false,
      isToggleDisabled: false,
      categoryId: '',
      renderedCategories: null,
      renderedAddOptions: null,
      renderedRemoveOptions: null
    };
  },

  componentDidMount() {
    let renderedCategories = (
        <SelectOptions
          id="categories"
          numChoices={ 1 }
          path="/db/categories"
          placeholder="Select category to edit"
          changeHandler={ this._onCategoriesChange } />
      );

    // toggle initializer and listener
    $('#hasChildrenToggle').bootstrapToggle();
    $('#hasChildrenToggle').change(this._onChildrenToggle);

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
            <div className="checkbox">
              <label>
                Is category a parent category?
                <input id="hasChildrenToggle"
                  type="checkbox"
                  disabled={ this.state.isToggleDisabled }
                  data-toggle="toggle"
                  data-on="Yes"
                  data-off="No"
                  data-size="small" />
              </label>
            </div>
            { this.state.renderedCategories }
            { this.state.renderedAddOptions }
            { this.state.renderedRemoveOptions }
          </div>
        </form>
      );
  },

  _onChildrenToggle(e) {
    this.setState({
      isParentCategory: $(e.target).is(':checked')
    });

    this._renderCategoryAddOptions();
  },

  _onCategoriesChange(e) {
    let categoryId = $(e.target).val();

    $.get('/db/category/' + categoryId, (data) => {
      let isDisabledParent = data['child_categories'] !== null;

      this.setState({
        isToggleDisabled: isDisabledParent,
        isParentCategory: isDisabledParent,
        categoryId: categoryId
      });

      this._renderCategoryAddOptions();
      this._renderCategoryRemoveOptions();
    });
  },

  _onOptionsChange(e) {
    let categoryOptionsId = $(e.target).val();

    // console.log(categoryOptionsId);
  },

  _renderCategoryAddOptions() {
    // TODO: add db query for eligible child categories. No loops allowed
    let renderAddOptions = this.state.isParentCategory ? (
        <SelectOptions
          id="options"
          numChoices={ 100 }
          path={ '/db/categories' }
          placeholder="Select categories to add"
          changeHandler={ this._onOptionsChange } />
      ) : null;

    this.setState({
      renderedAddOptions: renderAddOptions
    });
  },

  _renderCategoryRemoveOptions() {
    let renderRemoveOptions = this.state.categoryId ? (
        <SelectOptions
          id="options"
          numChoices={ 100 }
          path={ '/db/options/' + this.state.categoryId }
          placeholder="Select options to remove"
          changeHandler={ this._onOptionsChange } />
      ) : null;

    this.setState({
      renderedRemoveOptions: renderRemoveOptions
    });
  }
});

module.exports = EditCategoryForm;

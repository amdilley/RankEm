const React = require('react');

const cx = require('classnames');

// nested components
const SelectOptions = require('./SelectOptions.react');

const EditCategoryForm = React.createClass({
  getInitialState() {
    return {
      isCategoryDataLoaded: false,
      isFormHidden: true,
      isNewOptionsInputHidden: true,
      isParentCategory: false,
      isToggleDisabled: false,
      categoryId: null,
      categoryName: null,
      childCategories: null,
      newOptions: null,
      renderedCategories: null,
      renderedAddOptions: null,
      renderedRemoveOptions: null,
      stagedAddedCategories: [],
      stagedRemovedCategories: []
    };
  },

  componentDidMount() {
    let renderedCategories = (
        <SelectOptions
          id="categories"
          numChoices={ 1 }
          path="/db/categories"
          placeholder="Select category to edit"
          changeHandler={ this._handleCategoriesChange } />
      );

    // toggle initializer and listener
    $('#hasChildrenToggle').bootstrapToggle();
    $('#hasChildrenToggle').change(this._handleChildrenToggle);

    this.setState({
      isFormHidden: false,
      renderedCategories: renderedCategories,
    });
  },

  render() {
    let formClasses = cx({
      'hidden': this.state.isFormHidden
    });
    let newOptionsClasses = cx({
      'form-group': true,
      'hidden': this.state.isNewOptionsInputHidden
    });
    let childAddClasses = cx({
      'form-group': true,
      'hidden': !this.state.isNewOptionsInputHidden
    });
    let childRemoveClasses = cx({
      'form-group': true,
      'hidden': !this.state.isCategoryDataLoaded
    });

    return (
        <form className={ formClasses } >
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
          </div>
          <div className="form-group">
            { this.state.renderedCategories }
          </div>
          <div className={ childRemoveClasses }>
            <input
              type="text"
              id="categoryName"
              className="form-control"
              placeholder="Category name"
              value={ this.state.categoryName }
              onChange={ this._handleCategoryNameChange } />
          </div>
          <div className={ newOptionsClasses }>
            <input
              type="text"
              id="addNewOptions"
              className="form-control"
              placeholder="Enter new options separated by ;"
              value={ this.state.newOptions }
              onChange={ this._handleNewOptionsChange } />
          </div>
          <div className={ childAddClasses }>
            { this.state.renderedAddOptions }
          </div>
          <div className={ childRemoveClasses }>
            { this.state.renderedRemoveOptions }
          </div>
          <div className="form-group">
            <div className="col-sm-10">
              <button
                className="btn btn-default"
                onClick={ this._submit } >Update Category
              </button>
            </div>
          </div>
        </form>
      );
  },

  _getFormattedChildCategories() {
    let removedCategoryIds = this.state.stagedRemovedCategories;
    let formattedChildCategories = this.state.childCategories;

    if (formattedChildCategories === null) {
      return this.state.stagedAddedCategories.join(',');
    }

    for (let categoryId of removedCategoryIds) {
      formattedChildCategories = formattedChildCategories.replace(categoryId, '')
                                                         .replace(/^,|,(?=,)|,$/, '');
    }

    return formattedChildCategories + ',' + this.state.stagedAddedCategories.join(',');
  },

  _handleAddOptionsChange(e) {
    this._handleChange($(e.target).val(), 'stagedAddedCategories');
  },

  _handleCategoryNameChange(e) {
    this._handleChange(e.target.value, 'categoryName');
  },

  _handleChildrenToggle(e) {
    this.setState({
      isParentCategory: $(e.target).is(':checked'),
      isNewOptionsInputHidden: !this.state.isNewOptionsInputHidden
    });

    this._renderCategoryAddOptions();
  },

  _handleCategoriesChange(e) {
    let categoryId = $(e.target).val();
    let categoryName = $(e.target).find('[value="' + categoryId + '"]').text();

    this.setState({
      categoryId,
      categoryName,
      isToggleDisabled: false,
      isParentCategory: false,
      stagedAddedCategories: [],
      stagedRemovedCategories: []
    });

    this._renderCategoryAddOptions();
    this._renderCategoryRemoveOptions();
  },

  _handleChange(value, paramName) {
    this.setState({
      [ (() => paramName)() ]: value
    });
  },

  _handleCurrentChildrenLoad(currentChildren) {
    let togglePosition = 'off';
    let toggleState = 'enable';
    let childCategories = null;
    let isToggleDisabled = false;
    let isNewOptionsInputHidden = false;
    let isParentCategory = false;

    if (currentChildren.length > 0 && currentChildren[0]['path_root']) { // parent category
      togglePosition = 'on';
      toggleState = 'disable';
      childCategories = currentChildren.map((el) => {
          return el.id;
        }).join(',');
      isToggleDisabled = true;
      isNewOptionsInputHidden = true;
      isParentCategory = true;
    } else if (currentChildren.length > 0) { // non parent category with children
      isToggleDisabled = true;
    }

    $('#hasChildrenToggle').bootstrapToggle(togglePosition);
    $('#hasChildrenToggle').bootstrapToggle(toggleState);

    this.setState({
      childCategories,
      isToggleDisabled,
      isNewOptionsInputHidden,
      isParentCategory,
      isCategoryDataLoaded: true
    });
  },

  _handleNewOptionsChange(e) {
    this._handleChange(e.target.value, 'newOptions');
  },

  _handleRemoveOptionsChange(e) {
    this._handleChange($(e.target).val(), 'stagedRemovedCategories');
  },

  _renderCategoryAddOptions() {
    let renderAddOptions = this.state.isParentCategory ? (
        <SelectOptions
          id="eligible-children"
          numChoices={ 100 }
          path={ '/db/eligible-categories/' + this.state.categoryId }
          placeholder="Select categories to add"
          changeHandler={ this._handleAddOptionsChange } />
      ) : null;

    this.setState({
      renderedAddOptions: renderAddOptions
    });
  },

  _renderCategoryRemoveOptions() {
    let renderRemoveOptions = this.state.categoryId ? (
        <SelectOptions
          id="current-children"
          numChoices={ 100 }
          path={ '/db/current-categories/' + this.state.categoryId }
          placeholder="Select options to remove"
          loadHandler={ this._handleCurrentChildrenLoad }
          changeHandler={ this._handleRemoveOptionsChange } />
      ) : null;

    this.setState({
      renderedRemoveOptions: renderRemoveOptions
    });
  },

  _resetForm() {
    window.location.reload(true);
  },

  _submit(e) {
    e.preventDefault();

    let data = {
      categoryId: this.state.categoryId,
      categoryName: this.state.categoryName,
      childCategories: this._getFormattedChildCategories(),
      newOptions: this.state.newOptions,
      addedCategories: this.state.stagedAddedCategories.join(','),
      removedCategories: this.state.stagedRemovedCategories.join(','),
      isParentCategory: this.state.isParentCategory
    };
    let ajaxOptions = {
      type: 'POST',
      url: '/db/update-category',
      data: data,
      success: (result) => {
        this._resetForm();
        console.log(result);
      },
      error: (xhr, err, text) => {
        console.log(xhr, err, text);
      }
    };

    if (this._validateForm()) {
      $.ajax(ajaxOptions);
    }
  },

  _validateCategoryName() {
    return this.state.categoryName.length > 0;
  },

  _validateForm() {
    return this._validateCategoryName();
  }
});

module.exports = EditCategoryForm;

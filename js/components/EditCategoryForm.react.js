const React = require('react');

const cx = require('classnames');

// nested components
const SelectOptions = require('./SelectOptions.react');

const EditCategoryForm = React.createClass({
  getInitialState() {
    return {
      isFormHidden: true,
      isParentCategory: false,
      isToggleDisabled: false,
      areChildOptionsHidden: true,
      categoryId: '',
      categoryName: '',
      childCategories: '',
      pathRoot: '',
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
          changeHandler={ this._onCategoriesChange } />
      );

    // toggle initializer and listener
    $('#hasChildrenToggle').bootstrapToggle();
    $('#hasChildrenToggle').change(this._onChildrenToggle);

    this.setState({
      isFormHidden: false,
      renderedCategories: renderedCategories,
    });
  },

  render() {
    let formClasses = cx({
      'hidden': this.state.isFormHidden
    });
    let optionClasses = cx({
      'form-group': true,
      'hidden': this.state.areChildOptionsHidden
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
          <div className={ optionClasses }>
            { this.state.renderedAddOptions }
          </div>
          <div className={ optionClasses }>
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

    for (let categoryId of removedCategoryIds) {
      formattedChildCategories = formattedChildCategories.replace(categoryId, '')
                                                         .replace(/^,|,(?=,)|,$/, '');
    }

    return formattedChildCategories + ',' + this.state.stagedAddedCategories.join(',')
  },

  _onAddOptionsChange(e) {
    let addedCategoryIds = $(e.target).val();

    this.setState({
      stagedAddedCategories: addedCategoryIds
    });
  },

  _onChildrenToggle(e) {
    this.setState({
      isParentCategory: $(e.target).is(':checked')
    });

    this._renderCategoryAddOptions();
  },

  _onCategoriesChange(e) {
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

  _onCurrentChildrenLoad(currentChildren) {
    let togglePosition = 'off';
    let toggleState = 'enable';

    if (currentChildren.length > 0) {
      let pathRoot = currentChildren[0]['path_root'];
      let childCategories = currentChildren.map((el) => {
          return el.id;
        }).join(',');

      $('#hasChildrenToggle').bootstrapToggle('on');
      $('#hasChildrenToggle').bootstrapToggle('disable');

      this.setState({
        childCategories,
        pathRoot,
        isToggleDisabled: true,
        isParentCategory: true,
        areChildOptionsHidden: false
      });
    } else {
      $('#hasChildrenToggle').bootstrapToggle('off');
      $('#hasChildrenToggle').bootstrapToggle('enable');
    }
  },

  _onRemoveOptionsChange(e) {
    let removedCategoryIds = $(e.target).val();

    this.setState({
      stagedRemovedCategories: removedCategoryIds
    });
  },

  _renderCategoryAddOptions() {
    let renderAddOptions = this.state.isParentCategory ? (
        <SelectOptions
          id="eligible-children"
          numChoices={ 100 }
          path={ '/db/eligible-categories/' + this.state.categoryId }
          placeholder="Select categories to add"
          changeHandler={ this._onAddOptionsChange } />
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
          loadHandler={ this._onCurrentChildrenLoad }
          changeHandler={ this._onRemoveOptionsChange } />
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

    ;

    let data = {
      categoryId: this.state.categoryId,
      categoryName: this.state.categoryName,
      childCategories: this._getFormattedChildCategories(),
      pathRoot: this.state.pathRoot,
      addedCategories: this.state.stagedAddedCategories.join(','),
      removedCategories: this.state.stagedRemovedCategories.join(',')
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

  _validateForm() {
    return true;
  }
});

module.exports = EditCategoryForm;

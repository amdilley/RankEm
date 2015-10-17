const React = require('react');
const ReactPropTypes = React.PropTypes;

const CATEGORY_NAME_REGEX = /^\w+(\s\w+)?(\s\w+)?$/g;
const MAX_CATEGORY_LENGTH = 80;

const NewCategoryForm = React.createClass({
  getInitialState() {
    return {
      categoryName: '',
    };
  },

  render() {
    return (
        <form className="form-horizontal">
          <div className="form-group">
            <label className="col-xs-2 control-label" htmlFor="categoryName">New Category Name</label>
            <div className="col-xs-6">
              <input
                type="text"
                id="categoryName"
                className="form-control"
                placeholder="Category Name"
                value={ this.state.categoryName }
                onChange={ this._handleNameChange } />
            </div>
          </div>
          <div className="form-group">
            <div className="col-xs-offset-2 col-xs-3">
              <button
                className="btn btn-default"
                onClick={ this._submit } >Add Category
              </button>
            </div>
          </div>
        </form>
      );
  },

  _handleNameChange(e) {
    this.setState({
      categoryName: e.target.value
    });
  },

  _submit(e) {
    e.preventDefault();

    let data = {
      name: this.state.categoryName,
    };

    if (this._validateForm()) {
      $.ajax({
        type: 'POST',
        url: '/db/category',
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

  _validateForm() {
    return this._validateName() && this._validateLength();
  },

  _validateName() {
    return CATEGORY_NAME_REGEX.test(this.state.categoryName);
  },

  _validateLength() {
    return this.state.categoryName.length <= MAX_CATEGORY_LENGTH;
  }
});

module.exports = NewCategoryForm;

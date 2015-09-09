const React = require('react');
const ReactPropTypes = React.PropTypes;

// nested components
const SelectOptions = require('./SelectOptions.react');

// stores
const RankedListStore = require('../stores/RankedListStore');

const PHONE_NUMBER_REGEX = /[^\+x\d,]/g;
const MAX_PROMPT_LENGTH = 200;
const MAX_ITEMS = 20;

const NewListForm = React.createClass({
  getInitialState() {
    return {
      listCategory: '',
      listPrompt: '',
      listRankers: '',
      numChoices: 1,
      expirationDays: 0,
      expirationHours: 6,
      expirationMinutes: 0
    };
  },

  componentDidMount() {
    RankedListStore.addChangeListener(() => {
      this._updateCategory();
    });
  },

  componentWillUnmount() {
    RankedListStore.removeChangeListener(() => {
      this._updateCategory();
    });
  },

  render() {
    return (
        <form>
          <div className="form-group">
            <label htmlFor="listCategory">Category</label>
            <SelectOptions
              id="listCategory"
              numChoices={ 1 }
              path="/db/categories" />
          </div>
          <div className="form-group">
            <label htmlFor="listPrompt">Prompt</label>
            <input
              type="text"
              id="listPrompt"
              className="form-control"
              value={ this.state.listPrompt }
              onChange={ this._handlePromptChange } />
          </div>
          <div className="form-group">
            <label htmlFor="listRankers">Rankers</label>
            <textarea
              id="listRankers"
              className="form-control"
              rows="3"
              value={ this.state.listRankers }
              onChange={ this._handleRankersChange } />
          </div>
          <div className="form-group">
            <label className="radio-label">Submissions Per Ranker</label>
            <label className="radio-inline">
              <input
                type="radio"
                name="choicesPerRanker"
                value="1"
                onChange={ this._handleNumChoicesChange }
                checked={ this.state.numChoices === 1 } /> 1
            </label>
            <label className="radio-inline">
              <input
                type="radio"
                name="choicesPerRanker"
                value="2"
                onChange={ this._handleNumChoicesChange }
                checked={ this.state.numChoices === 2 } /> 2
            </label>
            <label className="radio-inline">
              <input
                type="radio"
                name="choicesPerRanker"
                value="3"
                onChange={ this._handleNumChoicesChange }
                checked={ this.state.numChoices === 3 } /> 3
            </label>
          </div>
          <div className="form-horizontal">
            <label htmlFor="expirationDays" className="expiration-label">Time to Complete Ranking</label>
            <div className="form-group">
              <label htmlFor="expirationDays" className="col-sm-2 control-label">Days</label>
              <div className="col-sm-10">
                <input
                  type="number"
                  id="expirationDays"
                  className="form-control"
                  min="0"
                  max="30"
                  value={ this.state.expirationDays }
                  onChange={ this._handleExpirationDaysChange } />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="expirationHours" className="col-sm-2 control-label">Hours</label>
              <div className="col-sm-10">
                <input
                  type="number"
                  id="expirationHours"
                  className="form-control"
                  min="0"
                  max="23"
                  value={ this.state.expirationHours }
                  onChange={ this._handleExpirationHoursChange } />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="expirationMinutes" className="col-sm-2 control-label">Minutes</label>
              <div className="col-sm-10">
                <input
                  type="number"
                  id="expirationMinutes"
                  className="form-control"
                  min="0"
                  max="59"
                  value={ this.state.expirationMinutes }
                  onChange={ this._handleExpirationMinutesChange } />
              </div>
            </div>
          </div>
          <div className="form-group">
            <div className="col-sm-10">
              <button
                className="btn btn-default"
                onClick={ this._submit } >Create List
              </button>
            </div>
          </div>
        </form>
      );
  },

  _handleChange(value, paramName) {
    this.setState({
      [ (() => paramName)() ]: value
    });
  },

  _handleExpirationDaysChange(e) {
    this._handleChange(+e.target.value, 'expirationDays');
  },

  _handleExpirationHoursChange(e) {
    this._handleChange(+e.target.value, 'expirationHours');
  },

  _handleExpirationMinutesChange(e) {
    this._handleChange(+e.target.value, 'expirationMinutes');
  },

  _handleNumChoicesChange(e) {
    this._handleChange(+e.target.value, 'numChoices');
  },

  _handlePromptChange(e) {
    this._handleChange(e.target.value, 'listPrompt');
  },

  _handleRankersChange(e) {
    this._handleChange(e.target.value, 'listRankers');
  },

  _submit(e) {
    e.preventDefault();

    let data = {
      categoryId: this.state.listCategory,
      message: this.state.listPrompt,
      days: this.state.days,
      hours: this.state.hours,
      minutes: this.state.minutes,
      rankers: this.state.listRankers.replace(PHONE_NUMBER_REGEX, ''),
      itemsPerRanker: this.state.numChoices
    };

    if (this._validateForm()) {
      $.ajax({
        type: 'POST',
        url: '/db/list',
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

  _updateCategory() {
    this.setState({
      listCategory: RankedListStore.getOptions()[0]
    });
  },

  _validateForm() {
    return this._validatePrompt() && this._validateItems();
  },

  _validatePrompt() {
    let promptLength = this.state.listPrompt.length;

    return promptLength <= MAX_PROMPT_LENGTH && promptLength > 0;
  },

  _validateItems() {
    let numRankers = this.state.listRankers.split(',').length;
    let totalItems = numRankers * this.state.numChoices;

    return totalItems <= MAX_ITEMS && totalItems > 0;
  }
});

module.exports = NewListForm;

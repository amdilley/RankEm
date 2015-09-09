const React = require('react');

const AppDispatcher = require('../dispatcher/AppDispatcher');
const RankedListConstants = require('../constants/RankedListConstants');

const EventEmitter = require('events').EventEmitter;
const assign = require('object-assign');

const CHANGE_EVENT = 'change';
const MOVE_EVENT = 'move';

let _listMessage = '';
let _rankedList = [];
let _selectOptions = [];

const RankedListStore = assign({}, EventEmitter.prototype, {
  /**
   * @param {function} callback
   */
  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  addMoveListener(callback) {
    this.on(MOVE_EVENT, callback);
  },

  emitChange() {
    this.emit(CHANGE_EVENT);
  },

  emitMove() {
    this.emit(MOVE_EVENT);
  },

  /**
   * @param {string} itemId UUID of item
   */
  getPositionByItemId(itemId) {
    for (var i = 0, l = _rankedList.length; i < l; i++) {
      if (_rankedList[i].id === itemId) {
        return i;
      }
    }

    // return -1 if no matching item is found
    return -1;
  },

  getOptions() {
    return _selectOptions;
  },

  /**
   * @param {array} options array of chosen options
   */
  setOptions(options) {
    _selectOptions = options;
  },

  getListMessage() {
    return _listMessage;
  },

  /**
   * @param {string} message text to prompt user's ranking
   */
  setListMessage(message) {
    _listMessage = message;
  },

  getRankedList() {
    return _rankedList;
  },

  /**
   * @param {array} list array of list items
   */
  setRankedList(list) {
    _rankedList = list;
  },

  /**
   * @param {function} callback
   */
  removeChangeListener(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeMoveListener(callback) {
    this.removeListener(MOVE_EVENT, callback);
  },

  /**
   * @param {number} positionA first position to be swapped
   * @param {number} positionB second position to be swapped
   */
  swapItemOrder(positionA, positionB) {
    let temp = _rankedList[positionA];

    _rankedList[positionA] = _rankedList[positionB];
    _rankedList[positionB] = temp;
  }
});

// Register to handle all updates
AppDispatcher.register(payload => {
  let action = payload.action;

  switch (action.actionType) {
    case RankedListConstants.MOVE_DOWN:
      RankedListStore.swapItemOrder(action.position, action.position + 1);
      RankedListStore.emitMove();
      break;

    case RankedListConstants.MOVE_UP:
      RankedListStore.swapItemOrder(action.position, action.position - 1);
      RankedListStore.emitMove();
      break;

    case RankedListConstants.SELECT:
      RankedListStore.setOptions(action.options);
      RankedListStore.emitChange();
      break;

    case RankedListConstants.UPDATE:
      RankedListStore.setListMessage(action.listMessage);
      RankedListStore.setRankedList(action.items);
      RankedListStore.emitChange();
      break;

    default:
      return true;
  }

  return true; // needed by promise in Dispatcher
});

module.exports = RankedListStore;

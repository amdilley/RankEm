const AppDispatcher = require('../dispatcher/AppDispatcher');
const RankedListConstants = require('../constants/RankedListConstants');

const RankedListActions = {
  /**
   * @param {number} position index of item moving down
   */
  moveDown(position) {
    AppDispatcher.handleViewAction({
      position,
      actionType: RankedListConstants.MOVE_DOWN
    });
  },

  /**
   * @param {number} position index of item moving up
   */
  moveUp(position) {
    AppDispatcher.handleViewAction({
      position,
      actionType: RankedListConstants.MOVE_UP
    });
  },

  /**
   * @param {array} options array of options selected
   */
  select(options) {
    AppDispatcher.handleViewAction({
      options,
      actionType: RankedListConstants.SELECT
    });
  },

  /**
   * @param {array} listData new list data to set
   */
  update(listData) {
    AppDispatcher.handleViewAction({
      listMessage: listData.message,
      items: listData.items,
      actionType: RankedListConstants.UPDATE
    });
  },

  /**
   * Submits currently ranked list
   */
  submitRanking() {
    AppDispatcher.handleViewAction({
      actionType: RankedListConstants.SUBMIT_RANKING
    });
  }
};

module.exports = RankedListActions;

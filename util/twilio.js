var twilio = require('twilio');
var creds = require('../credentials.js');

var ACCOUNT_SID = creds.twilio.accountSid;
var AUTH_TOKEN = creds.twilio.authToken;

var TWILIO_SENDER = '+12064881510';

var Twilio = function () {
  this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
};

Twilio.prototype = {
  /**
   * Sends text to specified numbers
   * @param {array} recipients array of phone numbers set to receive text message
   * @param {string} message text to be sent
   */
  send: function (recipients, message) {
    for (var i = 0, l = recipients.length; i < l; i++) {
      this.client.messages.create({
        from: TWILIO_SENDER,
        to: recipients[i],
        body: message
      }, function (err, message) {
        console.log(err, message.sid);
      });
    }
  }
};

module.exports = Twilio;

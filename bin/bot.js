'use strict';

var Shiftbot = require('../lib/shiftbot');

var token = 'xoxb-255653306450-XLRFm73zaBTvGPmfCuscOM9q';
var name = process.env.BOT_NAME;

var shiftbot = new Shiftbot({
    token: token,
    name: name
});

shiftbot.run();
var Bot = require('slackbots');
var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var settings = {
    token: 'xoxb-255653306450-XLRFm73zaBTvGPmfCuscOM9q',
    name: 'shiftbot'
}
var bot = new Bot(settings);

bot.on('start', function(){
    bot.postMessageToUser('gov', 'asuh dewd');
});

var shiftbot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'shiftbot';
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'shiftbot.db');

    this.user = null;
    this.db = null;
};

util.inherits(shiftbot, Bot);

shiftbot.prototype.run = function(){
    shiftbot.super_.call(this, this.settings);
    
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
}

shiftbot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

shiftbot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

shiftbot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

shiftbot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

shiftbot.prototype._welcomeMessage = function () {
    this.postMessageToUser('gov', 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

shiftbot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromShiftbot(message) &&
        this._isMentioningChuckNorris(message)
    ) {
        this._replyWithRandomJoke(message);
    }
};

shiftbot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

shiftbot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

shiftbot.prototype._isFromShiftbot = function (message) {
    return message.user === this.user.id;
};

shiftbot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('chuck norris') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

shiftbot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

var NorrisBot = require('../lib/norrisbot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var norrisbot = new NorrisBot({
    token: token,
    dbPath: dbPath,
    name: name
});

shiftbot.run();


module.exports = shiftbot;
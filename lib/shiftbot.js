'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var scheduler = require('node-schedule');
var CronJob = require('cron').CronJob;
var async = require('async');
const { exec } = require('child_process');

/**
 * Shiftbot: a bot deployed onto slack that refers to instances of google 
 * calendar to return or notify who is at the tech desk/eclassroom.
 * More calendars can be linked with the calendar ID.
 * 
 * Also sends reminders to a student at the desk at specific times using
 * Cron jobs.
 *
 * Created by Govind Mohan
 */

//Set the channel for shiftbot to post on
var channel = 'shiftbot_beta';

//calendar IDs
var techDeskCalendar = 'vicu.utoronto.ca_q4fv9ramvdcg8tf3vo3v2ojesg@group.calendar.google.com';
var eClassroomCalendar = 'vicu.utoronto.ca_7ao0hkgfi2aec46if2sn1pba4g@group.calendar.google.com';


//Initialize
var Shiftbot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'shiftbot';

    this.user = null;
    this.db = null;
};

util.inherits(Shiftbot, Bot);

Shiftbot.prototype.run = function () {
    Shiftbot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

Shiftbot.prototype._onStart = function() {
    var self = this;
    
    this._loadBotUser();

    //Set reminders as Cron Jobs below
    new CronJob('00 55 11 * * 1-5', function() { 
        postReminder(self, "disarm and open eclassroom");
    }, null, true, "America/New_York");

    new CronJob('00 00 14 * * 1-5', function() { 
        postReminder(self, "check eclassroom and update stats");
    }, null, true, "America/New_York");

    new CronJob('00 00 16 * * 1-5', function() { 
        postReminder(self, "check eclassroom and update stats");
    }, null, true, "America/New_York");

}

//Posts the message sent by the Cron job when called
function postReminder(self, message) {
    exec('node ./lib/list_events.js ' + techDeskCalendar, (err, stdout, stderr) => {
        if(err){
            console.log(err);
        }
        console.log('stdout: ' + stdout);

        const params = {
            link_names: 'true',
            parse : 'full'
        };
        
        self.postMessageToChannel(channel, stdout.replace('\n','') + ", " + message, {as_user: true}, params);
    });
}

//Find out which user is the bot from userlist
Shiftbot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function(user){
        return user.name === self.name;
    })[0];
}

//Once a message is posted in the channel, check if it
//contains 'shiftbot' and if it is not from shiftbot.
//If so, call the calendar api method.
Shiftbot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromShiftbot(message) &&
        this._isMentioningShiftbot(message)
    ) {
        this._replyWithStudent(message);
    }
};

//Check if the given message is a chat message
Shiftbot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

//Check if the given message was posted on a channel
Shiftbot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

//Check if the given message was from this bot
Shiftbot.prototype._isFromShiftbot = function (message) {
    return message.user === this.user.id;
};

//Check if the given message contains "shiftbot" in it
Shiftbot.prototype._isMentioningShiftbot = function (message) {
    return message.text.toLowerCase().indexOf('shiftbot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Calls list_events and supplies it with the calendar to be queried.
 * Then, posts the student at the desk at the channel where the message
 * calling the bot was posted.
 */
Shiftbot.prototype._replyWithStudent = function (originalMessage) {
    var self = this;
    var calendarRef;
    var channel = self._getChannelById(originalMessage.channel);

    console.log(originalMessage.text);

    //Check which desk is mentioned; if neither, respond with format
    if(originalMessage.text.includes('techdesk')){
        calendarRef = techDeskCalendar;
    } else if(originalMessage.text.includes('eclassroom')) {
        calendarRef = eClassroomCalendar;
    } else {
        badInput(self);
        return;
    }

    //call the calendar API script and post appropriate message
    exec('node ./lib/list_events.js ' + calendarRef, (err, stdout, stderr) => {
        if(err){
            console.log(err);
        }
        console.log('stdout: ' + stdout);

        var message;

        if(stdout.indexOf('No events') > -1){
            message = 'No student at the desk currently';
        } else if(originalMessage.text.includes('techdesk')){
            message = 'The student currently at the tech desk is ' + stdout;
        } else {
            message = 'The student currently in the E-classroom is ' + stdout.replace(" (e-classroom shift)", "");
        }
        self.postMessageToChannel(channel.name, message, {as_user: true});
    });
};

//respond with correct format if input is not handled
function badInput(self){
    var message = 'Try \'shiftbot techdesk\' or \'shiftbot eclassroom\' ';
    self.postMessageToChannel(channel, message, {as_user: true});
}

//Find a channel given its ID
Shiftbot.prototype._getChannelById = function (channelId) {
    //this._sendReminder();
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};




module.exports = Shiftbot;
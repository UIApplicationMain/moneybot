/* *****************************************************************************
Copyright 2017 Jeffery Kuo. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License")
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
********************************************************************************

A simplified Slack bot for reporting stocks information.
*/
var envvar = require('dotenv').config()
var Botkit = require('botkit')
var fs = require('fs') // NEW: Add this require (for loading from files).
var express    = require('express'),       // call express
    app        = express()
var bodyParser = require('body-parser')
var tickerreply = require('./tickerreply.js')

var botMode = false;
process.argv.forEach(function (val, index, array) {
	console.log(index + ': ' + val);
	if(index > 1){
		if(val.toLowerCase() == "bot")
			botMode = true;
	}
});

if(botMode){
	var controller = Botkit.slackbot({debug: false})
	// START: Load Slack token from file.
	// Create a .env file with the following key
	// SLACK_API_KEY=BLAH

	if (!process.env.SLACK_API_KEY) {
		console.log('Error: Specify slack_token_path in environment')
		process.exit(1)
	}
	controller.spawn( {token: process.env.SLACK_API_KEY} )
			.startRTM(function (err) {
				if (err) {
					throw new Error(err)
				}
			})
	// END: Load Slack token from file.

	controller.hears(
		[''], ['direct_message', 'direct_mention', 'mention'],
		function (bot, message) {
		// validate data
		var tickers = message.text.split(" ");
		for (var i = 0; i < tickers.length; i++) {
			tickerreply.track(tickers[i], function(data){
				bot.reply(message, data)
			});
		}
	})
}
else{
	app.use( bodyParser.json() );       // to support JSON-encoded bodies
	app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	  extended: true
	})); 
		
	app.post('/stock/', function(req, res){
		var data = ticker.track(req.body.text, function(data){
			console.log('data: ' + data);
			res.send(data);	
		});
	})

	app.listen(4444, function(){
		console.log('Listening for money on port 4444');
	});
}
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

var https = require('https');
var Botkit = require('botkit')
var fs = require('fs') // NEW: Add this require (for loading from files).

var controller = Botkit.slackbot({debug: false})

// START: Load Slack token from file.
if (!process.env.slack_token_path) {
    console.log('Error: Specify slack_token_path in environment')
    process.exit(1)
}

fs.readFile(process.env.slack_token_path, function (err, data) {
    if (err) {
        console.log('Error: Specify token in slack_token_path file')
        process.exit(1)
    }

    data = String(data)
    data = data.replace(/\s/g, '')
    
    controller.spawn( {token: data} )
            .startRTM(function (err) {
                if (err) {
                    throw new Error(err)
                }
            })
})
// END: Load Slack token from file.

controller.hears(
    [''], ['direct_message', 'direct_mention', 'mention'],
    function (bot, message) {
    // create stock url from message
    var finUrl = "https://finance.google.com/finance/info?client=ig&q=" + message.text
    
    https.get(finUrl, function (res) {
        res.setEncoding('binary');
        var resData = "";
        
        res.on('data', function (chunk) {
            return resData += chunk;
        });
        
        res.on('end', function () {
            var preResult = resData.substring(3, resData.length - 1); // Google finance data starts with "//"
            var result = JSON.parse(preResult);
            var json = result[0];

            //var lastTradeDate = Date.parse( json["lt_dts"]) / 1000;
                                  
            var stockSummary = "*" + json["t"] + "*"
                                + "\n>Realtime: http://finance.yahoo.com/quote/" + message.text
                                + "\n*Today*"
                                + "\n>Prev Close: `$" + json["pcls_fix"] + "`"
                                + "\n>Last: `$" + json["l"] + "`"
                                + " Time: `" + json["lt"] + "`"
                                + "\n>Change: `" + json["c"] + "`"
                                + " Change(%): `" + json["cp"] + "`"
                                + "\n*After Hours*"
                                + "\n>Last: `$" + json["el"] + "`"
                                + "  Time: `" + json["elt"] + "`"
                                + "\n>Change: `" + json["ec"] + "`"
                                + " Change(%): `" + json["ecp"] + "`";

            bot.reply(message, stockSummary);
        })
    })
})

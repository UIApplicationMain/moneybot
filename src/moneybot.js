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
var PriceDictionary = {};

var controller = Botkit.slackbot({debug: false})

// START: Load Slack token from file.
if (!process.env.slack_token_path) {
    console.log('Error: Specify slack_token_path in environment')
    process.exit(1)
}


fs.readFile(process.env.slack_token_path, function (err, data) {
    if (err) {
        console.log('Error: Specify token in slack_token_path file');
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
    // validate data
    var tickers = message.text.split(" ");
    for (i = 0; i < tickers.length; i++) {
        track(bot, message, tickers[i]);
    }
})

function track(bot, message, tickerSymbol) {
    // handling for ticker requests starting with $
    if (tickerSymbol.startsWith("$")) {
        tickerSymbol = tickerSymbol.substring(1, tickerSymbol.length);
    }

        // create stock url from message
    var finUrl = "https://finance.google.com/finance/info?client=ig&q=" + tickerSymbol
    
    https.get(finUrl, function (res) {
        res.setEncoding('binary');
        var resData = "";
        
        res.on('data', function (chunk) {
            return resData += chunk;
        });
        
        res.on('end', function () {
            var preResult = resData.substring(3, resData.length - 1); // Google finance data starts with "//"
            try {
                var result = JSON.parse(preResult);
                var json = result[0];
                var url = "http://finance.yahoo.com/quote/" + tickerSymbol;
            
                //var mf = MessageFormatter(json, url);
                var summary = FormatMessage(json, url);
            
                //var lastTradeDate = Date.parse( json["lt_dts"]) / 1000;

                bot.reply(message, summary);
            }
            catch(err) {
                bot.reply(message, ErrorMessage("Invalid ticker symbol: " + tickerSymbol));
            }
        })
        
        res.on('error', function(err){
            bot.reply(message, ErrorMessage(err));
        });
    })
}

//helper functions
function ComparePrevious(ticker, newValue){
    var jsonText;
    ticker = ticker.toUpperCase();
    if(PriceDictionary[ticker]){
        var previousValue = PriceDictionary[ticker];
        var difference = Number(newValue) - previousValue;
        difference = difference.toPrecision(4);
        var percentChange = difference / previousValue;
        percentChange = (percentChange*100).toPrecision(4);
        
        if(difference > 0){
            jsonText = "$" + newValue + ", " + difference + " (+" + percentChange + "%) since last request"; 
        }else if(difference < 0){
            jsonText = "$" + newValue + ", " + difference + " (" + percentChange + "%) since last request"; 
        }else{
            jsonText = "$" + newValue + ", " + difference + " (" + percentChange + "%) since last request"; 
        }
    }
    PriceDictionary[ticker] = Number(newValue);
    return jsonText;
}
function ErrorMessage(err){
    //we can extend this later
    return "An error occured: " + err;
}

//TODO
function GetColor(change){
    var color, percentageSign;
    //green color for positive
    const positive = "#32CD32";
    //red color for negative
    const negative = "#FF0000";
    //light gray color for no change
    const noChange = "#E8E8E8";
    if(Number(change) > 0){
        color = positive;
        percentageSign = "+";
    }else if(Number(change) < 0){
        color = negative;
        percentageSign = "";
    }else{
        color = noChange;
        percentageSign = "";
    }
    return null;
}

function FormatMessage(jsonResult, url){
    var tickerSymbol = jsonResult["t"];
    var previousClose = jsonResult["pcls_fix"];
    var last = jsonResult["l"];
    var lastTime = jsonResult["lt"];
    var change = jsonResult["c"];
    var changePercent = jsonResult["cp"];
    var afterLast = jsonResult["el"];
    var afterLastTime = jsonResult["elt"];
    var afterChange = jsonResult["ec"];
    var afterChangePercent = jsonResult["ecp"];
    
    //green color for positive
    const positive = "#32CD32";
    //red color for negative
    const negative = "#FF0000";
    //light gray color for no change
    const noChange = "#E8E8E8";
    var todayColor, afterColor;
    var percentageSign, afterPercentageSign;

    if(Number(change) > 0){
        todayColor = positive;
        percentageSign = "+";
    }else if(Number(change) < 0){
        todayColor = negative;
        percentageSign = "";
    }else{
        todayColor = noChange;
        percentageSign = "";
    }
    
    if(Number(afterChange) > 0){
        afterColor = positive;
        afterPercentageSign = "+";
    }else if(Number(afterChange) < 0){
        afterColor = negative;
        afterPercentageSign = "";
    }else{
        afterColor = noChange;
        afterPercentageSign = "";
    }

    var previousJSONText = ComparePrevious(tickerSymbol, last);
    if(previousJSONText){
        var previousJSON = {
            "title":"Change since last request",
            "text": previousJSONText,
            "color":"",
            "mrkdwn_in": ["text"]
        }
    }
    
    var daySummary = "Prev Close: *$" + previousClose + "*"
                                + "\nLast: *$" + last + "*"
                                + " Time: `" + lastTime + "`"
                                + "\nChange: *" + change + " (" + percentageSign + changePercent +"%)*";
    var afterSummary = "Last: *$" + afterLast + "*"
                                + " Time: `" + afterLastTime + "`"
                                + "\nChange: *" + afterChange + " (" + afterPercentageSign + afterChangePercent + "%)*";

    var json = {
        "text": "*" + tickerSymbol + "*: " + url,
        "attachments": [
            previousJSON,
            {
                "title": "Day Hours",
                "text": daySummary,
                "color": todayColor,
                "mrkdwn_in": ["text"]
            },
            {
                "title": "After Hours",
                "text": afterSummary,
                "color": afterColor,
                "mrkdwn_in": ["text"]
            }
        ]
    };

    return json;
};
//helper class 
//michael: I'd like to revisit this later
//syntaxerror: block-scoped declarations(let, const, function, class) not yet supported outside strict mode
/*
var MessageFormatter = class MessageFormatter{
    //"use strict";
    constructor(jsonResult, url){
        this.tickerSymbol = jsonResult["t"];
        this.URL = url;
        this.previousClose = jsonResult["pcls_fix"];
        this.last = jsonResult["l"];
        this.lastTime = jsonResult["lt"];
        this.change = jsonResult["c"];
        this.changePercent = jsonResult["cp"];
        this.afterLast = jsonResult["el"];
        this.afterLastTime = jsonResult["elt"];
        this.afterChange = jsonResult["ec"];
        this.afterChangePercent = jsonResult["ecp"];
    }
    
    summary(){
        var stockSummary = "*" + this.tickerSymbol + "*"
                                + "\n>Realtime: " + this.URL
                                + "\n*Today*"
                                + "\n>Prev Close: `$" + this.previousClose + "`"
                                + "\n>Last: `$" + this.last + "`"
                                + " Time: `" + this.lastTime + "`"
                                + "\n>Change: `" + this.change + "`"
                                + " Change(%): `" + this.changePercent + "`"
                                + "\n*After Hours*"
                                + "\n>Last: `$" + this.afterLast + "`"
                                + "  Time: `" + this.afterLastTime + "`"
                                + "\n>Change: `" + this.afterChange + "`"
                                + " Change(%): `" + this.afterChangePercent + "`";
                                
        return stockSummary;
    }
};
*/
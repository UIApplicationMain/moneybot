
var https = require('https');

var PriceDictionary = {};

exports.track = function track(bot, message, tickerSymbol) {
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
    var obj = {
        jsonText:jsonText,
        change:difference
    };
    return obj;
}
function ErrorMessage(err){
    //we can extend this later
    return "An error occured: " + err;
}

//TODO
function GetColorAndSigns(change){
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

    return [color, percentageSign];
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

    var previousObject = ComparePrevious(tickerSymbol, last);
    if(previousObject.jsonText){
        var previousColor = GetColorAndSigns(previousObject.change)[0];
        var previousJSON = {
            "title":"Change since last request",
            "text": previousObject.jsonText,
            "color": previousColor,
            "mrkdwn_in": ["text"]
        }
    }
    
    var dayObj = {
        last : last,
        lastTime : lastTime,
        change : change,
        changePercent:changePercent,
        prevClose:previousClose
    };
    var afterObj = {
        last:afterLast,
        lastTime:afterLastTime,
        change:afterChange,
        changePercent:afterChangePercent
    };
    
    var dayJSON = GenerateText("Day Hours", dayObj);
    var afterJSON = GenerateText("After Hours", afterObj);
    
    var json = {
        "text": "*" + tickerSymbol + "*: " + url,
        "attachments": [
            previousJSON,
            dayJSON,
            afterJSON
        ]
    };

    return json;
};

function GenerateText(titletext, attachmentObj){
    var color = GetColorAndSigns(attachmentObj.change)[0];
    var percentSign = GetColorAndSigns(attachmentObj.change)[1];
    var JSONtext = "";
    if(titletext === "Day Hours"){
        JSONtext += "Prev Close: *$" + attachmentObj.prevClose + "*\n";
    }
    
    JSONtext += "Last: *$" + attachmentObj.last + "*"
                + " Time: `" + attachmentObj.lastTime + "`"
                + "\nChange: *" + attachmentObj.change + " (" + percentSign + attachmentObj.changePercent +"%)*";
                
    var retJSON = {
        "title": titletext,
        "text": JSONtext,
        "color": color,
        "mrkdwn_in": ["text"]
    }
    return retJSON;
};

//michael: I'd like to revisit this later
//referenceerrors: can't read property 'change' of undefined (why does it think "this" is undefined????)
/*
var MessageFormatter = function(jsonResult, url){
    this.tickerSymbol = jsonResult["t"];
    this.previousClose = jsonResult["pcls_fix"];
    this.last = jsonResult["l"];
    this.lastTime = jsonResult["lt"];
    this.change = jsonResult["c"];
    this.changePercent = jsonResult["cp"];
    this.afterLast = jsonResult["el"];
    this.afterLastTime = jsonResult["elt"];
    this.afterChange = jsonResult["ec"];
    this.afterChangePercent = jsonResult["ecp"];
    this.URL = url;
};

MessageFormatter.prototype = function(){
    var getSummary = function(){
        console.log(this.change);
        var todayColor, afterColor;
        var percentageSign, afterPercentageSign;
        todayColor = ColorsAndSigns(this.change)[0];
        percentageSign = ColorsAndSigns(this.change)[1];
        afterColor = ColorsAndSigns(this.afterChange)[0];    
        afterPercentageSign = ColorsAndSigns(this.afterChange)[1];
        
        var previousJSONText = ComparePrevious(this.tickerSymbol, this.last);
        if(previousJSONText){
            var previousJSON = {
                "title":"Change since last request",
                "text": previousJSONText,
                "color":"",
                "mrkdwn_in": ["text"]
            }
        }
        
        var daySummary = "Prev Close: *$" + this.previousClose + "*"
                                    + "\nLast: *$" + this.last + "*"
                                    + " Time: `" + this.lastTime + "`"
                                    + "\nChange: *" + this.change + " (" + percentageSign + this.changePercent +"%)*";
        var afterSummary = "Last: *$" + this.afterLast + "*"
                                    + " Time: `" + this.afterLastTime + "`"
                                    + "\nChange: *" + this.afterChange + " (" + afterPercentageSign + this.afterChangePercent + "%)*";
            
        var json = {
            "text": "*" + this.tickerSymbol + "*: " + this.URL,
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
    },
    
    ColorsAndSigns = function (change){
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
    
        return [color, percentageSign];
    },
    
    ComparePrevious = function(ticker, newValue){
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
    };
    
    return {
        summary:getSummary()
    };
}();
*/

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
exports.clearDictionary = function ClearDictionary(){
    PriceDictionary = {};
};

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
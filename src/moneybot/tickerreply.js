var Promise = require("bluebird");
var request = require('request-promise');

var PriceDictionary = {};

exports.track = function track(bot, message, tickerSymbol) {
    // handling for ticker requests starting with $
    if (tickerSymbol.startsWith("$")) {
        tickerSymbol = tickerSymbol.substring(1, tickerSymbol.length);
    }
    // create stock url from message
    // var finUrl = "https://finance.google.com/finance/info?client=ig&q=" + tickerSymbol;

    var requests = [{
        url: "https://api.iextrading.com/1.0/tops?symbols=" + tickerSymbol
    }, {
        url: "https://finance.google.com/finance/info?client=ig&q=" + tickerSymbol
    }];

    Promise.map(requests, function(obj) {
        return request(obj).then(function (body) {
            return JSON.parse(body.replace("//", ""));
        });
    }).then(function(results) {
        try{
            var iex = results[0][0];
            var google = results[1][0];
            var url = "http://finance.yahoo.com/quote/" + tickerSymbol;
            var formatter = new MessageFormatter(google,iex, url);
            var summary = formatter.summary();
            bot.reply(message, summary);
        }
        catch(err){
            bot.reply(message, ErrorMessage("Invalid ticker symbol: " + tickerSymbol + err))
        }

    }, function(err) {
        return "An error occured: " + err;
    });
};

//helper functions
function ErrorMessage(err){
    //we can extend this later
    return "An error occured: " + err;
}

//MessageFormatter class 
//uses the revealing prototype pattern
var MessageFormatter = function(jsonResult_google,jsonResult_iex, url){
    this.tickerSymbol = jsonResult_iex["symbol"];
    this.bidPrice = jsonResult_iex["bidPrice"];
    this.askPrice = jsonResult_iex["askPrice"];
    this.lastUpdated = jsonResult_iex["lastUpdated"];
    this.previousClose = jsonResult_google["pcls_fix"];
    this.last = jsonResult_google["l"];
    this.lastTime = jsonResult_google["lt"];
    this.afterLast = jsonResult_google["el"];
    this.afterLastTime = jsonResult_google["elt"];
    this.URL = url;
    this.change = jsonResult_google["c"];
    this.changePercent = jsonResult_google["cp"];
    this.afterChange = jsonResult_google["ec"];
    this.afterChangePercent = jsonResult_google["ecp"];
};

MessageFormatter.prototype = function(){
    var GetSummary = function(){

        var previousObject = ComparePrevious(this.tickerSymbol, this.askPrice);
        if(previousObject.jsonText){
            var previousColor = ColorsAndSigns(previousObject.change)[0];
            var previousJSON = {
                "title":"Change since last request",
                "text": previousObject.jsonText,
                "color": previousColor,
                "mrkdwn_in": ["text"]
            }
        }

        var delta = CalculateChange(this.previousClose, this.askPrice);

        var dayObj = {
            bidPrice : this.bidPrice,
            askPrice : this.askPrice,
            lastUpdated : new Date(this.lastUpdated),
            change: delta.change,
            changePercent: delta.changePercent,
            prevClose: this.previousClose
        };
        var afterObj = {
            last: this.afterLast,
            lastUpdated: this.afterLastTime,
            change: this.afterChange,
            changePercent: this.afterChangePercent
        };

        var dayJSON = GenerateText("Day Hours", dayObj);

        if (!this.afterLast) {
            var afterJSON = ""
        }
        else{
            var afterJSON = GenerateText("After Hours", afterObj);
        }
        
        var json = {
            "text": "*" + this.tickerSymbol + "*: " + this.URL,
            "attachments": [
                previousJSON,
                dayJSON,
                afterJSON
            ]
        };
        
        return json;
    },
    
    //returns an array of 2 var
    //[0] is color
    //[1] is sign
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
    
    CalculateChange = function(previousClose, askPrice){

        var change = askPrice - previousClose;
        var changePercent = (change/previousClose)*100;

        var changeObj = {
            change:change,
            changePercent:changePercent
        };

        return changeObj;
    },

    ComparePrevious = function(ticker, newValue){
        var jsonText = "";
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
        
        var previousObj = {
            jsonText:jsonText,
            change:difference
        };
        
        return previousObj;
    },
    
    GenerateText = function(titletext, attachmentObj){
        var color = ColorsAndSigns(attachmentObj.change)[0];
        var percentSign = ColorsAndSigns(attachmentObj.change)[1];
        var JSONtext = "";
        if(titletext === "Day Hours"){
            JSONtext += "Prev Close: *$" + attachmentObj.prevClose + "*\n"
            + "Ask/Bid Price: *$" + attachmentObj.askPrice + "/ $" + attachmentObj.bidPrice + "*";
        }
        else if(titletext === "After Hours"){
            JSONtext += "Last: *$" + attachmentObj.last + "*"
        }

        JSONtext += "\nLast Updated: `" + attachmentObj.lastUpdated+ "`"
                    + "\nChange: *" + attachmentObj.change + " (" + percentSign + attachmentObj.changePercent +"%)*";
                    
        var retJSON = {
            "title": titletext,
            "text": JSONtext,
            "color": color,
            "mrkdwn_in": ["text"]
        };
        return retJSON;
    };
    
    return {
        summary:GetSummary
    };
}();
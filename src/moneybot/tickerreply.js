
var https = require('https');

var PriceDictionary = {};

exports.track = function track(bot, message, tickerSymbol) {
    // handling for ticker requests starting with $
    if (tickerSymbol.startsWith("$")) {
        tickerSymbol = tickerSymbol.substring(1, tickerSymbol.length);
    }

        // create stock url from message
    var finUrl = "https://finance.google.com/finance/info?client=ig&q=" + tickerSymbol;
    
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

                var formatter = new MessageFormatter(json, url);
                var summary = formatter.summary();
                //var summary = FormatMessage(json, url);
            
                //var lastTradeDate = Date.parse( json["lt_dts"]) / 1000;

                bot.reply(message, summary);
            }
            catch(err) {
                bot.reply(message, ErrorMessage("Invalid ticker symbol: " + tickerSymbol));
            }
        });
        
        res.on('error', function(err){
            bot.reply(message, ErrorMessage(err));
        });
    })
};

//helper functions
function ErrorMessage(err){
    //we can extend this later
    return "An error occured: " + err;
}

//MessageFormatter class 
//uses the revealing prototype pattern
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
    var GetSummary = function(){

        var previousObject = ComparePrevious(this.tickerSymbol, this.last);
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
            last : this.last,
            lastTime : this.lastTime,
            change : this.change,
            changePercent: this.changePercent,
            prevClose: this.previousClose
        };
        var afterObj = {
            last: this.afterLast,
            lastTime: this.afterLastTime,
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
        };
        return retJSON;
    },
    
    TestingFunction = function(){
        return "test";
    };
    
    return {
        summary:GetSummary,
        test: TestingFunction
    };
}();
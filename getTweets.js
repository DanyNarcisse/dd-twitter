const fs = require('fs');
const request = require('request');
const cron = require('node-cron');
const twit = require('twit');
const StatsD = require('node-dogstatsd').StatsD
const credentials = require('./credentials');
const date = new Date();
const statsd_client = new StatsD('0.0.0.0',8125);
const quote = "DDOG";
const yahooURL = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" + quote.toString();

var T = new twit(credentials);
var count_retweet = 0;
var count_favorite = 0;
var dataTweets_file = './data/data-tweets-' + date.getTime().toString() + '.json';
var lastTweet_ID_file = './lastTweetId.json';

async function getLastTweetID()
{
    return new Promise(function(resolve, reject){
        var lastTweet_ID = '0000';
        var lineReader = require('readline').createInterface({
            input: require('fs').createReadStream(lastTweet_ID_file)
        });
        lineReader.on('line', function(line) {
            lastTweet_ID = JSON.parse(line);
            resolve(lastTweet_ID);
        });
    })
}

// Get Market Price value of the defined quote and sends the value to the DD Agent
async function getQuotes(){
    request(yahooURL, function(error, response, body){
        console.log('Requesting: ' + yahooURL)
        if(!error)
        {
            var jsonArr = JSON.parse(body);
            var res=jsonArr.quoteResponse;

            console.log(res.result[0].regularMarketPrice);
            
            statsd_client.gauge('stonks.marketprice.'+quote, res.result[0].regularMarketPrice, ['service:dd-twitter']);
        }

        else {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        }
    });
}
async function getTweet(){
    var param = { q: 'datadog', lang: 'en' 
}
    if (fs.existsSync(lastTweet_ID_file)) {
        var lasttweettest = await getLastTweetID();
        param = {
            q: 'datadog',
            lang: 'en',
            since_id: lasttweettest.toString()
        }
        console.log('Twitt Twiit...' + param.q + ', ' + param.lang + ', ' + param.since_id);
    }
    else{
        var param = {
            q: 'datadog',
            lang: 'en',
            count: 10
        }
        console.log('Twitt Twiit...' + param.q + ', ' + param.lang + ', ' + param.count);
    }
    T.get('search/tweets', param , getData);   
}

function getData(err, data, response){
    console.log(data);
    fs.writeFile(dataTweets_file, JSON.stringify(data), function (err,results)
    {
        if(err){
            console.log(err);
        }
    });

    console.log(data.statuses.length.toString());

    for (var i = 0; i < data.statuses.length; i++) {
        count_retweet += data.statuses[i].retweet_count;
        count_favorite += data.statuses[i].favorite_count;
    }

    try {
        fs.writeFile(lastTweet_ID_file, JSON.stringify(data.statuses[0].id), function (err,results)
        {
            console.log('Last tweet ID recorded');
        });
    } 
    catch (error) {
        console.log('No tweets since last tweet.');
        count_retweet = 0;
        count_favorite = 0;
    }
    finally{
        statsd_client.gauge('twitter.datadog.retweet', count_retweet, ['service:dd-twitter']);
        statsd_client.gauge('twitter.datadog.favorite', count_favorite, ['service:dd-twitter']);

        console.log('Numbre of retweets:' + count_retweet);
        console.log('Numbre of favorites:' + count_favorite);
        console.log('Done!');
    }
}

// Main function to fetch and parse the data
function Main()
{
    cron.schedule('*/5 * * * *', function(){
        getQuotes();
        getTweet();
      }); 
}

Main();
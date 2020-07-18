const fs = require('fs');
const request = require('request');
const cron = require('node-cron');
const twit = require('twit');
const StatsD = require('node-dogstatsd').StatsD
const credentials = require('./credentials');
const date = new Date();
const statsd_client = new StatsD(process.env.DD_AGENT_HOST,8125);
const quote = 'DDOG';
const yahooURL = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + quote.toString();

var T = new twit(credentials);
var countRT = 0;
var countFav = 0;
var dataTweets_file = './data/data-tweets-' + date.getTime().toString() + '.json';
var tweetID_file = './lastTweetId.json';

async function getLastTweetID()
{
    return new Promise(function(resolve, reject){
        var tweetID = 'stonks';
        var lineReader = require('readline').createInterface({
            input: require('fs').createReadStream(tweetID_file)
        });
        lineReader.on('line', function(line) {
            tweetID = JSON.parse(line);
            resolve(tweetID);
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
            console.log('Error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        }
    });
}

async function getTweet(){
    var param = { q: 'datadog', lang: 'en', count: 10 }

    if (fs.existsSync(tweetID_file)) {
        var lasttweettest = await getLastTweetID();
        param = {
            q: 'datadog',
            lang: 'en',
            since_id: lasttweettest.toString()
        }
        console.log('Twitt.. Query:' + param.q + ', Lang: ' + param.lang + ', TweetID:' + param.since_id);
    }
    else{
        console.log('Twitt Twiit...' + param.q + ', ' + param.lang + ', Last ' + param.count + 'tweets');
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
        countRT += data.statuses[i].retweet_count;
        countFav += data.statuses[i].favorite_count;
    }

    try {
        fs.writeFile(tweetID_file, JSON.stringify(data.statuses[0].id_str), function (err,results)
        {
            console.log('Tweet ID recorded ' + data.statuses[0].id_str);
        });
    } 
    catch (error) {
        console.log('No data since last tweet: ' + tweetID);
        countRT = 0;
        countFav = 0;
    }
    finally{
        statsd_client.gauge('twitter.datadog.retweet', countRT, ['service:dd-twitter']);
        statsd_client.gauge('twitter.datadog.favorite', countFav, ['service:dd-twitter']);
        console.log('Retweets: ' + countRT + ' Favorites: ' + countFav);
    }
}

// Main function to fetch and parse the data
function Main()
{
    //DebugTest();
    cron.schedule('0 30/10 15-22 ? * MON,TUE,WED,THU *', function(){
        getQuotes();
        getTweet();
      }); 
}

async function DebugTest()
{
    while(1>0)
    {
        await sleep(5000);
        statsd_client.gauge('test.metric', 1, ['service:dd-twitter']);
    }
}

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

Main();

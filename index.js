var FeedParser = require('feedparser');
var FeedRequest = require('request');
var axios = require('axios');

const campus_events = "https://events.mercer.edu/events.jsonp.asp?limit=10";
const campus_news = "https://news.mercer.edu/feed/atom/";

'use strict';

exports.campus_events = (request, response) => {
  var intentName = request.body.result.metadata.intentName;

  if (intentName == 'campus_events') {
    axios.get(campus_events)
      .then(function(res) {
        response.status(200).send(synthesizeEvents(res.data));
      });
  } else if (intentName == 'campus_news') {
    var feedRequest = FeedRequest(campus_news);
    var feedParser = new FeedParser();
    var items = [];

    feedRequest.on('response', function(res) {
      var stream = this; // `this` is `req`, which is a stream

      if (res.statusCode !== 200) {
        this.emit('error', new Error('Bad status code'));
      }
      else {
        stream.pipe(feedParser);
      }
    });

    feedParser.on('readable', function () {
      // This is where the action is!
      var stream = this; // `this` is `feedparser`, which is a stream
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item;

      while (item = stream.read()) {
        items.push(item);
      }
    });

    feedParser.on('end', function() {
      response.status(200).send(synthesizeNews(items));
    });
  }

  function synthesizeNews(items) {
    var speech = items.map(function(elem) {
      var date = new Date(elem.pubDate);

      var published = 'Published <say-as interpret-as="date" format="yyyy-mm-dd" detail="1">' +
        date.toISOString().slice(0,10) + '</say-as> by ' + elem.author;

      return published + '<break time="500ms" />' + elem.title;
    }).join('<break time="1500ms" />');

    return {
      speech: '<speak>' + speech + '</speak>',
      displayText: 'Recent news on campus...',
      source: "campus_news",
      data: {
        google: {
          is_ssml: true
        }
      }
    };
  }

  function synthesizeEvents(events) {
    var data = JSON.parse(events.slice(1, -2));

    var speech = data.map(function(elem) {
      var date = new Date(elem.start1);
      var startTime = elem.starttime;

      var startDate = 'Starting <say-as interpret-as="date" format="yyyy-mm-dd" detail="1">' +
        date.toISOString().slice(0,10) + '</say-as> at <say-as interpret-as="time" format="hms12">' + startTime + '</say-as>';

      return startDate + '<break time="500ms" />' + elem.title + '<break time="1200ms" />' + elem.description;
    }).join('<break time="1500ms" />');

    return {
      speech: '<speak>' + speech + '</speak>',
      displayText: 'Events on campus...',
      source: "campus_events",
      data: {
        google: {
          is_ssml: true
        }
      }
    };
  }
};

exports.event = (event, callback) => {
  callback();
};

"use strict";
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');


// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

var express = require('express');
var path = require('path');
// var logger = require('morgan');
var bodyParser = require('body-parser');

// MONGODB SETUP HERE
var mongoose = require('mongoose')
mongoose.connection.on('connected', function() {
  console.log('Connected to MongoDB!')
})

mongoose.connection.on('error', function(err) {
  console.log(err)
})
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
var User = require('./models/Models.js').User;

// Express setup
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const { RTMClient, WebClient } = require('@slack/client');

if (!process.env.SLACK_BOT_TOKEN) {
  console.log("Please set the bot token in .env");
  process.exit(0);
}

const dialogflow = require('dialogflow');
const projectId = 'scheduler-bot-45408'; //https://dialogflow.com/docs/agents#settings
const sessionId = 'quickstart-session-id';
const languageCode = 'en';
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});

// An access token (from your Slack app or custom integration - usually xoxb)
const botToken = process.env.SLACK_BOT_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(botToken);
const web = new WebClient(botToken);


rtm.start();

function makeCalendarAPICall(token, event) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  )

  oauth2Client.setCredentials(token)

  const calendar = google.calendar({version: 'v3', auth: oauth2Client});
  calendar.events.insert({
    calendarId: 'primary', // Go to setting on your calendar to get Id
    'resource': {
      'summary': event.summary,
      'location': event.location,
      'description': event.description,
      'start': {
        'dateTime': event.start,
        'timeZone': 'America/Los_Angeles'
      },
      'end': {
        'dateTime': event.end,
        'timeZone': 'America/Los_Angeles'
      },
      'attendees': event.attendees
    }
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    console.log(data)
  })
  return;
}


rtm.on('message', (event) => {
  // Log the message
  if (event.user) {
    sessionClient
      .detectIntent({
        session: sessionPath,
        queryInput: {
          text: {
            text: event.text,
            languageCode: languageCode,
          }
        }
      })
      .then(responses => {
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`  Query: ${result.queryText}`);
        console.log(`  Response: ${result.fulfillmentText}`);

        if (result.intent) {
          console.log(`  Intent: ${result.intent.displayName}`);
          // console.log(result)

          User.findOne({username: event.channel}, function(err, user) {
            if (err) console.log('error: ', err)
            else {
              if (user && user.username) {
                web.chat.postMessage({channel: event.channel, text: result.fulfillmentText})
                .then((res) => {
                  console.log(`(channel:${event.channel}) ${event.user} says: ${event.text}`);
                  var params = result.parameters.fields
                  console.log('params', params)
                  if (params) {
                    makeCalendarAPICall({
                      access_token: user.accessToken,
                      token_type: 'Bearer',
                      refresh_token: user.refreshToken,
                      expiry_date: 1530585071407
                    }, {start: params.date.stringValue, end: params.date.stringValue, summary: params.subject.stringValue})
                  }
   
                })
                .catch((err) => console.log('ERROR', err));

              } else {
                app.get('/', function(req, res) {
                  console.log('req received', req.query.code)
                  oauth2Client.getToken(req.query.code, (err, token) => {
                    if (err) return console.log('error', err)
                    oauth2Client.setCredentials(token);  
                    console.log('token', token)
                    new User({accessToken: token.access_token, refreshToken: token.refresh_token, username: event.channel})
                      .save(function (err, updateduser) {
                        if (err) return console.log('Error');
                        res.send('You have given the access.');
                      })
                      .catch((err) => res.status(500).end(err.message))
                  })
                
                })
          
                web.chat.postMessage({channel: event.channel, text: 'Authorize this app by visiting this url: ' + url})
                .then((res) => {
                  console.log(`(channel:${event.channel}) ${event.user} says: ${event.text}`);
                })
                .catch(console.error);

                web.chat.postMessage({channel: event.channel, text: result.fulfillmentText})
                .then((res) => {
                  console.log(`(channel:${event.channel}) ${event.user} says: ${event.text}`);
                  
                })
                .catch(console.error);
              }
            }
          })

    } else {
      console.log(`  No intent matched.`);
    }
  })
  .catch(err => {
    console.error('ERROR:', err);
  });

  }
  });

app.listen(1337, function() {
  console.log('Server Started!')
});

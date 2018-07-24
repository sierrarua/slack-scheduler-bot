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



// An access token (from your Slack app or custom integration - usually xoxb)
const botToken = process.env.SLACK_BOT_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(botToken);
const web = new WebClient(botToken);

rtm.start();

rtm.on('message', (event) => {
  // Log the message
  if (event.user) {
    sessionClient
  .detectIntent( {
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
      console.log(result)

      web.chat.postMessage({channel: event.channel, text: result.fulfillmentText})
      .then((res) => {
        console.log(`(channel:${event.channel}) ${event.user} says: ${event.text}`);
      })
      .catch(console.error);


      /////////////////////if
      const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URL
      );

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
      });

      web.chat.postMessage({channel: event.channel, text: 'Authorize this app by visiting this url: ' + url})
      .then((res) => {
        console.log(`(channel:${event.channel}) ${event.user} says: ${event.text}`);
      })
      .catch(console.error);













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

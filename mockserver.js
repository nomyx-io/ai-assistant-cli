require('dotenv').config();
const express = require('express');
const http = require('http');
const Gun = require('gun');
const { configManager } = require('./config-manager');
const config = configManager.getConfig();

function getRequestKey(req) {
  const path = req.path;
  const method = req.method;
  const bodyHash = Gun.text.hash(JSON.stringify(req.body));
  return `${method}:${path}:${bodyHash}`;
}

function createServer(port, middlewares) {
  const app = express();
  app.use(express.json());
  app.use(middlewares);
  http
  .createServer(app)
  .listen(port, () => {
    console.log(`Mock server listening at http://localhost:${port}`);
  });
  return app;
}

function apiKeyAuth (req, res, next) {
  const apiKey = req.headers.authorization;
  if (!apiKey || apiKey !== 'Bearer ' + config.OPENAI_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function dynamicResponses(req, res, next) {
  const requestKey = getRequestKey(req);
  gun.get(requestKey).once((data) => {
    if (data) {
      console.log('Serving recorded response for:', requestKey);
      res.json(data.response);
    } else {
      // Record response
      let originalSend = res.send;
      res.send = function(body) {
        console.log('Recording response for:', requestKey);
        gun.get(requestKey).put({response: JSON.parse(body)});
        originalSend.call(this, body);
      };
      next();
    }
  });
}

const gunServer = createServer(config.MOCKSERVER_PORT || 8765, Gun.serve);

const forwardingServer = createServer(config.MOCKSERVER_PORT || 8764, [apiKeyAuth, dynamicResponses]);

forwardingServer.get('/_/dataset', (req, res) => {
  const collectDataset = () => {
    return new Promise((resolve, reject) => {
      let dataset = [];
      let entryCount = 0;
      gun.get('requests').map().once((data, key) => {
        if (data) {
          // Transform data into a suitable format for training
          let entry = {
            input: `HTTP Method: ${data.method}, Path: ${data.path}, Body: ${JSON.stringify(data.body)}`,
            output: `Response: ${JSON.stringify(data.response)}`
          };
          dataset.push(entry);
        }
        entryCount++;
        if (entryCount === dataset.length) {
          resolve(dataset);
        }
      });
      setTimeout(() => resolve(dataset), 5000); // 5 seconds timeout as an example
    });
  };

  collectDataset().then((dataset) => res.json(dataset))
  .catch((_) => res.status(500).json({error: "An error occurred while collecting the dataset."}));
});

forwardingServer.all('*', (req, res) => {
  res.json({ message: `Mock response for ${req.method} ${req.path}` });
});

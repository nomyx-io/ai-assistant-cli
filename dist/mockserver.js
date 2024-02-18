"use strict";
require('dotenv').config();
var express = require('express');
var http = require('http');
var Gun = require('gun');
var configManager = require('./config-manager').configManager;
var config = configManager.getConfig();
var gun = Gun({ file: 'data.json' }).get('requests');
function getRequestKey(req) {
    var path = req.path;
    var method = req.method;
    var bodyHash = Gun.text.hash(JSON.stringify(req.body));
    return "".concat(method, ":").concat(path, ":").concat(bodyHash);
}
function createServer(port, middlewares) {
    var app = express();
    app.use(express.json());
    app.use(middlewares);
    http
        .createServer(app)
        .listen(port, function () {
        console.log("Mock server listening at http://localhost:".concat(port));
    });
    return app;
}
function apiKeyAuth(req, res, next) {
    var apiKey = req.headers.authorization;
    if (!apiKey || apiKey !== 'Bearer ' + config.OPENAI_API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}
function dynamicResponses(req, res, next) {
    var requestKey = getRequestKey(req);
    gun.get(requestKey).once(function (data) {
        if (data) {
            console.log('Serving recorded response for:', requestKey);
            res.json(data.response);
        }
        else {
            // Record response
            var originalSend_1 = res.send;
            res.send = function (body) {
                console.log('Recording response for:', requestKey);
                gun.get(requestKey).put({ response: JSON.parse(body) });
                originalSend_1.call(this, body);
            };
            next();
        }
    });
}
var gunServer = createServer(config.MOCKSERVER_PORT || 8765, Gun.serve);
var forwardingServer = createServer(config.MOCKSERVER_PORT || 8764, [apiKeyAuth, dynamicResponses]);
forwardingServer.get('/_/dataset', function (req, res) {
    var collectDataset = function () {
        return new Promise(function (resolve, reject) {
            var dataset = [];
            var entryCount = 0;
            gun.get('requests').map().once(function (data, key) {
                if (data) {
                    // Transform data into a suitable format for training
                    var entry = {
                        input: "HTTP Method: ".concat(data.method, ", Path: ").concat(data.path, ", Body: ").concat(JSON.stringify(data.body)),
                        output: "Response: ".concat(JSON.stringify(data.response))
                    };
                    dataset.push(entry);
                }
                entryCount++;
                if (entryCount === dataset.length) {
                    resolve(dataset);
                }
            });
            setTimeout(function () { return resolve(dataset); }, 5000); // 5 seconds timeout as an example
        });
    };
    collectDataset().then(function (dataset) { return res.json(dataset); })
        .catch(function (_) { return res.status(500).json({ error: "An error occurred while collecting the dataset." }); });
});
forwardingServer.all('*', function (req, res) {
    res.json({ message: "Mock response for ".concat(req.method, " ").concat(req.path) });
});
//# sourceMappingURL=mockserver.js.map
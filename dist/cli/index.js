"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var cat = require('shelljs').cat;
var fs = require('fs');
var path = require('path');
var personas_1 = require("./personas");
var _a = require("@nomyx/assistant"), Assistant = _a.Assistant, Thread = _a.Thread;
var config = require('./config');
var highlight = require('cli-highlight').highlight;
var configPath = path.join(__dirname, '../..', 'config.json');
var cliPrompt = require('./cli');
// global variables
var threadId = config.config.threadId; // threadId is used to keep track of the threadId of the assistant
if (config.config.threadId) {
    console.log('threadId:', config.config.threadId);
}
var asst = undefined; // asst is used to keep track of the assistant
var runningMode = false; // runningMode is used to keep track of whether the assistant is running or not
var request = process.argv.slice(2).join(' '); // request is used to keep track of the user's request
// get the assistant object from openai or create a new one
var getAssistant = function (threadId) { return __awaiter(void 0, void 0, void 0, function () {
    var assistants, assistant, pp, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (asst) {
                    return [2 /*return*/, asst];
                }
                return [4 /*yield*/, Assistant.list(config.config.openai_api_key)];
            case 1:
                assistants = _c.sent();
                assistant = asst = assistants.find(function (a) { return a.name === config.config.assistant_name; });
                if (!!assistant) return [3 /*break*/, 3];
                pp = (0, personas_1.getPersonaPrompt)(config.schemas);
                return [4 /*yield*/, Assistant.create(config.config.assistant_name, pp, config.schemas, config.config.model, threadId)];
            case 2:
                asst = _c.sent();
                return [2 /*return*/, asst];
            case 3:
                _a = threadId;
                if (!_a) return [3 /*break*/, 5];
                _b = assistant;
                return [4 /*yield*/, Thread.get(threadId)];
            case 4:
                _a = (_b.thread = _c.sent());
                _c.label = 5;
            case 5:
                _a;
                return [2 /*return*/, assistant];
        }
    });
}); };
function prettyPrint(result) {
    try {
        var highlighted = highlight(result, { language: 'javascript', ignoreIllegals: true });
        console.log('\n' + highlighted + '\n');
    }
    catch (err) {
        console.log(result);
    }
}
var assistant;
var cli;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var processUserCommand;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAssistant(threadId)];
                case 1:
                    assistant = _a.sent();
                    processUserCommand = function (request, threadId) { return __awaiter(_this, void 0, void 0, function () {
                        var result, message_1, iterate_1, err_1, result_1, retryAfter, retryAfterMs_1;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getAssistant(threadId)];
                                case 1:
                                    // get the assistant object from openai or create a new one
                                    assistant = _a.sent();
                                    _a.label = 2;
                                case 2:
                                    _a.trys.push([2, 6, , 10]);
                                    if (!(request === 'clear')) return [3 /*break*/, 3];
                                    config.config.threadId = threadId = undefined;
                                    return [2 /*return*/, {
                                            message: result,
                                            threadId: undefined
                                        }];
                                case 3:
                                    message_1 = {
                                        requirements: request,
                                        percent_complete: 0,
                                        next_task: "",
                                        comments: "",
                                    };
                                    iterate_1 = function () { return __awaiter(_this, void 0, void 0, function () {
                                        var next_task, update, warning, flow_control, percent_complete, _message_1, _message;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, assistant.run(JSON.stringify(message_1), config.tools, config.schemas, config.config.openai_api_key, function (event, value) { })];
                                                case 1:
                                                    result = _a.sent();
                                                    message_1 = JSON.parse(result);
                                                    // if the assistant is awaiting a user response, then we'll iterate again to get it
                                                    if (message_1.flow_control === 'awaiting_user_response') {
                                                        return [2 /*return*/];
                                                    }
                                                    next_task = message_1.next_task;
                                                    update = message_1.update;
                                                    warning = message_1.warning;
                                                    flow_control = message_1.flow_control;
                                                    // remove the fields that we don't want to go back to the assistant
                                                    delete message_1.update;
                                                    delete message_1.flow_control;
                                                    delete message_1.warning;
                                                    percent_complete = message_1.percent_complete;
                                                    if (percent_complete === 100 || flow_control === 'complete') {
                                                        _message_1 = "complete. ".concat(update);
                                                        return [2 /*return*/, _message_1];
                                                    }
                                                    _message = "percent_complete: ".concat(percent_complete, ", next_task: ").concat(next_task, ", update: ").concat(update).concat(warning ? ", warning: ".concat(warning) : "").concat(flow_control ? ", flow_control: ".concat(flow_control) : "");
                                                    prettyPrint(_message);
                                                    return [4 /*yield*/, iterate_1()];
                                                case 2:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, iterate_1()];
                                case 4:
                                    _a.sent();
                                    _a.label = 5;
                                case 5: return [3 /*break*/, 10];
                                case 6:
                                    err_1 = _a.sent();
                                    if (!(err_1.response && err_1.response.status === 429)) return [3 /*break*/, 9];
                                    console.log('Too many requests, pausing for 30 seconds');
                                    result_1 = err_1.message;
                                    retryAfter = err_1.response.headers['retry-after'];
                                    if (!retryAfter) return [3 /*break*/, 8];
                                    retryAfterMs_1 = parseInt(retryAfter) * 1000;
                                    result_1 += "... retrying in ".concat(retryAfter, " seconds");
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryAfterMs_1); })];
                                case 7:
                                    _a.sent();
                                    _a.label = 8;
                                case 8: return [2 /*return*/, "Error: ".concat(result_1)];
                                case 9: return [3 /*break*/, 10];
                                case 10:
                                    prettyPrint(result);
                                    return [2 /*return*/, {
                                            message: result,
                                            threadId: assistant.thread.id
                                        }];
                            }
                        });
                    }); };
                    return [4 /*yield*/, cliPrompt(assistant, function (command) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, new Promise(function (resolve) {
                                        // if there is no api key, then the user is entering it
                                        var hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
                                        if (!hasApiKey) {
                                            config.config.openai_api_key = request;
                                            fs.writeFileSync(configPath, JSON.stringify(config.config, null, 2));
                                            resolve(false);
                                            return;
                                        }
                                        // process the user's command                                                                                                                                                                                                                                      
                                        processUserCommand(command, threadId).then(function (messageResults) {
                                            threadId = messageResults['threadId'];
                                            config.config.threadId = threadId;
                                            config.updateConfig(config.config);
                                            resolve(false);
                                        });
                                    })];
                            });
                        }); }, function () {
                            return new Promise(function (resolve) {
                                getAssistant(threadId).then(function (assistant) {
                                    if (assistant.run.data.status === 'running') {
                                        assistant.cancel();
                                    }
                                    resolve(false);
                                });
                            });
                        }, function () {
                            var hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
                            return hasApiKey ? '> ' : 'Enter your OpenAI API key: ';
                        })];
                case 2:
                    cli = _a.sent();
                    cli.assistant = assistant;
                    cli.start();
                    return [2 /*return*/];
            }
        });
    });
}
main();

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
var cat = require('shelljs').cat;
var fs = require('fs');
var path = require('path');
var _a = require("@nomyx/assistant"), Assistant = _a.Assistant, Thread = _a.Thread, loadNewPersona = _a.loadNewPersona;
var config = require('./config');
var highlight = require('cli-highlight').highlight;
var configPath = path.join(__dirname, '../..', 'config.json');
var cliPrompt = require('./cli');
// global variables
var threadId = undefined; // threadId is used to keep track of the threadId of the assistant
var asst = undefined; // asst is used to keep track of the assistant
var runningMode = false; // runningMode is used to keep track of whether the assistant is running or not
var request = process.argv.slice(2).join(' '); // request is used to keep track of the user's request
function getPersonaPrompt(p) {
    return "First, load your list of tools in preparation for the interaction. Then carefully read through the given task: \n\n".concat(p, "\n\nNow, determine the complexity of the task and decide whether you should decompose it into subtasks.\nIf the task is simple, perform it with the available tools. If the task is complex, decompose it into subtasks and perform each subtask with the available tools.\nOnce the task is completed, provide a summary of actions taken and files created or updated.");
}
// get the assistant object from openai or create a new one
var getAssistant = function (threadId) { return __awaiter(void 0, void 0, void 0, function () {
    var assistants, assistant, _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                if (asst) {
                    return [2 /*return*/, asst];
                }
                return [4 /*yield*/, Assistant.list(config.config.openai_api_key)];
            case 1:
                assistants = _f.sent();
                assistant = asst = assistants.find(function (a) { return a.name === config.config.assistant_name; });
                if (!!assistant) return [3 /*break*/, 4];
                _b = (_a = Assistant).create;
                _c = [config.config.assistant_name];
                return [4 /*yield*/, loadNewPersona(config.schemas)];
            case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([_f.sent(), config.schemas,
                    config.config.model,
                    threadId]))];
            case 3:
                asst = _f.sent();
                return [2 /*return*/, asst];
            case 4:
                _d = threadId;
                if (!_d) return [3 /*break*/, 6];
                _e = assistant;
                return [4 /*yield*/, Thread.get(threadId)];
            case 5:
                _d = (_e.thread = _f.sent());
                _f.label = 6;
            case 6:
                _d;
                return [2 /*return*/, assistant];
        }
    });
}); };
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
                        var result, err_1, result_1, retryAfter, retryAfterMs_1, highlighted;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getAssistant(threadId)];
                                case 1:
                                    // get the assistant object from openai or create a new one
                                    assistant = _a.sent();
                                    _a.label = 2;
                                case 2:
                                    _a.trys.push([2, 4, , 8]);
                                    return [4 /*yield*/, assistant.run(getPersonaPrompt(request), config.tools, config.schemas, config.config.openai_api_key, function (event, value) {
                                            cli && cli.updateSpinner(event, value);
                                        })];
                                case 3:
                                    result = _a.sent();
                                    return [3 /*break*/, 8];
                                case 4:
                                    err_1 = _a.sent();
                                    if (!(err_1.response && err_1.response.status === 429)) return [3 /*break*/, 7];
                                    console.log('Too many requests, pausing for 30 seconds');
                                    result_1 = err_1.message;
                                    retryAfter = err_1.response.headers['retry-after'];
                                    if (!retryAfter) return [3 /*break*/, 6];
                                    retryAfterMs_1 = parseInt(retryAfter) * 1000;
                                    result_1 += "... retrying in ".concat(retryAfter, " seconds");
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryAfterMs_1); })];
                                case 5:
                                    _a.sent();
                                    _a.label = 6;
                                case 6: return [2 /*return*/, "Error: ".concat(result_1)];
                                case 7: return [3 /*break*/, 8];
                                case 8:
                                    try {
                                        highlighted = highlight(result, { language: 'javascript', ignoreIllegals: true });
                                        console.log('\n' + highlighted + '\n');
                                    }
                                    catch (err) {
                                        console.log(result);
                                    }
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

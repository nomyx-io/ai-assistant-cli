#!/usr/bin/env node
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
require('dotenv').config();
// If no request is given, start a chat session
var readline = require('readline');
var cat = require('shelljs').cat;
var _a = require("nomyx-assistant"), Assistant = _a.Assistant, Thread = _a.Thread, loadPersona = _a.loadPersona;
var _b = require("nomyx-assistant-tools"), schemas = _b.schemas, funcs = _b.funcs, tools = _b.tools;
var ora = require('ora');
var highlight = require('cli-highlight').highlight;
// does config.json exist?
var fs = require('fs');
var path = require('path');
var configPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(configPath)) {
    var config_1 = {
        'openai_api_key': process.env.OPENAI_API_KEY || '',
        'model': 'gpt-4-1106-preview',
    };
    fs.writeFileSync(configPath, JSON.stringify(config_1, null, 2));
}
var config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
var request = process.argv.slice(2).join(' ');
var asst = undefined;
function processCommand() {
    return __awaiter(this, void 0, void 0, function () {
        var spinner, threadId, getAssistant, assist, processMessages, messageResults, err_1, processLine_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    spinner = ora({
                        spinner: {
                            interval: 100,
                            frames: [
                                // '⠋',
                                // '⠙',
                                // '⠹',
                                // '⠸',
                                // '⠼',
                                // '⠴',
                                // '⠦',
                                // '⠧',
                                // '⠇',
                                // '⠏',
                                // '🌍',
                                // '🌍',
                                // '🌎',
                                // '🌎',
                                // '🌏',
                                // '🌏'
                                '䷀', '䷁', '䷂', '䷃', '䷄', '䷅', '䷆', '䷇', '䷈', '䷉', '䷊', '䷋', '䷌', '䷍', '䷎', '䷏', '䷐', '䷑', '䷒', '䷓', '䷔', '䷕', '䷖', '䷗', '䷘', '䷙', '䷚', '䷛', '䷜', '䷝', '䷞', '䷟', '䷠', '䷡', '䷢', '䷣', '䷤', '䷥', '䷦', '䷧', '䷨', '䷩', '䷪', '䷫', '䷬', '䷭', '䷮', '䷯', '䷰', '䷱', '䷲', '䷳', '䷴', '䷵', '䷶', '䷷', '䷸', '䷹', '䷺', '䷻', '䷼', '䷽', '䷾', '䷿'
                            ]
                        },
                        text: 'Loading'
                    });
                    threadId = undefined;
                    getAssistant = function (threadId) { return __awaiter(_this, void 0, void 0, function () {
                        var assistants, assistant, _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    if (asst) {
                                        return [2 /*return*/, asst];
                                    }
                                    return [4 /*yield*/, Assistant.list()];
                                case 1:
                                    assistants = _e.sent();
                                    assistant = assistants.find(function (a) { return a.name === 'nomyx-assistant'; });
                                    if (!!assistant) return [3 /*break*/, 4];
                                    _b = (_a = Assistant).create;
                                    _c = ['nomyx-assistant'];
                                    return [4 /*yield*/, loadPersona(tools)];
                                case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([_e.sent(), // Make sure to await the asynchronous loadPersona
                                        schemas,
                                        'gpt-4-1106-preview',
                                        threadId]))];
                                case 3: return [2 /*return*/, _e.sent()];
                                case 4:
                                    if (!threadId) return [3 /*break*/, 6];
                                    _d = assistant;
                                    return [4 /*yield*/, Thread.get(threadId)];
                                case 5:
                                    _d.thread = _e.sent();
                                    _e.label = 6;
                                case 6: return [2 /*return*/, assistant];
                            }
                        });
                    }); };
                    return [4 /*yield*/, getAssistant(threadId)];
                case 1:
                    assist = _a.sent();
                    asst = assist;
                    processMessages = function (assistant, request, funcs, schemas, threadId) { return __awaiter(_this, void 0, void 0, function () {
                        var result, err_2, result_1, retryAfter, retryAfterMs_1, highlighted;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getAssistant(threadId)];
                                case 1:
                                    assistant = _a.sent();
                                    spinner.start();
                                    _a.label = 2;
                                case 2:
                                    _a.trys.push([2, 4, , 9]);
                                    return [4 /*yield*/, assistant.run(request, funcs, schemas, function (event, value) {
                                            spinner.text = event;
                                        })];
                                case 3:
                                    result = _a.sent();
                                    return [3 /*break*/, 9];
                                case 4:
                                    err_2 = _a.sent();
                                    spinner.stop();
                                    if (!(err_2.response && err_2.response.status === 429)) return [3 /*break*/, 8];
                                    console.log('Too many requests, pausing for 30 seconds');
                                    result_1 = err_2.message;
                                    retryAfter = err_2.response.headers['retry-after'];
                                    if (!retryAfter) return [3 /*break*/, 6];
                                    retryAfterMs_1 = parseInt(retryAfter) * 1000;
                                    result_1 += "... retrying in ".concat(retryAfter, " seconds");
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryAfterMs_1); })];
                                case 5:
                                    _a.sent();
                                    _a.label = 6;
                                case 6: return [4 /*yield*/, processMessages(assistant, request, funcs, schemas, threadId)];
                                case 7: return [2 /*return*/, _a.sent()];
                                case 8: return [3 /*break*/, 9];
                                case 9:
                                    spinner.stop();
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
                    if (!request) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, processMessages(asst, request, funcs, schemas, threadId)];
                case 3:
                    messageResults = _a.sent();
                    threadId = messageResults['threadId'];
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error(err_1);
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 8];
                case 6:
                    processLine_1 = function () { return __awaiter(_this, void 0, void 0, function () {
                        var rl, hasApiKey;
                        var _this = this;
                        return __generator(this, function (_a) {
                            rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                            });
                            hasApiKey = config.openai_api_key && config.openai_api_key.length > 0;
                            rl.setPrompt(hasApiKey ? '> ' : 'Enter your OpenAI API key: ');
                            rl.prompt();
                            rl.on('line', function (request) { return __awaiter(_this, void 0, void 0, function () {
                                var messageResults, err_3;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!!hasApiKey) return [3 /*break*/, 2];
                                            config.openai_api_key = request;
                                            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                                            rl.close();
                                            return [4 /*yield*/, processLine_1()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 2:
                                            _a.trys.push([2, 5, , 7]);
                                            return [4 /*yield*/, processMessages(asst, request, funcs, schemas, threadId)];
                                        case 3:
                                            messageResults = _a.sent();
                                            threadId = messageResults['threadId'];
                                            rl.close();
                                            return [4 /*yield*/, processLine_1()];
                                        case 4:
                                            _a.sent();
                                            return [3 /*break*/, 7];
                                        case 5:
                                            err_3 = _a.sent();
                                            console.error(err_3);
                                            rl.close();
                                            return [4 /*yield*/, processLine_1()];
                                        case 6:
                                            _a.sent();
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            return [2 /*return*/];
                        });
                    }); };
                    return [4 /*yield*/, processLine_1()];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
}
processCommand();

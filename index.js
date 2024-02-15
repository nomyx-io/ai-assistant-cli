"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var readline = require('readline');
var OpenAI = require('openai');
var fs = require('fs');
var path = require('path');
var generateUsername = require("unique-username-generator").generateUsername;
var clc = require("cli-color");
// get command-line arguments
var args = process.argv.slice(2);
// look for command-line flags
var flags = args.filter(function (arg) { return arg.startsWith('--'); });
var commands = args.filter(function (arg) { return !arg.startsWith('--'); });
var requireMain = require.main || { filename: __filename };
// get the application's install directory
var appDir = path.dirname(requireMain.filename);
var appDirParts = appDir.split(path.sep);
if (appDirParts[appDirParts.length - 1] === 'bin') {
    appDirParts.pop();
    appDir = appDirParts.join(path.sep);
}
function containsFlag(flag) {
    return flags.indexOf(flag) !== -1;
}
function saveConfig(config) {
    // get the application install directory
    var appDir = path.dirname(requireMain.filename);
    fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify(config));
}
function loadConfig() {
    var appDir = path.dirname(requireMain.filename);
    if (fs.existsSync(path.join(appDir, 'config.json'))) {
        return JSON.parse(fs.readFileSync(path.join(appDir, 'config.json')));
    }
    else {
        var config_1 = {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION,
            PLAYHT_USER_ID: process.env.PLAYHT_USER_ID,
            PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE,
            PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE,
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
            GOOGLE_CX_ID: process.env.GOOGLE_CX_ID,
            NEWS_API_KEY: process.env.NEWS_API_KEY,
        };
        saveConfig(config_1);
        return config_1;
    }
}
var config = loadConfig();
var openai = new OpenAI({ apiKey: config.OPENAI_API_KEY || process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });
// look for the --help flag
if (flags.indexOf('--help') !== -1) {
    console.log('Usage: assistant [flags] [commands]');
    console.log('Flags:');
    console.log('  --help: Display this help message');
    console.log('  --version: Display the version of the program');
    console.log('  --verbose: Display verbose output');
    console.log('  --file [file]: Execute the commands in the given file');
    console.log('Commands:');
    console.log('  [command]: The command to execute');
    console.log('  quit: Quit the program');
    console.log('  clear: Clear the screen');
    console.log('  env [key] [value]: Set an environment variable');
    console.log('  status: Display the current status');
    console.log('  echo [message]: Echo the given message');
    process.exit(0);
}
function withRetriesAndTimeouts(func, retries, timeout) {
    if (retries === void 0) { retries = 3; }
    if (timeout === void 0) { timeout = 1000; }
    return __awaiter(this, void 0, void 0, function () {
        var tryCount, _;
        var _this = this;
        return __generator(this, function (_a) {
            tryCount = 0;
            _ = function () { return __awaiter(_this, void 0, void 0, function () {
                var e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 6]);
                            return [4 /*yield*/, func()];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            e_1 = _a.sent();
                            if (!(tryCount < retries)) return [3 /*break*/, 5];
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, timeout); })];
                        case 3:
                            _a.sent();
                            tryCount++;
                            return [4 /*yield*/, _()];
                        case 4: return [2 /*return*/, _a.sent()];
                        case 5: throw e_1;
                        case 6: return [2 /*return*/];
                    }
                });
            }); };
            return [2 /*return*/, _()];
        });
    });
}
var getOrCreateAssistant = function (assistantId, inputObject) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!assistantId) return [3 /*break*/, 6];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 5]);
                            return [4 /*yield*/, openai.beta.assistants.retrieve(assistantId)];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3:
                            error_1 = _a.sent();
                            return [4 /*yield*/, openai.beta.assistants.create(inputObject)];
                        case 4: return [2 /*return*/, _a.sent()];
                        case 5: return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, openai.beta.assistants.create(inputObject)];
                        case 7: return [2 /*return*/, _a.sent()];
                        case 8: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
var getOrCreateThread = function (config) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                var thread;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!config.threadId) return [3 /*break*/, 2];
                            return [4 /*yield*/, openai.beta.threads.create()];
                        case 1:
                            thread = _a.sent();
                            config.threadId = thread.id;
                            saveConfig(config);
                            return [2 /*return*/, thread];
                        case 2:
                            try {
                                return [2 /*return*/, openai.beta.threads.retrieve(config.threadId)];
                            }
                            catch (e) {
                                if (config.threadId) {
                                    delete config.threadId;
                                    saveConfig(config);
                                    return [2 /*return*/, getOrCreateThread(config)];
                                }
                                else
                                    throw e;
                            }
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
var getLatestMessage = function (threadId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                var messages, message, rval;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!threadId) return [3 /*break*/, 2];
                            return [4 /*yield*/, openai.beta.threads.messages.list(threadId)];
                        case 1:
                            messages = _a.sent();
                            message = messages.data[messages.data.length - 1].content;
                            rval = message[0].text.value;
                            return [2 /*return*/, rval.replace(/\\n/g, '')];
                        case 2: throw new Error('No threadId provided');
                    }
                });
            }); })];
    });
}); };
// wait for the rate limit to be lifted
var waitIfRateLimited = function (run) { return __awaiter(void 0, void 0, void 0, function () {
    var waitTime_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!run)
                    return [2 /*return*/, false];
                if (!run.last_error)
                    return [2 /*return*/, false];
                if (!(run.last_error && run.last_error.indexOf && run.last_error.indexOf('rate limited') !== -1)) return [3 /*break*/, 2];
                waitTime_1 = (parseInt(run.last_error.match(/(\d+)m(\d+)/)[1]) * 60 + parseInt(run.last_error.match(/(\d+)m(\d+)/)[2]) + 1) * 1000;
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
            case 1:
                _a.sent();
                return [2 /*return*/, true];
            case 2: return [2 /*return*/, false];
        }
    });
}); };
var createMessage = function (threadId, content) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.messages.create(threadId, { role: "user", content: content })];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var createThread = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.create()];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var loadThread = function (threadId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.retrieve(threadId)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var createRun = function (assistantId, threadId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.create(threadId, { assistant_id: assistantId })];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var retrieveRun = function (threadId, runId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.retrieve(threadId, runId)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var listRunSteps = function (threadId, runId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.steps.list(threadId, runId)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var retrieveRunSteps = function (threadId, runId, stepId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.steps.retrieve(threadId, runId, stepId)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var modifyRun = function (threadId, runId, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.update(threadId, runId, data)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var cancelRun = function (threadId, runId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, withRetriesAndTimeouts(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, openai.beta.threads.runs.cancel(threadId, runId)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); })];
    });
}); };
var AssistantRunner = /** @class */ (function () {
    function AssistantRunner(toolbox, uid) {
        this.latestMessage = '';
        this.thread = undefined;
        this.run = undefined;
        this.run_steps = undefined;
        this.status = 'idle';
        this.assistant = undefined;
        this.timer = 0;
        this.id = '';
        this.uid = uid || '';
        this.toolbox = toolbox;
    }
    AssistantRunner.prototype.destroy = function () {
        var _this = this;
        if (this.run && this.thread) {
            openai.beta.threads.runs.cancel(this.thread.id, this.run.id).then(function () {
                openai.beta.assistants.del(_this.assistant.id);
            });
        }
        else {
            openai.beta.assistants.del(this.assistant.id);
        }
    };
    // request a cancellation of the run
    AssistantRunner.prototype.requestCancel = function () {
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.run && this.thread)) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, openai.beta.threads.runs.cancel(this.thread.id, this.run.id)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        console.error('Error cancelling run:', e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return AssistantRunner;
}());
var AssistantRun = /** @class */ (function () {
    function AssistantRun(toolbox, commandHandler, eventHandler) {
        this.state = {};
        this.status = 'idle';
        this.latestMessage = '';
        this.frames = [
            "◟", "◡", "◞", "◝", "◠", "◜", "◟", "◡", "◞", "◝", "◠", "◜"
        ];
        this.currentIndex = 0;
        this.spinning = false;
        this.interval = 120;
        this.dots = 0;
        this.commandHandler = commandHandler;
        this.eventHandler = eventHandler;
        this.usages = [];
        this.toolbox = toolbox;
        this.tools = toolbox.tools;
        this.schemas = toolbox.schemas;
        this.state = toolbox.state;
    }
    AssistantRun.getCommandHandler = function (command, run) {
        if (AssistantRun.commandHandlers[command]) {
            return function () { return AssistantRun.commandHandlers[command](command, run); };
        }
        else if (AssistantRun.commandHandlers['*']) {
            return function () { return AssistantRun.commandHandlers['*'](command, run); };
        }
        return null;
    };
    AssistantRun.createToolbox = function (appDir) {
        var toolbox = {
            prompt: developerToolbox.prompt,
            tools: developerToolbox.tools,
            schemas: developerToolbox.schemas,
            state: developerToolbox.state
        };
        var toolsFolder = path.join(appDir, 'tools');
        if (fs.existsSync(toolsFolder)) {
            var files = fs.readdirSync(toolsFolder);
            files.forEach(function (file) {
                var tool = require(path.join(appDir, 'tools', file));
                toolbox.tools = __assign(__assign({}, toolbox.tools), tool.tools);
                toolbox.schemas = __spreadArray(__spreadArray([], toolbox.schemas, true), tool.schemas, true);
                toolbox.state = __assign(__assign({}, toolbox.state), tool.state);
            });
        }
        else {
            fs.mkdirSync(path.join(appDir, 'tools'));
        }
        return toolbox;
    };
    AssistantRun.createRun = function (content, toolbox, commandHandler, eventHandler) {
        return __awaiter(this, void 0, void 0, function () {
            var aRunObj, input_vars, fPath, file, ret, parsedResponse, usageSummary;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        aRunObj = new AssistantRun(toolbox, commandHandler, eventHandler);
                        CommandProcessor.taskQueue.push(aRunObj);
                        input_vars = {
                            requirements: content,
                            current_task: aRunObj.state.current_task || '',
                            percent_complete: aRunObj.state.percent_complete,
                            ai_notes: aRunObj.state.ai_notes,
                            user_chat: content,
                            ai_chat: '',
                        };
                        if (containsFlag('--attach') || containsFlag('-a')) {
                            fPath = path.join(process.cwd(), args[1]);
                            file = fs.readFileSync(fPath, 'utf8');
                            // truncate the file if it's longer than 8k
                            if (file.length > 8192) {
                                file = file.slice(0, 8192);
                                file += '\n\n... file truncated, use head or tail to view the rest of the file ...';
                            }
                            input_vars.file_contents = file;
                            console.log("attached file: ".concat(fPath));
                        }
                        return [4 /*yield*/, aRunObj.runAssistant(JSON.stringify(input_vars), function (event, data) {
                                if (event === 'exec-tools') {
                                    var fouts_1 = [];
                                    data.toolOutputs.forEach(function (output) {
                                        var func = data.toolCalls.find(function (call) { return call.id === output.tool_call_id; }).function.name;
                                        fouts_1.push({
                                            function: func,
                                            arguments: data.toolCalls.find(function (call) { return call.id === output.tool_call_id; }).function.arguments,
                                            output: '...'
                                        });
                                    });
                                    console.log('\nexecuting tools');
                                    console.table(fouts_1);
                                }
                                if (event == 'assistant-completed') {
                                    var step_details = data.runSteps.step_details[data.runSteps.step_details.type];
                                    if (data.runSteps.step_details.type === 'tool_calls') {
                                        var fouts_2 = [];
                                        step_details.forEach(function (detail) {
                                            fouts_2.push({
                                                function: detail.function.name,
                                                arguments: detail.function.arguments,
                                                output: detail.output ? detail.output.slice(0, 100) + '...' : 'no output'
                                            });
                                        });
                                        console.log('\nexecuting tools');
                                        console.table(fouts_2);
                                    }
                                    aRunObj.usages.push(data.runSteps.usage);
                                }
                            })];
                    case 1:
                        ret = _b.sent();
                        try {
                            parsedResponse = JSON.parse(ret);
                            if (parsedResponse.show_file) {
                                aRunObj.state.file_name = parsedResponse.show_file;
                                aRunObj.state.file_contents = fs.readFileSync(parsedResponse.show_file, 'utf8');
                                if (aRunObj.state.file_contents.length > 8192) {
                                    aRunObj.state.file_contents = aRunObj.state.file_contents.slice(0, 8192);
                                    aRunObj.state.file_contents += '\n\n... file truncated, use head or tail to view the rest of the file ...';
                                }
                            }
                            else {
                                aRunObj.state.file_name = '';
                                aRunObj.state.file_contents = '';
                            }
                            if (parsedResponse.ai_chat) {
                                console.log(parsedResponse.ai_chat);
                            }
                        }
                        catch (e) {
                        }
                        usageSummary = aRunObj.usages.reduce(function (acc, usage) {
                            for (var key in usage) {
                                if (usage[key] && usage[key] !== 'null') {
                                    acc[key] += usage[key];
                                }
                            }
                            return acc;
                        }, {
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            chat_tokens: 0,
                        });
                        if (parseInt(aRunObj.state.percent_complete) === 100) {
                            aRunObj.usages.push(usageSummary);
                            console.log('\nusage summary');
                            console.table(aRunObj.usages);
                            console.table(aRunObj.state);
                            aRunObj.persist('done');
                            aRunObj.stopSpinner();
                            CommandProcessor.rl.prompt();
                        }
                        else {
                            // add another run to the queue using the last state
                            return [2 /*return*/, AssistantRun.createRun(JSON.stringify({
                                    requirements: aRunObj.state.requirements,
                                    current_task: aRunObj.state.current_task,
                                    percent_complete: aRunObj.state.percent_complete,
                                    ai_notes: aRunObj.state.ai_notes,
                                    user_chat: aRunObj.state.user_chat,
                                    ai_chat: aRunObj.state.ai_chat,
                                }), toolbox, commandHandler, eventHandler)];
                        }
                        CommandProcessor.taskQueue.splice(CommandProcessor.taskQueue.indexOf(aRunObj), 1);
                        return [2 /*return*/, aRunObj];
                }
            });
        });
    };
    AssistantRun.prototype.renderFrame = function (frame) {
        //readline.clearLine(process.stdout, this.dots); // Clear the entire line
        readline.cursorTo(process.stdout, this.dots); // Move the cursor to the beginning of the line
        var dots = '.'.repeat(this.dots);
        process.stdout.write("".concat(frame, "\r").concat(dots, "\r"));
    };
    AssistantRun.prototype.startSpinner = function () {
        var _this = this;
        this.spinning = true;
        this.timer = setInterval(function () {
            _this.dots = (_this.dots + 1) % 3;
            var frame = _this.frames[_this.currentIndex];
            _this.renderFrame(frame);
            _this.currentIndex = (_this.currentIndex + 1) % _this.frames.length;
        }, this.interval);
    };
    AssistantRun.prototype.stopSpinner = function () {
        if (this.timer) {
            this.spinning = false;
            clearInterval(this.timer);
            this.timer = null;
            readline.clearLine(process.stdout, 0); // Clear the line
            readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
            process.stdout.write('\n');
        }
    };
    AssistantRun.prototype.success = function (message) {
        if (this.timer) {
            this.spinning = false;
            clearInterval(this.timer);
            this.timer = null;
            readline.clearLine(process.stdout, 0); // Clear the line
            readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
            process.stdout.write("\n\u2714 ".concat(message, "\n"));
        }
    };
    AssistantRun.prototype.persist = function (message) {
        process.stdout.write("\u2714 ".concat(message, "\r\n")); // Write the message to stdout with an icon and start a new line
    };
    AssistantRun.prototype.runAssistant = function (content, onEvent) {
        return __awaiter(this, void 0, void 0, function () {
            function createMessageWithRunCancel(threadId, content) {
                return __awaiter(this, void 0, void 0, function () {
                    var msg, e_3, runId;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 6]);
                                return [4 /*yield*/, createMessage(threadId, content)];
                            case 1:
                                msg = _b.sent();
                                onEvent('message-created', { threadId: threadId, message: content });
                                return [2 /*return*/, msg];
                            case 2:
                                e_3 = _b.sent();
                                runId = e_3.message.match(/run_\w+/);
                                if (!runId) return [3 /*break*/, 4];
                                runId = runId[0];
                                return [4 /*yield*/, cancelRun(threadId, runId)];
                            case 3:
                                _b.sent();
                                return [2 /*return*/, createMessage(threadId, content)];
                            case 4: throw e_3;
                            case 5: return [3 /*break*/, 6];
                            case 6: return [2 /*return*/];
                        }
                    });
                });
            }
            var _b, _c, _d, lastMessage, loop, response, json, key;
            var _this = this;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        // create or loaSpd the assistant
                        _b = this;
                        return [4 /*yield*/, getOrCreateAssistant(config.assistantId, {
                                instructions: developerToolbox.prompt,
                                name: generateUsername("", 2, 38),
                                tools: Object.keys(this.toolbox.schemas).map(function (schemaName) { return _this.toolbox.schemas[schemaName]; }),
                                model: 'gpt-4-turbo-preview'
                            })];
                    case 1:
                        // create or loaSpd the assistant
                        _b.assistant = _e.sent();
                        config.assistantId = this.assistant.id;
                        saveConfig(config);
                        onEvent('assistant-created', { assistantId: config.assistantId });
                        _c = this;
                        return [4 /*yield*/, getOrCreateThread(config)];
                    case 2:
                        _c.thread = _e.sent();
                        return [4 /*yield*/, createMessageWithRunCancel(this.thread.id, content)];
                    case 3:
                        _e.sent();
                        // create a new run with the assistant
                        _d = this;
                        return [4 /*yield*/, createRun(this.assistant.id, this.thread.id)];
                    case 4:
                        // create a new run with the assistant
                        _d.run = _e.sent();
                        config.runId = this.run.id;
                        saveConfig(config);
                        onEvent('run-created', { runId: config.runId });
                        this.status = 'starting';
                        lastMessage = '';
                        onEvent('assistant-started', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
                        loop = function () { return __awaiter(_this, void 0, void 0, function () {
                            var _b, _c, _d, _e, _f, _g, _h;
                            return __generator(this, function (_j) {
                                switch (_j.label) {
                                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                                    case 1:
                                        _j.sent();
                                        _b = this;
                                        return [4 /*yield*/, retrieveRun(this.thread.id, this.run.id)];
                                    case 2:
                                        _b.run = _j.sent();
                                        this.status = 'running';
                                        _c = this;
                                        return [4 /*yield*/, getLatestMessage(this.thread.id)];
                                    case 3:
                                        _c.latestMessage = _j.sent();
                                        if (lastMessage !== this.latestMessage) {
                                            lastMessage = this.latestMessage;
                                        }
                                        onEvent('assistant-loop-start', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
                                        if (!(this.run.status === "failed")) return [3 /*break*/, 5];
                                        // x mark
                                        process.stdout.write("\u2716\n");
                                        this.status = 'failed';
                                        return [4 /*yield*/, waitIfRateLimited(this.run)];
                                    case 4:
                                        if (_j.sent())
                                            return [2 /*return*/, loop()];
                                        this.latestMessage = 'failed run: ' + this.run.last_error || this.latestMessage;
                                        onEvent('assistant-failed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
                                        return [2 /*return*/, this.latestMessage];
                                    case 5:
                                        if (!(this.run.status === "cancelled")) return [3 /*break*/, 6];
                                        // cancel mark
                                        process.stdout.write("\u2716\n");
                                        this.status = 'cancelled';
                                        this.latestMessage = 'cancelled run';
                                        onEvent('assistant-cancelled', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
                                        return [2 /*return*/, this.latestMessage];
                                    case 6:
                                        if (!(this.run.status === "completed")) return [3 /*break*/, 9];
                                        // check mark
                                        process.stdout.write("\u2714\n");
                                        this.status = 'completed';
                                        _d = this;
                                        return [4 /*yield*/, listRunSteps(this.thread.id, this.run.id)];
                                    case 7:
                                        _d.run_steps = _j.sent();
                                        _e = this;
                                        return [4 /*yield*/, retrieveRunSteps(this.thread.id, this.run.id, this.run_steps.data[this.run_steps.data.length - 1].id)];
                                    case 8:
                                        _e.run_steps = _j.sent();
                                        onEvent('assistant-completed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
                                        // replace \n with new line
                                        return [2 /*return*/, this.latestMessage.replace(/\\n/g, '')];
                                    case 9:
                                        if (!(this.run.status === "queued" || this.run.status === "in_progress")) return [3 /*break*/, 16];
                                        _j.label = 10;
                                    case 10:
                                        if (!(this.run.status === "queued" || this.run.status === "in_progress")) return [3 /*break*/, 15];
                                        // working mark
                                        process.stdout.write("\u2699");
                                        this.status = 'in-progress';
                                        _f = this;
                                        return [4 /*yield*/, retrieveRun(this.thread.id, this.run.id)];
                                    case 11:
                                        _f.run = _j.sent();
                                        _g = this;
                                        return [4 /*yield*/, listRunSteps(this.thread.id, this.run.id)];
                                    case 12:
                                        _g.run_steps = _j.sent();
                                        onEvent('assistant-in-progress', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
                                        return [4 /*yield*/, waitIfRateLimited(this.run)];
                                    case 13:
                                        if (_j.sent())
                                            return [2 /*return*/, loop()];
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                                    case 14:
                                        _j.sent();
                                        return [3 /*break*/, 10];
                                    case 15: return [2 /*return*/, loop()];
                                    case 16:
                                        if (!(this.run.status === "requires_action")) return [3 /*break*/, 19];
                                        process.stdout.write("\u26A0");
                                        this.status = 'executing-tools';
                                        this.toolCalls = this.run.required_action.submit_tool_outputs.tool_calls;
                                        _h = this;
                                        return [4 /*yield*/, this.execTools(this.toolCalls, this.toolbox.tools, onEvent, this.state)];
                                    case 17:
                                        _h.toolOutputs = _j.sent();
                                        onEvent('exec-tools', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolCalls: this.toolCalls, toolOutputs: this.toolOutputs });
                                        return [4 /*yield*/, openai.beta.threads.runs.submitToolOutputs(this.thread.id, this.run.id, { tool_outputs: this.toolOutputs })];
                                    case 18:
                                        _j.sent();
                                        onEvent('submit-tool-outputs', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolOutputs: this.toolOutputs });
                                        return [2 /*return*/, loop()];
                                    case 19:
                                        process.stdout.write("\r\n");
                                        return [2 /*return*/, loop()];
                                }
                            });
                        }); };
                        return [4 /*yield*/, loop()];
                    case 5:
                        response = _e.sent();
                        try {
                            json = JSON.parse(response);
                            for (key in json) {
                                this.state[key] = json[key];
                            }
                            if (this.state.ai_chat) {
                                console.log(this.state.ai_chat);
                            }
                            if (this.state.current_task != this.state.last_task) {
                                this.state.last_task = this.state.current_task;
                                if (this.state.last_task) {
                                    this.persist("Task: ".concat(this.state.current_task));
                                }
                            }
                        }
                        catch (e) {
                            console.log('parse error', response);
                        }
                        return [2 /*return*/, response];
                }
            });
        });
    };
    // execute the tools
    AssistantRun.prototype.execTools = function (toolCalls, availableFunctions, onEvent, state) {
        return __awaiter(this, void 0, void 0, function () {
            var toolOutputs, _i, toolCalls_1, toolCall, func, _arguments, result, e_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        toolOutputs = [];
                        _i = 0, toolCalls_1 = toolCalls;
                        _b.label = 1;
                    case 1:
                        if (!(_i < toolCalls_1.length)) return [3 /*break*/, 6];
                        toolCall = toolCalls_1[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        func = availableFunctions[toolCall.function.name];
                        if (!func) {
                            onEvent('exec-tool-error', { toolCallId: toolCall.id, toolCall: toolCall, message: "Function ".concat(toolCall.function.name, " is not available.") });
                            throw new Error("Function ".concat(toolCall.function.name, " is not available."));
                        }
                        _arguments = JSON.parse(toolCall.function.arguments || '{}');
                        if (state.update_callback) {
                            state.update_callback("".concat(toolCall.function.name, " (").concat(toolCall.function.arguments, ")"));
                        }
                        return [4 /*yield*/, func(_arguments, state)];
                    case 3:
                        result = _b.sent();
                        onEvent('exec-tool', { toolCallId: toolCall.id, toolCall: toolCall, result: result });
                        // if the function has an update callback, we call it
                        if (state.update_callback) {
                            state.update_callback(result);
                        }
                        // if the result is not a string, we stringify it
                        if (typeof result !== 'string') {
                            result = JSON.stringify(result);
                        }
                        // if there's still no result, we set it to an empty string
                        if (!result) {
                            result = "\"\"";
                        }
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: result
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        e_4 = _b.sent();
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: 'error: ' + e_4.message
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, toolOutputs];
                }
            });
        });
    };
    var _a;
    _a = AssistantRun;
    AssistantRun.commandHandlers = {
        'quit': function (_, run) { return process.exit(); },
        'clear': function (_, run) {
            process.stdout.write('\x1Bc');
            CommandProcessor.rl.prompt();
        },
        'clean': function (_, run) { return __awaiter(void 0, void 0, void 0, function () {
            var assistants, rlAssistants, toolmakerAssistants, toDelete, delCount;
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, openai.beta.assistants.list()];
                    case 1:
                        assistants = (_b.sent()).data;
                        rlAssistants = assistants.filter(function (assistant) { return assistant.name === 'assistant'; });
                        toolmakerAssistants = assistants.filter(function (assistant) { return assistant.name === 'toolmaker'; });
                        toDelete = __spreadArray(__spreadArray([], rlAssistants, true), toolmakerAssistants, true);
                        if (!(toDelete.length > 0)) return [3 /*break*/, 3];
                        delCount = toDelete.length;
                        return [4 /*yield*/, Promise.all(toDelete.map(function (assistant) { return openai.beta.assistants.del(assistant.id); }))];
                    case 2:
                        _b.sent();
                        console.log("deleted ".concat(delCount, " assistants"));
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); },
        'env': function (command, run) { return __awaiter(void 0, void 0, void 0, function () {
            var _b, _, key, value;
            return __generator(_a, function (_c) {
                _b = command.split(' '), _ = _b[0], key = _b[1], value = _b[2];
                if (key && value) {
                    process.env[key] = value;
                    CommandProcessor.rl.prompt();
                }
                return [2 /*return*/];
            });
        }); },
        'reset': function (_, run) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(_a, function (_b) {
                delete config.assistantId;
                delete config.threadId;
                delete config.runId;
                saveConfig(config);
                CommandProcessor.assistantRunner = new AssistantRunner(AssistantRun.createToolbox(appDir));
                config.assistantId = CommandProcessor.assistantRunner.id;
                saveConfig(config);
                CommandProcessor.rl.prompt();
                return [2 /*return*/];
            });
        }); },
        'echo': function (echo, run) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(_a, function (_b) {
                console.log(echo);
                return [2 /*return*/];
            });
        }); },
        '*': function (command, run) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(_a, function (_b) {
                if (run.status === 'working') {
                    return [2 /*return*/, command];
                }
                config.assistantId = CommandProcessor.assistantRunner.uid;
                saveConfig(config);
                return [2 /*return*/];
            });
        }); }
    };
    return AssistantRun;
}());
var developerToolbox = {
    prompt: "***MASTER PAIR PROGRAMMER***\n\nYou are a highly skilled programmer collaborating with your partner in a command-line environment supported by a number of powerful tools, including the capacity to create and improve your own tooling, call yourself recursively functions, and perform higly complex tasks. You are tasked with deploying your vast array of knowledge towards solving complex problems and creating tools to assist you in your work.\n\n***INSTRUCTIONS***\n\nUse the tools to perform the given requirements. Build new tools as needed. Use the task management system to stay on track.\n\nYou have a number of tools at your disposal (documented elsewhere). Use those tools along with your knowledge to solve the problem. You can save any data you want to the system state, which will persist between calls. This gives you the capability to plan and execute complex tasks over multiple calls.\n\nYou also have a task management system at your disposal which will help you stay on track and keep the user informed of your progress. When you receive a complex task, first break it down into smaller, actionable steps. Then use the task management system to keep track of your progress.\n\n***WORKING WITH SYSTEM STATE***\n\n- GET and SET the state of any variable using the `getset_state` tool. You can also `getset_states` to getset multiple states at once.\n\n***IMPORTANT VARIABLES***\n\n- `ai_chat`: The chat messages (output)\n- `user_chat`: The user chat messages (input)\n- `requirements`: The requirements (input, output)\n- `percent_complete`: The percent complete (output)\n- `status`: The status (output)\n- `current_task`: The current task (input, output)\n- `ai_notes`: The current AI notes (input, output)\n\n***COMMUNICATING WITH THE USER***\n\n  SET the `ai_chat` state var to the chat messages you want to send to the user.\n  GET `user_chat` state var to read the chat messages from the user.\n\n***WORKING WITH TASKS***\n\n- decompose complex tasks into smaller, actionable steps. Each step should have a clear, direct action. Do not create abstract tasks like 'research' or 'browser testing'.\n- CALL `tasks_set` to set the tasks to the new tasks.\n- when you are done with a task, call `advance_task` to move to the next task and update the percent_complete.\n- when you are done with all tasks, set the status to 'complete' and the `percent_complete` to 100.\n\n***ON ERROR***\n\n- SET status to 'error'\n- CALL error to log the FULL TECHNICAL DETAILS of the error message\n- EXIT\n\n***ON WARNING***\n  SET status to 'warning'\n  CALL warn to log the warning message\n\n***ON EVERY RESPONSE***\n\n- SET the `ai_notes` state var to a summary of what you did.\n- SET the `ai_chat` state var to a summary of what you did to the user.\n\n***ON COMPLETION***\n\n- SET the `ai_notes` state var to a summary of what you did.\n- SET the `ai_chat` state var to a summary of what you did to the user.\n\n***REQUIREMENTS***\nRESPOND with a JSON object WITH NO SURROUNDING CODEBLOCKS with the following fields:\n  requirements: The new requirements\n  percent_complete: The new percent complete\n  status: The new status\n  current_task: The new current task\n  ai_notes: The new AI notes\n  ai_chat: The new ai chat\n  ",
    state: {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        ai_notes: 'no AI notes.',
    },
    tools: {
        getset_state: function (_b, state) {
            var name = _b.name, value = _b.value;
            if (value === undefined)
                delete state[name];
            else {
                state[name] = value;
            }
            return "".concat(name, " => ").concat(JSON.stringify(state[name]));
        },
        getset_states: function (_b, state) {
            var values = _b.values;
            for (var name_1 in values) {
                if (values[name_1] === undefined)
                    delete state[name_1];
                else {
                    state[name_1] = values[name_1];
                }
            }
            return JSON.stringify(state);
        },
        tasks_advance: function (_) { if (developerToolbox.state.tasks.length === 0) {
            return 'no more tasks';
        }
        else {
            developerToolbox.state.tasks.shift();
            developerToolbox.state.current_task = developerToolbox.state.tasks[0];
            console.log('task advanced to:' + developerToolbox.state.current_task);
            return developerToolbox.state.current_task;
        } },
        tasks_set: function (_b) {
            var tasks = _b.tasks;
            developerToolbox.state.tasks = tasks;
            developerToolbox.state.current_task = tasks[0];
            return JSON.stringify(developerToolbox.state.tasks);
        },
        get_current_task: function (_) { return developerToolbox.state.current_task || 'no current task'; },
        generate_tool: function (_b, state) {
            var requirements = _b.requirements;
            return __awaiter(this, void 0, void 0, function () {
                var tool;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, AssistantRun.createRun(requirements, toolmakerToolbox, function (command, run) { }, function (event, data) { })];
                        case 1:
                            tool = _c.sent();
                            return [2 /*return*/, tool];
                    }
                });
            });
        },
    },
    schemas: [
        { type: 'function', function: { name: 'getset_state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable. Call with null to delete it.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
        { type: 'function', function: { name: 'getset_states', description: 'Get or set the values of multiple named variables. Call with no values to get the current values. Call with values to set the variables. Call with null to delete them.', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to get or set', properties: { name: { type: 'string', description: 'The variable\'s name' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } }, required: ['values'] } } },
        { type: 'function', function: { name: 'tasks_advance', description: 'Advance the task to the next task' } },
        { type: 'function', function: { name: 'tasks_set', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
        { type: 'function', function: { name: 'get_current_task', description: 'Get the current task' } },
        { type: 'function', function: { name: 'generate_tool', description: 'Generate an assistant tool that will fulfill the given requirements. ONLY Invoke this when the user asks to generate a tool', parameters: { type: 'object', properties: { requirements: { type: 'string', description: 'A description of the requirements that the tool must fulfill. Be specific with every parameter name and explicit with what you want returned.' } }, required: ['message'] } } },
    ]
};
var toolmakerToolbox = {
    prompt: "INSTRUCTIONS: generate an assistant tool in Javascript that will perform a set of given requirements.\n\nGIVEN THE TOOL SCHEMA FORMAT BELOW:\n---\n// include all required libraries and dependencies in the tool file here\nconst toolSchema = {\n  state: {\n    somevalue: '',\n  }\n  schemas: [\n    {type: 'function', function: {name: 'somevalue_get', description: 'Get some value'}},\n    {type: 'function', function: {name: 'somevalue_set', description: 'Set some value', parameters: {type: 'object', properties: {value: {type: 'string', description: 'The value to set'}}, required: ['value']}}},    \n  ],\n  tools: {\n    somevalue_get : function (_) { return toolSchema.state.somevalue },\n    somevalue_set : function ({value}) { toolSchema.state.somevalue = value; return toolSchema.state.somevalue },\n  }\n}\nmodule.exports = toolSchema;\n---\nADDITIONAL SCHEMA FORMAT EXAMPLES FOR REFERENCE:\n\n{ type: 'function', function: { name: 'example_1', description: 'Example 1 description', parameters: { type: 'object', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: \"string\" } } }, required: ['param1'] } } },\n{ type: 'function', function: { name: 'example_3', description: 'Example 3 description', parameters: { type: 'object', properties: { value: { type: 'object', description: 'An optional object param', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: \"string\" } } }, required: ['param1'] } }, required: [] } } }\n---\nINSTRUCTIONS:\n\nCALL is_work_started to check if the work session has started. It will either return a 'no' or the work performed so far.\n\nIF the work session has not started,\n  CALL start_work to start the work session.\n  EXIT\n\nELSE\n  continue working on the tool\n  IF you finish the tool,\n    CALL finish_work to finish the work session and save the tool to disk.\n  ELSE\n    CALL save_temp_work to save the work performed so far.\n    EXIT\n\nIMPORTANT: \n\n*** DO NOT MODIFY THE SCHEMA FORMAT. ***\n*** ENSURE that only string values are returned from the tool functions. ***\n\n*** YOU ARE NON-CONVERSATIONAL. PRIMARY OUTPUT IS NOT MONITORED ***\n  ",
    state: {
        temp_work: '',
        complete: false
    },
    tools: {
        start_work: function (_) { toolmakerToolbox.state.temp_work = '// work started'; toolmakerToolbox.state.complete = false; console.log('Work on tool started.'); return 'started'; },
        is_work_started: function (_) { return toolmakerToolbox.state.temp_work ? toolmakerToolbox.state.temp_work : 'no'; },
        save_temp_work: function (_b) {
            var value = _b.value;
            toolmakerToolbox.state.temp_work = value;
            console.log('Saving temp work.');
            return toolmakerToolbox.state.temp_work;
        },
        finish_work: function (_b) {
            var value = _b.value;
            var codeHash = require('crypto').createHash('md5').update(value).digest('hex');
            var toolPath = path.join(process.cwd(), 'tools', "".concat(codeHash, ".js"));
            fs.writeFileSync(toolPath, value);
            console.log("Tool saved to ".concat(toolPath));
            toolmakerToolbox.state.temp_work = '';
            toolmakerToolbox.state.complete = true;
            return "Tool saved to ".concat(toolPath);
        },
    },
    schemas: [
        { type: 'function', function: { name: 'start_work', description: 'Start the work session' } },
        { type: 'function', function: { name: 'is_work_started', description: 'Check if the work session has started. It will either return a \'no\' or the work performed so far.' } },
        { type: 'function', function: { name: 'save_temp_work', description: 'Save the work performed on the tool so far, if its not complete', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The temp work to save' } }, required: ['value'] } } },
        { type: 'function', function: { name: 'finish_work', description: 'Finish the work session and save the completed generated tool to disk.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The completed tool to save to disk' } }, required: ['value'] } } },
    ]
};
var CommandProcessor = /** @class */ (function () {
    function CommandProcessor() {
        var _this = this;
        this.config = {};
        this.status = 'idle';
        this.commandQueue = [];
        this.commandHandlers = {};
        // create the readline interface
        CommandProcessor.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: ">",
        });
        // load the config file
        if (fs.existsSync(path.join(process.cwd(), 'config.json'))) {
            this.config = loadConfig();
        }
        else {
            this.config = {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION,
                PLAYHT_USER_ID: process.env.PLAYHT_USER_ID,
                PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE,
                PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE,
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
                GOOGLE_CX_ID: process.env.GOOGLE_CX_ID,
                NEWS_API_KEY: process.env.NEWS_API_KEY,
            };
            saveConfig(this.config);
        }
        CommandProcessor.assistantRunner = new AssistantRunner(AssistantRun.createToolbox(appDir), this.config.assistantId);
        CommandProcessor.taskQueue = [];
        this.initAssistant = this.initAssistant.bind(this);
        this.initializeReadline = this.initializeReadline.bind(this);
        this.handleLine = this.handleLine.bind(this);
        this.startQueueMonitor = this.startQueueMonitor.bind(this);
        this.success = this.success.bind(this);
        this.initAssistant().then(function () {
            _this.initializeReadline();
            _this.startQueueMonitor();
        });
    }
    Object.defineProperty(CommandProcessor.prototype, "activeTask", {
        get: function () {
            return CommandProcessor.taskQueue[0];
        },
        enumerable: false,
        configurable: true
    });
    CommandProcessor.cancel = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                try {
                    // TODO: cancel the 'active' run
                    return [2 /*return*/, true];
                }
                catch (error) {
                    return [2 /*return*/, false];
                }
                return [2 /*return*/];
            });
        });
    };
    CommandProcessor.prototype.initAssistant = function () {
        return __awaiter(this, void 0, void 0, function () {
            var toolbox;
            return __generator(this, function (_b) {
                toolbox = AssistantRun.createToolbox(appDir);
                return [2 /*return*/, getOrCreateAssistant(config.assistantId, {
                        instructions: toolbox.prompt,
                        name: generateUsername("", 2, 38),
                        tools: Object.keys(toolbox.schemas).map(function (schemaName) { return toolbox.schemas[schemaName]; }),
                        model: 'gpt-4-turbo-preview'
                    })];
            });
        });
    };
    CommandProcessor.prototype.initializeReadline = function () {
        var _this = this;
        CommandProcessor.rl.prompt(); // Display the initial prompt with the CWD
        CommandProcessor.rl.on('line', function (line) {
            _this.handleLine(line.trim()).then(function () {
                // Update and display the prompt for the next input
                // Moved to success and error handlers to ensure proper re-prompting
            });
        }).on('close', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // cancel the assistant run
                        process.stdout.write("\r\n");
                        return [4 /*yield*/, CommandProcessor.cancel()];
                    case 1:
                        if ((_b.sent()) && CommandProcessor.taskQueue.length > 0) {
                            console.log('cancelled');
                            CommandProcessor.rl.prompt();
                        }
                        else {
                            console.log('goodbye');
                            process.exit(0);
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    };
    CommandProcessor.prototype.handleLine = function (line) {
        return __awaiter(this, void 0, void 0, function () {
            var commandHandler;
            return __generator(this, function (_b) {
                commandHandler = AssistantRun.getCommandHandler(line, this);
                if (commandHandler) {
                    this.commandQueue.push({
                        command: line,
                        commandHandler: commandHandler,
                    });
                }
                else {
                    console.log('Invalid command');
                }
                return [2 /*return*/];
            });
        });
    };
    CommandProcessor.prototype.startQueueMonitor = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                    var _b, command, commandHandler;
                    return __generator(this, function (_c) {
                        if (this.commandQueue.length > 0) {
                            _b = this.commandQueue.shift(), command = _b.command, commandHandler = _b.commandHandler;
                            try {
                                return [2 /*return*/, AssistantRun.createRun(command, AssistantRun.createToolbox(appDir), commandHandler, function (event, data) {
                                    })];
                            }
                            catch (error) {
                                console.error("Error executing command: ".concat(error.message));
                                // Correctly refer to `this` within the arrow function
                                this.error("Error: ".concat(error.message));
                            }
                        }
                        return [2 /*return*/];
                    });
                }); }, 100);
                return [2 /*return*/];
            });
        });
    };
    CommandProcessor.prototype.success = function (message) {
        if (message)
            console.log("success"); // Log the success message
        CommandProcessor.rl.prompt(); // Re-display the prompt
    };
    CommandProcessor.prototype.error = function (message) {
        if (message)
            console.error("".concat(message)); // Log the error message
        CommandProcessor.rl.prompt(); // Re-display the prompt
    };
    CommandProcessor.taskQueue = [];
    return CommandProcessor;
}());
new CommandProcessor();
//# sourceMappingURL=index.js.map
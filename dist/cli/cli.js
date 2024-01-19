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
var inquirer = require('inquirer');
var Spinner = require('./spinner').Spinner;
/**
 * A simple command line interface for the Talkdown assistant.
 */
var Cli = /** @class */ (function () {
    function Cli(assistant, onCommand, onInterrupt, getPrompt) {
        var _this = this;
        this.assistant = assistant;
        this.onCommand = onCommand;
        this.onInterrupt = onInterrupt;
        this.getPrompt = getPrompt;
        this.spinnerText = '';
        this.questions = [];
        this._runningMode = false;
        if (Cli._instance) {
            return Cli._instance;
        }
        Cli._instance = this;
        this.onCommand = onCommand;
        this.onInterrupt = onInterrupt;
        this.getPrompt = getPrompt;
        // Handle SIGINT (Ctrl+C) gracefully.
        process.on('SIGINT', function () {
            if (_this.runningMode) {
                _this.onInterrupt(_this.assistant)
                    .then(function () { return _this.promptForCommand(); });
            }
            else {
                process.exit();
            }
        });
        // Set up the question.
        this.questions = [{
                type: 'input',
                name: 'command',
                message: this.getPrompt(),
            }];
        this.promptForCommand = this.promptForCommand.bind(this);
        this.spinnerText = '';
        this.spinner = new Spinner({
            title: "loading",
            interval: 120,
            frames: [
                "䷀", "䷁", "䷂", "䷃", "䷄", "䷅", "䷆", "䷇", "䷈", "䷉", "䷊", "䷋", "䷌", "䷍", "䷎", "䷏", "䷐", "䷑", "䷒", "䷓", "䷔", "䷕", "䷖", "䷗", "䷘", "䷙", "䷚", "䷛", "䷜", "䷝", "䷞", "䷟", "䷠", "䷡", "䷢", "䷣", "䷤", "䷥", "䷦", "䷧", "䷨", "䷩", "䷪", "䷫", "䷬", "䷭", "䷮", "䷯", "䷰", "䷱", "䷲", "䷳", "䷴", "䷵", "䷶", "䷷", "䷸", "䷹", "䷺", "䷻", "䷼", "䷽", "䷾", "䷿"
            ]
        });
    }
    Cli.createInstance = function (assistant, onCommand, onInterrupt, getPrompt) {
        return new Cli(assistant, onCommand, onInterrupt, getPrompt);
    };
    Object.defineProperty(Cli, "instance", {
        get: function () {
            return Cli.instance;
        },
        enumerable: false,
        configurable: true
    });
    Cli.prototype.updateSpinner = function (msg, details) {
        var spl = msg.split(' ');
        // if the last element is a number, then it's a progress update
        if (spl.length > 1 && !isNaN(spl[spl.length - 1])) {
            msg = spl.slice(0, spl.length - 1).join(' ');
            this.spinner.setTitle(spl.join(' ') + ' ' + details);
        }
        if (this.spinnerText !== msg) {
            this.spinnerText = msg + ' ' + details;
            this.spinner.success(msg);
            this.spinner.start();
        }
    };
    Object.defineProperty(Cli.prototype, "runningMode", {
        /**
         * Whether the CLI is currently running.
         */
        get: function () {
            return this._runningMode;
        },
        /**
         * Sets the running mode of the CLI.
         */
        set: function (value) {
            this._runningMode = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Prompts the user for a command.
     * @returns
     */
    Cli.prototype.promptForCommand = function () {
        return __awaiter(this, void 0, void 0, function () {
            var answers, command, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        this.questions = [{
                                type: 'input',
                                name: 'command',
                                message: this.getPrompt(),
                            }];
                        return [4 /*yield*/, inquirer.prompt(this.questions)];
                    case 1:
                        answers = _a.sent();
                        this.runningMode = false;
                        command = answers.command.trim();
                        if (!!command) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.promptForCommand()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3:
                        this.spinner.start();
                        this.runningMode = true;
                        return [4 /*yield*/, this.onCommand(command)];
                    case 4:
                        result = _a.sent();
                        this.spinner.stop();
                        if (result) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.promptForCommand()];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('An error occurred: ', error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Prompts the user for a command.
     * @returns
     */
    Cli.prototype.askQuestions = function (questions) {
        return __awaiter(this, void 0, void 0, function () {
            var spinnerState, answers, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        spinnerState = this.spinner.isSpinning;
                        this.spinner.stop();
                        return [4 /*yield*/, inquirer.prompt(questions)];
                    case 1:
                        answers = _a.sent();
                        if (spinnerState) {
                            this.spinner.start();
                        }
                        return [2 /*return*/, answers];
                    case 2:
                        error_2 = _a.sent();
                        console.error('An error occurred: ', error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Starts the CLI.
     */
    Cli.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.promptForCommand()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Cli;
}());
/**
 * Creates a new CLI.
 * @param assistant
 * @param onCommand
 * @param onInterrupt
 * @param getPrompt
 * @returns
 */
var cliPrompt = function (assistant, onCommand, onInterrupt, getPrompt) {
    return new Cli(assistant, onCommand, onInterrupt, getPrompt);
};
module.exports = cliPrompt;
exports.default = cliPrompt;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = void 0;
var process_1 = __importDefault(require("process"));
var readline_1 = __importDefault(require("readline"));
var Spinner = /** @class */ (function () {
    function Spinner(config) {
        this.currentIndex = 0;
        this.timer = null;
        this._isSpinning = false;
        this.title = config.title;
        this.interval = config.interval;
        this.frames = config.frames;
    }
    Object.defineProperty(Spinner.prototype, "isSpinning", {
        get: function () {
            return this._isSpinning;
        },
        enumerable: false,
        configurable: true
    });
    Spinner.prototype.setTitle = function (newTitle) {
        this.title = newTitle;
    };
    Spinner.prototype.start = function () {
        var _this = this;
        this.stop();
        this._isSpinning = true;
        this.timer = setInterval(function () {
            var frame = _this.frames[_this.currentIndex];
            _this.renderFrame(frame);
            _this.currentIndex = (_this.currentIndex + 1) % _this.frames.length;
        }, this.interval);
    };
    Spinner.prototype.stop = function () {
        if (this.timer) {
            this._isSpinning = false;
            clearInterval(this.timer);
            this.timer = null;
            readline_1.default.clearLine(process_1.default.stdout, 0); // Clear the line
            readline_1.default.cursorTo(process_1.default.stdout, 0); // Move the cursor to the beginning of the line
            process_1.default.stdout.write('\n'); // Move the cursor to the next line
        }
    };
    Spinner.prototype.renderFrame = function (frame) {
        readline_1.default.clearLine(process_1.default.stdout, 0); // Clear the entire line
        readline_1.default.cursorTo(process_1.default.stdout, 0); // Move the cursor to the beginning of the line
        process_1.default.stdout.write("".concat(frame, " ").concat(this.title, "\r")); // Write the frame and title
    };
    Spinner.prototype.success = function (message) {
        this.persist('✔', message);
    };
    Spinner.prototype.error = function (message) {
        this.persist('✘', message);
    };
    Spinner.prototype.persist = function (icon, message) {
        this.stop();
        process_1.default.stdout.write("".concat(icon, " ").concat(message || '', "\r\n")); // Write the message to stdout with an icon and start a new line
    };
    return Spinner;
}());
exports.Spinner = Spinner;
module.exports = { Spinner: Spinner };

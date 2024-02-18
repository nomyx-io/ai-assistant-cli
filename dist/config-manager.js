"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigurationManager = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var requireMain = require.main || { filename: __filename };
var ConfigurationManager = /** @class */ (function () {
    function ConfigurationManager() {
        this._config = this.loadConfig();
    }
    Object.defineProperty(ConfigurationManager.prototype, "applicationFolder", {
        get: function () {
            var _appDir = path_1.default.dirname(requireMain.filename);
            var appDirParts = _appDir.split(path_1.default.sep);
            if (appDirParts[appDirParts.length - 1] === 'bin') {
                appDirParts.pop();
                _appDir = appDirParts.join(path_1.default.sep);
            }
            return _appDir;
        },
        enumerable: false,
        configurable: true
    });
    ConfigurationManager.getInstance = function () {
        if (!ConfigurationManager._instance) {
            ConfigurationManager._instance = new ConfigurationManager();
        }
        return ConfigurationManager._instance;
    };
    ConfigurationManager.prototype.loadConfig = function () {
        var appDir = path_1.default.dirname(requireMain.filename);
        if (fs_1.default.existsSync(path_1.default.join(appDir, 'config.json'))) {
            return JSON.parse(fs_1.default.readFileSync(path_1.default.join(appDir, 'config.json'), 'utf8'));
        }
        else {
            return {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
                PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION || '',
                PLAYHT_USER_ID: process.env.PLAYHT_USER_ID || '',
                PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE || '',
                PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE || '',
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
                GOOGLE_CX_ID: process.env.GOOGLE_CX_ID || '',
                NEWS_API_KEY: process.env.NEWS_API_KEY || '',
            };
        }
    };
    ConfigurationManager.prototype.saveConfig = function (config) {
        var appDir = path_1.default.dirname(requireMain.filename);
        fs_1.default.writeFileSync(path_1.default.join(appDir, 'config.json'), JSON.stringify(config, null, 2));
    };
    ConfigurationManager.prototype.getConfig = function () { return this._config; };
    ConfigurationManager.prototype.setConfig = function (config) { this._config = config; this.saveConfig(config); };
    ConfigurationManager.prototype.getConfigValue = function (key) { return this._config[key]; };
    return ConfigurationManager;
}());
exports.ConfigurationManager = ConfigurationManager;
exports.configManager = ConfigurationManager.getInstance();
module.exports = {
    configManager: exports.configManager,
    ConfigurationManager: ConfigurationManager,
};
//# sourceMappingURL=config-manager.js.map
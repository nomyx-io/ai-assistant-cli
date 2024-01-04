"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// does config.json exist?
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var configPath = path_1.default.join(__dirname, '../..', 'config.json');
var config = {};
if (!fs_1.default.existsSync(configPath)) {
    var apiKey = process.env.OPENAI_API_KEY || '';
    config = {
        'openai_api_key': apiKey,
        'model': 'gpt-4-1106-preview',
        "playHT": {
            "apiKey": process.env.PLAYHT_API_KEY || "",
            "userId": process.env.PLAYHT_USER_ID || "",
            "maleVoice": process.env.PLAYHT_MALE_VOICE || "",
            "femaleVoice": process.env.PLAYHT_FEMALE_VOICE || "",
        }
    };
    apiKey && fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
else {
    config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
}
var baseTools = require('@nomyx/assistant-tools')(config);
exports.default = config;
module.exports = {
    config: config,
    tools: baseTools.funcs,
    schemas: baseTools.schemas,
};

const fs = require('fs');
const path = require('path');

class ConfigurationManager {
    static _instance;
    _config;

    constructor() {
        this._config = this.loadConfig();
    }

    get applicationFolder() {
        let _appDir = path.dirname(requireMain.filename);
        const appDirParts = _appDir.split(path.sep);
        if (appDirParts[appDirParts.length - 1] === 'bin') {
            appDirParts.pop();
            _appDir = appDirParts.join(path.sep);
        }
        return _appDir;
    }

    static getInstance() {
        if (!ConfigurationManager._instance) {
            ConfigurationManager._instance = new ConfigurationManager();
        }

        return ConfigurationManager._instance;
    }

    loadConfig() {
        const appDir = path.dirname(require.main.filename);
        if (fs.existsSync(path.join(appDir, 'config.json'))) {
            return JSON.parse(fs.readFileSync(path.join(appDir, 'config.json'), 'utf8'));
        } else {
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
    }

    saveConfig(config) {
        const appDir = path.dirname(require.main.filename);
        fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify(config, null, 2));
    }

    getConfig() { return this._config; }
    setConfig(config) { this._config = config; this.saveConfig(config); }
    getConfigValue(key) { return this._config[key]; }
}

const configManager = ConfigurationManager.getInstance();

module.exports = { 
     configManager
}
// const fs = require('fs');
// const path = require('path');
import fs from 'fs';
import path from 'path';

// app install directory
const requireMain = require.main || { filename: __filename };


interface IConfig {
  OPENAI_API_KEY: string;
  PLAYHT_AUTHORIZATION: string;
  PLAYHT_USER_ID: string;
  PLAYHT_MALE_VOICE: string;
  PLAYHT_FEMALE_VOICE: string;
  GOOGLE_API_KEY: string;
  GOOGLE_CX_ID: string;
  NEWS_API_KEY: string;
}

/**
 * Saves the configuration to a JSON file.
 */
function saveConfig(config) {
  const appDir = path.dirname(requireMain.filename);
  fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify(config));
}

class ConfigurationManager {
  private static _instance: ConfigurationManager;
  private _config: IConfig;

  private constructor() {
    this._config = this.loadConfig();
  }

  public get applicationFolder(): string {
    let _appDir = path.dirname(requireMain.filename);
    const appDirParts = _appDir.split(path.sep);
    if (appDirParts[appDirParts.length - 1] === 'bin') {
      appDirParts.pop();
      _appDir = appDirParts.join(path.sep);
    }
    return _appDir;
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager._instance) {
      ConfigurationManager._instance = new ConfigurationManager();
    }

    return ConfigurationManager._instance;
  }

  loadConfig(): Required<IConfig> {
    const appDir = path.dirname(requireMain.filename);
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
  
  public getConfig(): IConfig {
    return this._config;
  }

  public setConfig(config: IConfig) {
    this._config = config;
    saveConfig(config);
  }

}

export default ConfigurationManager.getInstance().getConfig();
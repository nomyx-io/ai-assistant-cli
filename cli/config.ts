// does config.json exist?
import fs from 'fs';
import path from 'path';

const configPath = path.join(__dirname, '../..', 'config.json');

let config: any = {};
if (!fs.existsSync(configPath)) {
  const apiKey = process.env.OPENAI_API_KEY || '';
  config = {
    'openai_api_key': apiKey,
    'model': 'gpt-4-1106-preview',
    "playHT": {
        "apiKey": process.env.PLAYHT_API_KEY || "",
        "userId": process.env.PLAYHT_USER_ID || "",
        "maleVoice": process.env.PLAYHT_MALE_VOICE || "",
        "femaleVoice": process.env.PLAYHT_FEMALE_VOICE || "",
    }
  }
  apiKey && fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
} else {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(configPath);
}

const baseTools: any = require('@nomyx/assistant-tools')(config);

export default config;

module.exports = {
  config,
  tools: baseTools.funcs,
  schemas: baseTools.schemas,
}
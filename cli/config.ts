// does config.json exist?
import fs from 'fs';
import path from 'path';

const configPath = path.join(__dirname, '../..', 'config.json');

if (!fs.existsSync(configPath)) {
  const config = {
    'openai_api_key': process.env.OPENAI_API_KEY || '',
    'model': 'gpt-4-1106-preview',
    "playHT": {
        "apiKey": process.env.PLAYHT_API_KEY || "",
        "userId": process.env.PLAYHT_USER_ID || "",
        "maleVoice": process.env.PLAYHT_MALE_VOICE || "",
        "femaleVoice": process.env.PLAYHT_FEMALE_VOICE || "",
    }
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export default config;

module.exports = config;
require('dotenv').config();

const { generateUsername } = require("unique-username-generator");
const AssistantAPI = require('@nomyx/assistant');
const { Toolbox } = require('./toolbox');
const readline = require('readline');

const isBrowser = () => typeof window !== 'undefined';
const loadConfig = () => configManager.getConfig();
const saveConfig = (config: any) => configManager.setConfig(config);

const toolbox = Toolbox.loadToolbox(__dirname, {
    prompt: 'assistant',
    tools: {},
    schemas: [],
    state: {}
});

const assistantAPI = new AssistantAPI();
assistantAPI.name = generateUsername("", 2, 38);
assistantAPI.tools = toolbox.tools;
assistantAPI.schemas = toolbox.schemas;
if(loadConfig().proxyUrl) {
    assistantAPI.serverUrl = loadConfig().proxyUrl;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
}).on('close', async () => {
    console.log('goodbye');
    process.exit(0);
}).on('line', async (line: string) => {
    assistantAPI.runActionHandler('assistant-input', line);
    rl.prompt();
})

rl.prompt();

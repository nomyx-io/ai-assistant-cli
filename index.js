require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const debug = false;
const { generateUsername } = require("unique-username-generator");
const { configManager } = require('./config-manager');
const { AssistantAPI, AssistantRunner } = require('./assistant');

const isBrowser = () => typeof window !== 'undefined';
const loadConfig = () => configManager.getConfig();
const saveConfig = (config) => configManager.setConfig(config);

const assistantAPI = new AssistantAPI();
//assistantAPI.serverUrl = 'http://localhost:8654';


const name = generateUsername("", 2, 38);



const runner = new AssistantRunner();

async function cleanupOld() {
    const OpenAI = require('openai');
    const openai = new OpenAI(process.env.OPENAI_API_KEY);
    const assistants = (await openai.beta.assistants.list()).data.slice(0, 100);
    const toDelete = assistants;
    if (toDelete.length > 0) {
      const delCount = toDelete.length;
      await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
      console.log(`deleted ${delCount} assistants`);
    }
}
// cleanupOld();

// set up a readline interface
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
}).on('close', async () => {
    process.stdout.write(`\r\n`);
    if (AssistantRunner.current_run && AssistantRunner.current_run.state.status !== 'complete') {
        await assistantAPI.callAPI('runs', ['cancel'], { thread_id: AssistantRunner.current_run.thread_id, run_id: AssistantRunner.current_run.run_id });
        console.log('run cancelled');
    }
    else {
        console.log('goodbye');
        process.exit(0);
    }
  });

// prompt the user for input
rl.prompt();

// listen for user input
rl.on('line', async (line) => {
    await runner.run(line);
    rl.prompt();
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});


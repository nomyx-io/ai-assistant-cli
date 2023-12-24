#!/usr/bin/env node
require('dotenv').config();

// If no request is given, start a chat session
const readline = require('readline');

const { cat } = require('shelljs');
const { Assistant, Thread, loadPersona } = require("nomyx-assistant");
const { schemas, funcs, tools } = require("nomyx-assistant-tools");

const ora = require('ora');

const highlight = require('cli-highlight').highlight;

// does config.json exist?
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(configPath)) {
    const config = {
        'openai_api_key': process.env.OPENAI_API_KEY || '',
        'model': 'gpt-4-1106-preview',
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));


let request = process.argv.slice(2).join(' ');

let asst: any = undefined;

async function processCommand() {
    // create the spinner
    const spinner = ora({
        spinner: {
            interval: 100,
            frames: [
                // '⠋',
                // '⠙',
                // '⠹',
                // '⠸',
                // '⠼',
                // '⠴',
                // '⠦',
                // '⠧',
                // '⠇',
                // '⠏',
                // '🌍',
                // '🌍',
                // '🌎',
                // '🌎',
                // '🌏',
                // '🌏'
                '䷀', '䷁', '䷂', '䷃', '䷄', '䷅', '䷆', '䷇', '䷈', '䷉', '䷊', '䷋', '䷌', '䷍', '䷎', '䷏', '䷐', '䷑', '䷒', '䷓', '䷔', '䷕', '䷖', '䷗', '䷘', '䷙', '䷚', '䷛', '䷜', '䷝', '䷞', '䷟', '䷠', '䷡', '䷢', '䷣', '䷤', '䷥', '䷦', '䷧', '䷨', '䷩', '䷪', '䷫', '䷬', '䷭', '䷮', '䷯', '䷰', '䷱', '䷲', '䷳', '䷴', '䷵', '䷶', '䷷', '䷸', '䷹', '䷺', '䷻', '䷼', '䷽', '䷾', '䷿'
            ]
        },
        text: 'Loading'
    })

    let threadId: any = undefined;
    
    const getAssistant = async (threadId: any) => {
        if(asst) {
            return asst;
        }
        const assistants = await Assistant.list();        
        const assistant = assistants.find((a: any) => a.name === 'nomyx-assistant');
        if (!assistant) {
            return await Assistant.create(
                'nomyx-assistant', 
                await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                schemas, 
                'gpt-4-1106-preview',
                threadId
            );
        }
        if(threadId) {
            assistant.thread = await Thread.get(threadId);
        }
        return assistant;
    }
    const assist = await getAssistant(threadId);
    asst = assist;

    const processMessages = async (assistant: any, request: string, funcs: any, schemas: any, threadId: any): Promise<any> => {
        assistant = await getAssistant(threadId);
        spinner.start();
        let result;
        try {
            result = await assistant.run(request, funcs, schemas, config.apiKey, (event: string, value: any) => {
                spinner.text = event;
            });
        } catch (err: any) {
            spinner.stop();
            if (err.response && err.response.status === 429) {
                console.log('Too many requests, pausing for 30 seconds');
                let result = err.message
                const retryAfter = err.response.headers['retry-after'];
                if (retryAfter) {
                    const retryAfterMs = parseInt(retryAfter) * 1000;
                    result += `... retrying in ${retryAfter} seconds`;
                    await new Promise(resolve => setTimeout(resolve, retryAfterMs));
                }
                return await processMessages(assistant, request, funcs, schemas, threadId);
            }
        }

        spinner.stop();
        try {
            const highlighted = highlight(result, { language: 'javascript', ignoreIllegals: true });
            console.log('\n' + highlighted + '\n');
        } catch (err) {
            console.log(result);
        }

        return {
            message: result,
            threadId: assistant.thread.id
        }
    }

    if (request) {
        try {
            const messageResults = await processMessages(asst, request, funcs, schemas, threadId);
            threadId = messageResults['threadId'];
        } catch (err) { 
            console.error(err); 
        }
    } else {
        const processLine = async () => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const hasApiKey = config.openai_api_key && config.openai_api_key.length > 0;
            rl.setPrompt(hasApiKey?'> ': 'Enter your OpenAI API key: ');
            rl.prompt();
            rl.on('line', async (request: any) => {
                if(!hasApiKey) {
                    config.openai_api_key = request;
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                    rl.close();
                    await processLine();
                    return;
                }
                try {
                    const messageResults = await processMessages(asst, request, funcs, schemas, threadId);
                    threadId = messageResults['threadId'];
                    rl.close();
                    await processLine();
                } catch (err) {
                    console.error(err);
                    rl.close();
                    await processLine();
                }
            });
        }
        await processLine();
    }
}
processCommand();
const { cat } = require('shelljs');
const fs = require('fs');
const path = require('path');

import { getPersonaPrompt } from "./personas";

const { Assistant, Thread } = require("@nomyx/assistant");
const config = require('./config');

const highlight = require('cli-highlight').highlight;
const configPath = path.join(__dirname, '../..', 'config.json');
const cliPrompt = require('./cli');

// global variables
let threadId: any = config.config.threadId; // threadId is used to keep track of the threadId of the assistant
if(config.config.threadId) {
  console.log('threadId:', config.config.threadId);
}
let asst: any = undefined; // asst is used to keep track of the assistant
let runningMode = false; // runningMode is used to keep track of whether the assistant is running or not
let request = process.argv.slice(2).join(' '); // request is used to keep track of the user's request

// get the assistant object from openai or create a new one
const getAssistant = async (threadId: any) => {
  if (asst) { return asst; }
  const assistants = await Assistant.list(config.config.openai_api_key);
  const assistant = asst = assistants.find((a: any) => a.name === config.config.assistant_name);
  if (!assistant) {
    const pp = getPersonaPrompt(config.schemas);
    asst = await Assistant.create(
      config.config.assistant_name,
      pp,
      config.schemas,
      config.config.model,
      threadId
    );
    return asst;
  }
  threadId && (assistant.thread = await Thread.get(threadId));
  return assistant;
}

function prettyPrint(result: any) {
  try {
    const highlighted = highlight(result, { language: 'javascript', ignoreIllegals: true });
    console.log('\n' + highlighted + '\n');
  } catch (err) {
    console.log(result);
  }
}

let assistant: any;
let cli: any;
async function main() {
  assistant = await getAssistant(threadId);
  
  const processUserCommand = async (request: string, threadId: any): Promise<any> => {
    // get the assistant object from openai or create a new one
    assistant = await getAssistant(threadId);
    // run the assistant with the user's request
    let result;
    try {
      if(request === 'clear') {
        config.config.threadId = threadId = undefined;
        return {
          message: result,
          threadId: undefined
        }
      }
      else {

        let message: any = {
          requirements: request,
          percent_complete: 0,
          next_task: "",
          comments: "",
        }
        const iterate = async (): Promise<any> => {
          result = await assistant.run(
            JSON.stringify(message), 
            config.tools, 
            config.schemas, 
            config.config.openai_api_key, 
            (event: string, value: any) => {}
          );
          message = JSON.parse(result);
          
          // if the assistant is awaiting a user response, then we'll iterate again to get it
          if(message.flow_control === 'awaiting_user_response') {
            return;
          }

          // get the state of the assistant
          const next_task = message.next_task;
          const update = message.update;
          const warning = message.warning;
          const flow_control = message.flow_control;

          // remove the fields that we don't want to go back to the assistant
          delete message.update;
          delete message.flow_control;
          delete message.warning;

          // get the percent complete and exit if it's 100
          const percent_complete = message.percent_complete;
          if(percent_complete === 100 || flow_control === 'complete') {
            const _message = `complete. ${update}`;
            return _message;
          }

          // format a message to the user
          const _message = `percent_complete: ${percent_complete}, next_task: ${next_task}, update: ${update}${warning?`, warning: ${warning}`:``}${flow_control?`, flow_control: ${flow_control}`:``}`;
          prettyPrint(_message);

          await iterate();
        }
        await iterate();
      }
    } 
    catch (err: any) {
      // a common error is too many requests, so we'll retry after the retry-after header
      if (err.response && err.response.status === 429) {
        console.log('Too many requests, pausing for 30 seconds');
        let result = err.message
        const retryAfter = err.response.headers['retry-after'];
        if (retryAfter) {
          const retryAfterMs = parseInt(retryAfter) * 1000;
          result += `... retrying in ${retryAfter} seconds`;
          await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        }
        return `Error: ${result}`
      }
    }
    prettyPrint(result);
    return {
      message: result,
      threadId: assistant.thread.id
    }
  }
  
  cli = await cliPrompt(assistant, async (command: string) => {
    return new Promise((resolve) => {

      // if there is no api key, then the user is entering it
      const hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
      if (!hasApiKey) {
        config.config.openai_api_key = request;
        fs.writeFileSync(configPath, JSON.stringify(config.config, null, 2));
        resolve(false);
        return
      }                                                                                                                                                                                                       
      // process the user's command                                                                                                                                                                                                                                      
      processUserCommand(command, threadId).then((messageResults: any) => {                                                                                                                                                                        
        threadId = messageResults['threadId'];
        config.config.threadId = threadId;
        config.updateConfig(config.config);
        resolve(false);                                                                                                                                                                                                                                                                                                                                                                                                                                            
      }); 
    })
  }, () => {
    return new Promise((resolve) => {
      getAssistant(threadId).then((assistant: any) => {
        if(assistant.run.data.status === 'running') {
          assistant.cancel();
        }
        resolve(false);
       });
    })
  }, () => {
    const hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
    return hasApiKey ? '> ' : 'Enter your OpenAI API key: '
  });
  cli.assistant = assistant;
  cli.start();
}
main();
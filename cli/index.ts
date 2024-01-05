const { cat } = require('shelljs');
const fs = require('fs');
const path = require('path');


const { Assistant, Thread, loadNewPersona } = require("@nomyx/assistant");
const config = require('./config');

const highlight = require('cli-highlight').highlight;
const configPath = path.join(__dirname, '../..', 'config.json');
const cliPrompt = require('./cli');

// global variables
let threadId: any = undefined; // threadId is used to keep track of the threadId of the assistant
let asst: any = undefined; // asst is used to keep track of the assistant
let runningMode = false; // runningMode is used to keep track of whether the assistant is running or not
let request = process.argv.slice(2).join(' '); // request is used to keep track of the user's request

function getPersonaPrompt(p: any) {
  return "First, load your list of learned skills and tools in preparation for the interaction. Then carefully read through the given task: \n\n".concat(p, "\n\nNow, determine the complexity of the task and decide whether to use an existing skill or create a new one. \nIf you decide to use an existing skill, notify the user and execute the task. \nIf you decide to create a new skill, notify the user and execute the task. \nIf the performance is unsatisfactory, improve the skill with the outcome and update the learned skills repository.");
}

// get the assistant object from openai or create a new one
const getAssistant = async (threadId: any) => {
  if (asst) { return asst; }
  const assistants = await Assistant.list(config.config.openai_api_key);
  const assistant = asst = assistants.find((a: any) => a.name === config.config.assistant_name);
  if (!assistant) {
    asst = await Assistant.create(
      config.config.assistant_name,
      await loadNewPersona(config.schemas),
      config.schemas,
      config.config.model,
      threadId
    );
    return asst;
  }
  threadId && (assistant.thread = await Thread.get(threadId));
  return assistant;
}

let assistant;
let cli: any;
async function main() {
  assistant = await getAssistant(threadId);
  
  const processUserCommand = async (request: string, threadId: any): Promise<any> => {
    // get the assistant object from openai or create a new one
    assistant = await getAssistant(threadId);
    // run the assistant with the user's request
    let result;
    try {
      result = await assistant.run(getPersonaPrompt(request), config.tools, config.schemas, config.config.openai_api_key, (event: string, value: any) => {
        cli && cli.updateSpinner(event);
      });
    } catch (err: any) {
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
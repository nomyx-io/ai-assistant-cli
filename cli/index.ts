const { cat } = require('shelljs');
const fs = require('fs');
const path = require('path');
const { Spinner } = require('./spinner');  

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

// get the assistant object from openai or create a new one
const getAssistant = async (threadId: any) => {
  if (asst) { return asst; }
  const assistants = await Assistant.list(config.config.openai_api_key);
  const assistant = asst = assistants.find((a: any) => a.name === config.config.assistant_name);
  if (!assistant) {
    asst = await Assistant.create(
      config.config.assistant_name,
      await loadNewPersona(config.config.tools),
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
async function main() {
  assistant = await getAssistant(threadId);
  
  const processUserCommand = async (request: string, threadId: any, updateSpinner: (msg: string)=> void): Promise<any> => {
    assistant = await getAssistant(threadId);
    let result;
    try {
      result = await assistant.run(request, config.tools, config.schemas, config.config.openai_api_key, (event: string, value: any) => {
        updateSpinner && updateSpinner(event);
      });
    } catch (err: any) {
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
  
  const cp = await cliPrompt(assistant, (command: string) => {
    // if there is no api key, then the user is entering it
    const hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
    if (!hasApiKey) {
      config.config.openai_api_key = request;
      fs.writeFileSync(configPath, JSON.stringify(config.config, null, 2));
      return false;
    }                                                                                                                                                                                                       
    const spinner = new Spinner({
      title: "loading",
      interval: 120,
      frames: [
        "䷀",
        "䷁",
        "䷂",
        "䷃",
        "䷄",
        "䷅",
        "䷆",
        "䷇",
        "䷈",
        "䷉",
        "䷊",
        "䷋",
        "䷌",
        "䷍",
        "䷎",
        "䷏",
        "䷐",
        "䷑",
        "䷒",
        "䷓",
        "䷔",
        "䷕",
        "䷖",
        "䷗",
        "䷘",
        "䷙",
        "䷚",
        "䷛",
        "䷜",
        "䷝",
        "䷞",
        "䷟",
        "䷠",
        "䷡",
        "䷢",
        "䷣",
        "䷤",
        "䷥",
        "䷦",
        "䷧",
        "䷨",
        "䷩",
        "䷪",
        "䷫",
        "䷬",
        "䷭",
        "䷮",
        "䷯",
        "䷰",
        "䷱",
        "䷲",
        "䷳",
        "䷴",
        "䷵",
        "䷶",
        "䷷",
        "䷸",
        "䷹",
        "䷺",
        "䷻",
        "䷼",
        "䷽",
        "䷾",
        "䷿"
      ]
    });
    let spinnerText = '';
    const updateSpinner = (msg: string) => {
      const spl: any = msg.split(' ');
      // if the last element is a number, then it's a progress update
      if (spl.length > 1 && !isNaN(spl[spl.length - 1])) {
        msg = spl.slice(0, spl.length - 1).join(' ');
        spinner.setTitle(spl.join(' '));
      }
      if (spinnerText !== msg) {
        spinnerText = msg;
        spinner.success(msg);
        spinner.start();
      }                                                                                                                                                                                                                                                                                                                                                                                               
    }                                                                                                                                                                                                                                                           
    spinner.start();                                                                                                                                                                                                                                                 
    processUserCommand(command, threadId, updateSpinner).then((messageResults: any) => {                                                                                                                                                                        
      threadId = messageResults['threadId'];   
      spinner.stop();                                                                                                                                                                                                                                                                                                                                                                                                                                              
    }); 
  }, () => {
    return new Promise((resolve) => {
      getAssistant(threadId).then((assistant: any) => {
        assistant.cancel();
        resolve(false);
       });
    })
  }, () => {
    const hasApiKey = config.config.openai_api_key && config.config.openai_api_key.length > 0;
    return hasApiKey ? '> ' : 'Enter your OpenAI API key: '
  });
  cp.assistant = assistant;
  cp.start();
}
main();
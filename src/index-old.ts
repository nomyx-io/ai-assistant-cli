import { get } from "http";

const readline = require('readline');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { generateUsername } = require("unique-username-generator");
var clc = require("cli-color");

// get command-line arguments
const args = process.argv.slice(2);

// look for command-line flags
const flags = args.filter((arg) => arg.startsWith('--'));
const commands = args.filter((arg) => !arg.startsWith('--'));

const requireMain = require.main || { filename: __filename };

// get the application's install directory
let appDir = path.dirname(requireMain.filename);
const appDirParts = appDir.split(path.sep);
if (appDirParts[appDirParts.length - 1] === 'bin') {
  appDirParts.pop();
  appDir = appDirParts.join(path.sep);
}

function containsFlag(flag: string) {
  return flags.indexOf(flag) !== -1;
}

function saveConfig(config: { [key: string]: string }) {
  // get the application install directory
  const appDir = path.dirname(requireMain.filename);
  fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify(config));
}

function loadConfig() {
  const appDir = path.dirname(requireMain.filename);
  if (fs.existsSync(path.join(appDir, 'config.json'))) {
    return JSON.parse(fs.readFileSync(path.join(appDir, 'config.json')));
  } else {
    const config = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION,
      PLAYHT_USER_ID: process.env.PLAYHT_USER_ID,
      PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE,
      PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GOOGLE_CX_ID: process.env.GOOGLE_CX_ID,
      NEWS_API_KEY: process.env.NEWS_API_KEY,
    };
    saveConfig(config as any);
    return config;
  }
}
const config = loadConfig();
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY || process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

// look for the --help flag
if (flags.indexOf('--help') !== -1) {
  console.log('Usage: assistant [flags] [commands]');
  console.log('Flags:');
  console.log('  --help: Display this help message');
  console.log('  --version: Display the version of the program');
  console.log('  --verbose: Display verbose output');
  console.log('  --file [file]: Execute the commands in the given file');
  console.log('Commands:');
  console.log('  [command]: The command to execute');
  console.log('  quit: Quit the program');
  console.log('  clear: Clear the screen');
  console.log('  env [key] [value]: Set an environment variable');
  console.log('  status: Display the current status');
  console.log('  echo [message]: Echo the given message');
  process.exit(0);
}

const shorten = (str: any) => { if(!str) return ''; const l = str.length; str.slice(0, 100) + (l > 100 ? '...' : ''); return (str.length === 0 ? 'empty' : str )};

async function withRetriesAndTimeouts(func: any, retries = 3, timeout = 1000) {
  let tryCount = 0;
  const _ = async (): Promise<any> => {
    try {
      return await func();
    } catch (e) {
      if (tryCount < retries) {
        await new Promise(resolve => setTimeout(resolve, timeout));
        tryCount++;
        return await _();
      }
      throw e;
    }
  }
  return _();
}


const getOrCreateAssistant = async (assistantId: any, inputObject: any) => {
  return withRetriesAndTimeouts(async () => {
    if (assistantId) {
      try {
        return await openai.beta.assistants.retrieve(assistantId);
      }
      catch (error) {
        return await openai.beta.assistants.create(inputObject);
      }
    }
    else return await openai.beta.assistants.create(inputObject);
  });
}

const getOrCreateThread = async (config: any) => {
  return withRetriesAndTimeouts(async () => {
    if (!config.threadId) {
      const thread = await openai.beta.threads.create();
      config.threadId = thread.id;
      saveConfig(config);
      return thread;
    } else {
      try {
        return openai.beta.threads.retrieve(config.threadId);
      } catch (e) {
        if (config.threadId) {
          delete config.threadId;
          saveConfig(config);
          return getOrCreateThread(config);
        } else throw e;
      }
    }
  });
}

const getLatestMessage = async (threadId: string) => {
  return withRetriesAndTimeouts(async () => {
    if (threadId) {
      const messages = await openai.beta.threads.messages.list(threadId);
      const message = messages.data[messages.data.length - 1].content;
      const rval = message[0].text.value;
      return rval.replace(/\\n/g, '');
    } else throw new Error('No threadId provided');
  });
}

  // wait for the rate limit to be lifted
const waitIfRateLimited = async (run: any) => {
  if (!run) return false;
  if (!run.last_error) return false;
  if (run.last_error && run.last_error.indexOf && run.last_error.indexOf('rate limited') !== -1) {
    const waitTime = (
      parseInt(run.last_error.match(/(\d+)m(\d+)/)[1]) * 60 + parseInt(run.last_error.match(/(\d+)m(\d+)/)[2]) + 1) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return true;
  } else return false;
}

const createMessage = async (threadId: string, content: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.messages.create(threadId, { role: "user", content });
  });
}

const createThread = async () => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.create();
  });
}

const loadThread = async (threadId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.retrieve(threadId);
  })
}

const createRun = async (assistantId: string, threadId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });
  });
}

const retrieveRun = async (threadId: string, runId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.retrieve(threadId, runId);
  });
}

const listRunSteps = async (threadId: string, runId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.steps.list(threadId, runId);
  });
}

const retrieveRunSteps = async (threadId: string, runId: string, stepId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.steps.retrieve(threadId, runId, stepId);
  });
}

const modifyRun = async (threadId: string, runId: string, data: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.update(threadId, runId, data);
  });
}

const cancelRun = async (threadId: string, runId: string) => {
  return withRetriesAndTimeouts(async () => {
    return await openai.beta.threads.runs.cancel(threadId, runId);
  });
}


class AssistantRunner {
  thread: any
  run: any
  run_steps: any
  status: string
  assistant: any
  prompt: any
  id
  uid
  timer: any
  toolbox: any
  latestMessage: string = '';

  constructor(
    toolbox: any,
    uid?: any) {
    this.thread = undefined;
    this.run = undefined;
    this.run_steps = undefined;
    this.status = 'idle';
    this.assistant = undefined;
    this.timer = 0;
    this.id = '';
    this.uid = uid || '';
    this.toolbox = toolbox;
  }
  destroy() {
    if (this.run && this.thread) {
      openai.beta.threads.runs.cancel(this.thread.id, this.run.id).then(() => {
        openai.beta.assistants.del(this.assistant.id);
      })
    } else {
      openai.beta.assistants.del(this.assistant.id);
    }
  }

  // request a cancellation of the run
  async requestCancel() {
    if (this.run && this.thread) {
      try {
        await openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
      } catch (e) {
        console.error('Error cancelling run:', e);
      }
    }
  }
}

class AssistantRun {
  assistant: any;
  eventHandler: any;
  usages: any[];
  state: any = {};
  thread: any;
  run: any;
  run_steps: any;
  status: string = 'idle';
  timer: any;
  latestMessage: string = '';
  toolbox: any;
  tools: any;
  schemas: any;
  toolCalls: any;
  toolOutputs: any;
  commandHandler: any;
  constructor(toolbox: any, commandHandler: any, eventHandler: any) {
    this.commandHandler = commandHandler;
    this.eventHandler = eventHandler;
    this.usages = [];
    this.toolbox = toolbox;
    this.tools = toolbox.tools;
    this.schemas = toolbox.schemas;
    this.state = toolbox.state;
  }
  static getCommandHandler(command: string, run: any) {
    if (AssistantRun.commandHandlers[command]) {
      return () => AssistantRun.commandHandlers[command](command, run);
    } else if (AssistantRun.commandHandlers['*']) {
      return () => AssistantRun.commandHandlers['*'](command, run);
    }
    return null;
  }
  static commandHandlers: any = {
    'quit': (_:any, run: any) => process.exit(),
    'clear': (_:any, run: any) => {
      process.stdout.write('\x1Bc');
      CommandProcessor.rl.prompt();
    },
    'clean': async (_: any, run: any) => {
      const assistants = (await openai.beta.assistants.list()).data
      const rlAssistants = assistants.filter((assistant: any) => assistant.name === 'assistant');
      const toolmakerAssistants = assistants.filter((assistant: any) => assistant.name === 'toolmaker');
      const toDelete = [...rlAssistants, ...toolmakerAssistants];
      if (toDelete.length > 0) {
        const delCount = toDelete.length;
        await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
        console.log(`deleted ${delCount} assistants`);
      }
    },
    'env': async (command: string, run: any) => {
      const [_, key, value] = command.split(' ');
      if (key && value) {
        process.env[key] = value;
        CommandProcessor.rl.prompt();
      }
    },
    'reset': async (_: string, run: any) => {
      delete config.assistantId;
      delete config.threadId;
      delete config.runId;
      saveConfig(config);
      CommandProcessor.assistantRunner = new AssistantRunner(AssistantRun.createToolbox(appDir));
      config.assistantId = CommandProcessor.assistantRunner.id;
      saveConfig(config);
      CommandProcessor.rl.prompt();
    },
    'echo': async (echo: string, run: any) => {
      console.log(echo);
    },
    '*': async (command: string, run: any) => { // Make sure this is marked as async
      if (run.status === 'working') {
        return command;
      }
      config.assistantId = CommandProcessor.assistantRunner.uid;
      saveConfig(config);
    }
  };

  static createToolbox(appDir: any) {
    const toolbox: any = {
      prompt: developerToolbox.prompt,
      tools: developerToolbox.tools,
      schemas: developerToolbox.schemas,
      state: developerToolbox.state
    }
    const toolsFolder = path.join(appDir, 'tools')
    if (fs.existsSync(toolsFolder)) {
      const files = fs.readdirSync(toolsFolder);
      files.forEach((file: any) => {
        const tool = require(path.join(appDir, 'tools', file));
        toolbox.tools = { ...toolbox.tools, ...tool.tools };
        toolbox.schemas = [...toolbox.schemas, ...tool.schemas];
        toolbox.state = { ...toolbox.state, ...tool.state };
      });
    } else {
      fs.mkdirSync(path.join(appDir, 'tools'));
    }
    return toolbox;
  }

  static async createRun(content: string, toolbox: any, commandHandler: any, eventHandler: any): Promise<any> {
    const aRunObj = new AssistantRun(toolbox, commandHandler, eventHandler);
    CommandProcessor.taskQueue.push(aRunObj);
    const input_vars: any = {
      requirements: content,
      current_task: aRunObj.state.current_task || '',
      percent_complete: aRunObj.state.percent_complete,
      ai_notes: aRunObj.state.ai_notes,
      user_chat: content,
      ai_chat: '',
    }
    if(containsFlag('--attach')||containsFlag('-a')) {
      // load the file and attach it to the run
      const fPath = path.join(process.cwd(), args[1]);
      let file = fs.readFileSync(fPath, 'utf8');
      // truncate the file if it's longer than 8k
      if(file.length > 8192) {
        file = file.slice(0, 8192);
        file += '\n\n... file truncated, use head or tail to view the rest of the file ...';
      }
      input_vars.file_contents = file;
      console.log(`attached file: ${fPath}`);
    }

    let ret = await aRunObj.runAssistant(JSON.stringify(input_vars), (event: any, data: any) => {
      if (event === 'exec-tools') {
        const fouts: any = [];
        data.toolOutputs.forEach((output: any) => {
          const func = data.toolCalls.find((call: any) => call.id === output.tool_call_id).function.name;
          fouts.push ({
            function: func,
            arguments: data.toolCalls.find((call: any) => call.id === output.tool_call_id).function.arguments,
            output: output.output.slice(0, 100) + '...'
          });
        });
        console.log('\nexecuting tools')
        console.table(fouts);
      }
      if (event == 'assistant-completed') {
        const step_details = data.runSteps.step_details[data.runSteps.step_details.type]
        if (data.runSteps.step_details.type === 'tool_calls') {
          const fouts: any = [];
          step_details.forEach((detail: any) => {
            fouts.push({
              function: detail.function.name,
              arguments: detail.function.arguments,
              output:shorten(detail.output)
            });
          });
          const latestMessage = data.runSteps.step_details[data.runSteps.step_details.type].map((detail: any) => detail && detail.output && (shorten(detail.output.join('\n') + '\n')));
          console.table(fouts);
          console.log('\n' +latestMessage);
        }
        aRunObj.usages.push(data.runSteps.usage);
      }
    });

    try {
      const parsedResponse = JSON.parse(ret);
      if (parsedResponse.show_file) {
        aRunObj.state.file_name = parsedResponse.show_file;
        aRunObj.state.file_contents = fs.readFileSync(parsedResponse.show_file, 'utf8');
        if( aRunObj.state.file_contents.length > 8192) {
          aRunObj.state.file_contents =  aRunObj.state.file_contents.slice(0, 8192);
          aRunObj.state.file_contents += '\n\n... file truncated, use head or tail to view the rest of the file ...';
        }
      } else {
        aRunObj.state.file_name = '';
        aRunObj.state.file_contents = '';
      }
      if (parsedResponse.ai_chat) {
        console.log(parsedResponse.ai_chat);
      }
    } catch (e) {
    }

    const usageSummary = aRunObj.usages.reduce((acc, usage) => {
      for (const key in usage) {
        if (usage[key] && usage[key] !== 'null') {
          acc[key] += usage[key];
        }
      }
      return acc;
    }, {
      prompt_tokens: 0,
      completion_tokens: 0,
      chat_tokens: 0,
    });
    

    if (parseInt(aRunObj.state.percent_complete) === 100) {
      aRunObj.usages.push(usageSummary);
      console.log('\nusage summary');
      console.table(aRunObj.usages);
      console.table(aRunObj.state);
      aRunObj.persist('done');
      aRunObj.stopSpinner();
      CommandProcessor.rl.prompt();
    } else {
      // add another run to the queue using the last state
      return AssistantRun.createRun(JSON.stringify({
        requirements: aRunObj.state.requirements,
        current_task: aRunObj.state.current_task,
        percent_complete: aRunObj.state.percent_complete,
        ai_notes: aRunObj.state.ai_notes,
        user_chat: aRunObj.state.user_chat,
        ai_chat: aRunObj.state.ai_chat,
      }), toolbox, commandHandler, eventHandler);
    }
    CommandProcessor.taskQueue.splice(CommandProcessor.taskQueue.indexOf(aRunObj), 1);
    return aRunObj;
  }
  frames = [
    "◟", "◡", "◞", "◝", "◠", "◜", "◟", "◡", "◞", "◝", "◠", "◜"
  ]
  currentIndex = 0
  spinning = false
  interval =120
  dots = 0
  renderFrame(frame: any) {
    //readline.clearLine(process.stdout, this.dots); // Clear the entire line
    readline.cursorTo(process.stdout, this.dots); // Move the cursor to the beginning of the line
    const dots = '.'.repeat(this.dots);
    process.stdout.write(`${frame}\r${dots}\r`);
  }
  startSpinner() {
    this.spinning = true;
    this.timer = setInterval(() => {
      this.dots = (this.dots + 1) % 3;
      const frame = this.frames[this.currentIndex];
      this.renderFrame(frame);
      this.currentIndex = (this.currentIndex + 1) % this.frames.length;
    }, this.interval);
  }
  stopSpinner() {
    if (this.timer) {
      this.spinning = false;
      clearInterval(this.timer);
      this.timer = null;
      readline.clearLine(process.stdout, 0); // Clear the line
      readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
      process.stdout.write('\n');
    }
  }
  success(message: string) {
    if (this.timer) {
      this.spinning = false;
      clearInterval(this.timer);
      this.timer = null;
      readline.clearLine(process.stdout, 0); // Clear the line
      readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
      process.stdout.write(`\n✔ ${message}\n`);
    }
  }
  persist( message: any) {
    process.stdout.write(`✔ ${message}\r\n`); // Write the message to stdout with an icon and start a new line
  }
  async runAssistant(content: string, onEvent: any): Promise<string> {
    // create or loaSpd the assistant
    this.assistant = await getOrCreateAssistant(config.assistantId, {
      instructions: developerToolbox.prompt,
      name: generateUsername("", 2, 38),
      tools: Object.keys(this.toolbox.schemas).map((schemaName) => this.toolbox.schemas[schemaName as any]),
      model: 'gpt-4-turbo-preview'
    });
    config.assistantId = this.assistant.id;
    saveConfig(config);
    onEvent('assistant-created', { assistantId: config.assistantId });

    this.thread = await getOrCreateThread(config);

    async function createMessageWithRunCancel(threadId: string, content: string) {
      try {
        // create a new message and add it to the thread
        const msg = await createMessage(threadId, content);
        onEvent('message-created', { threadId: threadId, message: content });
        return msg
      } catch (e: any) {
        // get an string out that starts with run_xxxxxx
        let runId = e.message.match(/run_\w+/);
        if (runId) {
          runId = runId[0];
          await cancelRun(threadId, runId);
          return createMessage(threadId, content);
        } else {
          throw e;
        }
      }
    }

    await createMessageWithRunCancel(this.thread.id, content);

    // create a new run with the assistant
    this.run = await createRun(this.assistant.id, this.thread.id);
    config.runId = this.run.id;
    saveConfig(config);
    onEvent('run-created', { runId: config.runId });
    this.status = 'starting';
    let lastMessage = '';

    onEvent('assistant-started', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
    const loop = async (): Promise<string> => {

      await new Promise(resolve => setTimeout(resolve, 1000));
      this.run = await retrieveRun(this.thread.id, this.run.id);
      this.status = 'running';
      this.latestMessage = await getLatestMessage(this.thread.id);
      if (lastMessage !== this.latestMessage) {
        lastMessage = this.latestMessage;
      }

      onEvent('assistant-loop-start', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });

      // if the run has failed, we set the latest message to the error message
      if (this.run.status === "failed") {
        process.stdout.write(`❌\r\n`);
        this.status = 'failed';
        if (await waitIfRateLimited(this.run)) return loop();
        this.latestMessage = 'failed run: ' + this.run.last_error || this.latestMessage;
        onEvent('assistant-failed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
        return this.latestMessage;
      }

      // if the run is cancelled, we set the latest message to 'cancelled run'
      else if (this.run.status === "cancelled") {
        process.stdout.write(`🛑\r\n`);
        this.status = 'cancelled';
        this.latestMessage = 'cancelled run';
        onEvent('assistant-cancelled', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
        return this.latestMessage;
      }

      // if the run is completed, we set the latest message to the last message in the thread
      else if (this.run.status === "completed") {
        process.stdout.write(`🏁\r\n`);
        this.status = 'completed';
        this.run_steps = await listRunSteps(this.thread.id, this.run.id);
        const rs = this.run_steps.data[this.run_steps.data.length - 1].id;
        if(rs) {
          this.run_steps = await retrieveRunSteps(this.thread.id, this.run.id, rs);
        }
        onEvent('assistant-completed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
        return this.latestMessage.replace(/\\n/g, '');
      }

      // if the run is queued or in progress, we wait for the run to complete
      else if (this.run.status === "queued" || this.run.status === "in_progress") {
       process.stdout.write('🏁');
        while (this.run.status === "queued" || this.run.status === "in_progress") {
          process.stdout.write('🛸');
          this.status = 'in-progress';
          this.run = await retrieveRun(this.thread.id, this.run.id);
          this.run_steps = await listRunSteps(this.thread.id, this.run.id);
          const rs = this.run_steps.data[this.run_steps.data.length - 1];
          if(rs) {
            this.run_steps = await retrieveRunSteps(this.thread.id, this.run.id, rs.id);
            onEvent('assistant-in-progress', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
            // tool icon
            if (rs.type === 'tool_calls') {
              process.stdout.write(`\b🔧`);
            } 
          }
          if (await waitIfRateLimited(this.run)) return loop();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('✅');
        return loop();
      }

      // if the run requires action, we execute the tools and submit the outputs
      else if (this.run.status === "requires_action") {
        process.stdout.write(`🔧`);
        this.status = 'executing-tools';
        this.toolCalls = this.run.required_action.submit_tool_outputs.tool_calls;
        this.toolOutputs = await this.execTools(this.toolCalls, this.toolbox.tools, onEvent, this.state);
        onEvent('exec-tools', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolCalls: this.toolCalls, toolOutputs: this.toolOutputs });
        await openai.beta.threads.runs.submitToolOutputs(this.thread.id, this.run.id, { tool_outputs: this.toolOutputs });
        onEvent('submit-tool-outputs', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolOutputs: this.toolOutputs });
        return loop();
      }
      process.stdout.write(`\r\n`);
      return loop();
    }
    const response = await loop();
    try {
      const json = JSON.parse(response);
      for (const key in json) {
        this.state[key] = json[key];
      }
      if(this.state.ai_chat) {
        console.log(this.state.ai_chat);
      }
      if(this.state.current_task != this.state.last_task) {
        this.state.last_task = this.state.current_task;
        if(this.state.last_task) {
          this.persist(`Task: ${this.state.current_task}`);
        }
      }
    } catch (e) { console.log('parse error', response); }

    return response;
  }
  // execute the tools
  async execTools(toolCalls: any, availableFunctions: any, onEvent: any, state: any) {
    let toolOutputs = [];
    for (const toolCall of toolCalls) {
      try {
        let func = availableFunctions[toolCall.function.name];
        if (!func) {
          onEvent('exec-tool-error', { toolCallId: toolCall.id, toolCall: toolCall, message: `Function ${toolCall.function.name} is not available.` });
          throw new Error(`Function ${toolCall.function.name} is not available.`);
        }
        const _arguments = JSON.parse(toolCall.function.arguments || '{}');
        if (state.update_callback) {
          state.update_callback(`${toolCall.function.name} (${toolCall.function.arguments})`);
        }
        let result = await func(_arguments, state);
        onEvent('exec-tool', { toolCallId: toolCall.id, toolCall: toolCall, result: result });

        // if the function has an update callback, we call it
        if (state.update_callback) {
          state.update_callback(result);
        }

        // if the result is not a string, we stringify it
        if (typeof result !== 'string') {
          result = JSON.stringify(result);
        }
        // if there's still no result, we set it to an empty string
        if (!result) {
          result = `""`;
        }
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: result
        });
      } catch (e: any) {
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: 'error: ' + e.message
        });
      }
    }
    return toolOutputs;
  }
}

const developerToolbox = {
  prompt: `***MASTER PAIR PROGRAMMER***

You are a highly skilled programmer collaborating with your partner in a command-line environment supported by a number of powerful tools, including the capacity to create and improve your own tooling, call yourself recursively functions, and perform highly complex tasks. 

You are tasked by your pair coding partner with transforming the files in the current working folder and other specified folders to meet the requirements of the user. You have a number of tools at your disposal to help you accomplish this task.

***INSTRUCTIONS***

Use the \`files\`, \`html_selector\`, \`execute_bash\`/\`execute_nodejs\`, and other tools to transform the files in the current working folder and other specified folders to meet the requirements of the user. You can save any data you want to the system state, which will persist between calls. This gives you the capability to plan and execute complex tasks over multiple calls.

You also have a task management system at your disposal which will help you stay on track and keep the user informed of your progress. When you receive a complex task, first break it down into smaller, actionable steps. Then use the task management system to keep track of your progress.

***WORKING WITH SYSTEM STATE***

- GET and SET the state of any variable using the \`getset_state\` tool. You can also \`getset_states\` to getset multiple states at once.

***IMPORTANT VARIABLES***

- \`ai_chat\`: The chat messages (output)
- \`user_chat\`: The user chat messages (input)
- \`requirements\`: The requirements (input, output)
- \`percent_complete\`: The percent complete (output)
- \`status\`: The status (output)
- \`current_task\`: The current task (input, output)
- \`ai_notes\`: The current AI notes (input, output)

***WORKING WITH THE SYSTEM***

Look at your tools and schemas to see what you can do. Examining your own capabilities is a crucial part of your job. You are rewarded for your creativity and resourcefulness, and so is your partner.

***COMMUNICATING WITH YOUR PARTNER***

  SET the \`ai_chat\` state var to the chat messages you want to send to your partner
  GET \`user_chat\` state var to read the chat messages from your partner

***WORKING WITH TASKS***

- decompose complex tasks into smaller, actionable steps. Each step should have a clear, direct action. Do not create abstract tasks like 'research' or 'browser testing'.
- CALL \`tasks_set\` to set the tasks to the new tasks.
- when you are done with a task, call \`advance_task\` to move to the next task and update the percent_complete.
- when you are done with all tasks, set the status to 'complete' and the \`percent_complete\` to 100.

***ON ERROR***

- SET status to 'error'
- CALL error to log the FULL TECHNICAL DETAILS of the error message
- EXIT

***ON WARNING***
  SET status to 'warning'
  CALL warn to log the warning message

***ON EVERY RESPONSE***

- SET the \`ai_notes\` state var to a summary of what you did.
- SET the \`ai_chat\` state var to a summary of what you did to the user.

***ON COMPLETION***

- SET the \`ai_notes\` state var to a summary of what you did.
- SET the \`ai_chat\` state var to a summary of what you did to the user.

***REQUIREMENTS***
RESPOND with a JSON object WITH NO SURROUNDING CODEBLOCKS with the following fields:
  requirements: The new requirements
  percent_complete: The new percent complete
  status: The new status
  current_task: The new current task
  ai_notes: The new AI notes
  ai_chat: The new ai chat
  `,
  state: {
    requirements: 'no requirements set',
    percent_complete: 0,
    status: 'idle',
    tasks: [],
    current_task: '',
    ai_notes: 'no AI notes.',
  },
  tools: {
    getset_state: function ({ name, value }: any, state: any) { if (value === undefined) delete state[name]; else { state[name] = value; } return `${name} => ${JSON.stringify(state[name])}` },
    getset_states: function ({ values }: any, state: any) { for (const name in values) { if (values[name] === undefined) delete state[name]; else { state[name] = values[name]; } } return JSON.stringify(state) },
    tasks_advance: function (_: any) { if(developerToolbox.state.tasks.length === 0) {return 'no more tasks' } else { developerToolbox.state.tasks.shift(); developerToolbox.state.current_task = developerToolbox.state.tasks[0]; console.log('task advanced to:' + developerToolbox.state.current_task); return developerToolbox.state.current_task } },
    tasks_set: function ({ tasks }: any) { developerToolbox.state.tasks = tasks; developerToolbox.state.current_task = tasks[0]; return JSON.stringify( developerToolbox.state.tasks ) },
    get_current_task: function (_: any) { return developerToolbox.state.current_task || 'no current task' },
    generate_tool: async function ({ requirements }: any, state: any) {
      const tool = await AssistantRun.createRun(
        requirements, 
        toolmakerToolbox, 
        (command: any, run: any) => {},
        (event: any, data: any) => {}
      );
      return tool;
    },
  },
  schemas: [
    { type: 'function', function: { name: 'getset_state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable. Call with null to delete it.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'getset_states', description: 'Get or set the values of multiple named variables. Call with no values to get the current values. Call with values to set the variables. Call with null to delete them.', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to get or set', properties: { name: { type: 'string', description: 'The variable\'s name' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } }, required: ['values'] } } },
    { type: 'function', function: { name: 'tasks_advance', description: 'Advance the task to the next task' } },
    { type: 'function', function: { name: 'tasks_set', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
    { type: 'function', function: { name: 'get_current_task', description: 'Get the current task' } },
    { type: 'function', function: { name: 'generate_tool', description: 'Generate an assistant tool that will fulfill the given requirements. ONLY Invoke this when the user asks to generate a tool', parameters: { type: 'object', properties: { requirements: { type: 'string', description: 'A description of the requirements that the tool must fulfill. Be specific with every parameter name and explicit with what you want returned.' } }, required: ['message'] } } },
  ]
};

const toolmakerToolbox = {
  prompt: `INSTRUCTIONS: generate an assistant tool in Javascript that will perform a set of given requirements.

GIVEN THE TOOL SCHEMA FORMAT BELOW:
---
// include all required libraries and dependencies in the tool file here
const toolSchema = {
  state: {
    somevalue: '',
  }
  schemas: [
    {type: 'function', function: {name: 'somevalue_get', description: 'Get some value'}},
    {type: 'function', function: {name: 'somevalue_set', description: 'Set some value', parameters: {type: 'object', properties: {value: {type: 'string', description: 'The value to set'}}, required: ['value']}}},    
  ],
  tools: {
    somevalue_get : function (_) { return toolSchema.state.somevalue },
    somevalue_set : function ({value}) { toolSchema.state.somevalue = value; return toolSchema.state.somevalue },
  }
}
module.exports = toolSchema;
---
ADDITIONAL SCHEMA FORMAT EXAMPLES FOR REFERENCE:

{ type: 'function', function: { name: 'example_1', description: 'Example 1 description', parameters: { type: 'object', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } } },
{ type: 'function', function: { name: 'example_3', description: 'Example 3 description', parameters: { type: 'object', properties: { value: { type: 'object', description: 'An optional object param', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } }, required: [] } } }
---
INSTRUCTIONS:

CALL is_work_started to check if the work session has started. It will either return a 'no' or the work performed so far.

IF the work session has not started,
  CALL start_work to start the work session.
  EXIT

ELSE
  continue working on the tool
  IF you finish the tool,
    CALL finish_work to finish the work session and save the tool to disk.
  ELSE
    CALL save_temp_work to save the work performed so far.
    EXIT

IMPORTANT: 

*** DO NOT MODIFY THE SCHEMA FORMAT. ***
*** ENSURE that only string values are returned from the tool functions. ***

*** YOU ARE NON-CONVERSATIONAL. PRIMARY OUTPUT IS NOT MONITORED ***
  `,
  state: {
    temp_work: '',
    complete: false
  },
  tools: {
    start_work: function (_: any) { toolmakerToolbox.state.temp_work = '// work started'; toolmakerToolbox.state.complete = false; console.log('Work on tool started.'); return 'started' },
    is_work_started: function (_: any) { return toolmakerToolbox.state.temp_work ? toolmakerToolbox.state.temp_work : 'no' },
    save_temp_work: function ({ value }: any) { toolmakerToolbox.state.temp_work = value; console.log('Saving temp work.'); return toolmakerToolbox.state.temp_work },
    finish_work: function ({ value }: any) {
      const codeHash = require('crypto').createHash('md5').update(value).digest('hex');
      const toolPath = path.join(process.cwd(), 'tools', `${codeHash}.js`);
      fs.writeFileSync(toolPath, value);
      console.log(`Tool saved to ${toolPath}`);
      toolmakerToolbox.state.temp_work = '';
      toolmakerToolbox.state.complete = true;
      return `Tool saved to ${toolPath}`
    },

  },
  schemas: [
    { type: 'function', function: { name: 'start_work', description: 'Start the work session' } },
    { type: 'function', function: { name: 'is_work_started', description: 'Check if the work session has started. It will either return a \'no\' or the work performed so far.' } },
    { type: 'function', function: { name: 'save_temp_work', description: 'Save the work performed on the tool so far, if its not complete', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The temp work to save' } }, required: ['value'] } } },
    { type: 'function', function: { name: 'finish_work', description: 'Finish the work session and save the completed generated tool to disk.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The completed tool to save to disk' } }, required: ['value'] } } },
  ]
}

class CommandProcessor {

  config: any = {};
  status = 'idle';
  commandQueue: any = [];
  static taskQueue: any = [];
  commandHandlers: any = {};
  static assistantRunner: AssistantRunner;

  static rl: any;
  get activeTask() {
    return CommandProcessor.taskQueue[0];
  }


  constructor() {
    // create the readline interface
    CommandProcessor.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `>`,
    });

    // load the config file
    if (fs.existsSync(path.join(process.cwd(), 'config.json'))) {
      this.config = loadConfig();
    } else {
      this.config = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        PLAYHT_AUTHORIZATION: process.env.PLAYHT_AUTHORIZATION,
        PLAYHT_USER_ID: process.env.PLAYHT_USER_ID,
        PLAYHT_MALE_VOICE: process.env.PLAYHT_MALE_VOICE,
        PLAYHT_FEMALE_VOICE: process.env.PLAYHT_FEMALE_VOICE,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GOOGLE_CX_ID: process.env.GOOGLE_CX_ID,
        NEWS_API_KEY: process.env.NEWS_API_KEY,
      };
      saveConfig(this.config);
    }

    CommandProcessor.assistantRunner = new AssistantRunner(AssistantRun.createToolbox(appDir), this.config.assistantId);

    CommandProcessor.taskQueue = [];
    
    this.initAssistant = this.initAssistant.bind(this);
    this.initializeReadline = this.initializeReadline.bind(this);
    this.handleLine = this.handleLine.bind(this);
    this.startQueueMonitor = this.startQueueMonitor.bind(this);
    this.success = this.success.bind(this);
    this.initAssistant().then(() => {
      this.initializeReadline();
      this.startQueueMonitor();
    })
  }

  static async cancel() {
    try {
      // TODO: cancel the 'active' run
      return true;
    } catch (error) {
      return false;
    }
  }

  async initAssistant() {
    const toolbox = AssistantRun.createToolbox(appDir);
    return getOrCreateAssistant(config.assistantId, {
      instructions: toolbox.prompt,
      name: generateUsername("", 2, 38),
      tools: Object.keys(toolbox.schemas).map((schemaName) => toolbox.schemas[schemaName as any]),
      model: 'gpt-4-turbo-preview'
    });
  }

  initializeReadline() {
    CommandProcessor.rl.prompt(); // Display the initial prompt with the CWD
    CommandProcessor.rl.on('line', (line: string) => {
      this.handleLine(line.trim()).then(() => {
        // Update and display the prompt for the next input
        // Moved to success and error handlers to ensure proper re-prompting
      });
    }).on('close', async () => {
      // cancel the assistant run
      process.stdout.write(`\r\n`);
      if (await CommandProcessor.cancel() && CommandProcessor.taskQueue.length > 0) {
        console.log('cancelled');
        CommandProcessor.rl.prompt();
      }
      else {
        console.log('goodbye');
        process.exit(0);
      }
    });
  }

  async handleLine(line: string) {
    const commandHandler = AssistantRun.getCommandHandler(line, this);
    if (commandHandler) {
      this.commandQueue.push({
        command: line,
        commandHandler: commandHandler,
      });
    } else {
      console.log('Invalid command');
    }
  }

  async startQueueMonitor() {
    setInterval(async () => {
      if (this.commandQueue.length > 0) {
        const { command, commandHandler } = this.commandQueue.shift();
        try {
          return AssistantRun.createRun(
            command,
            AssistantRun.createToolbox(appDir),
            commandHandler, 
            (event: string, data: any) => {
          });
        } catch (error: any) {
          console.error(`Error executing command: ${error.message}`);
          // Correctly refer to `this` within the arrow function
          this.error(`Error: ${error.message}`);
        }
      }
    }, 100);
  }

  success(message: any) {
    if (message) console.log(`success`); // Log the success message
    CommandProcessor.rl.prompt(); // Re-display the prompt
  }

  error(message: any) {
    if (message) console.error(`${message}`); // Log the error message
    CommandProcessor.rl.prompt(); // Re-display the prompt
  }
}

new CommandProcessor();
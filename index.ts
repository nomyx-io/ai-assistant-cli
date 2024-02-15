const readline = require('readline');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { generateUsername } = require("unique-username-generator");

// get command-line arguments
const args = process.argv.slice(2);

// look for command-line flags
const flags = args.filter((arg) => arg.startsWith('--'));
const commands = args.filter((arg) => !arg.startsWith('--'));

const requireMain = require.main || { filename: __filename };

// get the application's install directory
let appDir = path.dirname(requireMain.filename);

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
      apiKey: process.env.OPENAI_API_KEY,
      playHtApiKey: process.env.PLAYHT_AUTHORIZATION,
      playHtUserId: process.env.PLAYHT_USER_ID,
      playHtMaleVoice: process.env.PLAYHT_MALE_VOICE,
      playHtFemaleVoice: process.env.PLAYHT_FEMALE_VOICE
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

class AssistantRunner {
  thread: any
  run: any
  run_steps: any
  status: string
  assistant: any
  prompt: any
  id
  uid
  state
  timer: any
  toolbox: any
  toolCalls: any
  toolOutputs: any

  latestMessage: string = '';

  constructor(
    toolbox: any,
    uid?: any) {
    this.thread = undefined;
    this.run = undefined;
    this.run_steps = undefined;
    this.status = 'idle';
    this.prompt = toolbox.prompt;
    this.state = toolbox.state;
    this.assistant = undefined;
    this.timer = 0;
    this.id = '';
    this.uid = uid || '';
    this.toolbox = toolbox;
  }
  destroy() {
    if (this.run && this.thread) {
      openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
    }
    openai.beta.assistants.del(this.assistant.id);
  }

  static async createAssistantFromPersona(toolbox: any, name: string) {
    return openai.beta.assistants.create({
      instructions: toolbox.persona,
      name,
      tools: Object.keys(toolbox.schemas).map((schemaName) => toolbox.schemas[schemaName as any]),
      model: 'gpt-4-turbo-preview'
    });
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
  assistantRunner: AssistantRunner;
  assistant: any;
  eventHandler: any;
  usages: any[];
  file_contents: string;
  file_name: string;
  state: any = {};
  thread: any;
  run: any;
  run_steps: any;
  timer: any;
  status: string = 'idle';
  latestMessage: string = '';
  toolbox: any;
  toolCalls: any;
  toolOutputs: any;
  constructor(assistantRunner: any, toolbox: any, eventHandler: any) {
    this.eventHandler = eventHandler;
    this.assistantRunner = assistantRunner;
    this.usages = [];
    this.file_contents = '';
    this.file_name = '';
  }
  static async createRun(content: string, toolbox: any, eventHandler: any) {
    const aRunnerObj = new AssistantRunner(developerToolbox, config.assistantId);
    const aRunObj = new AssistantRun(aRunnerObj, toolbox, eventHandler);
    CommandProcessor.taskQueue.push(aRunObj);
    await aRunObj._run(content);
    CommandProcessor.taskQueue.splice(CommandProcessor.taskQueue.indexOf(aRunObj), 1);
    return aRunObj;
  }
  spinState = {
    frames: [
      // "🌑 ",
      // "🌒 ",
      // "🌓 ",
      // "🌔 ",
      // "🌕 ",
      // "🌖 ",
      // "🌗 ",
      // "🌘 "
      "◟", "◡", "◞", "◝", "◠", "◜", "◟", "◡", "◞", "◝", "◠", "◜"
    ],
    currentIndex: 0,
    timer: null,
    spinning: false,
    interval: 120,
  }
  renderFrame(frame: any) {
    readline.clearLine(process.stdout, 0); // Clear the entire line
    readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
    process.stdout.write(`${frame}\r`); // Write the frame and title
  }
  startSpinner() {
    this.spinState.spinning = true;
    this.timer = setInterval(() => {
      const frame = this.spinState.frames[this.spinState.currentIndex];
      this.renderFrame(frame);
      this.spinState.currentIndex = (this.spinState.currentIndex + 1) % this.spinState.frames.length;
    }, this.spinState.interval);
  }
  stopSpinner() {
    if (this.spinState.timer) {
      this.spinState.spinning = false;
      clearInterval(this.spinState.timer);
      this.spinState.timer = null;
      readline.clearLine(process.stdout, 0); // Clear the line
      readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
      process.stdout.write('\n');
    }
  }
  success(message: string) {
    if (this.spinState.timer) {
      this.spinState.spinning = false;
      clearInterval(this.spinState.timer);
      this.spinState.timer = null;
      readline.clearLine(process.stdout, 0); // Clear the line
      readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
      process.stdout.write(`\n✔ ${message}\n`);
    }
  }
  async runAssistant(content: string, onEvent: any): Promise<string> {
    this.startSpinner();


  // get the latest message in the thread
  const getLatestMessage = async (threadId: any, retries = 3) => {
    let wetry = 0;
    const _ = async (): Promise<any> => {
      try {
        if (threadId) {
          const messages = await openai.beta.threads.messages.list(threadId);
          return messages.data[messages.data.length - 1].content;
        } else throw new Error('No threadId provided');
      } catch (error) {
        if (wetry < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          wetry++;
          return _();
        }
      }
    }
    const rval = (await _())[0].text.value;
    return rval.replace(/\\n/g, '');
  }

  // wait for the rate limit to be lifted
  const waitIfRateLimited = async (onEvent: any) => {
    if (!this.run) return false;
    if (!this.run.last_error) return false;
    if (this.run.last_error && this.run.last_error.indexOf && this.run.last_error.indexOf('rate limited') !== -1) {
      const waitTime = (
        parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[1]) * 60 + parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[2]) + 1) * 1000;
      onEvent('rate-limited', { waitTime });
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

    // create or load the assistant
    this.assistant = await createAssistant(config.assistantId, '', developerToolbox, config);
    config.assistantId = this.assistant.id;
    saveConfig(config);
    onEvent('assistant-created', { assistantId: config.assistantId });

    // create a new thread with the assistant
    const createOrLoadThread = async (config: any): Promise<any> => {
      let thread;
      if (!config.threadId) {
        thread = await createThread();
      } else {
        try {
          thread = await loadThread(config.threadId);
          config.threadId = thread.id;
          saveConfig(config);
          onEvent('thread-created', { threadId: config.threadId });
          return thread;
        } catch (e) {
          if (config.threadId) {
            delete config.threadId;
            saveConfig(config);
            return createOrLoadThread(config);
          } else throw e;
        }
      }
    }
    this.thread = await createOrLoadThread(config);

    async function createMessageWithRunCancel(threadId: string, content: string) {
      try {
        // create a new message and add it to the thread
        const msg = await createMessage(threadId, content);
        onEvent('message-created', { threadId: threadId, message: content });
        return msg
      } catch (e: any) {
        // get an string out that starts with run_xxxxxx
        const runId = e.message.match(/run_\w+/)[0];
        if (runId) {
          await cancelRun(threadId, runId);
          return createMessage(threadId, content);
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
        this.status = 'failed';
        if (await waitIfRateLimited(onEvent)) return loop();
        this.latestMessage = 'failed run: ' + this.run.last_error || this.latestMessage;
        onEvent('assistant-failed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
        return this.latestMessage;
      }

      // if the run is cancelled, we set the latest message to 'cancelled run'
      else if (this.run.status === "cancelled") {
        this.status = 'cancelled';
        this.latestMessage = 'cancelled run';
        onEvent('assistant-cancelled', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
        return this.latestMessage;
      }

      // if the run is completed, we set the latest message to the last message in the thread
      else if (this.run.status === "completed") {
        this.status = 'completed';
        this.run_steps = await listRunSteps(this.thread.id, this.run.id);
        this.run_steps = await retrieveRunSteps(this.thread.id, this.run.id, this.run_steps.data[this.run_steps.data.length - 1].id);
        onEvent('assistant-completed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
        // replace \n with new line
        return this.latestMessage.replace(/\\n/g, '');
      }

      // if the run is queued or in progress, we wait for the run to complete
      else if (this.run.status === "queued" || this.run.status === "in_progress") {
        while (this.run.status === "queued" || this.run.status === "in_progress") {
          this.status = 'in-progress';
          this.run = await retrieveRun(this.thread.id, this.run.id);
          this.run_steps = await listRunSteps(this.thread.id, this.run.id);
          onEvent('assistant-in-progress', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, runSteps: this.run_steps });
          if (await waitIfRateLimited(onEvent)) return loop();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return loop();
      }

      // if the run requires action, we execute the tools and submit the outputs
      else if (this.run.status === "requires_action") {
        this.status = 'executing-tools';
        this.toolCalls = this.run.required_action.submit_tool_outputs.tool_calls;
        this.toolOutputs = await this.execTools(this.toolCalls, this.toolbox.tools, onEvent, this.state);
        onEvent('exec-tools', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolCalls: this.toolCalls, toolOutputs: this.toolOutputs });
        await openai.beta.threads.runs.submitToolOutputs(this.thread.id, this.run.id, { tool_outputs: this.toolOutputs });
        onEvent('submit-tool-outputs', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolOutputs: this.toolOutputs });
        return loop();
      }

      return loop();
    }
    const response = await loop();
    try {
      const json = JSON.parse(response);
      for (const key in json) {
        this.state[key] = json[key];
      }
    } catch (e) {
      console.log('parse error', response);
    }
    this.stopSpinner();

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

  async _run(command: any) {
    const input_vars: any = {
      requirements: '',
      current_task: this.state.current_task || '',
      percent_complete: this.state.percent_complete,
      ai_notes: this.state.ai_notes,
      user_chat: command,
      ai_chat: '',
    }
    if (this.file_contents) {
      input_vars.file_name = this.file_name;
      input_vars.file_contents = this.file_contents;
    }

    let ret = await this.runAssistant(JSON.stringify(input_vars), (event: any, data: any) => {
      if (event === 'exec-tools') {
        data.toolOutputs.forEach((output: any) => {
          const func = data.toolCalls.find((call: any) => call.id === output.tool_call_id).function.name;
          console.log(`$ ${func} (${func.arguments ? func.arguments : ''}) => ${output.output}`);
        });
      }
      if (event == 'assistant-completed') {
        const step_details = data.runSteps.step_details[data.runSteps.step_details.type]
        if (data.runSteps.step_details.type === 'tool_calls') {
          // output a nice table of the tool calls
          step_details.forEach((detail: any) => {
            detail.function = `${detail.function.name}(${detail.function.arguments ? detail.function.arguments : ''
              }) => ${detail.output}`;
            delete detail.id;
            delete detail.type;
          });
          console.table(step_details);
        }
        this.usages.push(data.runSteps.usage);
      }
    });

    try {
      const parsedResponse = JSON.parse(ret);
      if (parsedResponse.show_file) {
        this.file_name = parsedResponse.show_file;
        this.file_contents = fs.readFileSync(parsedResponse.show_file, 'utf8');
      } else {
        this.file_name = '';
        this.file_contents = '';
      }
      if (parsedResponse.ai_chat) {
        console.log(parsedResponse.ai_chat);
      }
    } catch (e) {
    }
    if (this.state.status === 'complete' || this.state.status === 'idle' || parseInt(this.state.percent_complete) === 100) {
      console.table(this.usages);
      console.table(this.state);
      this.success('done');
      CommandProcessor.rl.prompt();
    } else {
      CommandProcessor.rl.prompt();
    }
  }
}

const developerToolbox = {
  prompt: `You are a friendly, helpful, and resourceful pair programming partner. 
You love helping your pair programming partner solve technical problems, 
engaging them conversationally while you fix problems and perform tasks.

INSTRUCTIONS: Use the below process and tools to perform the given requirements.

You can GET and SET the state of any variable using the getset_state function. (You can also getset_states to getset multiple states at once)
  When you see a GET, call getset_state("variable") to get the value of the state.
  When you see a SET, call getset_state("variable", <value>) to set the value of the state.

ECHO: When you see an ECHO instruction below, 
  SET the ai_chat variable to the message you want to echo to the user

Your current working folder is: ${process.cwd()}

IMPORTANT VARIABLES:
- ai_chat: The chat messages (output)
- user_chat: The user chat messages (input)
- requirements: The requirements (input)
- percent_complete: The percent complete (output)
- status: The status (output)
- tasks: The tasks to perform (input, output)
- current_task: The current task (input, output)
- ai_notes: The current AI notes (input, output)
- show_file: Set to the file contents you want to see on the next iteration (output)
- file_contents: The file contents (input)

PROCESS:

GET user_chat

IF there are any messages,

  FOR EACH message in user_chat,
    ECHO a response to each message

  perform adjustments to the requirements based on messages
    GET requirements to read the requirements
    adjust the requirements based on the messages
      SET requirements to the new requirements
      SET percent_complete to 0
      ECHO a status to the user

  SET current_task to 'decompose requirements'
  EXIT

GET requirements

IF the requirements have changed

  IF the new requirements can be performed in one session

    DO THE WORK: Use the tools at your disposal to help you.
      * Execute tasks required to meet the new requirements within this iteration. *

    SET percent_complete to 100
    SET status to complete
    ECHO status to the user
    EXIT

  ELSE
    SET requirements to the new requirements
    SET current_task to 'decompose requirements'
    ECHO an acknowledgement to the user, mirroring a summary of their request.
    EXIT

ELSE IF GET current_task == 'decompose requirements'

    Decompose the requirements into actionable tasks
    SET tasks to the decomposed tasks
    SET current_task to the first task
    SET percent_complete to 2
    SET ai_notes to leave notes and comments for continuity
    ECHO a status to the user
    EXIT

ELSE

  SET status to 'working'
  
  DO THE WORK: Move the task forward using the tools at your disposal.
  MAKE A TOOL: If you need a tool that doesn't exist, create it.
  BE CREATIVE: Use your creativity to solve the problem.
  
  SET percent_complete to update the percent complete
  SET ai_notes to leave notes and comments for continuity

  IF the task is completed,
    CALL tasks_advance to move to the next task

  IF there is a next task,
    EXIT

  ELSE
    SET status to 'complete'
    ECHO a status to the user
    EXIT

ON ERROR:
  SET status to 'error'
  CALL error to log the FULL TECHNICAL DETAILS of the error message
  EXIT

ON WARNING:
  SET status to 'warning'
  CALL warn to log the warning message

ON EVERY RESPONSE:

ECHO a summary of what you did to the user.

RESPOND with a JSON object WITH NO SURROUNDING CODEBLOCKS with the following fields:
  requirements: The new requirements
  percent_complete: The new percent complete
  status: The new status
  tasks: The new tasks
  current_task: The new current task
  ai_notes: The new AI notes
  user_chat: The new user chat

ALWAYS:
  DECOMPOSE TASKS INTO DIRECT, ACTIONABLE STEPS. No 'research' or 'browser testing' tasks. Each task should be a direct action.
  USE THE TOOLS: Use the tools at your disposal to help you.
  BE RESOURCEFUL: Use all available resources to solve the problem.
  MAKE NEW TOOLS: If you need a tool that doesn't exist, create it.
  USE ABSOLUTE PATHS: Use absolute paths for all file operations.

  Your current working folder is: ${process.cwd()}

  ** ALWAYS SIGNAL COMPLETION BY SET complete to true **

  *** IMPORTANT: ONLY OUTPUT JSON OBJECTS. NEVER SURROUND THE JSON WITH CODEBLOCKS. DO NOT OUTPUT ANY OTHER DATA. ***
`,
  state: {
    requirements: 'no requirements set',
    percent_complete: 0,
    status: 'idle',
    tasks: [],
    current_task: null,
    ai_notes: 'no AI notes.',
  },
  tools: {
    getset_state: function ({ name, value }: any, state: any) { if (value === undefined) delete state[name]; else { state[name] = value; } return JSON.stringify(state[name]) },
    getset_states: function ({ values }: any, state: any) { for (const name in values) { if (values[name] === undefined) delete state[name]; else { state[name] = values[name]; } } return JSON.stringify(state) },
    tasks_advance: function (_: any) { developerToolbox.state.tasks.shift(); developerToolbox.state.current_task = developerToolbox.state.tasks[0]; console.log('task advanced to:' + developerToolbox.state.current_task); console.log(developerToolbox.state.current_task); return developerToolbox.state.current_task },
    error: function ({ message }: any) { console.error(message); return message },
    log: function ({ message }: any) { console.log(message); return message },
    generate_tool: async function ({ requirements }: any, state: any) {
      // const ar = new AssistantRunner(toolmakerToolbox, 'toolmaker');
      // const _ = async (): Promise<any> => {
      //   await ar.runAssistant(requirements, (event: any, data: any) => { });
      //   if (toolmakerToolbox.state.complete) { return 'tool generated'; }
      //   else return _();
      // }
      // return _();
    },
  },
  schemas: [
    { type: 'function', function: { name: 'getset_state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable. Call with null to delete it.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'getset_states', description: 'Get or set the values of multiple named variables. Call with no values to get the current values. Call with values to set the variables. Call with null to delete them.', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to get or set', properties: { name: { type: 'string', description: 'The variable\'s name' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } }, required: ['values'] } } },
    { type: 'function', function: { name: 'tasks_advance', description: 'Advance the task to the next task' } },
    { type: 'function', function: { name: 'error', description: 'Log an error', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The error message' } }, required: ['message'] } } },
    { type: 'function', function: { name: 'log', description: 'Log a log', parameters: { type: 'object', properties: { message: { type: 'string', description: 'The error message' } }, required: ['message'] } } },
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

  toolCALLs = [];
  toolOutputs = [];
  config = {};
  tools = {};
  schemas = {};

  status = 'idle';
  commandQueue: any = [];
  static taskQueue: any = [];
  commandHandlers: any = {};

  assistantRunner: AssistantRunner;
  static rl: any;
  constructor() {
    // create the readline interface
    CommandProcessor.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      //prompt: `${process.cwd()} > `,
      prompt: ``,
    });

    // load the config file
    if (fs.existsSync(path.join(process.cwd(), 'config.json'))) {
      this.config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json')));
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
      fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(this.config));
    }

    this.assistantRunner = new AssistantRunner(config.assistantId);

    CommandProcessor.taskQueue = [];
    this.commandHandlers = {
      'quit': () => process.exit(),
      'clear': () => {
        process.stdout.write('\x1Bc');
        CommandProcessor.rl.prompt();
      },
      'env': async (command: string) => {
        const [_, key, value] = command.split(' ');
        if (key && value) {
          process.env[key] = value;
          CommandProcessor.rl.prompt();
        }
      },
      'reset': async (_: string) => {
        delete config.assistantId;
        delete config.threadId;
        delete config.runId;
        saveConfig(config);
        this.assistantRunner = new AssistantRunner(developerToolbox);
        config.assistantId = this.assistantRunner.id;
        saveConfig(config);
        CommandProcessor.rl.prompt();
      },
      'echo': async (echo: string) => {
        console.log(echo);
      },
      '*': async (command: string, run: any) => { // Make sure this is marked as async
        if (this.status === 'working') {
          return command;
        }

        // read all the contents of the ./tools folder
        config.assistantId = this.assistantRunner.id;
        saveConfig(config);

            // check for a ./tools directory
        // if the appDir ends with a bin directory, we need to go up one more level
        const appDirParts = appDir.split(path.sep);
        if (appDirParts[appDirParts.length - 1] === 'bin') {
          appDirParts.pop();
          appDir = appDirParts.join(path.sep);
        }
        const toolsFolder = path.join(appDir, 'tools')
        if (fs.existsSync(toolsFolder)) {
          const files = fs.readdirSync(toolsFolder);
          files.forEach((file: any) => {
            const tool = require(path.join(appDir, 'tools', file));
            run.tools = { ...developerToolbox.tools, ...tool.tools };
            run.schemas = [...developerToolbox.schemas, ...tool.schemas];
            run.state = { ...developerToolbox.state, ...tool.state };
          });
          Object.keys(developerToolbox.tools).forEach((key) => {
            run.tools[key] = run.tools[key].bind(this);
          });
        } else {
          // create the ./tools directory
          fs.mkdirSync(path.join(appDir, 'tools'));
        }

        return AssistantRun.createRun(command, developerToolbox, (event: string, data: any) => {

        });
      }
    };


    this.getCommandHandler = this.getCommandHandler.bind(this);
    this.initAssistant = this.initAssistant.bind(this);
    this.initializeReadline = this.initializeReadline.bind(this);
    this.handleLine = this.handleLine.bind(this);
    this.startQueueMonitor = this.startQueueMonitor.bind(this);
    this.success = this.success.bind(this);
    this.initAssistant().then(() => {
      this.initializeReadline();
      this.startQueueMonitor();
      console.log('ready');
      //setTimeout(()=> this.commandQueue.push(() => this.getCommandHandler('greet')()), 1000);
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
    let itry = 0;
    const cleanup = async () => {
      try {
        const assistants = (await openai.beta.assistants.list()).data
        const rlAssistants = assistants.filter((assistant: any) => assistant.name === 'assistant');
        const toolmakerAssistants = assistants.filter((assistant: any) => assistant.name === 'toolmaker');
        const toDelete = [...rlAssistants, ...toolmakerAssistants];
        if (toDelete.length > 0)
          await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
      } catch (error) {
        // wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        // try again
        if (itry < 3) {
          await cleanup();
          itry++;
        }
      }
    }
    await cleanup();
    itry = 0;
    let assistant;
    const createAssistant = async () => {
      try {
        assistant = AssistantRunner.createAssistantFromPersona(developerToolbox, 'assistant');
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (itry < 3) {
          console.log('retrying createAssistant...');
          await createAssistant();
          itry++;
        }
      }
    }
    return createAssistant();
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
      if (await CommandProcessor.cancel())
        console.log('bye');
      CommandProcessor.cancel();
      CommandProcessor.rl.prompt();
    });
  }

  async handleLine(line: string) {
    const commandHandler = this.getCommandHandler(line);
    if (commandHandler) {
      this.commandQueue.push(commandHandler);
    } else {
      console.log('Invalid command');
    }
  }

  getCommandHandler(command: string) {
    if (this.commandHandlers[command]) {
      return () => this.commandHandlers[command](command);
    } else if (this.commandHandlers['*']) {
      return () => this.commandHandlers['*'](command);
    }
    return null;
  }

  async startQueueMonitor() {
    setInterval(async () => {
      if (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        try {
          command && await (command as any)();
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

  persist(icon: any, message: any) {
    process.stdout.write(`${icon} ${message}\r\n`); // Write the message to stdout with an icon and start a new line
  }
}

async function createAssistant(assistantId: string, name: string, toolbox: any, config: any, retries = 3) {
  if (!name && !config.assistantName) {
    config.ASSISTANT_NAME = generateUsername("", 0, 24);
    saveConfig(config);
  }
  let wetry = 0;
  name = name || config.ASSISTANT_NAME;
  const _ = async (): Promise<any> => {
    try {
      if (assistantId) {
        try {
          return openai.beta.assistants.retrieve(assistantId);
        } catch (e) {
          return AssistantRunner.createAssistantFromPersona(toolbox, name + generateUsername("", 0, 8, "-"));
        }
      }
      else { return AssistantRunner.createAssistantFromPersona(toolbox, name + generateUsername("", 0, 8, "-")); }
    } catch (e) {
      if (wetry < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        wetry++;
        return _();
      }
      throw e;
    }
  }
  const assistant = await _();
  config.assistantId = assistant.id;
  saveConfig(config);
  return assistant;
}

new CommandProcessor();

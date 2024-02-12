const readline = require('readline');
const process = require('process');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// get command-line arguments
const args = process.argv.slice(2);

// look for command-line flags
const flags = args.filter((arg) => arg.startsWith('--'));
const commands = args.filter((arg) => !arg.startsWith('--'));

// look for the --help flag
if (flags.includes('--help')) {
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

class AssistantRunner {
  commandProcessor
  assistant
  openai
  thread
  run
  status
  latestMessage
  cancelRequested
  toolCalls
  toolOutputs
  tools
  schemas
  spinState = {
    frames: [
      "🌑 ",
			"🌒 ",
			"🌓 ",
			"🌔 ",
			"🌕 ",
			"🌖 ",
			"🌗 ",
			"🌘 "
      //"◟", "◡", "◞", "◝", "◠", "◜", "◠", "◝", "◞", "◡", "◟", "◢", "◣", "◤", "◥", "◰", "◳", "◲", "◱", "◴", "◷", "◶", "◵", "◷", "◶", "◵", "◴", "◱", "◲", "◳", "◰", "◥", "◤", "◣", "◢", 
    ],
    currentIndex: 0,
    timer: null,
    spinning: false,
    interval: 120,
  }
  renderFrame(frame) {
    readline.clearLine(process.stdout, 0); // Clear the entire line
    readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
    process.stdout.write(`${frame}\r`); // Write the frame and title
  }
  startSpinner() {
    this.spinState.spinning = true;
    this.spinState.timer = setInterval(() => {
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
      process.stdout.write('\n'); // Move the cursor to the next line
    }
  }
  constructor(openai, assistant, tools, schemas) {
    this.openai = openai;
    this.thread = undefined;
    this.run = undefined;
    this.assistant = assistant;
    this.status = 'idle';
    this.latestMessage = '';
    this.cancelRequested = false;
    this.toolCalls = [];
    this.toolOutputs = [];
    this.tools = tools;
    this.schemas = schemas;
  }

  chat(content) {
    this.assistant.state.user_chat = this.assistant.state.user_chat || [];
    this.assistant.state.user_chat.push(content);
  }

  static async createAssistantFromPersona(persona, name, schemas) {
    return openai.beta.assistants.create(
      {
        instructions: persona,
        name,
        tools: Object.keys(schemas).map((schemaName) => schemas[schemaName]),
        model: 'gpt-4-turbo-preview'
      }
    );
  }

  async runAssistant(content) {

    // create a new thread with the assistant
    this.thread = this.thread ? this.thread : await this.openai.beta.threads.create();

    // create a new message and add it to the thread
    await this.openai.beta.threads.messages.create(this.thread.id, { role: "user", content });

    // create a new run with the assistant
    this.run = await this.openai.beta.threads.runs.create(this.thread.id, { assistant_id: this.assistant.id });
    this.status = 'starting';
    this.latestMessage = '';
    this.startSpinner();
    
    const loop = async () => {

      // we retrieve the latest state of the run
      this.run = await this.openai.beta.threads.runs.retrieve(this.thread.id, this.run.id);

      // if the run has failed, we set the latest message to the error message
      if (this.run.status === "failed") {
        // if we are rate-limited, we wait for the limit time and try again
        if (await this.waitIfRateLimited()) return loop();
        // else we set the latest message to the error message
        this.latestMessage = 'failed run: ' + this.run.last_error || await this.latestMessage || '\n';
        this.stopSpinner();
        return this.latestMessage;
      }

      // if the run is cancelled, we set the latest message to 'cancelled run'
      else if (this.run.status === "cancelled") {
        this.latestMessage = 'cancelled run';
        this.stopSpinner();
        return this.latestMessage;
      }

      // if the run is completed, we set the latest message to the last message in the thread
      else if (this.run.status === "completed") {
        this.latestMessage = await this.getLatestMessage() || '\n';
        this.status = 'idle';
        this.stopSpinner();
        // return the latest message
        return this.latestMessage;
      }

      // if the run is queued or in progress, we wait for the run to complete
      else if (this.run.status === "queued" || this.run.status === "in_progress") {
        while (this.run.status === "queued" || this.run.status === "in_progress") {
          this.run = await this.openai.beta.threads.runs.retrieve(this.thread.id, this.run.id);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // if the run requires action, we execute the tools and submit the outputs
      else if (this.run.status === "requires_action") {
        this.toolCalls = this.run.required_action.submit_tool_outputs.tool_calls;
        this.toolOutputs = await this.execTools(this.toolCalls, this.tools);
        await openai.beta.threads.runs.submitToolOutputs(this.thread.id, this.run.id, { tool_outputs: this.toolOutputs });
      }

      // if a cancellation was requested, we cancel the run and set the latest message to 'cancelled run'
      if (this.cancelRequested && this.run && this.thread) {
        this.latestMessage = 'cancelled run';
        this.stopSpinner();
        return this.latestMessage;
      }

      // we wait one second before looping again
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await loop();

    }
    return await loop();
  }

  // execute the tools
  async execTools(toolCalls, availableFunctions) {
    let toolOutputs = [];
    for (const toolCall of toolCalls) {
      try {
        let func = availableFunctions[toolCall.function.name];
        if (!func) {
          throw new Error(`Function ${toolCall.function.name} is not available.`);
        }
        const _arguments = JSON.parse(toolCall.function.arguments || '{}');
        let result = await func(_arguments, this);
        // if the result is not a string, we stringify it
        if (typeof result !== 'string') {
          result = JSON.stringify(result);
        }
        // if there's still no result, we set it to an empty string
        if (!result) {
          console.log(`No return value for ${toolCall.function.name}`)
          result = `No return value for ${toolCall.function.name}`;
        }
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: result
        });
      } catch (e) {
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: 'error: ' + e.message
        });
      }
    }
    return toolOutputs;
  }

  // wait for the rate limit to be lifted
  async waitIfRateLimited() {
    if (this.run.last_error.includes('rate limit exceeded')) {
      const waitTime = (parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[1])
        * 60 + parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[2]) + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return true;
    } else return false;
  }

  // request a cancellation of the run
  async requestCancel() {
    if (this.run && this.thread) {
      try {
        this.cancelRequested = true;
        await this.openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
      } catch (e) {
        console.error('Error cancelling run:', e);
      }
    }
  }

  // get the latest message in the thread
  async getLatestMessage() {
    if (this.thread) {
      const messages = await this.openai.beta.threads.messages.list(this.thread.id);
      return messages.data[messages.data.length - 1].content;
    }
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const developerToolbox = {
    prompt: `INSTRUCTIONS: Implement the given requirements.

Read the input JSON object's requirements field.
Your current working folder is: ${process.cwd()}

CALL user_chat_get to get the user's chat messages.

  IF there are any messages,
    FOR EACH message in messages,
      ECHO a response to each message
    END FOR
    perform adjustments to the requirements based on messages
    CALL requirements_getset to update the requirements
    CALL task_set_current to 'decompose requirements'
    EXIT

CALL requirements_getset to get the existing requirements.

  IF the requirements have changed

    IF the new requirements can be performed in one session

      DO THE WORK: Use the tools at your disposal to help you.
        * Execute tasks required to meet the new requirements within this iteration. *

      CALL percent_complete_getset to update the percent complete to 100
      CALL status_getset to set the status to 'complete'
      ECHO a status to the user
      EXIT
  
    ELSE
      CALL requirements_getset to update with the new requirements
      CALL percent_complete_getset to reset the percent complete to 0
      CALL current_task_getset to 'decompose requirements'
      ECHO a status to the user
      EXIT

  ELSE start working on the current task.

    IF current_task_getset == 'decompose requirements'

      Decompose the requirements into actionable tasks
      CALL tasks_getset to set these tasks. This automatically sets the current task to the first task.
      CALL percent_complete_getset to 2
      ECHO a status to the user
      EXIT

    ELSE

      work on the current task
        CALL status_getset to set the status to 'working'
        DO THE WORK: Progress the task forward using available tools.
        CALL percent_complete_getset to update the percent complete
        CALL ai_notes_getset to set notes and comments for continuity

        IF the task is completed,

          CALL tasks_advance to move to the next task

            IF there is a next task,
              EXIT
            ELSE
              CALL status_getset to set the status to 'complete'
              ECHO a status to the user
              EXIT

ON ERROR:
  CALL status_getset to set the status to 'error'
  CALL error to log the FULL TECHNICAL DETAILS of the error message
  EXIT

ON WARNING:
  CALL status_getset to set the status to 'warning'
  CALL warn to log the warning message

ALWAYS:
  OUTPUT: ECHO COMPLETION to the user
  DECOMPOSE TASKS INTO DIRECT, ACTIONABLE STEPS: Provide clear, sequential instructions.
  USE THE TOOLS: Use the tools at your disposal to help you.
  BE RESOURCEFUL: Use all available resources to solve the problem.
  MAKE NEW TOOLS: If you need a tool that doesn't exist, create it.
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
        requirements_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.requirements; else { developerToolbox.state.requirements = value; return developerToolbox.state.requirements } },
        percent_complete_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.percent_complete; else { developerToolbox.state.percent_complete = value; return developerToolbox.state.percent_complete } },
        status_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.status; else {  developerToolbox.state.status = value; return developerToolbox.state.status } },
        ai_notes_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.ai_notes; else { developerToolbox.state.ai_notes = value; return developerToolbox.state.ai_notes } },
        tasks_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.tasks; else { developerToolbox.state.tasks = value.trim().split('\n'); developerToolbox.state.current_task = developerToolbox.state.tasks[0]; console.log('tasks set to:' + value + ', current task set to ' + developerToolbox.state.tasks[0]); return developerToolbox.state.tasks } },
        current_task_getset: function ({ value }) { if(value === undefined) return developerToolbox.state.current_task; else { developerToolbox.state.current_task = value; console.log('current task set to:' + value); return developerToolbox.state.current_task } },
        tasks_advance: function (_) { developerToolbox.state.tasks.shift(); developerToolbox.state.current_task = developerToolbox.state.tasks[0]; console.log('task advanced to:' + developerToolbox.state.current_task); console.log(developerToolbox.state.current_task); return developerToolbox.state.current_task },
        error: function ({message}) { console.error(message); return message },
        log: function ({message}) { console.log(message); return message },
        user_chat_get: function (_) { const uc = developerToolbox.state.user_chat; return (uc && uc.length > 0) ? JSON.stringify(uc) : 'no chat messages' },
        generate_tool: async function ({ requirements }, assistantRef) {
          toolmakerToolbox.toolmaker = await AssistantRunner.createAssistantFromPersona(toolmakerToolbox.prompt, 'toolmaker', toolmakerToolbox.schemas);
          toolmakerToolbox.toolmakerRun = new AssistantRunner(openai, toolmakerToolbox.toolmaker, toolmakerToolbox.tools, toolmakerToolbox.schemas);
          const callToolmaker = async () => {
            await toolmakerToolbox.toolmakerRun.runAssistant(requirements);
            if (toolmakerToolbox.state.complete) {
              return 'tool generated';
            }
            else await callToolmaker();
          }
          return await callToolmaker();
        },
    },
    schemas: [
        { type: 'function', function: { name: 'requirements_getset', description: 'Get or set the requirements field. Call with no parameters to get the field. Call with a value to set the field.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The new requirements' } }, required: [] } } },
        { type: 'function', function: { name: 'percent_complete_getset', description: 'Get or set the percent complete field. Call with no parameters to get the value.', parameters: { type: 'object', properties: { value: { type: 'number', description: 'The percent complete' } }, required: [] } } },
        { type: 'function', function: { name: 'ai_notes_getset', description: 'Get or set the AI notes. Call with no parameter to get the notes.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The new AI notes' } }, required: [] } } },
        { type: 'function', function: { name: 'user_chat_get', description: 'Get chat messages from the user' } },
        { type: 'function', function: { name: 'status_getset', description: 'Get or set the status. Call with no parameters to get the status', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The new status' } }, required: [] } } },
        { type: 'function', function: { name: 'tasks_getset', description: 'Get or set the tasks. Call with no parameter to get thet tasks', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The list of tasks, newline-delimited' } }, required: [] } } },
        { type: 'function', function: { name: 'current_task_getset', description: 'Get or set the current task. Call with no pparameters to get the current task.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The current task' } }, required: ['value'] } } },
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
    start_work: function (_) { toolmakerToolbox.state.temp_work = '// work started'; complete = false; console.log('Work on tool started.'); return 'started' },
    is_work_started: function (_) { return toolmakerToolbox.state.temp_work ? toolmakerToolbox.state.temp_work : 'no' },
    save_temp_work: function ({ value }) { toolmakerToolbox.state.temp_work = value; console.log('Saving temp work.'); return toolmakerToolbox.state.temp_work },
    finish_work: function ({ value }) {
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
  state = {};

  constructor() {
    // create the readline interface
    this.rl = readline.createInterface({
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
        apiKey: process.env.OPENAI_API_KEY,
        playHtApiKey: process.env.PLAYHT_AUTHORIZATION,
        playHtUserId: process.env.PLAYHT_USER_ID,
        playHtMaleVoice: process.env.PLAYHT_MALE_VOICE,
        playHtFemaleVoice: process.env.PLAYHT_FEMALE_VOICE,
        googleApiKey: process.env.GOOGLE_API_KEY,
        googleCxId: process.env.GOOGLE_CX_ID,
        newsApiKey: process.env.NEWS_API_KEY,
        assistantSuffix: Math.random().toString(36).substring(7),
      };
      fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(this.config));
    }

    this.queue = [];
    this.commandHandlers = {
      'quit': () => process.exit(),
      'clear': () => {
        process.stdout.write('\x1Bc');
        this.rl.prompt();
      },
      'env': async (command) => {
        const [_, key, value] = command.split(' ');
        if (key && value) {
          process.env[key] = value;
          this.rl.prompt();
        }
      },
      'status': async (command) => {
        console.log(this.state.status);
        this.rl.prompt();
      },
      'echo': async (command) => {
        console.log(command);
      },
      'greet': async () => {
        const prompt = 'hello, your are my assistant, and I am your user, Sebastian. Please greet me back, and tell me your name.';
        this.assistantRun = new AssistantRunner(openai, this.assistant, developerToolbox.tools, developerToolbox.schemas);

        const result = await this.assistantRun.runAssistant(prompt);
        this.state.status = 'idle';
        this.rl.prompt();
        return result;
      },
      '*': async (command) => { // Make sure this is marked as async
        if (this.state.status === 'working' && this.assistantRun) {
          this.assistantRun.chat(command);
          this.rl.prompt();
          return
        }
        this.assistantRun = new AssistantRunner(openai, this.assistant, developerToolbox.tools, developerToolbox.schemas);
        const loop = async () => {
          const ret = await this.assistantRun.runAssistant(JSON.stringify({
            requirements: command,
            current_task: developerToolbox.state.current_task || '',
            percent_complete: developerToolbox.state.percent_complete,
          }));
          if (developerToolbox.state.complete || developerToolbox.state.percent_complete === 100) {
            return ret;
          } else {
            console.log(`Percent Complete: ${developerToolbox.state.percent_complete}`);
            console.log('Current Task: ' + developerToolbox.state.current_task);
            return loop();
          }
        }
        const result = await loop();

        this.state.status = 'idle';
        this.rl.prompt();
    
        return result;
      }
    };

    // the base tools from the developerToolbox
    Object.keys(developerToolbox.tools).forEach((key) => {
      developerToolbox.tools[key] = developerToolbox.tools[key].bind(this);
    });

    // check for a ./tools directory
    if (fs.existsSync(path.join(process.cwd(), 'tools'))) {
      const files = fs.readdirSync(path.join(process.cwd(), 'tools'));
      files.forEach((file) => {
        const tool = require(path.join(process.cwd(), 'tools', file));
        developerToolbox.tools = { ...developerToolbox.tools, ...tool.tools };
        developerToolbox.schemas = [ ...developerToolbox.schemas, ...tool.schemas ];
        developerToolbox.state = { ...developerToolbox.state, ...tool.state };
      });
      Object.keys(developerToolbox.tools).forEach((key) => {
        developerToolbox.tools[key] = developerToolbox.tools[key].bind(this);
      });
    } else {
      // create the ./tools directory
      fs.mkdirSync(path.join(process.cwd(), 'tools'));
    }
    this.getCommandHandler = this.getCommandHandler.bind(this);
    this.initAssistant = this.initAssistant.bind(this);
    this.initializeReadline = this.initializeReadline.bind(this);
    this.handleLine = this.handleLine.bind(this);
    this.startQueueMonitor = this.startQueueMonitor.bind(this);
    this.success = this.success.bind(this);
    this.initAssistant().then(() => {
      this.initializeReadline();
      this.startQueueMonitor();
      //setTimeout(()=> this.queue.push(() => this.getCommandHandler('greet')()), 1000);
    })
  }

  async createThread() {
    this.thread = await openai.beta.threads.create();
  }

  async createRun() {
    this.run = await openai.beta.threads.runs.create(this.thread.id, { assistant_id: this.assistant.id });
  }

  async retrieveRun() {
    this.run = await openai.beta.threads.runs.retrieve(this.thread.id, this.run.id);
  }

  async cancel() {
    try {
      if(this.run && this.thread && this.run.status !== 'completed' && this.run.status !== 'cancelled' && this.run.status !== 'idle'&& this.run.status !== 'failed') {
        console.log('Cancelling run');
        await openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
        return true;
      }
    } catch (error) {
      console.error(`Error cancelling run: ${error.message}`);
      return false;
    }
  }

  async updateConfig(key, value) {
    this.config[key] = value;
    fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(this.config));
  }

  async initAssistant() {
    const assistants = (await openai.beta.assistants.list()).data
    const rlAssistants = assistants.filter((assistant) => assistant.name === 'executor');
    const toolmakerAssistants = assistants.filter((assistant) => assistant.name === 'toolmaker');
    const toDelete = [...rlAssistants, ...toolmakerAssistants];
    await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
    this.assistant = await AssistantRunner.createAssistantFromPersona(developerToolbox.prompt, 'assistant_' + this.config.assistantSuffix, developerToolbox.schemas);
  }

  initializeReadline() {
    this.rl.prompt(); // Display the initial prompt with the CWD
    this.rl.on('line', (line) => {
      this.handleLine(line.trim()).then(() => {
        // Update and display the prompt for the next input
        // Moved to success and error handlers to ensure proper re-prompting
      });
    }).on('close', () => {
      // cancel the assistant run
      if(this.cancel())
      console.log('bye');
      this.rl.prompt();
    });
  }

  async handleLine(line) {
    const commandHandler = this.getCommandHandler(line);
    if (commandHandler) {
      this.queue.push(commandHandler);
    } else {
      console.log('Invalid command');
    }
  }

  getCommandHandler(command) {
    if (this.commandHandlers[command]) {
      return () => this.commandHandlers[command](command);
    } else if (this.commandHandlers['*']) {
      return () => this.commandHandlers['*'](command);
    }
    return null;
  }

  async startQueueMonitor() {
    setInterval(async () => {
      if (this.queue.length > 0) {
        const command = this.queue.shift();
        try {
          await command();
        } catch (error) {
          console.error(`Error executing command: ${error.message}`);
          // Correctly refer to `this` within the arrow function
          this.error(`Error: ${error.message}`);
        }
      }
    }, 100);
  }

  success(message) {
    if (message) console.log(`${message}`); // Log the success message
    this.rl.prompt(); // Re-display the prompt
  }

  error(message) {
    if (message) console.error(`${message}`); // Log the error message
    this.rl.prompt(); // Re-display the prompt
  }

  persist(icon, message) {
    process.stdout.write(`${icon} ${message}\r\n`); // Write the message to stdout with an icon and start a new line
  }
}

new CommandProcessor();

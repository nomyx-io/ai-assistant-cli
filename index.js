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

// get the application's install directory
let appDir = path.dirname(require.main.filename);

function saveConfig(config) {
  // get the application install directory
  const appDir = path.dirname(require.main.filename);
  fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify(config));
}

function loadConfig() {
  const appDir = path.dirname(require.main.filename);
  if(fs.existsSync(path.join(appDir, 'config.json'))) {
    return JSON.parse(fs.readFileSync(path.join(appDir, 'config.json')));
  } else {
    const config = {
      apiKey: process.env.OPENAI_API_KEY,
      playHtApiKey: process.env.PLAYHT_AUTHORIZATION,
      playHtUserId: process.env.PLAYHT_USER_ID,
      playHtMaleVoice: process.env.PLAYHT_MALE_VOICE,
      playHtFemaleVoice: process.env.PLAYHT_FEMALE_VOICE
    };
    saveConfig(config);
    return config;
  }
}
const config = loadConfig();

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
  thread
  run
  status
  latestMessage
  toolCalls
  toolOutputs
  assistant
  id
  uid
  state
  constructor(
    openai, 
    toolbox,
    uid = undefined) {
        this.openai = openai;
        this.thread = undefined;
        this.run = undefined;
        this.status = 'idle';
        this.latestMessage = '';
        this.toolCalls = [];
        this.toolOutputs = [];
        this.prompt = toolbox.prompt;
        this.tools = toolbox.tools;
        this.schemas = toolbox.schemas;
        this.assistant = undefined;
        this.id = '';
        this.uid = uid || '';
        this.state = {};
        this.runAssistant = this.runAssistant.bind(this);
    }
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
  destroy() {
      if (this.run && this.thread) {
          this.openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
      }
      this.openai.beta.assistants.del(this.assistant.id);
  }

  chat(content) {
      this.state.user_chat = this.state.user_chat || [];
      this.state.user_chat.push(content);
  }

  static async createAssistantFromPersona(persona, name, schemas) {
      return openai.beta.assistants.create({
          instructions: persona,
          name,
          tools: Object.keys(schemas).map((schemaName) => schemas[schemaName]),
          model: 'gpt-4-turbo-preview'
      });
  }

  async runAssistant(content, onEvent = () =>{}){
      this.startSpinner();

      this.try = 0;
      const createOrLoadAssistant = async () => {
        try {
          if(!this.assistant) {
            if(this.uid) {
              try {
                this.assistant = await openai.beta.assistants.retrieve(this.uid); 
              } catch (e) {
                this.assistant = await AssistantRunner.createAssistantFromPersona(this.prompt, 'assistant', this.schemas);
              }
            } 
            else { this.assistant = await AssistantRunner.createAssistantFromPersona(this.prompt, 'assistant', this.schemas); }
        }
        this.id = this.assistant.id;
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if(this.try<3) {
            console.log('retrying createOrLoadAssistant...');
            await createOrLoadAssistant();
            this.try++;
          }
        }
      }
      await createOrLoadAssistant();
      
      // create a new thread with the assistant
      // this.thread = this.thread ? this.thread : await this.openai.beta.threads.create();
      this.try = 0;
      const useOrCreateThread = async () => {
        try {
          this.thread = this.thread ? this.thread : await this.openai.beta.threads.create();
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if(this.try<3) {
            console.log('retrying useOrCreateThread...');
            await useOrCreateThread();
            this.try++;
          }
        }
      }
      await useOrCreateThread();

      // create a new message and add it to the thread
      this.try = 0;
      const createMessage = async () => {
        try {
          await this.openai.beta.threads.messages.create(this.thread.id, { role: "user", content });
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if(this.try<3) {
            console.log('retrying createMessage...');
            await createMessage();
            this.try++;
          }
        }
      }
      await createMessage();

      this.try = 0;
      const createRun = async () => {
        try {
          this.run = await this.openai.beta.threads.runs.create(this.thread.id, { assistant_id: this.assistant.id });
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if(this.try<3) {
            console.log('retrying createRun...');
            await createRun();
            this.try++;
          }
        }
      }
      await createRun();

      this.status = 'starting';
      this.latestMessage = '';

      onEvent('assistant-started', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
      const loop = async () => {

          onEvent('assistant-loop', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });

          this.try = 0;
          const retrieveRun = async () => {
            try {
              this.run = await this.openai.beta.threads.runs.retrieve(this.thread.id, this.run.id);
            } catch (e) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              if(this.try<3) {
                console.log('retrying retrieveRun...');
                await retrieveRun();
                this.try++;
              }
            }
          }
          await retrieveRun();

          // if the run has failed, we set the latest message to the error message
          if (this.run.status === "failed") {
              // if we are rate-limited, we wait for the limit time and try again
              if (await this.waitIfRateLimited(onEvent)) return loop();
              // else we set the latest message to the error message
              this.latestMessage = 'failed run: ' + this.run.last_error || this.latestMessage || '\n';
              onEvent('assistant-failed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
              return this.latestMessage;
          }

          // if the run is cancelled, we set the latest message to 'cancelled run'
          else if (this.run.status === "cancelled") {
              this.latestMessage = 'cancelled run';
              onEvent('assistant-cancelled', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
              return this.latestMessage;
          }

          // if the run is completed, we set the latest message to the last message in the thread
          else if (this.run.status === "completed") {
              this.latestMessage = await this.getLatestMessage() || '\n';
              this.status = 'idle';
              onEvent('assistant-completed', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, message: this.latestMessage });
              return this.latestMessage;
          }

          // if the run is queued or in progress, we wait for the run to complete
          else if (this.run.status === "queued" || this.run.status === "in_progress") {
              while (this.run.status === "queued" || this.run.status === "in_progress") {
                  await retrieveRun();
                  await new Promise(resolve => setTimeout(resolve, 1000));
              }
              onEvent('assistant-in-progress', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });
          }

          // if the run requires action, we execute the tools and submit the outputs
          else if (this.run.status === "requires_action") {
              this.toolCalls = this.run.required_action.submit_tool_outputs.tool_calls;
              this.toolOutputs = await this.execTools(this.toolCalls, this.tools, onEvent, this.state);
              onEvent('exec-tools', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id, toolCalls: this.toolCalls, toolOutputs: this.toolOutputs});
              await openai.beta.threads.runs.submitToolOutputs(this.thread.id, this.run.id, { tool_outputs: this.toolOutputs });
          }

          onEvent('assistant-loop-end', { assistantId: this.assistant.id, threadId: this.thread.id, runId: this.run.id });

          // we wait one second before looping again
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loop();
      }
      const response = await loop();
      try {
        const json = JSON.parse(response);
        for (const key in json) {
            this.state[key] = json[key];
            console.log(`${key}: ${json[key]}`);
        }
      } catch (e) {
          console.log('parse error',response);
      }
  }

  // execute the tools
  async execTools(toolCalls, availableFunctions, onEvent, state) {
      let toolOutputs = [];
      for (const toolCall of toolCalls) {
          try {
              let func = availableFunctions[toolCall.function.name];
              if (!func) {
                onEvent('exec-tool-error', { toolCallId: toolCall.id, toolCall: toolCall, message: `Function ${toolCall.function.name} is not available.` });
                throw new Error(`Function ${toolCall.function.name} is not available.`);
              }
              const _arguments = JSON.parse(toolCall.function.arguments || '{}');
              if(state.update_callback) {
                  state.update_callback(`${toolCall.function.name} (${toolCall.function.arguments})`);
              }
              let result = await func(_arguments, state);
              onEvent('exec-tool', { toolCallId: toolCall.id, toolCall: toolCall, result: result });

              // if the function has an update callback, we call it
              if(state.update_callback) {
                  state.update_callback(result);
              }

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
  async waitIfRateLimited(onEvent) {
      if (this.run.last_error.includes('rate limit exceeded')) {
          const waitTime = (parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[1])
              * 60 + parseInt(this.run.last_error.match(/(\d+)m(\d+)/)[2]) + 1) * 1000;
          onEvent('rate-limited', { waitTime });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return true;
      } else return false;
  }

  // request a cancellation of the run
  async requestCancel() {
      if (this.run && this.thread) {
          try {
              await this.openai.beta.threads.runs.cancel(this.thread.id, this.run.id);
          } catch (e) {
              console.error('Error cancelling run:', e);
          }
      }
  }

  // get the latest message in the thread
  async getLatestMessage() {
    const _getLatestMessage = async () => {
      try {
        if (this.thread) {
          const messages = await this.openai.beta.threads.messages.list(this.thread.id);
          return messages.data[messages.data.length - 1].content;
        }
      } catch (error) {
        if(this.try<3) {
          console.log('retrying getLatestMessage...');
          await _getLatestMessage();
          this.try++;
        } else {
          console.error(`Error getting latest message: ${error.message}`);
          return '';
        }
      }
    }
    return await _getLatestMessage();
  }
}


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const developerToolbox = {
    prompt: `INSTRUCTIONS: Transform the contents of the current working folder so that it meets the requirements.

    You can GET and SET the state of any variable using the getset_state function. (You can also getset_states to getset multiple states at once)
      When you see a GET, call getset_state("variable") to get the value of the state.
      When you see a SET, call getset_state("variable", <value>) to set the value of the state.
    
    Your current working folder is: ${process.cwd()}
    
    IMPORTANT VARIABLES:
    - requirements: The requirements (input)
    - percent_complete: The percent complete (output)
    - status: The status (output)
    - tasks: The tasks to perform (input, output)
    - current_task: The current task (input, output)
    - ai_notes: The current AI notes (input, output)
    - user_chat: The current user chat
    - show_file: Set to the file you want to see on the next iteration
    
    
    GET user_chat to get the user's chat messages.
    
      IF there are any messages,
        FOR EACH message in user_chat,
          ECHO a response to each message
        END FOR
        perform adjustments to the requirements based on messages
          GET requirements to read the requirements
          adjust the requirements based on the messages
            SET requirements to the new requirements
        SET current_task to 'decompose requirements'
        EXIT
    
    GET requirements to get the existing requirements.
    
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
          SET percent complete to 0
          SET current_task to 'decompose requirements'
          ECHO a status to the user
          EXIT
    
      ELSE start working on the current task.
    
        IF GET current_task == 'decompose requirements'
    
          Decompose the requirements into actionable tasks
          SET tasks to the decomposed tasks
          SET current_task to the first task
          SET percent_complete to 2
          ECHO a status to the user
          EXIT
    
        ELSE
    
          work on the current task
            SET status to 'working'
            
            DO THE WORK: Move the task forward using the tools at your disposal.
            MAKE A TOOL: If you need a tool that doesn't exist, create it.
            BE CREATIVE: Use your creativity to solve the problem.
            
            SET percent_complete to update the percent complete
            SET ai_notes to notes and comments for continuity
    
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
      RESPOND with a JSON object WITH NO SURROUNDING CODEBLOCKS with the following fields:
        requirements: The new requirements
        percent_complete: The new percent complete
        status: The new status
        tasks: The new tasks
        current_task: The new current task
        ai_notes: The new AI notes
        user_chat: The new user chat
    
    ALWAYS:
      OUTPUT: ECHO COMPLETION to the user
      DECOMPOSE TASKS INTO DIRECT, ACTIONABLE STEPS. No 'research' or 'browser testing' tasks. Each task should be a direct action.
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
        getset_state: function ({ name, value }, state) { if (value === undefined) delete state[name]; else { state[name] = value; } return JSON.stringify(state[name]) },
        getset_states: function ({ values }, state) { for (const { name, value } in values) { state[name] = value }; return JSON.stringify(state) },
        tasks_advance: function (_) { developerToolbox.state.tasks.shift(); developerToolbox.state.current_task = developerToolbox.state.tasks[0]; console.log('task advanced to:' + developerToolbox.state.current_task); console.log(developerToolbox.state.current_task); return developerToolbox.state.current_task },
        error: function ({message}) { console.error(message); return message },
        log: function ({message}) { console.log(message); return message },
        generate_tool: async function ({ requirements }, assistantRef) {
          toolmakerToolbox.toolmakerRun = new AssistantRunner(openai, toolmakerToolbox, 'toolmaker');
          toolmakerToolbox.toolmaker = toolmakerToolbox.toolmakerRun;
          const callToolmaker = async () => {
            await toolmakerToolbox.toolmakerRun.runAssistant(requirements, (event, data) => {
              if(toolmakerToolbox.lastEvent === event) return;
              toolmakerToolbox.lastEvent = event;
              console.log('toolmaker', event);
            })
            if (toolmakerToolbox.state.complete) {
              return 'tool generated';
            }
            else await callToolmaker();
          }
          return await callToolmaker();
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
      'state': async (command) => {
        const state = Object.keys(this.state).map((key) => `${key}: ${this.state[key]}`).join('\n');
        console.log(state);
        this.rl.prompt();
      },
      'reset': async (command) => {
        this.state = {};
        this.config.assistantId = '';
        this.config.threadId = '';
        saveConfig(config);
        this.rl.prompt();
      },
      'echo': async (command) => {
        console.log(command);
      },
      'greet': async () => {
        const prompt = 'hello, your are my assistant, and I am your user. Please greet me back, and tell me your name.';
        this.assistantRun = new AssistantRunner(openai, developerToolbox, 'assistant');

        const result = await this.assistantRun.runAssistant(prompt, (event, data) => {
        })

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
        // read all the contents of the ./tools folder
        const assistantId = config.assistantId;
        this.assistantRun = new AssistantRunner(openai,  developerToolbox, 'assistant', assistantId);
        config.assistantId = this.assistantRun.id;

        let lastEvent = '';
        const loop = async () => {
          const ret = await this.assistantRun.runAssistant(JSON.stringify({
            requirements: command,
            current_task: this.state.current_task || '',
            percent_complete: this.state.percent_complete,
            ai_notes: this.state.ai_notes 
          }), (event, data) => {
            if(lastEvent === event) return;
            if(assistant.thread.id && !config.threadId) {
              config.threadId = assistant.thread.id;
              saveConfig(config);
            }
            lastEvent = event;
            if(event === 'exec-tool') {
              const toolCall = data.toolCall;
              const toolResult = data.result;
              console.log(`${toolCall.function.name}(${toolCall.function.arguments})`);
              console.log(toolResult);
            }
          })
          console.log(ret);
          if (this.state.complete || this.state.percent_complete === 100) {
            return ret;
          } else {
            console.log(`Percent Complete: ${this.state.percent_complete}`);
            console.log('Current Task: ' + this.state.current_task);
            console.log('User Chat: ' + this.state.user_chat);
            console.log('AI Notes: ' + this.state.ai_notes);
            return loop();
          }
        }
        const result = await loop();
        console.log(result);
        
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
    // if the appDir ends with a bin directory, we need to go up one more level
    const appDirParts = appDir.split(path.sep);
    if (appDirParts[appDirParts.length - 1] === 'bin') {
      appDirParts.pop();
      appDir = appDirParts.join(path.sep);
    }
    const toolsFolder = path.join(appDir, 'tools')
    if (fs.existsSync(toolsFolder)) {
      const files = fs.readdirSync(toolsFolder);
      files.forEach((file) => {
        const tool = require(path.join(appDir, 'tools', file));
        developerToolbox.tools = { ...developerToolbox.tools, ...tool.tools };
        developerToolbox.schemas = [ ...developerToolbox.schemas, ...tool.schemas ];
        developerToolbox.state = { ...developerToolbox.state, ...tool.state };
      });
      Object.keys(developerToolbox.tools).forEach((key) => {
        developerToolbox.tools[key] = developerToolbox.tools[key].bind(this);
      });
    } else {
      // create the ./tools directory
      fs.mkdirSync(path.join(appDir, 'tools'));
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
      console.log('ready');
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
    this.try = 0;
    const cleanup = async () => {
      try {
        const assistants = (await openai.beta.assistants.list()).data
        const rlAssistants = assistants.filter((assistant) => assistant.name === 'assistant');
        const toolmakerAssistants = assistants.filter((assistant) => assistant.name === 'toolmaker');
        const toDelete = [...rlAssistants, ...toolmakerAssistants];
        if (toDelete.length > 0)
          await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
      } catch (error) {
        // wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        // try again
        if(this.try<3) {
          console.log('retrying cleanup...');
          await cleanup();
          this.try++;
        }
      }
    }
    await cleanup();
    this.try = 0;
    const createAssistant = async () => {
      try {
        this.assistant = AssistantRunner.createAssistantFromPersona(developerToolbox.prompt, 'assistant', developerToolbox.schemas);
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if(this.try<3) {
          console.log('retrying createAssistant...');
          await createAssistant();
          this.try++;
        }
      }
    }
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

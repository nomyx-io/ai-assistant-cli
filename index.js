require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const debug = false;
const { generateUsername } = require("unique-username-generator");
const { configManager } = require('./config-manager');

const isBrowser = () => typeof window !== 'undefined';
const loadConfig = () => configManager.getConfig();
const saveConfig = (config) => configManager.setConfig(config);

class AssistantAPI {
    serverUrl;
    constructor(serverUrl = 'https://api.openai.com/v1/') {
        this.serverUrl = serverUrl;
    }
    async callAPI(type, api, body = {}) {
        const def = this.apisDefinition({
            assistant_id: body.assistant_id,
            thread_id: body.thread_id,
            run_id: body.run_id,
            messageId: body.messageId,
            fileId: body.fileId,
            stepId: body.stepId,
            body: body.body
        });

        const func = def[type][api];
        const method = Object.keys(def[type][api])[0];
        const path = func[method].join('/');
        const url = new URL(path, this.serverUrl);
        if (debug) console.log({
            url: url.href,
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v1"
            },
            body: JSON.stringify(body.body)
        })
        const ret = await fetch(url, {
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v1"
            },
            body: JSON.stringify(body.body)
        });
        return await ret.json();
    }
    apisDefinition(state) {
        function get(api) { return { 'get': api } }
        function post(api, body = {}) { return { 'post': api, 'body': body } }
        function put(api, body = {}) { return { 'put': api, 'body': body } }
        function del(api) { return { 'delete': api } }
        return {
            'assistants': {
                'list': get(['assistants']),
                'create': post(['assistants']),
                'retrieve': get(['assistants', state.assistant_id]),
                'modify': put(['assistants', state.assistant_id], state.body),
                'delete': del(['assistants', state.assistant_id]),
                'list_files': get(['assistants', state.assistant_id, 'files']),
                'upload_file': post(['assistants', state.assistant_id, 'files'], state.body),
                'retrieve_file': get(['assistants', state.assistant_id, 'files', state.fileId]),
                'delete_file': del(['assistants', state.assistant_id, 'files', state.fileId]),
            },
            'threads': {
                'create': post(['threads']),
                'retrieve': get(['threads', state.thread_id]),
                'modify': put(['threads', state.thread_id], state.body),
                'delete': del(['threads', state.thread_id]),
                'list_messages': get(['threads', state.thread_id, 'messages']),
                'create_message': post(['threads', state.thread_id, 'messages'], state.body),
                'retrieve_message': get(['threads', state.thread_id, 'messages', state.messageId]),
                'list_message_files': get(['threads', state.thread_id, 'messages', state.messageId, 'files']),
                'retrieve_message_file': get(['threads', state.thread_id, 'messages', state.messageId, 'files', state.fileId]),
                'modify_message': put(['threads', state.thread_id, 'messages', state.messageId], state.body),
            },
            'runs': {
                'create': post(['threads', state.thread_id, 'runs'], state.body),
                'create_thread_and_run': post(['threads', 'runs'], state.body),
                'list': get(['threads', state.thread_id, 'runs']),
                'list_run_steps': get(['threads', state.thread_id, 'runs', state.run_id, 'steps']),
                'retrieve_run': get(['threads', state.thread_id, 'runs', state.run_id]),
                'retrieve_run_step': get(['threads', state.thread_id, 'runs', state.run_id, 'steps', state.stepId]),
                'modify_run': put(['threads', state.thread_id, 'runs', state.run_id], state.body),
                'submit_tool_outputs': post(['threads', state.thread_id, 'runs', state.run_id, 'submit_tool_outputs'], state.body),
                'cancel': post(['threads', state.thread_id, 'runs', state.run_id, 'cancel']),
            }
        }
    }
    static async run(persona, assistant_id, thread_id, name, request, schemas, tools, state, model = 'gpt-4-turbo-preview', onEvent) {
        let assistant;
        if (assistant_id) assistant = await assistantAPI.callAPI('assistants', 'retrieve', { assistant_id: assistant_id });
        else assistant = await assistantAPI.callAPI('assistants', 'create', {
            body: {
                instructions: persona,
                model,
                name,
                tools: schemas
            }
        });
        if(!assistant.id) throw new Error('Assistant not created: ' + JSON.stringify(assistant));
        onEvent('assistant-created', { assistant_id: assistant.id });

        let thread;
        if (thread_id) thread = await assistantAPI.callAPI('threads', 'retrieve', { thread_id });
        else thread = await assistantAPI.callAPI('threads', 'create');
        onEvent('thread-created', { thread_id: thread.id });

        const createMessageAndMaybeCancelRun = async (thread_id, content) => {
            try { await assistantAPI.callAPI('threads', 'create_message', { thread_id, body: { role: "user", content: request } }); }
            catch (e) {
                let run_id = e.message.match(/run_\w+/);
                if (run_id) {
                    run_id = run_id[0];
                    await assistantAPI.callAPI('runs', ['cancel'], { thread_id: thread.id, run_id });
                    return createMessageAndMaybeCancelRun(thread_id, content);
                } else { throw e; }
            }
            onEvent('message-created', { thread_id, content });
        }
        await createMessageAndMaybeCancelRun(thread.id, request);

        const listLastMessage = async (thread_id) => {
            const messages = await assistantAPI.callAPI('threads', 'list_messages', { thread_id: thread_id });
            const message = messages.data[messages.data.length - 1].content;
            const rval = message[0] ? message[0].text.value : '';
            const ret = rval.replace(/\\n/g, '');
            return ret;
        }
        state.state = {...state.state, ...{
            requirements: request,
            percent_complete: 0,
            tasks: [],
            current_task: '',
            ai_chat: '',
            user_chat: '',
        }}
        const workLoop = async () => {
            let theRun = await assistantAPI.callAPI('runs', 'create', { thread_id: thread.id, body: { assistant_id: assistant.id } });
            onEvent('run-created', { run_id: theRun.id });
            const loop = async ({ theRun }) => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                theRun = await assistantAPI.callAPI('runs', 'retrieve_run', { thread_id: thread.id, run_id: theRun.id });
                const message = await listLastMessage(thread.id);
                if (message !== state.state.ai_chat) {
                    state.state.ai_chat = message;
                    onEvent('message-received', { message });
                }
    
                if (theRun.status === "failed") {
                    onEvent('run-failed', { run_id: theRun.id, state });
                    return theRun.last_error;
                } else if (theRun.status === "cancelled") {
                    onEvent('run-cancelled', { run_id: theRun.id, state });
                    return 'cancelled run';
                } else if (theRun.status === "completed") {
                    onEvent('round-completed', { run_id: theRun.id, message, state });
                    if(state.percent_complete < 100) {
                        state.percent_complete = state.percent_complete + 1 || 0;
                        return await workLoop();
                    }
                    return message;
                } else if (theRun.status === "queued" || theRun.status === "in_progress") {
                    onEvent('run-queued', { run_id: theRun.id, state });
                    while (theRun.status === "queued" || theRun.status === "in_progress") {
                        process.stdout.write('🛸');
                        theRun = await assistantAPI.callAPI('runs', 'retrieve_run', { thread_id: thread.id, run_id: theRun.id });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    return await loop({ theRun });
                } else if (theRun.status === "requires_action") {
                    onEvent('run-requires-action', { run_id: theRun.id });
                    const toolCalls = await theRun.required_action.submit_tool_outputs.tool_calls;
                    const toolOutputs = [];
                    for (const toolCall of toolCalls) {
                        let toolname = toolCall.function.name;
                        if(toolname === 'getset_state') {
                            const args = JSON.parse(toolCall.function.arguments);
                            for (const arg in args) {
                                if (state[arg]) {
                                    args[arg] = state[arg];
                                    const value = args[arg];
                                    if(value === undefined) {
                                        args[arg] = state[arg];
                                        toolOutputs.push({ tool_call_id: toolCall.id, output: arg + '=>' + state[arg] });
                                        onEvent('get-state', { key: arg, value: state[arg], state });
                                    }
                                    else {
                                        state[arg] = value;
                                        toolOutputs.push({ tool_call_id: toolCall.id, output: arg + '=>' + value });
                                        onEvent('set-state', { key: arg, value, state });
                                    }
                                }
                            }
                        }
                        else if(toolname === 'tasks_set') {
                            const args = JSON.parse(toolCall.function.arguments);
                            state.tasks = args.tasks;
                            state.percent_per_task = 100 / state.tasks.length;
                            toolOutputs.push({ tool_call_id: toolCall.id, output: 'tasks set' });
                            onEvent('set-tasks', { tasks: state.tasks, state });
                        }
                        else if(toolname === 'tasks_advance') {
                            if(!state.tasks) {
                                toolOutputs.push({ tool_call_id: toolCall.id, output: 'no tasks' });
                                onEvent('no-tasks', { state });
                            } else {
                                state.percent_complete = state.percent_complete + state.percent_per_task;
                                state.tasks.shift();
                                if(state.tasks.length === 0) {
                                    state.percent_complete = 100;
                                    state.current_task = '';
                                    state.status = 'complete';
                                    toolOutputs.push({ tool_call_id: toolCall.id, output: 'tasks completed' });
                                    onEvent('complete-tasks', { state });
                                } else {
                                    state.current_task = state.tasks[0];
                                    toolOutputs.push({ tool_call_id: toolCall.id, output: 'task advanced' });
                                    onEvent('advance-task', { task: state.current_task, state });
                                }
                            }
                        }
                        else {
                            const func = tools[toolname];
                            const _arguments = JSON.parse(toolCall.function.arguments || '{}');
                            try {
                                let output = await func(_arguments, state);
                                output =  output.replace && output.replace(/\\n/g, '') || output;
                                if (typeof output !== 'string') { output = JSON.stringify(output); }
                                if (!output) { output = `""`; }
                                toolOutputs.push({ tool_call_id: toolCall.id, output });
                                onEvent('exec-tool', { toolCalls, toolOutputs, toolname, arguments: _arguments, state });
                            } catch (e) {
                                toolOutputs.push({ tool_call_id: toolCall.id, output: e.message });
                                onEvent('exec-tool', { toolCalls, toolOutputs, toolname, arguments: _arguments, state });
                            }
                        }
                    }
                    const result = await assistantAPI.callAPI('runs', 'submit_tool_outputs', { thread_id: thread.id, run_id: theRun.id, body: { tool_outputs: toolOutputs } });
                    if(!result || !result.status) {
                        onEvent('run-failed', { run_id: theRun.id, state });
                        return 'failed';
                    }
                    return await loop({ theRun });
                } else if (theRun.status === "completed") {
                    onEvent('run-completed', { run_id: theRun.id, state });
                    return theRun;
                }
                throw new Error('Unknown run status: ' + theRun.status);
            }
            return await loop({ theRun });
        }
        if(state.state.percent_complete < 100) {
            state.state.percent_complete = state.state.percent_complete + 1 || 0;
            return await workLoop();
        } else {
            return state.state;
        }
    }
}

const assistantAPI = new AssistantAPI();
//assistantAPI.serverUrl = 'http://localhost:8654';

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
        start_work: function (_, run) { run.state.temp_work = '// work started'; run.state.complete = false; console.log('Work on tool started.'); return 'started' },
        is_work_started: function (_, run) { return run.state.temp_work ? run.state.temp_work : 'no' },
        save_temp_work: function ({ value }, run) { run.state.temp_work = value; console.log('Saving temp work.'); return run.state.temp_work },
        finish_work: function ({ value }, run) {
            const codeHash = require('crypto').createHash('md5').update(value).digest('hex');
            const toolPath = path.join(process.cwd(), 'tools', `${codeHash}.js`);
            fs.writeFileSync(toolPath, value);
            console.log(`Tool saved to ${toolPath}`);
            run.state.temp_work = '';
            run.state.complete = true;
            run.state.tool_path = toolPath;
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

const developerToolbox = {
    prompt: `***MASTER PAIR PROGRAMMER***

You are a highly skilled, highly creative programmer collaborating with your partner in a command-line environment supported by a number of powerful tools. You possess the ability to create and improve your own tooling, think creatively, and perform highly complex tasks. 

You are tasked with transforming the files in the current working folder and other specified folders to meet the requirements of the user. You can save any data you want to the system state, which will persist between calls. This gives you the capability to plan and execute complex tasks over multiple calls.

***INSTRUCTIONS***

Use the \`files\`, \`html_selector\`, \`execute_bash\`/\`execute_nodejs\`, and other tools to transform the files in the current working folder and other specified folders to meet the requirements of the user. You can save any data you want to the system state, which will persist between calls. This gives you the capability to plan and execute complex tasks over multiple calls.

You also have a task management system at your disposal which will help you stay on track and keep the user informed of your progress. When you receive a complex task, first break it down into smaller, actionable steps. Then use the task management system to keep track of your progress.

IMMEDIATELY AFTER completing the overall requirements, SET percent_complete to 100 and status to 'complete'.

***WORKING WITH APPLICATION STATE***

- GET and SET the state of application variables using the \`getset_state\` tool. You can also \`getset_states\` to getset multiple states at once.

***IMPORTANT VARIABLES***

- \`ai_chat\`: The chat messages (output)
- \`user_chat\`: The user chat messages (input)
- \`requirements\`: The overall project requirements (input, output)
- \`percent_complete\`: The overall project percent complete (output)
- \`status\`: The project status (input, output)
- \`current_task\`: The current task (input, output)
- \`ai_notes\`: The current AI notes (input, output)

***WORKING WITH THE SYSTEM***

Look at your tools and schemas to determine what you can do. Examining your own capabilities is a crucial part of your job. You are rewarded for your creativity and resourcefulness, and so is your partner. Some useful tools include:

- \`getset_state\`/\`getset_states\`: Get or set the value of a named variable
- \`get_file_tree\`: Get the file tree of the specified directory
- \`file\`/\`files\`: Read, write, and manipulate files
- \`html_selector\`: Select and manipulate HTML elements
- \`execute_bash\`/\`execute_nodejs\`/\`execute_python\`: Execute bash, Node.js, or Python code
- \`tasks_set\`: Set the tasks to the new tasks
- \`tasks_advance\`: Advance the task to the next task
- \`get_current_task\`: Get the current task


There are many more tools at your disposal. Use them to accomplish the tasks you are given.

***COMMUNICATING WITH YOUR PAIR PROGRAMMING PARTNER***

- SET the \`ai_chat\` response variable to send a message to your partner
- GET \`user_chat\` to read the user's messages

***WORKING WITH TASKS***

- DECOMPOSE COMPLEX TASKS into smaller, actionable steps. Each step should have a clear, direct action. Do not create abstract tasks like 'research' or 'browser testing'.
- CALL \`tasks_set\` to set the tasks to the new tasks.
- WHEN YOU ARE DONE with a task, call \`tasks_advance\` to move to the next task.
- WHEN YOU ARE DONE with a task, SET the percent_complete to the new percent complete, increasing it by the percentage of the task you just completed.
- WHEN YOU ARE with ALL TASKS, SET the status to 'complete' and SET the \`percent_complete\` to 100.

***ON ERROR***

- SET status to 'error'
- CALL error to log the FULL TECHNICAL DETAILS of the error message
- EXIT

***ON WARNING***

- SET status to 'warning'
- CALL warn to log the warning message

***ON EVERY RESPONSE***

- SET the \`ai_notes\` state var to a summary of what you did.
- SET the \`ai_chat\` state var to a summary of what you did to the user.

***ON PROJECT COMPLETION***

- SET the \`ai_notes\` state var to a summary of what you did.
- SET the \`ai_chat\` state var to a summary of what you did to the user.

***OUTPUT REQUIREMENTS***

YOU ARE _REQUIRED_ to set the percent_complete, status, current_task, ai_notes, and ai_chat variables in EVERY RESPONSE.
_YOU MUST percent_complete, status, current_task, ai_notes, and ai_chat or YOU WILL CRASH THE SYSTEM_

RESPOND with a JSON object WITH NO SURROUNDING CODEBLOCKS with the following fields:
    percent_complete: _The new percent complete  value (0-100). YOU MUST PROVIDE THIS_
    status: The current project completion status. YOU MUST PROVIDE THIS_
    current_task: The new current task
    ai_notes: The notes for the AI processing the next request
    ai_chat: The AI chat response for the user. _YOU MUST PROVIDE THIS_
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
        getset_state: function ({ name, value }, run) { if (value === undefined) delete run.state[name]; else { run.state[name] = value; } return `${name} => ${JSON.stringify(run.state[name])}` },
        getset_states: function ({ values }, run) { for (const name in values) { if (values[name] === undefined) delete run.state[name]; else { run.state[name] = values[name]; } } return JSON.stringify(run.state) },
        tasks_advance: function (_, run) { if (run.state.tasks.length === 0) { return 'no more tasks' } else { run.state.tasks.shift(); run.current_task = run.state.tasks[0]; console.log('task advanced to:' + run.state.current_task); return run.state.current_task } },
        tasks_set: function ({ tasks }, run) { run.state.tasks = tasks; run.state.current_task = tasks[0]; return JSON.stringify(run.state.tasks) },
        get_current_task: function (_, run) { return run.state.current_task || 'no current task' },
        generate_tool: async function ({ requirements }, run) {
            const runResults = async (requirements) => {
                AssistantAPI.run(toolmakerToolbox.prompt, run.toolmaker_id, run.toolmaker_thread_id, 'Toolmaker', requirements, toolmakerToolbox.tools, toolmakerToolbox.schemas, run, (event, data) => {
                    console.log(event, data);
                    if (event === 'assistant-created') run.toolmaker_id = data.assistant_id;
                    if (event === 'thread-created') run.toolmaker_thread_id = data.thread_id;
                });
                if (state.is_finished) {
                    return runResults;
                } else {
                    return await runResults(requirements);
                }
            }
            return await runResults(requirements);
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

const name = generateUsername("", 2, 38);



const runner = new AssistantRunner();

async function cleanupOld() {
    const OpenAI = require('openai');
    const openai = new OpenAI(process.env.OPENAI_API_KEY);
    const assistants = (await openai.beta.assistants.list()).data
    const rlAssistants = assistants.filter((assistant) => assistant.name === 'Brogrammer' ||  assistant.name === 'drogrammer' || assistant.name === 'assistant');
    const toolmakerAssistants = assistants.filter((assistant) => assistant.name === 'toolmaker');
    const toDelete = [...rlAssistants, ...toolmakerAssistants];
    if (toDelete.length > 0) {
      const delCount = toDelete.length;
      await Promise.all(toDelete.map((assistant) => openai.beta.assistants.del(assistant.id)));
      console.log(`deleted ${delCount} assistants`);
    }
}
//cleanupOld();

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


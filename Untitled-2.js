
function getDOMNodes(domFile, selector, unsafe = false) {
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        let ret = document.querySelector('#content-container').querySelector(selector);
        if (!ret && unsafe) {
            return document.querySelectorAll(selector);
        } else if (!ret && !unsafe) {
            throw new Error('Selector not found');
        }
    } else {
        const fs = require('fs');
        const pathModule = require('path');
        const { JSDOM } = require('jsdom');
        const cwd = process.cwd();
        const path = pathModule.join(cwd, domFile)
        const dom = new JSDOM(fs.readFileSync(path, 'utf8'));
        const domNode = dom.window.document.querySelector('#content-container').querySelector(selector);
        if (!domNode && unsafe) {
            return dom.window.document.querySelectorAll(selector);
        } else if (!domNode && !unsafe) {
            throw new Error('Selector not found');
        }
    }
}

function summarizeHTMLElement(element, level = 0) {
    let summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0 };

    if (level === 0) {
        summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
        summary.imageCount += element.querySelectorAll('img').length;
        summary.linkCount += element.querySelectorAll('a').length;
        summary.divCount += element.querySelectorAll('div').length;
        summary.interactiveCount += element.querySelectorAll('input, button, select, textarea, video, audio', 'iframe').length;
    } else {
        // Summarize child elements
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            let childSummary = summarizeHTMLElement(children[i], level - 1);
            summary.textSummary += ' ' + childSummary.textSummary;
            summary.imageCount += ' ' + childSummary.imageCount;
            summary.linkCount += ' ' + childSummary.linkCount;
            summary.interactiveCount += ' ' + childSummary.interactiveCount;
        }
        // Simplify the summary for this level
        summary.textSummary = `${summary.textSummary.substring(0, 50)}... (${children.length} elements)`;
    }
    return summary;
}

const debug = false;
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
                "Authorization": `Bearer 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`,
                "OpenAI-Beta": "assistants=v1"
            },
            body: JSON.stringify(body.body)
        })
        const ret = await fetch(url, {
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer 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`,
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
        const assistantAPI = new AssistantAPI();
        if (assistant_id) assistant = await assistantAPI.callAPI('assistants', 'retrieve', { assistant_id: assistant_id });
        else assistant = await assistantAPI.callAPI('assistants', 'create', {
            body: {
                instructions: persona,
                model,
                name,
                tools: schemas
            }
        });
        if (!assistant.id) throw new Error('Assistant not created: ' + JSON.stringify(assistant));
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
        state.state = {
            ...state.state, ...{
                requirements: request,
                percent_complete: 0,
                tasks: [],
                current_task: '',
                ai_chat: '',
                user_chat: '',
            }
        }
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
                    if (state.percent_complete < 100) {
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
                        if (toolname === 'getset_state') {
                            const args = JSON.parse(toolCall.function.arguments);
                            for (const arg in args) {
                                if (state[arg]) {
                                    args[arg] = state[arg];
                                    const value = args[arg];
                                    if (value === undefined) {
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
                        else if (toolname === 'tasks_set') {
                            const args = JSON.parse(toolCall.function.arguments);
                            state.tasks = args.tasks;
                            state.percent_per_task = 100 / state.tasks.length;
                            toolOutputs.push({ tool_call_id: toolCall.id, output: 'tasks set' });
                            onEvent('set-tasks', { tasks: state.tasks, state });
                        }
                        else if (toolname === 'tasks_advance') {
                            if (!state.tasks) {
                                toolOutputs.push({ tool_call_id: toolCall.id, output: 'no tasks' });
                                onEvent('no-tasks', { state });
                            } else {
                                state.percent_complete = state.percent_complete + state.percent_per_task;
                                state.tasks.shift();
                                if (state.tasks.length === 0) {
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
                                // // remove newlines and escape quotes
                                // output = output.replace(/\n/g, '').replace(/"/g, '\\"');
                                // // remove escaped newlines
                                // output = output.replace(/\\n/g, '');
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
                    if (!result || !result.status) {
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
        if (state.state.percent_complete < 100) {
            state.state.percent_complete = state.state.percent_complete + 1 || 0;
            return await workLoop();
        } else {
            return state.state;
        }
    }
}
const AssistantAPI = require('./assistant');
const toolmakerToolbox = require('./toolmaker');
module.exports = {
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
        html_selector: function ({ path, operation, selector, value, n }) {
            const elements = getDOMNode(path, selector, true);
            let result = '';
            switch (operation) {
                case 'get':
                    const content = [];
                    elements.forEach(ele => content.push(ele.innerHTML));
                    result = content;
                    break;
                case 'append':
                    elements.forEach(ele => ele.innerHTML += value);
                    result = 'Content appended successfully.';
                    break;
                case 'prepend':
                    elements.forEach(ele => ele.innerHTML = value + ele.innerHTML);
                    result = 'Content prepended successfully.';
                    break;
                case 'replace':
                    elements.forEach(ele => ele.innerHTML = value);
                    result = 'Content replaced successfully.';
                    break;
                case 'remove':
                    elements.forEach(ele => ele.innerHTML = ele.innerHTML.replace(value, ''));
                    result = 'Content removed successfully.';
                    break;
                case 'get_attributes':
                    const attributes = [];
                    elements.forEach(ele => attributes.push(ele.getAttribute(value)));
                    result = attributes;
                    break;
                case 'set_attributes':
                    elements.forEach(ele => ele.setAttribute(value, n));
                    result = 'Attribute set successfully.';
                    break;
                case 'summarize':
                    const summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0 };
                    elements.forEach(element => {
                        if (n === 0) {
                            // Base case: detailed information
                            summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
                            summary.imageCount += element.querySelectorAll('img').length;
                            summary.linkCount += element.querySelectorAll('a').length;
                            summary.interactiveCount += element.querySelectorAll('input, button, select, textarea').length;
                        } else {
                            // Summarize child elements
                            const children = element.children;
                            for (let i = 0; i < children.length; i++) {
                                let childSummary = summarizeHTMLElement(children[i], n - 1);
                                summary.textSummary += childSummary.textSummary; // Concatenate text summaries
                                summary.imageCount += childSummary.imageCount;
                                summary.linkCount += childSummary.linkCount;
                                summary.interactiveCount += childSummary.interactiveCount;
                            }
                            // Simplify the summary for this level
                            summary.textSummary += `${summary.textSummary.substring(0, 50)}... (${children.length} elements)\n`;
                        }
                    });
                    result = summary;
                    break;
                default:
                    result = 'Invalid operation.';
            }
            fs.writeFileSync(path, dom.serialize());
            return dom.serialize();
        },
        say_aloud: async ({ text, voice }) => {
            var config = require('../config');
            const apiKey = config.PLAYHT_AUTHORIZATION;
            const userId = config.PLAYHT_USER_ID;
            const maleVoice = config.PLAYHT_MALE_VOICE;
            const femaleVoice = config.PLAYHT_FEMALE_VOICE;
            if(!voice) voice = config.playHT.defaultVoice;
            if(!apiKey || !userId || !maleVoice || !femaleVoice) {
                const missing = [];
                if(!apiKey) missing.push('playHT.apiKey');
                if(!userId) missing.push('playHT.userId');
                if(!maleVoice) missing.push('playHT.maleVoice');
                if(!femaleVoice) missing.push('playHT.femaleVoice');
                return `Missing configuration: ${missing.join(', ')} in configuration file. Please ask the user to provide the missing configuration using the ask_for_data tool.`;
            }
            // Initialize PlayHT API
            PlayHT.init({
                apiKey: apiKey,
                userId: userId,
            });

            async function speakSentence(sentence, voice) {
                if(!sentence) return;
                const stream = await PlayHT.stream(sentence, {
                    voiceEngine: "PlayHT2.0-turbo",
                    voiceId: voice === 'male' ? maleVoice : femaleVoice,
                });
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));

                return new Promise((resolve, reject) => {
                    stream.on("end", () => {
                        const buf = Buffer.concat(chunks);
                        // save the audio to a file
                        const filename = `${getNonce()}.mp3`;
                        fs.writeFileSync(filename, buf);
                        player.play(filename, function (err) {
                            fs.unlinkSync(filename);
                            resolve(`done`);
                        });
                    });
                })
            }
            

            // split the text into sentences
            const sentences = text.split(/[.!?]/g).filter((sentence) => sentence.length > 0);
            const consumeSentence = async () => {
                return new Promise((resolve, reject) => {
                    const loop = async ()=> {
                        const sentence = sentences.shift();
                        if(!sentence) return resolve('done');
                        await speakSentence(sentence, voice);
                        return await loop();
                    };
                    return loop();
                });
            };
            await consumeSentence();
            return '(aloud) ' + text;
        },
        
    },
    schemas: [
        { type: 'function', function: { name: 'getset_state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable. Call with null to delete it.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
        { type: 'function', function: { name: 'getset_states', description: 'Get or set the values of multiple named variables. Call with no values to get the current values. Call with values to set the variables. Call with null to delete them.', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to get or set', properties: { name: { type: 'string', description: 'The variable\'s name' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } }, required: ['values'] } } },
        { type: 'function', function: { name: 'tasks_advance', description: 'Advance the task to the next task' } },
        { type: 'function', function: { name: 'tasks_set', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
        { type: 'function', function: { name: 'get_current_task', description: 'Get the current task' } },
        { type: 'function', function: { name: 'generate_tool', description: 'Generate an assistant tool that will fulfill the given requirements. ONLY Invoke this when the user asks to generate a tool', parameters: { type: 'object', properties: { requirements: { type: 'string', description: 'A description of the requirements that the tool must fulfill. Be specific with every parameter name and explicit with what you want returned.' } }, required: ['message'] } } },
        {
            type: 'function',
            function: {
                name: 'html_selector',
                description: 'Performs the selector operation on the HTML page at the given path. The operation can be get, append, prepend, replace, remove, get_attributes, or set_attributes, or summarize. IF running in the browser, the path is ignored and the current page is used.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'The file path to the HTML file.' },
                        operation: { type: 'string', description: 'The operation to perform on the selector. Can be get, append, prepend, replace, remove, get_attributes, set_attributes, or summarize' },
                        selector: { type: 'string', description: 'The CSS selector to match elements.' },
                        value: { type: 'string', description: 'The HTML content to append.' },
                        n: { type: 'string', description: 'For summarize, specifies the depth of child elements to summarize. 0 for detailed information.' },
                    },
                    required: ['selector', 'operation']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'multiAssistant',
                description: 'Spawn multiple assistants (long-running AI processes) in parallel. This is useful for building an html page where each agent handles a different part of the page.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompts: {
                            type: 'array',
                            description: 'The prompts to spawn',
                            items: {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string',
                                        description: 'The message to send to the assistant'
                                    }
                                },
                                required: ['message']
                            }
                        }
                    }, required: ['agents']
                }
            }
        },
        {
            "type": 'function',
            "function": {
                "name": 'say_aloud',
                "description": 'say the text using text-to-speech',
                "parameters": {
                    "type": 'object',
                    "properties": {
                        "text": {
                            "type": 'string',
                            "description": 'the text to say',
                        },
                        "voice": {
                            "type": 'string',
                            "description": 'the voice to use (can be \'male\' or \'female\'). If not specified, the default female voice will be used',
                        }
                    },
                    "required": ['text']
                }
            }
        },
    ]
};

class Toolbox {
    constructor(persona, tools, schemas, state) {
        this.persona = persona;
        this.tools = tools;
        this.schemas = schemas;
        this.state = state;
    }
    addTool(tool, schema, state) {
        const toolName = tool.name;
        this.tools[toolName] = tool;
        this.schemas.push(schema);
        this.state = { ...this.state, ...state };
        this[toolName] = tool.bind(this);
    }
    getTool(tool) {
        const schema = this.schemas.find((schema) => schema.function.name === tool);
        return {
            [tool]: this.tools[tool],
            schema
        }
    }
    setState(vv, value) {
        this.state[vv] = value;
    }
    getState(vv) {
        return this.state[vv];
    }
    static loadToolbox(appDir) {
        const toolbox = new Toolbox(developerToolbox.prompt, developerToolbox.tools, developerToolbox.schemas, developerToolbox.state);
        const toolsFolder = path.join(__dirname, 'tools')
        const toolNames = [];
        if (fs.existsSync(toolsFolder)) {
            const files = fs.readdirSync(toolsFolder);
            files.forEach((file) => {
                const t = require(path.join(toolsFolder, file))
                Object.keys(t.tools).forEach((key) => {
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema) => schema.function.name === key);
                    toolbox.addTool(toolFunc, schema, t.state);
                    toolNames.push(key);
                })
            });
            console.log('tools:', toolNames);
        } else {
            fs.mkdirSync(path.join(appDir, 'tools'));
        }
        return toolbox;
    }
}

class AssistantRun {
    constructor(assistant_id, thread_id, request, model = 'gpt-4-turbo-preview') {
        this.toolbox = Toolbox.loadToolbox(require('path').join(__dirname, '.'));
        this.assistant_id = assistant_id;
        this.thread_id = thread_id;
        this.state = {
            percent_complete: 0,
            status: 'idle',
            iteration: 0,
            requirements: request,
        }
        this.model = model;
    }
    async attachFile(file) {
        const fileData = fs.readFileSync(file);
        const result = await AssistantAPI.callAPI('assistants', 'upload_file', { assistant_id: this.assistant_id, body: { file: fileData } });
        return result;
    }
    async detachFile(fileId) {
        const result = await AssistantAPI.callAPI('assistants', 'delete_file', { assistant_id: this.assistant_id, fileId });
        return result;
    }
    async listFiles() {
        const result = await AssistantAPI.callAPI('assistants', 'list_files', { assistant_id: this.assistant_id });
        return result;
    }
    async run(name = generateUsername("", 2, 38)) {
        let result = await AssistantAPI.run(this.toolbox.persona, this.assistant_id, this.thread_id, name, JSON.stringify(this.state), this.toolbox.schemas, this.toolbox.tools, this, 'gpt-4-turbo-preview', (event, data) => {
            process.stdout.write('🛸');
            if (event === 'assistant-created') this.assistant_id = data.assistant_id;
            if (event === 'thread-created') this.thread_id = data.thread_id;
            if (event === 'message-received') console.log(data.message);
            if (event === 'run-queued') process.stdout.write('🛸');
            if (event === 'exec-tool') {
                data.toolOutputs.forEach((output, i) => {
                    const toolOutput = data.toolOutputs.find((_output) => _output.tool_call_id === output.tool_call_id);
                    const func = data.toolCalls.find((call) => call.id === toolOutput.tool_call_id).function.name;
                    const args = data.toolCalls.find((call) => call.id === toolOutput.tool_call_id).function.arguments
                    console.log(`🛠️ Executed tool: ${func} ${args}`);
                    console.log({
                        function: func,
                        arguments: data.toolCalls.find((call) => call.id === toolOutput.tool_call_id).function.arguments,
                        output: toolOutput.output
                    });
                })
            }
            if (event === 'run-completed') {
                console.log(`🏁`);
            }

        })
        result = JSON.parse(result);
        console.log('result', result);
        this.state = { ...this.state, ...result.state };

        return this.state;
    }
}

class AssistantRunner {
    runs = [];
    static current_run = null;
    constructor(model = 'gpt-4-turbo-preview') {
        this.toolbox = Toolbox.loadToolbox(require('path').join(__dirname, '.'));
        this.model = model;
        this.run = this.run.bind(this);
    }
    async run(request) {
        const config = configManager.getConfig();
        AssistantRunner.current_run = new AssistantRun(config.assistant_id, config.thread_id, request);
        config.assistant_id = AssistantRunner.current_run.assistant_id;
        config.thread_id = AssistantRunner.current_run.thread_id;
        config.run_id = AssistantRunner.current_run.run_id;
        configManager.saveConfig(config);
        this.runs.push(AssistantRunner.current_run);
        const result = await AssistantRunner.current_run.run();
        return result;
    }
}

const runner = new AssistantRunner();
runner.run('Make a really nice-looking login panel');
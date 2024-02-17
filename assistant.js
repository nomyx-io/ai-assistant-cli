
export class AssistantAPI {
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

    listRoutes() {
        const routes = [];
        const def = this.apisDefinition({});
        for (const api in def) {
            for (const method in def[api]) {
                routes.push({ method, api });
            }
        }
        return routes;
    }
}

export class Toolbox {
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

export class AssistantRun {
    constructor(assistant_id, thread_id, toolbox, request, model = 'gpt-4-turbo-preview') {
        this.assistant_id = assistant_id;
        this.thread_id = thread_id;
        this.toolbox = toolbox;
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
    async run() {
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
                    console.table({
                        function: func,
                        arguments: data.toolCalls.find((call) => call.id === toolOutput.tool_call_id).function.arguments,
                        output: toolOutput.output.slice(0, 200) + (toolOutput.output.length > 200 ? '...' : '')
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

export class AssistantRunner {
    runs = [];
    static current_run = null;
    constructor(model = 'gpt-4-turbo-preview') {
        this.toolbox = Toolbox.loadToolbox(require('path').join(__dirname, '.'));
        this.model = model;
        this.run = this.run.bind(this);
    }
    async run(request) {
        const config = loadConfig();
        AssistantRunner.current_run = new AssistantRun(config.assistant_id, config.thread_id, this.toolbox, request);
        config.assistant_id = AssistantRunner.current_run.assistant_id;
        config.thread_id = AssistantRunner.current_run.thread_id;
        config.run_id = AssistantRunner.current_run.run_id;
        saveConfig(config);
        this.runs.push(AssistantRunner.current_run);
        const result = await AssistantRunner.current_run.run();
        return result;
    }
}

module.exports = {
    AssistantRunner,
    AssistantRun,
    Toolbox
}
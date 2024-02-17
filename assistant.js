require('dotenv').config();
const developerToolbox = require('./developer');
const AssistantAPI = require('./api');
const path = require('path');
const fs = require('fs');
const {configManager} = require('./config-manager');
const { generateUsername } = require("unique-username-generator");
const debug = false;


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
    async run(name = generateUsername("",2,38)) {
        let result = await AssistantAPI.run(this.toolbox.persona, this.assistant_id, this.thread_id, name, JSON.stringify(this.state), this.toolbox.schemas, this.toolbox.tools, this, 'gpt-4-turbo-preview', (event, data) => {
            process.stdout.write('🛸');
            if (event === 'assistant-created') {
                this.assistant_id = data.assistant_id;
                const config = configManager.getConfig();
                config.assistant_id = this.assistant_id;
                configManager.saveConfig(config);
            }
            if (event === 'thread-created') {
                this.thread_id = data.thread_id;
                const config = configManager.getConfig();
                config.thread_id = this.thread_id;
                configManager.saveConfig(config);
            }
            if (event === 'message-received') {
                console.log(data.message);
            }
            if (event === 'run-queued') process.stdout .write('🛸');
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
       // result = JSON.parse(result);
        console.log('result', result);
        if(result)
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

module.exports = {
    AssistantAPI,
    AssistantRunner,
    AssistantRun,
    Toolbox
}
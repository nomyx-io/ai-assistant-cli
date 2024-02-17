import OpenAI from 'openai';
import config, { saveConfig } from './ConfigurationManager';

export const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY || process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

interface IAssistantInputObject {
    name: string;
    model: string;
}

interface IMessageContent {
    role: string;
    content: string;
}

interface IRunData {
}

  
// Improved withRetriesAndTimeouts to use loop instead of recursion
export async function withRetriesAndTimeouts<T>(func: () => Promise<T>, retries = 3, timeout = 1000): Promise<T> {
    let tryCount = 0;
    while (tryCount <= retries) {
        try {
            return await func();
        } catch (e) {
            if (tryCount === retries) throw e;
            await new Promise(resolve => setTimeout(resolve, timeout));
            tryCount++;
        }
    }
    throw new Error('Exceeded retry attempts');
}

// Using specific types instead of 'any'
export async function getOrCreateAssistant(assistantId: string, inputObject: IAssistantInputObject) {
    return withRetriesAndTimeouts(async () => {
        try {
            if (!assistantId) throw new Error('No assistantId provided');
            return await openai.beta.assistants.retrieve(assistantId);
        } catch (error) {
            if (error.message === 'No assistantId provided' || error.response?.status === 404) {
                return await openai.beta.assistants.create(inputObject);
            }
            throw error;
        }
    });
}

export async function getOrCreateThread(config: any) {
    return withRetriesAndTimeouts(async () => {
        if (!config.threadId) {
            const thread = await openai.beta.threads.create();
            config.threadId = thread.id;
            saveConfig(config);
            return thread;
        } else {
            try {
                return await openai.beta.threads.retrieve(config.threadId);
            } catch (e) {
                if (e.response?.status === 404) {
                    delete config.threadId;
                    saveConfig(config);
                    return getOrCreateThread(config);
                }
                throw e;
            }
        }
    });
}


// ****** assistant API calls ****** //

export async function createAssistant(inputObject: IAssistantInputObject) {
    return withRetriesAndTimeouts(() => openai.beta.assistants.create(inputObject));
}

export async function retrieveAssistant(assistantId: string) {
    return withRetriesAndTimeouts(() => openai.beta.assistants.retrieve(assistantId));
}

export async function updateAssistant(assistantId: string, data: IAssistantInputObject) {
    return withRetriesAndTimeouts(() => openai.beta.assistants.update(assistantId, data));
}

export async function deleteAssistant(assistantId: string) {
    return withRetriesAndTimeouts(() => openai.beta.assistants.del(assistantId));
}


// ****** thread API calls ****** //
export async function createThread() {
    return withRetriesAndTimeouts(() => openai.beta.threads.create());
}

export async function retrieveThread(threadId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.retrieve(threadId));
}

export async function deleteThread(threadId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.del(threadId));
}


// ****** message API calls ****** //

export async function createMessage(threadId: string, content: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.messages.create(threadId, { role: "user", content }));
}

export async function retrieveMessage(threadId: string, messageId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.messages.retrieve(threadId, messageId));
}

export async function updateMessage(threadId: string, messageId: string, message: any) {
    return withRetriesAndTimeouts(() => openai.beta.threads.messages.update(threadId, messageId, message));
}


// ****** assistant API calls ****** //

export async function loadThread(threadId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.retrieve(threadId));
}

export async function createRun(assistantId: string, threadId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.runs.create(threadId, { assistant_id: assistantId }));
}

export async function retrieveRun(threadId: string, runId: string) {
    return withRetriesAndTimeouts(() => openai.beta.threads.runs.retrieve(threadId, runId));
}

export async function updateRun(threadId: string, runId: string, data: any) {
    return withRetriesAndTimeouts(() => openai.beta.threads.runs.update(threadId, runId, data));
}



/*

CommandProcessor - responsible for processing commands and sending them to the CommandRunner
CommandRunner - responsible for managing CommandRun objects
Command - defines the command to be run. Contains all the code to run the command
CommandRun - represents a single run of a command. Contains the code to execute the command and manage the run and the run's state

These four classes work together to process commands while keeping the execution of the commands separate from the processing of the 
commands. This allows the CommandProcessor to be a simple, stateless object that can be easily tested and reused, while the 
CommandRunner and CommandRun objects can manage the state and execution of the commands.

// calls runner with command and manages completed runs

class CommandProcessor {
    runner: CommandRunner;
    history: CommandRun[];
    constructor() {
        this.runner = new CommandRunner();
    }
    
    processCommand(command: string) {
        const commandRun = new CommandRun(command);
        this.runner.runCommand(commandRun);
    }
}

class CommandRunner {
    activeRuns: any[] = []; // can have multiple active runs
    defaultToolbox: any; // default toolbox for the assistant

    constructor(defaultToolbox: any) {
        this.defaultToolbox = defaultToolbox;
        this.activeRuns = [];
    }
    
    runCommand(commandRun: CommandRun) {
        this.runs.push(commandRun);
        commandRun.run();
    }
}

class Command {
    persona: string;
    tools: any;
    schemas: any;
    constructor(public persona: string, public tools: any, public schemas: any) {
        this.command = command;
    }
    
    async: run(command: string): Promise<string> {
        // execute the command
    }
}


*/
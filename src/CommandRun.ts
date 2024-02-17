import Command from './Command';

class CommandRun {
    assistant: any; // openai assistant object
    thread: any; // each run has a thread and runs
    runs: any[] = [];
    running: any;
    command: Command;
    input: string;
    state: any;

    constructor(input: string, command: Command) {
        this.input = input;
        this.command = command;
    }
    
    run() {
        //
    }
}

export default CommandRun;

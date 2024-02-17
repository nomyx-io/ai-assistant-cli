import CommandRunner from './CommandRunner';
import CommandRun from './CommandRun';

class CommandProcessor {
    runner: CommandRunner;
    history: CommandRun[];
    constructor(public defaultToolbox: any) {
        this.runner = new CommandRunner(defaultToolbox);
    }
    
    processCommand(command: string) {
        const commandRun = new CommandRun(command);
        this.runner.runCommand(commandRun);
    }
}
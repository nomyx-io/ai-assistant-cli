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

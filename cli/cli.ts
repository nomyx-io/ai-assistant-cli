const inquirer = require('inquirer');
class Cli {
  private question: any;
  private _runningMode: boolean = false;
  constructor(
    public assistant: any,
    private onCommand: (command: string) => boolean,
    private onInterrupt: (assistant: any) => Promise<boolean>,
    private getPrompt: () => string,
  ) {
    this.onCommand = onCommand;
    this.onInterrupt = onInterrupt;
    this.getPrompt = getPrompt;
    process.on('SIGINT', () => {
      if (this.runningMode) {
        this.onInterrupt(this.assistant).then(() => {
          this.promptForCommand();
        });
      } else {
        process.exit();
      }
    });
    this.question = {
      type: 'input',
      name: 'command',
      message: this.getPrompt(),
    }
    this.promptForCommand = this.promptForCommand.bind(this);
  }
  get runningMode() {
    return this._runningMode;
  }
  set runningMode(value) {
    this._runningMode = value;
  }
  async promptForCommand() {
    try {
      const answers = await inquirer.prompt([this.question]);
      this.runningMode = false;
      const command = answers.command.trim();
      if (!command) { 
        await this.promptForCommand();
        return; 
      }
      this.runningMode = true;
      let result = this.onCommand(command);
      if (result) { return; }
      await this.promptForCommand();
    } catch (error) {
      console.error('An error occurred: ', error);
    }
  }
  start() {
    this.promptForCommand();
  }
}
const cliPrompt = (assistant: any, onCommand: (command: string) => boolean, onInterrupt: (assistant: any) => Promise<boolean>, getPrompt: () => string) => {
  return new Cli(assistant, onCommand, onInterrupt, getPrompt);
}
module.exports = cliPrompt;
export default cliPrompt;
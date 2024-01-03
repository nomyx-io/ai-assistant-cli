const inquirer = require('inquirer');
const { Spinner } = require('./spinner');
/**
 * A simple command line interface for the Talkdown assistant.
 */
class Cli {
  static _instance: Cli;

  private spinnerText: string = '';
  private spinner: any;
  private questions: any[] = []
  private _runningMode: boolean = false;

  constructor(
    public assistant: any,
    private onCommand: (command: string) => Promise<boolean>,
    private onInterrupt: (assistant: any) => Promise<boolean>,
    private getPrompt: () => string,
  ) {
    if (Cli._instance) {
      return Cli._instance;
    }
    Cli._instance = this;
    this.onCommand = onCommand;
    this.onInterrupt = onInterrupt;
    this.getPrompt = getPrompt;
    // Handle SIGINT (Ctrl+C) gracefully.
    process.on('SIGINT', () => {
      if (this.runningMode) {
        this.onInterrupt(this.assistant)
          .then(() => this.promptForCommand());
      } else {
        process.exit();
      }
    });
    // Set up the question.
    this.questions = [{
      type: 'input',
      name: 'command',
      message: this.getPrompt(),
    }]
    this.promptForCommand = this.promptForCommand.bind(this);
    this.spinnerText = '';
    this.spinner = new Spinner({
      title: "loading",
      interval: 120,
      frames: [
        "䷀", "䷁", "䷂", "䷃", "䷄", "䷅", "䷆", "䷇", "䷈", "䷉", "䷊", "䷋", "䷌", "䷍", "䷎", "䷏", "䷐", "䷑", "䷒", "䷓", "䷔", "䷕", "䷖", "䷗", "䷘", "䷙", "䷚", "䷛", "䷜", "䷝", "䷞", "䷟", "䷠", "䷡", "䷢", "䷣", "䷤", "䷥", "䷦", "䷧", "䷨", "䷩", "䷪", "䷫", "䷬", "䷭", "䷮", "䷯", "䷰", "䷱", "䷲", "䷳", "䷴", "䷵", "䷶", "䷷", "䷸", "䷹", "䷺", "䷻", "䷼", "䷽", "䷾", "䷿"
      ]
    });
  }

  static createInstance(
    assistant: any,
    onCommand: (command: string) => Promise<boolean>,
    onInterrupt: (assistant: any) => Promise<boolean>,
    getPrompt: () => string,
  ) {
    return new Cli(assistant, onCommand, onInterrupt, getPrompt);
  }

  static get instance(): any {
    return Cli.instance;
  }

  updateSpinner(msg: string) {
    const spl: any = msg.split(' ');
    // if the last element is a number, then it's a progress update
    if (spl.length > 1 && !isNaN(spl[spl.length - 1])) {
      msg = spl.slice(0, spl.length - 1).join(' ');
      this.spinner.setTitle(spl.join(' '));
    }
    if (this.spinnerText !== msg) {
      this.spinnerText = msg;
      this.spinner.success(msg);
      this.spinner.start();
    }
  }

  /**
   * Whether the CLI is currently running.
   */
  get runningMode() {
    return this._runningMode;
  }
  /**
   * Sets the running mode of the CLI.
   */
  set runningMode(value) {
    this._runningMode = value;
  }
  /**
   * Prompts the user for a command.
   * @returns 
   */
  async promptForCommand() {
    try {
      this.questions = [{
        type: 'input',
        name: 'command',
        message: this.getPrompt(),
      }]
      const answers = await inquirer.prompt(this.questions);
      this.runningMode = false;
      const command = answers.command.trim();
      if (!command) {
        await this.promptForCommand();
        return;
      }
      this.spinner.start();
      this.runningMode = true;
      let result = await this.onCommand(command);
      this.spinner.stop();
      if (result) { return; }
      await this.promptForCommand();
    } catch (error) {
      console.error('An error occurred: ', error);
    }
  }

  /**
   * Prompts the user for a command.
   * @returns 
   */
  async askQuestions(questions: any[]) {
    try {
      const spinnerState = this.spinner.isSpinning;
      this.spinner.stop();
      const answers = await inquirer.prompt(questions);
      if (spinnerState) {
        this.spinner.start();
      }
      return answers;
    } catch (error) {
      console.error('An error occurred: ', error);
    }
  }

  /**
   * Starts the CLI.
   */
  async start() {
    await this.promptForCommand();
  }
}
/**
 * Creates a new CLI.
 * @param assistant 
 * @param onCommand 
 * @param onInterrupt 
 * @param getPrompt 
 * @returns 
 */
const cliPrompt = (
  assistant: any,
  onCommand: (command: string) => Promise<boolean>,
  onInterrupt: (assistant: any) => Promise<boolean>,
  getPrompt: () => string) => {
  return new Cli(assistant, onCommand, onInterrupt, getPrompt);
}
module.exports = cliPrompt;
export default cliPrompt;
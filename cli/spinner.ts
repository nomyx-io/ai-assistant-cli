import process from 'process';
import readline from 'readline';


interface SpinnerConfig {
    title: string;
    interval: number;
    frames: string[];
}

export class Spinner {
    private title: string;
    private interval: number;
    private frames: string[];
    private currentIndex: number = 0;
    private timer: NodeJS.Timeout | null = null;
    private _isSpinning: boolean = false;

    get isSpinning(): boolean {
        return this._isSpinning;
    }

    constructor(config: SpinnerConfig) {
        this.title = config.title;
        this.interval = config.interval;
        this.frames = config.frames;
    }

    public setTitle(newTitle: string) {
        this.title = newTitle;
    }

    public start(): void {
        this.stop();
        this._isSpinning = true;
        this.timer = setInterval(() => {
            const frame = this.frames[this.currentIndex];
            this.renderFrame(frame);
            this.currentIndex = (this.currentIndex + 1) % this.frames.length;
        }, this.interval);
    }

    public stop(): void {
        if (this.timer) {
            this._isSpinning = false;
            clearInterval(this.timer);
            this.timer = null;
            readline.clearLine(process.stdout, 0); // Clear the line
            readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
            process.stdout.write('\n'); // Move the cursor to the next line
        }
    }

    private renderFrame(frame: string) {
        readline.clearLine(process.stdout, 0); // Clear the entire line
        readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
        process.stdout.write(`${frame} ${this.title}\r`); // Write the frame and title
    }

    public success(message?: string): void {
        this.persist('✔', message);
    }

    public error(message?: string): void {
        this.persist('✘', message);
    }

    private persist(icon: string, message?: string): void {
        this.stop();
        process.stdout.write(`${icon} ${message || ''}\r\n`); // Write the message to stdout with an icon and start a new line
    }
}


module.exports = { Spinner };
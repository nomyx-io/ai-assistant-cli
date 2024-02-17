
export default class CommandRunner {

    status: string
    timer: any
    defaultToolbox: any

    activeRun: any

    constructor(toolbox: any) {
        this.status = 'idle';
        this.timer = 0;

        this.defaultToolbox = toolbox;
    }
    destroy() {
        // TODO maybe clean up the assistant and thread
    }

    // request a cancellation of the run
    async cancel() {
        if (this.activeRun) {
            try {
                await this.activeRun.cancel();
            } catch (e) {
                console.error('Error cancelling run:', e);
            }
        } else {
            console.error('No run to cancel');
        }
    }
}

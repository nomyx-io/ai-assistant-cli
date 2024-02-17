
// cwd()
const cwd = process.cwd();
const pathModule = require('path');

module.exports = {
    state: {},
    tools: {
        busybox:  async (params) => {
            const {command, args} = params;
            const {spawn} = require('child_process');
            // look for args that are paths and replace them with the full path
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('.')) {
                    args[i] = pathModule.join(cwd, args[i]);
                }
            }
            const child = spawn(command, args);
            return new Promise((resolve, reject) => {
                let result = '';
                child.stdout.on('data', (data) => {
                    result += data;
                });
                child.stderr.on('data', (data) => {
                    result += data;
                });
                child.on('close', (code) => {
                    resolve(result);
                });
            });
        },
        busybox_help: async (params) => {
            const {command} = params;
            const {spawn} = require('child_process');
            const child = spawn(command, ['--help']);
            return new Promise((resolve, reject) => {
                let result = '';
                child.stdout.on('data', (data) => {
                    result += data;
                });
                child.stderr.on('data', (data) => {
                    result += data;
                });
                child.on('close', (code) => {
                    resolve(result);
                });
            });
        }
    },
    schemas: [
        {type: 'function', function: {name: 'busybox', description: 'Implements a busybox utility', parameters: {type: 'object', properties: {command: {type: 'string', description: 'The command to execute (awk,cat,cp,chmod,curl,echo,find,head,ls,mkdir,mv,rm,sed,sh,tail,tar,unzip,wget,zip)'}, args: {type: 'array', description: 'The arguments to the command', items: {type:'string'}}}, required: ['command']}}},
        {type: 'function', function: {name: 'busybox_help', description: 'Displays help for the busybox utility', parameters: {type: 'object', properties: {command: {type: 'string', description: 'The command to display help for'}}, required: ['command']}}}
    ]
};

// get command-line arguments
const args = process.argv.slice(2);

// look for command-line flags
export const flags = args.filter((arg) => arg.startsWith('--'));
export const commands = args.filter((arg) => !arg.startsWith('--'));

function containsFlag(flag: string) {
    return flags.indexOf(flag) !== -1;
}

function showHelp() {
    console.log('Usage: assistant [flags] [commands]');
    console.log('Flags:');
    console.log('  --help: Display this help message');
    console.log('  --version: Display the version of the program');
    console.log('  --verbose: Display verbose output');
    console.log('  --file [file]: Execute the commands in the given file');
    console.log('Commands:');
    console.log('  [command]: The command to execute');
    console.log('  quit: Quit the program');
    console.log('  clear: Clear the screen');
    console.log('  env [key] [value]: Set an environment variable');
    console.log('  status: Display the current status');
    console.log('  echo [message]: Echo the given message');
}

// look for the --help flag
if (containsFlag('--help') || containsFlag('-h') || containsFlag('/?') || containsFlag('/h')) {
    showHelp();
    process.exit(0);
}

function getApplicationArguments() {
    const applicationArguments = {};
    // load all flags and commands into the applicationArguments object
    for (let i = 0; i < flags.length; i++) {
        if (flags[i].startsWith('--')) {
            applicationArguments[flags[i].substring(2)] = true;
        } else if (flags[i].startsWith('-')) {
            applicationArguments[flags[i].substring(1)] = true;
        } else if (flags[i].startsWith('/')) {
            applicationArguments[flags[i].substring(1)] = true;
        }
    }
    return applicationArguments;
}

export const applicationArguments = getApplicationArguments();
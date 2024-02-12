// include all required libraries and dependencies in the tool file here
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const toolSchema = {
  state: {
  },
  schemas: [
    {type: 'function', function: {name: 'chpwd', description: 'Updates the current working directory to the specified path', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The directory to which the current working directory should be updated'}}, required: ['path']}}},
    {type: 'function', function: {name: 'pwd', description: 'Echoes back the current working directory'}},
    {type: 'function', function: {name: 'cp', description: 'Copies a file from the source to the destination', parameters: {type: 'object', properties: {source: {type: 'string', description: 'The source file'}, destination: {type: 'string', description: 'The destination file'}}, required: ['source', 'destination']}}},
    {type: 'function', function: {name: 'mv', description: 'Moves a file from the source to the destination', parameters: {type: 'object', properties: {source: {type: 'string', description: 'The source file'}, destination: {type: 'string', description: 'The destination file'}}, required: ['source', 'destination']}}},
    {type: 'function', function: {name: 'rm', description: 'Removes a file or directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file or directory to be removed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'cat', description: 'Prints the contents of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'grep', description: 'Searches for a pattern in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be searched'}}, required: ['path', 'pattern']}}},
    {type: 'function', function: {name: 'curl', description: 'Downloads a file from the internet', parameters: {type: 'object', properties: {url: {type: 'string', description: 'The URL of the file to be downloaded'}}, required: ['url']}}},
    {type: 'function', function: {name: 'head', description: 'Prints the first few lines of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, lines: {type: 'number', description: 'The number of lines to be printed'}}, required: ['path', 'lines']}}},
    {type: 'function', function: {name: 'stat', description: 'Prints the status of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'tail', description: 'Prints the last few lines of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, lines: {type: 'number', description: 'The number of lines to be printed'}}, required: ['path', 'lines']}}},
    {type: 'function', function: {name: 'sed', description: 'Replaces a pattern with a replacement in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be replaced'}, replacement: {type: 'string', description: 'The replacement pattern'}}, required: ['path', 'pattern', 'replacement']}}},
    {type: 'function', function: {name: 'awk', description: 'Replaces a pattern with a replacement in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be replaced'}, replacement: {type: 'string', description: 'The replacement pattern'}}, required: ['path', 'pattern', 'replacement']}}},
    {type: 'function', function: {name: 'touch', description: 'Creates a new file if it does not already exist', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the file to be created'}}, required: ['path']}}},
    {type: 'function', function: {name: 'ls', description: 'Lists all files and directories in the current directory', parameters: {type: 'object', properties: {directory: {type: 'string', description: 'The directory to list its contents'}, options: {type: 'string', description: 'Options for listing e.g., -l for detailed list'}}, required: ['directory']}}},
    {type: 'function', function: {name: 'chmod', description: 'Changes the mode of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file whose mode is to be changed'}, mode: {type: 'string', description: 'The new mode of the file (e.g., "755")'}}, required: ['path', 'mode']}}},
    {type: 'function', function: {name: 'ln', description: 'Creates a link to a file', parameters: {type: 'object', properties: {target: {type: 'string', description: 'The target file'}, linkName: {type: 'string', description: 'The name of the new link'}}, required: ['target', 'linkName']}}},
    {type: 'function', function: {name: 'mkdir', description: 'Creates a new directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the directory to be created'}, recursive: {type: 'boolean', description: 'Whether to create parent directories as needed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'rmdir', description: 'Removes a directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the directory to be removed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'rename', description: 'Renames a file or directory', parameters: {type: 'object', properties: {oldPath: {type: 'string', description: 'The current path'}, newPath: {type: 'string', description: 'The new path'}}, required: ['oldPath', 'newPath']}}},
    {type: 'function', function: {name: 'find', description: 'Searches for files and directories based on a pattern', parameters: {type: 'object', properties: {directory: {type: 'string', description: 'The directory to search in'}, pattern: {type: 'string', description: 'The search pattern'}}, required: ['directory', 'pattern']}}},
   

  ],
  tools: {
    chpwd : function ({path}) { os.chdir(path); toolSchema.state.pwd = os.getcwd(); return "Current Directory: " + toolSchema.state.pwd; },
    pwd : function (_) { toolSchema.state.pwd = os.getcwd(); return "Current Directory: " + toolSchema.state.pwd; },
    cp: function ({source, destination}) { exec(`cp ${source} ${destination}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    mv: function ({source, destination}) { exec(`mv ${source} ${destination}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    rm: function ({path}) { exec(`rm -rf ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    cat: function ({path}) { exec(`cat ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    greg: function ({path, pattern}) { exec(`grep ${pattern} ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    curl: function ({url}) { exec(`curl ${url}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    head: function ({path, lines}) { exec(`head -n ${lines} ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    stat: function ({path}) { exec(`stat ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    tail: function ({path, lines}) { exec(`tail -n ${lines} ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    sed: function ({path, pattern, replacement}) { exec(`sed -i 's/${pattern}/${replacement}/g' ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    awk: function ({path, pattern, replacement}) { exec(`awk '{gsub(/${pattern}/${replacement}/g)}1' ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    touch: function ({path}) { exec(`touch ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    ls: function ({directory, options = ''}) { exec(`ls ${options} ${directory}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    chmod: function ({path, mode}) { exec(`chmod ${mode} ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    ln: function ({target, linkName}) { exec(`ln -s ${target} ${linkName}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    mkdir: function ({path, recursive = false}) { let command = recursive ? `mkdir -p ${path}` : `mkdir ${path}`; exec(command, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    rmdir: function ({path}) { exec(`rmdir ${path}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    rename: function ({oldPath, newPath}) { exec(`mv ${oldPath} ${newPath}`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
    find: function ({directory, pattern}) { exec(`find ${directory} -name "${pattern}"`, (error, stdout, stderr) => { if (error) { console.error(`exec error: ${error}`); return; } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`); }); },
  }
}
module.exports = toolSchema;
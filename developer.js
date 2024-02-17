const AssistantAPI = require('./assistant');
const toolmakerToolbox = require('./toolmaker');
module.exports = {
    prompt: `***MASTER PAIR PROGRAMMER***

You are a highly skilled, highly creative programmer collaborating with your partner in a command-line environment supported by a number of powerful tools. 

You possess the ability to think creatively, improvise and perform highly complex tasks. 

You are tasked with transforming the files in the current working folder and other specified folders to meet the requirements of the user. 

You can save any data you want to the system state, which will persist between calls. 

***INSTRUCTIONS***

Use the \`files\`, \`html_selector\`, \`execute_bash\`/\`execute_nodejs\`, and other tools to transform the files in the current working folder and 
other specified folders to meet the requirements of the user. You can save any data you want to the system state, which will persist between calls. 
This gives you the capability to plan and execute complex tasks over multiple calls.

You also have a task management system at your disposal which will help you stay on track and keep the user informed of your progress. When you 
receive a complex task, first break it down into smaller, actionable steps. Then use the task management system to keep track of your progress.

IMMEDIATELY AFTER completing the overall requirements, SET percent_complete to 100 and status to 'complete'.

***WORKING WITH APPLICATION STATE***

- GET and SET the state of application variables using the \`getset_state\` tool. You can also \`getset_states\` to getset multiple states at once.

***COMMUNICATING WITH YOUR PAIR PROGRAMMING PARTNER***

User chat messages arrive in the \`chat\` state variable. You can respond to the user by setting the \`chat\` state variable as well as by returning a message from your tool.

***IMPORTANT VARIABLES***

- \`chat\`: The user chat messages (input, output)
- \`requirements\`: The overall project requirements (input, output)
- \`percent_complete\`: The overall project percent complete (output)
- \`status\`: The project status (input, output)
- \`current_task\`: The current task (input, output)
- \`ai_notes\`: The current AI notes (input, output)

***WORKING WITH THE SYSTEM***

Look at your tools and schemas to determine what you can do. Examining your own capabilities is a crucial part of your job. You are rewarded for your creativity and resourcefulness, and so is your partner. Some useful tools include:

- \`getset_state\`/\`getset_states\`: Get or set the value of a named variable
- \`get_file_tree\`: Get the file tree of the specified directory
- \`file\`/\`files\`: Read, write, and manipulate files
- \`html_selector\`: Select and manipulate HTML elements
- \`execute_bash\`/\`execute_nodejs\`/\`execute_python\`: Execute bash, Node.js, or Python code
- \`tasks_set\`: Set the tasks to the new tasks
- \`tasks_advance\`: Advance the task to the next task
- \`get_current_task\`: Get the current task


There are many more tools at your disposal. Use them to accomplish the tasks you are given.

***WORKING WITH TASKS***

- DECOMPOSE COMPLEX TASKS into smaller, actionable steps. Each step should have a clear, direct action. Do not create abstract tasks like 'research' or 'browser testing'.
- CALL \`tasks_set\` to set the tasks to the new tasks.
- WHEN YOU ARE DONE with a task, CALL \`tasks_advance\` to move to the next task.
- WHEN YOU ARE DONE working on a task, SET the percent_complete to the new percent complete, increasing it by the percentage of the task you just completed.
- WHEN YOU ARE DONE with ALL TASKS, SET the overall to 'complete' and SET the \`percent_complete\` to 100.

***ON ERROR***

- SET status to 'error'
- CALL error to log the FULL TECHNICAL DETAILS of the error message
- EXIT

***ON WARNING***

- SET status to 'warning'
- CALL warn to log the warning message

***OUTPUT REQUIREMENTS***

YOU ARE _REQUIRED_ to set the percent_complete and status in EVERY RESPONSE.


`,
    state: {
        requirements: 'no requirements set',
        percent_complete: 0,
        status: 'idle',
        tasks: [],
        current_task: '',
        ai_notes: 'no AI notes.',
    },
    tools: {
        getset_state: function ({ name, value }, run) { if (value === undefined) delete run.state[name]; else { run.state[name] = value; } return `${name} => ${JSON.stringify(run.state[name])}` },
        getset_states: function ({ values }, run) { for (const name in values) { if (values[name] === undefined) delete run.state[name]; else { run.state[name] = values[name]; } } return JSON.stringify(run.state) },
        tasks_advance: function (_, run) { if (run.state.tasks.length === 0) { return 'no more tasks' } else { run.state.tasks.shift(); run.current_task = run.state.tasks[0]; console.log('task advanced to:' + run.state.current_task); return run.state.current_task } },
        tasks_set: function ({ tasks }, run) { run.state.tasks = tasks; run.state.current_task = tasks[0]; return JSON.stringify(run.state.tasks) },
        get_current_task: function (_, run) { return run.state.current_task || 'no current task' },
        generate_tool: async function ({ requirements }, run) {
            const runResults = async (requirements) => {
                AssistantAPI.run(toolmakerToolbox.prompt, run.toolmaker_id, run.toolmaker_thread_id, 'Toolmaker', requirements, toolmakerToolbox.tools, toolmakerToolbox.schemas, run, (event, data) => {
                    console.log(event, data);
                    if (event === 'assistant-created') run.toolmaker_id = data.assistant_id;
                    if (event === 'thread-created') run.toolmaker_thread_id = data.thread_id;
                });
                if (state.is_finished) {
                    return runResults;
                } else {
                    return await runResults(requirements);
                }
            }
            return await runResults(requirements);
        },
    },
    schemas: [
        { type: 'function', function: { name: 'getset_state', description: 'Get or set a named variable\'s value. Call with no value to get the current value. Call with a value to set the variable. Call with null to delete it.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'The variable\'s name. required' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } } },
        { type: 'function', function: { name: 'getset_states', description: 'Get or set the values of multiple named variables. Call with no values to get the current values. Call with values to set the variables. Call with null to delete them.', parameters: { type: 'object', properties: { values: { type: 'object', description: 'The variables to get or set', properties: { name: { type: 'string', description: 'The variable\'s name' }, value: { type: 'string', description: 'The variable\'s new value. If not present, the function will return the current value' } }, required: ['name'] } }, required: ['values'] } } },
        { type: 'function', function: { name: 'tasks_advance', description: 'Advance the task to the next task' } },
        { type: 'function', function: { name: 'tasks_set', description: 'Set the tasks to the given tasks. Also sets the current task to the first task in the list', parameters: { type: 'object', properties: { tasks: { type: 'array', description: 'The tasks to set', items: { type: 'string' } } }, required: ['tasks'] } } },
        { type: 'function', function: { name: 'get_current_task', description: 'Get the current task' } },
        { type: 'function', function: { name: 'generate_tool', description: 'Generate an assistant tool that will fulfill the given requirements. ONLY Invoke this when the user asks to generate a tool', parameters: { type: 'object', properties: { requirements: { type: 'string', description: 'A description of the requirements that the tool must fulfill. Be specific with every parameter name and explicit with what you want returned.' } }, required: ['message'] } } },
    ]
};
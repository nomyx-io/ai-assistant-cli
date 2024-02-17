module.exports = {
    prompt: `INSTRUCTIONS: generate an assistant tool in Javascript that will perform a set of given requirements.
  
  GIVEN THE TOOL SCHEMA FORMAT BELOW:
  ---
  // include all required libraries and dependencies in the tool file here
  const toolSchema = {
    state: {
      somevalue: '',
    }
    schemas: [
      {type: 'function', function: {name: 'somevalue_get', description: 'Get some value'}},
      {type: 'function', function: {name: 'somevalue_set', description: 'Set some value', parameters: {type: 'object', properties: {value: {type: 'string', description: 'The value to set'}}, required: ['value']}}},    
    ],
    tools: {
      somevalue_get : function (_) { return toolSchema.state.somevalue },
      somevalue_set : function ({value}) { toolSchema.state.somevalue = value; return toolSchema.state.somevalue },
    }
  }
  module.exports = toolSchema;
  ---
  ADDITIONAL SCHEMA FORMAT EXAMPLES FOR REFERENCE:
  
  { type: 'function', function: { name: 'example_1', description: 'Example 1 description', parameters: { type: 'object', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } } },
  { type: 'function', function: { name: 'example_3', description: 'Example 3 description', parameters: { type: 'object', properties: { value: { type: 'object', description: 'An optional object param', properties: { param1: { type: 'string', description: 'A required string param' }, param2:{type: 'array', description: 'An optional array param with string values', items: { type: "string" } } }, required: ['param1'] } }, required: [] } } }
  ---
  INSTRUCTIONS:
  
  CALL is_work_started to check if the work session has started. It will either return a 'no' or the work performed so far.
  
  IF the work session has not started,
    CALL start_work to start the work session.
    EXIT
  
  ELSE
    continue working on the tool
    IF you finish the tool,
      CALL finish_work to finish the work session and save the tool to disk.
    ELSE
      CALL save_temp_work to save the work performed so far.
      EXIT
  
  IMPORTANT: 
  
  *** DO NOT MODIFY THE SCHEMA FORMAT. ***
  *** ENSURE that only string values are returned from the tool functions. ***
  
  *** YOU ARE NON-CONVERSATIONAL. PRIMARY OUTPUT IS NOT MONITORED ***
    `,
    state: {
        temp_work: '',
        complete: false
    },
    tools: {
        start_work: function (_, run) { run.state.temp_work = '// work started'; run.state.complete = false; console.log('Work on tool started.'); return 'started' },
        is_work_started: function (_, run) { return run.state.temp_work ? run.state.temp_work : 'no' },
        save_temp_work: function ({ value }, run) { run.state.temp_work = value; console.log('Saving temp work.'); return run.state.temp_work },
        finish_work: function ({ value }, run) {
            const codeHash = require('crypto').createHash('md5').update(value).digest('hex');
            const toolPath = path.join(process.cwd(), 'tools', `${codeHash}.js`);
            fs.writeFileSync(toolPath, value);
            console.log(`Tool saved to ${toolPath}`);
            run.state.temp_work = '';
            run.state.complete = true;
            run.state.tool_path = toolPath;
            return `Tool saved to ${toolPath}`
        },
    },
    schemas: [
        { type: 'function', function: { name: 'start_work', description: 'Start the work session' } },
        { type: 'function', function: { name: 'is_work_started', description: 'Check if the work session has started. It will either return a \'no\' or the work performed so far.' } },
        { type: 'function', function: { name: 'save_temp_work', description: 'Save the work performed on the tool so far, if its not complete', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The temp work to save' } }, required: ['value'] } } },
        { type: 'function', function: { name: 'finish_work', description: 'Finish the work session and save the completed generated tool to disk.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The completed tool to save to disk' } }, required: ['value'] } } },
    ]
}

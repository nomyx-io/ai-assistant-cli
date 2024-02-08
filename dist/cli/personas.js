"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonaPrompt = exports.DynamicAssistantPrompt = void 0;
var preamble = "You are a highly-skilled developer tightly integrated into the computer of your pair programming partner. \nYou are given a task by your programming partner, and you must use the tools at your disposal to complete the task.\nYou have access to a wide array of tools and libraries, and you can use them to perform the work described in the requirements. \nYour only constraints are the requirements, the tools at your disposal, and the response format. You run on a continuous loop,\ndriving your own execution and making decisions based on the requirements and the tools at your disposal.\n\nYou do this in three ways:\n\n1. By applying your considerable skills and knowledge to the task at hand. You have the capacity to implement complex systems and solve difficult problems.\n2. By planning your work and breaking it down into smaller tasks then leaning on the tools at your disposal to perform the work described in the requirements.\n3. By strictly following the output format requirements and ensuring that your JSON is valid. Because your final output drives the next iteration of the loop, \n   you must ensure that your JSON is valid and that you only output raw JSON without any surrounding code blocks.\n\n";
var inputFormat = {
    "requirements": {
        "type": "string",
        "required": true,
        "description": "The overall requirements as given to you by your pair programming partner"
    },
    "percent_complete": {
        "type": "number",
        "required": false,
        "description": "The percent complete of the overall task"
    },
    "html": {
        "type": "string",
        "required": false,
        "description": "The html of the document, including styles and scripts."
    },
    "next_task": {
        "type": "string",
        "required": false,
        "description": "The task that is next to be performed"
    },
    "comments": {
        "type": "string",
        "required": false,
        "description": "Comments and notes meant for the agent that will process this response"
    },
};
var outputFormat = {
    "requirements": {
        "type": "string",
        "required": true,
        "description": "The overall requirements as given to you by your pair programming partner"
    },
    "percent_complete": {
        "type": "number",
        "required": true,
        "description": "The percent complete of the overall task"
    },
    "next_task": {
        "type": "string",
        "required": true,
        "description": "The task that is next to be performed"
    },
    "comments": {
        "type": "string",
        "required": false,
        "description": "Comments and notes meant for the agent that will process this response. Use this field to provide additional information to the agent that will process this response"
    },
    "update": {
        "type": "string",
        "required": false,
        "description": "A status update meant for your pair programming partner discussing the progress of the project"
    },
    "warning": {
        "type": "string",
        "required": false,
        "description": "Use this field to raise a warning, such as if any of the tools are not available, or fail to execute as expected, or if the requirements are not met"
    },
    "flow_control": {
        "type": "string",
        "required": true,
        "description": "set to \"continue\" to continue processing, \"awaiting_user_response\" to stop processing and get a user response, \"error\" for an error, or \"complete\" to indicate the project is finished"
    },
    "show_html": {
        "type": "boolean",
        "required": false,
        "description": "Set to true to be shown the HTML the next time you process the response"
    }
};
var critical = "*** CRITICAL *** THE OUTPUT FORMAT MUST ALWAYS BE IN JSON FORMAT AND YOU MUST NOT SURROUND YOUR JSON WITH CODEBLOCKS. You must ensure your JSON is valid! You must only output raw JSON without any surrounding code blocks.";
var notes = [
    "YOU MUST USE Tailwind and Flowbite for all new UI development tasks",
    "YOU MUST USE Lit and Alpine.js for all new development tasks",
    "Call show_message BEFORE AND AFTER any changes to the operation.",
    "DO NOT TARGET THE BODY TAG! To target the root of your document, pass an empty string to the selector functions.",
];
var DynamicAssistantPrompt = /** @class */ (function () {
    function DynamicAssistantPrompt() {
        this.sections = {};
        this.sectionsOrder = [];
    }
    DynamicAssistantPrompt.prototype.addSection = function (name, section) { this.sections[name] = section; this.sectionsOrder.push(name); };
    DynamicAssistantPrompt.prototype.getSection = function (name) { return this.sections[name]; };
    DynamicAssistantPrompt.prototype.getSectionOrder = function (name) { return this.sectionsOrder.indexOf(name); };
    DynamicAssistantPrompt.prototype.getSectionNames = function () { return this.sectionsOrder; };
    DynamicAssistantPrompt.prototype.reorderSections = function (names) { this.sectionsOrder = names; };
    DynamicAssistantPrompt.prototype.getPrompt = function () {
        var _this = this;
        return this.sectionsOrder.map(function (name) { return "### ".concat(name, "\n").concat(_this.sections[name]); }).join("\n\n");
    };
    return DynamicAssistantPrompt;
}());
exports.DynamicAssistantPrompt = DynamicAssistantPrompt;
// sample tool schema:
// {type: 'function', function: {name: 'show_message', description: 'Show the given text as a message to the user', parameters: {type: 'object', properties: {message: {type: 'string', description: 'The message text to show to the user'}}, required: ['message']}}},
function getPersonaPrompt(schemas) {
    var webContextPrompt = new DynamicAssistantPrompt();
    var toolsList = Object.keys(schemas).map(function (key) { return "".concat(key, ": ").concat(schemas[key].type, " ").concat((schemas[key].required === true ? "required" : "optional"), " ").concat((schemas[key].description)); }).join("\n");
    webContextPrompt.addSection("Preamble", preamble);
    webContextPrompt.addSection("Toolset", toolsList);
    webContextPrompt.addSection("Input Format", Object.keys(inputFormat).map(function (key) { return "".concat(key, ": ").concat(inputFormat[key].type, " ").concat(inputFormat[key].required === true ? "required" : "optional", " ").concat(inputFormat[key].description); }).join("\n"));
    webContextPrompt.addSection("Output Format", Object.keys(outputFormat).map(function (key) { return "".concat(key, ": ").concat(outputFormat[key].type, " ").concat(outputFormat[key].required === true ? "required" : "optional", " ").concat(outputFormat[key].description); }).join("\n") + '\n\n*** CRITICAL *** THE OUTPUT FORMAT MUST ALWAYS BE IN JSON FORMAT AND YOU MUST NOT SURROUND YOUR JSON WITH CODEBLOCKS. You must ensure your JSON is valid! You must only output raw JSON without any surrounding code blocks.');
    webContextPrompt.addSection("Critical", critical);
    webContextPrompt.addSection("Notes", notes.join("\n"));
    return webContextPrompt.getPrompt();
}
exports.getPersonaPrompt = getPersonaPrompt;

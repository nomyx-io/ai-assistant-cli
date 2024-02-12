// import axios from "axios";
const axios = require('axios');
const config = require('../config');

module.exports = {
    state: {
        modules: [{
            name: "google",
            description: "Google Search",
            version: "0.0.1"
        }],
        google: {
            apiKey: config.googleApiKey,
            cx: config.googleCxId
        }
    },
    schemas: [{
        type: "function",
        function: {
            name: "search_google",
            description: "perform a google search using the given query",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The query to search for"
                    }
                },
                required: ["query"]
            }
        }
    }],
    tools: { 
        search_google: async ({ query }) => {
            const _config = module.exports.state.google;
            try {
                let config_api_key = _config.apiKey;
                let config_cx = _config.cx;
                const response = await
                    axios.get(`https://www.googleapis.com/customsearch/v1?key=${config_api_key}&cx=${config_cx}&q=${query}`);
                const results = response.data.items.map((item) => ({
                    title: item.title,
                    link: item.link
                }));
                const res = JSON.stringify(results);
                return res;
            } catch (error) {
                return error.message;
            }
        }
    }
}
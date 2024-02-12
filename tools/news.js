require('dotenv').config();
const axios = require('axios');
module.exports = {
    state: {
        modules: [{
            name: "news",
            description: "News Search",
            version: "0.0.1"
        }],
        news: {
            apiKey: process.env.NEWS_API_KEY
        }
    },
    schemas: [{
        type: "function",
        function: {
            name: "search_news_api",
            description: "perform a news search using the given query",
            parameters: {
                type: "object",
                properties: {
                    q: {
                        type: "string",
                        description: "The query to search for"
                    },
                    from: {
                        type: "string",
                        description: "The start date to search for"
                    },
                    to: {
                        type: "string",
                        description: "The end date to search for"
                    },
                    language: {
                        type: "string",
                        description: "The language to search for"
                    },
                    country: {
                        type: "string",
                        description: "The country to search for"
                    },
                    domains: {
                        type: "string",
                        description: "The domains to search for"
                    },
                    sources: {
                        type: "string",
                        description: "The sources to search for"
                    },
                    sortBy: {
                        type: "string",
                        description: "The sort order to search for"
                    },
                    num: {
                        type: "number",
                        description: "The number of results to return"
                    },
                },
                required: ["q"]
            }
        }
    }],
    tools: {
        search_news_api: async (values) => {
            const config = module.exports.state.news;
            const trunc = (str, len) => {
                return str.length > len ? str.substring(0, len - 3) + '...' : str;
            }
            try {
                let config_api_key = config.apiKey;
                const response = await axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${config_api_key}`);
                const results = response.data.articles.map((item) => ({
                    content: trunc(item.content, 100),
                    title: item.title,
                    url: item.url,
                }));
                // keep only the first num results
                let num = values.num ? values.num : 10;
                const res = results.slice(0, num);
                return JSON.stringify(res);
            } catch (error) {
                return `Error calling News API: ${error.message}`
            }
        }
    }
}
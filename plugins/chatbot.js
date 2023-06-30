const { Configuration, OpenAIApi } = require('openai');
const config = require("../config/config.json");

const chatbotMessage = async (message, msg) => {
    const configuration = new Configuration({ apiKey: config.key });
    const openai = new OpenAIApi(configuration);
    try {
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `Hello, I am an assistant, a multipurpose chatbot based on the Openai API GPT-3\n${msg}`,
            temperature: 0.9,
            max_tokens: 400,
        });
        if (response.data.choices[0].text.trim() !== '') {
            message.reply(`${response.data.choices[0].text}`);
        }
        return;
    } catch (e) {
        console.log(e)
    }
}

module.exports = { chatbotMessage };
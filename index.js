const { Client, MessageMedia } = require("whatsapp-web.js");
const { Configuration, OpenAIApi } = require('openai');
const router = require("./src/routes/send.routes");
const config = require("./config/config.json");
const qrcode = require('qrcode-terminal');
const express = require("express");
const exeljs = require("exceljs");
const moment = require("moment");
const chalk = require("chalk");
const fs = require("node:fs");
const cors = require("cors");

const prefix = "!";
const app = express();
let sessionData;
let client_1;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post("/send", (req, res) => {
    const { message, to } = req.body
    const new_number = `${to}@c.us`

    sendMessage(new_number, message)
    res.send({ status: "Enviado" })
});

app.post("/sendGroup", (req, res) => {
    const { message, to } = req.body
    const new_number = `${ to }@g.us`

    sendMessage(new_number, message)
    res.send({ status: "Enviado" })
});

const session_path = `./src/session/session.json`
const writeSession = () => {
    console.log(chalk.redBright(`[Whatsapp]`) + ` Loading session the day ${new Date().toLocaleDateString()}`);
    sessionData = require(session_path);

    client_1 = new Client({
        session: sessionData,
        puppeteer: {
            args: ['--no-sandbox'],
        }
    });

    client_1.on('ready', () => {
        listenMessage();
    });

    client_1.on('auth_failure', () => {
        console.log(chalk.redBright(`[Whatsapp]`) + ` Session expired, please scan QR code to login`);
    });
}

const withOutSession = () => {
    console.log(chalk.blueBright(`[Whatsapp]`) + ` Not session saved, please scan QR code to login`);
    client_1 = new Client({
        puppeteer: {
            args: ['--no-sandbox'],
        }
    });

    client_1.on('qr', (qr) => {
        console.log(chalk.blueBright(`[Whatsapp]`) + ` QR code received, please scan`);
        qrcode.generate(qr, { small: true });
    });

    client_1.on('ready', () => {
        listenMessage();
    });

    client_1.on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile(session_path, JSON.stringify(Buffer.from(JSON.stringify(session))), function(err) { if (err) console.log(err); });
        console.log(chalk.blueBright(`[Whatsapp]`) + ` Session saved the day ${new Date().toLocaleDateString()} in hour ${new Date().toLocaleTimeString()}`);
    });

    client_1.initialize();
}

const listenMessage = () => {
    client_1.on('message', (message) => {
        const {from, to, body} = message;

        if (message.hasMedia) {
            const media = message.downloadMedia();
            const fileName = `${message.t}.${message.mimetype.split('/')[1]}`;
            media.then((result) => {
                fs.writeFile(`./src/media/${fileName}`, result.data, {encoding: 'base64'}, function(err) {
                    if (err) console.log(err);
                    console.log(chalk.blueBright(`[Whatsapp]`) + ` Message received from ${message.from}: ${message.body}`);
                });
            });
            return;
        }

        if (message.body === 'Hola Mika') {
            sendMessage(from, [
                `Hola, soy una aistente, de luis antonio o mejor conocido como azazel`,
                `apartir de ahora el chat sera autoguardado en un archivo excel`,
            ].join('\n'));
        }

        if (message.body === 'adios') {
            sendMessage(from, `Adios ${message.sender.pushname}, espero verte pronto 😊`);
        }

        if (message.body.startsWith(prefix))  {
            chatbotMessage(message);
        }

        historial(from, body);
        console.log(chalk.blueBright(`[Whatsapp]`) + ` Message received from ${message.from}: ${message.body}`)
    });
}

const sendMessage = (to, message) => {
    client_1.sendMessage(to, message);
}

const sendMedia = (to, message) => {
    const media = MessageMedia.fromFilePath(`./src/media/${message}`);
    client_1.sendMessage(to, media);
}

const historial = async (to, message) => {
    const path_chats = `./src/chats/${to}.xlsx`;
    const today = moment().format('DD-MM-YYYY hh:mm:ss');
    const workbook = new exeljs.Workbook();

    if (fs.existsSync(path_chats)) {
        workbook.xlsx.readFile(path_chats).then(() => {
            const worksheet = workbook.getWorksheet(1);
            const lastRow = worksheet.lastRow;
            const getRowInsert = worksheet.getRow(++(lastRow.number));
            getRowInsert.getCell('A').value = today;
            getRowInsert.getCell('B').value = message;
            getRowInsert.commit();

            workbook.xlsx.writeFile(path_chats).then(() => {
                console.log(chalk.blueBright(`[Whatsapp]`) + ` Chat history saved in ${path_chats} file`);
            });
        });
    } else {
        const worksheet = workbook.addWorksheet('Chats');
        worksheet.columns = [
            { header: 'Date', key: 'date' },
            { header: 'Message', key: 'message' }
        ];
        worksheet.addRow([today, message]);
        workbook.xlsx.writeFile(path_chats).then(() => {
            console.log(chalk.blueBright(`[Whatsapp]`) + ` Chat history saved in ${path_chats} file`);
        }).catch((err) => {
            console.log(err);
        });
    }
}

const chatbotMessage = async (message) => {
    const configuration = new Configuration({ apiKey: config.key });
    const openai = new OpenAIApi(configuration);
        try {
            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `Hola, soy una aistente, un chatbot multipropósito basado en la API Openai GPT-3\n${message.body}`,
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

(fs.existsSync(session_path)) ? writeSession() : withOutSession();
app.listen(config.port, () => {
    console.log(chalk.blueBright(`[Whatsapp]`) + ` Server running on port ${config.port} the link: http://localhost:${config.port}`);
});

module.exports = client_1;
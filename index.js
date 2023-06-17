const { Client, MessageMedia } = require("whatsapp-web.js");
const config = require("./config/config.json");
const qrcode = require('qrcode-terminal');
const express = require("express");
const exeljs = require("exceljs");
const moment = require("moment");
const chalk = require("chalk");
const fs = require("node:fs");
const cors = require("cors");
const router = require("./src/routes/send.routes");

const app = express();
let sessionData;
let client_1;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

const session_path = `./src/session/session.json`
const writeSession = () => {
    console.log(chalk.redBright(`[Whatsapp]`) + ` Loading session the day ${new Date().toLocaleDateString()}`);
    sessionData = require(session_path);

    client_1 = new Client({
        session: sessionData,
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
    client_1 = new Client();

    client_1.on('qr', (qr) => {
        console.log(chalk.blueBright(`[Whatsapp]`) + ` QR code received, please scan`);
        qrcode.generate(qr, { small: true });
    });

    client_1.on('ready', () => {
        listenMessage();
    });

    client_1.on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile(session_path, JSON.stringify(session, null, " "), (err) => {
            if (err) { console.log(err) }
        });
        console.log(chalk.blueBright(`[Whatsapp]`) + ` Session saved the day ${new Date().toLocaleDateString()} in hour ${new Date().toLocaleTimeString()}`);
    });

    client_1.initialize();
}

const listenMessage = () => {
    client_1.on('message', (message) => {
        const {from, to, body} = message;

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

(fs.existsSync(session_path)) ? writeSession() : withOutSession();
app.listen(config.port, () => {
    console.log(chalk.blueBright(`[Whatsapp]`) + ` Server running on port ${config.port} the link: http://localhost:${config.port}`);
});
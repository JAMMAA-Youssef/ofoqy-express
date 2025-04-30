
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { questionsByType, riaSecUniversities, universityInfo } = require('./data/constants');

const app = express();
app.use(bodyParser.json());

const token = '7698177248:AAHedsAQXWNVWs53QFVe6blPdqDn3aS28Dc'; // Replace this with your actual token
const bot = new TelegramBot(token, { polling: true });

const userSessions = {};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 Bienvenue sur le bot OFOQY ! Tape /holland pour commencer le test ou /university pour explorer les écoles.");
});

bot.onText(/\/holland/, (msg) => {
    const userId = msg.from.id;
    const questions = [];
    for (const [type, qs] of Object.entries(questionsByType)) {
        qs.forEach(q => questions.push([q, type]));
    }
    questions.sort(() => 0.5 - Math.random());

    userSessions[userId] = {
        questions: questions,
        index: 0,
        scores: Object.fromEntries(Object.keys(questionsByType).map(k => [k, 0]))
    };

    bot.sendMessage(msg.chat.id, `🎯 Pour chaque question, choisissez un chiffre de 1 à 5 selon votre degré d'intérêt :

1️⃣ : Pas du tout intéressé(e)
2️⃣ : Peu intéressé(e)
3️⃣ : Neutre
4️⃣ : Assez intéressé(e)
5️⃣ : Très intéressé(e)`);

    sendNextQuestion(msg.chat.id, userId);
});

bot.on('message', (msg) => {
    const userId = msg.from.id;
    const text = msg.text;

    if (text.startsWith('/')) return;

    if (!userSessions[userId]) return;

    if (!['1', '2', '3', '4', '5'].includes(text)) {
        bot.sendMessage(msg.chat.id, "Merci de répondre par un chiffre entre 1 et 5.");
        return;
    }

    const val = parseInt(text);
    const session = userSessions[userId];
    const [_, typ] = session.questions[session.index];
    session.scores[typ] += val;
    session.index += 1;

    if (session.index < session.questions.length) {
        sendNextQuestion(msg.chat.id, userId);
    } else {
        showResults(msg.chat.id, userId);
    }
});

function sendNextQuestion(chatId, userId) {
    const session = userSessions[userId];
    const [q, _] = session.questions[session.index];
    bot.sendMessage(chatId, `${session.index + 1}/${session.questions.length} ➤ ${q}`, {
        reply_markup: {
            keyboard: [['1', '2', '3', '4', '5']],
            one_time_keyboard: true,
            resize_keyboard: true
        }
    });
}

function showResults(chatId, userId) {
    const scores = userSessions[userId].scores;
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const top3 = sorted.slice(0, 3).map(([k, v]) => `<b>${k}</b> (${v})`).join(' - ');
    const suggestions = riaSecUniversities[dominant].join('\n');
    const message = `✅ <b>Test terminé</b>

🎓 <b>Vos types dominants</b> : ${top3}

${suggestions}

💡 Si vous souhaitez en savoir plus sur une université, tapez la commande /university.`;

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    delete userSessions[userId];
}

bot.onText(/\/university/, (msg) => {
    const cmds = Object.keys(universityInfo).map(k => '/' + k).join('\n');
    bot.sendMessage(msg.chat.id, "🏫 Tape une commande pour voir les infos :\n" + cmds);
});

for (const code in universityInfo) {
    bot.onText(new RegExp(`/${code}`), (msg) => {
        const u = universityInfo[code];
        const text = `🏛️ <b>${u.Nom}</b>
<b>Ville</b>: ${u.Ville}
<b>Spécialités</b>: ${u.Spécialités}
<b>Site</b>: ${u.Site}
<b>Téléphone</b>: ${u.Téléphone}

${u.Présentation}`;
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

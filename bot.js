import { Telegraf , session } from 'telegraf';
import { MongoClient } from 'mongodb';
import axios from 'axios';

const botToken = '6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA';
const serverUrl = 'https://bathroom-shop-api.onrender.com';
const mongoUrl = 'mongodb+srv://Admin:Black.Street818@bathroom-shop.29wete0.mongodb.net/market?retryWrites=true&w=majority';

const bot = new Telegraf(botToken);

// Підключення до бази даних MongoDB
const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect()
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('MongoDB connection error', err);
    });

bot.use(session());

// Обробник команди "Старт"
bot.command('start', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        await ctx.reply('Вітаємо! Для початку роботи введіть /login для автентифікації.');

        // Обробка логіна та пароля для автентифікації
        ctx.reply('Будь ласка, введіть свій логін (email):');
        const loginMsg = await ctx.update.message.text();
        const login = loginMsg.text;

        // Тут далі аналогічний код для отримання пароля і автентифікації
        ctx.reply('Логін збережено. Тепер введіть свій пароль:');
        const passwordMsg = await ctx.update.message.text();
        const password = passwordMsg.text;

        // Надсилання логіну та паролю на сервер для автентифікації
        const response = await axios.post(`${serverUrl}api/auth/login`, {
            email: login,
            password: password,
        });
        const { token, ...userData } = response.data;
        ctx.reply(`Автентифікація пройшла успішно. Ваші дані:\n${JSON.stringify(userData, null, 2)}`);

        // Видалення обробників для команд "/login" та "/password" після завершення автентифікації
        bot.removeTextListener(loginMsg.message_id);
        bot.removeTextListener(passwordMsg.message_id);

    } catch (error) {
        console.error(error);
        ctx.reply('Помилка при автентифікації. Спробуйте ще раз.');
    }
});



export default bot;
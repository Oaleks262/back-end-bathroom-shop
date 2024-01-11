import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from "mongoose";
import dotenv from 'dotenv';
import cors from 'cors';
import shortid from "shortid";
import {registerValidator} from "./validation/auth.js";
import {validationResult} from "express-validator";
import {loginValidator} from "./validation/auth.js";
import UserModel from "./model/user.js"
import ShopSchema from "./model/shop.js"
import ProductSchema from "./model/product.js"

import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';


const botToken = "6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA";
const serverUrl = "https://bathroom-shop-api.onrender.com";

dotenv.config();

const dbConnectionString = process.env.DB_CONNECTION_STRING;
const secretKey = process.env.SECRET_KEY;


const PORT = process.env.PORT || 2222

mongoose.connect(dbConnectionString)
.then(()=>{console.log('DB ok')})
.catch((err)=> {console.log('DB error', err)});

const app = express();
app.use(cors());
app.use(express.json());

shortid.characters('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-');

app.post('/api/auth/login', loginValidator, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors.array());
        }

        const user = await UserModel.findOne({ email: req.body.email });

        if (!user) {
            return res.status(401).json({ message: "Користувача не знайдено" });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.passwordHash);

        if (!validPassword) {
            return res.status(401).json({ message: "Неправильний пароль" });
        }

        const token = jwt.sign({ _id: user._id }, secretKey, { expiresIn: '30d' });

        const { passwordHash, ...userData } = user._doc;

        res.json({ ...userData, token });
    } catch (err) {
        res.status(500).json({ message: "Помилка під час аутентифікації" });
    }
});
app.post('/api/admin/logout', (req, res) => {
    try {
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ message: 'Токен відсутній. Доступ заборонено.' });
        }
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Невірний токен. Доступ заборонено.' });
            }
            res.json({ message: 'Адмін вийшов з системи успішно' });
        });
    } catch (error) {
        console.error('Помилка під час виходу', error);
        res.status(500).json({ message: 'Помилка під час виходу' });
    }
});
app.post('/api/auth/register' , registerValidator, async (req, res)=>{
    try{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json(errors.array());
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);


    const doc = new UserModel({
        email: req.body.email,
        passwordHash: hash,
    })

    const user = await doc.save();
    const token =jwt.sign({
        _id: user._id
    }, secretKey,{
        expiresIn: '30d'
    })
    const {passwordHash, ...userData} = user._doc
    res.json({ ...userData, token,});
} catch(err){
    res.status(500).json({
        message: "Не зареєструвався"
    })
}
})
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: "Немає токену. Доступ заборонено." });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Невірний токен. Доступ заборонено." });
        }

        req.user = user;
        next();
    });
};
app.get('/api/product', async (req, res) => {
try{
    const allProducts = await ProductSchema.find();
    if (!allProducts || allProducts.length === 0) {
        return res.status(404).json({ message: "Інформація про товар не знайдена" });
    }
    res.json(allProducts);
}catch(error){
    res.status(500).json({message:  "Помилка при отриманні інформації про товар"})
}

})
app.get('/api/admin/product',authenticateToken, async (req, res) => {
    try{
        const allProducts = await ProductSchema.find();
        if (!allProducts || allProducts.length === 0) {
            return res.status(404).json({ message: "Інформація про товар не знайдена" });
        }
        res.json(allProducts);
    }catch(error){
        res.status(500).json({message:  "Помилка при отриманні інформації про товар"})
    }
    
})
app.post('/api/admin/product', authenticateToken, async (req, res) => {
        try {
            const { avatarUrl, titleProduct, aboutProduct, priceProduct } = req.body;
    
            const itemProduct = shortid.generate().substring(0, 4);
    
            if (!titleProduct || !aboutProduct || !priceProduct) {
                return res.status(400).json({ message: "Please provide all required fields." });
            }
    
            const newProduct = new ProductSchema({
                avatarUrl,
                itemProduct,
                titleProduct,
                aboutProduct,
                priceProduct,
            });
    
            await newProduct.save();
    
            res.status(201).json({ message: "Товар успішно додано", product: newProduct });
        } catch (error) {
            console.error(error); // Log the actual error to the console
            res.status(500).json({ message: "Помилка при додаванні інформації" });
        }
});
app.put('/api/admin/product/:productId',authenticateToken, async (req, res) => {
    try {
        const productId = req.params.productId;
        const { avatarUrl, titleProduct, aboutProduct, priceProduct } = req.body;

        // Перевірка, чи існує товар з вказаним ID
        const existingProduct = await ProductSchema.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: "Товар не знайдено" });
        }

        // Оновлення властивостей товару
        existingProduct.avatarUrl = avatarUrl;
        existingProduct.titleProduct = titleProduct;
        existingProduct.aboutProduct = aboutProduct;
        existingProduct.priceProduct = priceProduct;

        // Збереження оновленого товару
        await existingProduct.save();

        res.json({ message: "Товар успішно оновлено", product: existingProduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося оновити товар" });
    }
});
app.delete('/api/admin/product/:productId',authenticateToken, async (req, res) => {
        try {
            const productId = req.params.productId;

            // Перевірка, чи існує товар з вказаним ID
            const existingProduct = await ProductSchema.findById(productId);
            if (!existingProduct) {
                return res.status(404).json({ message: "Товар не знайдено" });
            }

            // Видалення товару
            await existingProduct.remove();

            res.json({ message: "Товар успішно видалено" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Не вдалося видалити товар" });
        }
});
app.post('/api/order', async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, city, postOffice, numberPost, productItem } = req.body;

        // Валідація даних запиту (можливо, вам захочеться додати більше логіки валідації)
        if (!firstName || !lastName || !phoneNumber || !city || !postOffice || !numberPost || !productItem) {
            return res.status(400).json({ message: "Будь ласка, надайте всі обов'язкові поля." });
        }

        // Створення нового замовлення
        const newOrder = new ShopSchema({
            firstName,
            lastName,
            phoneNumber,
            city,
            postOffice,
            numberPost,
            productItem,
        });

        // Збереження замовлення у базі даних
        await newOrder.save();

        res.status(201).json({ message: "Замовлення успішно оформлено", order: newOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося оформити замовлення" });
    }
});


const bot = new TelegramBot(botToken, { polling: true });
const authenticatedUsers = {};


// Обробник команди "Старт"
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Вітаємо! Для початку роботи введіть /login для автентифікації.');
});

// Обробник команди "Логін"
bot.onText(/\/login/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Будь ласка, введіть свій логін (email):');
    bot.onText(/^(.+)/, (loginMsg, match) => {
        const login = match[1];
        const userId = loginMsg.from.id;
        authenticatedUsers[userId] = { login };
        bot.sendMessage(chatId, 'Логін збережено. Тепер введіть свій пароль:');
        bot.onText(/^(.+)/, async (passwordMsg, match) => {
            const password = match[1];
            authenticatedUsers[userId].password = password;
            try {
                // Надсилання логіну та паролю на сервер для автентифікації
                const response = await axios.post(`${serverUrl}api/auth/login`, {
                    email: authenticatedUsers[userId].login,
                    password: authenticatedUsers[userId].password,
                });
                const { token, ...userData } = response.data;
                authenticatedUsers[userId].token = token;
                bot.sendMessage(chatId, `Автентифікація пройшла успішно. Ваші дані:\n${JSON.stringify(userData, null, 2)}`);
            } catch (error) {
                console.error('Authentication error:', error.response ? error.response.data : error.message);
                bot.sendMessage(chatId, 'Помилка автентифікації. Будь ласка, спробуйте знову.');
            }
            // Видалення обробників для команд "/login" та "/password" після завершення автентифікації
            delete authenticatedUsers[userId].login;
            delete authenticatedUsers[userId].password;
            bot.removeTextListener(loginMsg.message_id);
            bot.removeTextListener(passwordMsg.message_id);
        });
    });
});

// Обробник команди "Товари"
bot.onText(/Товари/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Надсилання запиту на сервер для отримання списку товарів
        const response = await axios.get(`${serverUrl}api/admin/product`, {
            headers: { Authorization: authenticatedUsers[userId].token },
        });
        const products = response.data;
        bot.sendMessage(chatId, `Ваші товари:\n${JSON.stringify(products, null, 2)}`);
    } catch (error) {
        console.error('Error fetching products:', error.response ? error.response.data : error.message);
        bot.sendMessage(chatId, 'Помилка при отриманні товарів.');
    }
});

// Обробник команди "Замовлення"
bot.onText(/Замовлення/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Надсилання запиту на сервер для отримання списку замовлень
        const response = await axios.get(`${serverUrl}api/order`, {
            headers: { Authorization: authenticatedUsers[userId].token },
        });
        const orders = response.data;
        bot.sendMessage(chatId, `Ваші замовлення:\n${JSON.stringify(orders, null, 2)}`);
    } catch (error) {
        console.error('Error fetching orders:', error.response ? error.response.data : error.message);
        bot.sendMessage(chatId, 'Помилка при отриманні замовлень.');
    }
});



app.listen(PORT, (err) => {
    if (err) {
        return console.log(err);
    } else {
        console.log('Server OK');
    }
});
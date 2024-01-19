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
import Shop from "./model/shop.js"
import ProductSchema from "./model/product.js"
import Product from './model/product.js';
import Feedback from "./model/feedback.js";
import FeedbackSchema from "./model/feedback.js";
import { Telegraf , Markup} from "telegraf";




dotenv.config();

const dbConnectionString = process.env.DB_CONNECTION_STRING;
const secretKey = process.env.SECRET_KEY;
const botToken = '6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA';

const PORT = process.env.PORT || 2222

mongoose.connect(dbConnectionString)
.then(()=>{console.log('DB ok')})
.catch((err)=> {console.log('DB error', err)});

const app = express();
app.use(cors());
app.use(express.json());

shortid.characters('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-');
const bot = new Telegraf(botToken);

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
        const { firstName, lastName, phoneNumber, city, postOffice, numberPost, productItems } = req.body;

        // Валідація даних запиту (можливо, вам захочеться додати більше логіки валідації)
        if (!firstName || !lastName || !phoneNumber || !city || !postOffice || !numberPost || !productItems) {
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
            productItems,
            acrivePosition: 'new',
        });

        // Збереження замовлення у базі даних
        await newOrder.save();

        res.status(201).json({ message: "Замовлення успішно оформлено", order: newOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося оформити замовлення" });
    }
});
app.get('/api/admin/order',authenticateToken, async (req, res) => {
    try {
        // Отримання всіх замовлень з бази даних
        const orders = await ShopSchema.find();

        res.status(200).json({ orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося отримати замовлення" });
    }
});
// Маршрут для редагування замовлення за ідентифікатором
app.put('/api/admin/order/:orderId',authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const updatedOrderData = req.body;

        // Перевірка чи існує замовлення з вказаним ідентифікатором
        const existingOrder = await ShopSchema.findById(orderId);
        if (!existingOrder) {
            return res.status(404).json({ message: "Замовлення не знайдено" });
        }

        // Оновлення полів замовлення
        Object.assign(existingOrder, updatedOrderData);

        // Збереження оновленого замовлення у базі даних
        await existingOrder.save();

        res.status(200).json({ message: "Замовлення успішно оновлено", order: existingOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося оновити замовлення" });
    }
});
// Маршрут для редагування поля acrivePosition за ідентифікатором замовлення
app.patch('/api/admin/orders/:orderId/active-position',authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const newActivePosition = req.body.activePosition;

        // Перевірка чи існує замовлення з вказаним ідентифікатором
        const existingOrder = await ShopSchema.findById(orderId);
        if (!existingOrder) {
            return res.status(404).json({ message: "Замовлення не знайдено" });
        }

        // Перевірка чи передано коректне значення для поля activePosition
        if (!['new', 'processing', 'rejection', 'done'].includes(newActivePosition)) {
            return res.status(400).json({ message: "Неприпустиме значення для поля activePosition" });
        }

        // Оновлення поля activePosition
        existingOrder.acrivePosition = newActivePosition;

        // Збереження оновленого замовлення у базі даних
        await existingOrder.save();

        res.status(200).json({ message: "Позиція успішно оновлена", order: existingOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося оновити позицію" });
    }
});
// Маршрут для видалення замовлення за ідентифікатором
app.delete('/api/admin/orders/:orderId',authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Перевірка чи існує замовлення з вказаним ідентифікатором
        const existingOrder = await ShopSchema.findById(orderId);
        if (!existingOrder) {
            return res.status(404).json({ message: "Замовлення не знайдено" });
        }

        // Видалення замовлення з бази даних
        await existingOrder.remove();

        res.status(200).json({ message: "Замовлення успішно видалено" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Не вдалося видалити замовлення" });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const { fullName, feedback } = req.body;
        const newFeedback = new Feedback({ fullName, feedback });
        await newFeedback.save();
        res.status(201).json({ success: true, message: 'Відгук збережено успішно.' });
    } catch (error) {
        console.error('Помилка при збереженні відгуку:', error);
        res.status(500).json({ success: false, message: 'Помилка при збереженні відгуку.' });
    }
});
app.get('/api/feedback', async (req, res) => {
    try {
        const feedbackList = await Feedback.find().sort({ date: -1 });
        res.status(200).json({ success: true, feedbackList });
    } catch (error) {
        console.error('Помилка при отриманні відгуків:', error);
        res.status(500).json({ success: false, message: 'Помилка при отриманні відгуків.' });
    }
});






const showAllProducts = async (ctx) => {
    try {
        const allProducts = await Product.find();

        if (allProducts.length > 0) {
            for (const product of allProducts) {
                const editButton = Markup.button.callback('🖊️ Редагувати', `editProduct_${product._id}`);
               

                const productMessage = `
                    Артикуль: ${product.itemProduct}
                    Назва: ${product.titleProduct}
                    Опис: ${product.aboutProduct}
                    Ціна: ${product.priceProduct}
                `;

                await ctx.reply(productMessage, Markup.inlineKeyboard([editButton, deleteButton]));
            }
        } else {
            ctx.reply('Немає доступних продуктів.');
        }
    } catch (error) {
        console.error(error);
        ctx.reply('Помилка під час отримання продуктів.');
    }
};
// login bot 
// const loginBot = process.env.loginAdminBot
// const passwordBot = process.env.passwordAdminBot

//Telegram-bot
bot.start(async (ctx) => {
    ctx.reply('Вітаю! Я бот Bathroom Shop. Чим я можу Вам допомогти?', {
        reply_markup: {
            keyboard: [
                ['📊 Перевірити статус замовлення'],
                ['✍️ Залишити відгук'],
                ['🏠 Повернутися на сайт']
            ],
            resize_keyboard: true,
        }
    });
});
bot.hears('📊 Перевірити статус замовлення', async (ctx) => { 
    ctx.reply('Введіть номер телефону для перевірки статусу замовлення:');

    
    const phoneHandler = async (ctx) => {
        const phoneNumber = ctx.message.text;

        const order = await Shop.findOne({ phoneNumber: phoneNumber });

        if (order) {
            ctx.reply(`Статус замовлення для номеру телефону ${phoneNumber}: ${order.acrivePosition}`);
        } else {
            ctx.reply(`Замовлення з номером телефону ${phoneNumber} не знайдено.`);
        }
        bot.removeListener('text', phoneHandler);
    };

    // Додаємо обробник тексту для отримання номеру телефону
    bot.on('text', phoneHandler);
});
bot.hears('✍️ Залишити відгук', async (ctx) => {
    try {
        ctx.reply('Введіть своє ім\'я:');

        // Обробник для отримання ім'я
        const nameHandler = async (ctx) => {
            const fullName = ctx.message.text;

            // Перевірка, чи ім'я не містить символів нового рядка
            if (fullName.includes('\n')) {
                ctx.reply('Ім\'я не повинно містити символів нового рядка. Будь ласка, введіть ще раз:');
                return;
            }

            ctx.reply('Тепер введіть свій відгук:');

            // Додаємо обробник для введення відгуку
            bot.on('text', feedbackHandler);

            // Зберігаємо ім'я в контексті
            ctx.session = { fullName };

            // Видаляємо обробник після завершення вводу ім'я
            bot.removeListener('text', nameHandler);
        };

        // Обробник для отримання відгуку
        const feedbackHandler = async (ctx) => {
            const userFeedback = ctx.message.text;

            // Зберігаємо відгук у базу даних
            const newFeedback = new Feedback({
                fullName: ctx.session.fullName,
                feedBack: userFeedback,
            });
            await newFeedback.save();

            ctx.reply('Дякуємо за ваш відгук!');

            // Видаляємо обробник після завершення вводу відгуку
            bot.removeListener('text', feedbackHandler);
        };

        // Додаємо обробник для введення ім'я
        bot.on('text', nameHandler);
    } catch (error) {
        console.error(error);
        ctx.reply('Помилка при обробці відгуку.');
    }
});
bot.hears('🏠 Повернутися на сайт', (ctx) => {
    const websiteLink = 'https://www.instagram.com/black_street_191/'; // Замініть це на ваше посилання

    ctx.replyWithHTML(`Переходьте на <a href="${websiteLink}">сайт</a>.`);
});

const loginBot = "Tasia";
const passwordBot = "bathroom";

bot.command('admin', async (ctx) => {
    ctx.reply('Введіть логін:');

    // Очікуємо логін від користувача
    bot.on('text', async (loginCtx) => {
        const loginText = loginCtx.message.text;

        if (loginText === loginBot) {
            ctx.reply('Введіть пароль:');

            // Очікуємо пароль від користувача
            bot.on('text', async (passwordCtx) => {
                const passwordText = passwordCtx.message.text;

                if (passwordText === passwordBot) {
                    // Логін та пароль вірні, виконуємо код для адміна

                    ctx.reply('Вітаю, адміністратор! Використовуйте кнопки для взаємодії.', {
                        reply_markup: {
                            keyboard: [
                                ['📋 Вивести продукти'],
                                ['🛒 Вивести замовлення']
                            ],
                            resize_keyboard: true,
                        }
                    });
                
                // Код для виведення всіх продуктів з кнопками редагування і видалення
                bot.hears('📋 Вивести продукти', async (ctx) => {
                    // Виведення продуктів при натисканні кнопки
                    await showAllProducts(ctx);
                });
                // Обробник для редагування обраного продукту
                bot.action(/^editProduct_(.+)$/, async (ctx) => {
                    try {
                        const productId = ctx.match[1];
                  
                        // Перевірка, чи існує продукт з вказаним ID
                        const existingProduct = await Product.findById(productId);
                        if (existingProduct) {
                            ctx.reply(`Ви редагуєте продукт:\nАртикуль: ${existingProduct.itemProduct}\nНазва: ${existingProduct.titleProduct}\nОпис: ${existingProduct.aboutProduct}\nЦіна: ${existingProduct.priceProduct}\n\nВведіть нову ціну:`);
                  
                            // Обробник введення нової назви
                            const textHandler = async (ctx) => {
                                const newPrice = ctx.message.text;
                  
                                // Ваш код для оновлення ціни
                                existingProduct.priceProduct = newPrice;
                                await existingProduct.save();
                  
                                ctx.reply('Ціну продукту оновлено успішно.');
                                bot.removeListener('text', textHandler); // Видаляємо обробник після завершення редагування
                
                                await showAllProducts(ctx);
                            };
                
                            // Додаємо обробник введення тексту
                            bot.on('text', textHandler);
                        } else {
                            ctx.reply('Продукт не знайдено.');
                        }
                    } catch (error) {
                        console.error(error);
                        ctx.reply('Помилка під час редагування продукту.');
                    }
                });
                
                bot.hears('🛒 Вивести замовлення', async (ctx) => {
                    await showAllOrders(ctx);
                });
                // Функція для відображення всіх замовлень
                async function showAllOrders(ctx) {
                    try {
                        const allShop = await Shop.find();
                
                        if (allShop.length > 0) {
                            for (const shop of allShop) {
                                const editButton = Markup.button.callback('🖊️ Редагувати статус', `editShopStatus_${shop._id}`);
                
                                const shopMessage = `
                                    Id: ${shop._id}
                                    ФІО: ${shop.firstName} ${shop.lastName}
                                    Номер телефону: ${shop.phoneNumber}
                                    Місто: ${shop.city}
                                    Пошта: ${shop.postOffice}
                                    Відділення: ${shop.numberPost}
                                    Товар: ${shop.productItems}
                                    Статус: ${shop.acrivePosition}
                                `;
                
                                await ctx.reply(shopMessage, Markup.inlineKeyboard([editButton]));
                            }
                        } else {
                            ctx.reply('Немає доступних замовлень.');
                        }
                    } catch (error) {
                        console.error(error);
                        ctx.reply('Помилка під час відтворення замовлення.');
                    }
                }
                
                // Обробник для запуску редагування статусу
                bot.action(/^editShopStatus_(.+)$/, async (ctx) => {
                    try {
                        const shopId = ctx.match[1];
                
                        // Перевірка, чи існує замовлення з вказаним ID
                        const existingShop = await Shop.findById(shopId);
                        if (existingShop) {
                            const buttons = ['🟡 Нове', '🟠 В обробці', '🔴 Відхилено', '🟢 Виконано'];
                
                            const markup = Markup.inlineKeyboard(
                                buttons.map((button) => Markup.button.callback(button, `editShopStatus_${shopId}_${button.toLowerCase()}`))
                            );
                
                            ctx.reply(`Ви готові редагувати статус замовлення:\n\n${existingShop.acrivePosition}\n\nНатисніть кнопку для зміни статусу:`, markup);
                        } else {
                            ctx.reply('Замовлення не знайдено.');
                        }
                    } catch (error) {
                        console.error(error);
                        ctx.reply('Помилка під час редагування статусу замовлення.');
                    }
                });
                
                // Обробник для зміни статусу замовлення
                bot.action(/^editShopStatus_(.+)_([a-z]+)$/, async (ctx) => {
                    const shopId = ctx.match[1];
                    const newStatus = ctx.match[2];
                
                    await handleStatusChange(ctx, shopId, newStatus);
                    await showAllOrders(ctx);
                });
                
                async function handleStatusChange(ctx, shopId, newStatus) {
                    try {
                        // Перевірка, чи існує замовлення з вказаним ID
                        const existingShop = await Shop.findById(shopId);
                        if (existingShop) {
                            existingShop.acrivePosition = newStatus;
                            await existingShop.save();
                
                            ctx.reply(`Статус замовлення оновлено на "${newStatus}" успішно.`);
                        } else {
                            ctx.reply('Замовлення не знайдено.');
                        }
                    } catch (error) {
                        console.error(error);
                        ctx.reply(`Помилка під час редагування статусу замовлення на "${newStatus}".`);
                    }
                }
                } else {
                    ctx.reply('Неправильний пароль.');
                    ctx.telegram.sendCommand(ctx.from.id, 'start'); // Викликаємо команду /start
                }
            });
        } else {
            ctx.reply('Неправильний логін.');
            ctx.telegram.sendCommand(ctx.from.id, 'start');
        }
    });
});






bot.launch().then(() => {
    console.log('Bot started');
});

app.listen(PORT, (err) => {
    if (err) {
        return console.log(err);
    } else {
        console.log('Server OK');
    }
});
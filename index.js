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
import feedback from "./model/feedback.js";
import multer from "multer";





dotenv.config();

const dbConnectionString = process.env.DB_CONNECTION_STRING;
const secretKey = process.env.SECRET_KEY;
const botToken = '6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA';

const PORT = process.env.PORT || 2222

mongoose.connect(dbConnectionString)
.then(()=>{console.log('DB ok')})
.catch((err)=> {console.log('DB error', err)});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
      const uniquePrefix = shortid.generate().substring(0, 4);
      cb(null, uniquePrefix + '_' + file.originalname); // Унікальне ім'я файлу
    },
  });
  
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 5, // 5 MB
    },
  });



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
app.post('/api/admin/product', authenticateToken, upload.single('avatarUrl'), async (req, res) => {
    try {
      const { titleProduct, aboutProduct, priceProduct, category } = req.body;
  
      if (!titleProduct || !aboutProduct || !priceProduct) {
        return res.status(400).json({ message: "Please provide all required fields." });
      }
      
        const serverUrl = "https://bathroom-shop-api.onrender.com";
        const fullUrl = req.file ? req.file.path : '';
        const avatarUrl = `${serverUrl}/${fullUrl}`;

    //   const avatarUrl = req.file ? req.file.path : ''; 
  
      const itemProduct = shortid.generate().substring(0, 4);
  
      const newProduct = new ProductSchema({
        avatarUrl,
        itemProduct,
        titleProduct,
        category,
        aboutProduct,
        priceProduct,
      });
  
      await newProduct.save();
  
      res.status(201).json({ message: "Товар успішно додано", product: newProduct });
    } catch (error) {
      console.error(error);
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
        const newFeedback = new FeedbackSchema({ fullName, feedback });
        await newFeedback.save();
        res.status(201).json({ success: true, message: 'Відгук збережено успішно.' });
    } catch (error) {
        console.error('Помилка при збереженні відгуку:', error);
        res.status(500).json({ success: false, message: 'Помилка при збереженні відгуку.' });
    }
});
app.get('/api/feedback', async (req, res) => {
    try {
        const feedbackList = await FeedbackSchema.find().sort({ date: -1 });
        res.status(200).json({ success: true, feedbackList });
    } catch (error) {
        console.error('Помилка при отриманні відгуків:', error);
        res.status(500).json({ success: false, message: 'Помилка при отриманні відгуків.' });
    }
});
app.get('/api/admin/feedback',authenticateToken, async (req, res) => {
    try {
        const feedbackList = await FeedbackSchema.find().sort({ date: -1 });
        res.status(200).json({ success: true, feedbackList });
    } catch (error) {
        console.error('Помилка при отриманні відгуків:', error);
        res.status(500).json({ success: false, message: 'Помилка при отриманні відгуків.' });
    }
});
app.delete('/api/admin/feedback/:feedbackId', authenticateToken, async (req, res) => {
    const feedbackId = req.params.id;
  
    try {
      // Ваша логіка для видалення відгуку за його ідентифікатором
      await FeedbackSchema.findByIdAndDelete(feedbackId);
  
      res.status(200).json({ success: true, message: 'Відгук успішно видалено.' });
    } catch (error) {
      console.error('Помилка при видаленні відгуку:', error);
      res.status(500).json({ success: false, message: 'Помилка при видаленні відгуку.' });
    }
  });





// const showAllProducts = async (ctx) => {
//     try {
//         const allProducts = await Product.find();

//         if (allProducts.length > 0) {
//             for (const product of allProducts) {
//                 const editButton = Markup.button.callback('🖊️ Редагувати', `editProduct_${product._id}`);
               

//                 const productMessage = `
//                     Артикуль: ${product.itemProduct}
//                     Назва: ${product.titleProduct}
//                     Опис: ${product.aboutProduct}
//                     Ціна: ${product.priceProduct}
//                 `;

//                 await ctx.reply(productMessage, Markup.inlineKeyboard([editButton]));
//             }
//         } else {
//             ctx.reply('Немає доступних продуктів.');
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.reply('Помилка під час отримання продуктів.');
//     }
// };


// //Telegram-bot
// bot.start(async (ctx) => {
//     ctx.reply('Вітаю! Я бот Bathroom Shop. Чим я можу Вам допомогти?', {
//         reply_markup: {
//             keyboard: [
//                 ['📊 Перевірити статус замовлення'],
//                 ['✍️ Залишити відгук'],
//                 ['🏠 Повернутися на сайт']
//             ],
//             resize_keyboard: true,
//         }
//     });
// });
// bot.hears('📊 Перевірити статус замовлення', async (ctx) => { 
//     ctx.reply('Введіть номер телефону для перевірки статусу замовлення:');

    
//     const phoneHandler = async (ctx) => {
//         const phoneNumber = ctx.message.text;

//         const order = await Shop.findOne({ phoneNumber: phoneNumber });

//         if (order) {
//             ctx.reply(`Статус замовлення для номеру телефону ${phoneNumber}: ${order.acrivePosition}`);
//         } else {
//             ctx.reply(`Замовлення з номером телефону ${phoneNumber} не знайдено.`);
//         }
//     };

//     // Додаємо обробник тексту для отримання номеру телефону
//     bot.on('text', phoneHandler);
// });
// bot.hears('🏠 Повернутися на сайт', (ctx) => {
//     const websiteLink = 'https://www.instagram.com/black_street_191/'; // Замініть це на ваше посилання

//     ctx.replyWithHTML(`Переходьте на <a href="${websiteLink}">сайт</a>.`);
// });
// let stopListeningMessages = false;
// const feedBackTXT = async (ctx, userName) => {

//     if (!stopListeningMessages) {
//     return new Promise(async (resolve, reject) => {
//         const feedbackText = ctx.message.text;

//         // Зберегти відгук у базі даних
//         const newFeedback = new Feedback({
//             fullName: userName,
//             feedback: feedbackText,
//         });

//         try {
//             const savedFeedback = await newFeedback.save();
//             console.log("Відгук збережено:", savedFeedback);
//             await ctx.reply(`Дякуємо за ваш відгук, ${userName}!`);
//             resolve();  // Викликаємо resolve, щоб позначити успішне завершення
//             stopListeningMessages = true;
//         } catch (error) {
//             console.error("Помилка при збереженні відгуку:", error);
//             await ctx.reply('Виникла помилка при збереженні відгуку.');
//             reject(error);  // Викликаємо reject у випадку помилки
//         }
//     });}
// };

// bot.hears('✍️ Залишити відгук', async (ctx) => {
//     // Отримання імені з повідомлення
//     const userName = ctx.message.from.first_name;

//     // Запитання про відгук
//     ctx.reply(`Привіт, ${userName}! Тепер введіть ваш відгук:`);

//     // Очікування відповіді на питання відгуку
//     bot.on('text', async (ctx) => {
//         try {
//             await feedBackTXT(ctx, userName);
//             // Тут можна додаткові дії, якщо потрібно
//         } catch (error) {
//             console.error('Помилка при обробці відгуку:', error);
//             // Обробка помилок, якщо необхідно
//         }
//     });
// });






// bot.command('admin', async (ctx) => {
//     ctx.reply('Вітаю, адміністратор! Використовуйте кнопки для взаємодії.', {
//         reply_markup: {
//             keyboard: [
//                 ['📋 Вивести продукти'],
//                 ['🛒 Вивести замовлення'],
//                 ['💬 Вивести відгуки']
//             ],
//             resize_keyboard: true,
//         }
//     });
// });            
// // Код для виведення всіх продуктів з кнопками редагування і видалення
// bot.hears('📋 Вивести продукти', async (ctx) => {
//     // Виведення продуктів при натисканні кнопки
//     await showAllProducts(ctx);
// });
// // Обробник для редагування обраного продукту
// bot.action(/^editProduct_(.+)$/, async (ctx) => {
//     try {
//         const productId = ctx.match[1];
    
//         // Перевірка, чи існує продукт з вказаним ID
//         const existingProduct = await Product.findById(productId);
//         if (existingProduct) {
//             ctx.reply(`Ви редагуєте продукт:\nАртикуль: ${existingProduct.itemProduct}\nНазва: ${existingProduct.titleProduct}\nОпис: ${existingProduct.aboutProduct}\nЦіна: ${existingProduct.priceProduct}\n\nВведіть нову ціну:`);
    
//             // Обробник введення нової назви
//             const textHandler = async (ctx) => {
//                 const newPrice = ctx.message.text;
    
//                 // Ваш код для оновлення ціни
//                 existingProduct.priceProduct = newPrice;
//                 await existingProduct.save();
    
//                 ctx.reply('Ціну продукту оновлено успішно.');

//                 await showAllProducts(ctx);
//             };

//             // Додаємо обробник введення тексту
//             bot.on('text', textHandler);
//         } else {
//             ctx.reply('Продукт не знайдено.');
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.reply('Помилка під час редагування продукту.');
//     }
// });

// bot.hears('🛒 Вивести замовлення', async (ctx) => {
//     await showAllOrders(ctx);
// });
// // Функція для відображення всіх замовлень
// async function showAllOrders(ctx) {
//     try {
//         const allShop = await Shop.find();

//         if (allShop.length > 0) {
//             for (const shop of allShop) {
//                 const editButton = Markup.button.callback('🖊️ Редагувати статус', `editShopStatus_${shop._id}`);

//                 const shopMessage = `
//                     Id: ${shop._id}
//                     ФІО: ${shop.firstName} ${shop.lastName}
//                     Номер телефону: ${shop.phoneNumber}
//                     Місто: ${shop.city}
//                     Пошта: ${shop.postOffice}
//                     Відділення: ${shop.numberPost}
//                     Товар: ${shop.productItems}
//                     Статус: ${shop.acrivePosition}
//                 `;

//                 await ctx.reply(shopMessage, Markup.inlineKeyboard([editButton]));
//             }
//         } else {
//             ctx.reply('Немає доступних замовлень.');
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.reply('Помилка під час відтворення замовлення.');
//     }
// }
// // Обробник для запуску редагування статусу
// bot.action(/^editShopStatus_(.+)$/, async (ctx) => {
//     try {
//         const shopId = ctx.match[1];

//         // Перевірка, чи існує замовлення з вказаним ID
//         const existingShop = await Shop.findById(shopId);
//         if (existingShop) {
//             const buttons = ['🟡 Нове', '🟠 В обробці', '🔴 Відхилено', '🟢 Виконано'];

//             const markup = Markup.inlineKeyboard(
//                 buttons.map((button) => Markup.button.callback(button, `editShopStatus_${shopId}_${button.toLowerCase()}`))
//             );

//             ctx.reply(`Ви готові редагувати статус замовлення:\n\n${existingShop.acrivePosition}\n\nНатисніть кнопку для зміни статусу:`, markup);
//         } else {
//             ctx.reply('Замовлення не знайдено.');
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.reply('Помилка під час редагування статусу замовлення.');
//     }
// });

// // Обробник для зміни статусу замовлення
// bot.hears('💬 Вивести відгуки', async (ctx) => {
//     await showAllFeedback(ctx);
// });

// async function showAllFeedback(ctx) {
//     try {
//         const allFeedback = await Feedback.find();

//         if (allFeedback.length > 0) {
//             for (const feedback of allFeedback) {
//                 const feedbackMessage = `
//                     Id: ${feedback._id}
//                     ФІО: ${feedback.fullName}
//                     Дата: ${feedback.date}
//                     Відгук: ${feedback.feedback}
//                 `;
//                 // Виводимо кожен відгук
//                 ctx.reply(feedbackMessage);
//             }
//         } else {
//             ctx.reply('Немає доступних відгуків.');
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.reply('Помилка під час відтворення відгуків.');
//     }
// }








// bot.launch().then(() => {
//     console.log('Bot started');
// });
// bot.on('polling_error', (error) => {
//     console.error('Polling error:', error);

//     // Тут можна додати код для відновлення бота, наприклад, викликати bot.launch() знову
//     bot.launch().then(() => {
//         console.log('Bot restarted');
//     });
// });

app.listen(PORT, (err) => {
    if (err) {
        return console.log(err);
    } else {
        console.log('Server OK');
    }
});
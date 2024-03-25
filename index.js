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
import TelegramBot from "node-telegram-bot-api";
import feedback from "./model/feedback.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import url from "url";



dotenv.config();
const dbConnectionString = process.env.DB_CONNECTION_STRING;
const secretKey = process.env.SECRET_KEY;
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
app.use('/uploads', express.static('uploads'));
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
app.post('/api/admin/product', authenticateToken, upload.single('avatarUrl'), async (req, res) => {
    try {
      const { titleProduct, aboutProduct, priceProduct, category } = req.body;
      
        // const serverUrl = "https://bathroom-shop-api.onrender.com";
        const serverUrl = "http://localhost:222/";
        const fullUrl = req.file ? req.file.path : '';
        const avatarUrl = `${serverUrl}${fullUrl}`;

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
app.put('/api/admin/product/:productId', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.productId;
        const { titleProduct, category, aboutProduct, priceProduct } = req.body;

        // Перевірка, чи існує товар з вказаним ID
        const existingProduct = await ProductSchema.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: "Товар не знайдено" });
        }

        // Оновлення властивостей товару
        existingProduct.titleProduct = titleProduct;
        existingProduct.category = category;
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
// app.delete('/api/admin/product/:productId', authenticateToken, async (req, res) => {
//     try {
//         const productId = req.params.productId;

//         // Перевірка, чи існує товар з вказаним ID
//         const existingProduct = await ProductSchema.findById(productId);
//         if (!existingProduct) {
//             return res.status(404).json({ message: "Товар не знайдено" });
//         }

//         // Видалення товару
//         await ProductSchema.deleteOne({ _id: productId });

//         res.json({ message: "Товар успішно видалено" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Не вдалося видалити товар" });
//     }
// });

app.delete('/api/admin/product/:id', authenticateToken, async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await ProductSchema.findById(productId);
  
      if (!product) {
        return res.status(404).json({ message: "Товар не знайдено" });
      }
  
      // Отримати ім'я файлу з URL-шляху
      const parsedUrl = url.parse(product.avatarUrl);
      const filename = path.basename(parsedUrl.pathname);
      // Скласти абсолютний шлях до файлу на сервері
      const uploadsDirectory = path.join('uploads');
      const filePath = path.join(uploadsDirectory, filename);
  
      // Видалити файл
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Помилка при видаленні файлу" });
        }
        console.log(`Файл ${filename} успішно видалено`);
      });
  
      // Потім можна видалити товар з бази даних
      await product.deleteOne();
  
      res.status(200).json({ message: "Товар успішно видалено" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Помилка під час видалення товару" });
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
            position: 'new',
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
        await ShopSchema.deleteOne({ _id: orderId });

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
    const feedbackId = req.params.feedbackId;
  
    try {
      // Ваша логіка для видалення відгуку за його ідентифікатором
      await FeedbackSchema.findByIdAndDelete(feedbackId);
  
      res.status(200).json({ success: true, message: 'Відгук успішно видалено.' });
    } catch (error) {
      console.error('Помилка при видаленні відгуку:', error);
      res.status(500).json({ success: false, message: 'Помилка при видаленні відгуку.' });
    }
  });




// Підключення до бази даних MongoDB
mongoose.connect('mongodb+srv://Admin:Black.Street818@bathroom-shop.29wete0.mongodb.net/market?retryWrites=true&w=majority');
const db = mongoose.connection;

// Перевірка з'єднання з базою даних
db.on('error', console.error.bind(console, 'Помилка підключення до бази даних:'));
db.once('open', function() {
  console.log('З`єднання з базою даних встановлено!');
});

// Створення схеми для моделі клієнта
const clientSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  telegramId: {
    type: Number,
    unique: true
  }
});

// Створення моделі клієнта
const Client = mongoose.model('Client', clientSchema);
// Створення схеми для моделі акційних пропозицій
const offerSchema = new mongoose.Schema({
    title: String,
    description: String,
    photo: String
  });
  
  // Створення моделі акційних пропозицій
  const Offer = mongoose.model('Offer', offerSchema);

const bot = new TelegramBot('6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA');


// Обробник команди /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const telegramId = msg.from.id;
        const firstName = msg.from.first_name;
        const lastName = msg.from.last_name;

        // Перевірка наявності клієнта в базі даних
        let client = await Client.findOne({ telegramId });

        if (!client) {
            // Якщо клієнт не знайдений, створення нового клієнта
            client = new Client({
                telegramId,
                firstName,
                lastName
            });
            await client.save();
        }

        // Відправлення вітання разом з клавіатурою
        bot.sendMessage(chatId, 'Ласкаво просимо у Bathroom Shop', {
            reply_markup: {
                keyboard: [
                    ['📊 Перевірити статус замовлення'], 
                    ['📝 Залишити відгук'],
                    ['🏠 Повернутися на сайт']
                ],
                resize_keyboard: true
            }
        });
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Сталася помилка. Будь ласка, спробуйте ще раз пізніше.');
    }
});

// Обробник кнопки "Перевірити статус замовлення"
// Обробник кнопки "Перевірити статус замовлення"
bot.onText(/📊 Перевірити статус замовлення/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Введіть номер телефону для перевірки статусу замовлення: У форматі +380XXXXXXXXX');

  // Обробка відповіді на команду "Перевірити статус замовлення"
  bot.once('text', async (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;

    // Перевірка, чи було введено номер телефону для перевірки статусу замовлення
    if (text.startsWith('+')) {
      try {
        const order = await Shop.findOne({ phoneNumber: text });

        if (order) {
          let statusMessage = '';

          // Визначення відповідного повідомлення про статус замовлення за допомогою switch
          switch (order.position) {
            case 'new':
              statusMessage = 'Заявка у обробці';
              break;
            case 'processing':
              statusMessage = 'Замовлення у роботі';
              break;
            case 'rejection':
              statusMessage = 'Замовлення скасовано';
              break;
            case 'done':
              statusMessage = `Замовлення відправлено. Номер ТТН: ${order.ttn}`;
              break;
            default:
              statusMessage = 'Статус замовлення невідомий';
          }

          bot.sendMessage(chatId, `Статус замовлення для номеру телефону ${text}: ${statusMessage}`);
        } else {
          bot.sendMessage(chatId, `Замовлення з номером телефону ${text} не знайдено.`);
        }
      } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Виникла помилка при перевірці статусу замовлення.');
      }
    }
  });
});



// Обробник кнопки "Повернутися на сайт"
bot.onText(/🏠 Повернутися на сайт/, (msg) => {
    const chatId = msg.chat.id;
    const websiteLink = 'https://www.instagram.com/black_street_191/';
    bot.sendMessage(chatId, `Переходьте на сайт: ${websiteLink}`);
});

// Обробник кнопки "Залишити відгук"
bot.onText(/📝 Залишити відгук/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привіт! Введіть будь ласка ваш відгук:');
    bot.once('text', async (msg) => {
      const text = msg.text;
      const chatId = msg.chat.id;

      try {
          // Збереження відгуку у базі даних
          const newFeedback = new Feedback({
              fullName: msg.from.first_name,
              feedback: text
          });
          await newFeedback.save();

          // Підтвердження користувачу про успішне збереження відгуку
          bot.sendMessage(chatId, `Дякуємо за ваш відгук, ${msg.from.first_name}!`);
      } catch (error) {
          console.error(error);
          bot.sendMessage(chatId, 'Виникла помилка при збереженні відгуку.');
      }
  });
});

// Об'єкт для зберігання паролів адміністраторів
const admins = {
    [process.env.ADMIN_LOGIN]: process.env.ADMIN_PASSWORD
};
// Обробник команди /admin
// Обробник команди "/admin"
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Відправка повідомлення для введення логіну та паролю
        bot.sendMessage(chatId, 'Введіть логін:', { reply_markup: { force_reply: true } })
            .then(() => {
                // Встановлюємо обробник подій для отримання логіну
                bot.once('message', async (loginMsg) => {
                    const login = loginMsg.text.trim();
                    
                    // Перевірка чи існує користувач з таким логіном
                    if (admins.hasOwnProperty(login)) {
                        // Відправка повідомлення для введення паролю
                        bot.sendMessage(chatId, 'Введіть пароль:', { reply_markup: { force_reply: true } })
                            .then(() => {
                                // Встановлюємо обробник подій для отримання паролю
                                bot.once('message', async (passwordMsg) => {
                                    const password = passwordMsg.text.trim();

                                    // Перевірка чи вірний пароль
                                    if (admins[login] === password) {
                                        // Якщо пароль вірний, надаємо доступ до функцій адміністратора
                                        bot.sendMessage(chatId, 'Вітаємо, адміністраторе! Використовуйте кнопки для взаємодії.', {
                                            reply_markup: {
                                                keyboard: [
                                                    ['📋 Вивести продукти'],
                                                    ['🛒 Вивести замовлення'],
                                                    ['💬 Вивести відгуки'],
                                                    ['Надіслати акційну пропозицію']
                                                ],
                                                resize_keyboard: true,
                                            }
                                        });
                                    } else {
                                        // Якщо пароль невірний
                                        bot.sendMessage(chatId, 'Невірний пароль. Будь ласка, спробуйте ще раз.');
                                    }
                                });
                            });
                    } else {
                        // Якщо користувач з введеним логіном не знайдений
                        bot.sendMessage(chatId, 'Користувача з таким логіном не знайдено. Будь ласка, спробуйте ще раз.');
                    }
                });
            });
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Виникла помилка. Будь ласка, спробуйте ще раз пізніше.');
    }
});
// Обробник кнопки "Вивести продукти"
bot.onText(/📋 Вивести продукти/, async (msg) => {
  const chatId = msg.chat.id;
  // Виклик функції для виведення всіх продуктів
  await showAllProducts(chatId);
});
// Обробник кнопки "Вивести замовлення"
bot.onText(/🛒 Вивести замовлення/, async (msg) => {
  const chatId = msg.chat.id;
  // Виклик функції для виведення всіх замовлень
  await showAllOrders(chatId);
});
// Обробник кнопки "Вивести відгуки"
bot.onText(/💬 Вивести відгуки/, async (msg) => {
  const chatId = msg.chat.id;
  // Виклик функції для виведення всіх відгуків
  await showAllFeedback(chatId);
});
// Відображення товарів разом із кнопками "Редагувати" та "Видалити"
// Оголошення обробника подій поза функцією
bot.on('callback_query', async query => {
    const action = query.data.split('_')[0];
    const productId = query.data.split('_')[2];
    const chatId = query.message.chat.id;

    try {
        if (action === 'edit') {
            const product = await Product.findById(productId);

            if (product) {
                bot.sendMessage(chatId, `Поточна ціна: ${product.priceProduct}. Введіть нову ціну:`);

                // Обробник подій для введення нової ціни
                const priceHandler = async msg => {
                    const newPrice = parseFloat(msg.text);

                    // Видаляємо обробник подій після виконання
                    bot.removeListener('message', priceHandler);

                    if (!isNaN(newPrice)) {
                        await Product.findByIdAndUpdate(productId, { priceProduct: newPrice });
                        bot.sendMessage(chatId, 'Ціна товару успішно оновлена.');
                    } else {
                        bot.sendMessage(chatId, 'Некоректно введена ціна. Будь ласка, спробуйте ще раз.');
                    }
                };

                // Додаємо обробник подій для введення нової ціни
                bot.on('message', priceHandler);
            } else {
                bot.sendMessage(chatId, 'Товар не знайдено.');
            }
        } else if (action === 'delete') {
            await Product.findByIdAndDelete(productId);
            bot.sendMessage(chatId, 'Товар успішно видалений.');
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Виникла помилка при обробці запиту.');
    }
});

// Функція для виведення всіх продуктів
async function showAllProducts(chatId) {
    try {
        const allProducts = await Product.find();

        if (allProducts.length > 0) {
            allProducts.forEach(product => {
                const productInfo = `
                    ID: ${product._id}
                    Назва: ${product.titleProduct}
                    Опис: ${product.aboutProduct}
                    Ціна: ${product.priceProduct}
                `;

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'Редагувати', callback_data: `edit_product_${product._id}` },
                                { text: 'Видалити', callback_data: `delete_product_${product._id}` }
                            ]
                        ]
                    }
                };

                // Відправляємо інформацію про товар разом з кнопками
                bot.sendMessage(chatId, productInfo, keyboard);
            });
        } else {
            bot.sendMessage(chatId, 'Немає доступних продуктів.');
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Помилка під час відтворення продуктів.');
    }
}

bot.onText(/💯 Надіслати акційну пропозицію/, (msg) => {
    const chatId = msg.chat.id;

    try {
        // Надсилання першого повідомлення для введення тексту акційної пропозиції
        bot.sendMessage(chatId, 'Будь ласка, введіть текст для акційної пропозиції:').then(() => {
            // Встановлення обробника події для отримання тексту акційної пропозиції
            bot.once('text', async (offerMsg) => {
                const offerText = offerMsg.text;
                try {
                    // Надсилання другого повідомлення для надсилання фото
                    bot.sendMessage(chatId, 'Будь ласка, надішліть фото для акційної пропозиції:').then(() => {
                        // Встановлення обробника події для отримання фото
                        bot.once('photo', async (photoMsg) => {
                            const photo = photoMsg.photo[photoMsg.photo.length - 1].file_id;
                            try {
                                // Надсилання акційної пропозиції разом з текстом та фото усім клієнтам
                                await sendOfferToClients(offerText, photo);
                                bot.sendMessage(chatId, 'Акційна пропозиція була успішно відправлена всім клієнтам!');
                            } catch (error) {
                                console.error('Помилка при відправленні акційної пропозиції:', error);
                                bot.sendMessage(chatId, 'Сталася помилка. Будь ласка, спробуйте ще раз пізніше.');
                            }
                        });
                    });
                } catch (error) {
                    console.error('Помилка при надсиланні повідомлення для фото:', error);
                    bot.sendMessage(chatId, 'Сталася помилка. Будь ласка, спробуйте ще раз пізніше.');
                }
            });
        });
    } catch (error) {
        console.error('Помилка при надсиланні першого повідомлення:', error);
        bot.sendMessage(chatId, 'Сталася помилка. Будь ласка, спробуйте ще раз пізніше.');
    }
});

// Функція для відправки акційної пропозиції всім клієнтам
async function sendOfferToClients(offerText, photo) {
    try {
        // Отримуємо список всіх клієнтів з бази даних
        const clients = await Client.find();
        
        // Перебираємо усіх клієнтів та відправляємо акційну пропозицію кожному з них
        clients.forEach(async (client) => {
            const chatId = client.telegramId;
            try {
                // Відправляємо акційну пропозицію кожному клієнту разом з фото та текстом
                await bot.sendPhoto(chatId, photo, { caption: offerText });
            } catch (error) {
                console.error(`Помилка при відправленні акційної пропозиції клієнту з ID ${chatId}:`, error);
            }
        });
    } catch (error) {
        throw new Error('Помилка при відправленні акційної пропозиції клієнтам');
    }
}








// Перевірка, чи було вже відправлено повідомлення у цей чат
function chatAlreadyNotified(chatId) {
    const messagesSent = bot.sentinChatIds || [];
    if (messagesSent.includes(chatId)) {
        return true;
    } else {
        bot.sentinChatIds = [...messagesSent, chatId];
        return false;
    }
}


// Функція для відображення всіх замовлень
async function showAllOrders(chatId) {
    try {
        const allOrders = await Shop.find();

        if (allOrders.length > 0) {
            allOrders.forEach(order => {
                const orderInfo = `
                    ID: ${order._id}
                    Клієнт: ${order.firstName} ${order.lastName}
                    Телефон: ${order.phoneNumber}
                    Місто: ${order.city}
                    Відділення: ${order.numberPost}
                    Товар: ${order.productItems.map(item => `${item.title} (${item.quantity} шт.)`).join(', ')}
                    Статус: ${order.position}
                    ТТН: ${order.ttn || 'не вказано'}
                    Загальна сума: ${order.totalAmount} грн
                `;

                const buttons = {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{ text: 'Редагувати', callback_data: `edit_${order._id}` }]
                        ]
                    })
                };

                bot.sendMessage(chatId, orderInfo, buttons);
            });
        } else {
            bot.sendMessage(chatId, 'Немає доступних замовлень.');
        }

        // Обробник подій в межах функції
        bot.on('callback_query', async (query) => {
            const [action, orderId, newStatus] = query.data.split('_');
            try {
                if (action === 'edit') {
                    const buttons = {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [{ text: 'Нове', callback_data: `status_${orderId}_new` }],
                                [{ text: 'В обробці', callback_data: `status_${orderId}_processing` }],
                                [{ text: 'Відхилено', callback_data: `status_${orderId}_rejection` }],
                                [{ text: 'Відправлено', callback_data: `status_${orderId}_done` }]
                            ]
                        })
                    };
                    bot.editMessageText('Оберіть новий статус:', {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        reply_markup: buttons.reply_markup
                    });
                } else {
                    let order = await Shop.findById(orderId);
                    order.position = newStatus;
                    await order.save();
                    if (newStatus === 'done') {
                        bot.sendMessage(query.message.chat.id, 'Введіть ТТН:').then(() => {
                            bot.once('message', async (message) => {
                                try {
                                    // Знаходимо замовлення за допомогою методу findOne
                                    let order = await Shop.findById(orderId);

                                    // Перевіряємо, чи було успішно знайдено замовлення
                                    if (order) {
                                        // Якщо замовлення знайдено, встановлюємо властивість 'ttn'
                                        order.ttn = message.text;
                                        await order.save();
                                        showAllOrders(query.message.chat.id);
                                    } else {
                                        // Якщо замовлення не знайдено, повідомляємо про помилку
                                        bot.sendMessage(query.message.chat.id, 'Замовлення не знайдено. Помилка при збереженні ТТН.');
                                    }
                                } catch (error) {
                                    console.error(error);
                                    bot.sendMessage(query.message.chat.id, 'Помилка під час збереження ТТН.');
                                }
                            });
                        });
                    } else {
                        showAllOrders(query.message.chat.id);
                    }
                }
            } catch (error) {
                console.error(error);
                bot.sendMessage(query.message.chat.id, 'Помилка під час зміни статусу замовлення.');
            }
        });

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Помилка під час відтворення замовлень.');
    }
}








// Функція для відображення всіх відгуків
async function showAllFeedback(chatId) {
    try {
        const allFeedback = await Feedback.find();

        if (allFeedback.length > 0) {
            allFeedback.forEach(feedback => {
                const feedbackInfo = `
                    ID: ${feedback._id}
                    Користувач: ${feedback.fullName}
                    Відгук: ${feedback.feedback}
                `;
                bot.sendMessage(chatId, feedbackInfo);
            });
        } else {
            bot.sendMessage(chatId, 'Немає доступних відгуків.');
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Помилка під час відтворення відгуків.');
    }
}

// Починаємо слухати запити
bot.startPolling();

app.listen(PORT, (err) => {
    if (err) {
        return console.log(err);
    } else {
        console.log('Server OK');
    }
});

// import { Telegraf, Markup } from 'telegraf';
// import mongoose from 'mongoose';
// import Product from './model/product.js';

// const botToken = '6892150968:AAFwvoDUEsp2_xrMfNobKhR9EY1qqSWMxpA';
// const dbConnectionString = 'mongodb+srv://Admin:Black.Street818@bathroom-shop.29wete0.mongodb.net/market?retryWrites=true&w=majority';

// const bot = new Telegraf(botToken);

// mongoose.connect(dbConnectionString, { useNewUrlParser: true, useUnifiedTopology: true });


// bot.start((ctx) => {
//   ctx.reply('Вітаю! Я бот для замовлень. Використовуйте кнопки для взаємодії.',
//       Markup.keyboard([
//           ['📋 Вивести продукти', '🔄 Редагувати продукт'],
//           ['🗑️ Видалити продукт']
//       ]).resize().extra()
//   );
// });

// // Команда для виведення всіх продуктів
// bot.hears('📋 Вивести продукти', async (ctx) => {
//   // Ваш код для виведення всіх продуктів з бази даних
//   // Приклад:
//   try {
//       const allProducts = await Product.find();

//       if (allProducts.length > 0) {
//           const productMessages = allProducts.map(product => `
//               ID: ${product._id}
//               Назва: ${product.titleProduct}
//               Опис: ${product.aboutProduct}
//               Ціна: ${product.priceProduct}
//               ------
//           `);
//           ctx.reply(productMessages.join('\n'));
//       } else {
//           ctx.reply('Немає доступних продуктів.');
//       }
//   } catch (error) {
//       console.error(error);
//       ctx.reply('Помилка під час отримання продуктів.');
//   }
// });

// // Команда для редагування продукту
// bot.command('editProduct', async (ctx) => {
//   try {
//       const allProducts = await Product.find();

//       if (allProducts.length > 0) {
//           const productButtons = allProducts.map(product => [Markup.button.callback(product.titleProduct, `editProduct_${product._id}`)]);
//           const keyboard = Markup.inlineKeyboard(productButtons);
//           ctx.reply('Оберіть продукт для редагування:', keyboard);
//       } else {
//           ctx.reply('Немає доступних продуктів.');
//       }
//   } catch (error) {
//       console.error(error);
//       ctx.reply('Помилка під час отримання продуктів.');
//   }
// });

// // Обробник для редагування обраного продукту
// bot.action(/^editProduct_(.+)$/, async (ctx) => {
//   try {
//       const productId = ctx.match[1];

//       // Перевірка, чи існує продукт з вказаним ID
//       const existingProduct = await Product.findById(productId);
//       if (existingProduct) {
//           // Ваш код для відправлення повідомлення та очікування введення від користувача для редагування
//           // Приклад:
//           ctx.reply(`Ви редагуєте продукт:\nНазва: ${existingProduct.titleProduct}\nОпис: ${existingProduct.aboutProduct}\nЦіна: ${existingProduct.priceProduct}\n\nВведіть нову назву:`);

//           // Обробник введення нової назви
//           bot.on('text', async (ctx) => {
//               const newTitle = ctx.message.text;

//               // Ваш код для оновлення назви продукту
//               // Приклад:
//               existingProduct.titleProduct = newTitle;
//               await existingProduct.save();

//               ctx.reply('Назву продукту оновлено успішно.');
//               bot.removeListener('text'); // Видаляємо обробник після завершення редагування
//           });
//       } else {
//           ctx.reply('Продукт не знайдено.');
//       }
//   } catch (error) {
//       console.error(error);
//       ctx.reply('Помилка під час редагування продукту.');
//   }
// });

// // Команда для видалення продукту
// bot.command('deleteProduct', async (ctx) => {
//   try {
//       const allProducts = await Product.find();

//       if (allProducts.length > 0) {
//           const productButtons = allProducts.map(product => [Markup.button.callback(product.titleProduct, `deleteProduct_${product._id}`)]);
//           const keyboard = Markup.inlineKeyboard(productButtons);
//           ctx.reply('Оберіть продукт для видалення:', keyboard);
//       } else {
//           ctx.reply('Немає доступних продуктів для видалення.');
//       }
//   } catch (error) {
//       console.error(error);
//       ctx.reply('Помилка під час отримання продуктів.');
//   }
// });

// // Обробник для видалення обраного продукту
// bot.action(/^deleteProduct_(.+)$/, async (ctx) => {
//   try {
//       const productId = ctx.match[1];

//       // Перевірка, чи існує продукт з вказаним ID
//       const existingProduct = await Product.findById(productId);
//       if (existingProduct) {
//           // Ваш код для підтвердження видалення та видалення продукту
//           // Приклад:
//           ctx.reply('Ви впевнені, що хочете видалити цей продукт? (Так/Ні)');

//           // Обробник введення користувача
//           bot.on('text', async (ctx) => {
//               const userResponse = ctx.message.text.toLowerCase();

//               if (userResponse === 'так') {
//                   // Ваш код для видалення продукту
//                   // Приклад:
//                   await existingProduct.remove();

//                   ctx.reply('Продукт видалено успішно.');
//               } else {
//                   ctx.reply('Видалення продукту скасовано.');
//               }

//               bot.removeListener('text'); // Видаляємо обробник після завершення видалення
//           });
//       } else {
//           ctx.reply('Продукт не знайдено.');
//       }
//   } catch (error) {
//       console.error(error);
//       ctx.reply('Помилка під час видалення продукту.');
//   }
// });



// export default bot;
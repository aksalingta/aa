const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();
const token = process.env.BOT_TOKEN;
const MODERATION_CHANNEL_ID = '@Nmsssssssdasdasdasd'; // канал для модерации
const POSTS_CHANNEL_ID = '@NM_Nizhnevartovsk'; // канал для опубликованных постов
const REJECTION_CHANNEL_ID = '@sckghe'; // канал для отклонённых постов

const bot = new TelegramBot(token, { polling: true });

// Хранилище состояний пользователей
const userStates = {};

// Хранилище постов для модерации
const posts = {};

// Обработчик команды `/start`
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Привет! Ищешь человека, которого мимолетно увидел где-то и не познакомился в связи с обстоятельствами?\n\nНайти человека можно в Телеграмм канале, подробно опишите свою историю, желательно прикрепить фото и "Предложить запись" чтобы отправить поиск.`);
  bot.sendMessage(chatId, 'Нажмите кнопку ниже, чтобы предложить запись.', {
    reply_markup: {
      keyboard: [['Предложить запись']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

// Обработка входящих сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Обработка кнопки "Предложить запись"
  if (text === 'Предложить запись') {
    userStates[chatId] = {
      state: 'waiting_story',
      tempPost: {
        media: null,
        description: '',
      },
    };
    await bot.sendMessage(chatId, 'Прикрепите фото или видео (по желанию) и подробно опишите свою историю. ❗ Если хотите чтоб пост опубликовался анонимно пишите анон ❗.', {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // Обработка отправки истории
  if (userStates[chatId] && userStates[chatId].state === 'waiting_story') {
    const postData = userStates[chatId].tempPost;

    // Обрабатываем текст (возможно, он придёт отдельно от медиа)
    if (msg.caption) {
      postData.description = msg.caption;
    } else if (msg.text) {
      postData.description = msg.text;
    }

    // Сохраняем медиафайл
    if (msg.photo) {
      postData.media = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.video) {
      postData.media = msg.video.file_id;
    } else if (msg.document) {
      postData.media = msg.document.file_id;
    } else if (msg.video_note) {
      postData.media = msg.video_note.file_id;
    }

    // ✅ Проверка готовности поста для отправки на модерацию
    if (
      (postData.media && postData.description.trim().length > 0) || // Есть и медиа, и текст
      (postData.media && !postData.description.trim().length) ||    // Есть только медиа
      (!postData.media && postData.description.trim().length > 0)   // Есть только текст
    ) {
      const descriptionText = postData.description.trim();

      try {
        if (postData.media) {
          // Отправляем с изображением или другим типом медиа
          if (msg.photo) {
            const sentMsg = await bot.sendPhoto(MODERATION_CHANNEL_ID, postData.media, {
              caption: `${descriptionText}\n\nОтправлено пользователем: @${msg.from.username || msg.from.first_name}`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Принять', callback_data: 'accept' },
                    { text: 'Принять анонимно', callback_data: 'accept_anon' },
                    { text: 'Отклонить', callback_data: 'reject' },
                  ],
                ],
              },
            });
            posts[sentMsg.message_id] = { postData, userId: chatId };
          } else if (msg.video) {
            const sentMsg = await bot.sendVideo(MODERATION_CHANNEL_ID, postData.media, {
              caption: `${descriptionText}\n\nОтправлено пользователем: @${msg.from.username || msg.from.first_name}`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Принять', callback_data: 'accept' },
                    { text: 'Принять анонимно', callback_data: 'accept_anon' },
                    { text: 'Отклонить', callback_data: 'reject' },
                  ],
                ],
              },
            });
            posts[sentMsg.message_id] = { postData, userId: chatId };
          } else if (msg.document) {
            const sentMsg = await bot.sendDocument(MODERATION_CHANNEL_ID, postData.media, {
              caption: `${descriptionText}\n\nОтправлено пользователем: @${msg.from.username || msg.from.first_name}`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Принять', callback_data: 'accept' },
                    { text: 'Принять анонимно', callback_data: 'accept_anon' },
                    { text: 'Отклонить', callback_data: 'reject' },
                  ],
                ],
              },
            });
            posts[sentMsg.message_id] = { postData, userId: chatId };
          } else if (msg.video_note) {
            const sentMsg = await bot.sendVideoNote(MODERATION_CHANNEL_ID, postData.media, {
              caption: `${descriptionText}\n\nОтправлено пользователем: @${msg.from.username || msg.from.first_name}`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Принять', callback_data: 'accept' },
                    { text: 'Принять анонимно', callback_data: 'accept_anon' },
                    { text: 'Отклонить', callback_data: 'reject' },
                  ],
                ],
              },
            });
            posts[sentMsg.message_id] = { postData, userId: chatId };
          }
        } else {
          // Отправляем только текст
          const sentMsg = await bot.sendMessage(MODERATION_CHANNEL_ID, `${descriptionText}\n\nОтправлено пользователем: @${msg.from.username || msg.from.first_name}`, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Принять', callback_data: 'accept' },
                  { text: 'Принять анонимно', callback_data: 'accept_anon' },
                  { text: 'Отклонить', callback_data: 'reject' },
                ],
              ],
            },
          });
          posts[sentMsg.message_id] = { postData, userId: chatId };
        }

        delete userStates[chatId];
      } catch (err) {
        console.error('Ошибка при отправке поста:', err);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте снова.');
      }
    }
  }
});

// Обработка callback запросов
bot.on('callback_query', async (callbackQuery) => {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    const data = callbackQuery.data;
    const msg = callbackQuery.message;
    const moderationMsgId = msg.message_id;

    const postEntry = posts[moderationMsgId];
    if (!postEntry) {
      return;
    }

    const { postData, userId } = postEntry;
    const username = callbackQuery.from.username || 'Аноним';

    // Подготовка клавиатуры с кнопкой под постом
    const replyMarkup = {
      inline_keyboard: [[
        { text: "💌 Предложить пост", url: `https://t.me/Nizhnevartovskbot_bot?start=proposal` }
      ]]
    };

    switch (data) {
      case 'accept':
        if (postData.media) {
          await bot.sendPhoto(POSTS_CHANNEL_ID, postData.media, {
            caption: `${postData.description ? postData.description : 'Нет описания'}\n\nАвтор: @${username}`,
            reply_markup: replyMarkup
          });
        } else {
          await bot.sendMessage(POSTS_CHANNEL_ID, `${postData.description ? postData.description : 'Нет описания'}\n\nАвтор: @${username}`, {
            reply_markup: replyMarkup
          });
        }
        await bot.sendMessage(userId, 'Ваш пост одобрен и опубликован.');
        break;
      case 'accept_anon':
        if (postData.media) {
          await bot.sendPhoto(POSTS_CHANNEL_ID, postData.media, {
            caption: `${postData.description ? postData.description : 'Нет описания'}\n\nАвтор: Анонимно`,
            reply_markup: replyMarkup
          });
        } else {
          await bot.sendMessage(POSTS_CHANNEL_ID, `${postData.description ? postData.description : 'Нет описания'}\n\nАвтор: Анонимно`, {
            reply_markup: replyMarkup
          });
        }
        await bot.sendMessage(userId, 'Ваш пост одобрен и опубликован анонимно.');
        break;
      case 'reject':
        if (postData.media) {
          await bot.sendPhoto(REJECTION_CHANNEL_ID, postData.media, {
            caption: `${postData.description ? postData.description : 'Нет описания'}\n\nОтклонено.`,
          });
        } else {
          await bot.sendMessage(REJECTION_CHANNEL_ID, `${postData.description ? postData.description : 'Нет описания'}\n\nОтклонено.`);
        }
        await bot.sendMessage(userId, 'Ваш пост отклонён. Вы можете отправить новый через 12 часов.');
        break;
    }

    delete posts[moderationMsgId];
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    console.error('Ошибка при обработке callback:', err);
  }
});
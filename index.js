const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const MODERATION_CHANNEL_ID = '@Nmsssssssdasdasdasd';
const POSTS_CHANNEL_ID = '@NM_Nizhnevartovsk'; // <-- сюда твой канал
const REJECTION_CHANNEL_ID = '@sckghe';

const bot = new TelegramBot(token, { polling: true });

const userStates = {};
const posts = {};

// Отправка приветственного сообщения с ФОТО и закрепление
async function sendWelcomeMessage() {
  try {
    const welcomeCaption = `НАЙДИ МЕНЯ | НИЖНЕВАРТОВСК

🔹 Увидел(а) кого-то особенного в городе?
🔹 Не успел(а) познакомиться?

Просто отправь фото (если есть) и опиши ситуацию!

Мы поможем тебе найти этого человека.

⚡ Публикация возможна анонимно.`;

    const sentMessage = await bot.sendPhoto(POSTS_CHANNEL_ID, 'AgACAgIAAxkBAAIFmWgL5lC3LBN3uLNl8DIHxSOQJaPUAAI19zEbd-xgSHcsx8t0dXqvAQADAgADdwADNgQ', {
      caption: welcomeCaption,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💌 Предложить пост', url: `https://t.me/Nizhnevartovskbot_bot?start=proposal` }
          ]
        ]
      }
    });

    await bot.pinChatMessage(POSTS_CHANNEL_ID, sentMessage.message_id, { disable_notification: true });
    console.log('Приветственное сообщение с фото отправлено и закреплено.');
  } catch (err) {
    console.error('Ошибка при отправке приветственного сообщения:', err);
  }
}

// Вызываем отправку сразу после запуска бота
sendWelcomeMessage();

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  if (!username) {
    return bot.sendMessage(chatId,
      `❗ Чтобы пользоваться ботом, нужно установить имя пользователя (username) в Telegram.\n\n` +
      `👉 Как установить:\n1. Откройте Telegram\n2. Перейдите в "Настройки"\n3. Нажмите "Имя пользователя"\n4. Установите уникальный @username\n\n` +
      `После этого снова напишите /start.`
    );
  }

  await bot.sendPhoto(chatId, 'AgACAgIAAxkBAAIFmWgL5lC3LBN3uLNl8DIHxSOQJaPUAAI19zEbd-xgSHcsx8t0dXqvAQADAgADdwADNgQ', {
    caption: `Привет! 👋\n\nИщешь человека, которого мимолетно увидел где-то и не познакомился?\n\n✅ Подробно опиши свою историю\n✅ Прикрепи фото (если есть)\n✅ Нажми "Предложить запись", чтобы отправить поиск.`,
  });

  await bot.sendMessage(chatId, 'Нажмите кнопку ниже, чтобы предложить запись.', {
    reply_markup: {
      keyboard: [['Предложить запись']],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === 'Предложить запись') {
    userStates[chatId] = {
      state: 'waiting_story',
      tempPost: {
        media: null,
        description: '',
      },
    };
    await bot.sendMessage(chatId, 'Прикрепите фото или видео (по желанию) и подробно опишите свою историю. ❗ Если хотите чтоб пост опубликовался анонимно пишите "анон" ❗.', {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  if (userStates[chatId] && userStates[chatId].state === 'waiting_story') {
    const postData = userStates[chatId].tempPost;

    if (msg.caption) {
      postData.description = msg.caption;
    } else if (msg.text) {
      postData.description = msg.text;
    }

    if (msg.photo) {
      postData.media = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.video) {
      postData.media = msg.video.file_id;
    } else if (msg.document) {
      postData.media = msg.document.file_id;
    } else if (msg.video_note) {
      postData.media = msg.video_note.file_id;
    }

    if (
      (postData.media && postData.description.trim().length > 0) ||
      (postData.media && !postData.description.trim().length) ||
      (!postData.media && postData.description.trim().length > 0)
    ) {
      const descriptionText = postData.description.trim();
      const senderUsername = msg.from.username || msg.from.first_name;

      try {
        const messageOptions = {
          caption: `${descriptionText}\n\nОтправлено пользователем: @${senderUsername}`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Принять', callback_data: 'accept' },
                { text: 'Принять анонимно', callback_data: 'accept_anon' },
                { text: 'Отклонить', callback_data: 'reject' },
              ],
            ],
          },
        };

        let sentMsg;
        if (msg.photo) {
          sentMsg = await bot.sendPhoto(MODERATION_CHANNEL_ID, postData.media, messageOptions);
        } else if (msg.video) {
          sentMsg = await bot.sendVideo(MODERATION_CHANNEL_ID, postData.media, messageOptions);
        } else if (msg.document) {
          sentMsg = await bot.sendDocument(MODERATION_CHANNEL_ID, postData.media, messageOptions);
        } else if (msg.video_note) {
          sentMsg = await bot.sendVideoNote(MODERATION_CHANNEL_ID, postData.media, {
            reply_markup: messageOptions.reply_markup,
          });
        } else {
          sentMsg = await bot.sendMessage(MODERATION_CHANNEL_ID, messageOptions.caption, {
            reply_markup: messageOptions.reply_markup,
          });
        }

        posts[sentMsg.message_id] = {
          postData,
          userId: chatId,
          username: senderUsername,
        };

        delete userStates[chatId];
      } catch (err) {
        console.error('Ошибка при отправке поста:', err);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте снова.');
      }
    }
  }
});

bot.on('callback_query', async (callbackQuery) => {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    const data = callbackQuery.data;
    const msg = callbackQuery.message;
    const moderationMsgId = msg.message_id;

    const postEntry = posts[moderationMsgId];
    if (!postEntry) return;

    const { postData, userId, username } = postEntry;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '💬 Прокомментировать', url: 'https://t.me/chatNMN' }, // <-- сюда свою ссылку на чат
        ],
        [
          { text: '💌 Предложить пост', url: `https://t.me/Nizhnevartovskbot_bot?start=proposal` }
        ]
      ]
    };

    switch (data) {
      case 'accept':
        if (postData.media) {
          await bot.sendPhoto(POSTS_CHANNEL_ID, postData.media, {
            caption: `${postData.description || 'Нет описания'}\n\nАвтор: @${username}`,
            reply_markup: replyMarkup
          });
        } else {
          await bot.sendMessage(POSTS_CHANNEL_ID, `${postData.description || 'Нет описания'}\n\nАвтор: @${username}`, {
            reply_markup: replyMarkup
          });
        }
        await bot.sendMessage(userId, 'Ваш пост одобрен и опубликован.');
        break;

      case 'accept_anon':
        if (postData.media) {
          await bot.sendPhoto(POSTS_CHANNEL_ID, postData.media, {
            caption: `${postData.description || 'Нет описания'}\n\nАвтор: Анонимно`,
            reply_markup: replyMarkup
          });
        } else {
          await bot.sendMessage(POSTS_CHANNEL_ID, `${postData.description || 'Нет описания'}\n\nАвтор: Анонимно`, {
            reply_markup: replyMarkup
          });
        }
        await bot.sendMessage(userId, 'Ваш пост одобрен и опубликован анонимно.');
        break;

      case 'reject':
        if (postData.media) {
          await bot.sendPhoto(REJECTION_CHANNEL_ID, postData.media, {
            caption: `${postData.description || 'Нет описания'}\n\nОтклонено.`,
          });
        } else {
          await bot.sendMessage(REJECTION_CHANNEL_ID, `${postData.description || 'Нет описания'}\n\nОтклонено.`);
        }
        await bot.sendMessage(userId, 'Ваш пост отклонён. Вы можете отправить новый через 12 часов.');
        break;
    }

    delete posts[moderationMsgId];
  } catch (err) {
    console.error('Ошибка при обработке callback:', err);
  }
});1

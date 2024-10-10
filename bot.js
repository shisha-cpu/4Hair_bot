const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');


const token = '7538141342:AAHXdvc1DbiIXaln0wWBzvDsuCQdZn4l6Ds';
const bot = new TelegramBot(token, { polling: true });

const adminChatId = 6376419421;

const welcomeMessage = `
📹 Привет! 

Мы команда бренда 4Hair!

Приятно познакомиться, а теперь расскажи немного о себе 😊
`;

// Храним данные пользователей и их состояния
const userStates = {};

// Возможные состояния пользователя
const STATES = {
    STARTED: 'STARTED',
    ASK_NAME: 'ASK_NAME',
    ASK_PHONE: 'ASK_PHONE',
    ASK_CITY: 'ASK_CITY',
    ASK_STATUS: 'ASK_STATUS',
    ASK_CUSTOM_STATUS: 'ASK_CUSTOM_STATUS',
    SERVICES: 'SERVICES',
    COUNTDOWN: 'COUNTDOWN',
};

// Логирование chatId для отладки
bot.on('message', (msg) => {
    console.log(`Received message from chatId: ${msg.chat.id}`);
});

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = { 
        state: STATES.STARTED,
        userData: {} 
    }; // Инициализируем состояние пользователя

    // Отправляем видео с приветствием
    bot.sendVideo(chatId, 'https://videos2.sendvid.com/bd/cd/8swcjf60.mp4?validfrom=1728307302&validto=1728321702&rate=180k&ip=18.185.69.117&hash=9RBrnTHkLifnULgn%2Fl3%2FfdOIeaM%3D', {
        caption: welcomeMessage,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Продолжить', callback_data: 'continue_name' }]
            ]
        },
        width: 720,
        height: 1280
    });
});

// Обработка всех колбэков
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (!userStates[chatId]) {
        // Если пользователь не начал диалог, отправляем /start
        bot.sendMessage(chatId, 'Пожалуйста, начните диалог командой /start.');
        return;
    }

    const userState = userStates[chatId];
    const userData = userState.userData;

    switch (query.data) {
        case 'continue_name':
            askName(chatId);
            break;
        case 'status_master':
        case 'status_store':
        case 'status_owner':
            handleStatusSelection(chatId, query.data);
            break;
        case 'status_other':
            askCustomStatus(chatId);
            break;
        case 'continue_services':
            sendNextStep(chatId);
            break;
        case 'service_shop':
        case 'service_training':
        case 'service_extensions':
            handleServiceContinuation(chatId, query.data);
            break;
        case 'start_countdown':
            startCountdown(chatId);
            break;
        default:
            bot.sendMessage(chatId, 'Неизвестная команда. Пожалуйста, используйте кнопки ниже.');
    }

    // Отвечаем на callback_query, чтобы убрать "часики"
    bot.answerCallbackQuery(query.id).catch(console.error);
});

// Обработка текстовых сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Игнорируем сообщения, являющиеся командами или колбэками
    if (msg.text.startsWith('/')) return;

    if (!userStates[chatId] || !userStates[chatId].state) return;

    const userState = userStates[chatId];
    const userData = userState.userData;
    const currentState = userState.state;

    switch (currentState) {
        case STATES.ASK_NAME:
            userData.name = msg.text.trim();
            userState.state = STATES.ASK_PHONE;
            askPhone(chatId);
            break;

        case STATES.ASK_PHONE:
            const phone = msg.text.trim();
            const phoneRegex = /^\+?[0-9]{10,15}$/;

            if (phoneRegex.test(phone)) {
                userData.phone = phone;
                userState.state = STATES.ASK_CITY;
                askCity(chatId);
            } else {
                bot.sendMessage(chatId, 'Пожалуйста, введите корректный номер телефона. Пример: +79001234567');
            }
            break;

        case STATES.ASK_CITY:
            userData.city = msg.text.trim();
            userState.state = STATES.ASK_STATUS;
            askStatus(chatId);
            break;

        case STATES.ASK_CUSTOM_STATUS:
            userData.status = msg.text.trim();
            sendToAdmin(userData);
            sendNextStep(chatId);
            userState.state = STATES.SERVICES;
            break;

        default:
            // Не обрабатываем другие состояния
            break;
    }
});

// Функция запроса имени
function askName(chatId) {
    userStates[chatId].state = STATES.ASK_NAME;
    bot.sendMessage(chatId, 'Как тебя зовут?');
}

// Функция запроса номера телефона
function askPhone(chatId) {
    userStates[chatId].state = STATES.ASK_PHONE;
    bot.sendMessage(chatId, 'Напиши свой номер телефона. Пример: +79001234567');
}

// Функция запроса города
function askCity(chatId) {
    userStates[chatId].state = STATES.ASK_CITY;
    bot.sendMessage(chatId, 'Из какого ты города?');
}

// Функция запроса статуса
function askStatus(chatId) {
    userStates[chatId].state = STATES.ASK_STATUS;
    bot.sendMessage(chatId, 'Выберите ваш статус:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Мастер', callback_data: 'status_master' }],
                [{ text: 'Магазин', callback_data: 'status_store' }],
                [{ text: 'Владелец студии', callback_data: 'status_owner' }],
                [{ text: 'Другое', callback_data: 'status_other' }]
            ]
        }
    });
}

// Функция запроса пользовательского статуса
function askCustomStatus(chatId) {
    userStates[chatId].state = STATES.ASK_CUSTOM_STATUS;
    bot.sendMessage(chatId, 'Введите ваш статус:');
}

// Обработка выбора статуса
function handleStatusSelection(chatId, status) {
    const userData = userStates[chatId].userData;

    if (status === 'status_other') {
        askCustomStatus(chatId);
    } else {
        userData.status = status === 'status_master' ? 'Мастер' :
                          status === 'status_store' ? 'Магазин' : 'Владелец студии';
        sendToAdmin(userData);
        sendNextStep(chatId);
        userStates[chatId].state = STATES.SERVICES;
    }
}

// Отправка данных админу
function sendToAdmin(userData) {
    const messageToAdmin = `
Пользователь заполнил следующие данные:
Имя: ${userData.name}
Город: ${userData.city}
Телефон: ${userData.phone}
Статус: ${userData.status}
    `;
    bot.sendMessage(adminChatId, messageToAdmin).catch(console.error);
}

// Отправка следующего шага с информацией о сервисах
function sendNextStep(chatId) {
    bot.sendMessage(chatId, 'Супер 🙌').then(() => {
        setTimeout(() => {
            bot.sendMessage(chatId, 'Расскажем, чем мы можем быть полезны:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Магазин волос', callback_data: 'service_shop' }],
                        [{ text: 'Обучение', callback_data: 'service_training' }],
                        [{ text: 'Изготовление лент и трессов', callback_data: 'service_extensions' }]
                    ]
                }
            });
        }, 500);
    });
}

// Обработка выбора услуг
function handleServiceContinuation(chatId, service) {
    switch (service) {
        case 'service_shop':
            bot.sendMediaGroup(chatId, [
                { type: 'photo', media: './1.jfif' },
                { type: 'photo', media: './2.jfif' },
                { type: 'photo', media: './3.jfif' }
            ]).then(() => {
                bot.sendMessage(chatId, `Магазин волос : https://t.me/shop4hair`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Дальше', callback_data: 'start_countdown' }]
                        ]
                    }
                });
            }).catch(console.error);
            break;

        case 'service_training':
            bot.sendMessage(chatId, `Обучение всем видам наращивания. Мини группа, индивидуально, онлайн\n\nhttps://4hair.ru`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Дальше', callback_data: 'start_countdown' }]
                    ]
                }
            });
            break;

        case 'service_extensions':
            bot.sendMediaGroup(chatId, [
                { type: 'photo', media: './4.jfif' },
                { type: 'photo', media: './5.jfif' },
                { type: 'photo', media: './6.jfif' }
            ]).then(() => {
                bot.sendMessage(chatId, `Изготовление лент и трессов из детских волос \n\nhttps://4hair.ru`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Начать розыгрыш', callback_data: 'start_countdown' }]
                        ]
                    }
                });
            }).catch(console.error);
            break;

        default:
            bot.sendMessage(chatId, 'Неизвестная услуга. Пожалуйста, выберите из предложенных.');
    }
}

// Обратный отсчёт
function startCountdown(chatId) {
    const countdownEndDate = new Date('2024-10-16T00:00:00'); 
    let remainingTime = Math.floor((countdownEndDate - new Date()) / 1000);

    const countdownMessage = (remainingTime) => {
        const days = Math.floor(remainingTime / (24 * 3600));
        const hours = Math.floor((remainingTime % (24 * 3600)) / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;

        return `
        До завершения розыгрыша осталось:
        ${days} дней, ${hours} часов, ${minutes} минут и ${seconds} секунд.
        `;
    };

    // Отправляем сообщение перед запуском таймера
    const participationMessage = `
    💸 Выиграй 100.000₽ на покупку волос!

    Для участия:
    1. Оставь свои верные данные
    2. Подпишись на магазин волос: [Shop 4Hair](https://t.me/shop4hair)
    3. Подпишись на наш ТГ канал: [FOURHAIR](https://t.me/FOURHAIR)

    Жди результатов розыгрыша.

    Желаем удачи! 🍀
    `;

    bot.sendMessage(chatId, participationMessage, { parse_mode: 'Markdown' }).then(() => {
        // После сообщения запускаем таймер
        bot.sendMessage(chatId, countdownMessage(remainingTime)).then((sentMessage) => {
            userStates[chatId].state = STATES.COUNTDOWN;
            const interval = setInterval(() => {
                remainingTime = Math.floor((countdownEndDate - new Date()) / 1000);
                if (remainingTime >= 0) {
                    bot.editMessageText(countdownMessage(remainingTime), {
                        chat_id: chatId,
                        message_id: sentMessage.message_id,
                    }).catch(() => clearInterval(interval));
                } else {
                    clearInterval(interval);
                    bot.sendMessage(chatId, '⏳ Время вышло!');
                }
            }, 1000);
        });
    });
}

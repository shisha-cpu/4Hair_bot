const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
// Токен бота
const token = '7538141342:AAHXdvc1DbiIXaln0wWBzvDsuCQdZn4l6Ds';
const bot = new TelegramBot(token, { polling: true });

// ID, на который нужно отправить данные
const adminChatId = 6376419421;

// Приветственное сообщение
const welcomeMessage = `
📹 Привет! Мы команда 4Hair! Приятно познакомиться, а теперь расскажи немного о себе.
`;

// Храним данные пользователей
const userStates = {};

// Логирование chatId для отладки
bot.on('message', (msg) => {
    console.log(msg.chat.id);
});

// Основная логика бота
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = { userData: {} }; // Создаём объект для хранения данных пользователя

    // Сначала отправляем приветственное сообщение
    bot.sendMessage(chatId, welcomeMessage).then(() => {
        // Затем отправляем видео
        bot.sendVideo(chatId, 'https://videos2.sendvid.com/bd/cd/8swcjf60.mp4?validfrom=1728307302&validto=1728321702&rate=180k&ip=18.185.69.117&hash=9RBrnTHkLifnULgn%2Fl3%2FfdOIeaM%3D', {
            caption: welcomeMessage,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Продолжить', callback_data: 'continue_name' }]
                ]
            },
            width: 720,   
            height: 1280  
        }).catch((error) => {
            console.error('Ошибка при отправке видео:', error);
            bot.sendMessage(chatId, 'К сожалению, не удалось отправить видео. Пожалуйста, проверьте доступность файла.');
        });
    });
});


// Обработка всех колбэков
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (!userStates[chatId]) return; // Проверяем, существует ли состояние пользователя

    const userData = userStates[chatId].userData;

    // Если нажата кнопка "Продолжить"
    if (query.data === 'continue_name') {
        bot.sendMessage(chatId, 'Введите ваше имя:').then(() => {
            bot.once('message', (msg) => {
                userData.name = msg.text; // Сохраняем имя
    
                // После ввода имени запрашиваем номер телефона
                bot.sendMessage(chatId, 'Введите ваш номер телефона:').then(() => {
                    bot.once('message', (msg) => {
                        userData.phone = msg.text; // Сохраняем номер телефона
    
                        // После ввода телефона запрашиваем город
                        bot.sendMessage(chatId, 'Введите ваш город:').then(() => {
                            bot.once('message', (msg) => {
                                userData.city = msg.text; // Сохраняем город
    
                                // После ввода города запрашиваем статус с выбором кнопок
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
                            });
                        });
                    });
                });
            });
        });
    }
    

    // Обработка выбора статуса
    if (query.data === 'status_master' || query.data === 'status_store' || query.data === 'status_owner') {
        userData.status = query.data === 'status_master' ? 'Мастер' :
                          query.data === 'status_store' ? 'Магазин' : 'Владелец студии';

        // Отправляем данные админу
        const messageToAdmin = `
        Пользователь заполнил следующие данные:
        Имя: ${userData.name}
        Город: ${userData.city}
        Статус: ${userData.status}
        `;
        bot.sendMessage(adminChatId, messageToAdmin);
        sendNextStep(chatId);
    }

    if (query.data === 'status_other') {
        bot.sendMessage(chatId, 'Введите ваш статус:').then(() => {
            bot.once('message', (msg) => {
                userData.status = msg.text;

                const messageToAdmin = `
                Пользователь заполнил следующие данные:
                Имя: ${userData.name}
                Иелефон: ${userData.phone}
                Город: ${userData.city}
                Статус: ${userData.status}
                `;
                bot.sendMessage(adminChatId, messageToAdmin);
                sendNextStep(chatId);
            });
        });
    }

    // Обработка кнопки "Дальше" после описания услуг
    if (query.data === 'continue_services') {
        bot.sendMessage(chatId, 'Сохрани, чтобы не потерять https://t.me/shop4hair', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Дальше', callback_data: 'start_countdown' }]
                ]
            }
        });
    }

    // Обратный отсчёт
    if (query.data === 'start_countdown') {
        const countdown = 10; // Например, 10 секунд
        let remainingTime = countdown;

        const countdownMessage = (remainingTime) => `
До розыгрыша осталось: ${remainingTime} секунд.
Удачи!
        `;

        // Отправляем начальное сообщение с таймером
        bot.sendMessage(chatId, countdownMessage(remainingTime)).then((sentMessage) => {
            const interval = setInterval(() => {
                remainingTime--;
                if (remainingTime >= 0) {
                    bot.editMessageText(countdownMessage(remainingTime), {
                        chat_id: chatId,
                        message_id: sentMessage.message_id,
                    });
                } else {
                    clearInterval(interval);
                    bot.sendMessage(chatId, "Розыгрыш завершён! Удачи!");
                }
            }, 1000);
        });
    }
});

// Функция для отправки следующего шага
function sendNextStep(chatId) {
    bot.sendMessage(chatId, `
Расскажем, чем мы можем быть полезны:
1. Магазин детских волос
2. Обучение
3. Изготовление трессов и лент из детских волос
    `, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Дальше', callback_data: 'continue_services' }]
            ]
        }
    });
}

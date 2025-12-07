const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Инициализация базы данных
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('Подключено к SQLite базе данных');
        initDatabase();
    }
});

// Создание таблиц
function initDatabase() {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица платежей
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        payment_id TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'RUB',
        description TEXT,
        status TEXT DEFAULT 'pending',
        yookassa_payment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Таблица запросов на услуги
    db.run(`CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        payment_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (payment_id) REFERENCES payments(id)
    )`);
}

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

// API: Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        // Проверка существующего пользователя
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }

            if (user) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }

            // Хеширование пароля
            const hashedPassword = await bcrypt.hash(password, 10);

            // Создание пользователя
            db.run(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка при создании пользователя' });
                    }

                    // Генерация токена
                    const token = jwt.sign(
                        { id: this.lastID, email, name },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );

                    res.json({
                        message: 'Регистрация успешна',
                        token,
                        user: { id: this.lastID, name, email }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Вход
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }

            // Проверка пароля
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }

            // Генерация токена
            const token = jwt.sign(
                { id: user.id, email: user.email, name: user.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Вход выполнен успешно',
                token,
                user: { id: user.id, name: user.name, email: user.email }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Создание платежа через ЮKassa
app.post('/api/create-payment', authenticateToken, async (req, res) => {
    try {
        const { amount, description, service_type } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Укажите корректную сумму' });
        }

        const paymentId = uuidv4();
        const userId = req.user.id;

        // Сохранение платежа в БД
        db.run(
            'INSERT INTO payments (user_id, payment_id, amount, description, status) VALUES (?, ?, ?, ?, ?)',
            [userId, paymentId, amount, description || 'Оплата услуги', 'pending'],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка при создании платежа' });
                }

                const dbPaymentId = this.lastID;

                // Создание платежа в ЮKassa
                const yookassaPayment = {
                    amount: {
                        value: amount.toFixed(2),
                        currency: 'RUB'
                    },
                    confirmation: {
                        type: 'redirect',
                        return_url: `${req.protocol}://${req.get('host')}/payment-success.html?payment_id=${paymentId}`
                    },
                    description: description || `Оплата услуги: ${service_type || 'Услуга'}`,
                    metadata: {
                        payment_id: paymentId,
                        user_id: userId.toString()
                    }
                };

                // Интеграция с ЮKassa (используем тестовые данные)
                const shopId = process.env.YOOKASSA_SHOP_ID;
                const secretKey = process.env.YOOKASSA_SECRET_KEY;

                if (!shopId || !secretKey) {
                    // Если нет ключей, возвращаем тестовую ссылку
                    return res.json({
                        payment_id: paymentId,
                        payment_url: `/payment-success.html?payment_id=${paymentId}&test=true`,
                        amount: amount,
                        status: 'pending'
                    });
                }

                // Запрос к ЮKassa (автоматически использует тестовый режим для ключей с префиксом "test_")
                const yookassaUrl = secretKey.startsWith('test_') 
                    ? 'https://api.yookassa.ru/v3/payments' 
                    : 'https://api.yookassa.ru/v3/payments';
                
                axios.post(yookassaUrl, yookassaPayment, {
                    auth: {
                        username: shopId,
                        password: secretKey
                    },
                    headers: {
                        'Idempotence-Key': paymentId
                    }
                })
                .then(response => {
                    // Обновление платежа с ID от ЮKassa
                    db.run(
                        'UPDATE payments SET yookassa_payment_id = ? WHERE id = ?',
                        [response.data.id, dbPaymentId]
                    );

                    res.json({
                        payment_id: paymentId,
                        payment_url: response.data.confirmation.confirmation_url,
                        amount: amount,
                        status: 'pending'
                    });
                })
                .catch(error => {
                    console.error('Ошибка ЮKassa:', error.response?.data || error.message);
                    res.status(500).json({ error: 'Ошибка при создании платежа в ЮKassa' });
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Проверка статуса платежа
app.get('/api/payment-status/:paymentId', authenticateToken, (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user.id;

    db.get(
        'SELECT * FROM payments WHERE payment_id = ? AND user_id = ?',
        [paymentId, userId],
        (err, payment) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }

            if (!payment) {
                return res.status(404).json({ error: 'Платеж не найден' });
            }

            res.json({
                payment_id: payment.payment_id,
                amount: payment.amount,
                status: payment.status,
                created_at: payment.created_at
            });
        }
    );
});

// API: Получение истории платежей пользователя
app.get('/api/payments', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
        'SELECT payment_id, amount, description, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, payments) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }

            res.json({ payments });
        }
    );
});

// API: Получение информации о текущем пользователе
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email
        }
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
});

// Закрытие БД при завершении
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Соединение с БД закрыто');
        process.exit(0);
    });
});


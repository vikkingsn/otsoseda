// Базовый URL API (измените на ваш домен в продакшене)
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api';

// Функция для получения токена
function getToken() {
    return localStorage.getItem('token');
}

// Функция для сохранения токена
function setToken(token) {
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

// Функция для получения текущего пользователя
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Функция для сохранения текущего пользователя
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// Функция для выхода
function logout() {
    setToken(null);
    setCurrentUser(null);
    window.location.href = 'index.html';
}

// Функция для API запросов
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка запроса');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Обработка формы регистрации
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        // Очистка сообщений
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        // Валидация
        if (!name || !email || !password || !confirmPassword) {
            errorMessage.textContent = 'Все поля обязательны для заполнения';
            return;
        }
        
        if (password.length < 6) {
            errorMessage.textContent = 'Пароль должен содержать минимум 6 символов';
            return;
        }
        
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Пароли не совпадают';
            return;
        }
        
        // Проверка email на валидность
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Введите корректный email адрес';
            return;
        }
        
        try {
            const response = await apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            // Успешная регистрация
            successMessage.textContent = 'Регистрация успешна! Перенаправление...';
            
            // Сохранение токена и пользователя
            setToken(response.token);
            setCurrentUser(response.user);
            
            // Перенаправление на главную страницу через 1.5 секунды
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            errorMessage.textContent = error.message || 'Ошибка при регистрации';
        }
    });
}

// Обработка формы входа
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorMessage = document.getElementById('errorMessage');
        
        // Очистка сообщения об ошибке
        errorMessage.textContent = '';
        
        // Валидация
        if (!email || !password) {
            errorMessage.textContent = 'Заполните все поля';
            return;
        }
        
        try {
            const response = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            // Успешный вход
            setToken(response.token);
            setCurrentUser(response.user);
            
            // Перенаправление на главную страницу
            window.location.href = 'index.html';
        } catch (error) {
            errorMessage.textContent = error.message || 'Неверный email или пароль';
        }
    });
}

// Проверка авторизации и обновление интерфейса
async function checkAuth() {
    const token = getToken();
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    
    if (!token) {
        // Пользователь не авторизован
        if (userInfo) userInfo.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
        return null;
    }

    try {
        // Проверка токена через API
        const response = await apiRequest('/me');
        
        if (response.user) {
            // Пользователь авторизован
            setCurrentUser(response.user);
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userNameEl = userInfo.querySelector('.user-name');
                if (userNameEl) {
                    userNameEl.textContent = response.user.name;
                }
            }
            if (authButtons) authButtons.style.display = 'none';
            return response.user;
        }
    } catch (error) {
        // Токен недействителен
        setToken(null);
        setCurrentUser(null);
        if (userInfo) userInfo.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
    }
    
    return null;
}

// Обновление интерфейса на главной странице при загрузке
if (document.getElementById('userInfo') || document.getElementById('authButtons')) {
    checkAuth();
}

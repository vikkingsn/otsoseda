// Функция для получения всех пользователей из localStorage
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Функция для сохранения пользователей в localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
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
    setCurrentUser(null);
    window.location.href = 'index.html';
}

// Обработка формы регистрации
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', function(e) {
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
        
        // Получение существующих пользователей
        const users = getUsers();
        
        // Проверка, существует ли пользователь с таким email
        if (users.find(user => user.email === email)) {
            errorMessage.textContent = 'Пользователь с таким email уже зарегистрирован';
            return;
        }
        
        // Создание нового пользователя
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: password, // В реальном приложении пароль должен быть захеширован
            createdAt: new Date().toISOString()
        };
        
        // Сохранение пользователя
        users.push(newUser);
        saveUsers(users);
        
        // Успешная регистрация
        successMessage.textContent = 'Регистрация успешна! Перенаправление...';
        
        // Автоматический вход после регистрации
        setCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email });
        
        // Перенаправление на главную страницу через 1.5 секунды
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
}

// Обработка формы входа
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
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
        
        // Получение пользователей
        const users = getUsers();
        
        // Поиск пользователя
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            errorMessage.textContent = 'Неверный email или пароль';
            return;
        }
        
        // Успешный вход
        setCurrentUser({ id: user.id, name: user.name, email: user.email });
        
        // Перенаправление на главную страницу
        window.location.href = 'index.html';
    });
}

// Обновление интерфейса на главной странице при загрузке
if (document.getElementById('userInfo')) {
    const currentUser = getCurrentUser();
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    
    if (currentUser) {
        // Пользователь авторизован
        userInfo.style.display = 'flex';
        userInfo.querySelector('.user-name').textContent = currentUser.name;
        if (authButtons) {
            authButtons.style.display = 'none';
        }
    } else {
        // Пользователь не авторизован
        userInfo.style.display = 'none';
        if (authButtons) {
            authButtons.style.display = 'flex';
        }
    }
}


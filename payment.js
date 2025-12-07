// Функция для открытия модального окна оплаты
function openPaymentModal(serviceName, serviceType) {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('paymentServiceName').textContent = serviceName;
        document.getElementById('paymentServiceType').value = serviceType;
    }
}

// Функция для закрытия модального окна
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
        // Очистка формы
        const form = document.getElementById('paymentForm');
        if (form) {
            form.reset();
        }
        const errorMsg = document.getElementById('paymentError');
        if (errorMsg) errorMsg.textContent = '';
    }
}

// Обработка формы оплаты
if (document.getElementById('paymentForm')) {
    document.getElementById('paymentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const description = document.getElementById('paymentDescription').value.trim();
        const serviceType = document.getElementById('paymentServiceType').value;
        const errorMsg = document.getElementById('paymentError');
        const submitBtn = document.getElementById('paymentSubmitBtn');
        
        errorMsg.textContent = '';
        
        if (!amount || amount <= 0) {
            errorMsg.textContent = 'Введите корректную сумму';
            return;
        }
        
        // Проверка авторизации
        const token = localStorage.getItem('token');
        if (!token) {
            errorMsg.textContent = 'Необходимо войти в систему';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        
        // Блокировка кнопки
        submitBtn.disabled = true;
        submitBtn.textContent = 'Создание платежа...';
        
        try {
            const API_URL = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000/api' 
                : '/api';
            
            const response = await fetch(`${API_URL}/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: amount,
                    description: description || `Оплата услуги: ${serviceType}`,
                    service_type: serviceType
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при создании платежа');
            }
            
            // Перенаправление на страницу оплаты
            if (data.payment_url) {
                window.location.href = data.payment_url;
            } else {
                // Если нет URL, показываем успешное сообщение
                errorMsg.style.color = 'green';
                errorMsg.textContent = 'Платеж создан успешно!';
                setTimeout(() => {
                    closePaymentModal();
                    window.location.href = `payment-success.html?payment_id=${data.payment_id}`;
                }, 1500);
            }
        } catch (error) {
            errorMsg.textContent = error.message || 'Ошибка при создании платежа';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Оплатить';
        }
    });
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
});

// Добавление кнопок оплаты к карточкам услуг
document.addEventListener('DOMContentLoaded', function() {
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
        const serviceTitle = card.querySelector('h3');
        if (serviceTitle) {
            const serviceName = serviceTitle.textContent;
            const serviceType = serviceName.toLowerCase().replace(/\s+/g, '_');
            
            // Создание кнопки оплаты
            const paymentBtn = document.createElement('button');
            paymentBtn.className = 'btn btn-primary service-payment-btn';
            paymentBtn.textContent = 'Оплата запроса';
            paymentBtn.onclick = () => openPaymentModal(serviceName, serviceType);
            
            // Добавление кнопки в карточку
            const serviceContent = card.querySelector('.service-content');
            if (serviceContent) {
                serviceContent.appendChild(paymentBtn);
            }
        }
    });
});


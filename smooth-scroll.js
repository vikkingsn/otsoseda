// Плавный скроллинг для якорных ссылок
document.addEventListener('DOMContentLoaded', function() {
    // Получаем все ссылки с якорями
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Пропускаем пустые якоря
            if (href === '#' || href === '') return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                
                // Получаем высоту фиксированного header
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                // Плавный скроллинг
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Закрываем мобильное меню если открыто
                const nav = document.getElementById('mainNav');
                const mobileToggle = document.getElementById('mobileMenuToggle');
                if (nav && nav.classList.contains('nav-active')) {
                    nav.classList.remove('nav-active');
                    mobileToggle.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
    });
    
    // Мобильное меню
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const nav = document.getElementById('mainNav');
    
    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('nav-active');
            this.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('nav-active') ? 'hidden' : '';
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', function(e) {
            if (!nav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                nav.classList.remove('nav-active');
                mobileMenuToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Закрытие меню при изменении размера окна
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            if (nav) nav.classList.remove('nav-active');
            if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Simple theme toggle: switches body class between light-theme and cyber-theme
    const themeToggle = document.getElementById('themeToggle');
    const themeKey = 'preferred-theme';

    function setTheme(theme){
        document.body.classList.remove('cyber-theme','light-theme');
        document.body.classList.add(theme);
        localStorage.setItem(themeKey, theme);
    }

    function initTheme(){
        const saved = localStorage.getItem(themeKey);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'cyber-theme' : 'light-theme');
        setTheme(theme);
    }

    if(themeToggle){
        themeToggle.addEventListener('click', function(){
            const current = document.body.classList.contains('light-theme') ? 'light-theme' : 'cyber-theme';
            setTheme(current === 'light-theme' ? 'cyber-theme' : 'light-theme');
        });
    }

    initTheme();

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e){
            const href = this.getAttribute('href');
            if(href && href.startsWith('#')){
                const id = href.slice(1);
                const el = document.getElementById(id);
                if(el){
                    e.preventDefault();
                    const offset = el.offsetTop - 80;
                    window.scrollTo({top: offset, behavior: 'smooth'});
                }
            }
        });
    });

    // Simple intersection animations
    const animated = document.querySelectorAll('.stat-card, .step, .benefit-item, .service-card');
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {threshold:0.1, rootMargin:'0px 0px -50px 0px'});

    animated.forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        io.observe(el);
    });

    // Ripple for CTA buttons
    document.querySelectorAll('.cta-button, .btn-primary, .button-full').forEach(btn => {
        btn.addEventListener('click', function(e){
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size/2;
            const y = e.clientY - rect.top - size/2;
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.className = 'ripple';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    });
});
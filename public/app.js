let pizzas = [];

// Load menu from JSON file
async function loadMenuData() {
    try {
        console.log('Attempting to fetch /menu.json...');
        const response = await fetch('/menu.json');
        console.log('Fetch response:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Failed to load menu: ${response.statusText}`);
        }
        const data = await response.json();
        pizzas = data.pizzas;
        console.log('Menu loaded successfully:', pizzas.length, 'items');
        return true;
    } catch (error) {
        console.error('Error loading menu:', error);
        // Fallback: return false to show error
        return false;
    }
}

// Render Pizzas - Optimized with lazy loading
function renderMenu() {
    const menuContainer = document.getElementById('pizza-menu');
    
    if (!menuContainer) {
        console.error('Pizza menu container not found');
        return;
    }

    if (pizzas.length === 0) {
        menuContainer.innerHTML = '<p class="text-center text-gray-400">منو در حال بارگذاری...</p>';
        return;
    }

    const badgeLabels = {
        'popular': 'محبوب',
        'spicy': 'تند',
        'family': 'خانوادگی',
        'vegetarian': 'گیاهی',
        'premium': 'پریمیوم',
        'classic': 'کلاسیک'
    };

    menuContainer.innerHTML = pizzas.map((pizza, index) => {
        // Convert badges array to HTML spans
        const badgesHtml = (pizza.badges || []).map(badge => 
            `<span class="badge ${badge}">${badgeLabels[badge] || badge}</span>`
        ).join('');

        // Lazy load images after first 3 for better initial performance
        const loadingAttr = index > 2 ? 'loading="lazy"' : '';

        return `
        <div class="glass-card overflow-hidden">
            <div class="relative">
                <img src="${pizza.image}" alt="${pizza.name}" class="w-full h-48 object-cover" ${loadingAttr} decoding="async">
                <div class="absolute top-2 right-2 flex flex-wrap gap-1">
                    ${badgesHtml}
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold mb-2">${pizza.name}</h3>
                <p class="text-gray-300 text-sm mb-4 h-12 leading-relaxed">${pizza.description}</p>
                <div class="flex justify-end items-center">
                    <span class="text-pink-400 font-bold text-lg">${pizza.price}</span>
                </div>
            </div>
        </div>
    `}).join('');
}

// Voice Agent Modal Widget Class
class N8nAiVoiceAgent {
    constructor() {
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentAudio = null;
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        this.elements = {
            toggleBtn: document.getElementById('n8n-ai-agent-toggle'),
            closeBtn: document.getElementById('n8n-ai-agent-close'),
            recordBtn: document.getElementById('n8n-ai-agent-record-btn'),
            resetBtn: document.getElementById('n8n-ai-agent-reset-btn'),
            replayBtn: document.getElementById('n8n-ai-agent-replay'),
            modal: document.getElementById('n8n-ai-agent-modal'),
            responseText: document.getElementById('n8n-ai-agent-response-text'),
            errorText: document.getElementById('n8n-ai-agent-error-text'),
            idle: document.querySelector('.n8n-ai-agent-idle'),
            recording: document.querySelector('.n8n-ai-agent-recording'),
            processing: document.querySelector('.n8n-ai-agent-processing'),
            response: document.querySelector('.n8n-ai-agent-response'),
            error: document.querySelector('.n8n-ai-agent-error')
        };
    }

    setupEventListeners() {
        const { toggleBtn, closeBtn, recordBtn, resetBtn, replayBtn, modal } = this.elements;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.handleRecordButtonClick());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetUI());
        }

        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replayAudio());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    toggleModal() {
        const { modal } = this.elements;
        if (!modal) return;

        if (modal.style.display === 'none' || modal.style.display === '') {
            this.openModal();
        } else {
            this.closeModal();
        }
    }

    openModal() {
        const { modal } = this.elements;
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            // جلوگیری از جابجایی محتوا هنگام پنهان شدن scrollbar
            document.body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + 'px';
        }
    }

    closeModal() {
        const { modal } = this.elements;
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.paddingRight = '0';
            this.resetUI();
        }
    }

    async handleRecordButtonClick() {
        const { recordBtn } = this.elements;
        if (!recordBtn) return;

        if (!this.isRecording) {
            // Start recording
            const hasAccess = await this.startRecording();
            if (!hasAccess) {
                this.showError('دسترسی به میکروفون امکان‌پذیر نیست. لطفا تنظیمات مرورگر خود را بررسی کنید.');
                return;
            }

            recordBtn.classList.add('recording');
            this.showRecordingUI();
        } else {
            // Stop recording
            recordBtn.classList.remove('recording');
            const audioBlob = await this.stopRecording();

            if (audioBlob) {
                await this.processAudio(audioBlob);
            }
        }
    }

    async startRecording() {
        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.audioStream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            return false;
        }
    }

    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.isRecording = false;
                this.stopStream();
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    stopStream() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
    }

    showRecordingUI() {
        const { idle, recording } = this.elements;
        if (idle) idle.style.display = 'none';
        if (recording) recording.style.display = 'block';
    }

    async processAudio(audioBlob) {
        const { recordBtn, recording, processing } = this.elements;
        if (recordBtn) recordBtn.disabled = true;

        try {
            // Show processing UI
            if (recording) recording.style.display = 'none';
            if (processing) processing.style.display = 'block';

            // Send audio to server
            const response = await this.sendToServer(audioBlob);

            if (response.success) {
                this.showResponse(response);
            } else {
                this.showError(response.error || 'خطا در پردازش صدا');
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showError('خطا در پردازش صدا: ' + error.message);
        } finally {
            if (recordBtn) recordBtn.disabled = false;
        }
    }

    async sendToServer(audioBlob) {
        try {
            // Create abort controller with 60 second timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 60 seconds

            // Create FormData with binary audio instead of JSON
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-input.webm');

            const response = await fetch('/api/voice-agent', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeout);

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'خطای سرور'
                };
            }

            return result;
        } catch (error) {
            console.error('Error sending audio to server:', error);
            return {
                success: false,
                error: error.message === 'The operation was aborted.' ? 'انتظار برای پاسخ به اتمام رسید. لطفا دوباره تلاش کنید.' : error.message
            };
        }
    }

    showResponse(data) {
        const { processing, response, responseText, replayBtn, recordBtn, resetBtn } = this.elements;

        if (processing) processing.style.display = 'none';
        if (response) response.style.display = 'block';

        // Display response text
        if (responseText) {
            if (data.text_response) {
                responseText.textContent = data.text_response;
            } else {
                responseText.textContent = 'درخواست شما با موفقیت دریافت شد';
            }
        }

        // Handle audio response (base64 string or data URL)
        if (data.audio_response && data.audio_response.trim() !== '') {
            let audioUrl = data.audio_response;
            
            // If it's base64 without data URL prefix, add it
            if (!audioUrl.startsWith('data:')) {
                audioUrl = 'data:audio/mp3;base64,' + audioUrl;
            }
            
            this.currentAudio = audioUrl;
            if (replayBtn) replayBtn.style.display = 'block';
            // Auto-play the audio response
            this.playAudio(this.currentAudio);
        }

        // Update buttons
        if (recordBtn) recordBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'block';
    }

    showError(message) {
        const { processing, error, errorText, recordBtn, resetBtn } = this.elements;

        if (processing) processing.style.display = 'none';
        if (error) error.style.display = 'block';
        if (errorText) errorText.textContent = message;

        if (recordBtn) recordBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'block';
    }

    resetUI() {
        const { idle, recording, processing, response, error, recordBtn, resetBtn, replayBtn } = this.elements;

        if (idle) idle.style.display = 'block';
        if (recording) recording.style.display = 'none';
        if (processing) processing.style.display = 'none';
        if (response) response.style.display = 'none';
        if (error) error.style.display = 'none';

        if (recordBtn) {
            recordBtn.style.display = 'block';
            recordBtn.classList.remove('recording');
        }
        if (resetBtn) resetBtn.style.display = 'none';
        if (replayBtn) replayBtn.style.display = 'none';

        this.currentAudio = null;
        this.stopStream();
    }

    playAudio(audioData) {
        try {
            if (typeof audioData === 'string' && audioData.startsWith('data:')) {
                const audio = new Audio(audioData);
                audio.play();
            } else if (typeof audioData === 'string') {
                // Assume it's a URL
                const audio = new Audio(audioData);
                audio.play();
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }

    replayAudio() {
        if (this.currentAudio) {
            this.playAudio(this.currentAudio);
        }
    }
}

// Initialize the voice agent
const n8nAiVoiceAgent = new N8nAiVoiceAgent();

// Navigation smooth scrolling - Optimized
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Use native smooth scroll with reduced motion check
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                targetElement.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    const nav = document.querySelector('nav');
    const header = document.querySelector('header');
    
    if (!nav || !header) return;
    
    const menuButton = document.createElement('button');
    menuButton.innerHTML = '☰';
    menuButton.className = 'md:hidden text-white text-xl p-2';
    menuButton.onclick = () => {
        nav.classList.toggle('hidden');
    };

    // Insert menu button for mobile
    header.appendChild(menuButton);
}

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Parallax effect removed for better performance
function setupParallax() {
    // Parallax disabled to improve scrolling performance
}

// Scroll animations with Intersection Observer - Optimized
function handleScrollAnimations() {
    // Check if animations are supported and user prefers motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return; // Skip animations if user prefers reduced motion
    }

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Use requestAnimationFrame for smoother animation
                requestAnimationFrame(() => {
                    entry.target.classList.add('visible');
                });
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Elements to animate - limit to important elements only
    const animatedElements = document.querySelectorAll('.glass-card');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

// Initialize when DOM is ready - Optimized
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    
    // Load menu data first
    const menuLoaded = await loadMenuData();
    
    if (!menuLoaded) {
        console.error('Failed to load menu data');
        const menuContainer = document.getElementById('pizza-menu');
        if (menuContainer) {
            menuContainer.innerHTML = '<p class="text-center text-red-400">خطا در بارگذاری منو</p>';
        }
        return;
    }
    
    // Critical path: Render menu
    renderMenu();
    
    // Defer non-critical setup to next frame
    const deferredInit = () => {
        setupNavigation();
        setupMobileMenu();
        handleScrollAnimations();
        setupParallax();
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
        requestIdleCallback(deferredInit, { timeout: 1000 });
    } else {
        setTimeout(deferredInit, 100);
    }
});


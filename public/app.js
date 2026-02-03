let pizzas = [];

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
        return false;
    }
}

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
        const badgesHtml = (pizza.badges || []).map(badge =>
            `<span class="badge ${badge}">${badgeLabels[badge] || badge}</span>`
        ).join('');

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

class N8nAiVoiceAgent {
    constructor() {
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isConversationActive = false;
        this.isProcessing = false;
        this.isPlayingResponse = false;

        this.audioContext = null;
        this.analyser = null;
        this.silenceTimeout = null;
        this.speechStarted = false;
        this.silenceThreshold = 15;
        this.silenceDuration = 1500;
        this.minRecordingTime = 500;
        this.recordingStartTime = 0;

        this.chatHistory = [];
        this.storageKey = 'voice_chat_history';

        this.audioPlayer = null;
        this.currentPlayingId = null;

        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadChatHistory();
        this.renderChatHistory();
    }

    cacheElements() {
        this.elements = {
            toggleBtn: document.getElementById('n8n-ai-agent-toggle'),
            closeBtn: document.getElementById('n8n-ai-agent-close'),
            clearBtn: document.getElementById('n8n-ai-agent-clear'),
            recordBtn: document.getElementById('n8n-ai-agent-record-btn'),
            resetBtn: document.getElementById('n8n-ai-agent-reset-btn'),
            modal: document.getElementById('n8n-ai-agent-modal'),
            chatContainer: document.getElementById('n8n-ai-agent-chat'),
            statusContainer: document.getElementById('n8n-ai-agent-status'),
            idle: document.querySelector('.n8n-ai-agent-idle'),
            recording: document.querySelector('.n8n-ai-agent-recording'),
            processing: document.querySelector('.n8n-ai-agent-processing'),
            error: document.querySelector('.n8n-ai-agent-error'),
            errorText: document.getElementById('n8n-ai-agent-error-text')
        };
    }

    setupEventListeners() {
        const { toggleBtn, closeBtn, clearBtn, recordBtn, resetBtn, modal } = this.elements;

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleModal());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearHistory());
        if (recordBtn) recordBtn.addEventListener('click', () => this.toggleConversation());
        if (resetBtn) resetBtn.addEventListener('click', () => this.endConversation());
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
    }

    loadChatHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.chatHistory = JSON.parse(stored);
                this.chatHistory = this.chatHistory.filter(msg => msg.audioUrl);
            }
        } catch (e) {
            console.error('Error loading chat history:', e);
            this.chatHistory = [];
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.chatHistory));
        } catch (e) {
            console.error('Error saving chat history:', e);
        }
    }

    async clearHistory() {
        try {
            await fetch('/api/audio-clear', { method: 'DELETE' });
        } catch (e) {
            console.warn('Failed to clear server audio files:', e);
        }

        this.chatHistory = [];
        localStorage.removeItem(this.storageKey);
        this.renderChatHistory();
    }

    async addMessage(type, audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, type === 'user' ? 'user-audio.webm' : 'assistant-audio.mp3');
            formData.append('type', type);

            const response = await fetch('/api/save-audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save audio file');
            }

            const result = await response.json();

            const message = {
                id: Date.now().toString(),
                type: type,
                audioUrl: result.url,
                filename: result.filename,
                mimeType: result.mimeType,
                timestamp: new Date().toISOString()
            };

            this.chatHistory.push(message);
            this.saveChatHistory();
            this.renderChatHistory();
            return message.id;
        } catch (e) {
            console.error('Error saving message:', e);
            return null;
        }
    }

    renderChatHistory() {
        const { chatContainer, idle } = this.elements;
        if (!chatContainer) return;

        if (this.chatHistory.length === 0) {
            chatContainer.innerHTML = '';
            if (idle) idle.style.display = 'block';
            return;
        }

        if (idle) idle.style.display = 'none';

        chatContainer.innerHTML = this.chatHistory.map(msg => `
            <div class="voice-message ${msg.type}" data-id="${msg.id}">
                <div class="voice-message-bubble">
                    <button class="play-btn" data-message-id="${msg.id}" data-audio-url="${msg.audioUrl || ''}">
                        <svg class="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <svg class="pause-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    </button>
                    <div class="voice-waveform">
                        <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <span class="voice-time" data-message-id="${msg.id}">${msg.duration ? this.formatDuration(msg.duration) : '--:--'}</span>
                </div>
            </div>
        `).join('');

        this.loadAudioDurations();

        chatContainer.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const messageId = btn.getAttribute('data-message-id');
                this.playMessage(messageId);
            });
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async loadAudioDurations() {
        const { chatContainer } = this.elements;
        if (!chatContainer) return;

        for (const msg of this.chatHistory) {
            if (msg.duration && isFinite(msg.duration) && msg.duration > 0) continue;
            if (!msg.audioUrl) continue;

            try {
                const audio = new Audio();
                await new Promise((resolve) => {
                    let resolved = false;
                    const updateDuration = () => {
                        const duration = audio.duration;
                        if (isFinite(duration) && duration > 0 && !resolved) {
                            msg.duration = duration;
                            const timeEl = chatContainer.querySelector(`.voice-time[data-message-id="${msg.id}"]`);
                            if (timeEl) {
                                timeEl.textContent = this.formatDuration(duration);
                            }
                            resolved = true;
                            resolve();
                        }
                    };

                    audio.onloadedmetadata = updateDuration;
                    audio.ondurationchange = updateDuration;
                    
                    // For WebM files, we need to seek to get the duration
                    audio.onloadeddata = () => {
                        if (!isFinite(audio.duration) || audio.duration === 0) {
                            // Trick to get WebM duration: seek to a large time
                            audio.currentTime = 1e101;
                        }
                    };
                    
                    audio.onseeked = updateDuration;

                    audio.onerror = () => {
                        console.warn('Audio load error for message:', msg.id);
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    };
                    
                    audio.src = msg.audioUrl;
                    audio.load();
                    
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    }, 5000);
                });
            } catch (e) {
                console.warn('Could not load duration for message:', msg.id);
            }
        }
        this.saveChatHistory();
    }

    async playMessage(messageId) {
        const message = this.chatHistory.find(m => m.id === messageId);
        if (!message || !message.audioUrl) {
            console.warn('Message not found or no audio URL:', messageId);
            return;
        }

        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.updatePlayButton(this.currentPlayingId, false);
        }

        if (this.currentPlayingId === messageId) {
            this.currentPlayingId = null;
            return;
        }

        try {
            this.audioPlayer = new Audio();
            this.currentPlayingId = messageId;
            this.updatePlayButton(messageId, true);

            await new Promise((resolve, reject) => {
                this.audioPlayer.oncanplaythrough = () => {
                    resolve();
                };

                this.audioPlayer.onended = () => {
                    this.updatePlayButton(messageId, false);
                    this.currentPlayingId = null;
                };

                this.audioPlayer.onerror = (e) => {
                    console.error('Audio element error:', e, 'URL:', message.audioUrl);
                    this.updatePlayButton(messageId, false);
                    this.currentPlayingId = null;
                    reject(new Error('Failed to load audio'));
                };

                this.audioPlayer.src = message.audioUrl;
                this.audioPlayer.load();

                setTimeout(() => {
                    reject(new Error('Audio loading timeout'));
                }, 10000);
            });

            await this.audioPlayer.play();
        } catch (e) {
            console.error('Error playing message:', e);
            this.updatePlayButton(messageId, false);
            this.currentPlayingId = null;
        }
    }

    updatePlayButton(messageId, isPlaying) {
        const msgEl = document.querySelector(`.voice-message[data-id="${messageId}"]`);
        if (!msgEl) return;
        const playIcon = msgEl.querySelector('.play-icon');
        const pauseIcon = msgEl.querySelector('.pause-icon');
        if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';
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
            document.body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + 'px';
            this.renderChatHistory();
        }
    }

    closeModal() {
        const { modal } = this.elements;
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.paddingRight = '0';
            if (this.isConversationActive) {
                this.endConversation();
            }
        }
    }

    async toggleConversation() {
        if (this.isConversationActive) {
            this.endConversation();
        } else {
            await this.startConversation();
        }
    }

    async startConversation() {
        const { recordBtn, idle } = this.elements;

        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.8;

            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);

            this.isConversationActive = true;
            if (recordBtn) recordBtn.classList.add('recording');
            if (idle) idle.style.display = 'none';

            this.showListeningUI();
            this.startVAD();

        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showError('دسترسی به میکروفون امکان‌پذیر نیست');
        }
    }

    endConversation() {
        this.isConversationActive = false;
        this.stopVAD();
        this.stopRecording();
        this.stopStream();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        this.resetUI();
    }

    stopStream() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
    }

    startVAD() {
        if (!this.analyser || !this.isConversationActive) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudio = () => {
            if (!this.isConversationActive) return;
            if (this.isProcessing || this.isPlayingResponse) {
                requestAnimationFrame(checkAudio);
                return;
            }

            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;

            if (average > this.silenceThreshold) {
                if (!this.isRecording) this.startRecording();
                this.speechStarted = true;
                if (this.silenceTimeout) {
                    clearTimeout(this.silenceTimeout);
                    this.silenceTimeout = null;
                }
            } else if (this.isRecording && this.speechStarted) {
                if (!this.silenceTimeout) {
                    this.silenceTimeout = setTimeout(() => {
                        if (Date.now() - this.recordingStartTime >= this.minRecordingTime) {
                            this.finishRecording();
                        }
                    }, this.silenceDuration);
                }
            }

            requestAnimationFrame(checkAudio);
        };

        checkAudio();
    }

    stopVAD() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }

    startRecording() {
        if (this.isRecording || !this.audioStream) return;

        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType: 'audio/webm;codecs=opus' });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.audioChunks.push(event.data);
        };

        this.mediaRecorder.start(100);
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.speechStarted = false;

        this.showRecordingUI();
    }

    stopRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.speechStarted = false;
    }

    async finishRecording() {
        if (!this.isRecording) return;
        this.stopVAD();

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                this.isRecording = false;
                this.speechStarted = false;

                if (this.audioChunks.length > 0) {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    await this.processAudio(audioBlob);
                }
                resolve();
            };
            this.mediaRecorder.stop();
        });
    }

    showListeningUI() {
        const { recording, processing, error, resetBtn } = this.elements;
        if (recording) {
            recording.style.display = 'block';
            const text = recording.querySelector('.n8n-ai-agent-recording-text');
            if (text) text.textContent = 'درحال گوش دادن...';
        }
        if (processing) processing.style.display = 'none';
        if (error) error.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'block';
    }

    showRecordingUI() {
        const { recording } = this.elements;
        if (recording) {
            recording.style.display = 'block';
            const text = recording.querySelector('.n8n-ai-agent-recording-text');
            if (text) text.textContent = 'درحال ضبط...';
        }
    }

    async processAudio(audioBlob) {
        const { recording, processing } = this.elements;
        this.isProcessing = true;

        console.log('Processing user audio...');
        if (recording) recording.style.display = 'none';
        if (processing) processing.style.display = 'block';

        await this.addMessage('user', audioBlob);

        try {
            const response = await this.sendToServer(audioBlob);

            if (response.success && response.audioBlob) {
                const savedMessage = await this.saveAudioToServer(response.audioBlob, 'assistant');

                if (savedMessage && savedMessage.url) {
                    const message = {
                        id: Date.now().toString(),
                        type: 'assistant',
                        audioUrl: savedMessage.url,
                        filename: savedMessage.filename,
                        mimeType: savedMessage.mimeType,
                        timestamp: new Date().toISOString()
                    };
                    this.chatHistory.push(message);
                    this.saveChatHistory();
                    this.renderChatHistory();

                    await this.playResponseFromUrl(savedMessage.url);
                } else {
                    console.error('Failed to save assistant audio to server');
                }

                this.isProcessing = false;
            } else if (response.error) {
                this.isProcessing = false;
                this.showError(response.error);
                setTimeout(() => {
                    if (this.isConversationActive) {
                        this.showListeningUI();
                        this.startVAD();
                    }
                }, 2000);
            } else {
                console.warn('Unexpected response state - no audioBlob and no error');
                this.isProcessing = false;
                if (this.isConversationActive) {
                    this.showListeningUI();
                    this.startVAD();
                }
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            this.isProcessing = false;
            this.showError('خطا در پردازش صدا');
        }
    }

    async saveAudioToServer(audioBlob, type) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, type === 'user' ? 'user-audio.webm' : 'assistant-audio.mp3');
            formData.append('type', type);

            const response = await fetch('/api/save-audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save audio file');
            }

            return await response.json();
        } catch (e) {
            console.error('Error saving audio to server:', e);
            return null;
        }
    }

    async sendToServer(audioBlob) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);

            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-input.webm');

            const response = await fetch('/api/voice-agent', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error || 'خطای سرور' };
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('audio')) {
                const audioBlob = await response.blob();
                return { success: true, audioBlob };
            } else {
                const data = await response.json();
                if (data.audio_response) {
                    const binaryString = atob(data.audio_response);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return { success: true, audioBlob: new Blob([bytes], { type: 'audio/mpeg' }) };
                }
                return { success: data.success !== false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: error.name === 'AbortError' ? 'زمان انتظار به پایان رسید' : error.message };
        }
    }

    async playResponseFromUrl(audioUrl) {
        const { processing } = this.elements;

        console.log('Starting to play assistant response from URL:', audioUrl);
        this.isPlayingResponse = true;
        if (processing) processing.style.display = 'none';

        this.showPlayingUI();

        try {
            this.audioPlayer = new Audio(audioUrl);

            await new Promise((resolve, reject) => {
                let hasStartedPlaying = false;

                this.audioPlayer.oncanplaythrough = () => {
                    console.log('Audio ready to play');
                };

                this.audioPlayer.onplay = () => {
                    hasStartedPlaying = true;
                    console.log('Audio started playing');
                };

                this.audioPlayer.onended = () => {
                    console.log('Assistant audio finished playing');
                    resolve();
                };

                this.audioPlayer.onerror = (e) => {
                    console.error('Error playing assistant audio:', e);
                    reject(e);
                };

                this.audioPlayer.play()
                    .then(() => {
                        console.log('Play promise resolved');
                    })
                    .catch((err) => {
                        console.error('Play failed:', err);
                        reject(err);
                    });

                setTimeout(() => {
                    if (!hasStartedPlaying) {
                        console.warn('Audio never started, resolving anyway');
                        reject(new Error('Audio playback timeout'));
                    }
                }, 120000);
            });

        } catch (error) {
            console.error('Error in playResponseFromUrl:', error);
        } finally {
            this.isPlayingResponse = false;
            this.hidePlayingUI();
            console.log('Preparing to return to listening mode...');

            if (this.isConversationActive) {
                await new Promise(resolve => setTimeout(resolve, 800));
                console.log('Returning to listening mode');
                this.showListeningUI();
                this.startVAD();
            }
        }
    }

    showPlayingUI() {
        const { recording, processing, recordBtn } = this.elements;
        console.log('Showing playing UI');

        if (recording) recording.style.display = 'none';
        if (processing) processing.style.display = 'none';

        if (recordBtn) {
            recordBtn.classList.add('playing');
            recordBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
            `;
        }
    }

    hidePlayingUI() {
        const { recordBtn } = this.elements;

        if (recordBtn) {
            recordBtn.classList.remove('playing');
            recordBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
            `;
        }
    }

    showError(message) {
        const { processing, error, errorText, recording } = this.elements;
        if (processing) processing.style.display = 'none';
        if (recording) recording.style.display = 'none';
        if (error) error.style.display = 'block';
        if (errorText) errorText.textContent = message;
    }

    resetUI() {
        const { idle, recording, processing, error, recordBtn, resetBtn } = this.elements;

        if (this.chatHistory.length === 0) {
            if (idle) idle.style.display = 'block';
        }
        if (recording) recording.style.display = 'none';
        if (processing) processing.style.display = 'none';
        if (error) error.style.display = 'none';
        if (recordBtn) {
            recordBtn.style.display = 'block';
            recordBtn.classList.remove('recording');
        }
        if (resetBtn) resetBtn.style.display = 'none';

        this.isProcessing = false;
        this.isPlayingResponse = false;
    }
}

window.n8nAiVoiceAgent = new N8nAiVoiceAgent();

function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                targetElement.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

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

    header.appendChild(menuButton);
}

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

function setupParallax() {
}

function handleScrollAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                requestAnimationFrame(() => {
                    entry.target.classList.add('visible');
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.glass-card');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');

    const menuLoaded = await loadMenuData();

    if (!menuLoaded) {
        console.error('Failed to load menu data');
        const menuContainer = document.getElementById('pizza-menu');
        if (menuContainer) {
            menuContainer.innerHTML = '<p class="text-center text-red-400">خطا در بارگذاری منو</p>';
        }
        return;
    }

    renderMenu();

    const deferredInit = () => {
        setupNavigation();
        setupMobileMenu();
        handleScrollAnimations();
        setupParallax();
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(deferredInit, { timeout: 1000 });
    } else {
        setTimeout(deferredInit, 100);
    }
});


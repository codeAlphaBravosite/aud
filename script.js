class VoiceoverGenerator {
    constructor() {
        this.settings = this.loadSettingsFromStorage();
        this.voiceHistory = JSON.parse(localStorage.getItem('voiceHistory') || '[]');
        this.audioCache = new Map();
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
        this.loadSharedVoices();
        this.loadVoiceHistory();
    }

    loadSettingsFromStorage() {
        return {
            apiKey: localStorage.getItem('apiKey') || '',
            voiceId: localStorage.getItem('voiceId') || '',
            stability: parseFloat(localStorage.getItem('stability')) || 0.5,
            similarityBoost: parseFloat(localStorage.getItem('similarityBoost')) || 0.7,
            sharedVoices: JSON.parse(localStorage.getItem('sharedVoices') || '[]')
        };
    }

    initializeElements() {
        // Buttons
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.generateBtn = document.getElementById('generateBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.addVoiceBtn = document.getElementById('addVoiceBtn');
        
        // Input elements
        this.textInput = document.getElementById('textInput');
        
        // Settings elements
        this.settingsModal = document.getElementById('settingsModal');
        this.apiKeyInput = document.getElementById('apiKey');
        this.voiceIdInput = document.getElementById('voiceId');
        this.stabilityInput = document.getElementById('stability');
        this.similarityBoostInput = document.getElementById('similarityBoost');
        this.stabilityValue = document.getElementById('stabilityValue');
        this.similarityBoostValue = document.getElementById('similarityBoostValue');
        this.voicesList = document.getElementById('voicesList');
        this.sharedVoicesList = document.getElementById('sharedVoicesList');
        
        // Output section
        this.outputSection = document.getElementById('outputSection');
    }

    setupEventListeners() {
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.generateBtn.addEventListener('click', () => this.generateVoiceovers());
        this.resetBtn.addEventListener('click', () => this.resetVoiceovers());
        this.addVoiceBtn.addEventListener('click', () => this.addSharedVoice());
        
        // Settings range inputs
        this.stabilityInput.addEventListener('input', (e) => {
            this.stabilityValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        this.similarityBoostInput.addEventListener('input', (e) => {
            this.similarityBoostValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        // Settings text inputs
        this.apiKeyInput.addEventListener('change', () => this.updateSettings());
        this.voiceIdInput.addEventListener('change', () => this.updateSettings());
        this.voicesList.addEventListener('change', () => this.updateSettings());
    }

    async loadSharedVoices() {
        if (!this.settings.apiKey) return;

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.settings.apiKey
                }
            });

            if (!response.ok) throw new Error('Failed to fetch voices');

            const data = await response.json();
            this.updateVoicesList(data.voices);
        } catch (error) {
            console.error('Error loading voices:', error);
        }
    }

    updateVoicesList(voices) {
        this.voicesList.innerHTML = '<option value="">Select a voice</option>';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = voice.name;
            this.voicesList.appendChild(option);
        });

        // Add saved shared voices
        this.settings.sharedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = `${voice.name} (Shared)`;
            this.voicesList.appendChild(option);
        });
    }

    addSharedVoice() {
        const name = prompt('Enter a name for this voice:');
        const id = this.voiceIdInput.value.trim();
        
        if (!name || !id) {
            alert('Both name and voice ID are required');
            return;
        }

        const newVoice = { id, name };
        this.settings.sharedVoices.push(newVoice);
        localStorage.setItem('sharedVoices', JSON.stringify(this.settings.sharedVoices));
        
        this.updateVoicesList([]);
        this.voiceIdInput.value = '';
    }

    async resetVoiceovers() {
        if (!confirm('Are you sure you want to reset? This will:\n- Delete all voiceovers\n- Clear the audio cache\n- Reset the API key\n\nShared voice data will be preserved.')) {
            return;
        }

        try {
            if (this.settings.apiKey) {
                const response = await fetch('https://api.elevenlabs.io/v1/history', {
                    method: 'DELETE',
                    headers: {
                        'xi-api-key': this.settings.apiKey
                    }
                });

                if (!response.ok) throw new Error('Failed to reset voiceovers');
            }

            // Clear audio cache and history
            this.audioCache.clear();
            this.voiceHistory = [];
            localStorage.removeItem('voiceHistory');
            
            // Reset API key but keep shared voices
            this.settings.apiKey = '';
            this.apiKeyInput.value = '';
            localStorage.removeItem('apiKey');
            
            // Clear output
            this.outputSection.innerHTML = '';
            
            alert('Reset completed successfully.');
        } catch (error) {
            alert('Error during reset: ' + error.message);
        }
    }

    loadSettings() {
        this.apiKeyInput.value = this.settings.apiKey;
        this.voiceIdInput.value = this.settings.voiceId;
        this.stabilityInput.value = this.settings.stability;
        this.similarityBoostInput.value = this.settings.similarityBoost;
        this.stabilityValue.textContent = this.settings.stability;
        this.similarityBoostValue.textContent = this.settings.similarityBoost;
    }

    loadVoiceHistory() {
        this.voiceHistory.forEach(item => {
            const chunkContainer = this.createChunkContainer(item.text);
            this.outputSection.appendChild(chunkContainer);
            
            item.audioUrls.forEach(url => {
                this.createAudioElement(chunkContainer, url);
            });
        });
    }

    updateSettings() {
        this.settings = {
            ...this.settings,
            apiKey: this.apiKeyInput.value,
            voiceId: this.voicesList.value || this.voiceIdInput.value,
            stability: parseFloat(this.stabilityInput.value),
            similarityBoost: parseFloat(this.similarityBoostInput.value)
        };
        
        // Save to localStorage
        Object.entries(this.settings).forEach(([key, value]) => {
            if (key === 'sharedVoices') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
        });

        // Reload shared voices when API key changes
        if (this.apiKeyInput.value !== localStorage.getItem('apiKey')) {
            this.loadSharedVoices();
        }
    }

    openSettings() {
        this.settingsModal.style.display = 'block';
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    splitText(text) {
        return text.split('।').map(chunk => chunk.trim()).filter(chunk => chunk);
    }

    async generateVoiceovers() {
        if (!this.validateSettings()) return;

        const text = this.textInput.value.trim();
        if (!text) {
            alert('Please enter some text to convert to speech.');
            return;
        }

        // Clear previous outputs and cache
        this.outputSection.innerHTML = '';
        this.audioCache.clear();
        this.voiceHistory = [];
        localStorage.removeItem('voiceHistory');

        const chunks = this.splitText(text);

        for (const chunk of chunks) {
            const chunkContainer = this.createChunkContainer(chunk);
            this.outputSection.appendChild(chunkContainer);

            const audioUrls = [];
            // Generate three versions for each chunk
            for (let i = 0; i < 3; i++) {
                const audioUrl = await this.generateSingleVoiceover(chunk, chunkContainer);
                if (audioUrl) audioUrls.push(audioUrl);
            }

            // Save to history
            if (audioUrls.length > 0) {
                this.voiceHistory.push({ text: chunk, audioUrls });
                localStorage.setItem('voiceHistory', JSON.stringify(this.voiceHistory));
            }
        }
    }

    validateSettings() {
        if (!this.settings.apiKey) {
            alert('Please enter your ElevenLabs API key in settings.');
            return false;
        }
        if (!this.settings.voiceId) {
            alert('Please select a voice or enter a voice ID in settings.');
            return false;
        }
        return true;
    }

    createChunkContainer(text) {
        const container = document.createElement('div');
        container.className = 'chunk-container';
        
        const textElement = document.createElement('div');
        textElement.className = 'chunk-text';
        textElement.textContent = text;
        
        const versionsContainer = document.createElement('div');
        versionsContainer.className = 'audio-versions';
        
        container.appendChild(textElement);
        container.appendChild(versionsContainer);
        
        return container;
    }

    createAudioElement(chunkContainer, audioUrl) {
        const versionsContainer = chunkContainer.querySelector('.audio-versions');
        const versionElement = document.createElement('div');
        versionElement.className = 'audio-version';
        versionElement.innerHTML = `
            <audio controls src="${audioUrl}"></audio>
            <div class="audio-controls">
                <a href="${audioUrl}" download="voiceover.mp3" class="primary-button">Download</a>
            </div>
        `;
        versionsContainer.appendChild(versionElement);
    }

    async generateSingleVoiceover(text, chunkContainer) {
        const versionsContainer = chunkContainer.querySelector('.audio-versions');
        const versionElement = document.createElement('div');
        versionElement.className = 'audio-version';
        versionElement.innerHTML = '<p>Generating audio...</p>';
        versionsContainer.appendChild(versionElement);

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + this.settings.voiceId, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.settings.apiKey
                },
                body: JSON.stringify({
                    text,
                    voice_settings: {
                        stability: this.settings.stability,
                        similarity_boost: this.settings.similarityBoost
                    }
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            versionElement.innerHTML = `
                <audio controls src="${audioUrl}"></audio>
                <div class="audio-controls">
                    <a href="${audioUrl}" download="voiceover.mp3" class="primary-button">Download</a>
                </div>
            `;

            return audioUrl;
        } catch (error) {
            versionElement.innerHTML = `<p class="error">Error generating audio: ${error.message}</p>`;
            return null;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new VoiceoverGenerator();
});
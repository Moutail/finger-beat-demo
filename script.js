// FONCTION POUR LE FIX MOBILE - À PLACER AU DÉBUT
function addMobileScrollFix() {
    const mobileScrollFix = `
        .music-panel, .settings-panel, .stats-panel {
            position: fixed !important;
            top: 0 !important;
            height: 100vh !important;
            height: 100dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color) var(--glass-background);
            touch-action: pan-y !important;
        }
        
        .music-panel {
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 20px)) !important;
        }

        .settings-panel {
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 20px)) !important;
        }

        .stats-panel {
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 20px)) !important;
        }
        
        .music-panel::-webkit-scrollbar,
        .settings-panel::-webkit-scrollbar,
        .stats-panel::-webkit-scrollbar {
            width: 6px;
        }

        .music-panel::-webkit-scrollbar-track,
        .settings-panel::-webkit-scrollbar-track,
        .stats-panel::-webkit-scrollbar-track {
            background: transparent;
        }

        .music-panel::-webkit-scrollbar-thumb,
        .settings-panel::-webkit-scrollbar-thumb,
        .stats-panel::-webkit-scrollbar-thumb {
            background: var(--primary-color);
            border-radius: 3px;
            opacity: 0.7;
        }
    `;
    
    if (!document.getElementById('mobileScrollFix')) {
        const style = document.createElement('style');
        style.id = 'mobileScrollFix';
        style.textContent = mobileScrollFix;
        document.head.appendChild(style);
        console.log('✅ Mobile scroll fix applied');
    }
}

// CLASSE PRINCIPALE DU JEU CORRIGÉE
class FingerBeatGame {
    constructor() {
        this.initializeGame();
        this.setupEventListeners();
        this.loadGameData();
        this.hideLoadingScreen();
        this.setupPWA();
        this.setupAudioActivation();

        // Appliquer le fix CSS pour mobile
        addMobileScrollFix();
        
        // Précharger les fichiers audio
        this.preloadAudioFiles();

        // Générer l'audio de base
        this.generateGenreAudio('viral');
        
        // Essayer de charger une vraie piste après un délai
        setTimeout(() => {
            this.selectTrack('arcade').catch(() => {
                console.log('Arcade pas encore prête, utilisation de l\'audio généré');
            });
        }, 3000);

        // Gestionnaire pour activer l'audio au clic
        document.addEventListener('click', async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.activateAudio();
                if (this.audioBuffer && this.gameState.isPlaying && !this.gameState.isPaused) {
                    this.startAudioPlayback();
                }
            }
        });
    }

    initializeGame() {
        // Audio setup
        this.audioContext = null;
        this.audioSource = null;
        this.audioBuffer = null;
        this.currentGenre = 'viral';
        this.currentTrack = null;
        this.isLoadingAudio = false;
        this.metronomeInterval = null;
        this.nextBeatTime = 0;
        this.beatIndex = 0;
        this.gainNode = null;

        // Game state - CORRECTION: Variables de timing plus précises
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            pausedForMenu: false,
            score: 0,
            level: 1,
            lives: 3,
            combo: 0,
            maxCombo: 0,
            currentTarget: 3,
            timeRemaining: 100,
            maxTime: 100,
            speedMultiplier: 1,
            startTime: 0,
            totalHits: 0,
            correctHits: 0,
            lastInputTime: 0 // NOUVEAU: Pour éviter les doubles clics
        };

        // Tutorial and progression
        this.tutorialMode = true;
        this.tutorialStep = 0;
        this.levelGoals = {
            1: { targetsToHit: 5, description: "Learn the basics - Hit 5 numbers correctly" },
            2: { targetsToHit: 10, description: "Find the rhythm - Hit 10 numbers without error" },
            3: { targetsToHit: 15, description: "Speed up - Timer becomes faster" },
            4: { targetsToHit: 20, description: "Combo Mode - Build combos for more points" },
            5: { targetsToHit: 25, description: "Expert Mode - Maximum speed activated" }
        };
        this.targetsHitInLevel = 0;

        // Audio configuration
        this.genres = {
            viral: { bpm: 140, name: 'Viral Phonk' },
            hype: { bpm: 128, name: 'EDM Hype' },
            chill: { bpm: 85, name: 'Chill Trap' },
            custom: { bpm: 120, name: 'Custom Audio' }
        };

        this.tracks = {
            arcade: { 
                name: 'Love is Gone - SLANDER',
                file: 'audio/SLANDER_Love_is_Gone.mp3',
                bpm: 72
            },
            losing_game: { 
                name: 'A Losing Game - Duncan Laurence',
                file: 'audio/Duncan_Laurence_A_Losing_Game.mp3',
                bpm: 95
            },
            jujutsu: { 
                name: 'Jujutsu Kaisen OP3',
                file: 'audio/jujukaisenOp3.mp3',
                bpm: 145
            },
            dandadan: { 
                name: 'DAN DA DAN Opening',
                file: 'audio/DAN_DA_DAN_Opening.mp3',
                bpm: 165
            },
            crazy: { 
                name: 'Crazy - Electronic Pop',
                file: 'audio/BEAUZ_JVNA_Crazy_Electronic_Pop_NCS.mp3',
                bpm: 128
            }
        };

        // Game settings
        this.settings = {
            musicVolume: 0.7,
            sfxEnabled: true,
            metronomeEnabled: true,
            particlesEnabled: true,
            screenShakeEnabled: true,
            vibrationEnabled: true,
            difficulty: 'normal',
            autoSave: true,
            theme: 'viral'
        };

        // Statistics tracking
        this.stats = {
            totalScore: 0,
            gamesPlayed: 0,
            bestCombo: 0,
            totalTime: 0,
            totalHits: 0,
            correctHits: 0,
            perfectGames: 0,
            highScores: []
        };

        // Achievement system
        this.achievements = {
            firstSteps: true,
            combo10: false,
            level5: false,
            perfect: false,
            score10k: false
        };

        // CORRECTION: Difficulté mieux équilibrée
        this.difficultySettings = {
            easy: { speedMultiplier: 0.6, timeMultiplier: 1.8 },
            normal: { speedMultiplier: 1.0, timeMultiplier: 1.0 },
            hard: { speedMultiplier: 1.4, timeMultiplier: 0.7 },
            expert: { speedMultiplier: 1.8, timeMultiplier: 0.5 }
        };
    }

    // PWA and Installation
    setupPWA() {
        if ('serviceWorker' in navigator) {
            const swUrl = `${window.location.origin}/sw.js`;
            
            navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('SW registered:', registration);
                registration.update();
            })
            .catch(error => {
                console.error('SW registration failed:', error);
            });
        }

        // Gestion du prompt d'installation PWA
        let deferredPrompt = null;
        const installButton = document.createElement('button');
        installButton.id = 'installButton';
            installButton.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #000;
            border: 2px solid #FFD700;
            border-radius: 25px;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            display: none;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
            transition: all 0.3s ease;
            animation: crownPulse 2s infinite;
        `;
        installButton.innerHTML = '👑 Install Game';

        // Animation pour le bouton d'installation
        const crownPulseStyle = document.createElement('style');
        crownPulseStyle.textContent = `
            @keyframes crownPulse {
                0%, 100% {
                    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
                    transform: scale(1);
                }
                50% {
                    box-shadow: 0 6px 30px rgba(255, 215, 0, 0.8);
                    transform: scale(1.05);
                }
            }
        `;
        document.head.appendChild(crownPulseStyle);

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installButton.style.display = 'block';
            console.log('Install prompt ready');
        });

        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                console.log('No install prompt available');
                return;
            }

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.showToast('🎉 Installing Finger Beat...', 3000, 'success');
            }
            
            deferredPrompt = null;
            installButton.style.display = 'none';
        });

        window.addEventListener('appinstalled', () => {
            console.log('App installed successfully');
            this.showToast('✅ Finger Beat installed!', 3000, 'success');
            installButton.style.display = 'none';
            deferredPrompt = null;
        });

        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is running in standalone mode');
        }
    }

    // Enhanced notification system
    showToast(message, duration = 3000, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Positionner en haut sur mobile pour ne pas cacher les contrôles
        const isMobile = window.innerWidth <= 768;
        toast.style.cssText = `
            position: fixed;
            ${isMobile ? 'top: 80px' : 'bottom: 20px'};
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            z-index: 1001;
            animation: ${isMobile ? 'slideDown' : 'slideUp'} 0.3s ease-out;
            max-width: 300px;
            text-align: center;
            border: 1px solid ${type === 'success' ? 'var(--primary-color)' : type === 'error' ? 'var(--accent-color)' : 'var(--glass-border)'};
            box-shadow: 0 0 20px ${type === 'success' ? 'rgba(0,255,136,0.3)' : type === 'error' ? 'rgba(255,0,110,0.3)' : 'rgba(255,255,255,0.1)'};
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = `${isMobile ? 'slideUp' : 'slideDown'} 0.3s ease-out reverse`;
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Data management
    saveGameData() {
        if (!this.settings.autoSave) return;
        
        const saveData = {
            stats: this.stats,
            achievements: this.achievements,
            settings: this.settings,
            version: '2.0',
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('fingerBeat_saveData', JSON.stringify(saveData));
        } catch (error) {
            console.warn('Could not save game data:', error);
        }
    }

    loadGameData() {
        try {
            const savedData = localStorage.getItem('fingerBeat_saveData');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                if (data.version && data.version === '2.0') {
                    this.stats = { ...this.stats, ...data.stats };
                    this.achievements = { ...this.achievements, ...data.achievements };
                    this.settings = { ...this.settings, ...data.settings };
                    
                    this.updateStatisticsDisplay();
                    this.applySettings();
                }
            }
        } catch (error) {
            console.warn('Could not load game data:', error);
        }
    }

    exportGameData() {
        const saveData = {
            stats: this.stats,
            achievements: this.achievements,
            settings: this.settings,
            version: '2.0',
            timestamp: Date.now()
        };
        
        const dataStr = JSON.stringify(saveData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fingerbeat_save_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('Game data exported successfully!', 3000, 'success');
    }

    importGameData() {
        document.getElementById('dataImportFile').click();
    }

    resetGameData() {
        if (confirm('Are you sure? This will delete all your progress and cannot be undone.')) {
            localStorage.removeItem('fingerBeat_saveData');
            this.stats = {
                totalScore: 0,
                gamesPlayed: 0,
                bestCombo: 0,
                totalTime: 0,
                totalHits: 0,
                correctHits: 0,
                perfectGames: 0,
                highScores: []
            };
            this.achievements = {
                firstSteps: false,
                combo10: false,
                level5: false,
                perfect: false,
                score10k: false
            };
            this.updateStatisticsDisplay();
            this.updateAchievements();
            this.showToast('All data has been reset!', 3000, 'success');
        }
    }

    // Settings management
    applySettings() {
        this.selectTheme(this.settings.theme);
        
        if (this.gainNode) {
            this.gainNode.gain.value = this.settings.musicVolume;
        }
        
        document.getElementById('musicVolumeSlider').querySelector('.setting-slider-fill').style.width = 
            (this.settings.musicVolume * 100) + '%';
        document.getElementById('musicVolumeSlider').querySelector('.setting-slider-thumb').style.left = 
            (this.settings.musicVolume * 100) + '%';
        
        this.updateToggle('sfxToggle', this.settings.sfxEnabled);
        this.updateToggle('metronomeToggle', this.settings.metronomeEnabled);
        this.updateToggle('particlesToggle', this.settings.particlesEnabled);
        this.updateToggle('screenShakeToggle', this.settings.screenShakeEnabled);
        this.updateToggle('vibrationToggle', this.settings.vibrationEnabled);
        this.updateToggle('autoSaveToggle', this.settings.autoSave);
        
        document.getElementById('difficultySelect').value = this.settings.difficulty;
        
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.settings.theme);
        });
    }

    updateToggle(toggleId, value) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.classList.toggle('active', value);
        }
    }

    selectTheme(theme) {
        this.settings.theme = theme;
        
        document.querySelectorAll('.bg-layer').forEach(layer => {
            layer.classList.remove('active');
        });
        
        const bgElement = document.getElementById(`bg${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
        if (bgElement) {
            bgElement.classList.add('active');
        }
        
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        
        this.saveGameData();
    }

    // Statistics and achievements
    updateStatisticsDisplay() {
        document.getElementById('totalScoreDisplay').textContent = this.stats.totalScore.toLocaleString();
        document.getElementById('gamesPlayedDisplay').textContent = this.stats.gamesPlayed;
        document.getElementById('bestComboDisplay').textContent = this.stats.bestCombo;
        document.getElementById('totalTimeDisplay').textContent = Math.floor(this.stats.totalTime / 60) + 'm';
        
        const accuracy = this.stats.totalHits > 0 ? 
            Math.round((this.stats.correctHits / this.stats.totalHits) * 100) : 100;
        document.getElementById('accuracyDisplay').textContent = accuracy + '%';
        document.getElementById('perfectGamesDisplay').textContent = this.stats.perfectGames;
        
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        
        const sortedScores = [...this.stats.highScores].sort((a, b) => b.score - a.score).slice(0, 5);
        
        for (let i = 0; i < 5; i++) {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            
            const score = sortedScores[i];
            entry.innerHTML = `
                <span class="leaderboard-rank">#${i + 1}</span>
                <span>${score ? new Date(score.date).toLocaleDateString() : '-'}</span>
                <span class="leaderboard-score">${score ? score.score.toLocaleString() : '0'}</span>
            `;
            
            leaderboardList.appendChild(entry);
        }
    }

    updateAchievements() {
        document.getElementById('combo10Icon').classList.toggle('unlocked', this.achievements.combo10);
        document.getElementById('level5Icon').classList.toggle('unlocked', this.achievements.level5);
        document.getElementById('perfectIcon').classList.toggle('unlocked', this.achievements.perfect);
        document.getElementById('scoreIcon').classList.toggle('unlocked', this.achievements.score10k);
    }

    checkAchievements() {
        let newAchievements = [];
        
        if (!this.achievements.combo10 && this.gameState.combo >= 10) {
            this.achievements.combo10 = true;
            newAchievements.push({
                text: '🔥 Combo Master',
                detail: 'Reached 10x combo!'
            });
        }
        
        if (!this.achievements.level5 && this.gameState.level >= 5) {
            this.achievements.level5 = true;
            newAchievements.push({
                text: '⭐ Level Champion',
                detail: 'Reached level 5!'
            });
        }
        
        if (!this.achievements.score10k && this.gameState.score >= 10000) {
            this.achievements.score10k = true;
            newAchievements.push({
                text: '👑 Score Legend', 
                detail: 'Scored over 10,000 points!'
            });
        }
        
        const accuracy = this.gameState.totalHits > 0 ? 
            (this.gameState.correctHits / this.gameState.totalHits) : 1;
        if (!this.achievements.perfect && accuracy === 1 && this.gameState.totalHits >= 10) {
            this.achievements.perfect = true;
            newAchievements.push({
                text: '💎 Perfectionist',
                detail: 'Perfect accuracy!'
            });
        }
        
        // Afficher les achievements sur le côté pour ne pas cacher le jeu
        newAchievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showAchievementNotification(achievement);
            }, index * 800);
        });
        
        if (newAchievements.length > 0) {
            this.updateAchievements();
            this.saveGameData();
        }
    }

    // Nouvelle méthode pour afficher les achievements sans gêner le jeu
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon-notification">${achievement.text.split(' ')[0]}</div>
            <div class="achievement-text-notification">
                <div class="achievement-title">${achievement.text}</div>
                <div class="achievement-detail">${achievement.detail}</div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            right: -350px;
            top: 80px;
            width: 300px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid var(--primary-color);
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 999;
            transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.right = '20px';
        }, 50);
        
        // Animation de sortie
        setTimeout(() => {
            notification.style.right = '-350px';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Audio system
    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1500);
    }

    showLoadingIndicator(text = 'Loading...') {
        const indicator = document.getElementById('loadingIndicator');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        
        // CORRECTION: Positionner en haut pour ne pas cacher les boutons
        indicator.style.top = '20%';
        indicator.style.transform = 'translate(-50%, 0)';
        indicator.classList.add('show');
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        indicator.classList.remove('show');
    }

    async setupAudioContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✅ AudioContext created');
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed');
            }
            
            console.log(`AudioContext state: ${this.audioContext.state}`);
            return this.audioContext.state === 'running';
        } catch (error) {
            console.error('❌ Audio context error:', error);
            return false;
        }
    }

    async activateAudio() {
        if (!this.audioContext) {
            await this.setupAudioContext();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('✅ Audio context resumed');
                return true;
            } catch (error) {
                console.error('❌ Failed to resume audio context:', error);
                return false;
            }
        }
        return this.audioContext && this.audioContext.state === 'running';
    }

    setupAudioActivation() {
        const activateOnClick = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                const activated = await this.activateAudio();
                if (activated && this.audioBuffer && this.gameState.isPlaying) {
                    this.startAudioPlayback();
                    this.showToast('🎵 Audio enabled!', 2000, 'success');
                }
            }
        };
        
        document.addEventListener('click', activateOnClick, { once: false });
        document.addEventListener('touchstart', activateOnClick, { once: false });
    }

    async preloadAudioFiles() {
        console.log('📦 Preloading audio files...');
        const tracksToPreload = ['arcade', 'losing_game', 'jujutsu', 'dandadan', 'crazy'];
        
        for (const trackId of tracksToPreload) {
            const track = this.tracks[trackId];
            if (track) {
                try {
                    const response = await fetch(track.file);
                    if (response.ok) {
                        console.log(`✅ Preloaded: ${track.file}`);
                        
                        const audio = new Audio();
                        audio.preload = 'metadata';
                        audio.src = track.file;
                        track.preloadedAudio = audio;
                    } else {
                        console.log(`❌ Failed to preload: ${track.file} (${response.status})`);
                    }
                } catch (error) {
                    console.log(`❌ Error preloading: ${track.file}`, error.message);
                }
            }
        }
        console.log('📦 Preloading complete');
    }

    // CORRECTION MAJEURE: startGame amélioré avec timing précis
    async startGame() {
        document.getElementById('tutorialOverlay').style.display = 'none';
        
        const audioActivated = await this.activateAudio();
        if (!audioActivated) {
            this.showToast('🔊 Click anywhere to enable audio', 3000, 'info');
        }
        
        // CORRECTION: Reset complet de l'état du jeu
        this.gameState = {
            isPlaying: true,
            isPaused: false,
            pausedForMenu: false,
            score: 0,
            level: 1,
            lives: 3,
            combo: 0,
            maxCombo: 0,
            currentTarget: 1, // Commencer par 1 au lieu de 3
            timeRemaining: 100,
            maxTime: 120, // Plus de temps au début
            speedMultiplier: 0.7, // Plus lent au début
            startTime: Date.now(),
            totalHits: 0,
            correctHits: 0,
            lastInputTime: 0
        };
        
        this.updateDisplay();
        document.getElementById('targetContainer').style.display = 'flex';
        document.getElementById('controlsContainer').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'flex';
        
        if (!this.audioBuffer) {
            console.log('⚠️ No audio buffer, generating...');
            await this.generateGenreAudio(this.currentGenre || 'viral');
        }
        
        if (audioActivated && this.audioContext.state === 'running') {
            await this.startAudioPlayback();
        }
        
        this.generateNewChallenge();
        this.gameLoop();
    }

    // NOUVELLES MÉTHODES pour gérer la pause/reprise des menus
    pauseGameForMenu() {
        console.log('⏸️ Pausing game for menu');
        if (!this.gameState.isPlaying) return;
        
        this.gameState.isPaused = true;
        this.gameState.pausedForMenu = true;
        
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        this.stopMetronome();
        
        // Effet visuel pour indiquer la pause
        const gameZone = document.querySelector('.game-zone');
        if (gameZone) {
            gameZone.classList.add('menu-paused');
        }
    }

    resumeGameFromMenu() {
        console.log('▶️ Resuming game from menu');
        if (!this.gameState.isPlaying) return;
        
        this.gameState.isPaused = false;
        this.gameState.pausedForMenu = false;
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                if (this.settings.metronomeEnabled) {
                    this.startMetronome();
                }
            });
        }
        
        // Retirer l'effet visuel de pause
        const gameZone = document.querySelector('.game-zone');
        if (gameZone) {
            gameZone.classList.remove('menu-paused');
        }
        
        this.gameLoop();
    }

    pauseGame() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;
        
        this.gameState.isPaused = true;
        document.getElementById('pauseOverlay').classList.add('show');
        
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        this.stopMetronome();
    }

    resumeGame() {
        this.gameState.isPaused = false;
        document.getElementById('pauseOverlay').classList.remove('show');
        if (this.audioContext && this.audioContext.state === 'suspended') {
           this.audioContext.resume().then(() => {
               this.startMetronome();
           });
       }
       this.gameLoop();
   }

   restartGame() {
       document.getElementById('gameOverOverlay').classList.remove('show');
       document.getElementById('pauseOverlay').classList.remove('show');
       
       document.querySelectorAll('.life-dot').forEach(dot => {
           dot.classList.remove('lost');
       });
       
       document.getElementById('timerCircle').style.stroke = 'url(#timerGradient)';
       this.startGame();
   }

   quitToMenu() {
       this.gameState.isPlaying = false;
       this.stopMetronome();
       
       if (this.audioSource) {
           try {
               this.audioSource.stop();
               this.audioSource.disconnect();
           } catch (e) {}
       }

       document.getElementById('gameOverOverlay').classList.remove('show');
       document.getElementById('pauseOverlay').classList.remove('show');
       document.getElementById('targetContainer').style.display = 'none';
       document.getElementById('controlsContainer').style.display = 'none';
       document.getElementById('pauseBtn').style.display = 'none';
       document.getElementById('tutorialOverlay').style.display = 'flex';

       // Retirer l'effet de pause si présent
       const gameZone = document.querySelector('.game-zone');
       if (gameZone) {
           gameZone.classList.remove('menu-paused');
       }

       this.resetDisplays();
   }

   shareScore() {
       const score = this.gameState.score;
       const level = this.gameState.level;
       const text = `🎮 I just scored ${score.toLocaleString()} points and reached level ${level} in Finger Beat! Can you beat my score?`;
       
       if (navigator.share) {
           navigator.share({
               title: 'Finger Beat - My Score',
               text: text,
               url: window.location.href
           });
       } else {
           navigator.clipboard.writeText(text + ' ' + window.location.href);
           this.showToast('Score copied to clipboard!', 3000, 'success');
       }
   }

   updateDisplay() {
       document.getElementById('scoreValue').textContent = this.gameState.score.toLocaleString();
       document.getElementById('comboValue').textContent = `x${this.gameState.combo}`;
       document.getElementById('levelValue').textContent = this.gameState.level;
       
       const accuracy = this.gameState.totalHits > 0 ? 
           Math.round((this.gameState.correctHits / this.gameState.totalHits) * 100) : 100;
       document.getElementById('accuracyValue').textContent = accuracy + '%';
       
       const fillPercent = Math.min((this.gameState.combo / 20) * 100, 100);
       document.getElementById('comboFill').style.width = fillPercent + '%';

       for (let i = 1; i <= 3; i++) {
           const lifeDot = document.getElementById(`life${i}`);
           if (i > this.gameState.lives) {
               lifeDot.classList.add('lost');
           } else {
               lifeDot.classList.remove('lost');
           }
       }
   }

   resetDisplays() {
       document.getElementById('scoreValue').textContent = '0';
       document.getElementById('comboValue').textContent = 'x0';
       document.getElementById('comboFill').style.width = '0%';
       document.getElementById('levelValue').textContent = '1';
       document.getElementById('accuracyValue').textContent = '100%';
       
       document.querySelectorAll('.life-dot').forEach(dot => {
           dot.classList.remove('lost');
       });
   }

   updateTimerDisplay() {
       const progress = this.gameState.timeRemaining / this.gameState.maxTime;
       const circumference = 2 * Math.PI * 140;
       const offset = circumference - (progress * circumference);
       document.getElementById('timerCircle').style.strokeDashoffset = offset;

       if (progress < 0.2) {
           document.getElementById('timerCircle').style.stroke = '#ff006e';
       } else if (progress < 0.5) {
           document.getElementById('timerCircle').style.stroke = '#ffff00';
       } else {
           document.getElementById('timerCircle').style.stroke = 'url(#timerGradient)';
       }
   }

   // CORRECTION MAJEURE: generateNewChallenge avec logique améliorée
   generateNewChallenge() {
       // Éviter la répétition immédiate du même nombre
       let newTarget;
       let attempts = 0;
       do {
           newTarget = Math.floor(Math.random() * 5) + 1;
           attempts++;
       } while (newTarget === this.gameState.currentTarget && attempts < 5);
       
       this.gameState.currentTarget = newTarget;
       
       // Ajuster le temps selon la difficulté et le niveau
       const difficulty = this.difficultySettings[this.settings.difficulty];
       const levelAdjustment = Math.max(0.5, 1 - (this.gameState.level - 1) * 0.1);
       this.gameState.timeRemaining = this.gameState.maxTime * difficulty.timeMultiplier * levelAdjustment;
       
       // S'assurer qu'il y a toujours un minimum de temps
       this.gameState.timeRemaining = Math.max(30, this.gameState.timeRemaining);
       
       document.getElementById('targetNumber').textContent = this.gameState.currentTarget;
       
       const dots = document.querySelectorAll('.indicator-dot');
       dots.forEach((dot, index) => {
           setTimeout(() => {
               if (index < this.gameState.currentTarget) {
                   dot.classList.add('active');
               } else {
                   dot.classList.remove('active');
               }
           }, index * 50);
       });
       
       console.log(`🎯 New challenge: ${this.gameState.currentTarget}, Time: ${this.gameState.timeRemaining.toFixed(0)}`);
   }

   // CORRECTION MAJEURE: gameLoop avec timing précis
   gameLoop() {
       if (!this.gameState.isPlaying || this.gameState.isPaused) return;

       // Timing plus précis avec deltaTime
       const currentTime = performance.now();
       const deltaTime = 16.67; // 60 FPS
       
       // Ajustement de vitesse selon difficulté et niveau
       const difficulty = this.difficultySettings[this.settings.difficulty];
       const speedMultiplier = difficulty.speedMultiplier * (1 + (this.gameState.level - 1) * 0.1);
       
       this.gameState.timeRemaining -= speedMultiplier * (deltaTime / 16.67);
       
       this.updateTimerDisplay();
       
       // Time's up - considérer comme une erreur
       if (this.gameState.timeRemaining <= 0) {
           console.log('⏰ Time up!');
           this.handleWrongInput(document.createElement('div'));
           return; // Arrêter la boucle ici
       }

       requestAnimationFrame(() => this.gameLoop());
   }

   // CORRECTION MAJEURE: handleInput avec protection contre les doubles clics
   handleInput(number) {
       const currentTime = performance.now();
       
       // Protection contre les doubles clics (minimum 200ms entre les inputs)
       if (currentTime - this.gameState.lastInputTime < 200) {
           console.log('🚫 Input trop rapide, ignoré');
           return;
       }
       
       if (!this.gameState.isPlaying || this.gameState.isPaused) {
           console.log('🚫 Jeu pas actif');
           return;
       }
       
       this.gameState.lastInputTime = currentTime;
       
       const button = document.querySelector(`[data-number="${number}"]`);
       
       console.log(`🎮 Input: ${number}, Target: ${this.gameState.currentTarget}, Time remaining: ${this.gameState.timeRemaining.toFixed(0)}`);
       
       if (number === this.gameState.currentTarget) {
           this.handleCorrectInput(button);
       } else {
           this.handleWrongInput(button);
       }
   }

   // CORRECTION: handleCorrectInput amélioré
   handleCorrectInput(button) {
       console.log('✅ Correct input!');
       
       button.classList.add('correct');
       setTimeout(() => button.classList.remove('correct'), 600);

       this.animateTargetHit();
       this.targetsHitInLevel++;
       this.gameState.combo++;
       this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.combo);
       this.gameState.correctHits++;
       this.gameState.totalHits++;

       // Calcul du score avec bonus de timing
       const baseScore = 100;
       const comboBonus = Math.min(this.gameState.combo * 10, 500);
       const timePercentage = this.gameState.timeRemaining / this.gameState.maxTime;
       const speedBonus = Math.floor(timePercentage * 100); // Bonus pour la rapidité
       const levelBonus = this.gameState.level * 20;
       const totalScore = baseScore + comboBonus + speedBonus + levelBonus;

       this.gameState.score += totalScore;

       this.createScorePopup(totalScore, button);
       this.createComboAnimation();
       
       if (this.settings.particlesEnabled) {
           this.createParticles(button);
       }
       
       if (this.settings.screenShakeEnabled) {
           this.createScreenShake();
       }

       if (this.settings.vibrationEnabled && navigator.vibrate) {
           navigator.vibrate(50);
       }

       this.updateDisplay();
       this.checkAchievements();

       // Level up check - plus progressif
       if (this.gameState.score > 0 && this.gameState.score % 1500 < totalScore) {
           this.levelUp();
       }

       // Générer nouveau défi immédiatement
       setTimeout(() => {
           this.generateNewChallenge();
       }, 100);
   }

   // CORRECTION: handleWrongInput amélioré
   handleWrongInput(button) {
       console.log('❌ Wrong input!');
       
       if (button && button.classList) {
           button.classList.add('wrong');
           setTimeout(() => button.classList.remove('wrong'), 500);
       }

       this.gameState.combo = 0;
       this.gameState.lives--;
       this.gameState.totalHits++;
       
       this.createErrorAnimation();
       
       if (this.settings.vibrationEnabled && navigator.vibrate) {
           navigator.vibrate([100, 50, 100]);
       }

       this.updateDisplay();

       if (this.gameState.lives <= 0) {
           this.gameOver();
       } else {
           // Générer nouveau défi après une erreur
           setTimeout(() => {
               this.generateNewChallenge();
           }, 500);
       }
   }

   levelUp() {
       this.gameState.level++;
       
       // Ajustement progressif de la difficulté
       this.gameState.speedMultiplier = Math.min(2.0, this.gameState.speedMultiplier + 0.1);
       this.gameState.maxTime = Math.max(60, this.gameState.maxTime - 10);
       
       const popup = document.createElement('div');
       popup.className = 'score-popup level-up-popup';
       popup.textContent = `LEVEL ${this.gameState.level}!`;
       popup.style.cssText = `
           position: fixed;
           color: #ffff00;
           font-size: 48px;
           font-weight: 900;
           left: 50%;
           top: 20%;
           transform: translate(-50%, -50%);
           text-shadow: 0 2px 20px rgba(255,255,0,0.8);
           pointer-events: none;
           z-index: 1000;
           animation: levelUpAnimation 2s ease-out forwards;
       `;
       
       // Ajouter l'animation CSS si elle n'existe pas
       if (!document.getElementById('levelUpCSS')) {
           const style = document.createElement('style');
           style.id = 'levelUpCSS';
           style.textContent = `
               @keyframes levelUpAnimation {
                   0% {
                       opacity: 0;
                       transform: translate(-50%, -50%) scale(0.5);
                   }
                   20% {
                       opacity: 1;
                       transform: translate(-50%, -50%) scale(1.2);
                   }
                   40% {
                       transform: translate(-50%, -50%) scale(1);
                   }
                   100% {
                       opacity: 0;
                       transform: translate(-50%, -100px) scale(0.8);
                   }
               }
           `;
           document.head.appendChild(style);
       }
       
       document.body.appendChild(popup);
       setTimeout(() => popup.remove(), 2000);
       
       console.log(`📈 Level ${this.gameState.level}! Speed: ${this.gameState.speedMultiplier.toFixed(2)}, Max time: ${this.gameState.maxTime}`);
   }

   gameOver() {
       this.gameState.isPlaying = false;
       this.stopMetronome();
       
       if (this.audioSource) {
           try {
               this.audioSource.stop();
               this.audioSource.disconnect();
           } catch (e) {}
       }

       // Update stats
       this.stats.gamesPlayed++;
       this.stats.totalScore += this.gameState.score;
       this.stats.bestCombo = Math.max(this.stats.bestCombo, this.gameState.maxCombo);
       this.stats.totalHits += this.gameState.totalHits;
       this.stats.correctHits += this.gameState.correctHits;
       
       // Add to high scores
       this.stats.highScores.push({
           score: this.gameState.score,
           level: this.gameState.level,
           date: Date.now()
       });
       this.stats.highScores.sort((a, b) => b.score - a.score);
       this.stats.highScores = this.stats.highScores.slice(0, 10);
       
       this.saveGameData();
       this.updateStatisticsDisplay();

       document.getElementById('finalScore').textContent = this.gameState.score.toLocaleString();
       document.getElementById('finalLevel').textContent = this.gameState.level;
       document.getElementById('finalCombo').textContent = this.gameState.maxCombo;
       
       const accuracy = this.gameState.totalHits > 0 ? 
           Math.round((this.gameState.correctHits / this.gameState.totalHits) * 100) : 100;
       document.getElementById('finalAccuracy').textContent = accuracy + '%';

       document.getElementById('gameOverOverlay').classList.add('show');
       document.getElementById('targetContainer').style.display = 'none';
       document.getElementById('controlsContainer').style.display = 'none';
       document.getElementById('pauseBtn').style.display = 'none';
   }

   // Visual effects
   animateTargetHit() {
       const targetNumber = document.querySelector('.target-number');
       const targetInner = document.querySelector('.target-inner');
       const targetRing = document.querySelector('.target-ring');
       
       if (!targetNumber || !targetInner) return;
       
       targetInner.style.background = 'radial-gradient(circle at center, rgba(0,255,136,0.3) 0%, rgba(0,0,0,0.95) 50%)';
       targetInner.style.boxShadow = 'inset 0 0 50px rgba(0,255,136,0.5), 0 0 30px rgba(0,255,136,0.3)';
       
       targetNumber.style.transform = 'scale(1.8)';
       targetNumber.style.color = '#00ff88';
       targetNumber.style.textShadow = '0 0 60px rgba(0,255,136,1), 0 0 30px rgba(0,255,136,0.8), 0 0 100px rgba(0,255,136,0.6)';
       
       targetRing.style.transform = 'scale(1.3)';
       targetRing.style.filter = 'blur(8px) brightness(2)';
       targetRing.style.opacity = '1';
       
       const wave = document.createElement('div');
       wave.style.cssText = `
           position: absolute;
           width: 100%;
           height: 100%;
           border: 4px solid #00ff88;
           border-radius: 50%;
           top: 0;
           left: 0;
           transform: scale(1);
           opacity: 1;
           pointer-events: none;
           z-index: 10;
           box-shadow: 0 0 30px #00ff88;
       `;
       targetNumber.parentElement.appendChild(wave);
       
       requestAnimationFrame(() => {
           wave.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
           wave.style.transform = 'scale(2)';
           wave.style.opacity = '0';
           wave.style.borderWidth = '1px';
       });
       
       setTimeout(() => {
           targetInner.style.background = '';
           targetInner.style.boxShadow = '';
           targetNumber.style.transform = 'scale(1)';
           targetNumber.style.color = '#ffffff';
           targetNumber.style.textShadow = '0 0 30px rgba(255,255,255,0.5)';
           targetRing.style.transform = 'scale(1)';
           targetRing.style.filter = 'blur(3px)';
           targetRing.style.opacity = '0.8';
       }, 400);
       
       setTimeout(() => {
           wave.remove();
       }, 800);
   }

   createErrorAnimation() {
       const targetNumber = document.querySelector('.target-number');
       const targetInner = document.querySelector('.target-inner');
       
       targetInner.style.background = 'radial-gradient(circle at center, rgba(255,0,110,0.3) 0%, rgba(0,0,0,0.95) 50%)';
       targetNumber.style.color = '#ff006e';
       targetNumber.style.textShadow = '0 0 30px #ff006e';
       targetNumber.style.animation = 'wrongShake 0.5s ease';
       
       setTimeout(() => {
           targetInner.style.background = '';
           targetNumber.style.color = '#ffffff';
           targetNumber.style.textShadow = '0 0 30px rgba(255,255,255,0.5)';
           targetNumber.style.animation = '';
       }, 500);
   }

   createScorePopup(score, element) {
       const popup = document.createElement('div');
       popup.className = 'score-popup';
       
       let text = `+${score}`;
       if (this.gameState.combo > 1) {
           text += ` (x${this.gameState.combo})`;
       }
       popup.textContent = text;
       
       if (this.gameState.combo >= 10) {
           popup.style.color = '#ff006e';
           popup.style.textShadow = '0 0 20px #ff006e, 0 0 40px #ff006e';
       } else if (this.gameState.combo >= 5) {
           popup.style.color = '#ffff00';
           popup.style.textShadow = '0 0 20px #ffff00';
       } else {
           popup.style.color = '#00ff88';
           popup.style.textShadow = '0 0 20px #00ff88';
       }
       
       const rect = element.getBoundingClientRect();
       popup.style.left = rect.left + rect.width / 2 + 'px';
       popup.style.top = rect.top + 'px';
       popup.style.fontSize = Math.min(48 + this.gameState.combo * 2, 72) + 'px';

       document.body.appendChild(popup);
       setTimeout(() => popup.remove(), 1500);
   }

   createComboAnimation() {
       if (this.gameState.combo < 3) return;
       
       const comboElement = document.getElementById('comboValue');
       const comboContainer = comboElement.parentElement;
       
       comboElement.style.transform = 'scale(1.5)';
       comboElement.style.color = this.getComboColor(this.gameState.combo);
       comboElement.style.textShadow = `0 0 20px ${this.getComboColor(this.gameState.combo)}`;
       
       const comboFill = document.getElementById('comboFill');
       comboFill.style.boxShadow = `0 0 20px ${this.getComboColor(this.gameState.combo)}`;
       
       setTimeout(() => {
           comboElement.style.transform = 'scale(1)';
           comboElement.style.color = '#00ff88';
           comboElement.style.textShadow = '';
           comboFill.style.boxShadow = '0 0 10px rgba(0,255,136,0.5)';
       }, 300);
       
       if (this.gameState.combo === 5) {
           this.createFloatingText('COMBO!', comboContainer, '#ffff00');
       } else if (this.gameState.combo === 10) {
           this.createFloatingText('MEGA COMBO!', comboContainer, '#ff006e');
       } else if (this.gameState.combo === 20) {
           this.createFloatingText('INSANE!', comboContainer, '#8b00ff');
       }
   }

   createFloatingText(text, nearElement, color = '#00ff88') {
       const floatingText = document.createElement('div');
       floatingText.textContent = text;
       
       // Calculer la position pour éviter le centre de l'écran
       const rect = nearElement.getBoundingClientRect();
       const screenHeight = window.innerHeight;
       const isTopHalf = rect.top < screenHeight / 2;
       
       floatingText.style.cssText = `
           position: fixed;
           font-size: 24px;
           font-weight: 900;
           color: ${color};
           text-shadow: 0 0 20px ${color};
           pointer-events: none;
           z-index: 1000;
           animation: floatUp 2s ease-out forwards;
           text-transform: uppercase;
           letter-spacing: 2px;
           left: ${rect.left}px;
           top: ${isTopHalf ? rect.bottom + 20 : rect.top - 60}px;
       `;
       
       document.body.appendChild(floatingText);
       setTimeout(() => floatingText.remove(), 2000);
   }

   createParticles(element) {
       const rect = element.getBoundingClientRect();
       const centerX = rect.left + rect.width / 2;
       const centerY = rect.top + rect.height / 2;

       for (let i = 0; i < 15; i++) {
           const particle = document.createElement('div');
           particle.className = 'particle';
           
           const angle = (i / 15) * Math.PI * 2;
           const velocity = 80 + Math.random() * 120;
           const tx = Math.cos(angle) * velocity;
           const ty = Math.sin(angle) * velocity;

           particle.style.left = centerX + 'px';
           particle.style.top = centerY + 'px';
           particle.style.setProperty('--tx', tx + 'px');
           particle.style.setProperty('--ty', ty + 'px');
           
           const colors = ['#00ff88', '#00ffff', '#ffff00', '#ff006e'];
           const color = colors[i % colors.length];
           particle.style.background = color;
           particle.style.boxShadow = `0 0 10px ${color}`;

           document.body.appendChild(particle);
           setTimeout(() => particle.remove(), 1000);
       }
   }

   createScreenShake() {
       const gameContainer = document.querySelector('.game-container');
       const intensity = Math.min(this.gameState.combo, 10);
       
       gameContainer.style.animation = `screenShake 0.3s ease-out`;
       gameContainer.style.setProperty('--shake-intensity', intensity + 'px');
       
       if (!document.getElementById('shakeCSS')) {
           const style = document.createElement('style');
           style.id = 'shakeCSS';
           style.textContent = `
               @keyframes screenShake {
                   0%, 100% { transform: translate(0, 0); }
                   10% { transform: translate(-var(--shake-intensity, 5px), var(--shake-intensity, 5px)); }
                   20% { transform: translate(var(--shake-intensity, 5px), -var(--shake-intensity, 5px)); }
                   30% { transform: translate(-var(--shake-intensity, 5px), -var(--shake-intensity, 5px)); }
                   40% { transform: translate(var(--shake-intensity, 5px), var(--shake-intensity, 5px)); }
                   50% { transform: translate(-var(--shake-intensity, 5px), var(--shake-intensity, 5px)); }
                   60% { transform: translate(var(--shake-intensity, 5px), -var(--shake-intensity, 5px)); }
                   70% { transform: translate(-var(--shake-intensity, 5px), -var(--shake-intensity, 5px)); }
                   80% { transform: translate(var(--shake-intensity, 5px), var(--shake-intensity, 5px)); }
                   90% { transform: translate(-var(--shake-intensity, 5px), -var(--shake-intensity, 5px)); }
               }
           `;
           document.head.appendChild(style);
       }
       
       setTimeout(() => {
           gameContainer.style.animation = '';
       }, 300);
   }

   getComboColor(combo) {
       if (combo >= 20) return '#8b00ff';
       if (combo >= 10) return '#ff006e';
       if (combo >= 5) return '#ffff00';
       return '#00ff88';
   }

   // Audio playback
   async startAudioPlayback() {
       try {
           console.log('🎵 Starting audio playback...');
           console.log('AudioContext exists:', !!this.audioContext);
           console.log('AudioBuffer exists:', !!this.audioBuffer);
           
           if (!this.audioContext || this.audioContext.state === 'closed') {
               await this.setupAudioContext();
           }

           if (!this.audioContext) {
               console.error('❌ No audio context available');
               return false;
           }

           if (!this.audioBuffer) {
               console.error('❌ No audio buffer available');
               return false;
           }

           if (this.audioContext.state !== 'running') {
               console.log(`⚠️ AudioContext state: ${this.audioContext.state}`);
               
               if (this.audioContext.state === 'suspended') {
                   await this.audioContext.resume();
                   console.log('✅ AudioContext resumed');
               }
           }

           if (this.audioSource) {
               try {
                   this.audioSource.stop();
                   this.audioSource.disconnect();
                   console.log('🛑 Stopped previous audio');
               } catch (e) {
                   console.log('Previous audio already stopped');
               }
           }

           this.audioSource = this.audioContext.createBufferSource();
           this.audioSource.buffer = this.audioBuffer;
           this.audioSource.loop = true;
           
           if (!this.gainNode) {
               this.gainNode = this.audioContext.createGain();
           }
           this.gainNode.gain.value = this.settings.musicVolume || 0.7;
           
           this.audioSource.connect(this.gainNode);
           this.gainNode.connect(this.audioContext.destination);
           
           this.audioSource.start(0);
           
           console.log(`🎵 Audio started! Duration: ${this.audioBuffer.duration.toFixed(2)}s, Volume: ${this.gainNode.gain.value}`);
           console.log('AudioContext state:', this.audioContext.state);
           
           if (this.settings.metronomeEnabled) {
               this.startMetronome();
           }

           return true;

       } catch (error) {
           console.error('❌ Error starting audio:', error);
           this.showToast('Audio playback error', 2000, 'error');
           return false;
       }
   }

   // Music selection
   async selectGenre(genre) {
       if (this.isLoadingAudio) return;

       document.querySelectorAll('.music-option').forEach(opt => {
           opt.classList.remove('active');
       });
       const genreOption = document.querySelector(`[data-genre="${genre}"]`);
       if (genreOption) genreOption.classList.add('active');

       document.querySelectorAll('.bg-layer').forEach(layer => {
           layer.classList.remove('active');
       });
       const bgId = `bg${genre.charAt(0).toUpperCase() + genre.slice(1)}`;
       const bgElement = document.getElementById(bgId);
       if (bgElement) bgElement.classList.add('active');

       this.currentGenre = genre;
       this.currentTrack = null;
       
       this.showLoadingIndicator(`Loading ${this.genres[genre].name}...`);
       await this.generateGenreAudio(genre);
       this.hideLoadingIndicator();

       // CORRECTION: Ne pas démarrer l'audio automatiquement
       if (this.gameState.isPlaying && !this.gameState.isPaused) {
           await this.startAudioPlayback();
       }

       setTimeout(() => {
           document.getElementById('musicPanel').classList.remove('show');
       }, 200);
   }

   async selectTrack(trackId) {
       console.log(`🎵 selectTrack called: ${trackId}`);
       
       if (this.isLoadingAudio) {
           console.log('⚠️ Already loading audio');
           return;
       }

       const track = this.tracks[trackId];
       if (!track) {
           console.error(`❌ Track not found: ${trackId}`);
           return;
       }

       try {
           await this.activateAudio();
           this.updateTrackUI(trackId);
           this.showLoadingIndicator(`Loading ${track.name}...`);
           
           const success = await this.loadTrackFile(track.file);
           
           if (success) {
               console.log('✅ Track loaded successfully');
               this.hideLoadingIndicator();
              this.showToast(`🎵 Ready: ${track.name}`, 2000, 'success');
               
               // CORRECTION: Ne pas démarrer l'audio automatiquement
               // Seulement démarrer si le jeu est en cours
               if (this.gameState.isPlaying && !this.gameState.isPaused) {
                   await this.startAudioPlayback();
               }
           } else {
               throw new Error('Failed to load track');
           }
           
       } catch (error) {
           console.error('❌ Error loading track:', error);
           this.hideLoadingIndicator();
           this.showToast(`Could not load ${track.name}`, 3000, 'error');
           await this.generateGenreAudio('viral');
       }

       setTimeout(() => {
           document.getElementById('musicPanel').classList.remove('show');
       }, 200);
   }

   updateTrackUI(trackId) {
       document.querySelectorAll('.music-option').forEach(opt => {
           opt.classList.remove('active');
       });
       
       const trackOption = document.querySelector(`[data-track="${trackId}"]`);
       if (trackOption) {
           trackOption.classList.add('active');
       }
       
       document.querySelectorAll('.bg-layer').forEach(layer => {
           layer.classList.remove('active');
       });
       
       const bgMappings = {
           'arcade': 'bgNeon',
           'losing_game': 'bgSunset', 
           'jujutsu': 'bgViral',
           'dandadan': 'bgHype',
           'crazy': 'bgChill'
       };
       
       const bgId = bgMappings[trackId] || 'bgCustom';
       const bgElement = document.getElementById(bgId);
       if (bgElement) {
           bgElement.classList.add('active');
       }
       
       this.currentTrack = trackId;
       this.currentGenre = null;
   }

   async loadTrackFile(filename) {
       if (this.isLoadingAudio) return false;
       this.isLoadingAudio = true;

       try {
           const fileHash = btoa(filename).slice(0, 8);
           const url = `${filename}?v=${fileHash}`;
           
           console.log(`🔊 Loading: ${url}`);
           const response = await fetch(url, { cache: 'reload' });
           
           if (!response.ok) throw new Error(`HTTP ${response.status}`);
           
           const arrayBuffer = await response.arrayBuffer();
           
           if (!this.audioContext) {
               await this.setupAudioContext();
           }
           
           this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
           
           if (this.audioSource) {
               try {
                   this.audioSource.stop();
                   this.audioSource.disconnect();
               } catch (e) {}
           }
           
           return true;
       } catch (error) {
           console.error('Audio loading failed:', error);
           return false;
       } finally {
           this.isLoadingAudio = false;
       }
   }

   async handleCustomAudio(event) {
       const file = event.target.files[0];
       if (!file) return;

       this.showLoadingIndicator(`Loading ${file.name}...`);

       try {
           const audioReady = await this.setupAudioContext();
           if (!audioReady) {
               throw new Error('Audio context not available');
           }

           if (this.audioSource) {
               try {
                   this.audioSource.stop();
                   this.audioSource.disconnect();
               } catch (e) {}
           }

           const arrayBuffer = await file.arrayBuffer();
           this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
           
           this.currentGenre = 'custom';
           this.currentTrack = null;
           
           document.querySelectorAll('.music-option').forEach(opt => {
               opt.classList.remove('active');
           });
           
           const customOption = document.querySelector('[data-genre="custom"]');
           if (customOption) {
               customOption.classList.add('active');
               const fileName = file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name;
               customOption.innerHTML = `
                   <svg class="music-icon" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                   </svg>
                   ✅ ${fileName}
               `;
           }

           document.querySelectorAll('.bg-layer').forEach(layer => {
               layer.classList.remove('active');
           });
           document.getElementById('bgCustom').classList.add('active');

           this.hideLoadingIndicator();
           this.showToast(`Custom audio loaded: ${file.name}`, 3000, 'success');

           if (this.gameState.isPlaying && !this.gameState.isPaused) {
               this.startAudioPlayback();
           }

           document.getElementById('musicPanel').classList.remove('show');

       } catch (error) {
           console.error('Error loading audio:', error);
           this.hideLoadingIndicator();
           this.showToast('Error loading audio file. Please try another file.', 3000, 'error');
       }

       event.target.value = '';
   }

   // Audio generation
   async generateGenreAudio(genre) {
       if (this.isLoadingAudio) return;
       this.isLoadingAudio = true;

       try {
           const audioReady = await this.setupAudioContext();
           if (!audioReady) {
               throw new Error('Audio context not available');
           }

           const sampleRate = this.audioContext.sampleRate;
           const duration = 60;
           const frameCount = sampleRate * duration;
           const audioBuffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

           const bpm = this.genres[genre].bpm;
           const beatInterval = (60 / bpm) * sampleRate;

           for (let channel = 0; channel < 2; channel++) {
               const channelData = audioBuffer.getChannelData(channel);
               
               for (let i = 0; i < frameCount; i++) {
                   const time = i / sampleRate;
                   const beatPosition = (i % beatInterval) / beatInterval;
                   let sample = 0;

                   switch (genre) {
                       case 'viral':
                           sample = this.generateViralAudio(time, beatPosition);
                           break;
                       case 'hype':
                           sample = this.generateHypeAudio(time, beatPosition);
                           break;
                       case 'chill':
                           sample = this.generateChillAudio(time, beatPosition);
                           break;
                       default:
                           if (beatPosition < 0.1) {
                               sample = Math.sin(2 * Math.PI * 60 * time) * 0.5 * Math.exp(-beatPosition * 10);
                           }
                   }

                   if (channel === 1) {
                       sample *= 0.95;
                       sample += Math.sin(2 * Math.PI * 0.5 * time) * 0.02;
                   }

                   channelData[i] = sample;
               }
           }

           if (this.audioSource) {
               try {
                   this.audioSource.stop();
                   this.audioSource.disconnect();
               } catch (e) {}
           }

           this.audioBuffer = audioBuffer;
           console.log(`✅ Generated ${genre} audio successfully`);
           
           if (this.gameState.isPlaying && !this.gameState.isPaused) {
               this.startAudioPlayback();
           }

       } catch (error) {
           console.error('Error generating audio:', error);
       } finally {
           this.isLoadingAudio = false;
       }
   }

   generateViralAudio(time, beatPosition) {
       let sample = 0;
       
       if (beatPosition < 0.1) {
           sample = Math.sin(2 * Math.PI * 55 * time) * 0.8 * Math.exp(-beatPosition * 15);
           sample += Math.sin(2 * Math.PI * 110 * time) * 0.4 * Math.exp(-beatPosition * 10);
       }
       
       if ((beatPosition > 0.5 && beatPosition < 0.52) || 
           (beatPosition > 0.75 && beatPosition < 0.77)) {
           sample += Math.sin(2 * Math.PI * 800 * time) * 0.3 * Math.exp(-(beatPosition % 0.25) * 100);
       }
       
       sample += Math.sin(2 * Math.PI * 35 * time) * 0.15;
       
       return Math.tanh(sample * 1.5) * 0.7;
   }

   generateHypeAudio(time, beatPosition) {
       let sample = 0;
       
       if (beatPosition < 0.05) {
           sample = Math.sin(2 * Math.PI * 60 * time) * Math.exp(-beatPosition * 20);
           sample += Math.sin(2 * Math.PI * 120 * time) * 0.5 * Math.exp(-beatPosition * 25);
       }
       
       const sidechain = beatPosition < 0.1 ? 0.3 : 1;
       
       const sawFreq = 440 * Math.pow(2, Math.sin(time * 0.5) * 0.5);
       for (let h = 1; h <= 5; h++) {
           sample += Math.sin(2 * Math.PI * sawFreq * h * time) * (0.3 / h) * sidechain;
       }
       
       if ((beatPosition > 0.25 && beatPosition < 0.27) || 
           (beatPosition > 0.75 && beatPosition < 0.77)) {
           sample += (Math.random() - 0.5) * 0.2;
       }
       
       return sample * 0.5;
   }

   generateChillAudio(time, beatPosition) {
       let sample = 0;
       
       if (beatPosition < 0.2) {
           const pitch = beatPosition < 0.05 ? 50 : 45;
           sample = Math.sin(2 * Math.PI * pitch * time) * 0.7 * Math.exp(-beatPosition * 8);
       }
       
       if (beatPosition > 0.48 && beatPosition < 0.52) {
           sample += (Math.random() - 0.5) * 0.5 * Math.exp(-(beatPosition - 0.5) * 50);
           sample += Math.sin(2 * Math.PI * 200 * time) * 0.3 * Math.exp(-(beatPosition - 0.5) * 40);
       }
       
       sample += Math.sin(2 * Math.PI * 220 * time) * 0.1 * Math.sin(time * 0.2);
       sample += Math.sin(2 * Math.PI * 330 * time) * 0.05 * Math.sin(time * 0.3);
       
       const hihatPattern = Math.sin(time * 120 * 4) > 0.7;
       if (hihatPattern) {
           sample += (Math.random() - 0.5) * 0.15;
       }
       
       return sample * 0.6;
   }

   // Metronome system
   startMetronome() {
       if (!this.audioContext) return;
       
       const bpm = this.getCurrentBPM();
       const beatInterval = 60 / bpm;
       
       this.nextBeatTime = this.audioContext.currentTime;
       this.beatIndex = 0;
       
       if (this.metronomeInterval) {
           clearInterval(this.metronomeInterval);
       }
       
       const scheduleBeats = () => {
           const currentTime = this.audioContext.currentTime;
           
           while (this.nextBeatTime < currentTime + 0.1) {
               const isDownbeat = this.beatIndex % 4 === 0;
               this.playMetronomeBeat(isDownbeat);
               
               if (this.gameState.isPlaying && !this.gameState.isPaused) {
                   const beatDelay = (this.nextBeatTime - currentTime) * 1000;
                   if (beatDelay >= 0) {
                       setTimeout(() => {
                           this.flashBeatIndicator(isDownbeat);
                           this.updateBeatDots(this.beatIndex % 4);
                       }, beatDelay);
                   }
               }
               
               this.nextBeatTime += beatInterval;
               this.beatIndex++;
           }
       };
       
       this.metronomeInterval = setInterval(scheduleBeats, 25);
       scheduleBeats();
   }

   stopMetronome() {
       if (this.metronomeInterval) {
           clearInterval(this.metronomeInterval);
           this.metronomeInterval = null;
       }
       
       document.querySelectorAll('.beat-dot').forEach(dot => {
           dot.classList.remove('active');
       });
   }

   playMetronomeBeat(isDownbeat = false) {
       if (!this.audioContext || this.audioContext.state !== 'running') return;
       
       const now = this.audioContext.currentTime;
       const oscillator = this.audioContext.createOscillator();
       const gainNode = this.audioContext.createGain();
       
       oscillator.connect(gainNode);
       gainNode.connect(this.audioContext.destination);
       
       if (isDownbeat) {
           oscillator.frequency.value = 1000;
           gainNode.gain.value = 0.15;
       } else {
           oscillator.frequency.value = 800;
           gainNode.gain.value = 0.1;
       }
       
       gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
       
       oscillator.start(now);
       oscillator.stop(now + 0.05);
   }

   flashBeatIndicator(isDownbeat) {
       const targetRing = document.querySelector('.target-ring');
       const targetNumber = document.querySelector('.target-number');
       if (!targetRing || !targetNumber) return;
       
       if (isDownbeat) {
           targetRing.style.transform = 'scale(1.08)';
           targetRing.style.opacity = '1';
       } else {
           targetRing.style.transform = 'scale(1.04)';
           targetRing.style.opacity = '0.9';
       }
       
       if (isDownbeat) {
           targetNumber.style.transform = 'scale(0.95)';
           setTimeout(() => {
               targetNumber.style.transform = 'scale(1.15)';
           }, 50);
       } else {
           targetNumber.style.transform = 'scale(0.98)';
           setTimeout(() => {
               targetNumber.style.transform = 'scale(1.05)';
           }, 50);
       }
       
       setTimeout(() => {
           targetRing.style.transform = 'scale(1)';
           targetRing.style.opacity = '0.8';
           targetNumber.style.transform = 'scale(1)';
       }, 150);
   }

   updateBeatDots(beatIndex) {
       document.querySelectorAll('.beat-dot').forEach((dot, index) => {
           if (index === beatIndex) {
               dot.classList.add('active');
               setTimeout(() => {
                   dot.classList.remove('active');
               }, 150);
           }
       });
   }

   getCurrentBPM() {
       if (this.currentTrack && this.tracks[this.currentTrack]) {
           return this.tracks[this.currentTrack].bpm;
       } else if (this.currentGenre && this.genres[this.currentGenre]) {
           return this.genres[this.currentGenre].bpm;
       }
       return 120;
   }

   // CORRECTION MAJEURE: Event listeners setup avec gestion des menus
   setupEventListeners() {
       console.log('🔧 Setting up event listeners...');
       
       // Music panel toggle avec pause automatique
       document.getElementById('musicToggleBtn').addEventListener('click', (e) => {
           e.preventDefault();
           const musicPanel = document.getElementById('musicPanel');
           const isOpening = !musicPanel.classList.contains('show');
           
           if (isOpening && this.gameState.isPlaying && !this.gameState.isPaused) {
               this.pauseGameForMenu();
           }
           
           musicPanel.classList.toggle('show');
           this.closePanels(['settingsPanel', 'statsPanel']);
       });

       // Settings panel toggle avec pause automatique  
       document.getElementById('settingsBtn').addEventListener('click', (e) => {
           e.preventDefault();
           const settingsPanel = document.getElementById('settingsPanel');
           const isOpening = !settingsPanel.classList.contains('show');
           
           if (isOpening && this.gameState.isPlaying && !this.gameState.isPaused) {
               this.pauseGameForMenu();
           }
           
           settingsPanel.classList.toggle('show');
           this.closePanels(['musicPanel', 'statsPanel']);
       });

       // Stats panel toggle avec pause automatique
       document.getElementById('statsBtn').addEventListener('click', (e) => {
           e.preventDefault();
           const statsPanel = document.getElementById('statsPanel');
           const isOpening = !statsPanel.classList.contains('show');
           
           if (isOpening && this.gameState.isPlaying && !this.gameState.isPaused) {
               this.pauseGameForMenu();
           }
           
           statsPanel.classList.toggle('show');
           this.closePanels(['musicPanel', 'settingsPanel']);
       });

       // Music selection
       document.querySelectorAll('.music-option').forEach((option, index) => {
           console.log(`🎵 Setting up listener for music option ${index}:`, option.dataset);
           
           option.addEventListener('click', async (e) => {
               e.preventDefault();
               e.stopPropagation();
               
               const genre = option.dataset.genre;
               const track = option.dataset.track;
               
               console.log(`🎵 CLICKED: genre=${genre}, track=${track}`);
               
               option.style.transform = 'scale(0.95)';
               setTimeout(() => {
                   option.style.transform = '';
               }, 150);
               
               if (genre === 'custom') {
                   console.log('📁 Opening file picker...');
                   document.getElementById('audioFile').click();
               } else if (track) {
                   console.log(`🎵 Selecting track: ${track}`);
                   await this.selectTrack(track);
               } else if (genre) {
                   console.log(`🎵 Selecting genre: ${genre}`);
                   await this.selectGenre(genre);
               }
           });
           
           option.addEventListener('touchend', async (e) => {
               e.preventDefault();
               option.click();
           });
       });

       // Theme selection
       document.querySelectorAll('.theme-option').forEach(option => {
           option.addEventListener('click', () => {
               this.selectTheme(option.dataset.theme);
           });
       });

       // Settings controls
       this.setupSettingsControls();

       // CORRECTION MAJEURE: Input buttons avec protection anti-spam
       document.querySelectorAll('.input-button').forEach(button => {
           button.addEventListener('click', (e) => {
               e.preventDefault();
               
               // Protection contre les clics multiples
               if (button.disabled) return;
               
               if (this.gameState.isPlaying && !this.gameState.isPaused) {
                   // Désactiver temporairement le bouton
                   button.disabled = true;
                   setTimeout(() => {
                       button.disabled = false;
                   }, 150);
                   
                   this.handleInput(parseInt(button.dataset.number));
               }
           });
           
           // Support tactile amélioré
           button.addEventListener('touchstart', (e) => {
               e.preventDefault();
               button.style.transform = 'scale(0.9)';
           });
           
           button.addEventListener('touchend', (e) => {
               e.preventDefault();
               button.style.transform = '';
               
               if (this.gameState.isPlaying && !this.gameState.isPaused) {
                   this.handleInput(parseInt(button.dataset.number));
               }
           });
       });

       // Pause button
       document.getElementById('pauseBtn').addEventListener('click', (e) => {
           e.preventDefault();
           this.pauseGame();
       });

       // File inputs
       document.getElementById('audioFile').addEventListener('change', (e) => {
           this.handleCustomAudio(e);
       });

       document.getElementById('dataImportFile').addEventListener('change', (e) => {
           this.handleDataImport(e);
       });

       // Close panels when clicking outside avec reprise automatique
       document.addEventListener('click', (e) => {
           const panels = ['musicPanel', 'settingsPanel', 'statsPanel'];
           const buttons = ['musicToggleBtn', 'settingsBtn', 'statsBtn'];
           let panelClosed = false;
           
           panels.forEach((panelId, index) => {
               const panel = document.getElementById(panelId);
               const button = document.getElementById(buttons[index]);
               
               if (!panel.contains(e.target) && !button.contains(e.target) && panel.classList.contains('show')) {
                   panel.classList.remove('show');
                   panelClosed = true;
               }
           });
           
           // CORRECTION: Reprendre le jeu quand tous les menus sont fermés
           if (panelClosed && this.gameState.isPlaying && this.gameState.isPaused && this.gameState.pausedForMenu) {
               this.resumeGameFromMenu();
           }
       });
       
       // CORRECTION: Keyboard support amélioré
       document.addEventListener('keydown', (e) => {
           if (this.gameState.isPlaying && !this.gameState.isPaused) {
               if (e.key >= '1' && e.key <= '5') {
                   e.preventDefault();
                   this.handleInput(parseInt(e.key));
               }
           }
           if (e.key === 'Escape' && this.gameState.isPlaying) {
               this.pauseGame();
           }
           if (e.key === ' ' && this.gameState.isPlaying && this.gameState.isPaused) {
               e.preventDefault();
               this.resumeGame();
           }
       });

       // Prevent mobile issues
       document.addEventListener('touchmove', (e) => {
            // Permettre le scroll dans les panels
            const target = e.target.closest('.panel-content');
            if (target) {
                return; // Laisser le scroll natif
            }
            
            // Empêcher le scroll ailleurs
            if (e.touches.length === 1) {
                e.preventDefault();
            }
        }, { passive: false });

       // Prevent double tap zoom
       let lastTouchEnd = 0;
       document.addEventListener('touchend', (e) => {
           const now = Date.now();
           if (now - lastTouchEnd <= 300) {
               e.preventDefault();
           }
           lastTouchEnd = now;
       }, false);

       // NOUVEAU: Correction pour le scroll Android
       this.fixAndroidScroll();
   }

   // NOUVELLE MÉTHODE: Fix scroll Android
    fixAndroidScroll() {
        // Permettre le scroll natif dans les panels
        const panels = document.querySelectorAll('.music-panel, .settings-panel, .stats-panel');
        
        panels.forEach(panel => {
            // Créer le container scrollable
            const content = document.createElement('div');
            content.className = 'panel-content';
            
            // Déplacer tout le contenu dans le container
            while (panel.firstChild) {
                content.appendChild(panel.firstChild);
            }
            
            // Ajouter le container au panel
            panel.appendChild(content);
            
            // Empêcher la propagation des événements touch sur le panel lui-même
            panel.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            panel.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            // Permettre le scroll sur le contenu
            content.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            content.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
        });
    }

   setupSettingsControls() {
       // Music volume slider
       const musicVolumeSlider = document.getElementById('musicVolumeSlider');
       this.setupSlider(musicVolumeSlider, (value) => {
           this.settings.musicVolume = value;
           if (this.gainNode) {
               this.gainNode.gain.value = value;
           }
           this.saveGameData();
       });

       // Toggles
       this.setupToggle('sfxToggle', (value) => {
           this.settings.sfxEnabled = value;
           this.saveGameData();
       });

       this.setupToggle('metronomeToggle', (value) => {
           this.settings.metronomeEnabled = value;
           this.saveGameData();
       });

       this.setupToggle('particlesToggle', (value) => {
           this.settings.particlesEnabled = value;
           this.saveGameData();
       });

       this.setupToggle('screenShakeToggle', (value) => {
           this.settings.screenShakeEnabled = value;
           this.saveGameData();
       });

       this.setupToggle('vibrationToggle', (value) => {
           this.settings.vibrationEnabled = value;
           this.saveGameData();
       });

       this.setupToggle('autoSaveToggle', (value) => {
           this.settings.autoSave = value;
           this.saveGameData();
       });

       // Difficulty select
       document.getElementById('difficultySelect').addEventListener('change', (e) => {
           this.settings.difficulty = e.target.value;
           this.saveGameData();
       });
   }

   setupSlider(slider, callback) {
       const fill = slider.querySelector('.setting-slider-fill');
       const thumb = slider.querySelector('.setting-slider-thumb');
       
       const updateSlider = (e) => {
           const rect = slider.getBoundingClientRect();
           const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
           const percentage = x / rect.width;
           
           fill.style.width = (percentage * 100) + '%';
           thumb.style.left = (percentage * 100) + '%';
           
           callback(percentage);
       };

       slider.addEventListener('click', updateSlider);
       
       let isDragging = false;
       thumb.addEventListener('mousedown', () => isDragging = true);
       document.addEventListener('mousemove', (e) => {
           if (isDragging) updateSlider(e);
       });
       document.addEventListener('mouseup', () => isDragging = false);
   }

   setupToggle(toggleId, callback) {
       const toggle = document.getElementById(toggleId);
       toggle.addEventListener('click', () => {
           const isActive = toggle.classList.contains('active');
           toggle.classList.toggle('active', !isActive);
           callback(!isActive);
       });
   }

   closePanels(panelIds) {
       panelIds.forEach(panelId => {
           document.getElementById(panelId).classList.remove('show');
       });
   }

   handleDataImport(event) {
       const file = event.target.files[0];
       if (!file) return;

       const reader = new FileReader();
       reader.onload = (e) => {
           try {
               const data = JSON.parse(e.target.result);
               
               if (data.version === '2.0') {
                   this.stats = { ...this.stats, ...data.stats };
                   this.achievements = { ...this.achievements, ...data.achievements };
                   this.settings = { ...this.settings, ...data.settings };
                   
                   this.updateStatisticsDisplay();
                   this.updateAchievements();
                   this.applySettings();
                   this.saveGameData();
                   
                   this.showToast('Game data imported successfully!', 3000, 'success');
               } else {
                   this.showToast('Invalid or incompatible save file!', 3000, 'error');
               }
           } catch (error) {
               this.showToast('Error reading save file!', 3000, 'error');
           }
       };
       
       reader.readAsText(file);
       event.target.value = '';
   }
}

// Global functions for HTML integration
function registerServiceWorker() {
   if ('serviceWorker' in navigator) {
       const swUrl = './sw.js';
       
       navigator.serviceWorker.register(swUrl)
           .then(registration => {
               console.log('SW enregistré avec succès');
               setInterval(() => {
                   registration.update();
               }, 60 * 60 * 1000);
           })
           .catch(error => {
               console.error('Échec de l\'enregistrement du SW:', error);
           });
   }
}

window.addEventListener('load', () => {
   setTimeout(registerServiceWorker, 1000);
});

function startGame() {
   if (!window.game) {
       window.game = new FingerBeatGame();
   }
   window.game.startGame();
}

function showTutorial() {
   document.getElementById('tutorialOverlay').style.display = 'none';
   document.getElementById('howToPlayOverlay').classList.add('show');
}

function hideHowToPlay() {
   document.getElementById('howToPlayOverlay').classList.remove('show');
   document.getElementById('tutorialOverlay').style.display = 'flex';
}

function resumeGame() {
   if (window.game) window.game.resumeGame();
}

function restartGame() {
   if (window.game) window.game.restartGame();
}

function quitToMenu() {
   if (window.game) window.game.quitToMenu();
}

function shareScore() {
   if (window.game) window.game.shareScore();
}

function exportGameData() {
   if (window.game) window.game.exportGameData();
}

function importGameData() {
   if (window.game) window.game.importGameData();
}

function resetGameData() {
   if (window.game) window.game.resetGameData();
}

// Initialize game on load
window.addEventListener('load', () => {
   console.log('Finger Beat Ultimate v2.0 - Initializing...');
   
   try {
       window.game = new FingerBeatGame();
       console.log('Game initialized successfully!');
   } catch (error) {
       console.error('Initialization error:', error);
   }
   
   // Mobile optimizations
   document.addEventListener('gesturestart', e => e.preventDefault());
   
   // Viewport height fix
   function setViewportHeight() {
       const vh = window.innerHeight * 0.01;
       document.documentElement.style.setProperty('--vh', `${vh}px`);
   }
   
   setViewportHeight();
   window.addEventListener('resize', setViewportHeight);
   window.addEventListener('orientationchange', setViewportHeight);
});
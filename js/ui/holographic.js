// Holographic UI controller with spectacular animations and effects

class HolographicUI {
    constructor() {
        this.particleField = document.getElementById('particleField');
        this.achievementContainer = document.getElementById('achievementContainer');
        this.particles = [];
        this.achievements = [];
        
        this.initializeEffects();
        this.createFloatingParticles();
        this.enhanceUIElements();
        this.setupSoundSystem();
    }
    
    initializeEffects() {
        // Add cosmic loader while loading
        this.showCosmicLoader();
        
        // Initialize particle field
        this.particleFieldActive = true;
        
        // Setup achievement system
        this.achievementQueue = [];
        this.isShowingAchievement = false;
        
        // Audio context for sound effects
        this.audioContext = null;
        this.sounds = {};
    }
    
    createFloatingParticles() {
        // Create ambient floating particles
        for (let i = 0; i < 30; i++) {
            this.createParticle();
        }
        
        // Continuously spawn new particles
        setInterval(() => {
            if (this.particles.length < 30 && this.particleFieldActive) {
                this.createParticle();
            }
        }, 1000);
    }
    
    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random color from holographic palette
        const colors = ['var(--holo-cyan)', 'var(--holo-magenta)', 'var(--holo-yellow)', 'var(--holo-green)'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        // Random starting position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        
        this.particleField.appendChild(particle);
        this.particles.push(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
                this.particles = this.particles.filter(p => p !== particle);
            }
        }, 25000);
    }
    
    enhanceUIElements() {
        // Add quantum fluctuation to all panels
        document.querySelectorAll('.holo-panel').forEach(panel => {
            panel.classList.add('quantum-fluctuation');
        });
        
        // Enhance buttons with sound and particle effects
        document.querySelectorAll('.holo-button').forEach(button => {
            button.addEventListener('mouseenter', () => this.onButtonHover(button));
            button.addEventListener('click', (e) => this.onButtonClick(e, button));
        });
        
        // Enhance slider with energy visualization
        const slider = document.getElementById('launchPower');
        if (slider) {
            slider.addEventListener('input', (e) => this.onSliderChange(e));
        }
        
        // Add toggle effects button handler
        const toggleFX = document.getElementById('toggleEffects');
        if (toggleFX) {
            toggleFX.addEventListener('click', () => this.toggleEffects());
        }
    }
    
    onButtonHover(button) {
        // Play hover sound
        this.playSound('hover', 0.3);
        
        // Create energy particles around button
        for (let i = 0; i < 5; i++) {
            this.createButtonParticle(button);
        }
    }
    
    onButtonClick(event, button) {
        // Play click sound
        this.playSound('click', 0.5);
        
        // Create explosion effect
        this.createButtonExplosion(event, button);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    createButtonParticle(button) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = 'var(--holo-cyan)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        
        document.body.appendChild(particle);
        
        // Animate particle
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const duration = 1000;
        
        particle.animate([
            {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
            },
            {
                transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        });
        
        setTimeout(() => particle.remove(), duration);
    }
    
    createButtonExplosion(event, button) {
        const rect = button.getBoundingClientRect();
        const x = event.clientX || (rect.left + rect.width / 2);
        const y = event.clientY || (rect.top + rect.height / 2);
        
        // Create multiple explosion particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.width = '6px';
            particle.style.height = '6px';
            particle.style.background = `hsl(${Math.random() * 60 + 180}, 100%, 50%)`;
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10000';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
            
            document.body.appendChild(particle);
            
            const angle = (i / 20) * Math.PI * 2;
            const velocity = 100 + Math.random() * 100;
            
            particle.animate([
                {
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                {
                    transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0, 0.9, 0.3, 1)'
            });
            
            setTimeout(() => particle.remove(), 1000);
        }
    }
    
    onSliderChange(event) {
        const value = event.target.value;
        const percentage = value / 100;
        
        // Update power display with glow effect
        const powerDisplay = document.getElementById('powerValue');
        if (powerDisplay) {
            powerDisplay.textContent = value;
            powerDisplay.style.textShadow = `0 0 ${20 * percentage}px var(--holo-cyan)`;
        }
        
        // Create energy surge effect
        if (Math.random() < 0.3) {
            this.createEnergyPulse(event.target);
        }
        
        // Play power change sound
        this.playSound('powerChange', 0.2 * percentage);
    }
    
    createEnergyPulse(element) {
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.width = '100%';
        pulse.style.height = '100%';
        pulse.style.background = 'linear-gradient(90deg, transparent, var(--holo-cyan), transparent)';
        pulse.style.pointerEvents = 'none';
        pulse.style.opacity = '0.5';
        
        element.parentElement.style.position = 'relative';
        element.parentElement.appendChild(pulse);
        
        pulse.animate([
            { transform: 'translateX(-100%)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 0.5 },
            { transform: 'translateX(100%)', opacity: 0 }
        ], {
            duration: 500,
            easing: 'ease-out'
        });
        
        setTimeout(() => pulse.remove(), 500);
    }
    
    showAchievement(title, description, icon = '🏆') {
        // Queue achievement
        this.achievementQueue.push({ title, description, icon });
        
        if (!this.isShowingAchievement) {
            this.displayNextAchievement();
        }
    }
    
    displayNextAchievement() {
        if (this.achievementQueue.length === 0) {
            this.isShowingAchievement = false;
            return;
        }
        
        this.isShowingAchievement = true;
        const achievement = this.achievementQueue.shift();
        
        // Create achievement popup
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px;">${achievement.icon}</div>
                <h2 style="color: gold; margin: 10px 0; font-family: 'Orbitron', monospace;">
                    ${achievement.title}
                </h2>
                <p style="color: #ffd700;">${achievement.description}</p>
            </div>
        `;
        
        this.achievementContainer.appendChild(popup);
        
        // Create fireworks
        this.createFireworks(popup);
        
        // Play achievement sound
        this.playSound('achievement', 0.7);
        
        // Remove after animation
        setTimeout(() => {
            popup.style.animation = 'achievement-appear 0.5s ease-in reverse';
            setTimeout(() => {
                popup.remove();
                this.displayNextAchievement();
            }, 500);
        }, 3000);
    }
    
    createFireworks(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 30; i++) {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = centerX + 'px';
            firework.style.top = centerY + 'px';
            
            const angle = (i / 30) * Math.PI * 2;
            const distance = 100 + Math.random() * 100;
            
            firework.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
            firework.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
            
            document.body.appendChild(firework);
            
            setTimeout(() => firework.remove(), 1000);
        }
    }
    
    toggleEffects() {
        this.particleFieldActive = !this.particleFieldActive;
        
        if (!this.particleFieldActive) {
            // Clear all particles
            this.particles.forEach(p => p.remove());
            this.particles = [];
        } else {
            // Recreate particles
            this.createFloatingParticles();
        }
        
        // Show notification
        this.showNotification(
            this.particleFieldActive ? 'Effects Enabled' : 'Effects Disabled',
            this.particleFieldActive ? 'var(--holo-green)' : 'var(--holo-yellow)'
        );
    }
    
    showNotification(message, color = 'var(--holo-cyan)') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid ${color};
            border-radius: 10px;
            color: ${color};
            font-family: 'Orbitron', monospace;
            font-size: 18px;
            z-index: 10000;
            animation: neon-pulse 0.5s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 1500);
    }
    
    showCosmicLoader() {
        const loader = document.createElement('div');
        loader.className = 'cosmic-loader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
        `;
        
        document.body.appendChild(loader);
        
        // Remove loader after initial load
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s';
                setTimeout(() => loader.remove(), 500);
            }, 1000);
        });
    }
    
    setupSoundSystem() {
        // Initialize Web Audio API for procedural sound effects
        this.initAudio();
        
        // Create sound generators
        this.sounds = {
            hover: () => this.createHoverSound(),
            click: () => this.createClickSound(),
            powerChange: () => this.createPowerChangeSound(),
            achievement: () => this.createAchievementSound(),
            launch: () => this.createLaunchSound(),
            explosion: () => this.createExplosionSound()
        };
    }
    
    initAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    playSound(type, volume = 0.5) {
        if (!this.audioContext || !this.sounds[type]) return;
        
        try {
            this.sounds[type]();
        } catch (e) {
            console.log('Error playing sound:', e);
        }
    }
    
    createHoverSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    createClickSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }
    
    createPowerChangeSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        const power = parseInt(document.getElementById('launchPower').value);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100 + power * 10, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.02);
    }
    
    createAchievementSound() {
        if (!this.audioContext) return;
        
        // Create a triumphant chord
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C major chord
        
        frequencies.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.05);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime + i * 0.05);
            oscillator.stop(this.audioContext.currentTime + 1);
        });
    }
    
    createLaunchSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(50, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.Q.setValueAtTime(10, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    createExplosionSound() {
        if (!this.audioContext) return;
        
        // White noise for explosion
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        whiteNoise.start();
    }
}

// Initialize holographic UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.holographicUI = new HolographicUI();
});

// Scoring and achievement system for Liquid Galaxy Painter

class ScoringSystem {
    constructor() {
        this.score = 0;
        this.stats = {
            particlesLaunched: 0,
            gravityWellsPlaced: 0,
            stableOrbits: 0,
            launches: 0,
            bursts: 0,
            timeActive: 0,
            longestOrbit: 0,
            maxParticles: 0,
            symmetryBonus: 0,
            efficiencyBonus: 0
        };
        
        this.achievements = [];
        this.multipliers = {
            orbit: 10,
            symmetry: 5,
            efficiency: 3,
            creativity: 2,
            longevity: 1
        };
        
        // UI elements for display
        this.scoreDisplay = document.getElementById('scoreValue');
        this.particleCountDisplay = document.getElementById('particleCount');
        this.orbitCountDisplay = document.getElementById('orbitCount');
        
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        
        this.initializeAchievements();
    }
    
    initializeAchievements() {
        this.achievementDefinitions = [
            // Launch achievements
            { id: 'first_launch', name: 'First Drop', description: 'Launch your first liquid stream', threshold: 1, stat: 'launches', points: 10 },
            { id: 'hundred_launches', name: 'Liquid Artist', description: 'Launch 100 liquid streams', threshold: 100, stat: 'launches', points: 500 },
            { id: 'thousand_particles', name: 'Particle Master', description: 'Launch 1000 particles', threshold: 1000, stat: 'particlesLaunched', points: 1000 },
            
            // Orbital achievements
            { id: 'first_orbit', name: 'Orbital Mechanics', description: 'Achieve your first stable orbit', threshold: 1, stat: 'stableOrbits', points: 50 },
            { id: 'orbital_dance', name: 'Cosmic Choreographer', description: 'Have 10 particles in orbit simultaneously', threshold: 10, stat: 'stableOrbits', points: 200 },
            { id: 'long_orbit', name: 'Eternal Orbit', description: 'Maintain an orbit for 60 seconds', threshold: 3600, stat: 'longestOrbit', points: 300 }, // 60 frames per second
            
            // Gravity well achievements
            { id: 'first_well', name: 'Gravity Sculptor', description: 'Place your first gravity well', threshold: 1, stat: 'gravityWellsPlaced', points: 25 },
            { id: 'stellar_architect', name: 'Stellar Architect', description: 'Create a multi-body system with 5 gravity wells', threshold: 5, stat: 'gravityWellsPlaced', points: 150 },
            
            // Creative achievements
            { id: 'symmetry_master', name: 'Perfect Balance', description: 'Create a symmetrical pattern', threshold: 5, stat: 'symmetryBonus', points: 100 },
            { id: 'rainbow_painter', name: 'Rainbow Painter', description: 'Use all 4 liquid types in one session', threshold: 4, stat: 'liquidTypes', points: 75 },
            
            // Efficiency achievements
            { id: 'minimal_orbit', name: 'Efficiency Expert', description: 'Create an orbit with minimal launches', threshold: 3, stat: 'efficiencyBonus', points: 150 },
            { id: 'particle_conservation', name: 'Conservation Laws', description: 'Maintain 50+ active particles', threshold: 50, stat: 'maxParticles', points: 200 },
            
            // Time achievements
            { id: 'dedicated_artist', name: 'Dedicated Artist', description: 'Paint for 10 minutes straight', threshold: 600000, stat: 'timeActive', points: 300 },
            { id: 'master_painter', name: 'Master Painter', description: 'Reach 10,000 points', threshold: 10000, stat: 'score', points: 1000 }
        ];
    }
    
    update(particles, gravityWells) {
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;
        
        // Update time active
        this.stats.timeActive += deltaTime;
        
        // Count active particles
        const activeParticles = particles.filter(p => p.alive);
        this.stats.maxParticles = Math.max(this.stats.maxParticles, activeParticles.length);
        
        // Count stable orbits
        const orbitingParticles = activeParticles.filter(p => p.isInOrbit);
        this.stats.stableOrbits = Math.max(this.stats.stableOrbits, orbitingParticles.length);
        
        // Track longest orbit duration
        orbitingParticles.forEach(particle => {
            if (particle.orbitDuration) {
                particle.orbitDuration++;
                this.stats.longestOrbit = Math.max(this.stats.longestOrbit, particle.orbitDuration);
            } else {
                particle.orbitDuration = 1;
            }
        });
        
        // Calculate bonus scores
        this.calculateBonusScores(activeParticles, gravityWells);
        
        // Update display
        this.updateDisplay(activeParticles, orbitingParticles);
        
        // Check achievements
        this.checkAchievements();
    }
    
    calculateBonusScores(particles, gravityWells) {
        // Symmetry bonus - check for symmetrical particle distributions
        const symmetryScore = this.calculateSymmetryScore(particles);
        if (symmetryScore > 0.7) {
            this.stats.symmetryBonus++;
            this.addScore(this.multipliers.symmetry * symmetryScore, 'Symmetry Bonus');
        }
        
        // Efficiency bonus - reward creating complex patterns with few launches
        if (particles.length > 20 && this.stats.launches < 10) {
            this.stats.efficiencyBonus++;
            this.addScore(this.multipliers.efficiency * 10, 'Efficiency Bonus');
        }
        
        // Orbital bonus - ongoing score for stable orbits
        const orbitingCount = particles.filter(p => p.isInOrbit).length;
        if (orbitingCount > 0) {
            this.addScore(orbitingCount * this.multipliers.orbit, 'Orbital Bonus');
        }
        
        // Creativity bonus - reward using multiple liquid types
        const liquidTypes = new Set(particles.map(p => p.type));
        if (liquidTypes.size >= 3) {
            this.addScore(this.multipliers.creativity * liquidTypes.size, 'Creativity Bonus');
        }
    }
    
    calculateSymmetryScore(particles) {
        if (particles.length < 4) return 0;
        
        // Calculate center of mass
        let centerX = 0, centerY = 0, centerZ = 0;
        particles.forEach(p => {
            centerX += p.position.x;
            centerY += p.position.y;
            centerZ += p.position.z;
        });
        centerX /= particles.length;
        centerY /= particles.length;
        centerZ /= particles.length;
        
        const center = new Vector3D(centerX, centerY, centerZ);
        
        // Check for radial symmetry
        const distances = particles.map(p => p.position.distance(center));
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        
        // Calculate variance in distances (lower variance = more symmetrical)
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        const normalizedVariance = Math.min(variance / (avgDistance * avgDistance), 1);
        
        return Math.max(0, 1 - normalizedVariance);
    }
    
    addScore(points, reason = '') {
        this.score += Math.round(points);
        
        // Show floating score popup (optional visual feedback)
        if (points > 5) {
            this.showScorePopup(points, reason);
        }
    }
    
    showScorePopup(points, reason) {
        // Create a temporary score popup element
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 100px;
            right: 50px;
            background: rgba(64, 224, 255, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: none;
            animation: scorePopup 2s ease-out forwards;
        `;
        
        popup.textContent = `+${Math.round(points)} ${reason}`;
        document.body.appendChild(popup);
        
        // Add CSS animation
        if (!document.getElementById('scorePopupStyles')) {
            const style = document.createElement('style');
            style.id = 'scorePopupStyles';
            style.textContent = `
                @keyframes scorePopup {
                    0% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-30px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove popup after animation
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 2000);
    }
    
    addLaunch(distance, power) {
        this.stats.launches++;
        this.stats.particlesLaunched += Math.ceil(distance * 10);
        
        // Base score for launch
        const baseScore = distance * power * 2;
        this.addScore(baseScore, 'Launch');
        
        // Bonus for long-distance launches
        if (distance > 20) {
            this.addScore(distance, 'Long Range');
        }
    }
    
    addBurst() {
        this.stats.bursts++;
        this.stats.particlesLaunched += 8; // Burst creates 8 particles
        this.addScore(5, 'Burst');
    }
    
    addGravityWell() {
        this.stats.gravityWellsPlaced++;
        this.addScore(20, 'Gravity Well');
    }
    
    checkAchievements() {
        this.achievementDefinitions.forEach(achievement => {
            if (this.achievements.includes(achievement.id)) return; // Already achieved
            
            const currentValue = this.stats[achievement.stat] || this.score;
            if (currentValue >= achievement.threshold) {
                this.unlockAchievement(achievement);
            }
        });
    }
    
    unlockAchievement(achievement) {
        this.achievements.push(achievement.id);
        this.addScore(achievement.points, 'Achievement');
        
        // Show achievement notification
        this.showAchievementNotification(achievement);
        
        console.log(`Achievement unlocked: ${achievement.name} - ${achievement.description}`);
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #4080ff, #8040ff);
            color: white;
            padding: 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 1001;
            text-align: center;
            box-shadow: 0 0 30px rgba(64, 128, 255, 0.8);
            animation: achievementPopup 3s ease-out forwards;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🏆</div>
            <div style="font-size: 18px; margin-bottom: 5px;">${achievement.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">${achievement.description}</div>
            <div style="font-size: 16px; margin-top: 10px; color: #ffff80;">+${achievement.points} points!</div>
        `;
        
        document.body.appendChild(notification);
        
        // Add CSS animation for achievement
        if (!document.getElementById('achievementPopupStyles')) {
            const style = document.createElement('style');
            style.id = 'achievementPopupStyles';
            style.textContent = `
                @keyframes achievementPopup {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    25% { transform: translate(-50%, -50%) scale(1); }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    updateDisplay(activeParticles, orbitingParticles) {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = this.score.toLocaleString();
        }
        
        if (this.particleCountDisplay) {
            this.particleCountDisplay.textContent = activeParticles.length;
        }
        
        if (this.orbitCountDisplay) {
            this.orbitCountDisplay.textContent = orbitingParticles.length;
        }
    }
    
    getGrade() {
        // Calculate overall grade based on score
        if (this.score >= 50000) return 'S+';
        if (this.score >= 25000) return 'S';
        if (this.score >= 10000) return 'A+';
        if (this.score >= 5000) return 'A';
        if (this.score >= 2500) return 'B+';
        if (this.score >= 1000) return 'B';
        if (this.score >= 500) return 'C+';
        if (this.score >= 200) return 'C';
        if (this.score >= 50) return 'D';
        return 'F';
    }
    
    getCompletionPercentage() {
        return Math.min(100, (this.achievements.length / this.achievementDefinitions.length) * 100);
    }
    
    getSummary() {
        return {
            score: this.score,
            grade: this.getGrade(),
            completionPercentage: this.getCompletionPercentage(),
            achievements: this.achievements.length,
            totalAchievements: this.achievementDefinitions.length,
            timeActive: this.stats.timeActive,
            stats: { ...this.stats }
        };
    }
    
    reset() {
        this.score = 0;
        this.stats = {
            particlesLaunched: 0,
            gravityWellsPlaced: 0,
            stableOrbits: 0,
            launches: 0,
            bursts: 0,
            timeActive: 0,
            longestOrbit: 0,
            maxParticles: 0,
            symmetryBonus: 0,
            efficiencyBonus: 0
        };
        this.achievements = [];
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        
        this.updateDisplay([], []);
    }
    
    // Save/load functionality for persistence
    save() {
        const saveData = {
            score: this.score,
            stats: this.stats,
            achievements: this.achievements,
            startTime: this.startTime
        };
        
        localStorage.setItem('liquidGalaxyPainter_save', JSON.stringify(saveData));
    }
    
    load() {
        const saveData = localStorage.getItem('liquidGalaxyPainter_save');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                this.score = data.score || 0;
                this.stats = { ...this.stats, ...data.stats };
                this.achievements = data.achievements || [];
                this.startTime = data.startTime || Date.now();
                
                this.updateDisplay([], []);
                return true;
            } catch (e) {
                console.warn('Failed to load save data:', e);
            }
        }
        return false;
    }
    
    exportStats() {
        // Export detailed statistics for sharing or analysis
        const summary = this.getSummary();
        const exportData = {
            ...summary,
            achievementDetails: this.achievements.map(id => {
                const def = this.achievementDefinitions.find(a => a.id === id);
                return def ? { id, name: def.name, description: def.description } : null;
            }).filter(Boolean),
            sessionDuration: Date.now() - this.startTime,
            exportedAt: new Date().toISOString()
        };
        
        return JSON.stringify(exportData, null, 2);
    }
}

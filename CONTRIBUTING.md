# Contributing to Liquid Galaxy Painter

Thank you for your interest in contributing to Liquid Galaxy Painter! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/liquid-galaxy-painter.git
   cd liquid-galaxy-painter
   ```
3. **Start local development server**:
   ```bash
   python3 -m http.server 8000
   ```
4. **Open in browser**: `http://localhost:8000`

## 🛠️ Development Setup

### Prerequisites
- Modern web browser with WebGL support
- Python 3 (for local server) or any HTTP server
- Git for version control
- Text editor or IDE

### Project Structure
```
liquid-galaxy-painter/
├── index.html              # Main game interface
├── style.css              # Styling and UI
├── js/
│   ├── main.js            # Game orchestration
│   ├── utils/math.js      # Math utilities and physics constants
│   ├── physics/           # Physics simulation
│   ├── rendering/         # Three.js rendering and effects
│   └── game/             # Game logic and controls
├── .github/workflows/     # CI/CD automation
└── README.md
```

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use the GitHub Issues tab
- Include browser/device information
- Provide steps to reproduce
- Include console errors if any

### ✨ Feature Requests
- Check existing issues first
- Describe the feature and use case
- Consider implementation complexity
- Discuss before starting major features

### 🔧 Code Contributions

#### Physics Engine
- `js/physics/particle.js` - Particle behavior and properties
- `js/physics/gravity.js` - Gravitational field simulation
- Add new liquid types or gravity well behaviors

#### Visual Effects
- `js/rendering/effects.js` - Particle trails, explosions, sparkles
- `js/rendering/scene.js` - Three.js scene management
- Improve performance or add new visual effects

#### Game Mechanics
- `js/game/controls.js` - Input handling and UI
- `js/game/scoring.js` - Achievement system and scoring
- Add new achievements or gameplay features

#### User Interface
- `style.css` - Styling and responsive design
- `index.html` - UI structure and layout
- Improve accessibility or mobile experience

## 📋 Development Guidelines

### Code Style
- Use meaningful variable names
- Comment complex physics calculations
- Follow existing code organization
- Maintain consistent formatting

### Physics Accuracy
- Maintain scientific accuracy where possible
- Document any physics approximations
- Test performance impact of new calculations
- Consider real-world units and scaling

### Performance
- Target 60fps on mid-range devices
- Use object pooling for frequently created objects
- Minimize garbage collection during gameplay
- Profile performance changes

### Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Ensure WebGL fallbacks work
- Test mobile devices when possible
- Use progressive enhancement

## 🧪 Testing

### Manual Testing Checklist
- [ ] Game loads without errors
- [ ] All liquid types work correctly
- [ ] Gravity wells function properly
- [ ] Controls are responsive
- [ ] Scoring system works
- [ ] Visual effects render correctly
- [ ] Performance is acceptable (30+ fps)

### Performance Testing
- Monitor FPS counter in-game
- Test with many particles (500+)
- Check memory usage over time
- Verify cleanup on canvas clear

## 🚀 Deployment

### GitHub Pages
The project auto-deploys to GitHub Pages via GitHub Actions:
- Push to `main` branch triggers deployment
- Workflow validates all files exist
- Deployment creates live game URL

### Local Testing
Always test locally before pushing:
```bash
python3 -m http.server 8000
# Test at http://localhost:8000
```

## 📝 Pull Request Process

1. **Create feature branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

2. **Make changes and test thoroughly**

3. **Commit with clear messages**:
   ```bash
   git commit -m "Add crystal liquid crystallization effects"
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/amazing-new-feature
   ```

5. **Fill out PR template** with:
   - What changes were made
   - Why the changes are needed  
   - How to test the changes
   - Screenshots/GIFs if visual changes

## 🎨 Creative Contributions

### New Liquid Types
When adding liquid types:
- Define unique physics properties
- Create distinctive visual style
- Add appropriate particle interactions
- Update UI selectors and documentation

### New Gravity Wells
For new gravity well types:
- Research real astronomical objects
- Implement realistic physics effects
- Design unique visual representation
- Balance gameplay impact

### Visual Effects
For new effects:
- Optimize for performance
- Use object pooling
- Maintain consistent art style
- Consider color accessibility

## 🤝 Community Guidelines

### Be Respectful
- Welcome newcomers
- Provide constructive feedback
- Celebrate contributions
- Help with questions

### Educational Focus
- Explain physics concepts clearly
- Share learning resources
- Encourage experimentation
- Make science accessible

### Collaboration
- Discuss major changes in issues
- Review others' code thoughtfully  
- Share knowledge and techniques
- Build on each other's work

## 📚 Resources

### Physics References
- Classical Mechanics (Goldstein)
- Orbital Mechanics basics
- Fluid dynamics principles
- N-body problem solutions

### Three.js Documentation
- [Three.js Docs](https://threejs.org/docs/)
- WebGL fundamentals
- Particle system tutorials
- Performance optimization guides

### Game Development
- Physics simulation techniques
- Real-time rendering optimization
- User experience design
- Accessibility guidelines

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant features
- Code comments for algorithms
- Community showcases

Thank you for helping make Liquid Galaxy Painter an amazing experience for everyone! 🌌✨

---

**Questions?** Open an issue or start a discussion. We're here to help!

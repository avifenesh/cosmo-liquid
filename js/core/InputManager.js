/**
 * InputManager - Handles mouse, keyboard, and touch input
 * Provides unified input event system for the application
 * @class
 */

/**
 * @typedef {Object} Position2D
 * @property {number} x - The x coordinate
 * @property {number} y - The y coordinate
 */

/**
 * @typedef {Object} MouseState
 * @property {boolean} left - Whether left mouse button is pressed
 * @property {boolean} right - Whether right mouse button is pressed
 * @property {boolean} middle - Whether middle mouse button is pressed
 */

/**
 * @typedef {Object} MouseEvent
 * @property {number} button - The mouse button code (0=left, 1=middle, 2=right)
 * @property {Position2D} position - The mouse position
 * @property {MouseState} buttons - The state of all mouse buttons
 */

/**
 * @typedef {Object} KeyboardEvent
 * @property {string} key - The key value
 * @property {string} code - The key code
 * @property {boolean} altKey - Whether Alt key is pressed
 * @property {boolean} ctrlKey - Whether Ctrl key is pressed
 * @property {boolean} shiftKey - Whether Shift key is pressed
 * @property {boolean} metaKey - Whether Meta key is pressed
 */

/**
 * @typedef {Object} TouchEvent
 * @property {number} touchId - The touch identifier
 * @property {Position2D} position - The touch position
 * @property {Position2D[]} touches - All active touch positions
 * @property {Position2D} [delta] - The movement delta (for touchmove events)
 * @property {Position2D} [startPosition] - The starting position (for touchend events)
 */

export class InputManager {
    /**
     * Creates a new InputManager instance
     * @constructor
     * @param {HTMLCanvasElement} canvas - The canvas element to attach input listeners to
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} The canvas element for input capture */
        this.canvas = canvas;
        /** @type {Map<string, Function[]>} Map of event listeners by event type */
        this.eventListeners = new Map();
        
        // Mouse state
        /** @type {Position2D} Current mouse position */
        this.mousePosition = { x: 0, y: 0 };
        /** @type {MouseState} State of mouse buttons */
        this.mousePressed = { left: false, right: false, middle: false };
        /** @type {Position2D} Previous frame mouse position */
        this.mousePreviousPosition = { x: 0, y: 0 };
        /** @type {Position2D} Mouse movement delta */
        this.mouseDelta = { x: 0, y: 0 };
        
        // Keyboard state
        /** @type {Set<string>} Set of currently pressed keys */
        this.keysPressed = new Set();
        /** @type {Set<string>} Set of keys pressed this frame */
        this.keysJustPressed = new Set();
        /** @type {Set<string>} Set of keys released this frame */
        this.keysJustReleased = new Set();
        
        // Touch state (for future mobile support)
        /** @type {Map<number, Position2D>} Map of active touches by ID */
        this.touches = new Map();
        /** @type {Map<number, Position2D>} Map of touch start positions by ID */
        this.touchStartPositions = new Map();
        
        // Configuration
        /** @type {boolean} Whether input processing is enabled */
        this.enabled = true;
        /** @type {boolean} Whether to prevent default browser behaviors */
        this.preventDefaults = true;
        
        this.initialize();
    }
    
    initialize() {
        this.setupMouseEvents();
        this.setupKeyboardEvents();
        this.setupTouchEvents();
        this.setupContextMenu();
        
        console.log('InputManager initialized');
    }
    
    setupMouseEvents() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.enabled) return;
            
            this.updateMousePosition(event);
            this.emit('mousemove', {
                position: { ...this.mousePosition },
                delta: { ...this.mouseDelta },
                buttons: { ...this.mousePressed }
            });
        });
        
        // Mouse down
        this.canvas.addEventListener('mousedown', (event) => {
            if (!this.enabled) return;
            
            this.updateMousePosition(event);
            
            const button = this.getMouseButton(event.button);
            this.mousePressed[button] = true;
            
            this.emit('mousedown', {
                button: event.button,
                position: { ...this.mousePosition },
                buttons: { ...this.mousePressed }
            });
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Mouse up
        this.canvas.addEventListener('mouseup', (event) => {
            if (!this.enabled) return;
            
            this.updateMousePosition(event);
            
            const button = this.getMouseButton(event.button);
            this.mousePressed[button] = false;
            
            this.emit('mouseup', {
                button: event.button,
                position: { ...this.mousePosition },
                buttons: { ...this.mousePressed }
            });
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Mouse wheel
        this.canvas.addEventListener('wheel', (event) => {
            if (!this.enabled) return;
            
            this.emit('wheel', {
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaZ: event.deltaZ,
                position: { ...this.mousePosition }
            });
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Mouse enter/leave
        this.canvas.addEventListener('mouseenter', () => {
            this.emit('mouseenter', { position: { ...this.mousePosition } });
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            // Reset mouse pressed state when leaving canvas
            this.mousePressed.left = false;
            this.mousePressed.right = false;
            this.mousePressed.middle = false;
            
            this.emit('mouseleave', { position: { ...this.mousePosition } });
        });
    }
    
    setupKeyboardEvents() {
        // Key down
        document.addEventListener('keydown', (event) => {
            if (!this.enabled) return;
            
            const key = event.code;
            
            if (!this.keysPressed.has(key)) {
                this.keysJustPressed.add(key);
            }
            
            this.keysPressed.add(key);
            
            this.emit('keydown', {
                key: event.key,
                code: event.code,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey
            });
            
            // Handle specific key combinations
            if (this.shouldPreventDefault(event)) {
                event.preventDefault();
            }
        });
        
        // Key up
        document.addEventListener('keyup', (event) => {
            if (!this.enabled) return;
            
            const key = event.code;
            
            this.keysPressed.delete(key);
            this.keysJustReleased.add(key);
            
            this.emit('keyup', {
                key: event.key,
                code: event.code,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey
            });
        });
        
        // Focus events
        window.addEventListener('blur', () => {
            // Clear all keys when window loses focus
            this.keysPressed.clear();
            this.keysJustPressed.clear();
            this.keysJustReleased.clear();
            
            // Reset mouse state
            this.mousePressed.left = false;
            this.mousePressed.right = false;
            this.mousePressed.middle = false;
            
            this.emit('focus', { hasFocus: false });
        });
        
        window.addEventListener('focus', () => {
            this.emit('focus', { hasFocus: true });
        });
    }
    
    setupTouchEvents() {
        // Touch start
        this.canvas.addEventListener('touchstart', (event) => {
            if (!this.enabled) return;
            
            for (const touch of event.changedTouches) {
                const position = this.getTouchPosition(touch);
                this.touches.set(touch.identifier, position);
                this.touchStartPositions.set(touch.identifier, position);
                
                this.emit('touchstart', {
                    touchId: touch.identifier,
                    position: position,
                    touches: Array.from(this.touches.values())
                });
            }
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Touch move
        this.canvas.addEventListener('touchmove', (event) => {
            if (!this.enabled) return;
            
            for (const touch of event.changedTouches) {
                const position = this.getTouchPosition(touch);
                const previousPosition = this.touches.get(touch.identifier);
                
                if (previousPosition) {
                    const delta = {
                        x: position.x - previousPosition.x,
                        y: position.y - previousPosition.y
                    };
                    
                    this.touches.set(touch.identifier, position);
                    
                    this.emit('touchmove', {
                        touchId: touch.identifier,
                        position: position,
                        delta: delta,
                        touches: Array.from(this.touches.values())
                    });
                }
            }
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Touch end
        this.canvas.addEventListener('touchend', (event) => {
            if (!this.enabled) return;
            
            for (const touch of event.changedTouches) {
                const position = this.getTouchPosition(touch);
                const startPosition = this.touchStartPositions.get(touch.identifier);
                
                this.touches.delete(touch.identifier);
                this.touchStartPositions.delete(touch.identifier);
                
                this.emit('touchend', {
                    touchId: touch.identifier,
                    position: position,
                    startPosition: startPosition,
                    touches: Array.from(this.touches.values())
                });
            }
            
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
        
        // Touch cancel
        this.canvas.addEventListener('touchcancel', (event) => {
            if (!this.enabled) return;
            
            for (const touch of event.changedTouches) {
                this.touches.delete(touch.identifier);
                this.touchStartPositions.delete(touch.identifier);
                
                this.emit('touchcancel', {
                    touchId: touch.identifier,
                    touches: Array.from(this.touches.values())
                });
            }
        });
    }
    
    setupContextMenu() {
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (event) => {
            if (this.preventDefaults) {
                event.preventDefault();
            }
        });
    }
    
    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        this.mousePreviousPosition.x = this.mousePosition.x;
        this.mousePreviousPosition.y = this.mousePosition.y;
        
        this.mousePosition.x = event.clientX - rect.left;
        this.mousePosition.y = event.clientY - rect.top;
        
        this.mouseDelta.x = this.mousePosition.x - this.mousePreviousPosition.x;
        this.mouseDelta.y = this.mousePosition.y - this.mousePreviousPosition.y;
    }
    
    getTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
    
    getMouseButton(buttonCode) {
        switch (buttonCode) {
            case 0: return 'left';
            case 1: return 'middle';
            case 2: return 'right';
            default: return 'unknown';
        }
    }
    
    shouldPreventDefault(event) {
        // Prevent defaults for specific keys that might interfere
        const preventKeys = [
            'Space',      // Prevent page scroll
            'ArrowUp',    // Prevent page scroll
            'ArrowDown',  // Prevent page scroll
            'ArrowLeft',  // Prevent page navigation
            'ArrowRight', // Prevent page navigation
            'Tab'         // Prevent focus change
        ];
        
        if (preventKeys.includes(event.code)) {
            return true;
        }
        
        // Prevent F5 refresh, Ctrl+R refresh, etc.
        if ((event.ctrlKey || event.metaKey) && ['KeyR', 'F5'].includes(event.code)) {
            return true;
        }
        
        return false;
    }
    
    // Event system
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        
        this.eventListeners.get(eventType).push(callback);
    }
    
    off(eventType, callback) {
        if (!this.eventListeners.has(eventType)) return;
        
        const listeners = this.eventListeners.get(eventType);
        const index = listeners.indexOf(callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
    
    emit(eventType, data) {
        if (!this.eventListeners.has(eventType)) return;
        
        const listeners = this.eventListeners.get(eventType);
        
        for (const listener of listeners) {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in input event listener for ${eventType}:`, error);
            }
        }
    }
    
    // State query methods
    isKeyPressed(keyCode) {
        return this.keysPressed.has(keyCode);
    }
    
    isKeyJustPressed(keyCode) {
        return this.keysJustPressed.has(keyCode);
    }
    
    isKeyJustReleased(keyCode) {
        return this.keysJustReleased.has(keyCode);
    }
    
    isMousePressed(button = 'left') {
        return this.mousePressed[button] || false;
    }
    
    getMousePosition() {
        return { ...this.mousePosition };
    }
    
    getMouseDelta() {
        return { ...this.mouseDelta };
    }
    
    getTouchCount() {
        return this.touches.size;
    }
    
    getTouches() {
        return Array.from(this.touches.values());
    }
    
    // Utility methods
    clearJustPressed() {
        // Should be called at the end of each frame
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
        
        // Clear all pressed states
        this.keysPressed.clear();
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        
        this.mousePressed.left = false;
        this.mousePressed.right = false;
        this.mousePressed.middle = false;
        
        this.touches.clear();
        this.touchStartPositions.clear();
    }
    
    setPreventDefaults(prevent) {
        this.preventDefaults = prevent;
    }
    
    // Input mapping utilities
    createInputMap() {
        return {
            // Movement keys
            moveForward: () => this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp'),
            moveBackward: () => this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown'),
            moveLeft: () => this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft'),
            moveRight: () => this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight'),
            moveUp: () => this.isKeyPressed('Space'),
            moveDown: () => this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight'),
            
            // Liquid type selection
            selectLiquid1: () => this.isKeyJustPressed('Digit1'),
            selectLiquid2: () => this.isKeyJustPressed('Digit2'),
            selectLiquid3: () => this.isKeyJustPressed('Digit3'),
            selectLiquid4: () => this.isKeyJustPressed('Digit4'),
            selectLiquid5: () => this.isKeyJustPressed('Digit5'),
            selectLiquid6: () => this.isKeyJustPressed('Digit6'),
            selectLiquid7: () => this.isKeyJustPressed('Digit7'),
            selectLiquid8: () => this.isKeyJustPressed('Digit8'),
            
            // Action keys
            clearParticles: () => this.isKeyJustPressed('KeyC'),
            pausePhysics: () => this.isKeyJustPressed('KeyP'),
            resetCamera: () => this.isKeyJustPressed('KeyR'),
            toggleFullscreen: () => this.isKeyJustPressed('F11'),
            toggleUI: () => this.isKeyJustPressed('KeyH'),
            
            // Mouse actions
            launchParticles: () => this.isMousePressed('left'),
            placeGravityWell: () => this.isMousePressed('right'),
            panCamera: () => this.isMousePressed('middle'),
            
            // Modifiers
            precision: () => this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight'),
            boost: () => this.isKeyPressed('ControlLeft') || this.isKeyPressed('ControlRight'),
            alt: () => this.isKeyPressed('AltLeft') || this.isKeyPressed('AltRight')
        };
    }
    
    dispose() {
        // Remove all event listeners
        this.eventListeners.clear();
        
        // Clear all state
        this.keysPressed.clear();
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        
        this.mousePressed.left = false;
        this.mousePressed.right = false;
        this.mousePressed.middle = false;
        
        this.touches.clear();
        this.touchStartPositions.clear();
        
        console.log('InputManager disposed');
    }
}

// ============================================
// PREMIUM SPLASH SCREEN LOGIC
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Show splash screen for 2.5 seconds then fade out
    const splashScreen = document.getElementById('splashScreen');
    const mainApp = document.querySelector('.app-container');
    
    if (splashScreen) {
        // Add a slight delay to show the animation properly
        setTimeout(() => {
            // Add fade-out class to splash
            splashScreen.classList.add('fade-out');
            
            // Show main app with animation
            if (mainApp) {
                mainApp.classList.add('appear');
            }
            
            // Remove splash from DOM after animation
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 800);
        }, 2500); // 2.5 seconds splash display
    } else {
        // If no splash, just show main app
        if (mainApp) {
            mainApp.classList.add('appear');
        }
    }
});

// Optional: Preload images/assets while splash is showing
window.addEventListener('load', function() {
    // Any heavy assets can be preloaded here
    console.log('PiVolve Recall - Fully Loaded');
});

const CACHE_NAME = 'pivolve-v1';
const urlsToCache = [
    '.',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
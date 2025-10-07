// Audio management for multiple carousels
const audioPlayers = {};
let currentAudio = null;
let carouselIntervals = {};
let currentCarouselId = null;

// Duration overrides for specific carousels (in seconds)
const durationOverrides = {
    // Section 1 (School Objects & Things) - 22 seconds for 11 items
    'section-0-vocab': 22,  // School Objects & Things: 22 seconds
    // Section 2 (Questions & Expressions) - 18 seconds for 6 items (ensure last card shows)
    'section-1-vocab': 18,  // Questions & Expressions: 18 seconds
    // Section 3 (Numbers) - 14 seconds for 10 items (faster)
    'section-2-vocab': 14,  // Numbers: 14 seconds
    // Section 4 (Practice Dialogue) - 22 seconds for 2 items
    'section-3-vocab': 22,  // Practice Dialogue: 22 seconds
};

function createAudioPlayer(audioId) {
    if (!audioPlayers[audioId]) {
        const audio = new Audio(`/static/audio/${audioId}.wav`);
        audio.addEventListener('error', function() {
            console.log(`Audio file not found: ${audioId}.wav`);
            const displayName = audioId.replace('section-', 'Section ').replace('-vocab', ' Vocabulary').replace('-expr', ' Expressions');
            showAudioMessage(`🎵 Audio placeholder: ${displayName}`, 'info');
        });
        audio.addEventListener('ended', function() {
            showAudioMessage('🎵 Carousel audio finished!', 'success');
            // Stop carousel auto-advance when audio ends
            stopCarouselAutoAdvance();
        });
        audio.addEventListener('loadedmetadata', function() {
            console.log(`Audio duration for ${audioId}: ${audio.duration} seconds`);
        });
        audioPlayers[audioId] = audio;
    }
    return audioPlayers[audioId];
}

function getCarouselElement(audioId) {
    // Determine which carousel corresponds to this audio
    const sectionMatch = audioId.match(/section-(\d+)-(\w+)/);
    if (sectionMatch) {
        const sectionNum = parseInt(sectionMatch[1]) + 1; // Convert from 0-based audio ID to 1-based carousel ID
        const carouselType = sectionMatch[2]; // 'vocab' or 'expr'
        
        // For the new structure, we use cardsCarousel
        if (carouselType === 'vocab') {
            return document.getElementById(`cardsCarousel${sectionNum}`);
        } else if (carouselType === 'expr') {
            return document.getElementById(`cardsCarousel${sectionNum}`);
        }
    }
    return null;
}

function startCarouselAutoAdvance(audioId, audioDuration) {
    const carousel = getCarouselElement(audioId);
    if (!carousel) {
        console.error(`❌ Carousel not found for ${audioId}`);
        return;
    }

    // Stop any existing auto-advance
    stopCarouselAutoAdvance();

    const carouselItems = carousel.querySelectorAll('.carousel-item');
    const totalItems = carouselItems.length;
    
    if (totalItems <= 1) {
        console.log(`⚠️ Only ${totalItems} item(s) in carousel ${audioId}, no auto-advance needed`);
        return;
    }

    // Calculate time per slide - precise calculation
    const timePerSlide = audioDuration / totalItems;
    
    console.log(`🎯 SYNC SETUP for ${audioId}:`);
    console.log(`   📊 Audio duration: ${audioDuration.toFixed(2)}s`);
    console.log(`   🎠 Total slides: ${totalItems}`);
    console.log(`   ⏱️  Time per slide: ${timePerSlide.toFixed(3)}s (${(timePerSlide * 1000).toFixed(0)}ms)`);
    
    // Log expected timing for each slide
    console.log(`   📋 Slide Schedule:`);
    for (let i = 0; i < totalItems; i++) {
        const slideStartTime = i * timePerSlide;
        console.log(`      Slide ${i + 1}: ${slideStartTime.toFixed(2)}s - ${(slideStartTime + timePerSlide).toFixed(2)}s`);
    }
    
    let currentSlide = 0;
    currentCarouselId = audioId;
    
    // Reset carousel to first slide
    const bootstrapCarousel = bootstrap.Carousel.getInstance(carousel) || new bootstrap.Carousel(carousel);
    bootstrapCarousel.to(0);
    
    // Store slide change timeouts for cleanup
    const slideTimeouts = [];
    
    // Schedule slide changes at precise times
    for (let i = 1; i < totalItems; i++) {
        const slideTime = i * timePerSlide * 1000; // Convert to milliseconds
        
        const timeoutId = setTimeout(() => {
            // Check if this carousel is still active
            if (currentCarouselId === audioId) {
                const actualTime = performance.now();
                console.log(`🎠 Slide ${i + 1} at ${slideTime.toFixed(0)}ms (actual: ${actualTime.toFixed(0)}ms)`);
                currentSlide = i;
                bootstrapCarousel.to(i);
            }
        }, slideTime);
        
        slideTimeouts.push(timeoutId);
    }
    
    // Schedule cleanup at the end
    const cleanupTimeout = setTimeout(() => {
        if (currentCarouselId === audioId) {
            console.log(`✅ Auto-advance complete for ${audioId}`);
            currentCarouselId = null;
        }
    }, audioDuration * 1000);
    
    slideTimeouts.push(cleanupTimeout);
    
    // Store timeouts for cleanup
    carouselIntervals[audioId] = slideTimeouts;
}

function stopCarouselAutoAdvance() {
    // Clear all scheduled timeouts by setting currentCarouselId to null
    // This will prevent any pending slide changes from executing
    const wasActive = currentCarouselId !== null;
    currentCarouselId = null;
    
    // Clear all scheduled timeouts
    Object.keys(carouselIntervals).forEach(audioId => {
        if (Array.isArray(carouselIntervals[audioId])) {
            // New timeout-based system
            carouselIntervals[audioId].forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
        } else {
            // Old interval-based system (fallback)
            clearInterval(carouselIntervals[audioId]);
        }
        delete carouselIntervals[audioId];
    });
    
    if (wasActive) {
        console.log('🛑 Carousel auto-advance stopped');
    }
}

function playAudio(audioId) {
    try {
        // Stop any currently playing audio and carousel auto-advance
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        stopCarouselAutoAdvance();

        const audio = createAudioPlayer(audioId);
        audio.currentTime = 0;
        currentAudio = audio;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                const displayName = audioId.replace('section-', 'Section ').replace('-vocab', ' Vocabulary').replace('-expr', ' Expressions');
                showAudioMessage(`🎵 Playing ${displayName}!`, 'success');
                
                // Start carousel auto-advance synchronized with audio
                // Add a 2-second delay before starting carousel
                setTimeout(() => {
                    if (audio === currentAudio && !audio.paused) {
                        // Check for duration override first
                        const overrideDuration = durationOverrides[audioId];
                        if (overrideDuration) {
                            console.log(`🎯 Using OVERRIDE duration for ${audioId}: ${overrideDuration}s (actual audio: ${audio.duration || 'unknown'}s)`);
                            startCarouselAutoAdvance(audioId, overrideDuration);
                        } else if (audio.duration && !isNaN(audio.duration)) {
                            console.log(`Audio started successfully, duration: ${audio.duration}s`);
                            startCarouselAutoAdvance(audioId, audio.duration);
                        } else {
                            // If duration isn't available yet, wait for it
                            audio.addEventListener('loadedmetadata', function() {
                                if (audio === currentAudio && !audio.paused) {
                                    const overrideDuration = durationOverrides[audioId];
                                    if (overrideDuration) {
                                        console.log(`🎯 Using OVERRIDE duration for ${audioId}: ${overrideDuration}s (actual audio: ${audio.duration}s)`);
                                        startCarouselAutoAdvance(audioId, overrideDuration);
                                    } else {
                                        console.log(`Audio metadata loaded, duration: ${audio.duration}s`);
                                        startCarouselAutoAdvance(audioId, audio.duration);
                                    }
                                }
                            }, { once: true });
                        }
                    }
                }, 2000); // 2-second delay before starting carousel
            }).catch(error => {
                console.log('Playback failed:', error);
                const displayName = audioId.replace('section-', 'Section ').replace('-vocab', ' Vocabulary').replace('-expr', ' Expressions');
                showAudioMessage(`🎵 Audio placeholder: ${displayName}`, 'info');
                
                // For placeholder, use duration override or default timing with 2-second delay
                setTimeout(() => {
                    const carousel = getCarouselElement(audioId);
                    if (carousel) {
                        const overrideDuration = durationOverrides[audioId];
                        if (overrideDuration) {
                            console.log(`🎯 Using OVERRIDE duration for placeholder ${audioId}: ${overrideDuration}s`);
                            startCarouselAutoAdvance(audioId, overrideDuration);
                        } else {
                            const carouselItems = carousel.querySelectorAll('.carousel-item');
                            const estimatedDuration = carouselItems.length * 3; // 3 seconds per slide
                            startCarouselAutoAdvance(audioId, estimatedDuration);
                        }
                    }
                }, 2000); // 2-second delay for placeholder audio
            });
        }
    } catch (error) {
        console.log('Audio error:', error);
        showAudioMessage(`🎵 Audio not available for ${audioId}`, 'info');
    }
}

function pauseAudio(audioId) {
    if (audioPlayers[audioId] && !audioPlayers[audioId].paused) {
        audioPlayers[audioId].pause();
        // Pause carousel auto-advance too
        if (currentCarouselId === audioId) {
            stopCarouselAutoAdvance();
        }
        showAudioMessage('⏸️ Audio paused!', 'warning');
    } else {
        showAudioMessage('⏸️ No audio playing to pause', 'warning');
    }
}

function stopAudio(audioId) {
    if (audioPlayers[audioId]) {
        audioPlayers[audioId].pause();
        audioPlayers[audioId].currentTime = 0;
        // Stop carousel auto-advance and reset to first slide
        stopCarouselAutoAdvance();
        
        // Reset carousel to first slide
        const carousel = getCarouselElement(audioId);
        if (carousel) {
            const bootstrapCarousel = bootstrap.Carousel.getInstance(carousel) || new bootstrap.Carousel(carousel);
            bootstrapCarousel.to(0);
        }
        
        showAudioMessage('🛑 Audio stopped!', 'danger');
    } else {
        showAudioMessage('🛑 No audio to stop', 'danger');
    }
}

// Show audio status message
function showAudioMessage(message, type) {
    // Remove existing messages
    const existingToast = document.querySelector('.audio-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast message
    const toast = document.createElement('div');
    toast.className = `audio-toast alert alert-${type} position-fixed`;
    toast.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        border-radius: 15px;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Text-to-Speech functionality
function speakText(text) {
    // Stop any currently playing audio first
    Object.values(audioPlayers).forEach(audio => {
        if (!audio.paused) {
            audio.pause();
        }
    });

    if ('speechSynthesis' in window) {
        // Stop any current speech
        window.speechSynthesis.cancel();

        // Clean text (remove emojis for better TTS)
        const cleanText = text.replace(/[👋🧑‍🦱🤔😊🤷‍♀️🎉👦👧🤝🙋‍♂️🎈❤️🟢🔵🟡💗🟠🖌️🌈👩‍🦰🔵🧒🐒🧍📝⭐🎭]/g, '').trim();
        
        if (cleanText) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            // Get available voices
            const voices = window.speechSynthesis.getVoices();
            
            // Try to use a child-friendly voice
            const preferredVoices = voices.filter(voice => 
                voice.name.toLowerCase().includes('google') || 
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('child') ||
                voice.name.toLowerCase().includes('samantha')
            );
            
            if (preferredVoices.length > 0) {
                utterance.voice = preferredVoices[0];
            }
            
            utterance.rate = 0.8; // Slower for kids
            utterance.pitch = 1.2; // Higher pitch
            utterance.volume = 0.9;
            
            window.speechSynthesis.speak(utterance);
            
            // Show feedback
            showAudioMessage(`🗣️ Speaking: "${cleanText.substring(0, 30)}..."`, 'info');
        }
    } else {
        showAudioMessage('🗣️ Speech not supported in this browser', 'warning');
    }
}

// Repeat text function for better learning
function repeatText(text) {
    // Clean text (remove emojis for better TTS)
    const cleanText = text.replace(/[✏️🧼🔪📏🎒🖊️👝✂️📓💻📚❓🗣️🎨⭐😁⚽1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣1️⃣1️⃣1️⃣2️⃣📝🤝]/g, '').trim();
    
    if ('speechSynthesis' in window && cleanText) {
        // Stop any current speech
        window.speechSynthesis.cancel();
        
        let repeatCount = 0;
        const maxRepeats = 3;
        
        function speakRepeat() {
            if (repeatCount < maxRepeats) {
                const utterance = new SpeechSynthesisUtterance(cleanText);
                
                // Get available voices
                const voices = window.speechSynthesis.getVoices();
                
                // Try to use a child-friendly voice
                const preferredVoices = voices.filter(voice => 
                    voice.name.toLowerCase().includes('google') || 
                    voice.name.toLowerCase().includes('female') ||
                    voice.name.toLowerCase().includes('child') ||
                    voice.name.toLowerCase().includes('samantha')
                );
                
                if (preferredVoices.length > 0) {
                    utterance.voice = preferredVoices[0];
                }
                
                utterance.rate = 0.7; // Even slower for repetition
                utterance.pitch = 1.3; // Slightly higher pitch
                utterance.volume = 0.9;
                
                utterance.onend = () => {
                    repeatCount++;
                    if (repeatCount < maxRepeats) {
                        setTimeout(speakRepeat, 800); // Short pause between repeats
                    } else {
                        showAudioMessage(`🎯 Finished repeating: "${cleanText.substring(0, 30)}..."`, 'success');
                    }
                };
                
                window.speechSynthesis.speak(utterance);
                
                if (repeatCount === 0) {
                    showAudioMessage(`🔁 Repeating: "${cleanText.substring(0, 30)}..." (${maxRepeats} times)`, 'info');
                }
            }
        }
        
        speakRepeat();
    } else {
        showAudioMessage('🗣️ Speech not supported in this browser', 'warning');
    }
}

// Debug function to check sync manually
function checkAudioCarouselSync() {
    if (currentAudio && currentCarouselId) {
        const currentTime = currentAudio.currentTime;
        const duration = currentAudio.duration;
        const progress = (currentTime / duration) * 100;
        
        const carousel = getCarouselElement(currentCarouselId);
        if (carousel) {
            const carouselItems = carousel.querySelectorAll('.carousel-item');
            const totalItems = carouselItems.length;
            const activeIndex = Array.from(carouselItems).findIndex(item => item.classList.contains('active'));
            const timePerSlide = duration / totalItems;
            const expectedIndex = Math.floor(currentTime / timePerSlide);
            const syncDifference = Math.abs(activeIndex - expectedIndex);
            
            console.log(`🔍 SYNC CHECK for ${currentCarouselId}:`);
            console.log(`   🎵 Audio: ${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s (${progress.toFixed(1)}%)`);
            console.log(`   🎠 Current slide: ${activeIndex + 1} / ${totalItems}`);
            console.log(`   📊 Expected slide: ${expectedIndex + 1}`);
            console.log(`   ⏱️  Time per slide: ${timePerSlide.toFixed(2)}s`);
            console.log(`   ${syncDifference === 0 ? '✅' : '⚠️'} Sync difference: ${syncDifference} slides`);
            
            if (syncDifference > 0) {
                console.log(`   🔧 Sync issue detected! Audio is ${syncDifference > 0 ? 'ahead' : 'behind'} of carousel`);
            }
        }
    } else {
        console.log('❌ No active audio/carousel to check');
    }
}

// Function to get detailed carousel info for all sections
function getAllCarouselInfo() {
    console.log('📊 ALL CAROUSEL INFO:');
    for (let section = 1; section <= 3; section++) {
        console.log(`\n📋 Section ${section}:`);
        
        // Check vocabulary carousel
        const vocabCarousel = document.getElementById(`vocabularyCarousel${section}`);
        if (vocabCarousel) {
            const vocabItems = vocabCarousel.querySelectorAll('.carousel-item');
            console.log(`   📖 Vocabulary: ${vocabItems.length} items (section-${section}-vocab.wav)`);
        }
        
        // Check expressions carousel
        const exprCarousel = document.getElementById(`expressionsCarousel${section}`);
        if (exprCarousel) {
            const exprItems = exprCarousel.querySelectorAll('.carousel-item');
            console.log(`   💬 Expressions: ${exprItems.length} items (section-${section}-expr.wav)`);
        }
    }
    
    console.log('\n🎵 To test sync: Play any carousel and use checkSync() during playback');
}

// Make debug functions available globally
window.checkSync = checkAudioCarouselSync;
window.getAllCarouselInfo = getAllCarouselInfo;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        // Space bar to pause/play
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            const activeCarousel = document.querySelector('.carousel-item.active');
            if (activeCarousel && audioManager.currentAudio) {
                if (audioManager.isPlaying) {
                    audioManager.pause();
                } else {
                    audioManager.play();
                }
            }
        }
        
        // Arrow keys for carousel navigation
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            const activeCarousel = document.querySelector('.carousel-item.active');
            if (activeCarousel) {
                const carousel = activeCarousel.closest('.carousel');
                const direction = e.code === 'ArrowLeft' ? 'prev' : 'next';
                const button = carousel.querySelector(`.carousel-control-${direction}`);
                if (button) {
                    button.click();
                }
            }
        }
    });

    // Add fun hover effects to cards
    const cards = document.querySelectorAll('.carousel-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .carousel-item.active {
            animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0.5; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Welcome message
    setTimeout(() => {
        audioManager.showAudioMessage('🌟 Welcome to English Fun Time! Click any button to explore! 🎉', 'success');
    }, 1000);

    console.log('🎉 English Learning App initialized successfully!');
});
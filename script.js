document.addEventListener('DOMContentLoaded', () => {
    // Audio context
    let audioContext;
    let analyser;
    let source;
    let audioElement;
    let animationId;
    let isPlaying = false;
    let currentVisualizationStyle = 'bars';
    let currentColorTheme = 'default';
    
    // Canvas elements
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');
    
    // UI elements
    const track1Card = document.getElementById('track1Card');
    const track2Card = document.getElementById('track2Card');
    const stopBtn = document.getElementById('stopBtn');
    const trackName = document.getElementById('trackName');
    const timeInfo = document.getElementById('timeInfo');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.querySelector('.progress-container');
    const volumeSlider = document.getElementById('volumeSlider');
    
    // Visualization style buttons
    const barStyleBtn = document.getElementById('barStyleBtn');
    const waveStyleBtn = document.getElementById('waveStyleBtn');
    const circleStyleBtn = document.getElementById('circleStyleBtn');
    
    // Color theme buttons
    const defaultThemeBtn = document.getElementById('defaultThemeBtn');
    const neonThemeBtn = document.getElementById('neonThemeBtn');
    const retroThemeBtn = document.getElementById('retroThemeBtn');
    
    // Color themes
    const colorThemes = {
        default: {
            primary: '#1db954',
            secondary: '#1ed760',
            tertiary: '#1fdf64',
            background: '#282828'
        },
        neon: {
            primary: '#ff00ff',
            secondary: '#00ffff',
            tertiary: '#ffff00',
            background: '#000000'
        },
        retro: {
            primary: '#ff5722',
            secondary: '#ff9800',
            tertiary: '#ffc107',
            background: '#263238'
        }
    };
    
    // Tracks - update with correct folder structure and extensions
    const tracks = {
        track1: {
            path: 'tracks/track1.mp3', // Include the file extension
            name: 'Track 1',
            artist: 'Unknown Artist',
            genre: 'UK Underground'
        },
        track2: {
            path: 'tracks/track2.mp3', // Include the file extension
            name: 'Track 2',
            artist: 'Unknown Artist',
            genre: 'UK Underground'
        }
    };
    
    // Set up canvas size
    function setupCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    
    // Initialize audio context
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512; // Increased for better visualization
        }
    }
    
    // Format time in MM:SS
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Update progress bar and time info
    function updateProgress() {
        if (audioElement && !audioElement.paused) {
            const currentTime = audioElement.currentTime;
            const duration = audioElement.duration || 0;
            
            // Update time display
            timeInfo.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            
            // Update progress bar
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            
            requestAnimationFrame(updateProgress);
        }
    }
    
    // Play selected track
    function playTrack(trackKey) {
        // Stop current playback if any
        stopPlayback();
        
        // Initialize audio context (needed for browsers that require user interaction)
        initAudio();
        
        // Create audio element
        audioElement = new Audio();
        audioElement.src = `${tracks[trackKey].path}`;
        audioElement.volume = volumeSlider.value;
        
        // Update UI
        trackName.textContent = `Loading ${tracks[trackKey].name} by ${tracks[trackKey].artist}...`;
        
        // Add event listener for when audio is loaded
        audioElement.addEventListener('canplaythrough', () => {
            // Connect to Web Audio API only after audio is loaded
            try {
                source = audioContext.createMediaElementSource(audioElement);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                
                // Update UI
                trackName.textContent = `${tracks[trackKey].name} - ${tracks[trackKey].artist}`;
                
                // Update active track card
                document.querySelectorAll('.track-card').forEach(card => {
                    card.classList.remove('active');
                });
                document.getElementById(`${trackKey}Card`).classList.add('active');
                
                // Play audio
                audioElement.play().then(() => {
                    isPlaying = true;
                    visualize();
                    updateProgress();
                }).catch(error => {
                    console.error('Error playing audio:', error);
                    trackName.textContent = `Error: Could not play ${tracks[trackKey].name}`;
                });
            } catch (error) {
                console.error('Error setting up audio:', error);
                trackName.textContent = `Error: Could not set up ${tracks[trackKey].name}`;
            }
        });
        
        // Add error handling
        audioElement.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
            trackName.textContent = `Error: Could not load ${tracks[trackKey].name}`;
        });
        
        // Start loading the audio
        audioElement.load();
    }
    
    // Stop playback
    function stopPlayback() {
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        isPlaying = false;
        trackName.textContent = 'Select a track to play';
        timeInfo.textContent = '00:00 / 00:00';
        progressBar.style.width = '0%';
        
        // Remove active class from track cards
        document.querySelectorAll('.track-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Visualize audio with bars
    function visualizeBars(dataArray, bufferLength) {
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up bar width and spacing
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        // Draw bars
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 1.5;
            
            // Create gradient based on current theme
            const theme = colorThemes[currentColorTheme];
            const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, theme.primary);
            gradient.addColorStop(0.5, theme.secondary);
            gradient.addColorStop(1, theme.tertiary);
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    // Visualize audio with wave
    function visualizeWave(dataArray, bufferLength) {
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const theme = colorThemes[currentColorTheme];
        canvasCtx.strokeStyle = theme.primary;
        canvasCtx.lineWidth = 3;
        canvasCtx.beginPath();
        
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (canvas.height / 2);
            
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
    
    // Visualize audio with circle
    function visualizeCircle(dataArray, bufferLength) {
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const theme = colorThemes[currentColorTheme];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 50;
        
        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        canvasCtx.strokeStyle = theme.secondary;
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
        
        for (let i = 0; i < bufferLength; i++) {
            const amplitude = dataArray[i] * 0.7;
            const angle = (i * 2 * Math.PI) / bufferLength;
            
            const x = centerX + (radius + amplitude) * Math.cos(angle);
            const y = centerY + (radius + amplitude) * Math.sin(angle);
            
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
            canvasCtx.fillStyle = theme.primary;
            canvasCtx.fill();
            
            if (i > 0 && i % 3 === 0) {
                const prevAngle = ((i - 3) * 2 * Math.PI) / bufferLength;
                const prevX = centerX + (radius + dataArray[i - 3] * 0.7) * Math.cos(prevAngle);
                const prevY = centerY + (radius + dataArray[i - 3] * 0.7) * Math.sin(prevAngle);
                
                canvasCtx.beginPath();
                canvasCtx.moveTo(prevX, prevY);
                canvasCtx.lineTo(x, y);
                canvasCtx.strokeStyle = theme.tertiary;
                canvasCtx.lineWidth = 1;
                canvasCtx.stroke();
            }
        }
    }
    
    // Visualize audio based on selected style
    function visualize() {
        if (!isPlaying) return;
        
        // Set up data array for frequency data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Visualize based on selected style
        switch (currentVisualizationStyle) {
            case 'bars':
                visualizeBars(dataArray, bufferLength);
                break;
            case 'wave':
                visualizeWave(dataArray, bufferLength);
                break;
            case 'circle':
                visualizeCircle(dataArray, bufferLength);
                break;
            default:
                visualizeBars(dataArray, bufferLength);
        }
        
        animationId = requestAnimationFrame(visualize);
    }
    
    // Set visualization style
    function setVisualizationStyle(style) {
        currentVisualizationStyle = style;
        
        // Update active button
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.id.includes('Style')) {
                btn.classList.remove('active');
            }
        });
        
        document.getElementById(`${style}StyleBtn`).classList.add('active');
    }
    
    // Set color theme
    function setColorTheme(theme) {
        currentColorTheme = theme;
        
        // Update active button
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.id.includes('Theme')) {
                btn.classList.remove('active');
            }
        });
        
        document.getElementById(`${theme}ThemeBtn`).classList.add('active');
        
        // Update canvas background
        canvas.style.backgroundColor = colorThemes[theme].background;
    }
    
    // Seek to position in track
    function seekToPosition(e) {
        if (!audioElement || !isPlaying) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const seekTime = clickPosition * audioElement.duration;
        
        audioElement.currentTime = seekTime;
    }
    
    // Event listeners
    track1Card.addEventListener('click', () => playTrack('track1'));
    track2Card.addEventListener('click', () => playTrack('track2'));
    stopBtn.addEventListener('click', stopPlayback);
    
    // Volume control
    volumeSlider.addEventListener('input', () => {
        if (audioElement) {
            audioElement.volume = volumeSlider.value;
        }
    });
    
    // Progress bar seeking
    progressContainer.addEventListener('click', seekToPosition);
    
    // Visualization style buttons
    barStyleBtn.addEventListener('click', () => setVisualizationStyle('bars'));
    waveStyleBtn.addEventListener('click', () => setVisualizationStyle('wave'));
    circleStyleBtn.addEventListener('click', () => setVisualizationStyle('circle'));
    
    // Color theme buttons
    defaultThemeBtn.addEventListener('click', () => setColorTheme('default'));
    neonThemeBtn.addEventListener('click', () => setColorTheme('neon'));
    retroThemeBtn.addEventListener('click', () => setColorTheme('retro'));
    
    // Genre tags interaction
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            alert(`Exploring ${tag.textContent} music will be available in the next update!`);
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', setupCanvas);
    
    // Add active class to track card on hover
    document.querySelectorAll('.track-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.querySelector('.play-overlay').style.opacity = '1';
        });
        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('active')) {
                card.querySelector('.play-overlay').style.opacity = '0';
            }
        });
    });
    
    // Initial setup
    setupCanvas();
    setColorTheme('default');

    const carousel = document.querySelector('.carousel');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentIndex = 0;

    function updateCarousel() {
        carouselItems.forEach((item, index) => {
            const offset = (index - currentIndex) * 100; // Use percentage for smooth transition
            item.style.transform = `translateX(${offset}%)`;
        });
    }

    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : carouselItems.length - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex < carouselItems.length - 1) ? currentIndex + 1 : 0;
        updateCarousel();
    });

    updateCarousel(); // Initialize carousel position
}); 
const chartContainer = document.getElementById('chart-container');
const randomizeBtn = document.getElementById('randomize-btn');
const sortBtn = document.getElementById('sort-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const sizeInput = document.getElementById('array-size');
const sizeValue = document.getElementById('size-value');
const speedInput = document.getElementById('speed');
const customArrayInput = document.getElementById('custom-array');
const statusDisplay = document.getElementById('status-display');
const phaseBadge = document.getElementById('phase-badge');

let data = [];
let arraySize = parseInt(sizeInput.value);
let speed = parseInt(speedInput.value);
let isSorting = false;
let isStopped = false;
let soundEnabled = true;

// Web Audio API Setup
let audioCtx = null;

function playNote(freq) {
    if (!soundEnabled) return;
    
    // Initialize audio context on first interaction (Browser policy requirement)
    if (audioCtx == null) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle'; // 'sine', 'square', 'sawtooth', 'triangle'
    osc.frequency.value = freq;
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    // Fade out to avoid clipping clicks
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.1);
}

function randomize() {
    if (isSorting) return;
    data = Array.from({ length: arraySize }, () => Math.floor(Math.random() * 100) + 5); // Avoid too small bars
    customArrayInput.value = '';
    render();
    statusDisplay.innerText = 'Array randomized. Ready to sort.';
    setPhase('Ready', 'phase-neutral');
}

function render() {
    chartContainer.innerHTML = '';
    const maxVal = Math.max(...data);
    
    data.forEach(value => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(value / maxVal) * 100}%`;
        
        // Show labels only if array size is reasonable
        if (arraySize <= 40) {
            const span = document.createElement('span');
            span.innerText = value;
            bar.appendChild(span);
        }
        
        chartContainer.appendChild(bar);
    });
}

function setPhase(text, className) {
    phaseBadge.innerText = text;
    phaseBadge.className = `badge ${className}`;
}

async function wait() {
    // Math logic to invert speed input (1-100) to milliseconds (500ms to ~5ms)
    const delay = 500 - (speed * 4.9);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function oddEvenSort() {
    if (isSorting) return;
    isSorting = true;
    isStopped = false;
    
    // Toggle UI States
    randomizeBtn.disabled = true;
    sortBtn.disabled = true;
    sizeInput.disabled = true;
    customArrayInput.disabled = true;
    resetBtn.disabled = false;

    const bars = document.querySelectorAll('.bar');
    let n = data.length;
    let sorted = false;

    while (!sorted && !isStopped) {
        sorted = true;

        // --- ODD PHASE ---
        setPhase('Odd Phase', 'phase-odd');
        statusDisplay.innerText = 'Comparing odd indexed pairs...';
        for (let i = 1; i <= n - 2; i += 2) {
            if (isStopped) break;
            
            await visualizeStep(i, i + 1);
            if (data[i] > data[i+1]) {
                await swap(i, i + 1);
                sorted = false;
            }
        }

        if (isStopped) break;

        // --- EVEN PHASE ---
        setPhase('Even Phase', 'phase-even');
        statusDisplay.innerText = 'Comparing even indexed pairs...';
        for (let i = 0; i <= n - 2; i += 2) {
            if (isStopped) break;

            await visualizeStep(i, i + 1);
            if (data[i] > data[i+1]) {
                await swap(i, i + 1);
                sorted = false;
            }
        }
    }

    if (!isStopped) {
        setPhase('Completed', 'phase-neutral');
        statusDisplay.innerText = 'Array is successfully sorted!';
        bars.forEach(bar => {
            bar.classList.remove('comparing', 'swapping');
            bar.classList.add('sorted');
        });
        playNote(800); // Success beep
    } else {
        setPhase('Stopped', 'phase-neutral');
        statusDisplay.innerText = 'Sorting was interrupted.';
    }

    // Reset UI States
    isSorting = false;
    randomizeBtn.disabled = false;
    sortBtn.disabled = false;
    sizeInput.disabled = false;
    customArrayInput.disabled = false;
    resetBtn.disabled = true;
}

// Calculate frequency based on value (Mapping values to 200Hz - 800Hz)
function getFreq(val) {
    const maxVal = Math.max(...data);
    return 200 + ((val / maxVal) * 600);
}

async function visualizeStep(i, j) {
    const bars = document.querySelectorAll('.bar');
    bars[i].classList.add('comparing');
    bars[j].classList.add('comparing');
    
    playNote(getFreq(data[i])); // Play sound for first element
    
    await wait();
    
    bars[i].classList.remove('comparing');
    bars[j].classList.remove('comparing');
}

async function swap(i, j) {
    const bars = document.querySelectorAll('.bar');
    bars[i].classList.add('swapping');
    bars[j].classList.add('swapping');
    
    playNote(getFreq(data[j])); // Play a different pitch for the swap
    
    await wait();

    // Data swap
    let temp = data[i];
    data[i] = data[j];
    data[j] = temp;

    // Visual swap (height & text)
    const maxVal = Math.max(...data);
    bars[i].style.height = `${(data[i] / maxVal) * 100}%`;
    bars[j].style.height = `${(data[j] / maxVal) * 100}%`;
    
    if (arraySize <= 40) {
        bars[i].querySelector('span').innerText = data[i];
        bars[j].querySelector('span').innerText = data[j];
    }

    await wait();
    bars[i].classList.remove('swapping');
    bars[j].classList.remove('swapping');
}

// Event Listeners
randomizeBtn.addEventListener('click', randomize);
sortBtn.addEventListener('click', oddEvenSort);

resetBtn.addEventListener('click', () => {
    isStopped = true;
});

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.innerText = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
});

sizeInput.addEventListener('input', () => {
    arraySize = parseInt(sizeInput.value);
    sizeValue.innerText = arraySize;
    randomize();
});

speedInput.addEventListener('input', () => {
    speed = parseInt(speedInput.value);
});

customArrayInput.addEventListener('change', () => {
    if (isSorting) return;
    const inputVal = customArrayInput.value;
    if (inputVal.trim() === '') return;

    const potentialData = inputVal.split(',').map(Number).filter(n => !isNaN(n));
    if (potentialData.length < 2) {
        statusDisplay.innerText = 'Error: Enter at least 2 valid numbers.';
        return;
    }

    data = potentialData;
    arraySize = data.length;
    sizeInput.value = arraySize;
    sizeValue.innerText = arraySize;
    render();
    statusDisplay.innerText = `Custom array loaded.`;
});

// Init
randomize();

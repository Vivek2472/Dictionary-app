const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const resultsDiv = document.getElementById('results');
const welcomeMsg = document.getElementById('welcome-msg');
const themeToggle = document.getElementById('themeToggle');

// 1) Handle Initial Loader (Fade out on load)
window.addEventListener('load', () => {
    const loader = document.getElementById('initialLoader');
    if (loader) {
        // Fade out
        loader.style.opacity = '0';
        // Remove from display after transition allows it to fade
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
});

// 2) Initialize & Theme
document.addEventListener('DOMContentLoaded', () => {
    searchInput.focus(); // Auto focus on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    }
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// 3) Input Handling (Clear Button & Typing)
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    clearBtn.classList.add('hidden');
    resultsDiv.innerHTML = '';
    welcomeMsg.style.display = 'block';
});

// 4) Skeleton Loader (Shimmer effect for search)
function showSkeleton() {
    welcomeMsg.style.display = 'none';
    resultsDiv.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
        </div>
    `;
}

// 5) Fetch Logic
async function fetchDefinitions(word) {
    showSkeleton();
    try {
        const response = await fetch(`${API_BASE}${word}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error(`We couldn't find definitions for <b>"${word}"</b>.`);
            throw new Error('Network error. Please try again.');
        }
        const data = await response.json();
        renderDefinitions(data);
    } catch (err) {
        resultsDiv.innerHTML = `<div class="error">${err.message}</div>`;
    }
}

// 6) Render Results
let partOfSpeechVisibility = {};

function renderDefinitions(entries) {
    resultsDiv.innerHTML = '';
    const definitionsByPartOfSpeech = {};

    entries.forEach(entry => {
        // Find first valid audio
        const audioSrc = entry.phonetics.find(p => p.audio && p.audio !== '')?.audio;
        
        // Find phonetic text (sometimes it's in a different spot)
        const phoneticText = entry.phonetic || entry.phonetics.find(p => p.text)?.text || '';

        entry.meanings.forEach(meaning => {
            const pos = meaning.partOfSpeech;
            if (!definitionsByPartOfSpeech[pos]) definitionsByPartOfSpeech[pos] = [];
            
            meaning.definitions.forEach(def => {
                definitionsByPartOfSpeech[pos].push({
                    word: entry.word,
                    partOfSpeech: pos,
                    definition: def.definition,
                    example: def.example,
                    synonyms: def.synonyms,
                    audio: audioSrc,
                    phonetic: phoneticText
                });
            });
        });
    });

    // Render each Part of Speech group
    for (const pos in definitionsByPartOfSpeech) {
        const allDefs = definitionsByPartOfSpeech[pos];
        const initialCount = 3;
        const isExpanded = partOfSpeechVisibility[pos] === true;
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'part-of-speech-group';
        
        const header = document.createElement('div');
        header.className = 'part-of-speech-title';
        header.textContent = pos;
        groupDiv.appendChild(header);

        const definitionsToShow = isExpanded ? allDefs : allDefs.slice(0, initialCount);
        
        definitionsToShow.forEach(item => {
            const card = document.createElement('div');
            card.className = 'word-card';

            const audioButtonHtml = item.audio 
                ? `<button class="audio-btn" data-src="${item.audio}" title="Play Audio">
                     <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                   </button>` 
                : '';

            card.innerHTML = `
                <div class="word-title">
                    ${item.word}
                    ${item.phonetic ? `<span class="word-phonetic">${item.phonetic}</span>` : ''}
                    ${audioButtonHtml}
                </div>
                <div class="word-def">${item.definition}</div>
                ${item.example ? `<div class="word-example">"${item.example}"</div>` : ''}
                ${item.synonyms?.length ? `<div class="word-syn"><span>Synonyms:</span> ${item.synonyms.join(', ')}</div>` : ''}
            `;
            groupDiv.appendChild(card);
        });

        // Show More Button
        if (allDefs.length > initialCount) {
            const btn = document.createElement('button');
            btn.className = 'show-more-btn';
            btn.textContent = isExpanded ? `Show Less (${allDefs.length})` : `Show ${allDefs.length - initialCount} More`;
            
            btn.addEventListener('click', () => {
                partOfSpeechVisibility[pos] = !partOfSpeechVisibility[pos];
                renderDefinitions(entries); 
            });
            groupDiv.appendChild(btn);
        }

        resultsDiv.appendChild(groupDiv);
    }
}

// 7) Global Audio Click Listener
resultsDiv.addEventListener('click', (e) => {
    const btn = e.target.closest('.audio-btn');
    if (btn && btn.dataset.src) {
        new Audio(btn.dataset.src).play().catch(console.error);
    }
});

// 8) Search Execution
function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
        partOfSpeechVisibility = {}; 
        fetchDefinitions(query);
    }
}

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
});

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
});    }
});


// 3) Reveal IP address
revealIpBtn.addEventListener('click', async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ipDisplay.textContent = `Your IP: ${data.ip}`;
    } catch {
        ipDisplay.textContent = 'Unable to retrieve IP.';
    }
});

// 4) Toggle search history display
showHistoryBtn.addEventListener('click', () => {
    if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        historySection.innerHTML = '<strong>Search History:</strong><br>' +
            (searchHistory.length ? searchHistory.join(', ') : 'No history available.');
    } else {
        historySection.style.display = 'none';
    }
});

// 5) Loader in results area
function showLoader() {
    resultsDiv.innerHTML = `
    <div class="loader">
      <div></div><div></div><div></div>
    </div>
  `;
}
function hideLoader() {
    resultsDiv.innerHTML = '';
}

// 6) Fetch definitions from the API
async function fetchDefinitions(word) {
    showLoader(); // Show loader while fetching
    try {
        const response = await fetch(`${API_BASE}${word}`);
        if (!response.ok) {
            // Provide a specific message for "Word not found" (404 status)
            if (response.status === 404) {
                throw new Error(`No definitions found for "${word}". Please check your spelling.`);
            }
            throw new Error('An error occurred while fetching the definition.');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw error; // Re-throw the error to be caught by the search input handler
    }
}

// 7) Render definitions, grouping by part of speech and implementing show more/less
function renderDefinitions(entries) {
    hideLoader(); // Hide loader after data is fetched
    resultsDiv.innerHTML = ''; // Clear any previous results

    // Organize definitions by their part of speech
    const definitionsByPartOfSpeech = {};
    entries.forEach(entry => {
        entry.meanings.forEach(meaning => {
            const pos = meaning.partOfSpeech;
            if (!definitionsByPartOfSpeech[pos]) {
                definitionsByPartOfSpeech[pos] = [];
            }
            meaning.definitions.forEach(def => {
                definitionsByPartOfSpeech[pos].push({
                    word: entry.word,
                    partOfSpeech: pos,
                    definition: def.definition,
                    example: def.example,
                    synonyms: def.synonyms
                });
            });
        });
    });

    // Iterate through each part of speech and render its definitions
    for (const pos in definitionsByPartOfSpeech) {
        const allDefs = definitionsByPartOfSpeech[pos];
        const initialCount = 3; // Max definitions to show initially for any part of speech
        const isExpanded = partOfSpeechVisibility[pos] === true; // Check current expansion state

        const groupDiv = document.createElement('div');
        groupDiv.className = 'part-of-speech-group';

        const posTitle = document.createElement('h3');
        posTitle.className = 'part-of-speech-title';
        posTitle.textContent = pos;

        // Apply highlight class to specific part of speech titles
        const highlightedPOS = ['noun', 'adjective', 'verb'];
        if (highlightedPOS.includes(pos.toLowerCase())) {
            posTitle.classList.add('highlighted');
        }
        groupDiv.appendChild(posTitle); // Add the title to the group

        // Determine which definitions to show (initial 3 or all)
        const definitionsToShow = isExpanded ? allDefs : allDefs.slice(0, initialCount);

        definitionsToShow.forEach(item => {
            const card = document.createElement('div');
            card.className = 'word-card';
            card.innerHTML = `
                <div class="word-title">
                    ${item.word} <span style="font-weight:400; font-size:0.9rem;">
                        (${item.partOfSpeech})
                    </span>
                </div>
                <div class="word-def">${item.definition}</div>
                ${item.example ? `<div class="word-example">Example: ${item.example}</div>` : ''}
                ${item.synonyms?.length ? `<div class="word-syn">Synonyms: ${item.synonyms.join(', ')}</div>` : ''}
            `;
            groupDiv.appendChild(card);
        });

        // Add a "Show More" or "Show Less" button if there are more definitions than initially shown
        if (allDefs.length > initialCount) {
            const button = document.createElement('button');
            button.className = 'show-more-btn';
            button.textContent = isExpanded ? 'Show Less' : 'Show More';
            // Store the part of speech on the button for easy access in the event listener
            button.dataset.partOfSpeech = pos;
            button.addEventListener('click', (event) => {
                const clickedPos = event.target.dataset.partOfSpeech;
                // Toggle the expansion state for the clicked part of speech
                partOfSpeechVisibility[clickedPos] = !partOfSpeechVisibility[clickedPos];
                renderDefinitions(entries); // Re-render the results to apply the new state
            });
            groupDiv.appendChild(button);
        }

        resultsDiv.appendChild(groupDiv); // Add the complete part of speech group to the results area
    }
}

// 8) Search input with debounce to prevent excessive API calls
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim().toLowerCase(); // Get trimmed, lowercase query
    clearTimeout(debounceTimeout); // Clear any previous debounce timeout

    // Clear results and reset visibility states if the search query is empty
    if (!query) {
        resultsDiv.innerHTML = '';
        for (const key in partOfSpeechVisibility) {
            delete partOfSpeechVisibility[key];
        }
        return;
    }

    // Set a timeout before fetching to wait for user to finish typing
    debounceTimeout = setTimeout(async () => {
        try {
            const entries = await fetchDefinitions(query);
            renderDefinitions(entries);
            // Add the successful search query to history if it's not already there
            if (!searchHistory.includes(query)) {
                searchHistory.push(query);
            }
        } catch (err) {
            hideLoader(); // Hide loader on error
            resultsDiv.innerHTML = `<p class="error">${err.message}</p>`; // Display error message
            // Clear visibility states on error as results are cleared
            for (const key in partOfSpeechVisibility) {
                delete partOfSpeechVisibility[key];
            }
        }
    }, 500); // 500ms debounce delay
});

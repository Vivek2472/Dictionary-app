// 1) Initial loader fade-out
window.addEventListener('load', () => {
    const loader = document.getElementById('initialLoader');
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 500);
});

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const searchInput = document.getElementById('search');
const resultsDiv = document.getElementById('results');
const themeToggle = document.getElementById('themeToggle');
const ipDisplay = document.getElementById('ipDisplay');
const revealIpBtn = document.getElementById('reveal-ip');
const historySection = document.getElementById('historySection');
const showHistoryBtn = document.getElementById('show-history');
let debounceTimeout;
let searchHistory = [];
// This object tracks the visibility state (expanded/collapsed) for each part of speech
const partOfSpeechVisibility = {};

// 2) Theme toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    // Store user's theme preference in local storage
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Apply saved theme on page load for persistence
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
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

// ==========================================
// 1. GAME VARIABLES & STATE
// ==========================================
let rawChampionsData = [];
let champions = [];
let targetChampion = null;
let latestVersion = "14.10.1";
let guessedChampions = [];
let currentLang = 'en';
let currentFocus = -1;

const guessInput = document.getElementById('guessInput');

// ==========================================
// 2. INITIALIZATION
// ==========================================
window.onload = initializeData;

async function initializeData() {
    try {
        // Fetch the latest version from Riot's API
        const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await versionRes.json();
        latestVersion = versions[0];

        // Fetch local champion database
        const championsRes = await fetch('champions.json');
        rawChampionsData = await championsRes.json();
    } catch (error) {
        console.warn("Error fetching data:", error);
    }

    // Process champion properties
    champions = rawChampionsData.map(c => ({
        name: c.name,
        gender: c.gender,
        lane: c.lane.split(', '),   
        genre: c.genre.split(', '), 
        resource: c.resource,
        attackType: c.attackType,
        region: c.region.split(', '),
        releaseDate: c.releaseDate,
        imageFull: c.imageFull      
    }));

    // Enable UI elements
    document.getElementById('resultsTable').style.display = 'table';
    guessInput.disabled = false;
    document.getElementById('guessBtn').disabled = false;
    document.getElementById('newGameBtn').disabled = false;

    startNewGame();
}

// ==========================================
// 3. GAME LOGIC
// ==========================================
function startNewGame() {
    if (champions.length === 0) return;

    // Pick a random target champion
    const randomIndex = Math.floor(Math.random() * champions.length);
    targetChampion = champions[randomIndex];
    //console.log("Secret Champion:", targetChampion.name); // Debug mode

    // Reset UI and state
    document.getElementById('resultsBody').innerHTML = '';
    guessInput.value = '';
    guessedChampions = [];
    
    document.getElementById('victoryMessage').style.display = 'none';
    guessInput.disabled = false;
    document.getElementById('guessBtn').disabled = false;
}

// Check if array elements overlap (e.g., Roles, Regions)
function checkArrayMatch(guessArr, targetArr) {
    if (!guessArr || !targetArr) return 'incorrect';
    
    const isExactMatch = guessArr.length === targetArr.length && guessArr.every(val => targetArr.includes(val));
    if (isExactMatch) return 'correct';

    const isPartialMatch = guessArr.some(val => targetArr.includes(val));
    if (isPartialMatch) return 'partial';

    return 'incorrect';
}

// Helper to create table cells
function createCell(text, className, originalData = null) {
    const td = document.createElement('td');
    td.textContent = text || "-";
    td.className = className;
    
    // If there is original data, hide it in the HTML and add a tracking class
    if (originalData) {
        td.setAttribute('data-original', originalData);
        td.classList.add('translatable-cell');
    }
    return td;
}

// Handle guess submission
function makeGuess() {
    const guessName = guessInput.value;
    const guessObj = champions.find(c => c.name.toLowerCase() === guessName.toLowerCase());

    // Stop if champion doesn't exist or was already guessed
    if (!guessObj || guessedChampions.includes(guessObj.name)) return;

    guessedChampions.push(guessObj.name);
    const tbody = document.getElementById('resultsBody');
    const tr = document.createElement('tr');

    // 1. CHAMPION (Image Cell)
    const imgCell = document.createElement('td');
    imgCell.className = guessObj.name === targetChampion.name ? 'correct champ-cell' : 'incorrect champ-cell';
    const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${guessObj.imageFull}`;
    imgCell.innerHTML = `<img src="${imgUrl}" class="champ-icon" alt="${guessObj.name}" title="${guessObj.name}">`;
    tr.appendChild(imgCell);

    // 2. GENDER 
    tr.appendChild(createCell(translateTerm(guessObj.gender), guessObj.gender === targetChampion.gender ? 'correct' : 'incorrect', guessObj.gender));
    
    // 3. POSITION (Array joined into a string so it can be saved)
    tr.appendChild(createCell(translateArray(guessObj.lane), checkArrayMatch(guessObj.lane, targetChampion.lane), guessObj.lane.join(', ')));
    
    // 4. CLASS (Array joined into a string so it can be saved)
    tr.appendChild(createCell(translateArray(guessObj.genre), checkArrayMatch(guessObj.genre, targetChampion.genre), guessObj.genre.join(', ')));
    
    // 5. RESOURCE 
    tr.appendChild(createCell(translateTerm(guessObj.resource), guessObj.resource === targetChampion.resource ? 'correct' : 'incorrect', guessObj.resource));
    
    // 6. RANGE 
    tr.appendChild(createCell(translateTerm(guessObj.attackType), guessObj.attackType === targetChampion.attackType ? 'correct' : 'incorrect', guessObj.attackType));
    
    // 7. REGION 
    tr.appendChild(createCell(guessObj.region.join(", "), checkArrayMatch(guessObj.region, targetChampion.region)));
    
    // 8. RELEASE YEAR (With arrows)
    let yearClass = 'incorrect';
    if (guessObj.releaseDate === targetChampion.releaseDate) {
        yearClass = 'correct';
    } else if (guessObj.releaseDate < targetChampion.releaseDate) {
        yearClass += ' arrow-up';
    } else {
        yearClass += ' arrow-down';
    }
    tr.appendChild(createCell(guessObj.releaseDate, yearClass));

    // Add row to the top of the table
    tbody.insertBefore(tr, tbody.firstChild);
    guessInput.value = '';

    // Victory condition
    if (guessObj.name === targetChampion.name) {
        document.getElementById('victoryMessage').style.display = 'block';
        guessInput.disabled = true;
        document.getElementById('guessBtn').disabled = true;
    }
}

// ==========================================
// 4. AUTOCOMPLETE SYSTEM
// ==========================================
guessInput.addEventListener("input", function () {
    let val = this.value;
    closeAllLists();
    if (!val) return false;
    
    currentFocus = -1;
    let listContainer = document.createElement("DIV");
    listContainer.setAttribute("id", this.id + "autocomplete-list");
    listContainer.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(listContainer);

    // Find matches (start-with logic first, then contains)
    let matches = champions.filter(c => c.name.toLowerCase().includes(val.toLowerCase()) && !guessedChampions.includes(c.name));
    
    matches.sort((x, y) => {
        let xStarts = x.name.toLowerCase().startsWith(val.toLowerCase()) ? -1 : 1;
        let yStarts = y.name.toLowerCase().startsWith(val.toLowerCase()) ? -1 : 1;
        return xStarts - yStarts;
    });

    matches.forEach(match => {
        let itemDiv = document.createElement("DIV");
        const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${match.imageFull}`;
        
        itemDiv.innerHTML = `<img src="${imgUrl}" alt="${match.name}"><span>${match.name}</span>`;
        itemDiv.innerHTML += `<input type='hidden' value="${match.name}">`;

        // Click to auto-guess
        itemDiv.addEventListener("click", function () {
            guessInput.value = this.getElementsByTagName("input")[0].value;
            closeAllLists();
            makeGuess();
        });
        listContainer.appendChild(itemDiv);
    });

    // Auto-highlight first item
    if (matches.length > 0) {
        currentFocus = 0;
        addActive(listContainer.getElementsByTagName("div"));
    }
});

// Keyboard navigation
guessInput.addEventListener("keydown", function (e) {
    let list = document.getElementById(this.id + "autocomplete-list");
    if (list) list = list.getElementsByTagName("div");

    if (e.key === "ArrowDown") {
        currentFocus++;
        addActive(list);
    } else if (e.key === "ArrowUp") {
        currentFocus--;
        addActive(list);
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentFocus > -1 && list) {
            list[currentFocus].click();
        } else if (guessInput.value) {
            makeGuess();
        }
    }
});

function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add("autocomplete-active");
    items[currentFocus].scrollIntoView({ block: "nearest" });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("autocomplete-active");
    }
}

function closeAllLists(elmnt) {
    let items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
        if (elmnt != items[i] && elmnt != guessInput) {
            items[i].parentNode.removeChild(items[i]);
        }
    }
}

document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});

// ==========================================
// 5. TRANSLATION & DICTIONARY SYSTEM
// ==========================================
const translations = {
    en: {
        placeholder: "Type the champion's name...",
        btnGuess: "Guess",
        btnNew: "New Game",
        victory: "You Did It!",
        thChamp: "Champion",
        thGender: "Gender",
        thPos: "Position",
        thClass: "Class",
        thRes: "Resource",
        thRange: "Range",
        thReg: "Region",
        thYear: "Release Year",
        guideTitle: "How to play?",
        guideDesc: "Type a champion's name, select it from the list, and press Guess. Use the colors to see how close you are to the secret champion!",
        legExact: "<strong>Exact:</strong> Perfect match.",
        legPartial: "<strong>Partial:</strong> The champion shares at least one attribute.",
        legWrong: "<strong>Incorrect:</strong> No match.",
        legArrows: "<strong>Arrows:</strong> The champion's release year is higher (up) or lower (down)."
    },
    it: {
        placeholder: "Digita il nome del campione...",
        btnGuess: "Indovina",
        btnNew: "Nuova Partita",
        victory: "Ce l'hai fatta!",
        thChamp: "Campione",
        thGender: "Genere",
        thPos: "Posizione",
        thClass: "Ruolo",
        thRes: "Risorsa",
        thRange: "Raggio",
        thReg: "Regione",
        thYear: "Anno di Uscita",
        guideTitle: "Come si gioca?",
        guideDesc: "Digita il nome di un campione, selezionalo e premi Indovina. Usa i colori per capire quanto sei vicino al campione segreto!",
        legExact: "<strong>Esatto:</strong> Corrispondenza perfetta.",
        legPartial: "<strong>Parziale:</strong> Il campione condivide almeno un attributo.",
        legWrong: "<strong>Sbagliato:</strong> Nessuna corrispondenza.",
        legArrows: "<strong>Frecce:</strong> L'anno di uscita del campione è più alto (su) o basso (giù)."
    }
};

const termsDictionary = {
    "Top": "Superiore",
    "Jungle": "Giungla",
    "Mid": "Centrale",
    "Bot": "Inferiore",
    "Support": "Supporto",
    "Fighter": "Combattente",
    "Mage": "Mago",
    "Assassin": "Assassino",
    "Marksman": "Tiratore",
    "Tank": "Tank",
    "Juggernaut": "Colosso",
    "Diver": "Assaltatore",
    "Skirmisher": "Schermagliatore",
    "Ambusher": "Incursore",
    "Duelist": "Duellante",
    "Berserker": "Berserker",
    "Melee": "Mischia",
    "Ranged": "Distanza",
    "Mana": "Mana",
    "Energy": "Energia",
    "Manaless": "Senza Mana",
    "Health": "Salute",
    "Rage": "Rabbia",
    "Courage": "Coraggio",
    "Shield": "Scudo",
    "Fury": "Furia",
    "Heat": "Calore",
    "Bloodthirst": "Sete di Sangue",
    "Flow": "Flusso",
    "Ferocity": "Ferocia",
    "Grit": "Grinta",
    "Male": "Maschio",
    "Female": "Femmina",
    "Other": "Altro"
};

// Translates a single word
function translateTerm(word) {
    if (currentLang === 'it' && termsDictionary[word]) {
        return termsDictionary[word];
    }
    return word;
}

// Translates an array of words
function translateArray(arr) {
    return arr.map(word => translateTerm(word)).join(", ");
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('loldle_lang', lang);
    const t = translations[lang];

    // Updates UI elements
    guessInput.placeholder = t.placeholder;
    document.getElementById('guessBtn').textContent = t.btnGuess;
    document.getElementById('newGameBtn').textContent = t.btnNew;
    document.getElementById('t-victory').textContent = t.victory;

    // Updates table headers
    document.getElementById('th-champ').textContent = t.thChamp;
    document.getElementById('th-gender').textContent = t.thGender;
    document.getElementById('th-pos').textContent = t.thPos;
    document.getElementById('th-class').textContent = t.thClass;
    document.getElementById('th-res').textContent = t.thRes;
    document.getElementById('th-range').textContent = t.thRange;
    document.getElementById('th-reg').textContent = t.thReg;
    document.getElementById('th-year').textContent = t.thYear;

    // Updates guide and legend
    document.getElementById('t-guide-title').textContent = t.guideTitle;
    document.getElementById('t-guide-desc').textContent = t.guideDesc;
    document.getElementById('t-leg-exact').innerHTML = t.legExact;
    document.getElementById('t-leg-partial').innerHTML = t.legPartial;
    document.getElementById('t-leg-wrong').innerHTML = t.legWrong;
    document.getElementById('t-leg-arrows').innerHTML = t.legArrows;

    // Find all cells of already guessed champions that have the tracking class
    const translatableCells = document.querySelectorAll('.translatable-cell');
    
    translatableCells.forEach(cell => {
        // Retrieve the hidden original English word
        const originalText = cell.getAttribute('data-original');
        
        // If there's a comma, it means it was an Array (e.g., "Top, Mid")
        if (originalText.includes(', ')) {
            const arr = originalText.split(', ');
            cell.textContent = translateArray(arr); // Translate it back as an Array
        } else {
            // Otherwise it was a single word (e.g., "Mana")
            cell.textContent = translateTerm(originalText);
        }
    });
}

// Load saved language preference on startup
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('loldle_lang') || 'en';
    setLanguage(savedLang);
});

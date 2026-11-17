// Najdeme a uložíme si odkazy na tlačítka a prvky z naší HTML stránky
const btnStart = document.getElementById('btnStart');       // Tlačítko Nahrávat
const btnStop = document.getElementById('btnStop');         // Tlačítko Zastavit
const statusText = document.getElementById('status');       // Text o aktuálním stavu
const seznamDiv = document.getElementById('seznamNahravek'); // Nástěnka pro všechny nahrané karty
const rezimSelect = document.getElementById('rezimSelect');

const apiKeyInput = document.getElementById('apiKeyInput');   // Políčko pro API klíč
const keyStatus = document.getElementById('keyStatus');       // Štítek vedle políčka

// Funkce (pomocný scénář), která zkontroluje, zda máme klíč uložený, a aktualizuje štítek
function aktualizujStavKlice() {
    const ulozenyKlic = localStorage.getItem('gemini_api_key');
    if (ulozenyKlic) {
        keyStatus.textContent = "Klíč je uložený ✅";
    } else {
        keyStatus.textContent = "Chybí klíč ❌";
    }
}

// Hned po načtení stránky štítek zkontrolujeme
aktualizujStavKlice();

// Pokaždé, když do políčka něco napíšeš nebo vložíš, klíč se uloží a štítek se aktualizuje
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    aktualizujStavKlice();
});

// Pokud už prohlížeč klíč z minula zná, automaticky ho do políčka doplní
apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';

// Pokaždé, když do políčka něco napíšeš nebo vložíš, prohlížeč si klíč uloží do šuplíku
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
});

// Připravíme si proměnné pro samotný záznamník zvuku a pro ukládání nahraných dat
let mediaRecorder;     // Zde bude uložený náš "magnetofon"
let audioChunks = [];  // Sem se budou postupně ukládat jednotlivé kousky zvuku (naše "kazeta")
let seznamNahravek = []; // Náš "šanon" (seznam), kam se budou ukládat všechny pořízené nahrávky

// Optimalizovaný seznam modelů – nejrychlejší a ověřené modely jsou na začátku
const dostupneModely = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemini-omni-1.2-flash',
    'gemini-omni-1.1-flash',
    'gemini-omni-flash-preview',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-pro-latest',
    'gemini-2.5-pro',
    'gemini-3.5-transcribe',
    'gemma-4-31b-it',
    'gemma-4-26b-a4b-it'
];

// Funkce, která uloží textové poznámky i údaje pro kalendář ze všech karet do paměti prohlížeče (localStorage)
function ulozPoznamkyDoPameti() {
    // Z každé karty vybereme všechny textové a strukturované údaje (vynecháme jen velký zvuk)
    const cisteTexty = seznamNahravek.map((karta) => ({
        id: karta.id,
        cas: karta.cas,
        stav: karta.stav,
        zapis: karta.zapis,
        rezim: karta.rezim || "ostatni",
        kategorie: karta.kategorie || "Osobní",
        nadpis: karta.nadpis || "Hlasová poznámka",
        kalendar: karta.kalendar || null
    }));
    // Převedeme seznam na textový řetězec (JSON) a uložíme do paměti prohlížeče
    localStorage.setItem('moje_ai_poznamky', JSON.stringify(cisteTexty));
}

// Funkce, která při otevření stránky vytáhne uložené poznámky z paměti prohlížeče a vykreslí je
function nactiPoznamkyZPameti() {
    const ulozenaData = localStorage.getItem('moje_ai_poznamky');
    if (ulozenaData) {
        // Převedeme textový řetězec zpět na náš šanon (pole objektů) a rovnou ho vykreslíme
        seznamNahravek = JSON.parse(ulozenaData);
        vykresliSeznamNahravek();
    }
}

// Hned po načtení stránky zavoláme načtení uložených poznámek
nactiPoznamkyZPameti();



// Co se stane, když uživatel klikne na tlačítko "Nahrávat"
btnStart.addEventListener('click', async () => {
    // 1. Požádáme prohlížeč o přístup k mikrofonu (vyskočí okénko "Povolit mikrofon")
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Vytvoříme nový záznamník (magnetofon) a vyprázdníme starou kazetu
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    // 3. Pokaždé, když je kousek zvuku nahraný, uložíme ho na naši kazetu
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    // 4. Spustíme samotné nahrávání a upravíme vzhled tlačítek i stavový text
    mediaRecorder.start();
    statusText.textContent = "Nahrávám... Mluv do mikrofonu.";
    btnStart.disabled = true;   // Tlačítko Nahrávat zšedne (už nahráváme)
    btnStop.disabled = false;   // Tlačítko Zastavit se aktivuje
});

// Co se stane, když uživatel klikne na tlačítko "Zastavit"
btnStop.addEventListener('click', () => {
    // 1. Zastavíme náš záznamník (magnetofon)
    mediaRecorder.stop();

    // 2. Připravíme si pokyn, co se má stát v okamžiku, kdy se nahrávání definitivně ukončí
    mediaRecorder.onstop = () => {
        // Slepíme všechny nahrané kousky zvuku z kazety do jednoho celku
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Vytvoříme nový "kartotéční lístek" (objekt) pro tuto konkrétní nahrávku
        const novaKarta = {
            id: Date.now(),                                  // Jedinečné číslo podle přesného času
            cas: new Date().toLocaleTimeString('cs-CZ'),     // Aktuální čas pořízení (např. 20:55:10)
            audioBlob: audioBlob,                            // Samotná zvuková data (pro odeslání AI)
            audioUrl: audioUrl,                              // Adresa pro vestavěný přehrávač
            rezim: rezimSelect.value,                        // Štítek zvoleného režimu (např. "specifikace", "ostatni")
            stav: "Čeká na odeslání...",                     // Stav zpracování této karty
            zapis: ""                                        // Sem se později uloží hotový text od AI
        };

        // Vložíme novou kartu na začátek našeho šanonu (příkaz unshift ji dá úplně nahoru)
        seznamNahravek.unshift(novaKarta);

        // Upravíme hlavní stavový text a vrátíme tlačítka do původního stavu
        statusText.textContent = "Nahrávka uložena do seznamu! Připraveno na další.";
        btnStart.disabled = false;
        btnStop.disabled = true;

        // Vykreslíme aktualizovaný seznam karet na stránku a rovnou kartu pošleme AI
        vykresliSeznamNahravek();
        vytvorZapisPomociAI(novaKarta);
    };
});

// Funkce (nástěnkář), která projde náš šanon a vykreslí všechny karty nahrávek na stránku
function vykresliSeznamNahravek() {
    // 1. Nejprve nástěnku vyčistíme, abychom karty nekreslili dvakrát pod sebe
    seznamDiv.innerHTML = "";

    // 2. Pro každou kartu v šanonu vytvoříme na stránce samostatný rámeček
    seznamNahravek.forEach((karta) => {
        const kartaEl = document.createElement('div');
        kartaEl.className = "karta";

        // Přehrávač a tlačítko "Zkusit znovu" ukážeme jen tehdy, pokud je zvuk ještě v paměti (čerstvá nahrávka)
        const ovladaniZvuku = karta.audioUrl
            ? `<audio src="${karta.audioUrl}" controls></audio>
               <button onclick="znovuOdeslatKartu(${karta.id})">Zkusit odeslat znovu 🔄</button>`
            : `<small style="color: #666;">(Uložený textový zápis z archivu)</small>`;

        // Neprůstřelná kontrola, zda se má ukázat tlačítko pro kalendář
        const maSeZapsat = karta.kalendar && (
            karta.kalendar.ma_se_zapsat === true ||
            karta.kalendar.ma_se_zapsat === "true" ||
            (karta.zapis && karta.zapis.toLowerCase().includes("kalendář"))
        );

        let tlacitkoKalendar = "";
        if (maSeZapsat) {
            const jePracovni = (karta.kalendar && karta.kalendar.typ_kalendare === "pracovni") || karta.kategorie === "Pracovní";
            const popisek = jePracovni
                ? "💼 Zapsat do Pracovního Outlooku"
                : "📅 Zapsat do Osobního Google Kalendáře";
            tlacitkoKalendar = `<div style="margin-top: 8px;"><button onclick="otevritKalendar(${karta.id})">${popisek}</button></div>`;
        }

        // Pokud už karta obsahuje hotový textový zápis od AI, připravíme tlačítka pro export a sdílení
        let tlacitkaExport = "";
        if (karta.zapis) {
            tlacitkaExport = `
                <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="stahnoutJakoWord(${karta.id})">📄 Word (.doc)</button>
                    <button onclick="zkopirovatZapis(${karta.id})">📋 Kopírovat</button>
                    <button onclick="odeslatPresGmail(${karta.id})">✉️ Gmail</button>
                </div>
            `;
        }

        // Vložíme dovnitř karty čas, stav, ovládání zvuku, případné tlačítko kalendáře, Smazat a hotový AI zápis
        kartaEl.innerHTML = `
            <p>
                <strong>Nahrávka z ${karta.cas}</strong> – Stav: ${karta.stav}
                <button onclick="smazatKartu(${karta.id})" class="btn-smazat">Smazat 🗑️</button>
            </p>
            ${ovladaniZvuku}
            ${tlacitkoKalendar}
            ${tlacitkaExport}
            <div style="margin-top: 10px; white-space: pre-wrap;">${karta.zapis}</div>
        `;

        // Připevníme hotovou kartu na naši nástěnku na stránce
        seznamDiv.appendChild(kartaEl);
    });
}



// Pomocná funkce, která převede nahraný zvuk (Blob) na textový formát Base64 pro odeslání přes internet
function prevedZvukNaBase64(blob) {
    return new Promise((resolve) => {
        const ctecka = new FileReader(); // Vytvoříme si čtečku souborů
        ctecka.onloadend = () => {
            // Odstřihneme úvodní hlavičku a necháme si jen čistý zakódovaný zvuk
            const base64Data = ctecka.result.split(',')[1];
            resolve(base64Data);
        };
        ctecka.readAsDataURL(blob); // Spustíme čtení zvukového souboru
    });
}

// Pomocná funkce pro tlačítko "Zkusit odeslat znovu" na konkrétní kartě
function znovuOdeslatKartu(id) {
    // Najdeme v našem šanonu kartu podle jejího jedinečného čísla (id)
    const nalezenaKarta = seznamNahravek.find((karta) => karta.id === id);
    if (nalezenaKarta) {
        vytvorZapisPomociAI(nalezenaKarta);
    }
}

// Pomocná funkce pro tlačítko "Smazat" na konkrétní kartě
function smazatKartu(id) {
    // Ponecháme v šanonu všechny karty kromě té, která má toto konkrétní id
    seznamNahravek = seznamNahravek.filter((karta) => karta.id !== id);
    ulozPoznamkyDoPameti();      // Uložíme aktualizovaný seznam do paměti prohlížeče
    vykresliSeznamNahravek();   // Překreslíme nástěnku na stránce
}

// Hlavní funkce, která postupně zkouší modely ze seznamu, dokud jeden z nich nahrávku nezpracuje
// Slovník specializovaných instrukcí podle zvoleného režimu nahrávky
const instrukceProRezimy = {
    ostatni: "Zpracuj nahrávku jako obecný, čistý a srozumitelný zápis bez zbytečného domýšlení. Shrň hlavní myšlenky do přehledných odrážek.",
    poznamka: "Zpracuj nahrávku jako strukturovaný osobní nápad nebo poznámku. Rozděl myšlenky logicky do přehledných odrážek a zvýrazni hlavní pointu.",
    specifikace: "Zpracuj nahrávku jako formální TECHNICKOU SPECIFIKACI ze zadání zákazníka. Vytáhni a strukturuj tyto body: 1) Cíl a předmět řešení, 2) Technické požadavky a parametry, 3) Omezení a předpoklady, 4) Otevřené otázky k vyjasnění.",
    meeting: "Zpracuj nahrávku jako formální MEETING MINUTES (zápis z jednání). Strukturuj výstup do těchto sekcí: 1) Účastníci a téma jednání, 2) Klíčové projednané body a rozhodnutí, 3) Úkoly (Action Items – kdo, co má udělat a do kdy).",
    kalendar: "Nahrávka slouží primárně k vytvoření události v kalendáři. Nastav 'ma_se_zapsat' na true, pečlivě urči název události, datum i čas a rozeber, zda jde o osobní nebo pracovní kalendář.",
    email: "Zpracuj nahrávku jako hotový, zdvořilý a profesionální NÁVRH E-MAILU (včetně návrhu Předmětu e-mailu, oslovení, přehledného těla zprávy a rozloučení), připravený rovnou k odeslání.",
    domacnost: "Zpracuj nahrávku jako přehledný NÁKUPNÍ SEZNAM nebo seznam domácích úkolů. Položky logicky rozděl podle kategorií (např. Potraviny, Drogerie, Domácnost, Zařídit)."
};
async function vytvorZapisPomociAI(karta) {
    // 1. Zkontrolujeme, zda máme v paměti uložený API klíč
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        karta.stav = "Chyba: Nejdříve vlož svůj API klíč! ❌";
        vykresliSeznamNahravek();
        return;
    }

    // 2. Zabalíme zvuk do formátu Base64 (to stačí udělat jen jednou před zkoušením modelů)
    karta.stav = "Připravuji zvukovou nahrávku... ⏳";
    vykresliSeznamNahravek();
    const base64Audio = await prevedZvukNaBase64(karta.audioBlob);

    // Vybereme správnou instrukci podle zvoleného režimu karty (když chybí, použijeme "ostatni")
    const zadaniRezim = instrukceProRezimy[karta.rezim] || instrukceProRezimy.ostatni;

    // 3. Sestavíme obsah "dopisu" pro AI – požádáme ji o přesný strukturovaný formulář (JSON)
    const dopisProAI = {
        contents: [{
            parts: [
                {
                    text: `Poslechni si tuto hlasovou nahrávku v češtině.
SPECIFICKÝ ÚKOL PRO TENTO ZÁPIS: ${zadaniRezim}

Zanalyzuj nahrávku a vrať odpověď POUZE jako čistý JSON objekt (bez jakéhokoliv dalšího textu nebo značek \`\`\`json) s těmito přesnými klíči:
{
  "kategorie": "Osobní" nebo "Pracovní",
  "nadpis": "Krátký výstižný název dokumentu či poznámky",
  "prepis": "Přesný doslovný přepis nahrávky",
  "poznamky": "Výstup zpracovaný přesně podle specifického úkolu výše (použij přehledné nadpisy, odrážky • a čisté formátování)",
  "kalendar": {
    "ma_se_zapsat": true nebo false (true pokud byl zvolen režim kalendáře NEBO mluvčí výslovně žádá o zapsání události do kalendáře),
    "typ_kalendare": "osobni" nebo "pracovni",
    "nazev_udalosti": "Název události pro kalendář (nebo prázdný text)",
    "datum_cas": "Datum a čas ve formátu RRRR-MM-DD HH:MM (dnešní datum je 2026-11-17, pokud není řečeno jinak, odhadni nejbližší logický termín)"
  }
}`
                },
                {
                    inlineData: {
                        mimeType: "audio/webm",
                        data: base64Audio
                    }
                }
            ]
        }]
    };

    // 4. Projdeme náš seznam modelů jeden po druhém (cyklus for...of)
    for (const model of dostupneModely) {
        // Aktualizujeme stav na kartě, abys viděl, který model se zrovna zkouší
        karta.stav = `Zkouším model ${model}... ⏳`;
        vykresliSeznamNahravek();

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
            const odpoved = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dopisProAI),
                signal: AbortSignal.timeout(15000) // Budík: když model neodpoví do 15 vteřin, odpojíme ho a zkusíme další
            });

            const data = await odpoved.json();

            // Pokud tento konkrétní model hlásí chybu (např. přetížení), vypíšeme to do Konzole a jdeme na další model!
            if (data.error) {
                console.warn(`Model ${model} selhal:`, data.error.message);
                continue; // Příkaz "continue" přeskočí zbytek a spustí další kolo s dalším modelem
            }

            // Pokud jsme dostali platnou odpověď, rozbalíme strukturovaný JSON formulář
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const surovyText = data.candidates[0].content.parts[0].text;
                // Očistíme text od případných značek ```json, kdyby je AI přece jen přidala
                const cistyJson = surovyText.replace(/```json|```/g, '').trim();
                
                // Rozbalíme textový JSON na živý objekt s jednotlivými kolonkami
                const vysledek = JSON.parse(cistyJson);

                // Uložíme si jednotlivé části do karty (včetně údajů pro kalendář)
                karta.kategorie = vysledek.kategorie || "Osobní";
                karta.nadpis = vysledek.nadpis || "Hlasová poznámka";
                karta.kalendar = vysledek.kalendar || null;

                // Sestavíme přehledný text pro zobrazení na kartě
                karta.zapis = `📁 Kategorie: ${karta.kategorie} — 📌 ${karta.nadpis}\n\n📝 Shrnutí a poznámky:\n${vysledek.poznamky}\n\n🗣️ Doslovný přepis:\n„${vysledek.prepis}“`;
                
                karta.stav = `Hotovo! Zápis vytvořen pomocí modelu ${model}. ✅`;
                ulozPoznamkyDoPameti();
                vykresliSeznamNahravek();
                return; // Úspěch! Příkaz "return" okamžitě ukončí funkci
            }

        } catch (chyba) {
            console.warn(`Chyba spojení u modelu ${model}:`, chyba);
            // Pokračujeme na další model v seznamu
        }
    }

    // 5. Tento řádek se provede jen tehdy, pokud selžou úplně všechny modely v celém seznamu
    karta.stav = "Všechny dostupné modely jsou momentálně přetížené nebo nedostupné. Zkus to prosím za chvíli znovu. ❌";
    vykresliSeznamNahravek();
}

// Pomocná funkce, která otevře buď Osobní Google Kalendář, nebo Pracovní Outlook Kalendář
function otevritKalendar(id) {
    const karta = seznamNahravek.find((k) => k.id === id);
    if (!karta || !karta.kalendar) return;

    const nazev = encodeURIComponent(karta.kalendar.nazev_udalosti || karta.nadpis);
    const popis = encodeURIComponent(karta.zapis);
    const rawDatumCas = karta.kalendar.datum_cas || ""; // Formát od AI je "2026-11-17 15:00"

    // 1. Pokud jde o PRACOVNÍ kalendář -> otevřeme Microsoft Outlook (Microsoft 365)
    if (karta.kalendar.typ_kalendare === "pracovni") {
        // Outlook potřebuje formát ISO s "T" uprostřed: "2026-11-17T15:00:00"
        const outlookStart = rawDatumCas ? rawDatumCas.replace(" ", "T") + ":00" : "";
        const startParam = outlookStart ? `&startdt=${encodeURIComponent(outlookStart)}` : "";
        
        const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${nazev}&body=${popis}${startParam}`;
        window.open(outlookUrl, '_blank');
    } 
    // 2. Jinak jde o OSOBNÍ kalendář -> otevřeme Google Kalendář
    else {
        const cistyCas = rawDatumCas.replace(/[-:]/g, "").replace(" ", "T") + "00";
        const datumParam = cistyCas.length === 15 ? `&dates=${cistyCas}/${cistyCas}` : "";

        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${nazev}&details=${popis}${datumParam}`;
        window.open(googleUrl, '_blank');
    }
}

// Pomocná funkce, která stáhne obsah karty jako hezky naformátovaný soubor pro Microsoft Word (.doc)
function stahnoutJakoWord(id) {
    const karta = seznamNahravek.find((k) => k.id === id);
    if (!karta) return;

    // Převedeme mřížky ### na tučné nadpisy a každý konec řádku (\n) na HTML zalomení (<br>), kterému Word rozumí
    const formatovanyText = karta.zapis
        .replace(/### (.*)/g, '<h3 style="color: #1e3a8a; margin-top: 14px; margin-bottom: 4px;">$1</h3>')
        .replace(/\n/g, '<br>');

    // Zabalíme text do čisté HTML šablony pro Word s hlavním nadpisem a datem
    const obsahHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${karta.nadpis || 'Zápis'}</title></head>
        <body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937;">
            <h1 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 6px;">${karta.nadpis || 'AI Zápis'}</h1>
            <p style="color: #6b7280; font-size: 9.5pt;">Vytvořeno v Můj AI Zápisník (${karta.cas})</p>
            <div style="margin-top: 16px;">${formatovanyText}</div>
        </body>
        </html>
    `;

    // Vytvoříme virtuální soubor v paměti a spustíme jeho stažení
    const blob = new Blob(['\ufeff', obsahHtml], { type: 'application/msword' });
    const odkaz = document.createElement('a');
    odkaz.href = URL.createObjectURL(blob);
    odkaz.download = `${karta.nadpis || 'AI-Zapis'}.doc`;
    odkaz.click();
}

// Pomocná funkce, která zkopíruje čistý text zápisu do schránky (pro snadné vložení do Google Docs či e-mailu)
function zkopirovatZapis(id) {
    const karta = seznamNahravek.find((k) => k.id === id);
    if (!karta) return;

    navigator.clipboard.writeText(karta.zapis);
    statusText.textContent = "Text zápisu byl zkopírován do schránky! 📋";
}

// Pomocná funkce, která otevře Gmail s předvyplněným předmětem a textem zápisu
function odeslatPresGmail(id) {
    const karta = seznamNahravek.find((k) => k.id === id);
    if (!karta) return;

    const predmet = encodeURIComponent(karta.nadpis || "AI Zápis");
    const teloZpravy = encodeURIComponent(karta.zapis);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${predmet}&body=${teloZpravy}`;

    window.open(gmailUrl, '_blank');
}

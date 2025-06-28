document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elemek és Állapot ---
    const projektUrlap = document.getElementById('projekt-urlap');
    const projektLista = document.getElementById('projekt-lista');
    const felhasznaloValaszto = document.getElementById('felhasznalo-valaszto');
    const nevSzuro = document.getElementById('nev-szuro');
    const statuszSzuro = document.getElementById('statusz-szuro');
    const modal = document.getElementById('projekt-reszletek-modal');
    const modalBody = document.getElementById('modal-body');
    const modalProjektInfo = modalBody.querySelector('.projekt-info-content');
    // Kördiagram konténer elem
    const pieChartContainer = document.getElementById('pie-chart-container');


    const closeButton = document.querySelector('.close-button');

    // Idővonal elemek
    const idovonalKontener = document.getElementById('idovonal-kontener');
    const idovonalGrid = document.getElementById('idovonal-grid');
    const maiNapraUgrasGomb = document.getElementById('mai-napra-ugras');

    // Alprojekt elemek - ezekre még szükség van, mert a modálban kezeljük őket
    const alprojektUrlap = document.getElementById('alprojekt-urlap');
    const szuloProjektIdInput = document.getElementById('szulo-projekt-id');
    const alprojektekKontener = document.getElementById('alprojektek-kontener');

    let allUsersData = JSON.parse(localStorage.getItem('allUsersProjectData')) || { Anna: [], Péter: [], Vendég: [] };
    let currentUser = felhasznaloValaszto.value;
    let currentProjektId = null;

    const NAP_SZELESSEG = 45; // px-ben, egyeznie kell a CSS változóval

    // --- Eseménykezelők ---
    felhasznaloValaszto.addEventListener('change', (e) => { currentUser = e.target.value; mentesEsFrissites(); });
    nevSzuro.addEventListener('input', () => projektListaRenderel());
    statuszSzuro.addEventListener('change', () => projektListaRenderel());
    projektUrlap.addEventListener('submit', ujProjektHozzaadasa);
    projektLista.addEventListener('click', projektListaKattintas);
    projektLista.addEventListener('change', statuszValtoztatas);
    maiNapraUgrasGomb.addEventListener('click', ugorjMaiNapra);
    closeButton.addEventListener('click', () => modal.style.display = "none");
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = "none"; });

    alprojektUrlap.addEventListener('submit', ujAlprojektHozzaadasa);
    alprojektekKontener.addEventListener('click', alprojektListaKattintas);
    alprojektekKontener.addEventListener('change', alprojektStatuszValtoztatas);


    // --- Függvények ---

    function mentesEsFrissites() {
        localStorage.setItem('allUsersProjectData', JSON.stringify(allUsersData));
        projektListaRenderel();
        idovonalRenderel();
    }

    function projektListaRenderel() {
        const projektek = allUsersData[currentUser] || [];
        const nevSzuroErtek = nevSzuro.value.toLowerCase();
        const statuszSzuroErtek = statuszSzuro.value;

        const szurtProjektek = projektek.filter(projekt =>
            projekt.nev.toLowerCase().includes(nevSzuroErtek) &&
            (statuszSzuroErtek === 'all' || projekt.statusz === statuszSzuroErtek)
        );
        projektLista.innerHTML = '';
        if (szurtProjektek.length === 0) {
            projektLista.innerHTML = '<p>Nincsenek a szűrési feltételeknek megfelelő projektek.</p>';
        } else {
            szurtProjektek.forEach(projekt => {
                // Számolja ki az alprojektek aggregált státuszát a főprojekt színéhez
                let plannedSubprojects = 0;
                let inProgressSubprojects = 0;
                let completedSubprojects = 0;
                let totalSubprojects = 0;

                if (projekt.alprojektek && projekt.alprojektek.length > 0) {
                    totalSubprojects = projekt.alprojektek.length;
                    plannedSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'tervezett').length;
                    inProgressSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'folyamatban').length;
                    completedSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
                }

                let overallStatusClass = '';
                if (totalSubprojects === 0) {
                    overallStatusClass = 'overall-status-default'; // Nincs alprojekt, alapértelmezett szín
                } else if (completedSubprojects === totalSubprojects) {
                    overallStatusClass = 'overall-status-kesz'; // Minden kész, zöld
                } else if (inProgressSubprojects > 0) {
                    overallStatusClass = 'overall-status-folyamatban'; // Van folyamatban, sárga
                } else if (plannedSubprojects === totalSubprojects) {
                    overallStatusClass = 'overall-status-tervezett'; // Csak tervezett, világoskék
                } else {
                    // Ha vegyes a státusz, és van folyamatban, akkor folyamatban. Ha csak tervezett és kész, de nem minden kész, akkor tervezett.
                    overallStatusClass = 'overall-status-folyamatban'; 
                }

                const div = document.createElement('div');
                // A főprojekt listaelemének színe az aggregált státusz alapján
                div.classList.add('projekt-elem', overallStatusClass); 
                div.dataset.id = projekt.id;
                div.innerHTML = `
                    <div class="projekt-info">
                        <strong>${projekt.nev}</strong>
                        <p>Időtartam: ${projekt.kezdesDatum} - ${projekt.hatarido}</p>
                        <p>Státusz: <span class="statusz-szoveg statusz-${projekt.statusz}">${projekt.statusz.charAt(0).toUpperCase() + projekt.statusz.slice(1)}</span></p>
                    </div>
                    <div class="projekt-controls">
                        <select class="statusz-valaszto" data-id="${projekt.id}">
                            <option value="tervezett" ${projekt.statusz === 'tervezett' ? 'selected' : ''}>Tervezett</option>
                            <option value="folyamatban" ${projekt.statusz === 'folyamatban' ? 'selected' : ''}>Folyamatban</option>
                            <option value="kesz" ${projekt.statusz === 'kesz' ? 'selected' : ''}>Kész</option>
                        </select>
                        <button class="torles-gomb" data-id="${projekt.id}">Törlés</button>
                    </div>
                `;
                projektLista.appendChild(div);
            });
        }
    }

    function ujProjektHozzaadasa(e) {
        e.preventDefault();
        const nevInput = document.getElementById('projekt-nev');
        const kezdesDatumInput = document.getElementById('kezdes-datum');
        const hataridoInput = document.getElementById('hatarido');
        if (new Date(hataridoInput.value) < new Date(kezdesDatumInput.value)) {
            alert('A határidő nem lehet korábbi a kezdés dátumánál!');
            return;
        }

        const ujProjekt = {
            id: Date.now(),
            nev: nevInput.value,
            kezdesDatum: kezdesDatumInput.value,
            hatarido: hataridoInput.value,
            statusz: 'tervezett',
            alprojektek: []
        };
        allUsersData[currentUser].push(ujProjekt);
        mentesEsFrissites();
        projektUrlap.reset();
    }

    function projektListaKattintas(e) {
        const projektElem = e.target.closest('.projekt-elem');
        if (!projektElem) return;

        const id = parseInt(projektElem.dataset.id);
        if (e.target.classList.contains('torles-gomb')) {
            allUsersData[currentUser] = allUsersData[currentUser].filter(projekt => projekt.id !== id);
            mentesEsFrissites();
        } else if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
            reszletekMegjelenitese(id);
        }
    }

    function statuszValtoztatas(e) {
        if (e.target.classList.contains('statusz-valaszto')) {
            const id = parseInt(e.target.dataset.id);
            const projekt = allUsersData[currentUser].find(p => p.id === id);
            if (projekt) {
                projekt.statusz = e.target.value;
                mentesEsFrissites();
            }
        }
    }

    // Segédfüggvény a modálban lévő készültségi százalék szöveg frissítéséhez
    function updateModalCompletionText() {
        const projekt = allUsersData[currentUser].find(p => p.id === currentProjektId);
        if (!projekt) return;

        let completedSubprojects = 0;
        let totalSubprojects = 0;

        if (projekt.alprojektek && projekt.alprojektek.length > 0) {
            totalSubprojects = projekt.alprojektek.length;
            completedSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
        }

        const completionPercentage = totalSubprojects === 0 ? 0 : (completedSubprojects / totalSubprojects) * 100;

        // Megkeressük a megfelelő span tag-et és frissítjük a tartalmát
        const completionTextElement = document.getElementById('alprojekt-keszultseg-szoveg');
        if (completionTextElement) {
            completionTextElement.innerHTML = `<strong>Alprojektek készültségi foka:</strong> ${completionPercentage.toFixed(2)}%`;
        }
    }

    function reszletekMegjelenitese(id) {
        const projekt = allUsersData[currentUser].find(p => p.id === id);
        if (!projekt) return;

        currentProjektId = id;

        const ma = new Date();
        const hataridoDate = new Date(projekt.hatarido);
        const kezdesDate = new Date(projekt.kezdesDatum);
        const idoHatra = hataridoDate - ma;
        const napokHatra = Math.ceil(idoHatra / (1000 * 60 * 60 * 24));

        let hataridoStatusz;
        if (napokHatra < 0) {
            hataridoStatusz = `<span style="color: var(--szin-torles);">A határidő ${Math.abs(napokHatra)} napja lejárt.</span>`;
        } else {
            hataridoStatusz = `<span>${napokHatra} nap van hátra a határidőig.</span>`;
        }

        const teljesIdotartam = Math.ceil((hataridoDate - kezdesDate) / (1000 * 60 * 60 * 24)) + 1;

        // Alprojektek státuszainak számolása a kördiagramhoz
        let plannedSubprojects = 0;
        let inProgressSubprojects = 0;
        let completedSubprojects = 0;
        let totalSubprojects = 0;

        if (projekt.alprojektek && projekt.alprojektek.length > 0) {
            totalSubprojects = projekt.alprojektek.length;
            plannedSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'tervezett').length;
            inProgressSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'folyamatban').length;
            completedSubprojects = projekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
        }

        // Készültségi szöveg inicializálása egy külön span-ben, amit majd updateModalCompletionText() frissít
        modalProjektInfo.innerHTML = `
            <h3>${projekt.nev}</h3>
            <p><strong>Státusz:</strong> <span class="statusz-szoveg statusz-${projekt.statusz}">${projekt.statusz.charAt(0).toUpperCase() + projekt.statusz.slice(1)}</span></p>
            <p><strong>Kezdés dátuma:</strong> ${projekt.kezdesDatum}</p>
            <p><strong>Határidő:</strong> ${projekt.hatarido}</p>
            <p><strong>Projekt teljes időtartama:</strong> ${teljesIdotartam} nap</p>
            <p><strong>Idő a határidőig:</strong> ${hataridoStatusz}</p>
            <span id="alprojekt-keszultseg-szoveg"></span>
            <hr>
        `;

        szuloProjektIdInput.value = id;
        alprojektUrlap.reset();
        
        renderAlprojektek(projekt.alprojektek);

        // A kördiagram frissítése az új adatokkal
        updatePieChart(plannedSubprojects, inProgressSubprojects, completedSubprojects);
        updateModalCompletionText(); // Frissítjük a szöveges készültségi százalékot is

        modal.style.display = 'flex';
    }

    // Függvény a kördiagram frissítéséhez, több kategóriával
    function updatePieChart(plannedCount, inProgressCount, completedCount) {
        // Töröljük a korábbi diagramot
        pieChartContainer.innerHTML = '';

        // Csak akkor próbáljuk meg renderelni, ha Vega-Embed elérhető
        if (typeof vegaEmbed !== 'undefined') {
            let total = plannedCount + inProgressCount + completedCount;
            let dataValues = [];

            // Explicit sorrend meghatározása a kategóriákhoz
            // A "Kész" szelet (ha van) elölről induljon és óramutató járásával megegyező irányban növekedjen
            const categorySortOrder = {
                "Kész": 1, // Elsőként rajzolódik
                "Folyamatban": 2,
                "Tervezett": 3,
                "Nincs Alprojekt": 4
            };

            // Adjuk hozzá a kategóriákat, ha az értékük nagyobb 0
            // Frissített színek: Kész: zöld, Folyamatban: sárga, Tervezett: világoskék
            if (completedCount > 0) {
                dataValues.push({"category": "Kész", "value": (completedCount / total) * 100, "color_code": "#228B22", "sort_order": categorySortOrder["Kész"]}); // Szép zöld
            }
            if (inProgressCount > 0) {
                dataValues.push({"category": "Folyamatban", "value": (inProgressCount / total) * 100, "color_code": "#e9c46a", "sort_order": categorySortOrder["Folyamatban"]}); // Marad sárga
            }
            if (plannedCount > 0) {
                dataValues.push({"category": "Tervezett", "value": (plannedCount / total) * 100, "color_code": "#ADD8E6", "sort_order": categorySortOrder["Tervezett"]}); // Világoskék
            }
            
            // Ha nincsenek alprojektek (total=0), akkor egy "Nincs Alprojekt" kategóriát jelenítünk meg
            if (total === 0) {
                dataValues.push({"category": "Nincs Alprojekt", "value": 100, "color_code": "#cccccc", "sort_order": categorySortOrder["Nincs Alprojekt"]});
            }

            // Az elkészült százalék, ami középen fog megjelenni
            const displayPercentage = total === 0 ? 0 : (completedCount / total) * 100;

            const layeredChartSpec = {
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "data": {"values": dataValues},
                "layer": [
                    {
                        // Kördiagram réteg
                        "mark": {
                            "type": "arc",
                            "outerRadius": 100,
                            "innerRadius": 60,
                            "startAngle": 0, // Kezdő szög beállítása 3 órára (jobbra)
                            "transition": { // Animáció hozzáadása a szeletekhez
                                "duration": 700, // Az animáció időtartama milliszekundumban
                                "ease": "easeOutCubic" // Lágyabb animációs görbe
                            }
                        },
                        "encoding": {
                            "theta": {"field": "value", "type": "quantitative", "stack": true},
                            "color": {
                                "field": "category",
                                "type": "nominal",
                                "scale": {"domain": dataValues.map(d => d.category), "range": dataValues.map(d => d.color_code)}
                            },
                            "order": {"field": "sort_order", "sort": "ascending"}, // Rendezés a custom sort_order mező alapján (így a "Kész" kerül elsőnek)
                            "tooltip": [
                                {"field": "category", "title": "Státusz"},
                                {"field": "value", "title": "Százalék", "format": ".1f"}
                            ]
                        }
                    },
                    {
                        // Szöveg réteg (teljes elkészült százalék a közepén)
                        "mark": {
                            "type": "text",
                            "align": "center",
                            "baseline": "middle",
                            "fontSize": 24,
                            "fontWeight": "bold",
                            "color": "#333"
                        },
                        "encoding": {
                            "text": {"value": `${displayPercentage.toFixed(0)}%`} // Mindig az elkészült százalékot mutatjuk
                        }
                    }
                ],
                "title": "Projekt Készültsége",
                "config": {
                    "view": {"stroke": null}, // Nincs körvonal a diagram körül
                    "title": {"anchor": "middle"} // A cím középre igazítása
                }
            };

            // Rendereljük a rétegelt diagramot a konténerbe
            vegaEmbed('#pie-chart-container', layeredChartSpec, { actions: false }).catch(console.error);

        } else {
            // Fallback üzenet, ha a Vega-Embed nem tölthető be
            pieChartContainer.innerHTML = '<p>A kördiagram megjelenítéséhez szükség van a Vega-Lite és Vega-Embed könyvtárakra.</p>';
        }
    }


    function renderAlprojektek(alprojektek) {
        alprojektekKontener.innerHTML = '';
        if (alprojektek.length === 0) {
            alprojektekKontener.innerHTML = '<p>Nincsenek alprojektek ehhez a főprojekthez.</p>';
            return;
        }

        alprojektek.forEach(alprojekt => {
            const alprojektDiv = document.createElement('div');
            alprojektDiv.classList.add('alprojekt-elem', `statusz-${alprojekt.statusz}`);
            alprojektDiv.dataset.id = alprojekt.id;
            alprojektDiv.innerHTML = `
                <div class="alprojekt-info">
                    <strong>${alprojekt.nev}</strong>
                    <p>${alprojekt.kezdesDatum} - ${alprojekt.hatarido}</p>
                </div>
                <div class="alprojekt-controls">
                    <select class="alprojekt-statusz-valaszto" data-id="${alprojekt.id}">
                        <option value="tervezett" ${alprojekt.statusz === 'tervezett' ? 'selected' : ''}>Tervezett</option>
                        <option value="folyamatban" ${alprojekt.statusz === 'folyamatban' ? 'selected' : ''}>Folyamatban</option>
                        <option value="kesz" ${alprojekt.statusz === 'kesz' ? 'selected' : ''}>Kész</option>
                    </select>
                    <button class="alprojekt-torles-gomb" data-id="${alprojekt.id}">Törlés</button>
                </div>
            `;
            alprojektekKontener.appendChild(alprojektDiv);
        });
    }

    function ujAlprojektHozzaadasa(e) {
        e.preventDefault();
        const nevInput = document.getElementById('alprojekt-nev');
        const kezdesDatumInput = document.getElementById('alprojekt-kezdes-datum');
        const hataridoInput = document.getElementById('alprojekt-hatarido');
        const szuloId = parseInt(szuloProjektIdInput.value);
        if (new Date(hataridoInput.value) < new Date(kezdesDatumInput.value)) {
            alert('A határidő nem lehet korábbi a kezdés dátumánál!');
            return;
        }

        const szuloProjekt = allUsersData[currentUser].find(p => p.id === szuloId);
        if (szuloProjekt) {
            const foprojektKezdes = new Date(szuloProjekt.kezdesDatum);
            const foprojektHatarido = new Date(szuloProjekt.hatarido);
            const alprojektKezdes = new Date(kezdesDatumInput.value);
            const alprojektHatarido = new Date(hataridoInput.value);

            foprojektKezdes.setHours(0,0,0,0);
            foprojektHatarido.setHours(0,0,0,0);
            alprojektKezdes.setHours(0,0,0,0);
            alprojektHatarido.setHours(0,0,0,0);
            if (alprojektKezdes < foprojektKezdes || alprojektHatarido > foprojektHatarido) {
                alert('Az alprojekt dátumai nem eshetnek a főprojekt időtartamán kívülre!');
                return;
            }

            const ujAlprojekt = {
                id: Date.now(),
                nev: nevInput.value,
                kezdesDatum: kezdesDatumInput.value,
                hatarido: hataridoInput.value,
                statusz: 'tervezett',
                szuloProjektId: szuloId
            };
            szuloProjekt.alprojektek.push(ujAlprojekt);
            mentesEsFrissites();
            alprojektUrlap.reset();
            renderAlprojektek(szuloProjekt.alprojektek);
            // Dinamikus frissítés új alprojekt hozzáadásakor
            const currentProjekt = allUsersData[currentUser].find(p => p.id === currentProjektId);
            if (currentProjekt) {
                updateModalCompletionText(); // Szöveges kiírás frissítése
                let plannedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'tervezett').length;
                let inProgressSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'folyamatban').length;
                let completedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
                updatePieChart(plannedSubprojects, inProgressSubprojects, completedSubprojects);
            }
        }
    }

    function alprojektListaKattintas(e) {
        const alprojektElem = e.target.closest('.alprojekt-elem');
        if (!alprojektElem) return;

        const alprojektId = parseInt(alprojektElem.dataset.id);
        const szuloId = currentProjektId;

        const szuloProjekt = allUsersData[currentUser].find(p => p.id === szuloId);
        if (szuloProjekt) {
            if (e.target.classList.contains('alprojekt-torles-gomb')) {
                szuloProjekt.alprojektek = szuloProjekt.alprojektek.filter(ap => ap.id !== alprojektId);
                mentesEsFrissites();
                renderAlprojektek(szuloProjekt.alprojektek);
                // Dinamikus frissítés alprojekt törlésekor
                const currentProjekt = allUsersData[currentUser].find(p => p.id === currentProjektId);
                if (currentProjekt) {
                    updateModalCompletionText(); // Szöveges kiírás frissítése
                    let plannedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'tervezett').length;
                    let inProgressSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'folyamatban').length;
                    let completedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
                    updatePieChart(plannedSubprojects, inProgressSubprojects, completedSubprojects);
                }
            }
        }
    }

    function alprojektStatuszValtoztatas(e) {
        if (e.target.classList.contains('alprojekt-statusz-valaszto')) {
            const alprojektId = parseInt(e.target.dataset.id);
            const szuloId = currentProjektId;

            const szuloProjekt = allUsersData[currentUser].find(p => p.id === szuloId);
            if (szuloProjekt) {
                const alprojekt = szuloProjekt.alprojektek.find(ap => ap.id === alprojektId);
                if (alprojekt) {
                    alprojekt.statusz = e.target.value;
                    mentesEsFrissites();
                    renderAlprojektek(szuloProjekt.alprojektek); // Ez rendertől függetlenül
                    
                    // A kördiagram és a szöveges kiírás dinamikus frissítése a státuszváltás után
                    const currentProjekt = allUsersData[currentUser].find(p => p.id === currentProjektId);
                    if (currentProjekt) {
                        updateModalCompletionText(); // Szöveges kiírás frissítése
                        let plannedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'tervezett').length;
                        let inProgressSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'folyamatban').length;
                        let completedSubprojects = currentProjekt.alprojektek.filter(ap => ap.statusz === 'kesz').length;
                        updatePieChart(plannedSubprojects, inProgressSubprojects, completedSubprojects);
                    }
                }
            }
        }
    }


    // --- IDŐVONAL RENDERELŐ FÜGGVÉNY ---
    let idovonalKezdoDatum;
    let napokSzama;

    function idovonalRenderel() {
        idovonalGrid.innerHTML = '';
        const ma = new Date();
        ma.setHours(0, 0, 0, 0);

        idovonalKezdoDatum = new Date(ma);
        idovonalKezdoDatum.setMonth(ma.getMonth() - 3);

        const idovonalZaroDatum = new Date(ma);
        idovonalZaroDatum.setMonth(ma.getMonth() + 9);
        napokSzama = Math.ceil((idovonalZaroDatum - idovonalKezdoDatum) / (1000 * 60 * 60 * 24));
        idovonalGrid.style.gridTemplateColumns = `repeat(${napokSzama}, ${NAP_SZELESSEG}px)`;
        const honapNevek = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Szep", "Okt", "Nov", "Dec"];
        let utolsoHonap = -1;
        // Dátum fejlécek generálása
        for (let i = 0; i < napokSzama; i++) {
            const aktDatum = new Date(idovonalKezdoDatum);
            aktDatum.setDate(idovonalKezdoDatum.getDate() + i);
            const honap = aktDatum.getMonth();

            if (honap !== utolsoHonap) {
                const honapKezdete = new Date(aktDatum.getFullYear(), aktDatum.getMonth(), 1);
                const honapVege = new Date(aktDatum.getFullYear(), aktDatum.getMonth() + 1, 0);

                const startCol = Math.ceil((honapKezdete - idovonalKezdoDatum) / 864e5) + 1;
                const endCol = Math.ceil((honapVege - idovonalKezdoDatum) / 864e5) + 2;

                const honapFejlec = document.createElement('div');
                honapFejlec.classList.add('honap-fejlec');
                honapFejlec.textContent = `${aktDatum.getFullYear()} ${honapNevek[honap]}`;
                honapFejlec.style.gridColumn = `${startCol} / ${endCol}`;
                idovonalGrid.appendChild(honapFejlec);
                utolsoHonap = honap;
            }

            const napFejlec = document.createElement('div');
            napFejlec.classList.add('nap-fejlec');
            napFejlec.textContent = aktDatum.getDate();
            if (aktDatum.getTime() === ma.getTime()) {
                napFejlec.classList.add('mai-nap');
                napFejlec.id = 'mai-nap-cella';
            }
            idovonalGrid.appendChild(napFejlec);
        }

        const projektek = allUsersData[currentUser] || [];
        // A sorok aktuális állapota: az adott sorban lévő utolso foglalt oszlopot tárolja
        // { row: lastOccupiedColumn }
        const occupiedRows = {};
        let nextAvailableRow = 3; // Kezdő sor a projekteknek (a fejlécek után)

        // Rendezés kezdő dátum szerint, hogy a megjelenítés konzisztens legyen
        projektek.sort((a, b) => new Date(a.kezdesDatum) - new Date(b.kezdesDatum));
        projektek.forEach(projekt => {
            // Meghatározzuk, hogy hány sorra van szüksége ennek a főprojektnek (csak 1, mivel az alprojektek nem külön sorban vannak)
            const requiredRowsForGroup = 1; 

            // Keressük a következő szabad blokkot a requiredRowsForGroup mennyiségben
            let currentBlockStartRow = nextAvailableRow;
            let blockFound = false;

            while (!blockFound) {
                let overlap = false;
                // A projekt legkorábbi kezdő oszlopa (csak a főprojektet nézzük)
                const groupMinStartCol = Math.floor((new Date(projekt.kezdesDatum).setHours(0,0,0,0) - idovonalKezdoDatum) / 864e5) + 1;

                // Ellenőrizzük, hogy az adott sor már foglalt-e EGY olyan projekttel,
                // amelyik átfedné a MI csoportunk kezdő oszlopával.
                if (occupiedRows[currentBlockStartRow] && occupiedRows[currentBlockStartRow] >= groupMinStartCol) {
                    overlap = true;
                }

                if (overlap) {
                    currentBlockStartRow++; // Ha átfedés van, lépj a következő sorba
                } else {
                    blockFound = true; // Találtunk egy szabad blokkot
                }
            }

            // Főprojekt renderelése
            const mainProjectRow = currentBlockStartRow;
            renderProjektSav(projekt, mainProjectRow, false); // isSubprojekt = false

            // Frissítjük a következő szabad sort a teljes projekt után
            nextAvailableRow = mainProjectRow + 1;
            // Frissítjük az occupiedRows-t is a főprojekttel
            const groupMaxEndCol = Math.floor((new Date(projekt.hatarido).setHours(0,0,0,0) - idovonalKezdoDatum) / 864e5) + 2; // Csak a főprojekt végét nézzük
            occupiedRows[mainProjectRow] = groupMaxEndCol; // Az adott sor utolsó foglalt oszlopa
        });
        ugorjMaiNapra();
    }

    // Segédfüggvény: Kiszámolja a csoportban lévő projektek közül a legkorábbi kezdő oszlopot
    // Csak a főprojekt kezdő dátumát nézzük
    function getMinStartDateCol(projekt) {
        return Math.floor((new Date(projekt.kezdesDatum).setHours(0,0,0,0) - idovonalKezdoDatum) / 864e5) + 1;
    }

    // Segédfüggvény: Kiszámolja a csoportban lévő projektek közül a legkésőbbi vég oszlopot
    // Csak a főprojekt határidejét nézzük
    function getMaxEndDateCol(projekt) {
        return Math.floor((new Date(projekt.hatarido).setHours(0,0,0,0) - idovonalKezdoDatum) / 864e5) + 2;
    }


    function renderProjektSav(item, targetRow, isSubprojekt) {
        const kezdes = new Date(item.kezdesDatum);
        const hatarido = new Date(item.hatarido);
        kezdes.setHours(0, 0, 0, 0);
        hatarido.setHours(0, 0, 0, 0);
        const startCol = Math.floor((kezdes - idovonalKezdoDatum) / 864e5) + 1;
        const endCol = Math.floor((hatarido - idovonalKezdoDatum) / 864e5) + 2;
        if (startCol > napokSzama || endCol < 2) return;

        const projektSav = document.createElement('div');
        projektSav.classList.add('projekt-sav', `statusz-${item.statusz}`);
        projektSav.textContent = item.nev;
        
        projektSav.title = `${item.nev} (${item.kezdesDatum} - ${item.hatarido})`;
        projektSav.style.gridColumn = `${startCol} / ${endCol}`;
        projektSav.style.gridRow = targetRow;

        const tempDiv = document.createElement('div');
        tempDiv.classList.add('projekt-sav', `statusz-${item.statusz}`);
        document.body.appendChild(tempDiv);
        const szin = getComputedStyle(tempDiv).backgroundColor;
        document.body.removeChild(tempDiv);
        
        projektSav.style.setProperty('--background-color-placeholder', szin);
        
        projektSav.addEventListener('click', () => {
            // Mivel most már csak főprojekteket jelenítünk meg az idővonalon,
            // mindig a kattintott elem ID-jét használjuk a részletek megjelenítéséhez.
            reszletekMegjelenitese(item.id);
        });

        idovonalGrid.appendChild(projektSav);
    }


    function ugorjMaiNapra() {
        const maiNapCella = document.getElementById('mai-nap-cella');
        if (maiNapCella) {
            const containerSzelesseg = idovonalKontener.offsetWidth;
            const scrollPos = maiNapCella.offsetLeft - (containerSzelesseg / 2) + (NAP_SZELESSEG / 2);
            idovonalKontener.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });
        }
    }

    // --- Kezdeti renderelés ---
    mentesEsFrissites();
});

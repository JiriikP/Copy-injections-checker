document.addEventListener('DOMContentLoaded', async () => {
    const globalToggle = document.getElementById('globalToggle');
    const siteToggle = document.getElementById('siteToggle');
    const defaultOffCheckbox = document.getElementById('defaultOffCheckbox');
    const currentDomainEl = document.getElementById('currentDomain');
    const controlsWrapper = document.getElementById('controlsWrapper');
    const actionRadios = document.querySelectorAll('input[name="action"]');
    const toggleListBtn = document.getElementById('toggleListBtn');
    const listBtnText = document.getElementById('listBtnText');
    const arrowIcon = document.getElementById('arrowIcon');
    const injectionsList = document.getElementById('injectionsList');
    const refreshBtn = document.getElementById('refreshBtn');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let siteKey = "";
    
    if (tab && tab.url) {
        try {
            const url = new URL(tab.url);
            if (url.protocol === 'file:') {
                siteKey = url.pathname;
                currentDomainEl.textContent = url.pathname.split('/').pop() || 'Lokální soubor';
            } else if (url.protocol.startsWith('http')) {
                siteKey = url.hostname;
                currentDomainEl.textContent = url.hostname;
            } else {
                currentDomainEl.textContent = "Systémová stránka";
                siteToggle.disabled = true;
            }
        } catch (e) {
            currentDomainEl.textContent = "Neznámá adresa";
        }
    }

    function fetchInjections() {
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: "GET_INJECTIONS" }, (response) => {
                if (chrome.runtime.lastError || !response || !response.items) return;
                renderInjections(response.items);
            });
        }
    }

    refreshBtn.addEventListener('click', () => {
        if (tab && tab.id) {
            refreshBtn.textContent = "Načítám...";
            refreshBtn.disabled = true;
            
            chrome.tabs.reload(tab.id, () => {
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    chrome.tabs.sendMessage(tab.id, { type: "GET_INJECTIONS" }, (response) => {
                        if (!chrome.runtime.lastError && response) {
                            renderInjections(response.items || []);
                            clearInterval(checkInterval);
                            refreshBtn.textContent = "Znovu načíst";
                            refreshBtn.disabled = false;
                        } else if (attempts > 15) {
                            clearInterval(checkInterval);
                            refreshBtn.textContent = "Znovu načíst";
                            refreshBtn.disabled = false;
                        }
                    });
                }, 500);
            });
        }
    });

    chrome.storage.local.get({
        enabled: true,
        action: 'highlight',
        defaultOff: false,
        disabledSites: [],
        enabledSites: []
    }, (settings) => {
        globalToggle.checked = settings.enabled;
        defaultOffCheckbox.checked = settings.defaultOff;
        updateGlobalUI(settings.enabled);

        if (settings.defaultOff) {
            siteToggle.checked = settings.enabledSites.includes(siteKey);
        } else {
            siteToggle.checked = !settings.disabledSites.includes(siteKey);
        }

        actionRadios.forEach(radio => {
            if (radio.value === settings.action) {
                radio.checked = true;
            }
        });
    });

    fetchInjections();

    globalToggle.addEventListener('change', () => {
        const isEnabled = globalToggle.checked;
        chrome.storage.local.set({ enabled: isEnabled }, () => {
            updateGlobalUI(isEnabled);
            if (tab && tab.id) refreshBtn.click();
        });
    });

    // Změna výchozího chování na nových webech
    defaultOffCheckbox.addEventListener('change', () => {
        const isDefaultOff = defaultOffCheckbox.checked;
        chrome.storage.local.get({ disabledSites: [], enabledSites: [] }, (data) => {
            let disabled = data.disabledSites;
            let enabled = data.enabledSites;

            // Zachováme aktuální stav této konkrétní stránky i po změně režimu
            if (siteKey) {
                if (siteToggle.checked) {
                    if (!enabled.includes(siteKey)) enabled.push(siteKey);
                    disabled = disabled.filter(item => item !== siteKey);
                } else {
                    if (!disabled.includes(siteKey)) disabled.push(siteKey);
                    enabled = enabled.filter(item => item !== siteKey);
                }
            }

            chrome.storage.local.set({ 
                defaultOff: isDefaultOff,
                disabledSites: disabled,
                enabledSites: enabled
            }, () => {
                if (tab && tab.id) refreshBtn.click();
            });
        });
    });

    // Přepínač pro konkrétní web (aktualizuje oba seznamy podle stavu)
    siteToggle.addEventListener('change', () => {
        if (!siteKey) return;
        chrome.storage.local.get({ disabledSites: [], enabledSites: [] }, (data) => {
            let disabled = data.disabledSites;
            let enabled = data.enabledSites;

            if (siteToggle.checked) {
                disabled = disabled.filter(item => item !== siteKey);
                if (!enabled.includes(siteKey)) enabled.push(siteKey);
            } else {
                enabled = enabled.filter(item => item !== siteKey);
                if (!disabled.includes(siteKey)) disabled.push(siteKey);
            }

            chrome.storage.local.set({ disabledSites: disabled, enabledSites: enabled }, () => {
                if (tab && tab.id) refreshBtn.click();
            });
        });
    });

    actionRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                chrome.storage.local.set({ action: radio.value }, () => {
                    if (tab && tab.id) refreshBtn.click();
                });
            }
        });
    });

    toggleListBtn.addEventListener('click', () => {
        const isHidden = injectionsList.style.display === 'none' || injectionsList.style.display === '';
        injectionsList.style.display = isHidden ? 'block' : 'none';
        arrowIcon.textContent = isHidden ? '▲' : '▼';
    });

    function updateGlobalUI(enabled) {
        if (enabled) {
            controlsWrapper.classList.remove('disabled-overlay');
        } else {
            controlsWrapper.classList.add('disabled-overlay');
        }
    }

    function renderInjections(items) {
        listBtnText.textContent = `Zobrazit detekované texty (${items.length})`;
        injectionsList.innerHTML = '';

        if (items.length === 0) {
            injectionsList.innerHTML = '<div class="empty-msg">Na této stránce nebyly nalezeny žádné skryté texty.</div>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'injection-item';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'injection-content';

            const badgesWrap = document.createElement('div');
            badgesWrap.className = 'badges-wrap';

            item.types.forEach(type => {
                const badge = document.createElement('span');
                badge.className = 'type-badge';
                badge.textContent = type.id;
                badge.title = type.desc;
                badgesWrap.appendChild(badge);
            });

            const textSpan = document.createElement('span');
            textSpan.className = 'injection-text';
            textSpan.textContent = item.text;

            contentDiv.appendChild(badgesWrap);
            contentDiv.appendChild(textSpan);

            const scrollBtn = document.createElement('button');
            scrollBtn.className = 'scroll-btn';
            scrollBtn.innerHTML = '↗';
            scrollBtn.title = 'Přejít na tento prvek na stránce';
            scrollBtn.addEventListener('click', () => {
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, { type: "SCROLL_TO", id: item.id });
                }
            });
            
            div.appendChild(contentDiv);
            div.appendChild(scrollBtn);
            
            injectionsList.appendChild(div);
        });
    }
});
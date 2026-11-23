// ============================================================================
// 1. STAV ROZŠÍŘENÍ A MEZIPAMĚŤ (CACHE)
// ============================================================================

let detectedItems = [];

let styleCache = new WeakMap();
let nonCopyableCache = new WeakMap();

/**
 * Vrátí identifikátor aktuální stránky pro ukládání výjimek (doména nebo cesta k souboru).
 */
function getSiteKey() {
    if (window.location.protocol === 'file:') return window.location.pathname;
    return window.location.hostname;
}

/**
 * Vrátí vypočítané CSS styly prvku s využitím mezipaměti.
 */
function getCachedStyle(el) {
    let style = styleCache.get(el);
    if (!style) {
        style = window.getComputedStyle(el);
        styleCache.set(el, style);
    }
    return style;
}


// ============================================================================
// 2. POMOCNÉ FUNKCE PRO BARVY A VIDITELNOST VRSTEV
// ============================================================================

/**
 * Převede CSS řetězec barvy (rgb / rgba) na objekt { r, g, b, a }.
 */
function parseRGBA(colorStr) {
    if (!colorStr || colorStr === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const match = colorStr.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
    if (!match) return null;
    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1
    };
}

/**
 * Zjistí, zda má prvek neprůhledné pozadí, obrázek na pozadí nebo jde o multimediální prvek.
 */
function isOpaqueBackground(el, style) {
    const bg = parseRGBA(style.backgroundColor);
    const hasBgColor = bg !== null && bg.a > 0.1;
    const hasBgImage = style.backgroundImage && style.backgroundImage !== 'none';
    const isMedia = ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME'].includes(el.tagName);
    return hasBgColor || hasBgImage || isMedia;
}

/**
 * Projde rodiče směrem nahoru a najde skutečnou viditelnou barvu pozadí pod prvkem.
 */
function getEffectiveBackgroundColor(el) {
    let current = el;
    while (current && current !== document.documentElement) {
        const bg = parseRGBA(getCachedStyle(current).backgroundColor);
        if (bg && bg.a > 0.1) return bg;
        current = current.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
}

/**
 * Vypočítá součet rozdílů RGB složek mezi dvěma barvami (0 = identická barva).
 */
function colorDist(c1, c2) {
    if (!c1 || !c2) return 1000;
    return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

/**
 * Ověří, zda prvek zakrývající text není jen fixní/sticky navigační lišta stránky.
 */
function isFixedOrStickyOverlay(topEl, targetEl) {
    let current = topEl;
    while (current && current !== document.body && current !== document.documentElement) {
        if (current.contains(targetEl)) return false;
        const pos = getCachedStyle(current).position;
        if (pos === 'fixed' || pos === 'sticky') return true;
        current = current.parentElement;
    }
    return false;
}

/**
 * Ověří, zda má prvek zachycený raycastingem (nebo jeho obal) neprůhledné pozadí.
 */
function hasOpaqueCover(topEl, targetEl) {
    let current = topEl;
    while (current && current !== document.body && current !== document.documentElement) {
        if (current.contains(targetEl)) return false;
        if (isOpaqueBackground(current, getCachedStyle(current))) return true;
        current = current.parentElement;
    }
    return false;
}


// ============================================================================
// 3. FILTROVÁNÍ NEKOPÍROVATELNÉHO OBSAHU
// ============================================================================

/**
 * Rozhodne, zda prohlížeč daný prvek při výběru myší nebo Ctrl+C nikdy nezkopíruje.
 */
function isNonCopyable(el) {
    if (!el || el === document.documentElement) return false;
    if (nonCopyableCache.has(el)) return nonCopyableCache.get(el);

    const style = getCachedStyle(el);
    let result = false;

    if (['SELECT', 'OPTION', 'OPTGROUP', 'DATALIST', 'TEXTAREA', 'INPUT'].includes(el.tagName)) {
        result = true;
    } else if (style.userSelect === 'none' || style.webkitUserSelect === 'none') {
        result = true;
    } else if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || el.hidden) {
        result = true;
    } else if ((el.tagName === 'TR' || el.tagName === 'TBODY') && el.getBoundingClientRect().height === 0) {
        result = true;
    } else if (el.id === 'reftable') {
        const showRef = el.querySelector('input[name="SHOW_REF"]');
        if (showRef && !showRef.checked) {
            result = false;
        }
    } else if (el.parentElement) {
        const parent = el.parentElement;
        if (parent.tagName === 'DETAILS' && !parent.open && el.tagName !== 'SUMMARY') {
            result = true;
        } else if (parent.id === 'reftable') {
            const showRef = parent.querySelector('input[name="SHOW_REF"]');
            if (showRef && !showRef.checked && !el.contains(showRef)) {
                result = true;
            }
        } else {
            result = isNonCopyable(parent);
        }
    }

    nonCopyableCache.set(el, result);
    return result;
}

/**
 * Zjistí, zda je prvek kompletně odstřižen rodičem s nastaveným overflow: hidden / clip.
 */
function isClippedByOverflowParent(el, rect) {
    let current = el.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
        const cStyle = getCachedStyle(current);
        const ox = cStyle.overflowX;
        const oy = cStyle.overflowY;

        if (ox === 'hidden' || ox === 'clip' || oy === 'hidden' || oy === 'clip') {
            const cRect = current.getBoundingClientRect();
            if ((ox === 'hidden' || ox === 'clip') && (rect.right <= cRect.left || rect.left >= cRect.right)) {
                return true;
            }
            if ((oy === 'hidden' || oy === 'clip') && (rect.bottom <= cRect.top || rect.top >= cRect.bottom)) {
                return true;
            }
        }
        current = current.parentElement;
    }
    return false;
}


// ============================================================================
// 4. DETEKČNÍ PRAVIDLA (1–9)
// ============================================================================

/**
 * Otestuje jeden HTML element proti 9 kategoriím skrývání textu.
 */
function analyzeElement(el) {
    const style = getCachedStyle(el);
    const rect = el.getBoundingClientRect();
    const typesMap = new Map();

    const addType = (id, desc) => {
        if (!typesMap.has(id)) typesMap.set(id, { id, desc });
    };

    const opacity = parseFloat(style.opacity);
    const fg = parseRGBA(style.color);
    const isColorTransparent = fg !== null && fg.a < 0.05;

    // --- Typ 1: Záporný z-index ---
    const zIndex = parseInt(style.zIndex, 10);
    if (!isNaN(zIndex) && zIndex < 0) {
        addType(1, "Schováno pod textem (záporný z-index)");
    }

    // --- Typ 2: Odsunutí mimo viditelnou oblast stránky ---
    const docLeft = rect.left + window.scrollX;
    const docRight = rect.right + window.scrollX;
    const docTop = rect.top + window.scrollY;
    const docBottom = rect.bottom + window.scrollY;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

    const leftCss = parseFloat(style.left);
    const topCss = parseFloat(style.top);
    const rightCss = parseFloat(style.right);
    const marginLeftCss = parseFloat(style.marginLeft);
    const marginTopCss = parseFloat(style.marginTop);

    const isCssOffscreen =
        ((style.position === 'absolute' || style.position === 'fixed') && (
            (!isNaN(leftCss) && leftCss < -500) ||
            (!isNaN(topCss) && topCss < -500) ||
            (!isNaN(rightCss) && rightCss < -500)
        )) ||
        (!isNaN(marginLeftCss) && marginLeftCss < -500) ||
        (!isNaN(marginTopCss) && marginTopCss < -500) ||
        parseFloat(style.textIndent) < -99;

    const isPhysicallyOffscreen =
        docRight < 0 ||
        docBottom < 0 ||
        (docLeft < -50 && docRight <= 0) ||
        (docTop < -50 && docBottom <= 0) ||
        docLeft > viewportWidth + 500;

    if (isCssOffscreen || isPhysicallyOffscreen || isClippedByOverflowParent(el, rect)) {
        addType(2, "Prvek je odsunut mimo obrazovku nebo viditelnou oblast");
    }

    // --- Typ 3: Extrémní ořez (clip / clip-path) ---
    if ((style.clip !== 'auto' && style.clip !== '') || style.clipPath !== 'none') {
        addType(3, "Extrémní ořez (clip / clip-path)");
    }

    // --- Typ 4: Splývání barvy textu s barvou pozadí ---
    if (fg && !isColorTransparent && opacity > 0.1) {
        const bg = getEffectiveBackgroundColor(el);
        if (colorDist(fg, bg) < 15) {
            addType(4, "Barva textu neznatelně splývá s pozadím");
        }
    }

    // --- Typ 5: Zmenšení nebo 3D rotace na nulu (CSS transform) ---
    if (style.transform !== 'none' && (style.transform === 'matrix(0, 0, 0, 0, 0, 0)' || rect.width < 1 || rect.height < 1)) {
        addType(5, "Zmenšeno nebo otočeno hranou na nulu (transform: scale / rotate)");
    }

    // --- Typ 6: Průhlednost (opacity, rgba alfa kanál, CSS filter) ---
    if (opacity < 0.05 || isColorTransparent) {
        addType(6, `Téměř průhledné (Opacity: ${opacity})`);
    }
    if (style.filter && style.filter.includes('opacity') && style.filter.match(/opacity\(\s*0\.?\d*\s*\)/)) {
        addType(6, "Neviditelné kvůli CSS filter: opacity");
    }

    // --- Typ 7: Nulová velikost boxu (width / height 0 s ořezem) ---
    if ((rect.width <= 1 || rect.height <= 1) && (style.overflow === 'hidden' || style.overflow === 'clip')) {
        addType(7, "Nulová výška/šířka boxu (width/height 0 + overflow: hidden)");
    }

    // --- Typ 8: Nulové nebo mikroskopické písmo ---
    const fontSize = parseFloat(style.fontSize);
    if (fontSize < 3) {
        addType(8, `Mikro písmo nebo nulové písmo (${fontSize}px)`);
    }

    // --- Typ 9: Překrytí jiným prvkem (Overlay vrstva / CSS Grid) ---
    if (opacity > 0.1 && isElementCovered(el, style, rect)) {
        addType(9, "Na textu leží jiný prvek (Z-index překrytí, Grid, Absolute overlay)");
    }

    return Array.from(typesMap.values());
}

/**
 * Ověří, zda text není zakrytý jiným prvkem (přes raycasting ve viewportu nebo kolizi sourozenců).
 */
function isElementCovered(el, style, rect) {
    // A) Prvek má viditelné rozměry a je v aktuálním výřezu -> přesný raycasting
    if (
        rect.width >= 1 &&
        rect.height >= 1 &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    ) {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(x, y);
        return Boolean(
            topEl &&
            topEl !== el &&
            !el.contains(topEl) &&
            !topEl.contains(el) &&
            !isFixedOrStickyOverlay(topEl, el) &&
            hasOpaqueCover(topEl, el)
        );
    }

    // B) Záložní kontrola sourozenců (pro prvky mimo výřez obrazovky nebo zmenšené pod overlay vrstvou)
    if (!el.parentElement) return false;

    const parentRect = el.parentElement.getBoundingClientRect();
    const targetRect = (rect.width >= 1 && rect.height >= 1) ? rect : parentRect;
    if (targetRect.width < 1 || targetRect.height < 1) return false;

    const parentDisplay = getCachedStyle(el.parentElement).display;
    const isGridParent = parentDisplay === 'grid' || parentDisplay === 'inline-grid';
    const siblings = el.parentElement.children;

    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === el) continue;

        const sStyle = getCachedStyle(sibling);
        if (parseFloat(sStyle.opacity) <= 0.1 || sStyle.visibility === 'hidden' || sStyle.display === 'none') {
            continue;
        }
        if (!isOpaqueBackground(sibling, sStyle)) continue;

        const canOverlapLayout =
            sStyle.position !== 'static' ||
            style.position !== 'static' ||
            isGridParent ||
            sStyle.transform !== 'none' ||
            parseFloat(sStyle.marginTop) < 0 ||
            parseFloat(sStyle.marginLeft) < 0;

        if (!canOverlapLayout) continue;

        const sRect = sibling.getBoundingClientRect();
        if (sRect.width <= 0 || sRect.height <= 0) continue;

        const overlapX = Math.max(0, Math.min(targetRect.right, sRect.right) - Math.max(targetRect.left, sRect.left));
        const overlapY = Math.max(0, Math.min(targetRect.bottom, sRect.bottom) - Math.max(targetRect.top, sRect.top));

        if (overlapX > 0 && overlapY > 0) {
            const overlapArea = overlapX * overlapY;
            const myArea = targetRect.width * targetRect.height;

            if (myArea > 0 && (overlapArea / myArea) > 0.8) {
                const myZ = parseInt(style.zIndex, 10) || 0;
                const sZ = parseInt(sStyle.zIndex, 10) || 0;

                const siblingOnTop =
                    sZ > myZ ||
                    (sZ === myZ && Boolean(el.compareDocumentPosition(sibling) & Node.DOCUMENT_POSITION_FOLLOWING));

                if (siblingOnTop) return true;
            }
        }
    }

    return false;
}


// ============================================================================
// 5. VIZUÁLNÍ DEMASKOVÁNÍ NEBO ODSTRANĚNÍ
// ============================================================================

/**
 * Zviditelní nalezený skrytý prvek na stránce (nebo ho rovnou smaže podle nastavení).
 */
function demaskElement(el, action) {
    if (action === 'remove') {
        el.remove();
        return;
    }

    const overrides = {
        'font-size': '16px',
        'color': 'red',
        'background-color': 'yellow',
        'opacity': '1',
        'visibility': 'visible',
        'filter': 'none',
        'position': 'relative',
        'left': 'auto',
        'right': 'auto',
        'top': 'auto',
        'bottom': 'auto',
        'width': 'auto',
        'height': 'auto',
        'overflow': 'visible',
        'clip': 'auto',
        'clip-path': 'none',
        'transform': 'none',
        'z-index': '2147483647',
        'display': 'inline-block',
        'border': '2px solid red',
        'cursor': 'pointer',
        'padding': '2px 4px',
        'margin': '2px',
        'text-indent': '0'
    };

    for (const [prop, value] of Object.entries(overrides)) {
        el.style.setProperty(prop, value, 'important');
    }

    el.title = "⚠️ Skrytý text pro AI! KLIKNUTÍM HO SMAŽETE.";
    el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.remove();
    }, { once: true });
}


// ============================================================================
// 6. HLAVNÍ SKENOVACÍ PROCES A KOMUNIKACE S POPUPEM
// ============================================================================

/**
 * Projde všechny viditelné textové uzly na stránce, vyhodnotí je a odešle výsledky do rozšíření.
 */
function checkPage(settings) {
    const siteKey = getSiteKey();
    const isSiteEnabled = settings.defaultOff
        ? (settings.enabledSites && settings.enabledSites.includes(siteKey))
        : !(settings.disabledSites && settings.disabledSites.includes(siteKey));

    if (!settings.enabled || !isSiteEnabled) {
        try { chrome.runtime.sendMessage({ type: "CHECKER_DISABLED" }); } catch (e) {}
        return;
    }

    styleCache = new WeakMap();
    nonCopyableCache = new WeakMap();

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const checkedElements = new Set();
    const hiddenEntries = [];
    let node;

    while ((node = walker.nextNode())) {
        if (node.nodeValue.trim().length === 0) continue;

        const parent = node.parentElement;
        if (!parent || checkedElements.has(parent)) continue;
        checkedElements.add(parent);

        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
        if (isNonCopyable(parent)) continue;

        const text = parent.textContent.replace(/\s+/g, ' ').trim();
        if (text.length === 0) continue;

        const types = analyzeElement(parent);
        if (types.length > 0) {
            hiddenEntries.push({ el: parent, text, types });
        }
    }

    detectedItems = hiddenEntries.map((entry, index) => {
        entry.el.dataset.injectionId = index;
        demaskElement(entry.el, settings.action);
        return {
            id: index,
            text: entry.text,
            types: entry.types
        };
    });

    try {
        chrome.runtime.sendMessage({
            type: "INJECTION_FOUND",
            count: detectedItems.length
        });
    } catch (e) {}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_INJECTIONS") {
        sendResponse({ items: detectedItems });
    } else if (request.type === "SCROLL_TO") {
        const el = document.querySelector(`[data-injection-id="${request.id}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const oldOutline = el.style.outline;
            el.style.outline = "4px solid blue";
            setTimeout(() => { el.style.outline = oldOutline; }, 1500);
        }
    }
});

function init() {
    chrome.storage.local.get({
        enabled: true,
        action: 'highlight',
        defaultOff: false,
        disabledSites: [],
        enabledSites: []
    }, checkPage);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
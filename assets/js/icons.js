// Centralized Icon System - Inline SVG Icons
// Zero external requests, < 5KB payload, instant rendering

const ICONS = {
    // Navigation & UI Icons
    'menu-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>',

    'close-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144M368 144L144 368"/></svg>',

    'sunny-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M256 48v48M256 416v48M403.08 108.92l-33.94 33.94M142.86 369.14l-33.94 33.94M464 256h-48M96 256H48M403.08 403.08l-33.94-33.94M142.86 142.86l-33.94-33.94"/><circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/></svg>',

    'moon-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>',

    // Content Icons
    'calendar-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" x="48" y="80" width="416" height="384" rx="48"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32M384 48v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>',

    'arrow-forward-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M268 112l144 144-144 144M392 256H100"/></svg>',

    'book-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0116 16v288a16 16 0 01-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0116-16c131.57.59 192 32.84 208 96zM256 160v288" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>',

    'pricetags-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M403.29 32H280.36a14.46 14.46 0 00-10.2 4.2L24.4 281.9a28.85 28.85 0 000 40.7l117 117a28.86 28.86 0 0040.71 0L427.8 194a14.46 14.46 0 004.2-10.2v-123A28.66 28.66 0 00403.29 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M352 144a32 32 0 1132-32 32 32 0 01-32 32z"/><path d="M230 480l262-262a13.81 13.81 0 004-10V80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>',

    'search-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>',

    // Social Icons
    'logo-github': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 32C132.3 32 32 134.9 32 261.7c0 101.5 64.2 187.5 153.2 217.9a17.56 17.56 0 003.8.4c8.3 0 11.5-6.1 11.5-11.4 0-5.5-.2-19.9-.3-39.1a102.4 102.4 0 01-22.6 2.7c-43.1 0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1 1.4-14.1h.1c22.5 2 34.3 23.8 34.3 23.8 11.2 19.6 26.2 25.1 39.6 25.1a63 63 0 0025.6-6c2-14.8 7.8-24.9 14.2-30.7-49.7-5.8-102-25.5-102-113.5 0-25.1 8.7-45.6 23-61.6-2.3-5.8-10-29.2 2.2-60.8a18.64 18.64 0 015-.5c8.1 0 26.4 3.1 56.6 24.1a208.21 208.21 0 01112.2 0c30.2-21 48.5-24.1 56.6-24.1a18.64 18.64 0 015 .5c12.2 31.6 4.5 55 2.2 60.8 14.3 16.1 23 36.6 23 61.6 0 88.2-52.4 107.6-102.3 113.3 8 7.1 15.2 21.1 15.2 42.5 0 30.7-.3 55.5-.3 63 0 5.4 3.1 11.5 11.4 11.5a19.35 19.35 0 004-.4C415.9 449.2 480 363.1 480 261.7 480 134.9 379.7 32 256 32z" fill="currentColor"/></svg>',

    'logo-linkedin': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M444.17 32H70.28C49.85 32 32 46.7 32 66.89v374.72C32 461.91 49.85 480 70.28 480h373.78c20.54 0 35.94-18.21 35.94-38.39V66.89C480.12 46.7 464.6 32 444.17 32zm-273.3 373.43h-64.18V205.88h64.18zM141 175.54h-.46c-20.54 0-33.84-15.29-33.84-34.43 0-19.49 13.65-34.42 34.65-34.42s33.85 14.82 34.31 34.42c-.01 19.14-13.31 34.43-34.66 34.43zm264.43 229.89h-64.18V296.32c0-26.14-9.34-44-32.56-44-17.74 0-28.24 12-32.91 23.69-1.75 4.2-2.22 9.92-2.22 15.76v113.66h-64.18V205.88h64.18v27.77c9.34-13.3 23.93-32.44 57.88-32.44 42.13 0 74 27.77 74 87.64z" fill="currentColor"/></svg>',

    'logo-facebook': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M480 257.35c0-123.7-100.3-224-224-224s-224 100.3-224 224c0 111.8 81.9 204.47 189 221.29V322.12h-56.89v-64.77H221V208c0-56.13 33.45-87.16 84.61-87.16 24.51 0 50.15 4.38 50.15 4.38v55.13H327.5c-27.81 0-36.51 17.26-36.51 35v42h62.12l-9.92 64.77H291v156.54c107.1-16.81 189-109.48 189-221.31z" fill="currentColor"/></svg>',

    'logo-instagram': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z" fill="currentColor"/><path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z" fill="currentColor"/></svg>',

    // Tech/Brand Icons
    'logo-react': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M410.66 180.72q-7.67-2.62-15.45-4.88 1.29-5.25 2.38-10.56c11.7-56.9 4.05-102.74-22.06-117.83-25-14.48-66 .61-107.36 36.69q-6.1 5.34-11.95 11-3.9-3.76-8-7.36c-43.35-38.58-86.8-54.83-112.88-39.69-25 14.51-32.43 57.6-21.9 111.53q1.58 8 3.55 15.93c-6.15 1.75-12.09 3.62-17.77 5.6C48.46 198.9 16 226.73 16 255.59c0 29.82 34.84 59.72 87.77 77.85q6.44 2.19 13 4.07Q114.64 346 113 354.68c-10.13 52.76-2.39 95.06 22.75 109.49 25.77 14.81 69-.41 111.14-37.31q5-4.38 10-9.25 6.32 6.11 13 11.86c40.8 35.18 81.09 49.39 106 34.93 25.75-14.94 34.12-60.14 23.25-115.13q-1.25-6.3-2.88-12.86 4.56-1.35 8.93-2.79c55-18.27 90.83-47.81 90.83-78-.02-29-33.52-57.01-85.36-74.9zm-129-81.08c35.43-30.91 68.55-43.11 83.65-34.39 16.07 9.29 22.32 46.75 12.22 95.88q-1 4.8-2.16 9.57a487.83 487.83 0 00-64.18-10.16 481.27 481.27 0 00-40.57-50.75q5.38-5.22 11.02-10.15zM157.73 280.25q6.51 12.6 13.61 24.89 7.23 12.54 15.07 24.71a435.28 435.28 0 01-44.24-7.13C146.41 309 151.63 294.75 157.73 280.25zm0-48.33c-6-14.19-11.08-28.15-15.25-41.63 13.7-3.07 28.3-5.58 43.52-7.48q-7.65 11.94-14.72 24.23T157.7 231.92zm10.9 24.17q9.48-19.77 20.42-38.78 10.93-19 23.27-37.13c14.28-1.08 28.92-1.65 43.71-1.65s29.52.57 43.79 1.66q12.21 18.09 23.13 37t20.69 38.6Q334 275.63 323 294.73q-10.91 19-23 37.24c-14.25 1-29 1.55-44 1.55s-29.47-.47-43.46-1.38q-12.43-18.19-23.46-37.29T168.6 256.09zM340.75 305q7.25-12.58 13.92-25.49a440.41 440.41 0 0116.12 42.32 434.44 434.44 0 01-44.79 7.65Q333.62 317.39 340.75 305zm13.72-73.07q-6.64-12.65-13.81-25-7-12.18-14.59-24.06c15.31 1.94 30 4.52 43.77 7.67A439.89 439.89 0 01354.47 231.93zm-116.44-58.68c-4.4 0-8.74.06-13 .19q12.32-14.85 25.88-28.58a434.86 434.86 0 0112.72 28.29Q251.39 173.25 238.03 173.25zm-133.31-90.59c16.07-9.29 51.57 3.81 89.2 35.78q4.83 4.1 9.69 8.75a474.65 474.65 0 00-40.8 50.87 478.56 478.56 0 00-64.88 10.07q-1.14-4.52-2.11-9c-9.29-43.24-3.71-79.2 8.9-96.47zM94.92 345.2C64.13 334.29 37.6 316.4 37.6 255.59c0-23.23 22.89-41.8 59.63-56.29q7.62-3 15.68-5.61a493.54 493.54 0 0023.4 60.75 502.46 502.46 0 00-23.85 61.85q-5.59-1.56-11.54-3.09zm45.22 58.63c-7.68-43.8-2.48-78.67 13.11-87.07a18.45 18.45 0 018.06-1.8c16.29 0 43.78 13.77 74.54 41q5.58 4.93 11.11 10.37a489.17 489.17 0 00-40.95 50.4 487.23 487.23 0 00-64.48 10.68q-1.55-7.39-2.72-14.72-.68-4.42-1.29-8.86zM281.84 98.13c-17.67-19.26-35.27-35.77-52.27-49.07 25.25 0 50.09 5.38 73.81 15.89a494.72 494.72 0 00-21.54 33.18zM256.05 362.4q-18.1-15.24-35.44-33.32h35.48c11.88 0 23.67-.67 35.33-1.91q-17.27 17.85-35.37 35.23zm93.11-59.7c-20.8 2.7-42.15 4-63.28 4-21.57 0-43.42-1.35-64.65-4.1q-13.19-21.67-24.48-44.49T170.1 215.5q5.28-23.65 16.32-46.37t24.27-44.27c21.3-2.76 43.15-4.1 64.77-4.1 21.76 0 43.73 1.37 65.28 4.15q11.17 20.31 24.79 44.51t16.68 42.64q-5.39 23.7-16.64 46.42T349.16 302.7zm32.53-14.87c-8.81-15.37-18.29-31.08-28.3-46.89a439.18 439.18 0 0023.34-60.62 430.74 430.74 0 0129.33 17.52c-6.79 16.41-15.18 32.56-24.37 48.99zm53.06-63.85c-3.47-1.82-7.17-3.59-11-5.34a466.62 466.62 0 00-22.43-58.95 467.45 467.45 0 0022.35-59.09q10.32 4.91 19.31 10.15c36.76 14.5 59.63 33.06 59.63 56.3-.03 23.52-23.19 42.42-67.86 56.93z" fill="currentColor"/><path d="M256 298.55a43 43 0 10-42.86-43 42.91 42.91 0 0042.86 43z" fill="currentColor"/></svg>',

    'logo-python': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M314 36.38c-18.59-3.06-45.8-4.47-64.27-4.38a311.09 311.09 0 00-51.66 4.38c-45.74 8-54.07 24.7-54.07 55.54V128h109v15H94.42c-31.49 0-59 18.92-67.62 54.88-9.85 41.34-10.29 67.13 0 110.14 7.66 32 25.92 54.88 57.41 54.88h37.1v-49.24c0-35.76 30.91-67.32 67.62-67.32h108.88c30.46 0 54.86-24.8 54.86-55.38V91.92c.03-29.69-24.97-52.03-54.67-55.54zM194.1 105.5a20.37 20.37 0 1120.3-20.5 20.29 20.29 0 01-20.3 20.5z" fill="currentColor"/><path d="M475.28 178c-8-33.33-23.06-54.88-54.55-54.88h-40.15v48.62c0 37.44-31.74 68.94-67.62 68.94H204.1c-29.94 0-54.07 25.38-54.07 55.38v103.61c0 29.69 25.82 47.13 54.07 55.37 33.87 9.87 66.36 11.66 108.88 0 28.24-7.74 54.86-23.36 54.86-55.37v-36.14H258.89v-15h163.75c31.49 0 43.2-21.95 54.86-54.88 12-33.87 11.5-66.41 0-110.13zM317.8 406.44a20.37 20.37 0 11-20.3 20.5 20.29 20.29 0 0120.3-20.5z" fill="currentColor"/></svg>',

    'logo-angular': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M213.57 256h84.85l-42.43-89.36L213.57 256z" fill="currentColor"/><path d="M256 32L32 112l46.12 272L256 480l177.75-96L480 112zm88 320l-26.59-56H194.58L168 352h-40L256 72l128 280z" fill="currentColor"/></svg>',

    'logo-javascript': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 32v448h448V32zm240 348c0 43.61-25.76 64.87-63.05 64.87-33.68 0-53.23-17.44-63.15-38.49l34.28-20.75c6.61 11.73 12.63 21.65 27.15 21.65 13.83 0 22.6-5.41 22.6-26.47V240h42.17zm99.05 63.33c-39.09 0-64.35-17.64-76.68-42L329 382c9 14.74 20.75 24.56 41.5 24.56 17.44 0 27.57-7.72 27.57-19.75 0-14.43-10.43-19.54-29.68-28l-10.52-4.52c-30.38-12.92-50.52-29.16-50.52-63.45 0-31.57 24.05-54.63 61.64-54.63 26.77 0 46 8.32 59.85 32.68L396 290c-7.22-12.93-15-18-27.16-18-12.33 0-20.15 7.82-20.15 18 0 12.63 7.82 17.74 25.86 25.56l10.52 4.51c35.79 15.34 55.94 31 55.94 66.16.01 37.9-29.76 57.1-69.76 57.1z" fill="currentColor"/></svg>',

    // Action Icons
    'print-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M384 368h24a40.12 40.12 0 0040-40V168a40.12 40.12 0 00-40-40H104a40.12 40.12 0 00-40 40v160a40.12 40.12 0 0040 40h24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><rect x="128" y="240" width="256" height="208" rx="24.32" ry="24.32" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path d="M384 128v-24a40.12 40.12 0 00-40-40H168a40.12 40.12 0 00-40 40v24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><circle cx="392" cy="184" r="24"/></svg>',

    'globe-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34M394.67 394.67c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M256 48v416M464 256H48"/></svg>',

    'code-slash-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M160 368L32 256l128-112M352 368l128-112-128-112M304 96l-96 320"/></svg>',

    'open-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 64h112v112M224 288L440 72"/></svg>'
};

// Icon rendering function
function renderIcon(name, className = '') {
    const svg = ICONS[name];
    if (!svg) {
        console.warn(`Icon "${name}" not found`);
        return '';
    }

    // Add class to SVG if provided
    if (className) {
        return svg.replace('<svg', `<svg class="${className}"`);
    }

    return svg;
}

// Replace all ion-icon elements with inline SVG on page load
function replaceIonIcons() {
    const ionIcons = document.querySelectorAll('ion-icon');

    ionIcons.forEach(icon => {
        const name = icon.getAttribute('name');
        const className = icon.className || '';

        if (name && ICONS[name]) {
            const wrapper = document.createElement('span');
            wrapper.className = `icon ${className}`;
            wrapper.innerHTML = renderIcon(name);
            wrapper.style.display = 'inline-block';
            wrapper.style.width = '1em';
            wrapper.style.height = '1em';
            wrapper.style.verticalAlign = 'middle';

            // Copy any inline styles
            if (icon.style.cssText) {
                wrapper.style.cssText += icon.style.cssText;
            }

            icon.parentNode.replaceChild(wrapper, icon);
        }
    });
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceIonIcons);
} else {
    replaceIonIcons();
}

// Export for use in templates
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderIcon, ICONS };
}

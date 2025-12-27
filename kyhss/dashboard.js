// sidebar.js
// ----------------------------------------------------
// RESPONSIVE SIDEBAR CONTROLLER
// Mobile: Off-canvas
// Desktop: Collapse / Expand with persistence
// ----------------------------------------------------

(() => {
    'use strict';

    /* -----------------------------------
     * 1. DOM REFERENCES (SAFE)
     * ----------------------------------- */
    const dom = {
        sidebar: document.getElementById('sidebar'),
        nav: document.getElementById('sidebar-nav'),
        mobileOpenBtn: document.getElementById('sidebar-toggle-btn'),
        mobileCloseBtn: document.getElementById('sidebar-close-btn'),
        overlay: document.getElementById('sidebar-overlay'),
        desktopToggle: document.getElementById('desktop-sidebar-toggle')
    };

    if (!dom.sidebar || !dom.nav) {
        console.warn('[Sidebar] Required elements not found');
        return;
    }

    /* -----------------------------------
     * 2. MOBILE SIDEBAR
     * ----------------------------------- */
    function openMobileSidebar() {
        dom.sidebar.classList.add('show');
        dom.overlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        dom.sidebar.classList.remove('show');
        dom.overlay?.classList.remove('show');
        document.body.style.overflow = '';
    }

    /* -----------------------------------
     * 3. DESKTOP COLLAPSE
     * ----------------------------------- */
    function toggleDesktopSidebar() {
        const body = document.body;
        body.classList.toggle('sidebar-collapsed');

        const collapsed = body.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebarState', collapsed ? 'collapsed' : 'expanded');
    }

    function restoreDesktopState() {
        try {
            const state = localStorage.getItem('sidebarState');
            if (state === 'collapsed') {
                document.body.classList.add('sidebar-collapsed');
            }
        } catch (err) {
            console.warn('[Sidebar] State restore failed', err);
        }
    }

    /* -----------------------------------
     * 4. RENDER SIDEBAR NAVIGATION
     * ----------------------------------- */
    window.renderSidebar = (items = []) => {
        if (!Array.isArray(items)) return;

        dom.nav.innerHTML = items.map(item => `
            <a href="#${item.id}"
               id="nav-${item.id}"
               class="nav-links"
               title="${item.text}"
               aria-label="${item.text}">
                <i class="fas ${item.icon}"></i>
                <span class="nav-text">${item.text}</span>
            </a>
        `).join('');

        items.forEach(item => {
            const el = document.getElementById(`nav-${item.id}`);
            if (!el) return;

           el.addEventListener('click', e => {
    e.preventDefault();

    setActiveSidebarLink(item.id); // ✅ FIX

    try {
        if (item.id === 'add-student') window.studentToEdit = null;
        window.navigateTo?.(item.id);
    } catch (err) {
        console.error(err);
    }

    if (window.innerWidth < 992) closeMobileSidebar();
});

        });
    };

    /* -----------------------------------
     * 5. EVENT BINDINGS
     * ----------------------------------- */
    dom.mobileOpenBtn?.addEventListener('click', openMobileSidebar);
    dom.mobileCloseBtn?.addEventListener('click', closeMobileSidebar);
    dom.overlay?.addEventListener('click', closeMobileSidebar);
    dom.desktopToggle?.addEventListener('click', toggleDesktopSidebar);

    restoreDesktopState();

})();

function setActiveSidebarLink(activeId) {
    console.log('setActiveSidebarLink called with activeId:', activeId);
    document.querySelectorAll('#sidebar .nav-links').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.getElementById(`nav-${activeId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}
setActiveSidebarLink('dashboard'); // default active

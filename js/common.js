/**
 * Common utilities, navbar rendering, toast / modal / dialog,
 * theme switching, route helpers.
 */
(function (global) {
    'use strict';

    /* ============================================================
     * Theme
     * ============================================================ */
    function applyTheme() {
        const settings = Store.getSettings();
        const theme = settings.theme || 'light';
        if (theme === 'dark') document.body.classList.add('theme-dark');
        else document.body.classList.remove('theme-dark');
        return theme;
    }

    function toggleTheme() {
        const settings = Store.getSettings();
        settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
        Store.setSettings(settings);
        applyTheme();
        showToast(settings.theme === 'dark' ? '已切换到夜间模式 🌙' : '已切换到日间模式 ☀️');
    }

    /* ============================================================
     * Time helpers
     * ============================================================ */
    function timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return '刚刚';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + ' 分钟前';
        const hr = Math.floor(min / 60);
        if (hr < 24) return hr + ' 小时前';
        const day = Math.floor(hr / 24);
        if (day < 7) return day + ' 天前';
        const d = new Date(timestamp);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function formatTime(timestamp) {
        const d = new Date(timestamp);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
             + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    /* ============================================================
     * URL params
     * ============================================================ */
    function getQueryParam(name) {
        return new URLSearchParams(location.search).get(name);
    }

    /* ============================================================
     * HTML escape
     * ============================================================ */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* link tags inside text -> #tag# */
    function renderContentText(text) {
        if (!text) return '';
        const escaped = escapeHtml(text);
        // Linkify hashtags like #xxx#
        return escaped.replace(/#([^#\s]{1,20})#/g, function (m, p) {
            return '<a class="hashtag" href="search.html?q=' + encodeURIComponent('#' + p + '#') + '">#' + escapeHtml(p) + '#</a>';
        });
    }

    /* ============================================================
     * Toast
     * ============================================================ */
    function ensureToastContainer() {
        let c = document.querySelector('.toast-container');
        if (!c) {
            c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(message, type) {
        const c = ensureToastContainer();
        const t = document.createElement('div');
        t.className = 'toast ' + (type || '');
        t.textContent = message;
        c.appendChild(t);
        setTimeout(() => t.remove(), 2800);
    }

    /* ============================================================
     * Confirm Dialog
     * ============================================================ */
    function confirmDialog(message, opts) {
        opts = opts || {};
        return new Promise(resolve => {
            const mask = document.createElement('div');
            mask.className = 'modal-mask show';
            mask.innerHTML = '' +
                '<div class="modal" style="max-width:380px;">' +
                '  <div class="modal-header"><div class="modal-title">' + escapeHtml(opts.title || '提示') + '</div></div>' +
                '  <div>' + escapeHtml(message) + '</div>' +
                '  <div class="modal-footer">' +
                '    <button class="btn btn-ghost" data-act="cancel">取消</button>' +
                '    <button class="btn btn-primary" data-act="ok">确定</button>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(mask);
            mask.addEventListener('click', e => {
                if (e.target === mask) { mask.remove(); resolve(false); }
                const act = e.target.dataset && e.target.dataset.act;
                if (act === 'ok') { mask.remove(); resolve(true); }
                if (act === 'cancel') { mask.remove(); resolve(false); }
            });
        });
    }

    /* ============================================================
     * Navbar
     * ============================================================ */
    function renderNavbar(activeKey) {
        const session = Store.getCurrentUser();
        const nav = document.getElementById('app-navbar');
        if (!nav) return;

        const menu = [
            { key: 'home', text: '首页', href: 'index.html' },
            { key: 'publish', text: '发布', href: 'publish.html', auth: true },
            { key: 'messages', text: '消息', href: 'messages.html', auth: true },
            { key: 'search', text: '发现', href: 'search.html' }
        ];
        if (session && session.role === 'admin') {
            menu.push({ key: 'admin', text: '管理后台', href: 'admin.html' });
        }
        const menuHtml = menu
            .filter(m => !m.auth || session)
            .map(m => '<a href="' + m.href + '" class="' + (m.key === activeKey ? 'active' : '') + '">' + m.text + '</a>')
            .join('');

        let rightHtml;
        if (session) {
            const avatar = session.avatar || defaultAvatar(session.nickname);
            rightHtml =
                '<button class="theme-toggle" id="theme-toggle" title="切换主题">🌓</button>' +
                '<div class="user-dropdown" id="user-dropdown">' +
                '  <img class="user-avatar" src="' + avatar + '" alt="me" />' +
                '  <div class="user-dropdown-menu">' +
                '    <a href="profile.html">👤 我的主页</a>' +
                '    <a href="profile.html?tab=edit">⚙️ 编辑资料</a>' +
                '    <a href="profile.html?tab=favorites">⭐ 我的收藏</a>' +
                (session.role === 'admin' ? '<a href="admin.html">🛡️ 管理后台</a>' : '') +
                '    <a href="javascript:void(0)" id="logout-btn">🚪 退出登录</a>' +
                '  </div>' +
                '</div>';
        } else {
            rightHtml =
                '<button class="theme-toggle" id="theme-toggle" title="切换主题">🌓</button>' +
                '<a href="login.html" class="btn btn-outline btn-sm">登录</a>' +
                '<a href="register.html" class="btn btn-primary btn-sm">注册</a>';
        }

        nav.innerHTML =
            '<div class="navbar-inner container">' +
            '  <a href="index.html" class="navbar-logo">' +
            '    <span class="logo-icon">M</span><span>萌萌校园圈</span>' +
            '  </a>' +
            '  <nav class="navbar-menu">' + menuHtml + '</nav>' +
            '  <div class="navbar-search">' +
            '    <input type="text" id="navbar-search-input" placeholder="搜索动态/话题/同学..." />' +
            '  </div>' +
            '  <div class="navbar-actions">' + rightHtml + '</div>' +
            '</div>';

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.querySelector('.user-avatar').addEventListener('click', e => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
            document.addEventListener('click', () => dropdown.classList.remove('open'));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const ok = await confirmDialog('确定要退出登录吗？');
                if (!ok) return;
                Store.clearSession();
                showToast('已退出登录');
                setTimeout(() => location.href = 'index.html', 600);
            });
        }

        const searchInput = document.getElementById('navbar-search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    const q = searchInput.value.trim();
                    location.href = 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
                }
            });
        }
    }

    /* ============================================================
     * Default avatar (svg, gradient + initial)
     * ============================================================ */
    function defaultAvatar(name) {
        const initial = (name || '?').charAt(0).toUpperCase();
        const palette = [
            ['#ff8a8a', '#ff5277'],
            ['#7be8b1', '#18b566'],
            ['#a695ff', '#6c63ff'],
            ['#ffb673', '#ff7e3d'],
            ['#73c5ff', '#3d8aff'],
            ['#ffd166', '#f4a23b']
        ];
        const idx = (name ? name.charCodeAt(0) : 0) % palette.length;
        const [c1, c2] = palette[idx];
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="' + c1 + '"/>' +
            '<stop offset="100%" stop-color="' + c2 + '"/>' +
            '</linearGradient></defs>' +
            '<rect width="120" height="120" fill="url(#g)"/>' +
            '<text x="50%" y="55%" text-anchor="middle" font-size="56" fill="#fff" ' +
            'font-family="Helvetica,Arial,sans-serif" font-weight="700">' + initial + '</text>' +
            '</svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    /* ============================================================
     * File -> base64
     * ============================================================ */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /* ============================================================
     * Auth guard
     * ============================================================ */
    function requireLogin(redirect) {
        const session = Store.getCurrentUser();
        if (!session) {
            showToast('请先登录', 'warning');
            setTimeout(() => location.href = 'login.html?redirect=' + encodeURIComponent(redirect || location.pathname + location.search), 800);
            return null;
        }
        if (session.status === 'banned') {
            showToast('账号已被封禁', 'error');
            Store.clearSession();
            setTimeout(() => location.href = 'login.html', 1000);
            return null;
        }
        // refresh active timestamp
        Store.updateUser(session.id, { lastActiveAt: Date.now() });
        return session;
    }

    /* ============================================================
     * Lightbox (image preview)
     * ============================================================ */
    function showLightbox(src) {
        let box = document.querySelector('.lightbox');
        if (!box) {
            box = document.createElement('div');
            box.className = 'lightbox';
            box.innerHTML = '<img alt="preview" />';
            box.addEventListener('click', () => box.classList.remove('show'));
            document.body.appendChild(box);
        }
        box.querySelector('img').src = src;
        box.classList.add('show');
    }

    /* ============================================================
     * Modal
     * ============================================================ */
    function openModal(html) {
        const mask = document.createElement('div');
        mask.className = 'modal-mask show';
        mask.innerHTML = '<div class="modal">' + html + '</div>';
        mask.addEventListener('click', e => {
            if (e.target === mask) mask.remove();
            if (e.target.classList.contains('modal-close')) mask.remove();
        });
        document.body.appendChild(mask);
        return mask;
    }

    /* ============================================================
     * Visibility filter
     * ============================================================ */
    function canViewPost(post, viewer) {
        if (post.deleted) return false;
        if (post.visibility === 'public') return true;
        if (!viewer) return false;
        if (viewer.id === post.authorId) return true;
        if (viewer.role === 'admin') return true;
        if (post.visibility === 'private') return false;
        if (post.visibility === 'friends') {
            // friend: mutual follow
            return Store.isFollowing(viewer.id, post.authorId) &&
                   Store.isFollowing(post.authorId, viewer.id);
        }
        return false;
    }

    /* ============================================================
     * Footer
     * ============================================================ */
    function renderFooter() {
        const f = document.getElementById('app-footer');
        if (!f) return;
        f.innerHTML = '<div class="container">© ' + new Date().getFullYear()
            + ' 萌萌校园圈 · 基于 Web 的编程课程项目 · 团队作品仅供学习演示</div>';
    }

    /* ============================================================
     * Init runs once on every page
     * ============================================================ */
    function initPage(activeKey) {
        applyTheme();
        renderNavbar(activeKey);
        renderFooter();

        // initialize seed data once
        if (typeof seedData === 'function') seedData();
    }

    /* ============================================================
     * Public
     * ============================================================ */
    global.UI = {
        applyTheme, toggleTheme,
        timeAgo, formatTime,
        getQueryParam, escapeHtml, renderContentText,
        showToast, confirmDialog, openModal,
        renderNavbar, renderFooter, initPage,
        defaultAvatar, fileToBase64,
        requireLogin, showLightbox, canViewPost
    };
})(window);

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
        applyBackground();
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
     * Background preference
     * ============================================================ */
    const BACKGROUND_MODES = ['fluid', 'aurora', 'bubbles', 'grid', 'minimal'];
    const BACKGROUND_LABELS = {
        fluid: '流体渐变',
        aurora: '极光流动',
        bubbles: '气泡漂浮',
        grid: '星点网格',
        minimal: '简洁背景'
    };

    function getBackgroundMode() {
        const settings = Store.getSettings();
        return BACKGROUND_MODES.includes(settings.background) ? settings.background : 'fluid';
    }

    function applyBackground() {
        const mode = getBackgroundMode();
        document.body.classList.remove('fluid-bg-ready', 'bg-fluid', 'bg-aurora', 'bg-bubbles', 'bg-grid', 'bg-minimal');
        document.body.classList.add('bg-' + mode);

        const canvas = document.querySelector('.fluid-bg-canvas');
        if (canvas) canvas.hidden = true;
        if (mode === 'fluid') {
            installFluidBackground();
            const activeCanvas = document.querySelector('.fluid-bg-canvas');
            if (activeCanvas) activeCanvas.hidden = false;
            document.body.classList.add('fluid-bg-ready');
        }
        return mode;
    }

    function setBackgroundMode(mode) {
        if (!BACKGROUND_MODES.includes(mode)) mode = 'fluid';
        const settings = Store.getSettings();
        settings.background = mode;
        Store.setSettings(settings);
        applyBackground();
        showToast('已切换为' + BACKGROUND_LABELS[mode], 'success');
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
                '<button class="theme-toggle" id="theme-toggle" title="切换主题" aria-label="切换主题"></button>' +
                '<div class="user-dropdown" id="user-dropdown">' +
                '  <img class="user-avatar" src="' + avatar + '" alt="me" />' +
                '  <div class="user-dropdown-menu">' +
                '    <a href="profile.html">我的主页</a>' +
                '    <a href="profile.html?tab=edit">编辑资料</a>' +
                '    <a href="profile.html?tab=favorites">我的收藏</a>' +
                (session.role === 'admin' ? '<a href="admin.html">管理后台</a>' : '') +
                '    <a href="javascript:void(0)" id="logout-btn">退出登录</a>' +
                '  </div>' +
                '</div>';
        } else {
            rightHtml =
                '<button class="theme-toggle" id="theme-toggle" title="切换主题" aria-label="切换主题"></button>' +
                '<a href="login.html" class="btn btn-outline btn-sm">登录</a>' +
                '<a href="register.html" class="btn btn-primary btn-sm">注册</a>';
        }

        nav.innerHTML =
            '<div class="navbar-inner container">' +
            '  <a href="index.html" class="navbar-logo">' +
            '    <span class="logo-icon">Q</span><span>栖园 Campus</span>' +
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
            ['#8C988F', '#6F7D74'],
            ['#A49582', '#776E61'],
            ['#8A97A5', '#667482'],
            ['#A08E8C', '#7D6C6A'],
            ['#8EA69F', '#647C75'],
            ['#A6A08E', '#777263']
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
            '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="54" fill="#fff" ' +
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
            setTimeout(() => {
                const target = 'login.html?redirect=' + encodeURIComponent(redirect || location.pathname + location.search);
                const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
                if (!redirect && page !== 'index.html') location.replace(target);
                else location.href = target;
            }, 800);
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

    function canManagePost(post, user) {
        return !!(post && user && (user.role === 'admin' || user.id === post.authorId));
    }

    function deletePostAs(postId, user) {
        const post = Store.getPost(postId);
        if (!post) {
            showToast('动态不存在或已被删除', 'warning');
            return false;
        }
        if (!canManagePost(post, user)) {
            showToast('只有作者或管理员可以删除该动态', 'error');
            return false;
        }
        Store.deletePost(postId);
        return true;
    }

    /* ============================================================
     * Footer
     * ============================================================ */
    function renderFooter() {
        const f = document.getElementById('app-footer');
        if (!f) return;
        f.innerHTML = '<div class="container">© ' + new Date().getFullYear()
            + ' 栖园 Campus · 基于 Web 的编程课程项目 · 团队作品仅供学习演示</div>';
    }

    /* ============================================================
     * Fluid noise WebGL background
     * ============================================================ */
    function installFluidBackground() {
        const existing = document.querySelector('.fluid-bg-canvas');
        if (existing) {
            existing.hidden = false;
            document.body.classList.add('fluid-bg-ready');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'fluid-bg-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);
        document.body.classList.add('fluid-bg-ready');

        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false
        });
        if (!gl) {
            canvas.classList.add('is-fallback');
            return;
        }

        const vertexSource = [
            'attribute vec2 a_position;',
            'varying vec2 v_uv;',
            'void main() {',
            '  v_uv = a_position * 0.5 + 0.5;',
            '  gl_Position = vec4(a_position, 0.0, 1.0);',
            '}'
        ].join('\n');

        const fragmentSource = [
            'precision highp float;',
            'uniform vec2 u_resolution;',
            'uniform float u_time;',
            'uniform float u_isDark;',
            'varying vec2 v_uv;',
            'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
            'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
            'vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }',
            'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
            'float snoise(vec3 v) {',
            '  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);',
            '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
            '  vec3 i = floor(v + dot(v, C.yyy));',
            '  vec3 x0 = v - i + dot(i, C.xxx);',
            '  vec3 g = step(x0.yzx, x0.xyz);',
            '  vec3 l = 1.0 - g;',
            '  vec3 i1 = min(g.xyz, l.zxy);',
            '  vec3 i2 = max(g.xyz, l.zxy);',
            '  vec3 x1 = x0 - i1 + C.xxx;',
            '  vec3 x2 = x0 - i2 + C.yyy;',
            '  vec3 x3 = x0 - D.yyy;',
            '  i = mod289(i);',
            '  vec4 p = permute(permute(permute(',
            '    i.z + vec4(0.0, i1.z, i2.z, 1.0))',
            '    + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
            '    + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
            '  float n_ = 0.142857142857;',
            '  vec3 ns = n_ * D.wyz - D.xzx;',
            '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
            '  vec4 x_ = floor(j * ns.z);',
            '  vec4 y_ = floor(j - 7.0 * x_);',
            '  vec4 x = x_ * ns.x + ns.yyyy;',
            '  vec4 y = y_ * ns.x + ns.yyyy;',
            '  vec4 h = 1.0 - abs(x) - abs(y);',
            '  vec4 b0 = vec4(x.xy, y.xy);',
            '  vec4 b1 = vec4(x.zw, y.zw);',
            '  vec4 s0 = floor(b0) * 2.0 + 1.0;',
            '  vec4 s1 = floor(b1) * 2.0 + 1.0;',
            '  vec4 sh = -step(h, vec4(0.0));',
            '  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
            '  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',
            '  vec3 p0 = vec3(a0.xy, h.x);',
            '  vec3 p1 = vec3(a0.zw, h.y);',
            '  vec3 p2 = vec3(a1.xy, h.z);',
            '  vec3 p3 = vec3(a1.zw, h.w);',
            '  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));',
            '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
            '  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);',
            '  m = m * m;',
            '  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));',
            '}',
            'float fbm(vec3 p) {',
            '  float v = 0.0;',
            '  float a = 0.5;',
            '  for (int i = 0; i < 5; i++) {',
            '    v += a * snoise(p);',
            '    p = p * 2.03 + vec3(17.1, 7.3, 11.7);',
            '    a *= 0.5;',
            '  }',
            '  return v;',
            '}',
            'void main() {',
            '  vec2 uv = v_uv;',
            '  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);',
            '  vec2 p = (uv - 0.5) * aspect;',
            '  float t = u_time * 0.6;',
            '  float angle = fbm(vec3(p * 1.35, t * 0.09)) * 6.28318;',
            '  vec2 flow = vec2(cos(angle), sin(angle));',
            '  vec2 q = p + flow * 0.28 + vec2(fbm(vec3(p * 1.8 + 4.2, t * 0.11)), fbm(vec3(p * 1.8 - 2.8, t * 0.1))) * 0.22;',
            '  float dye = fbm(vec3(q * 2.25, t * 0.13));',
            '  float bands = fbm(vec3(q * 3.7 + dye, t * 0.16));',
            '  float field = smoothstep(-0.45, 0.72, dye + bands * 0.62);',
            '  vec3 darkBase = vec3(0.012, 0.021, 0.045);',
            '  vec3 darkCyan = vec3(0.02, 0.62, 0.66);',
            '  vec3 darkViolet = vec3(0.33, 0.18, 0.72);',
            '  vec3 lightBase = vec3(0.98, 0.88, 0.72);',
            '  vec3 lightSage = vec3(0.95, 0.36, 0.22);',
            '  vec3 lightMist = vec3(0.66, 0.68, 0.22);',
            '  vec3 base = mix(lightBase, darkBase, u_isDark);',
            '  vec3 inkA = mix(lightSage, darkCyan, u_isDark);',
            '  vec3 inkB = mix(lightMist, darkViolet, u_isDark);',
            '  vec3 ink = mix(inkA, inkB, field);',
            '  float glow = smoothstep(0.16, 0.95, abs(bands) + field * 0.45);',
            '  float strength = mix(0.34 + glow * 0.38, 0.25 + glow * 0.42, u_isDark);',
            '  vec3 color = mix(base, ink, strength);',
            '  float vignette = smoothstep(0.92, 0.22, length(p));',
            '  color *= mix(0.9 + vignette * 0.16, 0.58 + vignette * 0.74, u_isDark);',
            '  gl_FragColor = vec4(color, 1.0);',
            '}'
        ].join('\n');

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
            }
            return shader;
        }

        let program;
        try {
            program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
            }
        } catch (err) {
            canvas.classList.add('is-fallback');
            return;
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const position = gl.getAttribLocation(program, 'a_position');
        const resolution = gl.getUniformLocation(program, 'u_resolution');
        const time = gl.getUniformLocation(program, 'u_time');
        const isDark = gl.getUniformLocation(program, 'u_isDark');
        const reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const start = performance.now();

        function resize() {
            const dpr = Math.min(global.devicePixelRatio || 1, 1.5);
            const width = Math.max(1, Math.floor(global.innerWidth * dpr));
            const height = Math.max(1, Math.floor(global.innerHeight * dpr));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
        }

        function render(now) {
            resize();
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            gl.uniform2f(resolution, canvas.width, canvas.height);
            gl.uniform1f(time, reduceMotion ? 0.0 : (now - start) * 0.001);
            gl.uniform1f(isDark, document.body.classList.contains('theme-dark') ? 1.0 : 0.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (!reduceMotion) requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
        global.addEventListener('resize', resize, { passive: true });
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

    applyBackground();

    /* ============================================================
     * Confetti celebration
     * ============================================================ */
    function launchConfetti() {
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#20c997', '#f06595'];
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);

        for (let i = 0; i < 80; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDelay = Math.random() * 0.8 + 's';
            particle.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
            particle.style.width = (Math.random() * 8 + 5) + 'px';
            particle.style.height = (Math.random() * 8 + 5) + 'px';
            particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(particle);
        }

        setTimeout(() => container.remove(), 3500);
    }

    /* ============================================================
     * Reaction bar HTML helper
     * ============================================================ */
    function renderReactionBar(post, me) {
        const counts = Store.getReactionCounts(post.id);
        const userReaction = me ? Store.getUserReaction(me.id, post.id) : null;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const types = Store.REACTION_TYPES;
        const emoji = Store.REACTION_EMOJI;

        const buttons = types.map(t => {
            const active = userReaction === t ? ' active' : '';
            const count = counts[t] || 0;
            return '<button class="post-stat-btn reaction-btn' + active + '" data-act="react" data-type="' + t + '" title="' + t + '">' +
                '<span class="icon">' + emoji[t] + '</span>' +
                (count > 0 ? '<span class="cnt">' + count + '</span>' : '') +
                '</button>';
        }).join('');

        return '<div class="post-stats">' + buttons + '</div>';
    }

    /* ============================================================
     * Public
     * ============================================================ */
    global.UI = {
        applyTheme, toggleTheme,
        applyBackground, setBackgroundMode, getBackgroundMode,
        timeAgo, formatTime,
        getQueryParam, escapeHtml, renderContentText,
        showToast, confirmDialog, openModal,
        renderNavbar, renderFooter, initPage,
        defaultAvatar, fileToBase64,
        requireLogin, showLightbox, canViewPost, canManagePost, deletePostAs,
        launchConfetti, renderReactionBar
    };
})(window);

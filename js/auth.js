/**
 * Auth: login & register logic
 */
(function (global) {
    'use strict';

    const PRESET_TAGS = ['前端', '后端', '设计', '摄影', '音乐', '电影', '游戏', '电竞',
        '篮球', '足球', '动漫', '阅读', '旅行', '美食', '健身', '咖啡', '猫猫', '狗狗',
        '考研', '出国', '英语角', '辩论', '编程', '数学'];

    function setError(form, name, msg) {
        const slot = form.querySelector('[data-error-for="' + name + '"]');
        if (slot) slot.textContent = msg || '';
        const input = form.querySelector('[name="' + name + '"]');
        if (input) input.classList.toggle('has-error', !!msg);
    }

    function clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(e => e.textContent = '');
        form.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));
    }

    function validateStudentId(sid) {
        if (!sid) return '请输入学号';
        if (!/^\d{6,12}$/.test(sid)) return '学号必须是 6-12 位数字';
        return '';
    }

    function validatePassword(p) {
        if (!p) return '请输入密码';
        if (p.length < 6 || p.length > 20) return '密码长度需 6-20 个字符';
        return '';
    }

    function validateNickname(n) {
        if (!n) return '请输入昵称';
        if (n.length < 2 || n.length > 12) return '昵称长度 2-12 个字符';
        return '';
    }

    /* ============================================================
     * Login
     * ============================================================ */
    function initLogin() {
        const form = document.getElementById('login-form');
        if (!form) return;

        // remember me - prefill last student id
        const lastSid = localStorage.getItem('campus_last_sid');
        if (lastSid) {
            form.querySelector('[name="studentId"]').value = lastSid;
            form.querySelector('#remember').checked = true;
        }

        // password toggle
        const pwd = form.querySelector('#password-input');
        const pwdToggle = form.querySelector('#pwd-toggle');
        if (pwdToggle) {
            pwdToggle.addEventListener('click', () => {
                pwd.type = pwd.type === 'password' ? 'text' : 'password';
                pwdToggle.textContent = pwd.type === 'password' ? '👁️' : '🙈';
            });
        }

        // forgot password
        const forgot = form.querySelector('#forgot-link');
        if (forgot) forgot.addEventListener('click', handleForgotPassword);

        form.addEventListener('submit', e => {
            e.preventDefault();
            clearErrors(form);

            const fd = new FormData(form);
            const sid = (fd.get('studentId') || '').trim();
            const password = fd.get('password') || '';
            const remember = form.querySelector('#remember').checked;

            const eSid = validateStudentId(sid);
            if (eSid) { setError(form, 'studentId', eSid); return; }
            const ePwd = validatePassword(password);
            if (ePwd) { setError(form, 'password', ePwd); return; }

            const user = Store.getUserByStudentId(sid);
            if (!user) { setError(form, 'studentId', '该学号尚未注册'); return; }
            if (user.password !== password) { setError(form, 'password', '密码不正确'); return; }
            if (user.status === 'banned') { setError(form, 'studentId', '该账号已被封禁，请联系管理员'); return; }

            Store.setSession({ userId: user.id, loginAt: Date.now() });
            Store.updateUser(user.id, { lastActiveAt: Date.now() });
            if (remember) localStorage.setItem('campus_last_sid', sid);
            else localStorage.removeItem('campus_last_sid');

            UI.showToast('欢迎回来，' + user.nickname + ' 👋', 'success');

            const redirect = UI.getQueryParam('redirect');
            setTimeout(() => location.href = redirect || 'index.html', 700);
        });
    }

    function handleForgotPassword() {
        const html =
            '<div class="modal-header"><div class="modal-title">忘记密码</div><span class="modal-close">&times;</span></div>' +
            '<div class="form-group">' +
            '  <label class="form-label">学号</label>' +
            '  <input type="text" id="fp-sid" class="form-control" placeholder="请输入学号" />' +
            '</div>' +
            '<div class="form-group">' +
            '  <label class="form-label">新密码</label>' +
            '  <input type="password" id="fp-pwd" class="form-control" placeholder="6-20 个字符" />' +
            '</div>' +
            '<div class="modal-footer">' +
            '  <button class="btn btn-ghost modal-close">取消</button>' +
            '  <button class="btn btn-primary" id="fp-submit">重置密码</button>' +
            '</div>';
        const modal = UI.openModal(html);
        modal.querySelector('#fp-submit').addEventListener('click', () => {
            const sid = modal.querySelector('#fp-sid').value.trim();
            const pwd = modal.querySelector('#fp-pwd').value;
            if (validateStudentId(sid) || validatePassword(pwd)) {
                UI.showToast('请输入正确的学号与新密码', 'error');
                return;
            }
            const user = Store.getUserByStudentId(sid);
            if (!user) { UI.showToast('学号不存在', 'error'); return; }
            Store.updateUser(user.id, { password: pwd });
            UI.showToast('密码重置成功，请登录 🔐', 'success');
            modal.remove();
        });
    }

    /* ============================================================
     * Register
     * ============================================================ */
    function initRegister() {
        const form = document.getElementById('register-form');
        if (!form) return;

        // tags
        const tagBox = document.getElementById('tag-selector');
        const selectedTags = new Set();
        tagBox.innerHTML = PRESET_TAGS.map(t =>
            '<span class="tag-option" data-tag="' + t + '">' + t + '</span>'
        ).join('');
        tagBox.addEventListener('click', e => {
            const op = e.target.closest('.tag-option');
            if (!op) return;
            const t = op.dataset.tag;
            if (selectedTags.has(t)) {
                selectedTags.delete(t);
                op.classList.remove('selected');
            } else {
                if (selectedTags.size >= 6) { UI.showToast('最多选择 6 个标签', 'warning'); return; }
                selectedTags.add(t);
                op.classList.add('selected');
            }
        });

        // avatar presets
        const presetBox = document.getElementById('avatar-presets');
        const preview = document.getElementById('reg-avatar-preview');
        const presets = ['萌', '酷', '潮', '甜', '风', '雨', '猫', '狗'];
        let avatarData = UI.defaultAvatar(presets[0]);
        preview.src = avatarData;
        presetBox.innerHTML = presets.map((c, idx) =>
            '<img class="preset' + (idx === 0 ? ' selected' : '') + '" data-letter="' + c +
            '" src="' + UI.defaultAvatar(c) + '" alt="' + c + '" />'
        ).join('');
        presetBox.addEventListener('click', e => {
            const p = e.target.closest('.preset');
            if (!p) return;
            presetBox.querySelectorAll('.preset').forEach(el => el.classList.remove('selected'));
            p.classList.add('selected');
            avatarData = p.src;
            preview.src = avatarData;
        });

        // upload avatar
        document.getElementById('avatar-file').addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 1024 * 1024 * 2) { UI.showToast('图片大小不能超过 2MB', 'warning'); return; }
            avatarData = await UI.fileToBase64(file);
            preview.src = avatarData;
            presetBox.querySelectorAll('.preset').forEach(el => el.classList.remove('selected'));
        });

        // password toggles
        form.querySelectorAll('[data-toggle]').forEach(t => {
            t.addEventListener('click', () => {
                const id = t.dataset.toggle;
                const input = document.getElementById(id);
                input.type = input.type === 'password' ? 'text' : 'password';
                t.textContent = input.type === 'password' ? '👁️' : '🙈';
            });
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            clearErrors(form);

            const fd = new FormData(form);
            const sid = (fd.get('studentId') || '').trim();
            const nickname = (fd.get('nickname') || '').trim();
            const password = fd.get('password') || '';
            const password2 = fd.get('password2') || '';
            const bio = (fd.get('bio') || '').trim();
            const agree = form.querySelector('#agree').checked;

            let hasError = false;
            const eSid = validateStudentId(sid);
            if (eSid) { setError(form, 'studentId', eSid); hasError = true; }
            const eNick = validateNickname(nickname);
            if (eNick) { setError(form, 'nickname', eNick); hasError = true; }
            const ePwd = validatePassword(password);
            if (ePwd) { setError(form, 'password', ePwd); hasError = true; }
            if (password !== password2) { setError(form, 'password2', '两次密码不一致'); hasError = true; }
            if (!agree) { setError(form, 'agree', '请先同意用户协议'); hasError = true; }
            if (Store.getUserByStudentId(sid)) { setError(form, 'studentId', '该学号已被注册'); hasError = true; }
            if (hasError) { UI.showToast('请检查输入项', 'error'); return; }

            const user = Store.createUser({
                studentId: sid,
                password,
                nickname,
                avatar: avatarData,
                bio,
                tags: Array.from(selectedTags)
            });

            Store.setSession({ userId: user.id, loginAt: Date.now() });
            UI.showToast('注册成功，欢迎加入！🎉', 'success');
            setTimeout(() => location.href = 'index.html', 800);
        });
    }

    global.Auth = { initLogin, initRegister };
})(window);

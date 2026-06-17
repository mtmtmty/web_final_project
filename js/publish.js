/**
 * Publish page logic - create / edit post.
 *  - rich textarea with 500-char limit
 *  - upload images (file -> base64) or paste image URL
 *  - hashtag input, emoji picker, visibility setting
 *  - editing mode when ?edit=<postId>
 */
(function () {
    'use strict';

    const EMOJIS = ['😀','😁','😂','🤣','😊','🙂','😍','🥰','😘','😎',
                    '🤩','🤔','😴','😭','😱','🥺','😡','👍','👎','👏',
                    '🙌','💪','🤝','✌️','👌','❤️','💔','💕','💖','✨',
                    '🌟','🎉','🎊','🔥','💯','🌈','☀️','🌙','⭐','💫',
                    '🌸','🌹','🌻','🌳','🍀','🍎','🍔','🍕','🍰','🍻',
                    '☕','🐱','🐶','🐰','🐼','🦊','🐨','🐧','🐳','🦄'];

    let images = [];      // base64 list
    let tags = [];        // string list
    let editId = null;
    let me = null;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        me = UI.requireLogin();
        if (!me) return;
        renderAuthor();

        editId = UI.getQueryParam('edit');
        if (editId) loadEditPost(editId);

        bindEvents();
        renderImages();
        renderTags();
        renderEmojiPicker();
    }

    function renderAuthor() {
        document.getElementById('publish-author').innerHTML =
            '<img src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" />' +
            '<div><div class="name">' + UI.escapeHtml(me.nickname) + '</div>' +
            '<div class="meta">学号 ' + UI.escapeHtml(me.studentId) + '</div></div>';
    }

    function loadEditPost(id) {
        const p = Store.getPost(id);
        if (!p) { UI.showToast('动态不存在', 'error'); setTimeout(() => location.href = 'index.html', 800); return; }
        if (p.authorId !== me.id && me.role !== 'admin') {
            UI.showToast('无权编辑该动态', 'error'); setTimeout(() => history.back(), 800); return;
        }
        document.getElementById('page-title').textContent = '编辑动态';
        document.getElementById('post-content').value = p.content;
        document.getElementById('char-count').textContent = p.content.length;
        document.getElementById('visibility-select').value = p.visibility || 'public';
        images = (p.images || []).slice();
        tags = (p.tags || []).slice();
    }

    function bindEvents() {
        const ta = document.getElementById('post-content');
        const counter = document.getElementById('char-count');
        ta.addEventListener('input', () => {
            const len = ta.value.length;
            counter.textContent = len;
            counter.parentElement.classList.toggle('over', len > 500);
        });

        // image upload
        const fileInput = document.getElementById('image-file');
        document.getElementById('image-trigger').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async e => {
            const files = Array.from(e.target.files || []);
            for (const f of files) {
                if (images.length >= 9) { UI.showToast('最多上传 9 张图片', 'warning'); break; }
                if (f.size > 1024 * 1024 * 3) { UI.showToast(f.name + ' 超过 3MB，已跳过', 'warning'); continue; }
                const data = await UI.fileToBase64(f);
                images.push(data);
            }
            renderImages();
            fileInput.value = '';
        });

        // image link
        document.getElementById('image-link-trigger').addEventListener('click', () => {
            if (images.length >= 9) { UI.showToast('最多 9 张图片', 'warning'); return; }
            const html =
                '<div class="modal-header"><div class="modal-title">添加图片链接</div><span class="modal-close">&times;</span></div>' +
                '<div class="form-group"><input type="text" id="img-url" class="form-control" placeholder="https://..." /></div>' +
                '<div class="modal-footer"><button class="btn btn-ghost modal-close">取消</button>' +
                '<button class="btn btn-primary" id="add-link">添加</button></div>';
            const m = UI.openModal(html);
            m.querySelector('#add-link').addEventListener('click', () => {
                const url = m.querySelector('#img-url').value.trim();
                if (!url) { UI.showToast('请输入链接', 'error'); return; }
                if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
                    UI.showToast('请输入合法的 http(s) 链接', 'error'); return;
                }
                images.push(url);
                renderImages();
                m.remove();
            });
        });

        // tag input
        const tagInput = document.getElementById('tag-input');
        tagInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const v = tagInput.value.trim().replace(/^#|#$/g, '');
                if (!v) return;
                if (v.length > 10) { UI.showToast('每个标签不超过 10 字', 'warning'); return; }
                if (tags.length >= 5) { UI.showToast('最多 5 个标签', 'warning'); return; }
                if (tags.includes(v)) { UI.showToast('标签重复', 'warning'); return; }
                tags.push(v);
                renderTags();
                tagInput.value = '';
            }
        });

        // emoji
        const emojiTrigger = document.getElementById('emoji-trigger');
        const emojiPicker = document.getElementById('emoji-picker');
        emojiTrigger.addEventListener('click', e => {
            e.stopPropagation();
            emojiPicker.classList.toggle('show');
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('.publish-toolbar-wrap')) emojiPicker.classList.remove('show');
        });

        // submit / cancel
        document.getElementById('submit-btn').addEventListener('click', submit);
        document.getElementById('cancel-btn').addEventListener('click', () => history.back());
    }

    function renderImages() {
        const box = document.getElementById('image-uploader');
        const items = images.map((src, idx) =>
            '<div class="image-thumb"><img src="' + src + '" /><span class="remove" data-idx="' + idx + '">×</span></div>'
        );
        if (images.length < 9) {
            items.push('<div class="image-add" id="add-image"><span class="icon">+</span>添加图片</div>');
        }
        box.innerHTML = items.join('');
        box.querySelectorAll('.remove').forEach(el => {
            el.addEventListener('click', () => {
                images.splice(parseInt(el.dataset.idx), 1);
                renderImages();
            });
        });
        const addBtn = box.querySelector('#add-image');
        if (addBtn) addBtn.addEventListener('click', () => document.getElementById('image-file').click());
    }

    function renderTags() {
        const wrap = document.getElementById('tag-wrap');
        const input = document.getElementById('tag-input');
        wrap.querySelectorAll('.tag').forEach(el => el.remove());
        tags.forEach((t, idx) => {
            const el = document.createElement('span');
            el.className = 'tag';
            el.innerHTML = '#' + UI.escapeHtml(t) + '# <span style="margin-left:4px;cursor:pointer;" data-rm="' + idx + '">×</span>';
            wrap.insertBefore(el, input);
        });
        wrap.querySelectorAll('[data-rm]').forEach(el => {
            el.addEventListener('click', () => {
                tags.splice(parseInt(el.dataset.rm), 1);
                renderTags();
            });
        });
    }

    function renderEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        picker.innerHTML = EMOJIS.map(e => '<span>' + e + '</span>').join('');
        picker.addEventListener('click', e => {
            if (e.target.tagName === 'SPAN') {
                const ta = document.getElementById('post-content');
                const cursor = ta.selectionStart || ta.value.length;
                ta.value = ta.value.slice(0, cursor) + e.target.textContent + ta.value.slice(cursor);
                ta.dispatchEvent(new Event('input'));
                ta.focus();
            }
        });
    }

    function submit() {
        const content = document.getElementById('post-content').value.trim();
        const visibility = document.getElementById('visibility-select').value;

        if (!content && images.length === 0) { UI.showToast('内容和图片至少要有一个 ✏️', 'warning'); return; }
        if (content.length > 500) { UI.showToast('内容超过 500 字', 'error'); return; }

        // auto-extract hashtags from content
        const matched = content.match(/#([^#\s]{1,20})#/g) || [];
        matched.forEach(m => {
            const t = m.replace(/#/g, '').trim();
            if (t && !tags.includes(t) && tags.length < 5) tags.push(t);
        });

        if (editId) {
            Store.updatePost(editId, { content, images, tags, visibility });
            UI.showToast('动态已更新 ✅', 'success');
            setTimeout(() => location.href = 'detail.html?id=' + editId, 600);
        } else {
            const p = Store.createPost({
                authorId: me.id,
                content, images, tags, visibility
            });
            UI.showToast('发布成功 🎉', 'success');
            setTimeout(() => location.href = 'detail.html?id=' + p.id, 600);
        }
    }
})();

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
        else restoreDraft();

        bindEvents();
        renderImages();
        renderTags();
        renderEmojiPicker();
        renderPreview();
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
        let draftTimer;

        ta.addEventListener('input', () => {
            const len = ta.value.length;
            counter.textContent = len;
            counter.parentElement.classList.toggle('over', len > 500);
            renderPreview();
            clearTimeout(draftTimer);
            draftTimer = setTimeout(saveDraftToStorage, 2000);
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
        const imageLinkTrigger = document.getElementById('image-link-trigger');
        imageLinkTrigger.addEventListener('click', e => {
            e.stopPropagation();
            if (images.length >= 9) { UI.showToast('最多 9 张图片', 'warning'); return; }
            const popover = ensureImageLinkPopover();
            popover.classList.toggle('show');
            if (popover.classList.contains('show')) {
                placeFloatingPanel(imageLinkTrigger, popover);
                popover.querySelector('#img-url').focus();
            }
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
            if (emojiPicker.classList.contains('show')) placeFloatingPanel(emojiTrigger, emojiPicker);
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('.publish-toolbar-wrap')) emojiPicker.classList.remove('show');
            const linkPopover = document.getElementById('image-link-popover');
            if (linkPopover &&
                !e.target.closest('#image-link-popover') &&
                !e.target.closest('#image-link-trigger')) {
                linkPopover.classList.remove('show');
            }
        });

        window.addEventListener('resize', closeFloatingPanels, { passive: true });
        window.addEventListener('scroll', closeFloatingPanels, { passive: true });

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

    function placeFloatingPanel(trigger, panel) {
        const rect = trigger.getBoundingClientRect();
        const gap = 8;
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
        let top = rect.bottom + gap;
        if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - gap);
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    function closeFloatingPanels() {
        const emojiPicker = document.getElementById('emoji-picker');
        const linkPopover = document.getElementById('image-link-popover');
        if (emojiPicker) emojiPicker.classList.remove('show');
        if (linkPopover) linkPopover.classList.remove('show');
    }

    function ensureImageLinkPopover() {
        let popover = document.getElementById('image-link-popover');
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 'image-link-popover';
        popover.id = 'image-link-popover';
        popover.innerHTML =
            '<div class="popover-title">添加图片链接</div>' +
            '<input type="text" id="img-url" class="form-control" placeholder="https://..." />' +
            '<div class="popover-actions">' +
            '  <button class="btn btn-ghost btn-sm" type="button" data-close>取消</button>' +
            '  <button class="btn btn-primary btn-sm" type="button" id="add-link">添加</button>' +
            '</div>';
        document.body.appendChild(popover);

        popover.querySelector('[data-close]').addEventListener('click', () => popover.classList.remove('show'));
        popover.querySelector('#img-url').addEventListener('keydown', e => {
            if (e.key === 'Enter') addImageLink(popover);
            if (e.key === 'Escape') popover.classList.remove('show');
        });
        popover.querySelector('#add-link').addEventListener('click', () => addImageLink(popover));
        return popover;
    }

    function addImageLink(popover) {
        const input = popover.querySelector('#img-url');
        const url = input.value.trim();
        if (!url) { UI.showToast('请输入链接', 'error'); return; }
        if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
            UI.showToast('请输入合法的 http(s) 链接', 'error'); return;
        }
        images.push(url);
        renderImages();
        input.value = '';
        popover.classList.remove('show');
    }

    function restoreDraft() {
        const draft = Store.getDraft();
        if (!draft) return;
        const ta = document.getElementById('post-content');
        if (draft.content && ta.value === '') {
            ta.value = draft.content;
            document.getElementById('char-count').textContent = draft.content.length;
            document.getElementById('char-count').parentElement.classList.toggle('over', draft.content.length > 500);
        }
        if (draft.images && draft.images.length) {
            images = draft.images.slice();
            renderImages();
        }
        if (draft.tags && draft.tags.length) {
            tags = draft.tags.slice();
            renderTags();
        }
        renderPreview();
    }

    function saveDraftToStorage() {
        const content = document.getElementById('post-content').value;
        if (!content && images.length === 0 && tags.length === 0) return;
        Store.saveDraft({ content, images: images.slice(), tags: tags.slice(), savedAt: Date.now() });
    }

    function renderPreview() {
        let previewEl = document.getElementById('publish-preview');
        if (!previewEl) {
            const card = document.querySelector('.publish-card');
            previewEl = document.createElement('div');
            previewEl.className = 'publish-preview';
            previewEl.id = 'publish-preview';
            previewEl.innerHTML = '<div class="publish-preview-title">📋 发布预览</div><div class="preview-content"></div>';
            card.appendChild(previewEl);
        }
        const content = document.getElementById('post-content').value;
        const previewContent = previewEl.querySelector('.preview-content');
        previewContent.innerHTML = UI.renderContentText(content) || '';
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
            Store.clearDraft();
            UI.launchConfetti();
            UI.showToast('发布成功 🎉', 'success');
            setTimeout(() => location.href = 'detail.html?id=' + p.id, 600);
        }
    }
})();

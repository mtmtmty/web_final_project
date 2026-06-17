/**
 * Detail page logic - shows full post + comments + related.
 */
(function () {
    'use strict';

    let postId, post, me;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        postId = UI.getQueryParam('id');
        post = postId ? Store.getPost(postId) : null;
        me = Store.getCurrentUser();

        if (!post || post.deleted) { renderNotFound(); return; }
        if (!UI.canViewPost(post, me)) { renderForbidden(); return; }

        // log view
        if (me) Store.logView(me.id, postId);
        Store.updatePost(postId, { views: (post.views || 0) + 1 });
        post = Store.getPost(postId);

        renderDetail();

        if (location.hash === '#comment') {
            setTimeout(() => {
                const ta = document.querySelector('.comment-input');
                if (ta) ta.focus();
            }, 200);
        }
    }

    function renderNotFound() {
        document.getElementById('detail-root').innerHTML =
            '<div class="empty-state" style="grid-column:1/-1;background:var(--color-card);border-radius:var(--radius-lg);">' +
            '<div class="emoji">🤔</div><div class="title">动态不存在或已被删除</div>' +
            '<div class="desc"><a href="index.html" class="auth-link">返回首页</a></div></div>';
    }

    function renderForbidden() {
        document.getElementById('detail-root').innerHTML =
            '<div class="empty-state" style="grid-column:1/-1;background:var(--color-card);border-radius:var(--radius-lg);">' +
            '<div class="emoji">🔒</div><div class="title">无权查看该动态</div>' +
            '<div class="desc">该动态的可见范围不包含你哦</div></div>';
    }

    function renderDetail() {
        const author = Store.getUser(post.authorId);
        const liked = me && Store.isLiked(me.id, post.id);
        const favorited = me && Store.isFavorited(me.id, post.id);
        const likeCount = Store.getLikeCount(post.id);
        const isFollowing = me && me.id !== author.id && Store.isFollowing(me.id, author.id);
        const canManage = me && (me.id === post.authorId || me.role === 'admin');

        const imagesHtml = (post.images || []).length
            ? '<div class="detail-images">' + post.images.map(s =>
                '<img src="' + s + '" data-lightbox="' + s + '" />').join('') + '</div>' : '';
        const tagsHtml = (post.tags || []).length
            ? '<div class="post-tags">' + post.tags.map(t =>
                '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '">#' + UI.escapeHtml(t) + '#</a>'
              ).join('') + '</div>' : '';

        const visibilityLabel = { 'public':'🌐 公开', 'friends':'👥 仅好友', 'private':'🔒 仅自己' }[post.visibility] || '🌐 公开';
        const editedFlag = post.updatedAt && post.updatedAt - post.createdAt > 5000
            ? ' · 已编辑' : '';

        const html =
            '<div class="detail-main">' +
            '  <div class="detail-header">' +
            '    <a href="user.html?id=' + author.id + '"><img src="' + (author.avatar || UI.defaultAvatar(author.nickname)) + '" /></a>' +
            '    <div style="flex:1;">' +
            '      <div class="detail-author"><a href="user.html?id=' + author.id + '">' + UI.escapeHtml(author.nickname) + '</a></div>' +
            '      <div class="detail-meta">' + UI.formatTime(post.createdAt) + ' · ' + visibilityLabel +
                  editedFlag + ' · 浏览 ' + (post.views || 0) + '</div>' +
            '    </div>' +
                (me && me.id !== author.id
                    ? '<button class="btn ' + (isFollowing ? 'btn-ghost' : 'btn-primary') + ' btn-sm" id="follow-btn">' +
                      (isFollowing ? '已关注' : '+ 关注') + '</button>' : '') +
                (canManage
                    ? ' <button class="btn btn-ghost btn-sm" id="edit-btn">✏️ 编辑</button>' +
                      ' <button class="btn btn-danger btn-sm" id="delete-btn">🗑️ 删除</button>' : '') +
            '  </div>' +
            '  <div class="detail-content">' + UI.renderContentText(post.content) + '</div>' +
            imagesHtml + tagsHtml +
            '  <div class="detail-actions">' +
            '    <button class="post-stat-btn ' + (liked ? 'active' : '') + '" id="like-btn">' +
            '      <span class="icon">' + (liked ? '❤️' : '🤍') + '</span> 点赞 <span class="cnt">' + likeCount + '</span></button>' +
            '    <button class="post-stat-btn ' + (favorited ? 'active' : '') + '" id="favorite-btn">' +
            '      <span class="icon">' + (favorited ? '⭐' : '☆') + '</span> 收藏</button>' +
            '    <button class="post-stat-btn" id="share-btn">🔗 转发</button>' +
            '  </div>' +
            '  <div class="comments-section">' +
            '    <div class="comments-title">💬 评论 <span id="comment-count"></span></div>' +
            '    <div id="comment-input-area"></div>' +
            '    <div class="comment-list" id="comment-list"></div>' +
            '  </div>' +
            '</div>' +
            '<aside class="detail-sidebar">' +
            '  <div class="card"><div class="sidebar-title">作者其他动态</div><div id="related-posts"></div></div>' +
            '  <div class="card"><div class="sidebar-title">🔥 热门推荐</div><div id="hot-recommend"></div></div>' +
            '</aside>';

        document.getElementById('detail-root').innerHTML = html;
        bindActions();
        renderCommentInput();
        renderComments();
        renderRelated();
        renderHotRecommend();
    }

    function bindActions() {
        const root = document.getElementById('detail-root');

        root.addEventListener('click', e => {
            const img = e.target.closest('img[data-lightbox]');
            if (img) UI.showLightbox(img.dataset.lightbox);
        });

        const like = document.getElementById('like-btn');
        if (like) like.addEventListener('click', () => {
            const u = UI.requireLogin(); if (!u) return;
            Store.toggleLike(u.id, postId);
            renderDetail();
        });

        const fav = document.getElementById('favorite-btn');
        if (fav) fav.addEventListener('click', () => {
            const u = UI.requireLogin(); if (!u) return;
            const added = Store.toggleFavorite(u.id, postId);
            UI.showToast(added ? '已收藏 ⭐' : '取消收藏', 'success');
            renderDetail();
        });

        const share = document.getElementById('share-btn');
        if (share) share.addEventListener('click', () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = location.href;
                document.body.appendChild(ta);
                ta.select(); document.execCommand('copy'); ta.remove();
                UI.showToast('链接已复制 🔗', 'success');
            } catch (e) {}
        });

        const followBtn = document.getElementById('follow-btn');
        if (followBtn) followBtn.addEventListener('click', () => {
            const u = UI.requireLogin(); if (!u) return;
            const followed = Store.toggleFollow(u.id, post.authorId);
            UI.showToast(followed ? '关注成功' : '已取关', 'success');
            renderDetail();
        });

        const edit = document.getElementById('edit-btn');
        if (edit) edit.addEventListener('click', () => location.href = 'publish.html?edit=' + postId);

        const del = document.getElementById('delete-btn');
        if (del) del.addEventListener('click', async () => {
            const ok = await UI.confirmDialog('确定删除这条动态？删除后不可恢复。');
            if (!ok) return;
            Store.deletePost(postId);
            UI.showToast('动态已删除', 'success');
            setTimeout(() => location.href = 'index.html', 600);
        });
    }

    function renderCommentInput() {
        const area = document.getElementById('comment-input-area');
        if (!me) {
            area.innerHTML = '<div class="card" style="text-align:center;">' +
                '请 <a href="login.html?redirect=' + encodeURIComponent(location.pathname + location.search) + '" class="auth-link">登录</a> 后参与评论' +
                '</div>';
            return;
        }
        let pickedImage = '';
        area.innerHTML =
            '<div class="comment-input-wrap">' +
            '  <img src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" />' +
            '  <div class="input-area">' +
            '    <textarea class="comment-input" id="ct-input" placeholder="说点什么吧..." maxlength="200"></textarea>' +
            '    <div id="ct-image-preview" style="margin-top:6px;"></div>' +
            '    <div class="comment-tools">' +
            '      <div class="comment-tools-left">' +
            '        <button id="ct-emoji">😀</button>' +
            '        <button id="ct-image">🖼️ 图片</button>' +
            '        <input type="file" accept="image/*" id="ct-file" style="display:none;" />' +
            '      </div>' +
            '      <button class="btn btn-primary btn-sm" id="ct-submit">发送</button>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        // emoji popup (reuse same emojis)
        const emojis = ['😀','😂','😍','😎','🥺','😡','👍','❤️','🔥','🎉','✨','🌸'];
        document.getElementById('ct-emoji').addEventListener('click', () => {
            const e = emojis[Math.floor(Math.random() * emojis.length)];
            const ta = document.getElementById('ct-input');
            ta.value += e;
            ta.focus();
        });

        document.getElementById('ct-image').addEventListener('click', () => document.getElementById('ct-file').click());
        document.getElementById('ct-file').addEventListener('change', async e => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 1024 * 1024 * 2) { UI.showToast('图片不能超过 2MB', 'warning'); return; }
            pickedImage = await UI.fileToBase64(f);
            document.getElementById('ct-image-preview').innerHTML =
                '<div style="display:inline-block;position:relative;">' +
                '<img src="' + pickedImage + '" style="max-height:120px;border-radius:8px;" />' +
                '<span id="ct-image-remove" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;">×</span>' +
                '</div>';
            document.getElementById('ct-image-remove').addEventListener('click', () => {
                pickedImage = '';
                document.getElementById('ct-image-preview').innerHTML = '';
            });
        });

        document.getElementById('ct-submit').addEventListener('click', () => {
            const content = document.getElementById('ct-input').value.trim();
            if (!content && !pickedImage) { UI.showToast('请输入评论内容', 'warning'); return; }
            Store.createComment({
                postId, authorId: me.id,
                content, image: pickedImage
            });
            UI.showToast('评论成功', 'success');
            renderDetail();
        });
    }

    function renderComments() {
        const list = document.getElementById('comment-list');
        const comments = Store.getCommentsByPost(postId);
        document.getElementById('comment-count').textContent = '· ' + comments.length;
        if (comments.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="emoji">💭</div><div class="desc">还没有评论，来抢沙发～</div></div>';
            return;
        }
        list.innerHTML = comments.slice().reverse().map(c => {
            const u = Store.getUser(c.authorId);
            if (!u) return '';
            const canDelete = me && (me.id === c.authorId || me.role === 'admin' || me.id === post.authorId);
            return '<div class="comment-item">' +
                '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
                '<div class="comment-content">' +
                '<div class="comment-author"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div>' +
                '<div class="comment-text">' + UI.renderContentText(c.content) + '</div>' +
                (c.image ? '<img class="comment-image" src="' + c.image + '" data-lightbox="' + c.image + '" />' : '') +
                '<div class="comment-meta">' +
                '<span>' + UI.timeAgo(c.createdAt) + '</span>' +
                (canDelete ? '<button data-del="' + c.id + '">删除</button>' : '') +
                '</div></div></div>';
        }).join('');
        list.querySelectorAll('[data-del]').forEach(b => {
            b.addEventListener('click', async () => {
                const ok = await UI.confirmDialog('确定删除该评论？');
                if (!ok) return;
                Store.deleteComment(b.dataset.del);
                renderDetail();
            });
        });
    }

    function renderRelated() {
        const author = Store.getUser(post.authorId);
        const others = Store.getPosts()
            .filter(p => p.authorId === post.authorId && p.id !== post.id && !p.deleted && UI.canViewPost(p, me))
            .slice(0, 5);
        const box = document.getElementById('related-posts');
        if (others.length === 0) {
            box.innerHTML = '<div style="font-size:13px;color:var(--color-text-light);padding:10px 0;">' +
                            UI.escapeHtml(author.nickname) + ' 还没有其他动态</div>';
            return;
        }
        box.innerHTML = others.map(p => {
            const cover = (p.images && p.images[0]) || UI.defaultAvatar(p.content.charAt(0) || '动');
            return '<div class="related-post" onclick="location.href=\'detail.html?id=' + p.id + '\'">' +
                '<img src="' + cover + '" />' +
                '<div class="text">' +
                '<div class="title">' + UI.escapeHtml((p.content || '(图片动态)').slice(0, 60)) + '</div>' +
                '<div class="meta">' + UI.timeAgo(p.createdAt) + ' · ' + Store.getLikeCount(p.id) + ' 赞</div>' +
                '</div></div>';
        }).join('');
    }

    function renderHotRecommend() {
        const box = document.getElementById('hot-recommend');
        const list = Store.getPosts()
            .filter(p => !p.deleted && p.id !== post.id && p.visibility === 'public')
            .sort((a, b) => Store.getLikeCount(b.id) - Store.getLikeCount(a.id))
            .slice(0, 4);
        if (list.length === 0) { box.innerHTML = ''; return; }
        box.innerHTML = list.map(p => {
            const cover = (p.images && p.images[0]) || UI.defaultAvatar(p.content.charAt(0) || '热');
            return '<div class="related-post" onclick="location.href=\'detail.html?id=' + p.id + '\'">' +
                '<img src="' + cover + '" />' +
                '<div class="text">' +
                '<div class="title">' + UI.escapeHtml((p.content || '(图片动态)').slice(0, 60)) + '</div>' +
                '<div class="meta">' + Store.getLikeCount(p.id) + ' 赞 · ' + Store.getCommentsByPost(p.id).length + ' 评论</div>' +
                '</div></div>';
        }).join('');
    }
})();

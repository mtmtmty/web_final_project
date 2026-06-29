/**
 * Home feed page
 *  - render post list (with all / follow / hot tabs)
 *  - quick publish entry
 *  - left sidebar user info
 *  - right sidebar: trending posts, suggested users, hot tags
 */
(function () {
    'use strict';

    let currentMode = 'all';
    const HOT_THRESHOLD = 3;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        renderQuickPublish();
        renderSidebarUser();
        bindFeedTabs();
        renderFeed();
        renderTrending();
        renderSuggestUsers();
        renderHotTags();
    }

    function renderQuickPublish() {
        const wrap = document.getElementById('quick-publish-wrap');
        const me = Store.getCurrentUser();
        if (!me) {
            wrap.innerHTML = '<div class="card guest-note">' +
                '登录后可同步你的校园动态、关注同学并参与评论。' +
                '<a href="login.html" class="auth-link">登录</a><span> / </span>' +
                '<a href="register.html" class="auth-link">注册</a>' +
                '</div>';
            return;
        }
        wrap.innerHTML =
            '<div class="quick-publish" onclick="location.href=\'publish.html\'">' +
            '  <img src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" />' +
            '  <div class="quick-publish-input">' + UI.escapeHtml(me.nickname) + '，今天有什么想分享的？</div>' +
            '  <button class="btn btn-primary btn-sm">发布</button>' +
            '</div>';
    }

    function renderSidebarUser() {
        const el = document.getElementById('sidebar-user');
        const me = Store.getCurrentUser();
        if (!me) { el.innerHTML = ''; return; }
        const myPosts = Store.getPosts().filter(p => p.authorId === me.id && !p.deleted).length;
        const following = Store.getFollowing(me.id).length;
        const followers = Store.getFollowers(me.id).length;
        el.innerHTML =
            '<div style="text-align:center;padding-bottom:14px;border-bottom:1px solid var(--color-border);margin-bottom:14px;">' +
            '  <img src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" ' +
            '       style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />' +
            '  <div style="font-weight:600;">' + UI.escapeHtml(me.nickname) + '</div>' +
            '  <div style="font-size:12px;color:var(--color-text-light);margin-top:4px;">' +
            UI.escapeHtml(me.bio || '这位同学很神秘～') + '</div>' +
            '  <div style="display:flex;justify-content:space-around;margin-top:12px;font-size:12px;">' +
            '    <div><b style="font-size:14px;">' + myPosts + '</b><br><span style="color:var(--color-text-light)">动态</span></div>' +
            '    <div><b style="font-size:14px;">' + following + '</b><br><span style="color:var(--color-text-light)">关注</span></div>' +
            '    <div><b style="font-size:14px;">' + followers + '</b><br><span style="color:var(--color-text-light)">粉丝</span></div>' +
            '  </div>' +
            '</div>';
    }

    function bindFeedTabs() {
        const tabs = document.getElementById('feed-tabs');
        tabs.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const mode = btn.dataset.mode;
            if (mode === 'follow' && !Store.getCurrentUser()) {
                UI.showToast('请先登录后查看关注动态', 'warning');
                return;
            }
            tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = mode;
            renderFeed();
        });
    }

    function renderFeed() {
        const container = document.getElementById('post-list');
        const me = Store.getCurrentUser();
        let posts = Store.getPosts().filter(p => !p.deleted && UI.canViewPost(p, me));

        if (currentMode === 'follow') {
            const following = me ? Store.getFollowing(me.id) : [];
            posts = posts.filter(p => following.includes(p.authorId) || (me && p.authorId === me.id));
        } else if (currentMode === 'hot') {
            posts = posts.filter(p => Store.getTotalReactions(p.id) >= HOT_THRESHOLD);
            posts.sort((a, b) => Store.getTotalReactions(b.id) - Store.getTotalReactions(a.id));
        }
        if (currentMode !== 'hot') posts.sort((a, b) => b.createdAt - a.createdAt);

        if (posts.length === 0) { container.innerHTML = emptyState(currentMode); return; }
        container.innerHTML = posts.map(p => renderPost(p, me)).join('');
        bindPostEvents(container);
    }

    function emptyState(mode) {
        if (mode === 'follow') {
            return '<div class="empty-state"><div class="emoji">👥</div>' +
                   '<div class="title">还没有关注的动态</div>' +
                   '<div class="desc">去 <a href="search.html" class="auth-link">发现</a> 页认识更多同学吧～</div></div>';
        }
        if (mode === 'hot') {
            return '<div class="empty-state"><div class="emoji">🔥</div>' +
                   '<div class="title">暂无热门</div>' +
                   '<div class="desc">点赞数 ≥ ' + HOT_THRESHOLD + ' 的动态会出现在这里</div></div>';
        }
        return '<div class="empty-state"><div class="emoji">📭</div>' +
               '<div class="title">还没有动态</div>' +
               '<div class="desc">发布第一条动态，点亮校园生活吧</div></div>';
    }

    function renderPost(p, me) {
        const author = Store.getUser(p.authorId);
        if (!author) return '';
        const favorited = me && Store.isFavorited(me.id, p.id);
        const reactCounts = Store.getReactionCounts(p.id);
        const totalReactions = Object.values(reactCounts).reduce((a, b) => a + b, 0);
        const commentCount = Store.getCommentsByPost(p.id).length;
        const isHot = totalReactions >= HOT_THRESHOLD;
        const isNew = (Date.now() - p.createdAt) < 1000 * 60 * 60;
        const canManage = me && (me.id === p.authorId || me.role === 'admin');

        const imagesHtml = p.images && p.images.length
            ? '<div class="post-images count-' + p.images.length + '">' +
              p.images.map(src => '<img src="' + src + '" data-lightbox="' + src + '" alt="img" />').join('') +
              '</div>' : '';

        const tagsHtml = p.tags && p.tags.length
            ? '<div class="post-tags">' +
              p.tags.map(t => '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '">#' + UI.escapeHtml(t) + '#</a>').join('') +
              '</div>' : '';

        const visibilityLabel = { 'public': '🌐 公开', 'friends': '👥 仅好友', 'private': '🔒 仅自己' }[p.visibility] || '🌐 公开';
        const editedFlag = p.updatedAt && p.updatedAt - p.createdAt > 5000
            ? '<span style="font-size:11px;color:var(--color-text-light);">(已编辑)</span>' : '';

        return '<article class="post" data-post-id="' + p.id + '">' +
            '<div class="post-header">' +
            '<a href="user.html?id=' + author.id + '"><img class="post-header-avatar" src="' +
            (author.avatar || UI.defaultAvatar(author.nickname)) + '" alt="' + UI.escapeHtml(author.nickname) + '" /></a>' +
            '<div class="post-header-info">' +
            '<div class="post-author">' +
            '<a href="user.html?id=' + author.id + '">' + UI.escapeHtml(author.nickname) + '</a>' +
            (isHot ? ' <span class="badge-hot">🔥 热门</span>' : '') +
            (isNew ? ' <span class="badge-new">NEW</span>' : '') +
            '</div>' +
            '<div class="post-meta"><span>' + UI.timeAgo(p.createdAt) +
            '</span><span class="visibility">' + visibilityLabel + '</span> ' + editedFlag + '</div>' +
            '</div>' +
            (canManage
                ? '<div class="post-actions-trigger" data-act="more">⋯<div class="post-actions-menu">' +
                  (me.id === p.authorId ? '<button data-act="edit">✏️ 编辑</button>' : '') +
                  '<button data-act="delete">🗑️ 删除</button></div></div>' : '') +
            '</div>' +
            '<div class="post-content" data-act="goto">' + UI.renderContentText(p.content) + '</div>' +
            imagesHtml + tagsHtml +
            UI.renderReactionBar(p, me) +
            '<div class="post-stats-secondary">' +
            '<button class="post-stat-btn" data-act="comment">' +
            '<span class="icon">💬</span> <span class="cnt">' + commentCount + '</span></button>' +
            '<button class="post-stat-btn ' + (favorited ? 'active' : '') + '" data-act="favorite">' +
            '<span class="icon">' + (favorited ? '⭐' : '☆') + '</span> 收藏</button>' +
            '<button class="post-stat-btn" data-act="share"><span class="icon">🔗</span> 转发</button>' +
            '</div></article>';
    }

    function bindPostEvents(container) {
        container.onclick = async function (e) {
            const img = e.target.closest('img[data-lightbox]');
            if (img) { UI.showLightbox(img.dataset.lightbox); return; }

            const article = e.target.closest('.post');
            if (!article) return;
            const postId = article.dataset.postId;

            const trigger = e.target.closest('[data-act="more"]');
            if (trigger && !e.target.closest('.post-actions-menu')) {
                const menu = trigger.querySelector('.post-actions-menu');
                document.querySelectorAll('.post-actions-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
                menu.classList.toggle('show');
                e.stopPropagation();
                return;
            }

            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const act = btn.dataset.act;

            if (act === 'goto') { location.href = 'detail.html?id=' + postId; return; }
            if (act === 'react') {
                const me = UI.requireLogin(); if (!me) return;
                const type = btn.dataset.type;
                Store.toggleReaction(me.id, postId, type);
                renderFeed(); return;
            }
            if (act === 'comment') { location.href = 'detail.html?id=' + postId + '#comment'; return; }
            if (act === 'favorite') {
                const me = UI.requireLogin(); if (!me) return;
                const added = Store.toggleFavorite(me.id, postId);
                UI.showToast(added ? '已收藏 ⭐' : '取消收藏', 'success');
                renderFeed(); return;
            }
            if (act === 'share') {
                const url = location.origin + location.pathname.replace(/index\.html$/, '') + 'detail.html?id=' + postId;
                copyToClipboard(url);
                UI.showToast('已复制链接，可粘贴分享', 'success');
                return;
            }
            if (act === 'edit') { location.href = 'publish.html?edit=' + postId; return; }
            if (act === 'delete') {
                const ok = await UI.confirmDialog('确定删除这条动态吗？删除后不可恢复。');
                if (!ok) return;
                const me = Store.getCurrentUser();
                if (!UI.deletePostAs(postId, me)) return;
                UI.showToast('动态已删除', 'success');
                renderFeed();
                renderSidebarUser();
                renderTrending();
                renderHotTags();
            }
        };
        document.addEventListener('click', e => {
            if (!e.target.closest('[data-act="more"]')) {
                document.querySelectorAll('.post-actions-menu.show').forEach(m => m.classList.remove('show'));
            }
        });
    }

    function copyToClipboard(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) {}
    }

    function renderTrending() {
        const container = document.getElementById('trending-list');
        const posts = Store.getPosts()
            .filter(p => !p.deleted && p.visibility === 'public')
            .map(p => ({ p, score: Store.getTotalReactions(p.id) * 2 + Store.getCommentsByPost(p.id).length }))
            .sort((a, b) => b.score - a.score).slice(0, 5);
        if (posts.length === 0) {
            container.innerHTML = '<div style="font-size:13px;color:var(--color-text-light)">暂无数据</div>';
            return;
        }
        container.innerHTML = posts.map((item, idx) => {
            const author = Store.getUser(item.p.authorId);
            const text = item.p.content.replace(/\n/g, ' ').slice(0, 30);
            return '<div class="trending-item" onclick="location.href=\'detail.html?id=' + item.p.id + '\'">' +
                '<div class="trending-rank">' + (idx + 1) + '</div>' +
                '<div class="trending-info">' +
                '<div class="trending-title">' + UI.escapeHtml(text) + '</div>' +
                '<div class="trending-meta">' + UI.escapeHtml(author ? author.nickname : '匿名') +
                ' · ' + Store.getTotalReactions(item.p.id) + ' 互动</div></div></div>';
        }).join('');
    }

    function renderSuggestUsers() {
        const container = document.getElementById('suggest-users');
        const me = Store.getCurrentUser();
        const myFollowing = me ? Store.getFollowing(me.id) : [];
        const candidates = Store.getUsers()
            .filter(u => u.role !== 'admin' && (!me || (u.id !== me.id && !myFollowing.includes(u.id))))
            .sort((a, b) => Store.getFollowers(b.id).length - Store.getFollowers(a.id).length)
            .slice(0, 4);
        if (candidates.length === 0) {
            container.innerHTML = '<div style="font-size:13px;color:var(--color-text-light)">暂无推荐</div>';
            return;
        }
        container.innerHTML = candidates.map(u =>
            '<div class="suggest-user">' +
            '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
            '<div class="suggest-user-info">' +
            '<div class="suggest-user-name"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div>' +
            '<div class="suggest-user-bio">' + UI.escapeHtml(u.bio || '这位同学很神秘～') + '</div></div>' +
            '<button class="btn btn-outline btn-sm" data-follow="' + u.id + '">+ 关注</button></div>'
        ).join('');
        container.onclick = e => {
            const btn = e.target.closest('[data-follow]');
            if (!btn) return;
            const me = UI.requireLogin(); if (!me) return;
            const target = btn.dataset.follow;
            const followed = Store.toggleFollow(me.id, target);
            UI.showToast(followed ? '关注成功' : '已取关', 'success');
            renderSuggestUsers(); renderSidebarUser();
            if (currentMode === 'follow') renderFeed();
        };
    }

    function renderHotTags() {
        const container = document.getElementById('hot-tags');
        const counter = {};
        Store.getPosts().forEach(p => {
            if (p.deleted) return;
            (p.tags || []).forEach(t => counter[t] = (counter[t] || 0) + 1);
        });
        const list = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (list.length === 0) {
            container.innerHTML = '<div style="font-size:13px;color:var(--color-text-light)">暂无话题</div>';
            return;
        }
        container.innerHTML = list.map(([t, c]) =>
            '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '">#' + UI.escapeHtml(t) + '# · ' + c + '</a>'
        ).join('');
    }
})();

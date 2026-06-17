/**
 * Search / discover page.
 */
(function () {
    'use strict';

    let me = null;
    let activeTab = 'post';
    let keyword = '';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        me = Store.getCurrentUser();
        keyword = UI.getQueryParam('q') || '';
        document.getElementById('search-box').value = keyword;

        document.getElementById('search-btn').addEventListener('click', doSearch);
        document.getElementById('search-box').addEventListener('keydown', e => {
            if (e.key === 'Enter') doSearch();
        });

        document.getElementById('search-tabs').addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            activeTab = b.dataset.tab;
            document.querySelectorAll('#search-tabs button').forEach(x => x.classList.toggle('active', x === b));
            render();
        });

        render();
    }

    function doSearch() {
        keyword = document.getElementById('search-box').value.trim();
        history.replaceState(null, '', 'search.html?q=' + encodeURIComponent(keyword));
        render();
    }

    function render() {
        const wrap = document.getElementById('search-result');
        if (!keyword) { renderDiscovery(wrap); return; }

        if (activeTab === 'post') renderPosts(wrap);
        else if (activeTab === 'user') renderUsers(wrap);
        else if (activeTab === 'tag') renderTags(wrap);
    }

    function renderDiscovery(wrap) {
        // recommended posts based on user's tags
        let posts = Store.getPosts().filter(p => !p.deleted && UI.canViewPost(p, me));
        if (me && me.tags && me.tags.length) {
            posts = posts.map(p => ({
                p,
                score: (p.tags || []).reduce((s, t) => s + (me.tags.includes(t) ? 5 : 0), 0)
                       + Store.getLikeCount(p.id)
            })).sort((a, b) => b.score - a.score).map(x => x.p);
        } else {
            posts.sort((a, b) => Store.getLikeCount(b.id) - Store.getLikeCount(a.id));
        }
        posts = posts.slice(0, 12);

        const tagCounter = {};
        Store.getPosts().forEach(p => {
            if (p.deleted) return;
            (p.tags || []).forEach(t => tagCounter[t] = (tagCounter[t] || 0) + 1);
        });
        const hotTags = Object.entries(tagCounter).sort((a, b) => b[1] - a[1]).slice(0, 12);

        const users = Store.getUsers().filter(u => u.role !== 'admin' && (!me || u.id !== me.id))
                                       .sort((a, b) => Store.getFollowers(b.id).length - Store.getFollowers(a.id).length)
                                       .slice(0, 6);

        wrap.innerHTML =
            '<div class="card" style="margin-bottom:16px;">' +
            '<div class="sidebar-title" style="font-size:15px;">🏷️ 热门话题</div>' +
            '<div>' + (hotTags.length ? hotTags.map(([t, c]) =>
                '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '">#' + UI.escapeHtml(t) + '# · ' + c + '</a>'
            ).join('') : '<div style="color:var(--color-text-light);font-size:13px;">暂无</div>') + '</div>' +
            '</div>' +
            '<div class="card" style="margin-bottom:16px;">' +
            '<div class="sidebar-title" style="font-size:15px;">👥 推荐同学</div>' +
            '<div class="user-list">' + users.map(u =>
                '<div class="user-list-item">' +
                '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
                '<div class="info"><div class="name"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div>' +
                '<div class="bio">' + UI.escapeHtml(u.bio || '这位同学很神秘～') + '</div></div></div>'
            ).join('') + '</div></div>' +
            '<div class="sidebar-title" style="font-size:15px;margin:12px 0;">' +
            (me && me.tags && me.tags.length ? '✨ 根据你的兴趣推荐' : '🔥 大家在看') + '</div>' +
            '<div class="post-list">' + posts.map(postCardHtml).join('') + '</div>';

        bindFeedClicks(wrap);
    }

    function renderPosts(wrap) {
        const k = keyword.toLowerCase();
        const isTag = /^#.+#$/.test(keyword);
        const tagName = isTag ? keyword.replace(/#/g, '') : '';
        const list = Store.getPosts().filter(p => {
            if (p.deleted) return false;
            if (!UI.canViewPost(p, me)) return false;
            if (isTag) return (p.tags || []).includes(tagName);
            return p.content.toLowerCase().includes(k) || (p.tags || []).some(t => t.toLowerCase().includes(k));
        }).sort((a, b) => b.createdAt - a.createdAt);

        if (list.length === 0) {
            wrap.innerHTML = emptyResult(keyword);
            return;
        }
        wrap.innerHTML = '<div class="post-list">' + list.map(postCardHtml).join('') + '</div>';
        bindFeedClicks(wrap);
    }

    function renderUsers(wrap) {
        const k = keyword.toLowerCase();
        const list = Store.getUsers().filter(u =>
            (!me || u.id !== me.id) &&
            (u.nickname.toLowerCase().includes(k) || u.studentId.includes(keyword) ||
             (u.bio || '').toLowerCase().includes(k) || (u.tags || []).some(t => t.toLowerCase().includes(k)))
        );
        if (list.length === 0) { wrap.innerHTML = emptyResult(keyword); return; }
        wrap.innerHTML = '<div class="card"><div class="user-list">' + list.map(u => {
            const followed = me && Store.isFollowing(me.id, u.id);
            return '<div class="user-list-item">' +
                '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
                '<div class="info"><div class="name"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a> ' +
                '<span style="font-size:11px;color:var(--color-text-light);">@' + UI.escapeHtml(u.studentId) + '</span></div>' +
                '<div class="bio">' + UI.escapeHtml(u.bio || '这位同学很神秘～') + '</div></div>' +
                (me ? '<button class="btn ' + (followed ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-toggle="' + u.id + '">' +
                      (followed ? '已关注' : '+ 关注') + '</button>' : '') + '</div>';
        }).join('') + '</div></div>';
        wrap.querySelectorAll('[data-toggle]').forEach(b => {
            b.addEventListener('click', () => {
                const u = UI.requireLogin(); if (!u) return;
                Store.toggleFollow(u.id, b.dataset.toggle);
                renderUsers(wrap);
            });
        });
    }

    function renderTags(wrap) {
        const counter = {};
        Store.getPosts().forEach(p => {
            if (p.deleted) return;
            (p.tags || []).forEach(t => {
                if (t.toLowerCase().includes(keyword.toLowerCase().replace(/#/g, '')))
                    counter[t] = (counter[t] || 0) + 1;
            });
        });
        const list = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        if (list.length === 0) { wrap.innerHTML = emptyResult(keyword); return; }
        wrap.innerHTML = '<div class="card">' + list.map(([t, c]) =>
            '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '" style="font-size:14px;padding:6px 14px;margin:4px;">#' +
            UI.escapeHtml(t) + '# (' + c + ')</a>'
        ).join('') + '</div>';
    }

    function emptyResult(k) {
        return '<div class="empty-state"><div class="emoji">🤷</div><div class="title">没有找到与「' +
            UI.escapeHtml(k) + '」相关的结果</div><div class="desc">换个关键词试试吧</div></div>';
    }

    function postCardHtml(p) {
        const author = Store.getUser(p.authorId);
        if (!author) return '';
        const liked = me && Store.isLiked(me.id, p.id);
        const likeCount = Store.getLikeCount(p.id);
        const commentCount = Store.getCommentsByPost(p.id).length;
        const imagesHtml = (p.images || []).length
            ? '<div class="post-images count-' + p.images.length + '">' +
              p.images.map(s => '<img src="' + s + '" data-lightbox="' + s + '" />').join('') + '</div>'
            : '';
        const tagsHtml = (p.tags || []).length
            ? '<div class="post-tags">' + p.tags.map(t =>
                '<a class="tag" href="search.html?q=' + encodeURIComponent('#' + t + '#') + '">#' + UI.escapeHtml(t) + '#</a>'
              ).join('') + '</div>' : '';

        return '<article class="post" data-post-id="' + p.id + '">' +
            '<div class="post-header">' +
            '<a href="user.html?id=' + author.id + '"><img class="post-header-avatar" src="' + (author.avatar || UI.defaultAvatar(author.nickname)) + '" /></a>' +
            '<div class="post-header-info">' +
            '<div class="post-author"><a href="user.html?id=' + author.id + '">' + UI.escapeHtml(author.nickname) + '</a></div>' +
            '<div class="post-meta">' + UI.timeAgo(p.createdAt) + '</div></div></div>' +
            '<div class="post-content" data-act="goto" style="cursor:pointer;">' + UI.renderContentText(p.content) + '</div>' +
            imagesHtml + tagsHtml +
            '<div class="post-stats">' +
            '<button class="post-stat-btn ' + (liked ? 'active' : '') + '" data-act="like"><span class="icon">' + (liked ? '❤️' : '🤍') + '</span> ' + likeCount + '</button>' +
            '<button class="post-stat-btn" data-act="comment"><span class="icon">💬</span> ' + commentCount + '</button>' +
            '</div></article>';
    }

    function bindFeedClicks(wrap) {
        wrap.onclick = e => {
            const img = e.target.closest('img[data-lightbox]');
            if (img) { UI.showLightbox(img.dataset.lightbox); return; }
            const article = e.target.closest('.post');
            if (!article) return;
            const postId = article.dataset.postId;
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            if (btn.dataset.act === 'goto') location.href = 'detail.html?id=' + postId;
            else if (btn.dataset.act === 'like') {
                const u = UI.requireLogin(); if (!u) return;
                Store.toggleLike(u.id, postId);
                render();
            }
            else if (btn.dataset.act === 'comment') {
                location.href = 'detail.html?id=' + postId + '#comment';
            }
        };
    }
})();

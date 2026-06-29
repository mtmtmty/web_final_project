/**
 * Public user profile page (other users).
 */
(function () {
    'use strict';

    let user = null;
    let me = null;
    let tab = 'posts';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const id = UI.getQueryParam('id');
        if (!id) { goNotFound(); return; }
        user = Store.getUser(id);
        if (!user) { goNotFound(); return; }
        me = Store.getCurrentUser();

        // self - redirect to profile.html
        if (me && me.id === user.id) {
            location.replace('profile.html');
            return;
        }

        // increase visit
        Store.updateUser(user.id, { visits: (user.visits || 0) + 1 });
        user = Store.getUser(user.id);

        renderHeader();
        bindTabs();
        renderTabContent();
    }

    function goNotFound() {
        document.getElementById('user-root').innerHTML =
            '<div class="empty-state"><div class="emoji">😶</div>' +
            '<div class="title">用户不存在</div>' +
            '<div class="desc"><a href="index.html" class="auth-link">返回首页</a></div></div>';
    }

    function renderHeader() {
        const myFollows = me ? Store.getFollowing(me.id) : [];
        const isFollowing = me && myFollows.includes(user.id);
        const isFan = me && Store.isFollowing(user.id, me.id);
        const mutual = isFollowing && isFan;

        const myPosts = Store.getPosts().filter(p => p.authorId === user.id && !p.deleted && UI.canViewPost(p, me)).length;
        const following = Store.getFollowing(user.id).length;
        const followers = Store.getFollowers(user.id).length;
        const tagsHtml = (user.tags || []).map(t => '<span class="tag">' + UI.escapeHtml(t) + '</span>').join('');

        const banned = user.status === 'banned';

        document.getElementById('user-root').innerHTML =
            '<div class="profile-header">' +
            '  <div class="profile-cover"></div>' +
            '  <div class="profile-info">' +
            '    <div class="profile-avatar-wrap">' +
            '      <img class="profile-avatar" src="' + (user.avatar || UI.defaultAvatar(user.nickname)) + '" />' +
            '      <div class="profile-actions">' +
                  (me
                    ? '<button class="btn ' + (isFollowing ? 'btn-ghost' : 'btn-primary') + '" id="follow-btn">' +
                      (isFollowing ? (mutual ? '相互关注 · 取关' : '已关注') : (isFan ? '回关 TA' : '+ 关注')) + '</button>' +
                      '<a class="btn btn-outline" href="messages.html?to=' + user.id + '">💬 私信</a>'
                    : '<a class="btn btn-primary" href="login.html">登录后关注</a>') +
            '      </div>' +
            '    </div>' +
            '    <div class="profile-name-row">' +
            '      <div class="profile-name">' + UI.escapeHtml(user.nickname) + '</div>' +
            '      <span class="profile-id">学号 ' + UI.escapeHtml(user.studentId) + '</span>' +
                  (user.role === 'admin' ? '<span class="status-pill admin">管理员</span>' : '') +
                  (banned ? '<span class="status-pill banned">已封禁</span>' : '') +
                  (mutual ? '<span class="status-pill active">互相关注</span>' : '') +
            '    </div>' +
            '    <div class="profile-bio">' + UI.escapeHtml(user.bio || '这位同学很神秘～') + '</div>' +
            '    <div class="profile-tags">' + tagsHtml + '</div>' +
            '    <div class="profile-stats">' +
            '      <div class="profile-stat-item"><div class="profile-stat-num">' + myPosts + '</div><div class="profile-stat-label">动态</div></div>' +
            '      <div class="profile-stat-item"><div class="profile-stat-num">' + following + '</div><div class="profile-stat-label">关注</div></div>' +
            '      <div class="profile-stat-item"><div class="profile-stat-num">' + followers + '</div><div class="profile-stat-label">粉丝</div></div>' +
            '      <div class="profile-stat-item"><div class="profile-stat-num">' + (user.visits || 0) + '</div><div class="profile-stat-label">访客</div></div>' +
            '    </div>' +
            '    <div class="profile-meta">' +
            '      <span>📅 加入：' + UI.formatTime(user.createdAt) + '</span>' +
            '      <span>⏰ 活跃：' + UI.timeAgo(user.lastActiveAt || user.createdAt) + '</span>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        const fb = document.getElementById('follow-btn');
        if (fb) fb.addEventListener('click', () => {
            const u = UI.requireLogin(); if (!u) return;
            const followed = Store.toggleFollow(u.id, user.id);
            UI.showToast(followed ? '关注成功 ❤️' : '已取关', 'success');
            renderHeader();
        });
    }

    function bindTabs() {
        document.getElementById('user-tabs').addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            tab = b.dataset.tab;
            document.querySelectorAll('#user-tabs button').forEach(x => x.classList.toggle('active', x === b));
            renderTabContent();
        });
    }

    function renderTabContent() {
        if (tab === 'posts') renderPosts();
        else if (tab === 'photos') renderPhotos();
        else if (tab === 'following') renderFollowing();
    }

    function postCardHtml(p) {
        const commentCount = Store.getCommentsByPost(p.id).length;

        const imagesHtml = (p.images || []).length
            ? '<div class="post-images count-' + p.images.length + '">' +
              p.images.map(s => '<img src="' + s + '" data-lightbox="' + s + '" />').join('') + '</div>'
            : '';
        const tagsHtml = (p.tags || []).length
            ? '<div class="post-tags">' + p.tags.map(t => '<span class="tag">#' + UI.escapeHtml(t) + '#</span>').join('') + '</div>'
            : '';
        const visibility = { 'public':'🌐 公开', 'friends':'👥 仅好友', 'private':'🔒 仅自己' }[p.visibility];

        return '<article class="post" data-post-id="' + p.id + '">' +
            '<div class="post-header">' +
            '<img class="post-header-avatar" src="' + (user.avatar || UI.defaultAvatar(user.nickname)) + '" />' +
            '<div class="post-header-info">' +
            '<div class="post-author">' + UI.escapeHtml(user.nickname) + '</div>' +
            '<div class="post-meta"><span>' + UI.timeAgo(p.createdAt) + '</span><span class="visibility">' + visibility + '</span></div>' +
            '</div></div>' +
            '<div class="post-content" data-act="goto" style="cursor:pointer;">' + UI.renderContentText(p.content) + '</div>' +
            imagesHtml + tagsHtml +
            UI.renderReactionBar(p, me) +
            '<div class="post-stats-secondary">' +
            '<button class="post-stat-btn" data-act="comment"><span class="icon">💬</span> ' + commentCount + '</button>' +
            (me && me.role === 'admin'
                ? '<button class="post-stat-btn" data-act="delete"><span class="icon">🗑️</span> 删除</button>' : '') +
            '</div></article>';
    }

    function renderPosts() {
        const list = Store.getPosts()
            .filter(p => p.authorId === user.id && !p.deleted && UI.canViewPost(p, me))
            .sort((a, b) => b.createdAt - a.createdAt);
        const wrap = document.getElementById('user-tab-content');
        if (list.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><div class="emoji">📭</div><div class="title">TA 还没有可见的动态</div></div>';
            return;
        }
        wrap.innerHTML = '<div class="post-list">' + list.map(postCardHtml).join('') + '</div>';
        wrap.onclick = async e => {
            const img = e.target.closest('img[data-lightbox]');
            if (img) { UI.showLightbox(img.dataset.lightbox); return; }
            const article = e.target.closest('.post');
            if (!article) return;
            const postId = article.dataset.postId;
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            if (btn.dataset.act === 'goto') location.href = 'detail.html?id=' + postId;
            else if (btn.dataset.act === 'react') {
                const u = UI.requireLogin(); if (!u) return;
                Store.toggleReaction(u.id, postId, btn.dataset.type);
                renderPosts();
            } else if (btn.dataset.act === 'comment') {
                location.href = 'detail.html?id=' + postId + '#comment';
            } else if (btn.dataset.act === 'delete') {
                const ok = await UI.confirmDialog('确定删除该动态？删除后不可恢复。');
                if (!ok) return;
                if (!UI.deletePostAs(postId, me)) return;
                UI.showToast('动态已删除', 'success');
                renderHeader();
                renderPosts();
            }
        };
    }

    function renderPhotos() {
        const photos = [];
        Store.getPosts().filter(p => p.authorId === user.id && !p.deleted && UI.canViewPost(p, me))
            .forEach(p => (p.images || []).forEach(img => photos.push(img)));
        const wrap = document.getElementById('user-tab-content');
        if (photos.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><div class="emoji">🖼️</div><div class="title">相册墙是空的</div></div>';
            return;
        }
        wrap.innerHTML = '<div class="card"><div class="photo-wall">' +
            photos.map(p => '<img src="' + p + '" data-lightbox="' + p + '" />').join('') + '</div></div>';
        wrap.querySelectorAll('img[data-lightbox]').forEach(i =>
            i.addEventListener('click', () => UI.showLightbox(i.dataset.lightbox)));
    }

    function renderFollowing() {
        const followingIds = Store.getFollowing(user.id);
        const followerIds = Store.getFollowers(user.id);
        const wrap = document.getElementById('user-tab-content');
        wrap.innerHTML =
            '<div class="card"><div class="sidebar-title">关注 (' + followingIds.length + ')</div>' +
            '<div class="user-list">' + renderUsers(followingIds) + '</div></div>' +
            '<div class="card" style="margin-top:14px;"><div class="sidebar-title">粉丝 (' + followerIds.length + ')</div>' +
            '<div class="user-list">' + renderUsers(followerIds) + '</div></div>';
    }

    function renderUsers(ids) {
        if (!ids.length) return '<div class="empty-state" style="padding:20px;"><div class="desc">暂无</div></div>';
        return ids.map(id => {
            const u = Store.getUser(id);
            if (!u) return '';
            return '<div class="user-list-item">' +
                '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
                '<div class="info"><div class="name"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div>' +
                '<div class="bio">' + UI.escapeHtml(u.bio || '这位同学很神秘～') + '</div></div></div>';
        }).join('');
    }
})();

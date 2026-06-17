/**
 * Profile page (current user own profile).
 * Tabs: posts / favorites / photos / following / edit
 */
(function () {
    'use strict';

    const PRESET_TAGS = ['前端', '后端', '设计', '摄影', '音乐', '电影', '游戏', '电竞',
        '篮球', '足球', '动漫', '阅读', '旅行', '美食', '健身', '咖啡', '猫猫', '狗狗',
        '考研', '出国', '英语角', '辩论', '编程', '数学'];

    let me = null;
    let currentTab = 'posts';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        me = UI.requireLogin();
        if (!me) return;
        currentTab = UI.getQueryParam('tab') || 'posts';
        renderHeader();
        renderTabs();
        bindTabs();
        renderTabContent();
    }

    function renderHeader() {
        const myPosts = Store.getPosts().filter(p => p.authorId === me.id && !p.deleted).length;
        const following = Store.getFollowing(me.id).length;
        const followers = Store.getFollowers(me.id).length;
        const tagsHtml = (me.tags || []).map(t => '<span class="tag">' + UI.escapeHtml(t) + '</span>').join('');

        document.getElementById('profile-root').innerHTML =
            '<div class="profile-header">' +
            '  <div class="profile-cover"></div>' +
            '  <div class="profile-info">' +
            '    <div class="profile-avatar-wrap">' +
            '      <img class="profile-avatar" src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" />' +
            '      <div class="profile-actions">' +
            '        <a href="publish.html" class="btn btn-primary">+ 发布动态</a>' +
            '      </div>' +
            '    </div>' +
            '    <div class="profile-name-row">' +
            '      <div class="profile-name">' + UI.escapeHtml(me.nickname) + '</div>' +
            '      <span class="profile-id">学号 ' + UI.escapeHtml(me.studentId) + '</span>' +
                  (me.role === 'admin' ? '<span class="status-pill admin">管理员</span>' : '') +
            '    </div>' +
            '    <div class="profile-bio">' + UI.escapeHtml(me.bio || '这位同学很神秘～') + '</div>' +
            '    <div class="profile-tags">' + tagsHtml + '</div>' +
            '    <div class="profile-stats">' +
            '      <div class="profile-stat-item" data-go="posts"><div class="profile-stat-num">' + myPosts + '</div><div class="profile-stat-label">动态</div></div>' +
            '      <div class="profile-stat-item" data-go="following"><div class="profile-stat-num">' + following + '</div><div class="profile-stat-label">关注</div></div>' +
            '      <div class="profile-stat-item" data-go="following"><div class="profile-stat-num">' + followers + '</div><div class="profile-stat-label">粉丝</div></div>' +
            '      <div class="profile-stat-item"><div class="profile-stat-num">' + (me.visits || 0) + '</div><div class="profile-stat-label">访客</div></div>' +
            '    </div>' +
            '    <div class="profile-meta">' +
            '      <span>📅 加入时间：' + UI.formatTime(me.createdAt) + '</span>' +
            '      <span>⏰ 最近活跃：' + UI.timeAgo(me.lastActiveAt || me.createdAt) + '</span>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        document.querySelectorAll('.profile-stat-item[data-go]').forEach(el => {
            el.addEventListener('click', () => switchTab(el.dataset.go));
        });
    }

    function renderTabs() {
        document.querySelectorAll('#profile-tabs button').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === currentTab);
        });
    }

    function bindTabs() {
        document.getElementById('profile-tabs').addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            switchTab(btn.dataset.tab);
        });
    }

    function switchTab(tab) {
        currentTab = tab;
        renderTabs();
        renderTabContent();
        history.replaceState(null, '', 'profile.html?tab=' + tab);
    }

    function renderTabContent() {
        if (currentTab === 'posts') renderPosts();
        else if (currentTab === 'favorites') renderFavorites();
        else if (currentTab === 'photos') renderPhotos();
        else if (currentTab === 'following') renderFollowing();
        else if (currentTab === 'edit') renderEdit();
    }

    function postCardHtml(p) {
        const liked = Store.isLiked(me.id, p.id);
        const likeCount = Store.getLikeCount(p.id);
        const commentCount = Store.getCommentsByPost(p.id).length;
        const author = Store.getUser(p.authorId);
        if (!author) return '';

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
            '<img class="post-header-avatar" src="' + (author.avatar || UI.defaultAvatar(author.nickname)) + '" />' +
            '<div class="post-header-info">' +
            '<div class="post-author">' + UI.escapeHtml(author.nickname) + '</div>' +
            '<div class="post-meta"><span>' + UI.timeAgo(p.createdAt) + '</span><span class="visibility">' + visibility + '</span></div>' +
            '</div></div>' +
            '<div class="post-content" data-act="goto" style="cursor:pointer;">' + UI.renderContentText(p.content) + '</div>' +
            imagesHtml + tagsHtml +
            '<div class="post-stats">' +
            '<button class="post-stat-btn ' + (liked ? 'active' : '') + '" data-act="like"><span class="icon">' + (liked ? '❤️' : '🤍') + '</span> ' + likeCount + '</button>' +
            '<button class="post-stat-btn" data-act="comment"><span class="icon">💬</span> ' + commentCount + '</button>' +
            (p.authorId === me.id || me.role === 'admin'
                ? '<button class="post-stat-btn" data-act="edit"><span class="icon">✏️</span> 编辑</button>' +
                  '<button class="post-stat-btn" data-act="delete"><span class="icon">🗑️</span> 删除</button>' : '') +
            '</div></article>';
    }

    function bindPostListEvents(container) {
        container.onclick = async function (e) {
            const img = e.target.closest('img[data-lightbox]');
            if (img) { UI.showLightbox(img.dataset.lightbox); return; }
            const article = e.target.closest('.post');
            if (!article) return;
            const postId = article.dataset.postId;
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const act = btn.dataset.act;
            if (act === 'goto') location.href = 'detail.html?id=' + postId;
            else if (act === 'like') { Store.toggleLike(me.id, postId); renderTabContent(); }
            else if (act === 'comment') location.href = 'detail.html?id=' + postId + '#comment';
            else if (act === 'edit') location.href = 'publish.html?edit=' + postId;
            else if (act === 'delete') {
                const ok = await UI.confirmDialog('确定删除该动态？');
                if (!ok) return;
                Store.deletePost(postId);
                UI.showToast('已删除', 'success');
                renderHeader();
                renderTabContent();
            }
        };
    }

    function renderPosts() {
        const list = Store.getPosts().filter(p => p.authorId === me.id && !p.deleted)
                                     .sort((a, b) => b.createdAt - a.createdAt);
        const wrap = document.getElementById('tab-content');
        if (list.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><div class="emoji">📝</div>' +
                '<div class="title">还没有发布过动态</div>' +
                '<div class="desc"><a href="publish.html" class="auth-link">去发布第一条</a></div></div>';
            return;
        }
        wrap.innerHTML = '<div class="post-list">' + list.map(postCardHtml).join('') + '</div>';
        bindPostListEvents(wrap);
    }

    function renderFavorites() {
        const ids = Store.getFavoritePostIds(me.id);
        const list = ids.map(id => Store.getPost(id)).filter(p => p && !p.deleted && UI.canViewPost(p, me));
        const wrap = document.getElementById('tab-content');
        if (list.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><div class="emoji">⭐</div>' +
                '<div class="title">还没有收藏</div>' +
                '<div class="desc">逛逛 <a href="index.html" class="auth-link">首页</a> 收藏喜欢的动态吧</div></div>';
            return;
        }
        wrap.innerHTML = '<div class="post-list">' + list.map(postCardHtml).join('') + '</div>';
        bindPostListEvents(wrap);
    }

    function renderPhotos() {
        const photos = [];
        Store.getPosts().filter(p => p.authorId === me.id && !p.deleted)
            .forEach(p => (p.images || []).forEach(img => photos.push(img)));
        const wrap = document.getElementById('tab-content');
        if (photos.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><div class="emoji">🖼️</div>' +
                '<div class="title">相册墙是空的</div><div class="desc">发布带图动态后会自动展示在这里</div></div>';
            return;
        }
        wrap.innerHTML = '<div class="card"><div class="photo-wall">' +
            photos.map(p => '<img src="' + p + '" data-lightbox="' + p + '" />').join('') +
            '</div></div>';
        wrap.querySelectorAll('img[data-lightbox]').forEach(i =>
            i.addEventListener('click', () => UI.showLightbox(i.dataset.lightbox)));
    }

    function renderFollowing() {
        const followingIds = Store.getFollowing(me.id);
        const followerIds = Store.getFollowers(me.id);
        const wrap = document.getElementById('tab-content');
        wrap.innerHTML =
            '<div class="card"><div class="sidebar-title">关注的人 (' + followingIds.length + ')</div>' +
            '<div class="user-list" id="following-list"></div></div>' +
            '<div class="card" style="margin-top:14px;"><div class="sidebar-title">粉丝 (' + followerIds.length + ')</div>' +
            '<div class="user-list" id="follower-list"></div></div>';

        renderUserList('following-list', followingIds, true);
        renderUserList('follower-list', followerIds, false);
    }

    function renderUserList(boxId, ids, isFollowing) {
        const box = document.getElementById(boxId);
        if (!ids.length) {
            box.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="desc">暂无</div></div>';
            return;
        }
        box.innerHTML = ids.map(id => {
            const u = Store.getUser(id);
            if (!u) return '';
            const followed = Store.isFollowing(me.id, u.id);
            return '<div class="user-list-item">' +
                '<a href="user.html?id=' + u.id + '"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" /></a>' +
                '<div class="info">' +
                '<div class="name"><a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div>' +
                '<div class="bio">' + UI.escapeHtml(u.bio || '这位同学很神秘～') + '</div>' +
                '</div>' +
                '<button class="btn ' + (followed ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-toggle="' + u.id + '">' +
                (followed ? '已关注' : '+ 关注') + '</button></div>';
        }).join('');

        box.querySelectorAll('[data-toggle]').forEach(b => {
            b.addEventListener('click', () => {
                Store.toggleFollow(me.id, b.dataset.toggle);
                renderHeader();
                renderFollowing();
            });
        });
    }

    function renderEdit() {
        const wrap = document.getElementById('tab-content');
        wrap.innerHTML =
            '<div class="card edit-form">' +
            '<h3 style="margin-bottom:16px;">编辑资料</h3>' +
            '<div class="avatar-picker">' +
            '  <img id="ep-avatar" src="' + (me.avatar || UI.defaultAvatar(me.nickname)) + '" />' +
            '  <div style="flex:1;">' +
            '    <label class="btn btn-outline btn-sm">📷 上传头像<input type="file" accept="image/*" id="ep-avatar-file" style="display:none;"/></label>' +
            '  </div>' +
            '</div>' +
            '<div class="form-row">' +
            '  <div class="form-group"><label class="form-label">学号（不可修改）</label><input class="form-control" disabled value="' + UI.escapeHtml(me.studentId) + '" /></div>' +
            '  <div class="form-group"><label class="form-label">昵称</label><input class="form-control" id="ep-nick" value="' + UI.escapeHtml(me.nickname) + '" maxlength="12"/></div>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">个人简介</label>' +
            '<textarea class="form-control" id="ep-bio" maxlength="80">' + UI.escapeHtml(me.bio || '') + '</textarea></div>' +
            '<div class="form-group"><label class="form-label">兴趣标签（最多 6 个）</label>' +
            '<div class="tag-selector" id="ep-tags"></div></div>' +
            '<div class="form-group"><label class="form-label">修改密码（留空则不修改）</label>' +
            '<input class="form-control" type="password" id="ep-pwd" placeholder="新密码"/></div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '  <button class="btn btn-ghost" id="ep-cancel">取消</button>' +
            '  <button class="btn btn-primary" id="ep-save">保存修改</button>' +
            '</div></div>';

        // tags
        const tagBox = document.getElementById('ep-tags');
        const selected = new Set(me.tags || []);
        tagBox.innerHTML = PRESET_TAGS.map(t =>
            '<span class="tag-option' + (selected.has(t) ? ' selected' : '') + '" data-tag="' + t + '">' + t + '</span>'
        ).join('');
        tagBox.addEventListener('click', e => {
            const op = e.target.closest('.tag-option');
            if (!op) return;
            const t = op.dataset.tag;
            if (selected.has(t)) { selected.delete(t); op.classList.remove('selected'); }
            else {
                if (selected.size >= 6) { UI.showToast('最多 6 个', 'warning'); return; }
                selected.add(t); op.classList.add('selected');
            }
        });

        // avatar upload
        let newAvatar = me.avatar || UI.defaultAvatar(me.nickname);
        document.getElementById('ep-avatar-file').addEventListener('change', async e => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 1024 * 1024 * 2) { UI.showToast('头像不超过 2MB', 'warning'); return; }
            newAvatar = await UI.fileToBase64(f);
            document.getElementById('ep-avatar').src = newAvatar;
        });

        document.getElementById('ep-cancel').addEventListener('click', () => switchTab('posts'));

        document.getElementById('ep-save').addEventListener('click', () => {
            const nickname = document.getElementById('ep-nick').value.trim();
            const bio = document.getElementById('ep-bio').value.trim();
            const pwd = document.getElementById('ep-pwd').value;
            if (nickname.length < 2 || nickname.length > 12) { UI.showToast('昵称 2-12 字', 'error'); return; }
            const patch = { nickname, bio, avatar: newAvatar, tags: Array.from(selected) };
            if (pwd) {
                if (pwd.length < 6 || pwd.length > 20) { UI.showToast('密码长度 6-20', 'error'); return; }
                patch.password = pwd;
            }
            Store.updateUser(me.id, patch);
            me = Store.getUser(me.id);
            UI.showToast('资料已更新 ✅', 'success');
            renderHeader();
            UI.renderNavbar('profile');
        });
    }
})();

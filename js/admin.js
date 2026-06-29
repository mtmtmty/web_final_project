/**
 * Admin backstage:
 *  - dashboard, user mgmt (ban / reset / role / delete),
 *    post mgmt (delete / pin), comment mgmt
 */
(function () {
    'use strict';

    let me = null;
    let currentTab = 'dashboard';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        me = UI.requireLogin();
        if (!me) return;
        if (me.role !== 'admin') {
            UI.showToast('无权访问管理后台', 'error');
            setTimeout(() => location.href = 'index.html', 800);
            return;
        }

        const nav = document.getElementById('admin-nav');
        nav.addEventListener('click', e => {
            const a = e.target.closest('a[data-tab]');
            if (!a) return;
            currentTab = a.dataset.tab;
            nav.querySelectorAll('a').forEach(x => x.classList.toggle('active', x === a));
            render();
        });

        render();
    }

    function render() {
        if (currentTab === 'dashboard') renderDashboard();
        else if (currentTab === 'users') renderUsers();
        else if (currentTab === 'posts') renderPosts();
        else if (currentTab === 'comments') renderComments();
    }

    function renderDashboard() {
        const c = document.getElementById('admin-content');
        const users = Store.getUsers();
        const posts = Store.getPosts().filter(p => !p.deleted);
        const comments = Store.getComments();
        const likes = Store.getLikes();
        const follows = Store.getFollows();
        const bannedCount = users.filter(u => u.status === 'banned').length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayPosts = posts.filter(p => p.createdAt >= todayStart.getTime()).length;

        c.innerHTML =
            '<h2 style="margin-bottom:16px;">📊 数据概览</h2>' +
            '<div class="admin-stats">' +
            statCard('用户总数', users.length) +
            statCard('动态总数', posts.length) +
            statCard('评论总数', comments.length) +
            statCard('点赞总数', likes.length) +
            statCard('关注关系', follows.length) +
            statCard('封禁用户', bannedCount) +
            statCard('今日新动态', todayPosts) +
            statCard('管理员', users.filter(u => u.role === 'admin').length) +
            '</div>' +
            '<div class="card" style="margin-top:20px;"><div class="sidebar-title">最新注册用户</div>' +
            '<table class="admin-table"><thead><tr>' +
            '<th>用户</th><th>学号</th><th>注册时间</th><th>状态</th></tr></thead><tbody>' +
            users.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map(u =>
                '<tr><td><div class="user-cell"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" />' + UI.escapeHtml(u.nickname) + '</div></td>' +
                '<td>' + UI.escapeHtml(u.studentId) + '</td>' +
                '<td>' + UI.formatTime(u.createdAt) + '</td>' +
                '<td><span class="status-pill ' + (u.status === 'banned' ? 'banned' : 'active') + '">' +
                  (u.status === 'banned' ? '封禁' : '正常') + '</span></td></tr>'
            ).join('') + '</tbody></table></div>';
    }

    function statCard(label, value) {
        return '<div class="stat-card"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>';
    }

    function renderUsers() {
        const c = document.getElementById('admin-content');
        const users = Store.getUsers();
        c.innerHTML =
            '<h2 style="margin-bottom:16px;">👤 用户管理</h2>' +
            '<div style="margin-bottom:12px;">' +
            '<input class="form-control" id="user-search" placeholder="搜索昵称 / 学号..." style="max-width:300px;display:inline-block;" />' +
            '</div>' +
            '<table class="admin-table"><thead><tr>' +
            '<th>用户</th><th>学号</th><th>角色</th><th>状态</th><th>动态/粉丝</th><th>注册时间</th><th>操作</th>' +
            '</tr></thead><tbody id="user-table-body"></tbody></table>';

        function paint(filter) {
            const list = users.filter(u => {
                if (!filter) return true;
                return u.nickname.includes(filter) || u.studentId.includes(filter);
            });
            const body = document.getElementById('user-table-body');
            body.innerHTML = list.map(u => {
                const isAdmin = u.role === 'admin';
                const banned = u.status === 'banned';
                const isMe = u.id === me.id;
                const postCnt = Store.getPosts().filter(p => p.authorId === u.id && !p.deleted).length;
                const fanCnt = Store.getFollowers(u.id).length;
                return '<tr>' +
                    '<td><div class="user-cell"><img src="' + (u.avatar || UI.defaultAvatar(u.nickname)) + '" />' +
                       '<a href="user.html?id=' + u.id + '">' + UI.escapeHtml(u.nickname) + '</a></div></td>' +
                    '<td>' + UI.escapeHtml(u.studentId) + '</td>' +
                    '<td><span class="status-pill ' + (isAdmin ? 'admin' : 'active') + '">' + (isAdmin ? '管理员' : '普通') + '</span></td>' +
                    '<td><span class="status-pill ' + (banned ? 'banned' : 'active') + '">' + (banned ? '封禁' : '正常') + '</span></td>' +
                    '<td>' + postCnt + ' / ' + fanCnt + '</td>' +
                    '<td>' + UI.formatTime(u.createdAt) + '</td>' +
                    '<td><div class="actions">' +
                    (isMe ? '<span style="color:var(--color-text-light);font-size:12px;">(自己)</span>' :
                        (banned
                            ? '<button class="btn btn-outline btn-sm" data-act="unban" data-id="' + u.id + '">解封</button>'
                            : '<button class="btn btn-danger btn-sm" data-act="ban" data-id="' + u.id + '">封禁</button>') +
                        '<button class="btn btn-ghost btn-sm" data-act="reset" data-id="' + u.id + '">重置资料</button>' +
                        (isAdmin
                            ? '<button class="btn btn-ghost btn-sm" data-act="demote" data-id="' + u.id + '">取消管理员</button>'
                            : '<button class="btn btn-ghost btn-sm" data-act="promote" data-id="' + u.id + '">设为管理员</button>') +
                        '<button class="btn btn-ghost btn-sm" data-act="del" data-id="' + u.id + '">删除</button>'
                    ) +
                    '</div></td></tr>';
            }).join('');
            body.querySelectorAll('button[data-act]').forEach(btn => {
                btn.addEventListener('click', () => handleUserAction(btn.dataset.act, btn.dataset.id, () => paint(filter)));
            });
        }

        document.getElementById('user-search').addEventListener('input', e => paint(e.target.value.trim()));
        paint('');
    }

    async function handleUserAction(act, id, refresh) {
        const u = Store.getUser(id);
        if (!u) return;
        if (act === 'ban') {
            const ok = await UI.confirmDialog('确定封禁用户「' + u.nickname + '」？');
            if (!ok) return;
            Store.updateUser(id, { status: 'banned' });
            UI.showToast('已封禁', 'success');
        } else if (act === 'unban') {
            Store.updateUser(id, { status: 'active' });
            UI.showToast('已解封', 'success');
        } else if (act === 'reset') {
            const ok = await UI.confirmDialog('确定重置「' + u.nickname + '」的资料？\n（昵称、头像、简介、标签将被清空，密码重置为 123456）');
            if (!ok) return;
            Store.updateUser(id, {
                nickname: '同学' + u.studentId.slice(-4),
                avatar: UI.defaultAvatar('?'),
                bio: '',
                tags: [],
                password: '123456'
            });
            UI.showToast('已重置', 'success');
        } else if (act === 'promote') {
            Store.updateUser(id, { role: 'admin' });
            UI.showToast('已设为管理员', 'success');
        } else if (act === 'demote') {
            Store.updateUser(id, { role: 'user' });
            UI.showToast('已取消管理员', 'success');
        } else if (act === 'del') {
            const ok = await UI.confirmDialog('确定删除该用户？所有相关动态也会被删除！');
            if (!ok) return;
            Store.getPosts().filter(p => p.authorId === id).forEach(p => Store.deletePost(p.id));
            Store.deleteUser(id);
            UI.showToast('已删除', 'success');
        }
        refresh && refresh();
    }

    function renderPosts() {
        const c = document.getElementById('admin-content');
        const posts = Store.getPosts().filter(p => !p.deleted).sort((a, b) => b.createdAt - a.createdAt);
        c.innerHTML =
            '<h2 style="margin-bottom:16px;">📝 动态管理</h2>' +
            '<table class="admin-table"><thead><tr>' +
            '<th>作者</th><th>内容</th><th>互动</th><th>可见性</th><th>发布时间</th><th>操作</th>' +
            '</tr></thead><tbody>' +
            posts.map(p => {
                const u = Store.getUser(p.authorId);
                const cnt = Store.getTotalReactions(p.id) + ' 互动 / ' + Store.getCommentsByPost(p.id).length + ' 评';
                return '<tr>' +
                    '<td><div class="user-cell">' +
                    '<img src="' + (u ? (u.avatar || UI.defaultAvatar(u.nickname)) : UI.defaultAvatar('?')) + '" />' +
                    UI.escapeHtml(u ? u.nickname : '已删除') + '</div></td>' +
                    '<td><div style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
                    UI.escapeHtml(p.content || '(图片动态)') + '</div></td>' +
                    '<td>' + cnt + '</td>' +
                    '<td>' + (p.visibility || 'public') + '</td>' +
                    '<td>' + UI.formatTime(p.createdAt) + '</td>' +
                    '<td><div class="actions">' +
                    '<a class="btn btn-ghost btn-sm" href="detail.html?id=' + p.id + '">查看</a>' +
                    '<button class="btn btn-danger btn-sm" data-del="' + p.id + '">删除</button>' +
                    '</div></td></tr>';
            }).join('') + '</tbody></table>';
        c.querySelectorAll('[data-del]').forEach(b => {
            b.addEventListener('click', async () => {
                const ok = await UI.confirmDialog('确定删除该动态？');
                if (!ok) return;
                if (!UI.deletePostAs(b.dataset.del, me)) return;
                UI.showToast('已删除', 'success');
                renderPosts();
            });
        });
    }

    function renderComments() {
        const c = document.getElementById('admin-content');
        const comments = Store.getComments().slice().sort((a, b) => b.createdAt - a.createdAt);
        c.innerHTML =
            '<h2 style="margin-bottom:16px;">💬 评论管理</h2>' +
            '<table class="admin-table"><thead><tr>' +
            '<th>作者</th><th>评论内容</th><th>所属动态</th><th>时间</th><th>操作</th>' +
            '</tr></thead><tbody>' +
            comments.map(cm => {
                const u = Store.getUser(cm.authorId);
                const p = Store.getPost(cm.postId);
                return '<tr>' +
                    '<td><div class="user-cell">' +
                    '<img src="' + (u ? (u.avatar || UI.defaultAvatar(u.nickname)) : UI.defaultAvatar('?')) + '" />' +
                    UI.escapeHtml(u ? u.nickname : '已删除') + '</div></td>' +
                    '<td><div style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
                    UI.escapeHtml(cm.content) + '</div></td>' +
                    '<td>' + (p ? '<a href="detail.html?id=' + p.id + '">查看动态</a>' : '已删除') + '</td>' +
                    '<td>' + UI.formatTime(cm.createdAt) + '</td>' +
                    '<td><button class="btn btn-danger btn-sm" data-del="' + cm.id + '">删除</button></td></tr>';
            }).join('') + '</tbody></table>';
        c.querySelectorAll('[data-del]').forEach(b => {
            b.addEventListener('click', async () => {
                const ok = await UI.confirmDialog('确定删除该评论？');
                if (!ok) return;
                Store.deleteComment(b.dataset.del);
                UI.showToast('已删除', 'success');
                renderComments();
            });
        });
    }
})();

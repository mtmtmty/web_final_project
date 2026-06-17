/**
 * Messages page (UI demo - LocalStorage based).
 */
(function () {
    'use strict';

    let me = null;
    let activePeer = null;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        me = UI.requireLogin();
        if (!me) return;

        const to = UI.getQueryParam('to');
        if (to && to !== me.id && Store.getUser(to)) {
            activePeer = to;
        }

        renderConvList();
        if (activePeer) renderChat();
    }

    function getConversations() {
        // build a peer list based on messages
        const all = Store.getMessages().filter(m => m.senderId === me.id || m.receiverId === me.id);
        const peerMap = {};
        all.forEach(m => {
            const peer = m.senderId === me.id ? m.receiverId : m.senderId;
            if (!peerMap[peer] || peerMap[peer].createdAt < m.createdAt) peerMap[peer] = m;
        });

        // also include followed users so that you can start a chat
        Store.getFollowing(me.id).forEach(uid => {
            if (!peerMap[uid]) peerMap[uid] = null;
        });

        // include url ?to=
        if (activePeer && !peerMap[activePeer]) peerMap[activePeer] = null;

        return Object.keys(peerMap).map(uid => ({
            user: Store.getUser(uid),
            lastMsg: peerMap[uid]
        })).filter(c => c.user)
          .sort((a, b) => (b.lastMsg ? b.lastMsg.createdAt : 0) - (a.lastMsg ? a.lastMsg.createdAt : 0));
    }

    function renderConvList() {
        const list = getConversations();
        const box = document.getElementById('conv-list');
        if (list.length === 0) {
            box.innerHTML = '<div style="padding:30px 16px;color:var(--color-text-light);font-size:13px;text-align:center;">' +
                '暂无会话<br/><br/>关注一些同学后再来聊聊吧</div>';
            return;
        }
        box.innerHTML = list.map(c =>
            '<div class="msg-conv ' + (c.user.id === activePeer ? 'active' : '') + '" data-id="' + c.user.id + '">' +
            '<img src="' + (c.user.avatar || UI.defaultAvatar(c.user.nickname)) + '" />' +
            '<div class="msg-conv-info">' +
            '<div class="msg-conv-name">' + UI.escapeHtml(c.user.nickname) + '</div>' +
            '<div class="msg-conv-last">' + (c.lastMsg ? UI.escapeHtml(c.lastMsg.content.slice(0, 24)) : '点击开始聊天') + '</div>' +
            '</div>' +
            (c.lastMsg ? '<div class="msg-conv-time">' + UI.timeAgo(c.lastMsg.createdAt) + '</div>' : '') +
            '</div>'
        ).join('');
        box.onclick = e => {
            const c = e.target.closest('.msg-conv');
            if (!c) return;
            activePeer = c.dataset.id;
            renderConvList();
            renderChat();
        };
    }

    function renderChat() {
        const peer = Store.getUser(activePeer);
        if (!peer) return;
        const main = document.getElementById('msg-main');
        const conv = Store.getConversation(me.id, peer.id);

        let listHtml = '';
        let lastDay = '';
        conv.forEach(m => {
            const day = new Date(m.createdAt).toDateString();
            if (day !== lastDay) {
                listHtml += '<div class="msg-time">' + UI.formatTime(m.createdAt) + '</div>';
                lastDay = day;
            }
            const mine = m.senderId === me.id;
            listHtml += '<div class="msg-bubble ' + (mine ? 'mine' : '') + '">' + UI.escapeHtml(m.content) + '</div>';
        });

        if (!listHtml) {
            listHtml = '<div class="empty-state" style="margin:auto;"><div class="emoji">👋</div>' +
                '<div class="desc">这是和 ' + UI.escapeHtml(peer.nickname) + ' 的第一次对话</div></div>';
        }

        main.innerHTML =
            '<div class="msg-main-header">' +
            '<a href="user.html?id=' + peer.id + '"><img src="' + (peer.avatar || UI.defaultAvatar(peer.nickname)) + '" style="width:36px;height:36px;border-radius:50%;" /></a>' +
            '<a href="user.html?id=' + peer.id + '">' + UI.escapeHtml(peer.nickname) + '</a>' +
            '</div>' +
            '<div class="msg-list" id="msg-list">' + listHtml + '</div>' +
            '<div class="msg-input-bar">' +
            '<input type="text" id="msg-input" placeholder="输入消息，按回车发送..." maxlength="200" />' +
            '<button class="btn btn-primary" id="msg-send">发送</button>' +
            '</div>';

        const list = main.querySelector('#msg-list');
        list.scrollTop = list.scrollHeight;

        const input = document.getElementById('msg-input');
        const send = () => {
            const text = input.value.trim();
            if (!text) return;
            Store.sendMessage(me.id, peer.id, text);
            input.value = '';
            renderConvList();
            renderChat();
        };
        document.getElementById('msg-send').addEventListener('click', send);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
        input.focus();
    }
})();

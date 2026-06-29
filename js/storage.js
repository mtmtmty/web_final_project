/**
 * Storage layer - encapsulates LocalStorage as a mini "database".
 * All collections are stored in JSON form under namespaced keys.
 *
 * Collections:
 *  - users: registered users
 *  - posts: dynamics
 *  - comments: post comments
 *  - likes: like relations (userId-postId)
 *  - follows: follow relations (followerId-followeeId)
 *  - messages: direct messages (display only)
 *  - favorites: post favorites
 *  - session: current login state
 *  - settings: theme & preferences
 *  - viewLog: post view history (for recommendation)
 */
(function (global) {
    'use strict';

    const NS = 'campus_social_v1::';

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(NS + key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.error('storage read error', key, e);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(NS + key, JSON.stringify(value));
        } catch (e) {
            console.error('storage write error', key, e);
        }
    }

    function genId(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    /* ============================================================
     * Users
     * ============================================================ */
    function getUsers() { return read('users', []); }
    function saveUsers(users) { write('users', users); }

    function getUser(id) {
        return getUsers().find(u => u.id === id) || null;
    }

    function getUserByStudentId(sid) {
        return getUsers().find(u => u.studentId === sid) || null;
    }

    function createUser(data) {
        const users = getUsers();
        const user = Object.assign({
            id: genId('u'),
            studentId: '',
            password: '',
            nickname: '',
            avatar: '',
            bio: '',
            tags: [],
            role: 'user',                 // 'user' | 'admin'
            status: 'active',             // 'active' | 'banned'
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            visits: 0,
            photoWall: []
        }, data);
        users.push(user);
        saveUsers(users);
        return user;
    }

    function updateUser(id, patch) {
        const users = getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;
        users[idx] = Object.assign({}, users[idx], patch);
        saveUsers(users);
        // also refresh session if same user
        const session = getSession();
        if (session && session.userId === id) {
            // no-op, session only stores id
        }
        return users[idx];
    }

    function deleteUser(id) {
        saveUsers(getUsers().filter(u => u.id !== id));
    }

    /* ============================================================
     * Posts
     * ============================================================ */
    function getPosts() { return read('posts', []); }
    function savePosts(list) { write('posts', list); }

    function getPost(id) {
        return getPosts().find(p => p.id === id) || null;
    }

    function createPost(data) {
        const list = getPosts();
        const post = Object.assign({
            id: genId('p'),
            authorId: '',
            content: '',
            images: [],
            tags: [],
            visibility: 'public',  // 'public' | 'friends' | 'private'
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deleted: false,
            views: 0
        }, data);
        list.unshift(post);
        savePosts(list);
        return post;
    }

    function updatePost(id, patch) {
        const list = getPosts();
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return null;
        list[idx] = Object.assign({}, list[idx], patch, { updatedAt: Date.now() });
        savePosts(list);
        return list[idx];
    }

    function deletePost(id) {
        savePosts(getPosts().filter(p => p.id !== id));
        // cascade delete comments / likes / favorites
        write('comments', getComments().filter(c => c.postId !== id));
        write('likes', getLikes().filter(l => l.postId !== id));
        write('favorites', getFavorites().filter(f => f.postId !== id));
    }

    /* ============================================================
     * Comments
     * ============================================================ */
    function getComments() { return read('comments', []); }
    function saveComments(list) { write('comments', list); }

    function getCommentsByPost(postId) {
        return getComments().filter(c => c.postId === postId)
                            .sort((a, b) => a.createdAt - b.createdAt);
    }

    function createComment(data) {
        const list = getComments();
        const comment = Object.assign({
            id: genId('c'),
            postId: '',
            authorId: '',
            content: '',
            image: '',
            createdAt: Date.now()
        }, data);
        list.push(comment);
        saveComments(list);
        return comment;
    }

    function deleteComment(id) {
        saveComments(getComments().filter(c => c.id !== id));
    }

    /* ============================================================
     * Likes
     * ============================================================ */
    function getLikes() { return read('likes', []); }
    function saveLikes(list) { write('likes', list); }

    function isLiked(userId, postId) {
        return getLikes().some(l => l.userId === userId && l.postId === postId);
    }

    function toggleLike(userId, postId) {
        const list = getLikes();
        const idx = list.findIndex(l => l.userId === userId && l.postId === postId);
        if (idx === -1) {
            list.push({ userId, postId, createdAt: Date.now() });
            saveLikes(list);
            return true;
        }
        list.splice(idx, 1);
        saveLikes(list);
        return false;
    }

    function getLikeCount(postId) {
        return getLikes().filter(l => l.postId === postId).length;
    }

    /* ============================================================
     * Follows
     * ============================================================ */
    function getFollows() { return read('follows', []); }
    function saveFollows(list) { write('follows', list); }

    function isFollowing(followerId, followeeId) {
        return getFollows().some(f => f.followerId === followerId && f.followeeId === followeeId);
    }

    function toggleFollow(followerId, followeeId) {
        if (followerId === followeeId) return false;
        const list = getFollows();
        const idx = list.findIndex(f => f.followerId === followerId && f.followeeId === followeeId);
        if (idx === -1) {
            list.push({ followerId, followeeId, createdAt: Date.now() });
            saveFollows(list);
            return true;
        }
        list.splice(idx, 1);
        saveFollows(list);
        return false;
    }

    function getFollowing(userId) {
        return getFollows().filter(f => f.followerId === userId).map(f => f.followeeId);
    }

    function getFollowers(userId) {
        return getFollows().filter(f => f.followeeId === userId).map(f => f.followerId);
    }

    /* ============================================================
     * Favorites
     * ============================================================ */
    function getFavorites() { return read('favorites', []); }
    function saveFavorites(list) { write('favorites', list); }

    function isFavorited(userId, postId) {
        return getFavorites().some(f => f.userId === userId && f.postId === postId);
    }

    function toggleFavorite(userId, postId) {
        const list = getFavorites();
        const idx = list.findIndex(f => f.userId === userId && f.postId === postId);
        if (idx === -1) {
            list.push({ userId, postId, createdAt: Date.now() });
            saveFavorites(list);
            return true;
        }
        list.splice(idx, 1);
        saveFavorites(list);
        return false;
    }

    function getFavoritePostIds(userId) {
        return getFavorites().filter(f => f.userId === userId).map(f => f.postId);
    }

    /* ============================================================
     * Messages (UI demo only)
     * ============================================================ */
    function getMessages() { return read('messages', []); }
    function saveMessages(list) { write('messages', list); }

    function sendMessage(senderId, receiverId, content) {
        const list = getMessages();
        list.push({
            id: genId('m'),
            senderId,
            receiverId,
            content,
            createdAt: Date.now(),
            read: false
        });
        saveMessages(list);
    }

    function getConversation(userA, userB) {
        return getMessages().filter(m =>
            (m.senderId === userA && m.receiverId === userB) ||
            (m.senderId === userB && m.receiverId === userA)
        ).sort((a, b) => a.createdAt - b.createdAt);
    }

    /* ============================================================
     * Reactions (emoji reactions on posts)
     * ============================================================ */
    const REACTION_TYPES = ['like', 'laugh', 'thumbsup', 'wow', 'sad', 'fire'];
    const REACTION_EMOJI = { like: '❤️', laugh: '😂', thumbsup: '👍', wow: '😮', sad: '😢', fire: '🔥' };

    function toggleReaction(userId, postId, type) {
        if (!REACTION_TYPES.includes(type)) return null;
        const list = getLikes();
        const idx = list.findIndex(l => l.userId === userId && l.postId === postId);
        if (idx === -1) {
            list.push({ userId, postId, type, createdAt: Date.now() });
            saveLikes(list);
            return type;
        }
        if (list[idx].type === type) {
            list.splice(idx, 1);
            saveLikes(list);
            return null;
        }
        list[idx].type = type;
        list[idx].createdAt = Date.now();
        saveLikes(list);
        return type;
    }

    function getUserReaction(userId, postId) {
        const entry = getLikes().find(l => l.userId === userId && l.postId === postId);
        if (!entry) return null;
        return entry.type || 'like';
    }

    function getReactionCounts(postId) {
        const counts = {};
        REACTION_TYPES.forEach(t => counts[t] = 0);
        getLikes().filter(l => l.postId === postId).forEach(l => {
            const t = l.type || 'like';
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }

    function getTotalReactions(postId) {
        return getLikes().filter(l => l.postId === postId).length;
    }

    /* ============================================================
     * Drafts
     * ============================================================ */
    function getDraft() { return read('draft', null); }
    function saveDraft(draft) { write('draft', draft); }
    function clearDraft() { localStorage.removeItem(NS + 'draft'); }

    /* ============================================================
     * View log (recommendation)
     * ============================================================ */
    function getViewLog() { return read('viewLog', []); }

    function logView(userId, postId) {
        const list = getViewLog();
        list.push({ userId, postId, at: Date.now() });
        if (list.length > 500) list.shift();
        write('viewLog', list);
    }

    /* ============================================================
     * Session
     * ============================================================ */
    function getSession() { return read('session', null); }
    function setSession(session) { write('session', session); }
    function clearSession() { localStorage.removeItem(NS + 'session'); }

    function getCurrentUser() {
        const s = getSession();
        if (!s) return null;
        return getUser(s.userId);
    }

    /* ============================================================
     * Settings
     * ============================================================ */
    function getSettings() {
        return read('settings', { theme: 'light', background: 'fluid' });
    }
    function setSettings(s) { write('settings', s); }

    /* ============================================================
     * Public API
     * ============================================================ */
    global.Store = {
        genId,
        // users
        getUsers, getUser, getUserByStudentId, createUser, updateUser, deleteUser,
        // posts
        getPosts, getPost, createPost, updatePost, deletePost,
        // comments
        getComments, getCommentsByPost, createComment, deleteComment,
        // likes
        getLikes, isLiked, toggleLike, getLikeCount,
        // reactions
        toggleReaction, getUserReaction, getReactionCounts, getTotalReactions, REACTION_TYPES, REACTION_EMOJI,
        // follows
        getFollows, isFollowing, toggleFollow, getFollowing, getFollowers,
        // favorites
        getFavorites, isFavorited, toggleFavorite, getFavoritePostIds,
        // messages
        getMessages, sendMessage, getConversation,
        // drafts
        getDraft, saveDraft, clearDraft,
        // view log
        getViewLog, logView,
        // session
        getSession, setSession, clearSession, getCurrentUser,
        // settings
        getSettings, setSettings
    };
})(window);

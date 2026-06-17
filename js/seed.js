/**
 * Seed demo data - runs once on first visit to give a richer demo.
 * If the SEED_KEY exists already we skip seeding.
 */
(function (global) {
    'use strict';

    const SEED_KEY = 'campus_social_v1::seeded';

    function seedData() {
        if (localStorage.getItem(SEED_KEY)) return;

        const adminUser = Store.createUser({
            studentId: '20231001',
            password: 'admin123',
            nickname: '校园管理员',
            avatar: UI.defaultAvatar('管'),
            bio: '校园生活交友平台官方账号 - 有问题请联系。',
            tags: ['公告', '官方'],
            role: 'admin'
        });

        const u1 = Store.createUser({
            studentId: '20240101',
            password: '123456',
            nickname: '柠檬不萌',
            avatar: UI.defaultAvatar('柠'),
            bio: '计软21级，热爱前端 / 摄影 / 猫猫 🐱',
            tags: ['前端', '摄影', '猫猫'],
            photoWall: []
        });
        const u2 = Store.createUser({
            studentId: '20240102',
            password: '123456',
            nickname: '阿白同学',
            avatar: UI.defaultAvatar('白'),
            bio: '荔园里的小白杨，喜欢音乐和篮球。',
            tags: ['音乐', '篮球', '电影']
        });
        const u3 = Store.createUser({
            studentId: '20240103',
            password: '123456',
            nickname: '夏日的风',
            avatar: UI.defaultAvatar('夏'),
            bio: '法学院 · 喜欢手冲咖啡和爬山。',
            tags: ['咖啡', '爬山', '阅读']
        });
        const u4 = Store.createUser({
            studentId: '20240104',
            password: '123456',
            nickname: '电竞少女',
            avatar: UI.defaultAvatar('电'),
            bio: '荣耀王者 / 守望先锋 / 找队友！',
            tags: ['游戏', '电竞', '动漫']
        });

        const sampleImg = (color1, color2, label) => {
            const svg =
                '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
                '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="' + color1 + '"/>' +
                '<stop offset="100%" stop-color="' + color2 + '"/></linearGradient></defs>' +
                '<rect width="600" height="600" fill="url(#g)"/>' +
                '<text x="50%" y="52%" text-anchor="middle" font-size="48" fill="#fff" ' +
                'font-family="Helvetica,Arial,sans-serif" font-weight="700">' + label + '</text>' +
                '</svg>';
            return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        };

        // posts
        Store.createPost({
            authorId: u1.id,
            content: '#校园日常# 今天在荔园里晒到了好看的日落 🌅 同学们一起来看呀～',
            images: [sampleImg('#ff8a8a', '#ff5277', '🌅 Sunset'), sampleImg('#a695ff', '#6c63ff', 'Campus')],
            tags: ['校园日常', '日落'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 30
        });

        Store.createPost({
            authorId: u2.id,
            content: '推荐一首最近循环的歌：《晚风心里吹》🎵 \n校园广播站今晚 8 点直播，欢迎来听～',
            images: [],
            tags: ['音乐', '广播站'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 60 * 2
        });

        Store.createPost({
            authorId: u3.id,
            content: '#学习日常# 期末周来啦，图书馆四楼的位置真的难抢 😭 推荐去图书馆三楼东边！\n附带我整理的笔记 📒',
            images: [sampleImg('#7be8b1', '#18b566', '📒 Notes')],
            tags: ['学习日常', '期末'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 60 * 5
        });

        Store.createPost({
            authorId: u4.id,
            content: '#电竞# 急招王者荣耀双排，要稳的、不喷人的，男女都行～ 段位钻石以上！',
            images: [sampleImg('#73c5ff', '#3d8aff', '🎮 Game')],
            tags: ['电竞', '组队'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 60 * 8
        });

        Store.createPost({
            authorId: u1.id,
            content: '校园猫猫一只，超级亲人 🐈 在二食堂门口蹲到的，谁去摸过它呀？',
            images: [sampleImg('#ffd166', '#f4a23b', '🐱 Cat')],
            tags: ['猫猫', '校园日常'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 60 * 24
        });

        Store.createPost({
            authorId: adminUser.id,
            content: '【系统公告】欢迎来到「萌萌校园圈」！这里是同学们自由分享生活的地方，请遵守社区规范，文明发言 🌸',
            images: [],
            tags: ['公告'],
            visibility: 'public',
            createdAt: Date.now() - 1000 * 60 * 60 * 48
        });

        // some likes
        Store.toggleLike(u2.id, Store.getPosts()[5].id);
        Store.toggleLike(u3.id, Store.getPosts()[5].id);
        Store.toggleLike(u4.id, Store.getPosts()[5].id);
        Store.toggleLike(u2.id, Store.getPosts()[4].id);
        Store.toggleLike(u3.id, Store.getPosts()[4].id);
        Store.toggleLike(u1.id, Store.getPosts()[3].id);
        Store.toggleLike(u3.id, Store.getPosts()[2].id);

        // comments
        const posts = Store.getPosts();
        Store.createComment({ postId: posts[5].id, authorId: u1.id, content: '日落好美呀，明天我也去！' });
        Store.createComment({ postId: posts[5].id, authorId: u2.id, content: '同款机位求！' });
        Store.createComment({ postId: posts[3].id, authorId: u1.id, content: '想加你！双排怎么联系？' });
        Store.createComment({ postId: posts[2].id, authorId: u4.id, content: '笔记请收下我的膝盖 🙏' });

        // follows
        Store.toggleFollow(u1.id, u2.id);
        Store.toggleFollow(u1.id, u3.id);
        Store.toggleFollow(u2.id, u1.id);
        Store.toggleFollow(u3.id, u1.id);
        Store.toggleFollow(u4.id, u1.id);

        localStorage.setItem(SEED_KEY, '1');
    }

    global.seedData = seedData;
})(window);

const { createApp } = Vue;

// API 基础地址（后端运行地址）
const API_BASE = "/api";

// 获取存储的 token
function getToken() {
    return localStorage.getItem('access_token');
}

// axios 拦截器：自动添加 token
axios.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 封装通用请求函数
async function apiCall(url, method, data = null) {
    const fullUrl = `http://127.0.0.1:8081${API_BASE}${url}`; // 明确指向后端端口
    try {
        const res = await axios({
            method: method.toLowerCase(),
            url: fullUrl,
            data,
        });
        return res.data;
    } catch (error) {
        console.error('请求详情:', {
            url: fullUrl,
            method: method,
            status: error.response?.status
        });
        throw error;
    }
}

createApp({
    data() {
        return {
            // ===== 1. 页面状态 =====
            page: 'home',
            isHovering: false,

            // ===== 2. 心情便签数据 =====
            diaryInput: '',
            inputValue: '',
            diaryEmoji: '',
            selectedEmj: '',
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            showRecordModal: false,
            activeArchive: null,
            isArchiveOpen: false,
            modalDate: '',
            modalRecords: [],
            moodRecords: [],
            diaryList: [],
            // ===== 3. 小伴AI =====
            aiInput: '',
            aiTyping: false,
            emotionPattern: '',
            aiMessages: [
                { role: 'assistant', text: '你好呀，我是小伴。今天感觉怎么样？无论开心还是难过，我都会一直安静地陪着你。' }
            ],

            // ===== 4. 心晴指南 =====
            emotionTips: [
                { id: 1, emoji: '🌬️', title: '深呼吸放松法', summary: '通过控制呼吸节奏，快速缓解焦虑情绪', duration: 5, effectiveness: '90%有效', expanded: false,
                  steps: ['找一个安静舒适的地方坐下，背部挺直','用鼻子缓慢吸气4秒，感受腹部膨胀','屏住呼吸7秒，保持平静','用嘴巴缓缓呼气8秒，想象压力随之排出','重复5-10次，直到感觉平静'] },
                { id: 2, emoji: '📝', title: '情绪日记法', summary: '通过书写梳理情绪，增强自我认知', duration: 15, effectiveness: '85%有效', expanded: false,
                  steps: ['准备一个专门的本子或电子文档','写下当前的情绪状态（如：焦虑、悲伤、愤怒）','描述引发这种情绪的具体事件','分析自己对事件的反应和想法','写下至少3个可以改善情绪的积极行动','记录完成后的感受变化'] },
                { id: 3, emoji: '🏃', title: '运动释放法', summary: '通过身体活动释放内啡肽，改善情绪', duration: 30, effectiveness: '95%有效', expanded: false,
                  steps: ['选择喜欢的运动：快走、跑步、瑜伽、跳舞等','运动前做5分钟热身，防止受伤','保持中等强度运动20-30分钟（心率达到最大心率的60-70%）','运动时专注于身体感受，暂时放下烦恼','运动后进行5-10分钟拉伸放松','补充水分，记录运动后的情绪变化'] },
                { id: 4, emoji: '🧘', title: '正念冥想', summary: '通过专注当下，减少对过去和未来的担忧', duration: 10, effectiveness: '88%有效', expanded: false,
                  steps: ['找一个安静的地方，舒适地坐着或躺着','设定计时器（从5分钟开始，逐渐增加）','闭上眼睛，专注于呼吸的感觉','当思绪飘走时，温柔地带回注意力','观察身体的感受，不评判不抗拒','结束后慢慢睁开眼睛，感受平静'] },
                { id: 5, emoji: '🎨', title: '艺术表达法', summary: '通过创造性表达释放难以言说的情绪', duration: 20, effectiveness: '80%有效', expanded: false,
                  steps: ['准备绘画工具（纸、笔、颜料等）','不追求完美，随意画出当前的情绪感受','可以用颜色、形状、线条自由表达','完成后观察作品，思考它代表了什么','可以写上日期和简短说明','将作品收好，作为情绪成长的见证'] },
                { id: 6, emoji: '🤗', title: '社会支持法', summary: '通过与信任的人交流获得情感支持', duration: 30, effectiveness: '92%有效', expanded: false,
                  steps: ['列出3-5个你信任的亲友名单','选择合适的时间联系其中一人','明确表达你需要倾听而不是解决方案','分享感受时使用"我感到..."句式','感谢对方的倾听，不强求建议','计划定期联系，建立支持网络'] }
            ],
            
            communityTips: [],
            newCommunityTip: '',
            newWarmWord: '',
            showTipModal: false,
            currentTip: null,
            guideRefreshTimer:null,
            warmWords: [],
            topTipsRanking: [],
            
            showCounselingModal: false,
            counselors: [
                { id: 301, name: '张明华', specialty: '焦虑与压力管理专家', description: '心理学博士，专注焦虑障碍治疗10年。', rating: 4.9, cases: 3250, price: 399 },
                { id: 302, name: '李思雨', specialty: '青少年心理与家庭关系', description: '国家二级心理咨询师，沟通温暖有力量。', rating: 4.8, cases: 2150, price: 299 },
                { id: 303, name: '王建国', specialty: '创伤疗愈与危机干预', description: '临床心理学硕士，危机干预专家。', rating: 4.9, cases: 1800, price: 499 },
                { id: 304, name: '陈悦心', specialty: '情绪管理与自我成长', description: '积极心理学倡导者，擅长建立积极情绪模式。', rating: 4.7, cases: 1650, price: 259 }
            ],

            // ===== 5. 树洞数据 =====
            treeholeMessage: '',
            treeholeReply: '',
            treeholeList: [],
            submitted: false,
            submitting: false,
            treeholeHistory: [],
            isPublic: false,
            lastConfessionPublic: false,
            lastConfessionMessage: '',
            publicConfessions: [],
            showConfessionDetail: false,
            currentDetail: null,
            // 只保留一个 newCommentText，避免重复声明
            newCommentText: '',
            expandedTH: new Set(),
            
            // 漂流瓶相关数据
            bottleMessage: '',
            bottleMatchMode: 'similar',
            bottleIsPublic: true,
            throwingBottle: false,
            showThrowAnimation: false,
            pickingBottle: false,
            showPickAnimation: false,
            pickedBottle: {
            comments: []
            },

            myBottles: [],
            allBottles: [],
            showCommentModal: false,
            selectedConfession: null,  // 存储当前选中的心事对象
            showDetailModal: false,    // 控制详情弹窗显示
            activeCommentId: null,      // 当前展开评论输入框的心事ID
             showPickedCommentBox: false, // 是否显示漂流瓶评论输入框
            // ===== 6. 用户系统数据 =====
            currentUser: null,
            showLoginModal: false,
            showRegisterModal: false,
            loginForm: { username: '', password: '' },
            expandedMood: new Set(),
            registerForm: {
                username: '', password: '', avatar: '', avatarFile: null,
                gender: ''
            },
            isAttachmentOpen: false,
            
            attachmentResult: "", 
        bigFiveInput: "", // 用于大五人格输入框绑定
        isReTesting: false, // 是否处于“重新测试”模式

            // ===== 7. 静态数据 =====
            wordslist: [
                "亲爱的不要觉得别人发光你就黯淡", "可以脆弱，可以是不完美的", "黑夜在离开了，阳光洒进来了！",
                "你已经做得很好了，真的不用对自己那么严格。", "你的努力我都看在眼里，你真的超棒的。",
                "你值得被好好对待，包括被自己温柔对待。", "不用急着解决所有问题，先让自己舒服一点更重要。",
                "这件事确实很难，你能撑到现在已经很厉害了。", "你身上有很多闪光点，只是你自己没发现而已。",
                "你的存在本身就很有意义，不用做什么来证明。", "今天没精神也没关系，明天又是新的一天呀。",
                "别纠结过去啦，往前看，会有好事的。", "你对别人那么好，也要记得对自己好一点呀",
                "风停在窗边嘱咐你要热爱这个世界", "你总是惯着别人偶尔也顺从一下自己吧",
                "好的总是压箱底 我猜幸福也是", "祝好 在数不尽的明天", "靠近阳光里 什么也不想",
                "人生不止一个方向", "为热烈的喜欢而有意义", "亲爱的 你可以为打翻的牛奶哭泣 那是你完整的情绪.",
                "主角都是怎么开心怎么来", "你现在的感受特别正常，换作是我也会这样。",
                "不开心时，记得找我哦，我们一起吃甜品，聊聊心事", "我也愿意做你的头号支持者"
            ],
            emoji: [
                "😄","😅","🙂","🤩","🥰","😋","🤔","🤐","😑","😏","😒","🙄","🫨","😔","😴",
                "🫩","😪","😷","🤒","🤕","🤢","��","😵‍💫","🥳","😮","😱","😭","🥹","😨","😤",
                "🤬","🤡","💩","💘","💔","😘"
            ],
            attachmentQuestions: [
  // 🟢 安全型 (7题)
  { text: "我在亲密关系中通常感到安心", type: "安全型", score: null },
  { text: "我相信对方是稳定可靠的", type: "安全型", score: null },
  { text: "我既能依赖别人，也能保持自我", type: "安全型", score: null },
  { text: "我能自然表达自己的情感", type: "安全型", score: null },
  { text: "关系出现问题时，我愿意沟通解决", type: "安全型", score: null },
  { text: "我不太担心被抛弃", type: "安全型", score: null },
  { text: "即使短暂分开，我也能保持稳定情绪", type: "安全型", score: null },

  // 🔴 焦虑型 (8题)
  { text: "我常担心对方不够爱我", type: "焦虑型", score: null },
  { text: "对方回复慢会让我焦虑", type: "焦虑型", score: null },
  { text: "我需要频繁确认关系是否稳定", type: "焦虑型", score: null },
  { text: "我很在意对方对我的态度变化", type: "焦虑型", score: null },
  { text: "我容易在关系中投入过多情绪", type: "焦虑型", score: null },
  { text: "我害怕被忽视或被替代", type: "焦虑型", score: null },
  { text: "我会反复猜测对方的想法", type: "焦虑型", score: null },
  { text: "当对方冷淡时，我会很难受", type: "焦虑型", score: null },

  // 🔵 回避型 (8题)
  { text: "我不太喜欢依赖别人", type: "回避型", score: null },
  { text: "亲密关系让我有压力", type: "回避型", score: null },
  { text: "我更习惯独自处理问题", type: "回避型", score: null },
  { text: "我不喜欢别人过多了解我", type: "回避型", score: null },
  { text: "我会刻意保持情感距离", type: "回避型", score: null },
  { text: "我不太愿意表达脆弱", type: "回避型", score: null },
  { text: "当别人靠近时，我会后退", type: "回避型", score: null },
  { text: "我觉得依赖别人是不必要的", type: "回避型", score: null },

  // ⚫ 恐惧型 (7题)
  { text: "我既渴望亲密，又害怕亲密", type: "恐惧型", score: null },
  { text: "我对关系常常感到矛盾", type: "恐惧型", score: null },
  { text: "我有时很依赖，有时又想逃离", type: "恐惧型", score: null },
  { text: "我不确定别人是否值得信任", type: "恐惧型", score: null },
  { text: "当关系变近时，我反而会不安", type: "恐惧型", score: null },
  { text: "我容易在关系中情绪失控", type: "恐惧型", score: null },
  { text: "我觉得亲密关系既重要又危险", type: "恐惧型", score: null }
],
attachmentResult: "", // 存放最终结论
        }
    },

    computed: {
        currentMonthText() {
            return `${this.currentYear}年${this.currentMonth + 1}月`;
        },
        displayDates() {
            const { currentYear, currentMonth } = this;
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const startWeekday = firstDay.getDay();
            const totalDays = lastDay.getDate();
            const dates = [];

            for (let i = 0; i < startWeekday; i++) dates.push({ day: null, records: [] });

            for (let day = 1; day <= totalDays; day++) {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const recordsForDay = this.moodRecords.filter(record => {
                    const d = new Date(record.time);
                    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    return str === dateStr;
                });
                dates.push({ day, date: dateStr, isToday: this.isToday(currentYear, currentMonth, day), records: recordsForDay });
            }
            return dates;
        },
        emergencyRanking() {
            return [...this.communityTips].sort((a,b) => b.likes - a.likes).slice(0,5);
        },
        topWarmWord() {
            if (!this.warmWords.length) return { id:0, text:"今天也要好好爱自己。", author:"小伴", likes:0 };
            return [...this.warmWords].sort((a,b) => b.likes - a.likes)[0];
        },
        rows() {
            const result = Array.from({ length: 4 }, () => []);
            this.wordslist.forEach((w,i) => result[i%4].push(w));
            return result;
        },
        sortedPublicConfessions() {
            return [...this.publicConfessions].sort((a,b) => b.time - a.time);
        },
        formattedRecords() {
            return this.moodRecords.slice().reverse().map(r => ({
                ...r, date: new Date(r.time).toLocaleString('zh-CN')
            }));
        },
        formattedTreeholeHistory() {
            return this.treeholeHistory.slice().reverse().map(t => ({
                ...t, date: new Date(t.time).toLocaleString('zh-CN')
            }));
        }
    },

    methods: {

getCommentCount(comments) {
    // 增加更严格的检查
    if (!comments || comments === null || comments === undefined) return 0;
    try {
        // 兼容处理：如果是字符串则解析，如果是数组则直接取长度
        const list = typeof comments === 'string' ? JSON.parse(comments) : comments;
        return Array.isArray(list) ? list.length : 0;
    } catch (e) {
        console.warn('解析评论数据失败:', e);
        return 0;
    }
},
    
    // 建议顺便把 getLikeCount 也加上，防止后续点赞报错
    getLikeCount(likes) {
        if (typeof likes === 'number') return likes;
        try {
            const list = typeof likes === 'string' ? JSON.parse(likes) : likes;
            return Array.isArray(list) ? list.length : (parseInt(likes) || 0);
        } catch (e) {
            return 0;
        }
},
// 在 emotion.js 的 methods 中添加
openConfessionDetail(item) {
    if (!item) return;
    
    // 强行保证 comments 是数组，防止后端返回 null 或字符串
    let safeComments = [];
    if (typeof item.comments === 'string') {
        try { safeComments = JSON.parse(item.comments); } catch(e) {}
    } else if (Array.isArray(item.comments)) {
        safeComments = item.comments;
    }
    
    // 创建一个副本，防止修改原始列表
    this.selectedConfession = { ...item, comments: safeComments };
    this.showDetailModal = true;
},
    closeDetailModal() {
        this.showDetailModal = false;
        this.selectedConfession = null;
    },
async toggleLike(item) {
    try {
        await apiCall(`/treehole/public/${item.id}/like`, 'post');
        this.loadPublicData(); // 刷新列表
        if (this.selectedConfession) {
            // 如果在弹窗里，也要同步更新数据
            const res = await apiCall('/treehole/public', 'get');
            this.selectedConfession = res.find(x => x.id === item.id);
        }
    } catch (e) {
        alert(e.response?.data?.detail || "操作失败");
    }
},

// 顺便把 hasLiked 也补上，防止样式报错
hasLiked(item) {
    if (!item || !item.liked_users || !this.currentUser) return false;
    const likedList = typeof item.liked_users === 'string' ? JSON.parse(item.liked_users) : item.liked_users;
    return Array.isArray(likedList) && likedList.includes(this.currentUser.id);
},        // ===== 小伴AI =====
        async sendAiMessage() {
            if (!this.aiInput.trim()) return;
            const userText = this.aiInput;
            this.aiMessages.push({ role: 'user', text: userText });
            this.aiInput = '';
            this.aiTyping = true;

            try {
                const data = await apiCall('/ai/chat', 'post', { message: userText });
                this.aiTyping = false;
                this.aiMessages.push({ role: 'assistant', text: data.reply });
            } catch (error) {
                console.error(error);
                this.aiTyping = false;
                this.aiMessages.push({ role: 'assistant', text: '小伴暂时无法回复，请稍后再试。' });
            }

            this.$nextTick(() => {
                const win = this.$refs.chatWindow;
                if (win) win.scrollTop = win.scrollHeight;
            });
        },
async fetchPublicConfessions() {
  try {
    let res = await apiCall('/treehole/public', 'get');

    res = (res || [])
      .filter(Boolean)           // 过滤掉 undefined / null 项
      .map(item => {
        // 防御：如果后台突然返回了奇怪的东西
        if (!item || typeof item !== 'object') {
          return { id: null, message: '', comments: [], likes: 0 };
        }

        // 确保 comments 是数组
        if (!item.comments) {
          item.comments = [];
        } else if (typeof item.comments === 'string') {
          try {
            item.comments = JSON.parse(item.comments);
          } catch (e) {
            item.comments = [];
          }
        }

        return item;
      });

    this.publicConfessions = res;
  } catch (e) {
    console.error("加载公开心事失败", e);
    this.publicConfessions = [];
  }
}
,
//小伴AI

async generateEmotionPattern() {
    if (!this.currentUser) {
        alert('请先登录再生成情绪模式（在"我的空间"里登录）');
        return;
    }
 
    this.aiTyping = true;
    this.emotionPattern = '';
 
    try {
        // 心情记录：取最近 20 条
        const moodRecords = (this.moodRecords || []).slice(-20).map(m => ({
            mood_score: typeof m.mood_score === 'number' ? m.mood_score : 5,
            mood_label: m.emoji || null,
            note: m.text || null,
            created_at: m.time
                ? new Date(m.time).toISOString()
                : new Date().toISOString()
        }));
 
        // 树洞记录：取最近 20 条
        const treeHoles = (this.treeholeHistory || []).slice(-20).map(t => ({
            content: t.message || '',
            created_at: t.time
                ? new Date(t.time).toISOString()
                : new Date().toISOString()
        }));
 
        // 聊天记录：跳过第一条默认欢迎语，取最近 30 条
        const chatHistory = (this.aiMessages || []).slice(1, 31).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.text || '',
            created_at: null
        }));
 
        const body = {
            tree_holes: treeHoles,
            mood_records: moodRecords,
            chat_history: chatHistory,
            period_label: '最近一段时间',
            // 直接从 currentUser 取，/users/me 登录后已经拿到了
            big_five: this.currentUser.big_five || null,
            attachment_style: this.currentUser.attachment_style || null
        };
 
        const res = await apiCall('/ai/emotion-report', 'post', body);
        this.emotionPattern = res.report || '暂时没有生成结果，请稍后再试～';
 
    } catch (e) {
        console.error('生成情绪模式失败:', e);
        alert(e.response?.data?.detail || '生成情绪模式失败，请稍后重试');
    } finally {
        this.aiTyping = false;
    }
},
 


        // ===== 心晴指南方法 =====
        toggleTipDetail(index) { this.emotionTips[index].expanded = !this.emotionTips[index].expanded; },
        openTipModal(tip) { this.currentTip = tip; this.showTipModal = true; },
        closeTipModal() { this.showTipModal = false; this.currentTip = null; },
        
async likeCommunityTip(tip) {
    try {
        const res = await apiCall(`/community/tips/${tip.id}/like`, 'post');
        tip.likes = res.likes;
    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail || '你已经点过赞啦');
        } else {
            alert('点赞失败');
        }
    }
},
        async submitCommunityTip() {
            if (!this.newCommunityTip.trim()) return;
            try {
                await apiCall('/community/tips', 'post', { text: this.newCommunityTip });
                this.communityTips = await apiCall('/community/tips', 'get');
                this.newCommunityTip = '';
                alert('感谢分享！');
            } catch(e) {
                alert('发布失败');
            }
        },
async likeWarmWord(word) {
    try {
        const res = await apiCall(`/community/warmwords/${word.id}/like`, 'post');
        word.likes = res.likes;
    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail || '你已经点过赞啦');
        } else {
            alert('点赞失败');
        }
    }
},
        async submitWarmWord() {
            if (!this.newWarmWord.trim()) return;
            try {
                await apiCall('/community/warmwords', 'post', { text: this.newWarmWord });
                this.warmWords = await apiCall('/community/warmwords', 'get');
                this.newWarmWord = '';
                alert('感谢你的暖心话语！💖');
            } catch(e) {
                alert('发布失败');
            }
        },
        updateTopTipsRanking() {
            this.topTipsRanking = [...this.communityTips].sort((a,b) => b.likes - a.likes).slice(0,5);
        },
        formatTime(timeStr) {
            const d = new Date(timeStr), now = new Date();
            const diff = Math.floor((now - d) / 86400000);
            if (diff === 0) return '今天';
            if (diff === 1) return '昨天';
            if (diff < 7) return `${diff}天前`;
            if (diff < 30) return `${Math.floor(diff/7)}周前`;
            return `${Math.floor(diff/30)}个月前`;
        },
        startConsultation(doctor) {
            this.showCounselingModal = false;
            alert(`已为你联系 ${doctor.name} 医生\n\n专业方向：${doctor.specialty}\n咨询费用：¥${doctor.price}/次`);
        },

        // ===== 心情便签 =====
        selectEmj(e) { this.selectedEmj = e; this.inputValue = e; },
        async recieve() {
            if (!this.inputValue.trim()) return alert("请写下一些感受吧～");
            try {
                const emoji = this.diaryEmoji || this.selectedEmj || "💭";
                const newRecord = await apiCall('/moods', 'post', {
                    emoji: emoji,
                    text: this.inputValue
                });
                this.moodRecords.unshift(newRecord);
                alert("叮！心情已妥投至档案本。");
                this.inputValue = '';
                this.diaryEmoji = '';
                this.selectedEmj = '';
            } catch(e) {
                alert("保存失败");
            }
        },
        async delMood(idx) {
            if (!confirm('确定删除这条心情吗？')) return;
            const moodId = this.moodRecords[idx].id;
            await apiCall(`/moods/${moodId}`, 'delete');
            this.moodRecords.splice(idx, 1);
        },

        // ===== 日历 =====
        prevMonth() { if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; } else this.currentMonth--; },
        nextMonth() { if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; } else this.currentMonth++; },
        isToday(y,m,d) { const t = new Date(); return t.getFullYear()===y && t.getMonth()===m && t.getDate()===d; },
        openRecordModal(d) { if (!d.day || !d.records.length) return; this.modalDate = `${d.day}日`; this.modalRecords = [...d.records].reverse(); this.showRecordModal = true; },

        // ===== 树洞核心 =====
        async submitConfession() {
            if (this.submitting || !this.treeholeMessage.trim()) return;
            this.submitting = true;
            try {
                const newEntry = await apiCall('/treehole', 'post', {
                    message: this.treeholeMessage
                });
                this.treeholeHistory.unshift(newEntry);
                this.treeholeReply = newEntry.reply;
                this.lastConfessionMessage = newEntry.message;

                if (this.isPublic) {
                    await apiCall('/bottles/throw', 'post', {
                        message: this.treeholeMessage,
                        match_mode: 'similar',
                        is_public: true
                    });
                    this.publicConfessions = await apiCall('/treehole/public', 'get');
                }
                this.submitted = true;
            } catch(e) {
                alert("倾诉失败，请稍后重试");
            } finally {
                this.submitting = false;
            }
        },
 async submitComment(confession) {
    // ===== 1. 基础校验 =====
    if (!this.newCommentText || !this.newCommentText.trim()) {
        return;
    }

    try {
        // ===== 2. 调用后端接口 =====
        const res = await apiCall(
            `/public/${confession.id}/comment`,
            'post',
            {
                text: this.newCommentText
            }
        );

        console.log("[debug] 评论返回:", res);

        // ===== 3. 初始化 comments（防止 undefined）=====
        if (!confession.comments) {
            confession.comments = [];
        }

        // ===== 4. 如果后端返回了 comment，直接插入（更快）=====
        if (res.comment) {
            confession.comments.push(res.comment);
        } else {
            // ===== 5. 兜底：重新拉取 =====
            const updated = await apiCall(`/public/${confession.id}`, 'get');

            if (typeof updated.comments === 'string') {
                try {
                    updated.comments = JSON.parse(updated.comments);
                } catch {
                    updated.comments = [];
                }
            }

            confession.comments = updated.comments;
        }

        // ===== 6. 如果当前在详情弹窗里，同步更新 =====
        if (this.selectedConfession && this.selectedConfession.id === confession.id) {
            this.selectedConfession.comments = confession.comments;
        }

        // ===== 7. 清空输入框 =====
        this.newCommentText = '';

    } catch (e) {
        console.error("评论失败:", e);

        alert(
            e?.response?.data?.detail ||
            "评论失败，请稍后再试"
        );
    }
},
// --- 1. 点赞公开心事 (Ta的心事) ---
 async likeConfession(confession) {
        try {
            const res = await apiCall(`/treehole/public/${confession.id}/like`, 'post');
            confession.likes = res.likes;
        } catch (e) {
            if (e.response?.status === 400) {
                alert(e.response.data.detail || '你已经点过赞啦');
            } else {
                console.error(e);
            }
        }
    },
     startGuideAutoRefresh() {
    if (this.guideRefreshTimer) return;        // 已经有定时器就不重复建

    // 先立即拉一次最新数据
    this.loadPublicData();

    // 每 30 秒刷新一次（你可以自己改成 10000 = 10 秒）
    this.guideRefreshTimer = setInterval(() => {
      this.loadPublicData();
    }, 30000);
  },

  // 停止心晴指南自动刷新
  stopGuideAutoRefresh() {
    if (this.guideRefreshTimer) {
      clearInterval(this.guideRefreshTimer);
      this.guideRefreshTimer = null;
    }
  },
// 打开内联评论框
openInlineComment(confession) {
    if (!confession.comments) confession.comments = [];
    if (this.activeCommentId === confession.id) {
        this.activeCommentId = null;
        this.newCommentText = '';
    } else {
        this.activeCommentId = confession.id;
        this.newCommentText = '';
    }
},

    // 提交内联评论
  async submitInlineComment(confession) {
    if (!this.newCommentText.trim()) return;
    if (!confession.comments) confession.comments = [];
    try {
        await apiCall(`/treehole/public/${confession.id}/comment`, 'post', {
            text: this.newCommentText
        });
        confession.comments.push({
            username: this.currentUser?.username || '匿名',
            text: this.newCommentText,
            time: new Date().toISOString()
        });
        await this.fetchPublicConfessions(); // 可选，刷新整个列表
        this.newCommentText = '';
        this.activeCommentId = null;
    } catch (e) {
        alert('评论失败');
    }
},

        // ===== 漂流瓶功能 =====
        formatRelativeTime(time) {
        if (!time) return "刚刚";

        const d = new Date(time);
        if (isNaN(d.getTime())) return "刚刚";

        const now = new Date();
        const diff = Math.floor((now - d) / 1000);

        if (diff < 60) return "刚刚";
        if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
        if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
        if (diff < 2592000) return Math.floor(diff / 86400) + "天前";
        return d.toLocaleDateString();
    },
        openCommentModal() {
            if (!this.pickedBottle) return;
            if (!this.pickedBottle.comments) {
              this.pickedBottle.comments = [];
            }
            this.showCommentModal = true;
        },

        closeCommentModal() {
            this.showCommentModal = false;
        },

        // 本地提交捡到瓶子的留言（若需要持久化可以改为调用后端 API）
       async submitPickedBottleComment() {
    if (!this.newCommentText.trim()) return alert("写点什么吧");
    if (!this.pickedBottle?.id) return;

    try {
        // 发送评论到后端
        await apiCall(`/bottles/${this.pickedBottle.id}/comment`, 'post', {
            text: this.newCommentText
        });
        
        // 乐观更新：直接在本地添加新评论（不依赖后端 GET 接口）
        if (!this.pickedBottle.comments) this.pickedBottle.comments = [];
        this.pickedBottle.comments.push({
            username: this.currentUser?.username || "匿名",
            text: this.newCommentText,
            time: new Date().toISOString()
        });
        
        this.newCommentText = '';
        this.showPickedCommentBox = false; // 如果你使用了内联评论框，关闭它
        alert("留言已放入瓶中");
    } catch (e) {
        console.error("评论失败", e);
        alert(e.response?.data?.detail || "发送失败，请稍后重试");
    }
},

        // 在详情中查看被捡到的瓶子（复用详情弹窗）
        goCommentPickedBottle() {
            if (!this.pickedBottle) return;
            this.currentDetail = this.pickedBottle;
            if (!this.currentDetail.comments) {
              this.currentDetail.comments = [];
            }
            if (!this.currentDetail.reply) {
              this.currentDetail.reply = "（对方还没有回复）";
            }
            this.showConfessionDetail = true;
        },

        // 改进的 throwBottle：增加调试日志、友好提示、刷新数据
        async throwBottle() {
            console.log('[debug] throwBottle clicked', { bottleMessage: this.bottleMessage, currentUser: this.currentUser ? {
                id: this.currentUser.id, big_five: this.currentUser.big_five, attachment_style: this.currentUser.attachment_style
            } : null });

            if (!this.bottleMessage.trim() || this.throwingBottle) return;

            if (!this.currentUser) {
                alert('请先登录再扔漂流瓶（点击 我的空间 → 登录/注册）');
                return;
            }
            if (!this.currentUser.big_five || !this.currentUser.attachment_style) {
                alert('请先完善 大五人格测试 与 依恋人格类型（进入 我的空间 完成资料）');
                return;
            }

            this.throwingBottle = true;
            this.showThrowAnimation = true;

            try {
                const res = await apiCall('/bottles/throw', 'post', {
                    message: this.bottleMessage,
                    match_mode: this.bottleMatchMode,
                    is_public: this.bottleIsPublic
                });
                console.log('[debug] throwBottle response', res);
                alert('🍾 你的漂流瓶已投入大海！');

                this.bottleMessage = '';
                try {
                    this.publicConfessions = await apiCall('/treehole/public', 'get');
                } catch (e2) {
                    console.warn('[warn] 刷新公开心事失败', e2);
                }
                try {
                    this.myBottles = await apiCall('/bottles/my', 'get');
                } catch (e3) {
                    console.warn('[warn] 刷新我的瓶子失败', e3);
                }

            } catch (e) {
                console.error('[error] throwBottle failed', e);
                const detail = e?.response?.data?.detail || e.message || '扔瓶子失败，请稍后重试';
                alert(detail);
            } finally {
                this.throwingBottle = false;
                setTimeout(() => { this.showThrowAnimation = false; }, 1000);
            }
        },

async pickBottle() {
  this.pickingBottle = true;
  try {
    const res = await apiCall('/bottles/pick', 'post');
    let bottle = res.bottle || {};

    // 强制保证 comments 是数组
    if (!bottle.comments) {
      bottle.comments = [];
    } else if (typeof bottle.comments === 'string') {
      try {
        bottle.comments = JSON.parse(bottle.comments);
      } catch {
        bottle.comments = [];
      }
    }

    this.pickedBottle = bottle;

    if (res.lucky) {
      alert(res.lucky_msg);
    }
  } catch (e) {
    console.error("打捞失败", e);
    alert(e.response?.data?.detail || "海面上空如也");
  } finally {
    this.pickingBottle = false;
  }
}
,

// 2. 修改点赞逻辑
// --- 2. 点赞捡到的瓶子 ---
async likePickedBottle() {
    if (!this.pickedBottle?.id) return;
    try {
        const res = await apiCall(`/bottles/${this.pickedBottle.id}/like`, 'post');
        this.pickedBottle.likes = res.likes;
    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail);
        }
    }
},
   togglePickedComment() {
        this.showPickedCommentBox = !this.showPickedCommentBox;
        if (!this.showPickedCommentBox) this.newCommentText = '';
    },
// 3. 修改留言逻辑
async submitPickedBottleComment() {
        if (!this.newCommentText.trim()) return;
        try {
            await apiCall(`/bottles/${this.pickedBottle.id}/comment`, 'post', {
                text: this.newCommentText
            });
            // 重新获取瓶子详情以刷新评论
            const updated = await apiCall(`/bottles/${this.pickedBottle.id}`, 'get');
            this.pickedBottle.comments = updated.comments;
            this.newCommentText = '';
            this.showPickedCommentBox = false;
        } catch (e) {
            alert('留言失败');
        }
    },

        closePickedBottle() {
            this.pickedBottle = null;
        },

       
        // ===== 用户系统 =====
        openLogin() { this.showLoginModal = true; this.showRegisterModal = false; },
        openRegister() { this.showRegisterModal = true; this.showLoginModal = false; },
        closeModals() { this.showLoginModal = false; this.showRegisterModal = false; },
        openBigFiveTest() {
            const w = window.open('bigfive.html', 'bigfive_test',
                'width=800,height=700,scrollbars=yes,resizable=yes');
            if (!w) {
                alert('弹窗被阻止，请允许弹窗后重试，或直接点击下方链接');
            }
        },
        async doLogin() {
            try {
                const res = await apiCall("/users/login", "post", {
                    username: this.loginForm.username,
                    password: this.loginForm.password
                });
                localStorage.setItem("access_token", res.access_token);
                const userInfo = await apiCall('/users/me', 'get');
                this.currentUser = userInfo;
                await this.loadUserDataAfterLogin();
                this.closeModals();
            } catch (error) {
                const detail = error.response?.data?.detail || '登录失败';
                alert(detail);
            }
        },
// emotion.js
async loadUserDataAfterLogin() {
    // 1. 同步人格数据到 Vue 响应式变量 (这是“记住”的关键)
    if (this.currentUser) {
        this.attachmentResult = this.currentUser.attachment_style || "";
        this.bigFiveInput = this.currentUser.big_five || "";
        console.log("人格数据同步成功:", this.attachmentResult, this.bigFiveInput);
    }

    // 2. 使用 try-catch 隔离加载，防止 bottles 报错导致整个页面卡死
    try {
        this.moodRecords = await apiCall('/moods', 'get');
    } catch(e) { console.error("加载心情失败"); }

    try {
        // 如果这里报 500，不会影响上面人格数据的加载
        this.myBottles = await apiCall('/bottles/my', 'get');
    } catch(e) { 
        console.error("加载我的瓶子失败，后端可能代码报错"); 
    }
},
       
async doRegister() {
    try {
        console.log('doRegister 被调用了，发送 POST 请求');
        const payload = {
            username: this.registerForm.username,
            password: this.registerForm.password,
            img: this.registerForm.avatar,
            sex: this.registerForm.gender,
        };
        await apiCall('/users/register', 'post', payload);
        alert('注册成功，请登录');
        this.openLogin();
    } catch (error) {
        alert(error.response?.data?.detail || '注册失败');
    }
},
// 删除下面的第二个 doRegister,
        logout() {
            this.currentUser = null;
            this.moodRecords = [];
            this.treeholeHistory = [];
            this.myBottles = [];
            this.allBottles = [];
            localStorage.removeItem('access_token');
            // 可选：重新加载公开数据
            this.loadPublicData();
        },
        pickAvatar(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { this.registerForm.avatar = ev.target.result; };
            reader.readAsDataURL(file);
        },
  async calcAttachment() {
    // 检查是否全填了
    const unfinished = this.attachmentQuestions.some(q => q.score === null);
    if (unfinished) {
      alert("请完成所有 30 道题目后再提交哦~");
      return;
    }

    // 统计各类型得分
    const stats = { "安全型": 0, "焦虑型": 0, "回避型": 0, "恐惧型": 0 };
    this.attachmentQuestions.forEach(q => {
      stats[q.type] += q.score;
    });

    // 找到分值最高的那一项
    let maxType = "安全型";
    let maxVal = -1;
    for (let key in stats) {
      if (stats[key] > maxVal) {
        maxVal = stats[key];
        maxType = key;
      }
    }

    this.attachmentResult = maxType;

    // 同步到后端 (假设你已经写好了对应的 update 接口)
    try {
      await apiCall('/users/me/attachment', 'post', {
        style: maxType,
        scores: stats
      });
      this.currentUser.attachment_style = maxType;
        this.attachmentResult = maxType; 
        this.isAttachmentOpen = false;
      alert(`测试完成！您的依恋类型是：${maxType}`);
    } catch (e) {
      console.error("保存失败", e);
    }
},

      async loadPublicData() {
    try {
        this.publicConfessions = await apiCall('/treehole/public', 'get');
        this.communityTips = await apiCall('/community/tips', 'get');
        this.warmWords = await apiCall('/community/warmwords', 'get');

        // ⭐ 根据最新 communityTips 重新算排行榜
        this.updateTopTipsRanking();
    } catch(e) {
        console.error('加载公开数据失败', e);
    }
},

        async generateAIReport() {
            this.aiLoading = true;
            if (!this.currentUser?.attachment_style || !this.currentUser?.big_five) {
            return alert("请先完成全部人格测试");
}
            const prompt = `
                我是一个${this.currentUser.attachment_style}的人，
                我的大五人格得分为：${this.currentUser.big_five}。
                请从“社交偏好”、“亲密关系”、“压力应对”三个维度，
                用文学性、温柔且深刻的语言为我写一份200字的心灵自画像。
            `;
            // 调用您后端已有的 AI 接口
            const res = await apiCall('/ai/chat', 'post', { message: prompt });
            this.aiAnalysis = res.reply;
            this.aiLoading = false;

},
// emotion.js 中的 saveBigFive
async saveBigFive() {
    if(!this.bigFiveInput) return alert("请先填写结果");
    try {
        await apiCall('/users/me/big_five', 'post', { 
            result: this.bigFiveInput 
        });
        
        // 【关键修复 1】必须手动更新本地的 currentUser，刷新时才会有值
        if (this.currentUser) {
            this.currentUser.big_five = this.bigFiveInput;
        }
        
        alert("大五人格数据已存入深海记忆！");
        this.generateAIReport(); 
    } catch (e) {
        alert("保存失败，请检查网络或登录状态");
    }
}
    },

   async mounted() {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const userInfo = await apiCall('/users/me', 'get');
            this.currentUser = userInfo;
            await this.loadUserDataAfterLogin();
        } catch(e) {
            localStorage.removeItem('access_token');
            await this.loadPublicData();
        }
    } else {
        await this.loadPublicData();
    }
    if (this.page === 'sun') {
        this.startGuideAutoRefresh();
    }

    // ===== 监听大五人格测试窗口的保存结果 =====
    // 方式1：postMessage（bigfive.html 用 window.open 打开时触发）
    window.addEventListener('message', (e) => {
        if (e.data?.type === 'BF_SAVED' && e.data.score) {
            if (this.currentUser) {
                this.currentUser.big_five = e.data.score;
                this.bigFiveInput = e.data.score;
                this.isReTesting = false;
            }
        }
    });

    // 方式2：storage 事件（同浏览器不同标签页时触发）
    window.addEventListener('storage', (e) => {
        if (e.key === 'bf_score_result' && e.newValue) {
            if (this.currentUser) {
                this.currentUser.big_five = e.newValue;
                this.bigFiveInput = e.newValue;
                this.isReTesting = false;
            }
        }
    });
},
watch: {
    page(newVal) {
        if (newVal === 'treehole') {
            this.fetchPublicConfessions(); // 重新获取
        }
        if (newVal === 'sun') {
        this.startGuideAutoRefresh();
      } else {
        this.stopGuideAutoRefresh();
      }
    }
},
    
}).mount("#Store");
const { createApp } = Vue;

// API 基础地址（后端运行地址)
const API_BASE = "/api";

// 获取存储token
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
const fullUrl = `${API_BASE}${url}`;
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
            // ===== 1. 页面状态=====
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
    {
        role: 'assistant',
        text: '你好呀，我是小伴。今天感觉怎么样？无论开心还是难过，我都会一直安静地陪着你呢'
    }
],
            // ===== 4. 心晴指南 =====
           emotionTips: [
  {
    id: 1,
    emoji: '🌬️',
    title: '深呼吸放松法',
    summary: '通过控制呼吸节奏，快速缓解焦虑情绪',
    duration: 5,
    effectiveness: '90%有效',
    expanded: false,
    steps: [
      '找一个安静舒适的地方坐下，背部挺直',
      '用鼻子缓慢吸气4秒，感受腹部膨胀',
      '屏住呼吸7秒，保持平静',
      '用嘴巴缓缓呼气8秒，想象压力随之排出',
      '重复5-10次，直到感觉平静'
    ]
  },
  {
    id: 2,
    emoji: '📝',
    title: '情绪日记',
    summary: '通过书写梳理情绪，增强自我认知',
    duration: 15,
    effectiveness: '85%有效',
    expanded: false,
    steps: [
      '准备一个专门的本子或电子文档',
      '写下当前的情绪状态（如：焦虑、悲伤、愤怒）',
      '描述引发这种情绪的具体事件',
      '分析自己对事件的反应和想法',
      '写下至少3个可以改善情绪的积极行动',
      '记录完成后的感受变化'
    ]
  },
  {
    id: 3,
    emoji: '🏃',
    title: '运动释放',
    summary: '通过身体活动释放内啡肽，改善情绪',
    duration: 30,
    effectiveness: '95%有效',
    expanded: false,
    steps: [
      '选择喜欢的运动：快走、跑步、瑜伽、跳舞等',
      '运动前做5分钟热身，防止受伤',
      '保持中等强度运动20-30分钟（心率达到最大心率的60%-70%）',
      '运动时专注于身体感受，暂时放下烦恼',
      '运动后进行5-10分钟拉伸放松',
      '补充水分，记录运动后的情绪变化'
    ]
  },
  {
    id: 4,
    emoji: '🧘',
    title: '正念冥想',
    summary: '通过专注当下，减少对过去和未来的担忧',
    duration: 10,
    effectiveness: '88%有效',
    expanded: false,
    steps: [
      '找一个安静的地方，舒适地坐着或躺着',
      '设定计时器（从5分钟开始，逐渐增加）',
      '闭上眼睛，专注于呼吸的感觉',
      '当思绪飘走时，温柔地带回注意力',
      '观察身体的感受，不评判不抗拒',
      '结束后慢慢睁开眼睛，感受平静'
    ]
  },
  {
    id: 5,
    emoji: '🎨',
    title: '艺术表达',
    summary: '通过创造性表达释放难以言说的情绪',
    duration: 20,
    effectiveness: '80%有效',
    expanded: false,
    steps: [
      '准备绘画工具（纸、笔、颜料等）',
      '不追求完美，随意画出当前的情绪感受',
      '可以用颜色、形状、线条自由表达',
      '完成后观察作品，思考它代表了什么',
      '可以写上日期和简短说明',
      '将作品收好，作为情绪成长的见证'
    ]
  },
  {
    id: 6,
    emoji: '🤗',
    title: '社会支持',
    summary: '通过与信任的人交流获得情感支持',
    duration: 30,
    effectiveness: '92%有效',
    expanded: false,
    steps: [
      '列出3-5个你信任的亲友名单',
      '选择合适的时间联系其中一位',
      '明确表达你需要倾听而不是解决方案',
      '分享感受时使用“我感觉...”句式',
      '感谢对方的倾听，不强求建议',
      '计划定期联系，建立支持网络'
    ]
  }
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
    {
        id: 301,
        name: '张明宇',
        specialty: '焦虑与压力管理专家',
        description: '心理学博士，专注焦虑障碍治疗10年',
        rating: 4.9,
        cases: 3250,
        price: 399
    },
    {
        id: 302,
        name: '李思雨',
        specialty: '青少年心理与家庭关系',
        description: '国家二级心理咨询师，沟通温暖有力量',
        rating: 4.8,
        cases: 2150,
        price: 299
    },
    {
        id: 303,
        name: '王建国',
        specialty: '创伤疗愈与危机干预',
        description: '临床心理学硕士，危机干预专家',
        rating: 4.9,
        cases: 1800,
        price: 499
    },
    {
        id: 304,
        name: '陈悦然',
        specialty: '情绪管理与自我成长',
        description: '积极心理学倡导者，擅长建立积极情绪模式',
        rating: 4.7,
        cases: 1650,
        price: 259
    }
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
            // 只保留一份 newCommentText，避免重复声明
            newCommentText: '',
            expandedTH: new Set(),
            expandedComments: new Set(),
            expandedComments: new Set(),
            
            // 漂流瓶相关数�?
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
             commentInputs: {},
            showCommentModal: false,
            selectedConfession: null,  // 存储当前选中的心事对�?
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
        bigFiveInput: "",
        isReTesting: false, 

            // ===== 7. 静态数�?=====
            wordslist: [
    "亲爱的，不要觉得别人发光你就黯淡",
    "可以脆弱，可以是不完美的",
    "黑夜在离开了，阳光洒进来了",
    "你已经做得很好了，真的不用对自己那么严格",
    "你的努力我都看在眼里，你真的超棒的",
    "你值得被好好对待，包括被自己温柔对待",
    "不用急着解决所有问题，先让自己舒服一点更重要",
    "这件事确实很难，你能撑到现在已经很厉害了",
    "你身上有很多闪光点，只是你自己没发现而已",
    "你的存在本身就很有意义，不用做什么来证明",
    "今天没精神也没关系，明天又是新的一天呀",
    "别纠结过去啦，往前看，会有好事的",
    "你对别人那么好，也要记得对自己好一点呀",
    "风停在窗边，嘱咐你要热爱这个世界",
    "你总是惯着别人，偶尔也顺从一下自己吧",
    "好的总是压箱底，我猜幸福也是",
    "祝好，在数不尽的明天里",
    "靠近阳光，什么也不想",
    "人生不止一个方向",
    "为热烈的喜欢而有意义",
    "亲爱的，你可以为打翻的牛奶哭，那是你完整的情绪",
    "主角都是怎么开心怎么来",
    "你现在的感受特别正常，换作是我也会这样",
    "不开心时，记得找我，我们一起吃甜品，聊聊心事",
    "我也愿意做你的头号支持者"
],
           emoji: [
    "😄","😅","🙂","🤩","🥰","😋","🤔","🤐","😑","😏",
    "😒","🙄","🫨","😔","😴","🫩","😪","😷","🤒","🤕",
    "🤢","🤮","😵","🥳","😮","😱","😭","🥹","😨","😤",
    "🤬","🤡","💩","💘","💔","😘"
],
attachmentQuestions: [

  // ── 安全型 8题 ──
  {
    text: "朋友突然两天没回你消息，你的第一反应是？",
    type: "安全型",
    score: null,
    options: ["ta可能最近很忙，等ta有空会回的", "有点担心但不会一直想，继续做自己的事", "开始怀疑是不是自己说了什么不对的话"]
  },
  {
    text: "和亲密的人发生争吵后，你通常会？",
    type: "安全型",
    score: null,
    options: ["冷静后主动找对方沟通，把问题说清楚", "等情绪平复再慢慢聊，不急于一时", "反复回想争吵细节，担心关系就此破裂"]
  },
  {
    text: "当你需要帮助时，你会？",
    type: "安全型",
    score: null,
    options: ["自然地告诉身边人，知道他们愿意帮我", "会说，但会先考虑会不会打扰对方", "宁愿自己扛，不想让别人觉得我脆弱"]
  },
  {
    text: "对方表达对你的喜欢和重视时，你的感受是？",
    type: "安全型",
    score: null,
    options: ["温暖且踏实，自然地接受", "开心，但有点不习惯，不知道怎么回应", "会想太多，怀疑对方是不是真的这么想"]
  },
  {
    text: "在关系中，你觉得自己是一个怎样的人？",
    type: "安全型",
    score: null,
    options: ["有安全感的，相信关系是稳固的", "有时稳定有时焦虑，情绪起伏比较大", "习惯保持距离，不太愿意完全敞开"]
  },
  {
    text: "当一段重要关系出现问题，你的第一步是？",
    type: "安全型",
    score: null,
    options: ["想清楚自己的感受，然后坦诚地和对方谈", "先观察对方态度，再决定要不要开口", "倾向于沉默处理，或者直接拉开距离"]
  },
  {
    text: "分开一段时间后再见面，你通常会？",
    type: "安全型",
    score: null,
    options: ["很自然，好像没断开过，继续聊以前的话题", "有点紧张，想确认关系有没有变化", "感到些许陌生，需要一点时间才能放松"]
  },
  {
    text: "你对亲密关系的总体感受是？",
    type: "安全型",
    score: null,
    options: ["是让我感到舒适和有力量的事", "很重要，但也常常让我感到疲惫或不安", "有点复杂，我说不清楚自己到底想要什么"]
  },

  // ── 焦虑型 8题 ──
  {
    text: "对方比平时冷淡了一点，你会怎么想？",
    type: "焦虑型",
    score: null,
    options: ["ta今天可能有点累，不是针对我", "有点担心，会想是不是自己做错了什么", "非常不安，脑子里开始演很多可能的原因"]
  },
  {
    text: "发出一条消息后，对方迟迟没回，你会？",
    type: "焦虑型",
    score: null,
    options: ["继续做自己的事，想到了再看", "时不时看一眼手机，有点小焦虑", "很难专注别的事，反复查看有没有回复"]
  },
  {
    text: "在关系中，你有多需要对方的确认和回应？",
    type: "焦虑型",
    score: null,
    options: ["不太需要，对关系本身有信心", "适量需要，偶尔需要被肯定", "很需要，缺少回应会让我很不安"]
  },
  {
    text: "你有多担心对方会离开或不再喜欢你？",
    type: "焦虑型",
    score: null,
    options: ["几乎不担心，相信关系是稳固的", "偶尔会想到，但不会特别困扰", "经常这样想，对这件事很敏感"]
  },
  {
    text: "当对方优先处理其他事情而不是你时，你通常感到？",
    type: "焦虑型",
    score: null,
    options: ["理解，每个人都有自己的事", "有点失落，但能接受", "难受，会觉得自己不够重要"]
  },
  {
    text: "关系稳定之后，你会？",
    type: "焦虑型",
    score: null,
    options: ["放松下来，享受这份稳定", "还是会时不时确认一下关系状态", "反而更担心，怕稳定只是暂时的"]
  },
  {
    text: "你付出比对方多时，通常感到？",
    type: "焦虑型",
    score: null,
    options: ["没关系，付出是我自愿的", "会在意，但不一定说出来", "很委屈，会反复想为什么不平等"]
  },
  {
    text: "如果对方开始变得不那么主动联系你，你会？",
    type: "焦虑型",
    score: null,
    options: ["不太在意，联系频率本来就会变化", "会主动发消息，但不会想太多", "很在意，会主动找ta，想搞清楚发生了什么"]
  },

  // ── 回避型 8题 ──
  {
    text: "当关系变得越来越亲密时，你通常会感到？",
    type: "回避型",
    score: null,
    options: ["温暖，很享受这种靠近", "有点不自在，但还好", "有些压力，想要一点自己的空间"]
  },
  {
    text: "向别人倾诉内心感受，对你来说？",
    type: "回避型",
    score: null,
    options: ["很自然，说出来反而轻松", "可以，但需要很信任的人", "很难，不太习惯暴露内心"]
  },
  {
    text: "对方对你表达强烈的依赖，你会？",
    type: "回避型",
    score: null,
    options: ["感到被需要，很好", "有点受宠若惊，但还能接受", "感到压力，想拉开一些距离"]
  },
  {
    text: "遇到情绪低落时，你倾向于？",
    type: "回避型",
    score: null,
    options: ["联系亲近的人，聊一聊", "自己消化，但不完全排斥别人帮助", "独处，不想让别人知道我的状态"]
  },
  {
    text: "你觉得'需要别人'这件事，是？",
    type: "回避型",
    score: null,
    options: ["很正常，人本来就需要连接", "可以接受，但最好不要太依赖", "有点不自在，更喜欢独立处理"]
  },
  {
    text: "当对方想更了解你时，你通常会？",
    type: "回避型",
    score: null,
    options: ["开放地分享自己", "分享一部分，保留一部分", "有些抗拒，不确定自己愿不愿意"]
  },
  {
    text: "独处对你来说是？",
    type: "回避型",
    score: null,
    options: ["享受，但也喜欢和人在一起", "必要的充电时间", "最舒服的状态，胜过大多数社交"]
  },
  {
    text: "在关系中主动表达喜欢或在乎，对你来说？",
    type: "回避型",
    score: null,
    options: ["很自然，喜欢就会说出来", "有点难，但会用行动代替语言", "很难，说出口会让我感到暴露"]
  },

  // ── 恐惧型 6题 ──
  {
    text: "想象一段很亲密的关系，你的第一反应是？",
    type: "恐惧型",
    score: null,
    options: ["向往，这是我想要的", "既想要，又有点害怕", "有些不安，不知道能不能承受"]
  },
  {
    text: "当一段关系变得认真，你会？",
    type: "恐惧型",
    score: null,
    options: ["感到踏实，很好", "一方面开心，一方面有隐约的焦虑", "开始怀疑这段关系是否真的安全"]
  },
  {
    text: "你对亲密关系最大的恐惧是？",
    type: "恐惧型",
    score: null,
    options: ["没什么特别的恐惧", "怕关系不稳定，怕被忽视", "怕被彻底了解之后，对方选择离开"]
  },
  {
    text: "你在关系中的模式更接近？",
    type: "恐惧型",
    score: null,
    options: ["稳定投入，有问题就一起解决", "时而很投入，时而需要撤退", "靠近之后反而想逃，说不清楚为什么"]
  },
  {
    text: "过去的情感经历对你现在的影响是？",
    type: "恐惧型",
    score: null,
    options: ["帮我更了解自己想要什么", "会有一些影响，但整体还好", "让我很难真正信任别人或放开自己"]
  },
  {
    text: "如果让你完全袒露自己，你会？",
    type: "恐惧型",
    score: null,
    options: ["可以，对信任的人愿意这样做", "可以一部分，但不是全部", "很害怕，担心被看透之后失去对方"]
  }

],

attachmentResult: "", // 存放最终结果
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

        for (let i = 0; i < startWeekday; i++) {
            dates.push({ day: null, records: [] });
        }

        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const recordsForDay = this.moodRecords.filter(record => {
                if (!record.time) return false;
                const d = new Date(record.time);
                const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                return str === dateStr;
            });

            dates.push({
                day,
                date: dateStr,
                isToday: this.isToday(currentYear, currentMonth, day),
                records: recordsForDay
            });
        }

        return dates;
    },

    emergencyRanking() {
        return [...this.communityTips]
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 5);
    },

    topWarmWord() {
        if (!this.warmWords.length) {
            return {
                id: 0,
                text: "今天也要好好爱自己",
                author: "小伴",
                likes: 0
            };
        }
        return [...this.warmWords]
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
    },

    rows() {
        const result = Array.from({ length: 4 }, () => []);
        this.wordslist.forEach((w, i) => result[i % 4].push(w));
        return result;
    },

    sortedPublicConfessions() {
        return [...this.publicConfessions].sort((a, b) => {
            return new Date(b.time || 0) - new Date(a.time || 0);
        });
    },

    formattedRecords() {
        return this.moodRecords.slice().reverse().map(r => ({
            ...r,
            date: r.time ? new Date(r.time).toLocaleString('zh-CN') : ''
        }));
    },

    formattedTreeholeHistory() {
        return this.treeholeHistory.slice().reverse().map(t => ({
            ...t,
            date: t.time ? new Date(t.time).toLocaleString('zh-CN') : ''
        }));
    },
    renderedPattern() {
        if (!this.emotionPattern) return '';
        let html = this.emotionPattern
            // 标题 h3
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            // 标题 h2
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            // 粗体
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // 有序列表
            .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
            // 无序列表 - 开头
            .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
            // 段落分隔
           .replace(/\n\n+/g, '</p><p>')
            // 单换行
            .replace(/\n/g, '<br>');
        // 包裹 li
        html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        return '<p>' + html + '</p>';
    }
},
    methods: {

getCommentCount(comments) {
    if (!comments) return 0;

    try {
        const list = typeof comments === 'string'
            ? JSON.parse(comments)
            : comments;

        return Array.isArray(list) ? list.length : 0;
    } catch (e) {
        console.warn('解析评论数据失败:', e);
        return 0;
    }
},
    
   getLikeCount(likes) {
    if (typeof likes === 'number') return likes;

    try {
        const list = typeof likes === 'string'
            ? JSON.parse(likes)
            : likes;

        if (Array.isArray(list)) return list.length;

        return parseInt(likes) || 0;
    } catch (e) {
        return 0;
    }
},

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
    this.expandedComments = new Set();
    this.showDetailModal = true;
},
    closeDetailModal() {
        this.showDetailModal = false;
        this.selectedConfession = null;
        this.expandedComments = new Set();
    },
    isCommentExpanded(comment, idx) {
        const key = comment.id || comment.time || idx;
        return this.expandedComments.has(key);
    },
    toggleCommentExpand(comment, idx) {
        const key = comment.id || comment.time || idx;
        if (this.expandedComments.has(key)) {
            this.expandedComments.delete(key);
        } else {
            this.expandedComments.add(key);
        }
    },
async toggleLike(item) {
    try {
        await apiCall(`/treehole/public/${item.id}/like`, 'post');
        this.loadPublicData(); // 刷新列表
        if (this.selectedConfession) {
            // 如果在弹窗里，也要同步更新数�?
            const res = await apiCall('/treehole/public', 'get');
            this.selectedConfession = res.find(x => x.id === item.id);
        }
    } catch (e) {
        alert(e.response?.data?.detail || "操作失败");
    }
},

// 顺便�?hasLiked 也补上，防止样式报错
hasLiked(item) {
    if (!item || !this.currentUser) return false;

    let likedList = [];

    try {
        likedList = typeof item.liked_users === 'string'
            ? JSON.parse(item.liked_users)
            : item.liked_users || [];
    } catch {
        likedList = [];
    }

    return Array.isArray(likedList) &&
           likedList.includes(this.currentUser.id);
},        // ===== 小伴AI =====
    async sendAiMessage() {
    if (!this.aiInput.trim()) return;

    const userText = this.aiInput;

    this.aiMessages.push({
        role: 'user',
        text: userText
    });

    this.aiInput = '';
    this.aiTyping = true;

    try {
        const data = await apiCall('/ai/chat', 'post', {
            message: userText
        });

        this.aiMessages.push({
            role: 'assistant',
            text: data.reply || "我刚刚有点走神了，可以再说一次吗？"
        });

    } catch (error) {
        console.error(error);

        this.aiMessages.push({
            role: 'assistant',
            text: '小伴暂时无法回复，请稍后再试~'
        });

    } finally {
        this.aiTyping = false;
    }

    this.$nextTick(() => {
        const win = this.$refs.chatWindow;
        if (win) win.scrollTop = win.scrollHeight;
    });
},
async fetchPublicConfessions() {
    try {
        let res = await apiCall('/treehole/public', 'get');

        this.publicConfessions = (res || [])
            .filter(item => item && typeof item === 'object')
            .map(item => {

                let comments = [];

                try {
                    if (typeof item.comments === 'string') {
                        comments = JSON.parse(item.comments);
                    } else if (Array.isArray(item.comments)) {
                        comments = item.comments;
                    }
                } catch {
                    comments = [];
                }

                return {
                    ...item,
                    comments,
                    likes: item.likes || 0
                };
            });

    } catch (e) {
        console.error("加载公开心事失败", e);
        this.publicConfessions = [];
    }
},
async generateEmotionPattern() {
    if (!this.currentUser) {
        alert('请先登录后再生成情绪模式（在“我的空间”登录）');
        return;
    }

    this.aiTyping = true;
    this.emotionPattern = '';

    try {
        const moodRecords = (this.moodRecords || [])
            .slice(-20)
            .map(m => ({
                mood_score: typeof m.mood_score === 'number' ? m.mood_score : 5,
                mood_label: m.emoji || null,
                note: m.text || null,
                created_at: m.time
                    ? new Date(m.time).toISOString()
                    : new Date().toISOString()
            }));

        const treeHoles = (this.treeholeHistory || [])
            .slice(-20)
            .map(t => ({
                content: t.message || '',
                created_at: t.time
                    ? new Date(t.time).toISOString()
                    : new Date().toISOString()
            }));

        const chatHistory = (this.aiMessages || [])
            .slice(1, 31)
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.text || '',
                created_at: null
            }));

        const body = {
            tree_holes: treeHoles,
            mood_records: moodRecords,
            chat_history: chatHistory,
            period_label: '最近一段时间',
            big_five: this.currentUser.big_five || null,
            attachment_style: this.currentUser.attachment_style || null
        };

        const res = await apiCall('/ai/emotion-report', 'post', body);

        this.emotionPattern =
            res.report || '暂时没有生成结果，请稍后再试~';

    } catch (e) {
        console.error('生成情绪模式失败:', e);
        alert(e.response?.data?.detail || '生成失败，请稍后重试');
    } finally {
        this.aiTyping = false;
    }
},
 


        // ===== 心晴指南方法 =====
       toggleTipDetail(index) {
    this.emotionTips[index].expanded = !this.emotionTips[index].expanded;
},

openTipModal(tip) {
    this.currentTip = tip;
    this.showTipModal = true;
},

closeTipModal() {
    this.showTipModal = false;
    this.currentTip = null;
},
        
async likeCommunityTip(tip) {
    try {
        const res = await apiCall(`/community/tips/${tip.id}/like`, 'post');
        tip.likes = res.likes;
    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail || '你已经点过赞了~');
        } else {
            alert('点赞失败，请稍后再试');
        }
    }
},
       async submitCommunityTip() {
    const text = this.newCommunityTip.trim();
    if (!text) return;

    try {
        await apiCall('/community/tips', 'post', { text });
        this.communityTips = await apiCall('/community/tips', 'get');
        this.newCommunityTip = '';
        alert('感谢你的分享✨');
    } catch (e) {
        alert('发布失败，请稍后再试');
    }
},
async likeWarmWord(word) {
    try {
        const res = await apiCall(`/community/warmwords/${word.id}/like`, 'post');
        word.likes = res.likes;
    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail || '你已经点过赞了~');
        } else {
            alert('点赞失败');
        }
    }
},
       async submitWarmWord() {
    const text = this.newWarmWord.trim();
    if (!text) return;

    try {
        await apiCall('/community/warmwords', 'post', { text });
        this.warmWords = await apiCall('/community/warmwords', 'get');
        this.newWarmWord = '';
        alert('感谢你的暖心话语 💛');
    } catch (e) {
        alert('发布失败');
    }
},
        updateTopTipsRanking() {
    this.topTipsRanking = (this.communityTips || [])
        .slice()
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5);
},
       formatTime(timeStr) {
    if (!timeStr) return '刚刚';

    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '刚刚';

    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);

    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    if (diff < 30) return `${Math.floor(diff / 7)}周前`;
    return `${Math.floor(diff / 30)}个月前`;
},
      startConsultation(doctor) {
    this.showCounselingModal = false;

    alert(
`已为你联系 ${doctor.name} 咨询师

专业方向：${doctor.specialty}
咨询费用：¥${doctor.price}/次`
    );
},

        // ===== 心情便签 =====
      selectEmj(e) {
    this.selectedEmj = e;
    this.inputValue = e;
},

async recieve() {
    if (!this.inputValue.trim()) {
        return alert("写点今天的感受吧～");
    }

    try {
        const emoji = this.diaryEmoji || this.selectedEmj || "💭";

        const newRecord = await apiCall('/moods', 'post', {
            emoji,
            text: this.inputValue
        });

        this.moodRecords.unshift(newRecord);

        alert("叮！你的心情已经被记录啦 ✨");

        this.inputValue = '';
        this.diaryEmoji = '';
        this.selectedEmj = '';

    } catch (e) {
        alert("保存失败，请稍后再试");
    }
},
      async delMood(idx) {
    if (!this.moodRecords[idx]) return;

    if (!confirm('确定删除这条心情吗？')) return;

    try {
        const moodId = this.moodRecords[idx].id;
        await apiCall(`/moods/${moodId}`, 'delete');
        this.moodRecords.splice(idx, 1);
    } catch {
        alert("删除失败");
    }
},

        // ===== 日历 =====
        prevMonth() { if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; } else this.currentMonth--; },
        nextMonth() { if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; } else this.currentMonth++; },
        isToday(y,m,d) { const t = new Date(); return t.getFullYear()===y && t.getMonth()===m && t.getDate()===d; },
        openRecordModal(d) { if (!d.day || !d.records.length) return; this.modalDate = `${d.day}日`; this.modalRecords = [...d.records].reverse(); this.showRecordModal = true; },

        // ===== 树洞核心 =====
       async submitConfession() {
    if (this.submitting) return;

    const text = this.treeholeMessage.trim();
    if (!text) return;

    this.submitting = true;

    try {
        const newEntry = await apiCall('/treehole', 'post', {
            message: text
        });

        this.treeholeHistory.unshift(newEntry);
        this.treeholeReply = newEntry.reply;
        this.lastConfessionMessage = newEntry.message;

        if (this.isPublic) {
            await apiCall('/bottles/throw', 'post', {
                message: text,
                match_mode: 'similar',
                is_public: true
            });

            this.publicConfessions = await apiCall('/treehole/public', 'get');
        }

        this.treeholeMessage = '';
        this.submitted = true;

    } catch (e) {
        alert("倾诉失败，请稍后重试");
    } finally {
        this.submitting = false;
    }
},
 async submitComment(confession) {
    if (!this.newCommentText?.trim()) return;

    try {
        const res = await apiCall(
            `/treehole/public/${confession.id}/comment`,
            'post',
            { text: this.newCommentText }
        );

        if (!Array.isArray(confession.comments)) {
            confession.comments = [];
        }

        if (res?.comment) {
            confession.comments.push(res.comment);
        } else {
            const updated = await apiCall(`/treehole/public/${confession.id}`, 'get');

            let comments = updated.comments;
            if (typeof comments === 'string') {
                try { comments = JSON.parse(comments); }
                catch { comments = []; }
            }

            confession.comments = comments || [];
        }

        if (this.selectedConfession?.id === confession.id) {
            this.selectedConfession.comments = confession.comments;
        }

        this.newCommentText = '';

    } catch (e) {
        console.error("评论失败:", e);
        alert(e?.response?.data?.detail || "评论失败，请稍后再试");
    }
},

 // ===== 点赞公开心事 =====
async likeConfession(confession) {
    if (!confession?.id) return;

    // 防止重复点击
    if (confession._liking) return;
    confession._liking = true;

    try {
        const res = await apiCall(`/treehole/public/${confession.id}/like`, 'post');

        // 防御更新
        confession.likes = typeof res?.likes === 'number'
            ? res.likes
            : (confession.likes || 0) + 1;

    } catch (e) {
        if (e.response?.status === 400) {
            alert(e.response.data.detail || '你已经点过赞了');
        } else {
            console.error('点赞失败:', e);
            alert('点赞失败，请稍后再试');
        }
    } finally {
        confession._liking = false;
    }
},

// ===== 心晴指南自动刷新 =====
startGuideAutoRefresh() {
    if (this.guideRefreshTimer) return;

    // 先加载一次
    this.loadPublicData();

    this.guideRefreshTimer = setInterval(() => {
        this.loadPublicData();
    }, 30000); // 30秒
},

stopGuideAutoRefresh() {
    if (this.guideRefreshTimer) {
        clearInterval(this.guideRefreshTimer);
        this.guideRefreshTimer = null;
    }
},

// 防内存泄漏
beforeUnmount() {
    this.stopGuideAutoRefresh();
},

// ===== 打开内联评论 =====
openInlineComment(confession) {
    if (!confession) return;

    // 确保 comments 是数组
    if (!Array.isArray(confession.comments)) {
        confession.comments = [];
    }

    if (this.activeCommentId === confession.id) {
        // 关闭
        this.activeCommentId = null;
        this.newCommentText = '';
    } else {
        // 打开新的评论框
        this.activeCommentId = confession.id;

        // ⭐ 如果你以后想支持“每条评论独立输入框”，这里要改结构
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

        // ===== 漂流瓶功�?=====
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

        // 本地提交捡到瓶子的留言（若需要持久化可以改为调用后端 API�?
async submitPickedBottleComment() {
    const id = this.pickedBottle?.id;
    const text = this.newCommentText?.trim();

    if (!text) return alert("写点什么吧");

    try {
        const res = await apiCall(`/bottles/${id}/comment`, 'post', { text });

        if (!this.pickedBottle.comments) {
            this.pickedBottle.comments = [];
        }

        if (res.comment) {
            this.pickedBottle.comments.push(res.comment);
        } else {
            this.pickedBottle.comments.push({
                username: this.currentUser?.username || "匿名",
                text,
                time: new Date().toISOString()
            });
        }

        this.newCommentText = '';

    } catch (e) {
        alert(typeof e.response?.data?.detail === "string" ? e.response.data.detail : "发送失败");
    }
},

        // 在详情中查看被捡到的瓶子（复用详情弹窗）
     // ===== 查看捡到的瓶子详情 =====
goCommentPickedBottle() {
    if (!this.pickedBottle) return;

    this.currentDetail = {
        ...this.pickedBottle,
        comments: Array.isArray(this.pickedBottle.comments)
            ? this.pickedBottle.comments
            : [],
        reply: this.pickedBottle.reply || "（对方还没有回复）"
    };

    this.showConfessionDetail = true;
},

// ===== 扔漂流瓶 =====
async throwBottle() {
    console.log('[debug] throwBottle clicked', {
        bottleMessage: this.bottleMessage,
        currentUser: this.currentUser
            ? {
                id: this.currentUser.id,
                big_five: this.currentUser.big_five,
                attachment_style: this.currentUser.attachment_style
              }
            : null
    });

    // 基础校验
    if (!this.bottleMessage.trim() || this.throwingBottle) return;

    if (!this.currentUser) {
        alert('请先登录再扔漂流瓶（点击“我的空间”登录/注册）');
        return;
    }

    if (!this.currentUser.big_five || !this.currentUser.attachment_style) {
        alert('请先完成大五人格测试和依恋类型（进入“我的空间”完善资料）');
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

        // 清空输入
        this.bottleMessage = '';

        // 并行刷新（更快）
        await Promise.all([
            this.loadPublicData?.(),
            this.loadMyBottles?.()
        ]);

    } catch (e) {
        console.error('[error] throwBottle failed', e);

        const detail =
            e?.response?.data?.detail ||
            e.message ||
            '扔瓶子失败，请稍后重试';

        alert(detail);

    } finally {
        this.throwingBottle = false;
        setTimeout(() => {
            this.showThrowAnimation = false;
        }, 800);
    }
},

// ===== 捞漂流瓶 =====
async pickBottle() {
    if (this.pickingBottle) return;

    this.pickingBottle = true;

    try {
        const res = await apiCall('/bottles/pick', 'post');

        let bottle = res?.bottle || {};

        // 防御性处理 comments
        let safeComments = [];

        if (Array.isArray(bottle.comments)) {
            safeComments = bottle.comments;
        } else if (typeof bottle.comments === 'string') {
            try {
                safeComments = JSON.parse(bottle.comments);
            } catch {
                safeComments = [];
            }
        }

        this.pickedBottle = {
            ...bottle,
            comments: safeComments
        };

        // 幸运提示
        if (res?.lucky) {
            alert(res.lucky_msg || "✨ 今天运气不错！");
        }

    } catch (e) {
        console.error("打捞失败", e);

        alert(
            e?.response?.data?.detail ||
            "🌊 海面上空如也，换个时间再试试吧"
        );

    } finally {
        this.pickingBottle = false;
    }
},
async likePickedBottle() {
    if (!this.pickedBottle?.id) return;

    if (this.likingBottle) return;

    if (!this.currentUser) {
        return alert("请先登录");
    }

    this.likingBottle = true;

    // ⭐ 记录旧值（关键）
    const oldLikes = this.pickedBottle.likes || 0;

    try {
        // ⭐ 乐观更新
        this.pickedBottle.likes = oldLikes + 1;

        const res = await apiCall(
            `/bottles/${this.pickedBottle.id}/like`,
            'post'
        );

        // ⭐ 后端兜底
        this.pickedBottle.likes = res.likes;

    } catch (e) {

        // ⭐ 安全回滚（不会错乱）
        this.pickedBottle.likes = oldLikes;

        if (e.response?.status === 400) {
            alert(e.response.data.detail || "已经点过赞了");
        } else {
            alert("点赞失败，请稍后再试");
        }

    } finally {
        this.likingBottle = false;
    }
},
togglePickedComment() {
    this.showPickedCommentBox = !this.showPickedCommentBox;

    if (!this.showPickedCommentBox) {
        this.commentInputs[this.pickedBottle.id] = '';
    }
},
       closePickedBottle() {
    this.pickedBottle = null;
    this.showPickedCommentBox = false;
},

       
        // ===== 用户系统 =====
        openLogin() { this.showLoginModal = true; this.showRegisterModal = false; },
        toggleExpandComment(ci) {
            const s = new Set(this.expandedComments);
            s.has(ci) ? s.delete(ci) : s.add(ci);
            this.expandedComments = s;
        },
        toggleMoodExpand(idx) {
            const s = new Set(this.expandedMood);
            s.has(idx) ? s.delete(idx) : s.add(idx);
            this.expandedMood = s;
        },
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
    // ===== 1. 同步人格数据 =====
    if (this.currentUser) {
        this.attachmentResult = this.currentUser.attachment_style || "";
        this.bigFiveInput = this.currentUser.big_five || "";
        console.log("人格数据同步成功:", this.attachmentResult, this.bigFiveInput);
    }

    // ===== 2. 并发加载（核心优化）=====
    const [moodsRes, bottlesRes] = await Promise.allSettled([
        apiCall('/moods', 'get'),
        apiCall('/bottles/my', 'get')
    ]);

    // ===== 3. 心情记录 =====
    if (moodsRes.status === 'fulfilled') {
        this.moodRecords = Array.isArray(moodsRes.value)
            ? moodsRes.value
            : [];
    } else {
        console.error("加载心情失败:", moodsRes.reason);
        this.moodRecords = []; // ⭐ 防止页面炸
    }

    // ===== 4. 我的瓶子 =====
    if (bottlesRes.status === 'fulfilled') {
        this.myBottles = Array.isArray(bottlesRes.value)
            ? bottlesRes.value
            : [];
    } else {
        console.error("加载我的瓶子失败:", bottlesRes.reason);
        this.myBottles = [];
    }
},
       
async doRegister() {
    try {
        console.log('doRegister 被调用了，发�?POST 请求');
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

    // ⭐ 防重复提交
    if (this.calculatingAttachment) return;

    // ===== 1. 校验 =====
    const unfinished = this.attachmentQuestions.some(
        q => q.score === null || q.score === undefined
    );

    if (unfinished) {
        return alert("请完成所有30道题目后再提交哦~");
    }

    this.calculatingAttachment = true;

    // ===== 2. 初始化统计 =====
    const stats = { 
        "安全型": 0, 
        "焦虑型": 0, 
        "回避型": 0, 
        "恐惧型": 0 
    };

    // ===== 3. 统计（加防御）=====
    this.attachmentQuestions.forEach(q => {
        const type = q.type;
        const score = Number(q.score) || 0;

        if (stats.hasOwnProperty(type)) {
            stats[type] += score;
        } else {
            console.warn("未知类型:", type);
        }
    });

    // ===== 4. 找最大值 =====
    let maxType = "安全型";
    let maxVal = -Infinity;

    for (let key in stats) {
        if (stats[key] > maxVal) {
            maxVal = stats[key];
            maxType = key;
        }
    }

    // ⭐ 先更新UI（更丝滑）
    this.attachmentResult = maxType;

    try {
        // ===== 5. 保存到后端 =====
        await apiCall('/users/me/attachment', 'post', {
            style: maxType,
            scores: stats
        });

        // ===== 6. 本地同步 =====
        if (this.currentUser) {
            this.currentUser.attachment_style = maxType;
        }

        this.isAttachmentOpen = false;

        alert(`测试完成！你的依恋类型是：${maxType}`);

    } catch (e) {
        console.error("保存失败", e);

        alert("结果已计算，但保存失败（不影响查看结果）");

    } finally {
        this.calculatingAttachment = false;
    }
},
      async loadPublicData() {
    try {
        this.publicConfessions = await apiCall('/treehole/public', 'get');
        this.communityTips = await apiCall('/community/tips', 'get');
        this.warmWords = await apiCall('/community/warmwords', 'get');

        // �?根据最�?communityTips 重新算排行榜
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
        我是一个${this.currentUser.attachment_style}的人。
        我的大五人格得分为：${this.currentUser.big_five}。
        请从“社交偏好”、“亲密关系”、“压力应对”三个维度，
        用温柔且有洞察力的语言为我写一段300字的心灵自画像。
        `;
            const res = await apiCall('/ai/chat', 'post', { message: prompt });
            this.aiAnalysis = res.reply;
            this.aiLoading = false;

},
// emotion.js 中的 saveBigFive
async saveBigFive() {
    // ⭐ 1. 登录校验
    if (!this.currentUser) {
        return alert("请先登录");
    }

    // ⭐ 2. 输入校验
    if (!this.bigFiveInput || !this.bigFiveInput.trim()) {
        return alert("请先填写结果");
    }

    // ⭐ 3. 防重复提交
    if (this.savingBigFive) return;
    this.savingBigFive = true;

    try {
        // ⭐ 4. 调接口
        await apiCall('/users/me/big_five', 'post', { 
            result: this.bigFiveInput 
        });
        
        // ⭐ 5. 本地同步（关键！！！）
        this.currentUser.big_five = this.bigFiveInput;

        // ⭐ 6. 用户反馈
        alert("大五人格数据已存入深海记忆 🌊");

        // ⭐ 7. 自动生成报告
        await this.generateAIReport(); 

    } catch (e) {
        console.error("保存失败:", e);

        alert(
            e?.response?.data?.detail ||
            "保存失败，请检查网络或登录状态"
        );

    } finally {
        this.savingBigFive = false;
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
            } catch (e) {
                console.warn("用户信息加载失败，清除token", e);
                localStorage.removeItem('access_token');
                await this.loadPublicData();
            }
        } else {
            await this.loadPublicData();
        }

        if (this.page === 'sun') {
            this.startGuideAutoRefresh();
        }

        window.addEventListener('message', (e) => {
            if (e.data?.type === 'BF_SAVED' && e.data.score) {
                if (!this.currentUser) return;
                this.currentUser.big_five = e.data.score;
                this.bigFiveInput = e.data.score;
                this.isReTesting = false;
            }
        });

        window.addEventListener('storage', (e) => {
            if (e.key === 'bf_score_result' && e.newValue) {
                if (!this.currentUser) return;
                this.currentUser.big_five = e.newValue;
                this.bigFiveInput = e.newValue;
                this.isReTesting = false;
            }
        });
    },

    watch: {
        page(newVal) {
            if (newVal === 'treehole') {
                this.fetchPublicConfessions();
            }
            if (newVal === 'sun') {
                this.startGuideAutoRefresh();
            } else {
                this.stopGuideAutoRefresh();
            }
        }
    }
    
}).mount("#Store");
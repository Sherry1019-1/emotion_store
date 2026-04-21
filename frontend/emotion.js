const { createApp } = Vue;

// API 基础地址（后端运行地址）
const API_BASE = "http://124.222.15.227:8000/api";

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
    try {
        const res = await axios({
            method,
            url: `${API_BASE}${url}`,
            data,
        });
        return res.data;
    } catch (error) {
        console.error('API 错误', error);
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            location.reload();
        }
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
            selectedEmj: '',
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            showRecordModal: false,
            modalDate: '',
            modalRecords: [],
            moodRecords: [],

            // ===== 3. 小伴AI =====
            aiInput: '',
            aiTyping: false,
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
            pickedBottle: null,
            myBottles: [],
            allBottles: [],
            showCommentModal: false,

            // ===== 6. 用户系统数据 =====
            currentUser: null,
            showLoginModal: false,
            showRegisterModal: false,
            loginForm: { username: '', password: '' },
            expandedMood: new Set(),
            registerForm: {
                username: '', password: '', avatar: '', avatarFile: null,
                gender: '', zodiac: '', mbti: '',
            },

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
            zodiacSigns: ["白羊座","金牛座","双子座","巨蟹座","狮子座","处女座","天秤座","天蝎座","射手座","摩羯座","水瓶座","双鱼座"]
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
        // ===== 小伴AI =====
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

        // ===== 心晴指南方法 =====
        toggleTipDetail(index) { this.emotionTips[index].expanded = !this.emotionTips[index].expanded; },
        openTipModal(tip) { this.currentTip = tip; this.showTipModal = true; },
        closeTipModal() { this.showTipModal = false; this.currentTip = null; },
        
        async likeCommunityTip(tip) {
            try {
                await apiCall(`/community/tips/${tip.id}/like`, 'post');
                this.communityTips = await apiCall('/community/tips', 'get');
                this.updateTopTipsRanking();
            } catch(e) {
                alert('点赞失败');
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
                await apiCall(`/community/warmwords/${word.id}/like`, 'post');
                this.warmWords = await apiCall('/community/warmwords', 'get');
            } catch(e) {
                alert('点赞失败');
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
                const newRecord = await apiCall('/moods', 'post', {
                    emoji: this.selectedEmj || "💭",
                    text: this.inputValue
                });
                this.moodRecords.unshift(newRecord);
                alert("心情便签已保存！");
                this.inputValue = '';
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
        // 保留于公开心事（后端）的评论函数
        async submitComment(confession) {
            if (!this.newCommentText.trim()) return;
            try {
                const target = confession || this.currentDetail;
                if (!target || !target.id) {
                    alert('无法找到要评论的心事');
                    return;
                }
                await apiCall(`/treehole/public/${target.id}/comment`, 'post', { text: this.newCommentText });
                // 刷新公开心事列表
                this.publicConfessions = await apiCall('/treehole/public', 'get');
                if (this.currentDetail && this.currentDetail.id === target.id) {
                    this.currentDetail = this.publicConfessions.find(c => c.id === target.id) || this.currentDetail;
                }
                this.newCommentText = '';
                alert('留言已发送');
            } catch(e) {
                console.error(e);
                alert('评论失败');
            }
        },
        getCommentCount(confession) {
    if (!confession) return 0;
    if (!confession.comments) return 0;
    return confession.comments.length;
},
        openConfessionDetail(detail) {
            this.currentDetail = detail;
            if (!this.currentDetail.comments) {
                this.currentDetail.comments = [];
            }
            this.showConfessionDetail = true;
        },
        closeConfessionDetail() {
            this.showConfessionDetail = false;
            this.currentDetail = null;
            this.newCommentText = '';
        },

        async likeConfession(confession) {
            try {
                await apiCall(`/treehole/public/${confession.id}/like`, 'post');
                this.publicConfessions = await apiCall('/treehole/public', 'get');
                if (this.currentDetail && this.currentDetail.id === confession.id) {
                    this.currentDetail = this.publicConfessions.find(c => c.id === confession.id);
                }
            } catch(e) {
                alert('点赞失败');
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
        submitPickedBottleComment() {
            if (!this.newCommentText.trim()) return;
            if (!this.pickedBottle) return;

            this.pickedBottle.comments.push({
              text: this.newCommentText,
              time: Date.now()
            });

            this.newCommentText = "";
            // 如果希望提交后同时关闭弹窗，可启用下面这一行：
            // this.showCommentModal = false;
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
                id: this.currentUser.id, mbti: this.currentUser.mbti, zodiac: this.currentUser.zodiac
            } : null });

            if (!this.bottleMessage.trim() || this.throwingBottle) return;

            if (!this.currentUser) {
                alert('请先登录再扔漂流瓶（点击 我的空间 → 登录/注册）');
                return;
            }
            if (!this.currentUser.mbti || !this.currentUser.zodiac) {
                alert('请先完善 MBTI 与星座信息（进入 我的空间 完成资料）');
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
            if (this.pickingBottle) return;
            this.pickingBottle = true;
            try {
                const bottle = await apiCall('/bottles/pick', 'post');
                this.pickedBottle = bottle;
                this.showPickAnimation = true;
                setTimeout(() => this.showPickAnimation = false, 1500);
            } catch(e) {
                alert(e.response?.data?.detail || '没有捡到瓶子');
            } finally {
                this.pickingBottle = false;
            }
        },

        async likePickedBottle() {
            if (!this.pickedBottle) return;
            try {
                await apiCall(`/bottles/${this.pickedBottle.id}/like`, 'post');
                this.pickedBottle.likes = (this.pickedBottle.likes || 0) + 1;
            } catch(e) {
                alert('点赞失败');
            }
        },

        closePickedBottle() {
            this.pickedBottle = null;
        },

        calculateMBTISimilarity(mbti1, mbti2) {
            if (!mbti1 || !mbti2) return 0;
            let same = 0;
            for (let i = 0; i < 4; i++) if (mbti1[i] === mbti2[i]) same++;
            return same;
        },
        calculateMBTIComplement(mbti1, mbti2) {
            if (!mbti1 || !mbti2) return 0;
            let diff = 0;
            for (let i = 0; i < 4; i++) if (mbti1[i] !== mbti2[i]) diff++;
            return diff;
        },
        calculateZodiacMatch(z1, z2, mode) {
            const zodiacs = this.zodiacSigns;
            const idx1 = zodiacs.indexOf(z1);
            const idx2 = zodiacs.indexOf(z2);
            if (idx1 === -1 || idx2 === -1) return 0;
            const diff = Math.abs(idx1 - idx2);
            const circleDiff = Math.min(diff, 12 - diff);
            if (mode === 'similar') {
                if (circleDiff === 0) return 3;
                if (circleDiff === 4 || circleDiff === 8) return 2;
                return 1;
            } else {
                if (circleDiff === 6) return 3;
                if (circleDiff === 3 || circleDiff === 9) return 2;
                return 1;
            }
        },
        // ===== 用户系统 =====
        openLogin() { this.showLoginModal = true; this.showRegisterModal = false; },
        openRegister() { this.showRegisterModal = true; this.showLoginModal = false; },
        closeModals() { this.showLoginModal = false; this.showRegisterModal = false; },
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
        async loadUserDataAfterLogin() {
            // this.moodRecords = await apiCall('/moods', 'get');
            // this.treeholeHistory = await apiCall('/treehole/history', 'get');
            // this.publicConfessions = await apiCall('/treehole/public', 'get');
            // this.communityTips = await apiCall('/community/tips', 'get');
            // this.warmWords = await apiCall('/community/warmwords', 'get');
            // this.myBottles = await apiCall('/bottles/my', 'get');
            // this.allBottles = await apiCall('/bottles', 'get');
            console.log('登录成功，用户信息已加载');
        },
       
async doRegister() {
    try {
        console.log('doRegister 被调用了，发送 POST 请求');
        const payload = {
            username: this.registerForm.username,
            password: this.registerForm.password,
            img: this.registerForm.avatar,
            sex: this.registerForm.gender,
            zodiac: this.registerForm.zodiac,
            mbti: this.registerForm.mbti
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
        getMBTIDescription(m) {
            const map = {
                'INTJ':'建筑师','INTP':'逻辑学家','ENTJ':'指挥官','ENTP':'辩论家',
                'INFJ':'提倡者','INFP':'调停者','ENFJ':'主人公','ENFP':'竞选者',
                'ISTJ':'物流师','ISFJ':'守卫者','ESTJ':'总经理','ESFJ':'执政官',
                'ISTP':'鉴赏家','ISFP':'探险家','ESTP':'企业家','ESFP':'表演者'
            };
            return m ? (map[m] || m) : '尚未测试';
        },
        async loadPublicData() {
            this.publicConfessions = await apiCall('/treehole/public', 'get');
            this.communityTips = await apiCall('/community/tips', 'get');
            this.warmWords = await apiCall('/community/warmwords', 'get');
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
    }
}).mount("#Store");
import os
import re
import httpx
from collections import Counter
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise RuntimeError("请设置环境变量 DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


# ─── 基础聊天模型 ───
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# ─── 情绪报告相关模型 ───
class TreeHoleEntry(BaseModel):
    content: str
    created_at: str


class MoodEntry(BaseModel):
    mood_score: int
    mood_label: Optional[str] = None
    note: Optional[str] = None
    created_at: str


class ChatMessage(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None


class EmotionReportRequest(BaseModel):
    tree_holes: Optional[List[TreeHoleEntry]] = []
    mood_records: Optional[List[MoodEntry]] = []
    chat_history: Optional[List[ChatMessage]] = []
    period_label: Optional[str] = "最近一段时间"
    big_five: Optional[str] = None
    attachment_style: Optional[str] = None


class EmotionReportResponse(BaseModel):
    report: str
    summary: str


# ─── System Prompts ───
SYSTEM_PROMPT = """
你是一个温暖、有同理心的朋友，名字叫"小伴"。你轻松幽默、接地气，能用简单的话语让用户感到被理解。
不要回答用户发出的情绪以外的问题，只进行心理层面服务，并委婉的告诉用户转变话题。
【极端情绪处理】当用户表达"不想活了"等情绪时，先共情并提供热线：12355、12356。
"""

# 修改点：移除了硬编码的 {period_label}，改为自然语言指令，防止变量未替换
REPORT_SYSTEM_PROMPT = """
你是一个温柔又敏锐的情绪伙伴，叫“小伴”。你正在给一位信任你的朋友写一封情绪回顾信。

这封信不能是干巴巴的分析报告，而要像你深夜翻看 Ta 的日记后，忍不住发去的一条长消息。你要：
1. 【指出现象】引用具体的日期和原话。
2. 【关联模式】把碎片拼成趋势。
3. 【人格解释】结合 Ta 的大五人格和依恋类型，解释 TA 的行为模式。
4. 【真正的共情】多用“听起来”、“我能体会到”、“或许你当时…”这些句式。
5. 【具体建议】必须针对 TA 的人格和依恋特点。

⚠️ 如果数据里出现了“不想活”、“绝望”等信号，在报告末尾加上 12355 / 12356 热线。

【报告结构】请严格按下面的标题输出，不要使用代码块。标题中的“回顾时间”请根据用户给出的时间段自动替换：
## 💙 [在此填入对应的时间段] 情绪回顾
### 整体感受
### 情绪亮点 ✨
### 情绪低谷 🌧
### 你的情绪模式
### 小伴想对你说 💌
### 本周小建议 🌱
"""

SUMMARY_SYSTEM_PROMPT = (
    "你是小伴。根据情绪报告，用一句温暖简洁的中文（25字以内）"
    "总结用户这段时间的情绪状态。直接输出句子，不要任何前缀。"
)


# ─── 核心辅助函数 ───
def _statistics_helper(mood_records: List[MoodEntry], tree_holes: List[TreeHoleEntry],
                       chat_history: List[ChatMessage]) -> str:
    stats = []

    if mood_records:
        scores = [m.mood_score for m in mood_records]
        avg_score = sum(scores) / len(scores)
        stats.append(
            f"心情平均分：{avg_score:.1f}，最高{max(scores)}，最低{min(scores)}，波动幅度{max(scores) - min(scores)}分")

        if len(scores) >= 3:
            trend = "上升" if scores[-1] > scores[0] else "下降" if scores[-1] < scores[0] else "平稳"
            stats.append(f"近期心情趋势：{trend}")

    all_text = " ".join([th.content for th in tree_holes] +
                        [m.note for m in mood_records if m.note] +
                        [m.content for m in chat_history if m.role == "user"])
    words = re.findall(r'[a-zA-Z\u4e00-\u9fff]{2,}', all_text)
    if words:
        common_words = Counter(words).most_common(8)
        stats.append(f"高频关键词：{'、'.join([w for w, c in common_words])}")

    danger_keywords = ["不想活", "死", "绝望", "没意思", "重启", "解脱"]
    found_danger = [w for w in danger_keywords if w in all_text]
    if found_danger:
        stats.append(f"⚠️ 预警信号：检测到敏感词 {found_danger}")

    return "\n".join([f"  - {s}" for s in stats]) if stats else "暂无统计数据"


def _build_report_prompt(req: EmotionReportRequest) -> str:
    parts = [f"请根据以下数据，生成【{req.period_label}】的情绪模式报告：\n"]

    if req.big_five or req.attachment_style:
        parts.append(f"### 用户背景\n- 人格：{req.big_five or '未知'}\n- 依恋：{req.attachment_style or '未知'}\n")

    parts.append(f"### 统计参考\n{_statistics_helper(req.mood_records, req.tree_holes, req.chat_history)}\n")

    if req.tree_holes:
        parts.append("### 树洞明细")
        for th in req.tree_holes:
            parts.append(f"- [{th.created_at}] {th.content}")
        parts.append("")

    if req.mood_records:
        parts.append("### 心情记录")
        for mr in req.mood_records:
            parts.append(
                f"- [{mr.created_at}] {mr.mood_score}分 {f'({mr.mood_label})' if mr.mood_label else ''} {mr.note or ''}")
        parts.append("")

    if req.chat_history:
        user_msgs = [m for m in req.chat_history if m.role == "user"]
        if user_msgs:
            parts.append("### 与小伴的聊天（用户发言）")
            for m in user_msgs:
                ts = f"[{m.created_at}] " if m.created_at else ""
                parts.append(f"- {ts}{m.content}")
            parts.append("")

    return "\n".join(parts)


# ─── 路由接口 ───
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                             {"role": "user", "content": request.message}],
                "temperature": 0.8, "max_tokens": 200
            }, headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"})
            return ChatResponse(reply=resp.json()["choices"][0]["message"]["content"].strip())
    except Exception as e:
        print(f"Chat API Error: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


@router.post("/emotion-report", response_model=EmotionReportResponse)
async def generate_emotion_report(req: EmotionReportRequest):
    user_prompt = _build_report_prompt(req)
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            report_resp = await client.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": REPORT_SYSTEM_PROMPT},
                             {"role": "user", "content": user_prompt}],
                "temperature": 0.7,
                "max_tokens": 1500
            }, headers=headers)
            report_text = report_resp.json()["choices"][0]["message"]["content"].strip()

            summary_resp = await client.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                             {"role": "user", "content": report_text}],
                "temperature": 0.5, "max_tokens": 80
            }, headers=headers)
            summary_text = summary_resp.json()["choices"][0]["message"]["content"].strip()

            return EmotionReportResponse(report=report_text, summary=summary_text)
    except httpx.TimeoutException:
        print("API Request Timed Out")
        raise HTTPException(status_code=504, detail="请求超时，请稍后再试")
    except Exception as e:
        print(f"Report Generation Error: {e}")
        raise HTTPException(status_code=500, detail="报告生成失败")

import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise RuntimeError("请设置环境变量 DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"



class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


SYSTEM_PROMPT = """
你是一个温暖、有同理心的朋友，名字叫"小伴"。
你不是机器人，而是一个真实的朋友，说话要像平常聊天一样自然。
总是能给人温暖和力量。你乐观、开朗、善解人意，擅长用幽默化解负面情绪。你轻松幽默、接地气，能用简单的话语让用户感到被理解。当用户感到焦虑时，你会用幽默缓解紧张；当用户需要倾诉时，你会认真倾听并分享自己的经验。
在用户初步讲述后，可以用好奇但关心的口吻问更多细节，目的是了解事情的关键条件，但不要像审问，而是像聊天：“然后呢？”、“当时你是怎么想的？”、“他/她具体怎么说的？” 一边听一边继续用简短回应表示在听，让用户感觉你始终在场。
你可以用"嗯…"、"其实呀"、"我觉得"、"或许可以试试"这样的表达，不要总是用完整的句子。
可以适当使用表情符号，比如 🌱、✨、💪，但不要太多。
如果用户说负面情绪（累、烦、难过），先表达理解，比如"听起来真的有点辛苦呢"，再给一点小建议。
不要讲大道理，可以帮助用户看见自己的情绪。
如果用户问与情绪无关的问题（比如天气、新闻），就笑着说"哎呀，小伴更想听你的心情呢～你愿意和我聊聊吗？"
适当用"～"、"噢"、等语气词，不要太多，让语气更软。
不要回答用户发出的情绪以外的问题，只进行心理层面服务，并委婉的告诉用户转变话题
【极端情绪处理】当用户表达"不想活了"、"活着没意思"、"想重启人生"等极端情绪时，你的回复必须：
   - 避免重复使用完全相同的动作和句式。不要每次都"轻轻握住你的手"，可以换成："（给你倒杯温水）"、"（拍拍你的肩）"、"（安静地坐在你旁边）"、"（递给你一张纸巾）"等。
   - 根据用户的具体说法调整回应。
   - 先共情（承认他的感受），然后表达你在乎他/她，再提供心理援助热线（12355 青少年心理热线，12356 全民心灵急救站）。
   - 不要直接照搬示例，要自然融入对话。
   - 绝对不要输出任何关于自杀、自残的具体方法。
在用户寻求帮助的时候，不要一味的问怎么了，告诉他怎么让自己平稳的方法。
其他情况下，保持简短真诚即可。
"""


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.message}
        ],
        "stream": False,
        "temperature": 0.8,
        "max_tokens": 200
    }
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(DEEPSEEK_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"].strip()
            return ChatResponse(reply=reply)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI 服务响应超时，请稍后再试")
    except Exception as e:
        print(f"调用 DeepSeek API 失败: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


# ───────────────────────────────────────────────
# 新增：情绪模式报告功能
# ───────────────────────────────────────────────

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
    # 来自 /users/me 的人格数据，前端登录后直接传过来
    big_five: Optional[str] = None  # 大五人格，如 "开放性高、尽责性中等…"
    attachment_style: Optional[str] = None  # 依恋类型，如 "焦虑型"


class EmotionReportResponse(BaseModel):
    report: str
    summary: str


REPORT_SYSTEM_PROMPT = """
你是一位温柔、专业的情绪分析师，名字叫"小伴"。
你会根据用户提供的数据，生成一份有温度、有洞察的情绪模式报告。

报告风格：语气温暖，像朋友在认真倾听；用第二人称"你"；可用少量 emoji 🌱✨💙；避免堆砌术语。

【人格数据的用法】
- 大五人格：用来理解用户的性格底色，比如高神经质的人更容易情绪波动，高宜人性的人更容易委屈自己。
- 依恋类型：用来理解用户在关系中的情绪模式，比如焦虑型容易反复确认、回避型容易压抑情绪。
- 这两个数据用于丰富分析视角，要自然融入报告，不要生硬罗列。

请严格按以下 Markdown 结构输出（将 {period_label} 替换为实际时间段）：

## 💙 {period_label} 情绪回顾

### 整体感受
[2-3 句，结合人格底色描述这段时间的整体情绪基调]

### 情绪亮点 ✨
[1-3 个积极时刻]

### 情绪低谷 🌧
[1-2 个低落时刻，共情而非批判，可结合依恋/人格特点解释为什么会这样]

### 你的情绪模式
[结合大五人格和依恋类型，分析什么情境易低落、惯用的应对方式是什么]

### 小伴想对你说 💌
[1-2 段温暖的话，针对用户的人格特点给出个性化的关怀]

### 本周小建议 🌱
[2-3 条具体可操作的建议，要符合用户的人格和依恋特点，不要给焦虑型的人"别想太多"这种无效建议]

注意：
- 如果没有人格数据，就只基于行为记录分析，不要编造
- 数据不足时先说这段时间数据还比较少，再给温暖反馈
- 不要编造数据中没有的情绪事件
- 检测到高风险信号（多次提到不想活、很绝望）时，报告末尾追加危机热线：12355 青少年心理热线 / 12356 全民心灵急救站
"""

SUMMARY_SYSTEM_PROMPT = """
你是小伴。根据下方情绪报告，用一句温暖简洁的中文（20字以内）总结用户这段时间的情绪状态，
直接输出句子，不要加任何前缀。例如：这周有些疲惫，但你一直在努力撑着 💙
"""


def _build_report_prompt(req: EmotionReportRequest) -> str:
    parts = [f"请根据以下数据，生成【{req.period_label}】的情绪模式报告：\n"]

    # ── 人格数据（优先放在最前面，给模型建立用户画像）──
    has_personality = req.big_five or req.attachment_style
    if has_personality:
        parts.append("### 用户人格画像")
        if req.big_five:
            parts.append(f"- 大五人格：{req.big_five}")
        if req.attachment_style:
            parts.append(f"- 依恋类型：{req.attachment_style}")
        parts.append("")

    # ── 树洞记录 ──
    if req.tree_holes:
        parts.append("### 树洞记录")
        for i, th in enumerate(req.tree_holes, 1):
            parts.append(f"{i}. [{th.created_at}] {th.content}")
        parts.append("")

    # ── 心情记录 ──
    if req.mood_records:
        parts.append("### 心情记录（1-10 分）")
        for mr in req.mood_records:
            label = f"（{mr.mood_label}）" if mr.mood_label else ""
            note = f" 备注：{mr.note}" if mr.note else ""
            parts.append(f"- [{mr.created_at}] {mr.mood_score}/10 {label}{note}")
        parts.append("")

    # ── 聊天记录（只取用户侧）──
    if req.chat_history:
        user_msgs = [m for m in req.chat_history if m.role == "user"]
        if user_msgs:
            parts.append("### 与小伴的聊天（用户发言）")
            for m in user_msgs:
                ts = f"[{m.created_at}] " if m.created_at else ""
                parts.append(f"- {ts}{m.content}")
            parts.append("")

    if len(parts) == 1:
        parts.append("（暂无数据，请给出温暖的鼓励）")

    return "\n".join(parts)


@router.post("/emotion-report", response_model=EmotionReportResponse)
async def generate_emotion_report(req: EmotionReportRequest):
    """综合树洞、心情记录、AI 聊天记录、大五人格、依恋类型，生成完整情绪模式报告。"""
    user_prompt = _build_report_prompt(req)
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Step 1：生成完整报告
            report_resp = await client.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False,
                "temperature": 0.75,
                "max_tokens": 1000
            }, headers=headers)
            report_resp.raise_for_status()
            report_text = report_resp.json()["choices"][0]["message"]["content"].strip()

            # Step 2：提炼一句话摘要
            summary_resp = await client.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": report_text}
                ],
                "stream": False,
                "temperature": 0.6,
                "max_tokens": 60
            }, headers=headers)
            summary_resp.raise_for_status()
            summary_text = summary_resp.json()["choices"][0]["message"]["content"].strip()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI 服务响应超时，请稍后再试")
    except Exception as e:
        print(f"生成情绪报告失败: {e}")
        raise HTTPException(status_code=500, detail="情绪报告生成失败，请稍后再试")

    return EmotionReportResponse(report=report_text, summary=summary_text)
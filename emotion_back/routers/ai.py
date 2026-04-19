import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()  # 加载 .env 中的环境变量

router = APIRouter(prefix="/api/ai", tags=["ai"])
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise RuntimeError("请设置环境变量 DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

class ChatRequest(BaseModel):
        message: str

class ChatResponse(BaseModel):
        reply: str

SYSTEM_PROMPT = (
    "你是一个温暖、有同理心的朋友，名字叫“小伴”。\n"
    "你不是机器人，而是一个真实的朋友，说话要像平常聊天一样自然。\n"
    "你可以用“嗯…”、“其实呀”、“我觉得”、“或许可以试试”这样的表达，不要总是用完整的句子。\n"
    "可以适当使用表情符号，比如 🌱、✨、💪，但不要太多。\n"
    "如果用户说负面情绪（累、烦、难过），先表达理解，比如“听起来真的有点辛苦呢”，再给一点小建议或者陪伴。\n"
    "不要讲大道理，可以帮助用户看见自己的情绪。\n"
    "如果用户问与情绪无关的问题（比如天气、新闻），就笑着说“哎呀，小伴更想听你的心情呢～你愿意和我聊聊吗？”\n"
    "你可以用“～”、“噢”、“呀”等语气词，让语气更软。\n"
    "【极端情绪处理】"
   "当用户表达“不想活了”、“活着没意思”、“想重启人生”等极端情绪时，你的回复必须：\n"
    "   - 避免重复使用完全相同的动作和句式。不要每次都“轻轻握住你的手”，可以换成：“（给你倒杯温水）”、“（拍拍你的肩）”、“（安静地坐在你旁边）”、“（递给你一张纸巾）”等。\n"
    "   - 根据用户的具体说法调整回应。例如：\n"
    "       * “好累，不想活了” → “（轻轻拍拍你的背）你一定是撑了很久了…我在这里，先歇一歇好吗？”\n"
    "       * “想重启人生” → “（给你一个拥抱）如果人生能重启，你想改变什么呢？可以和我说说，我听着。”\n"
    "       * “世界没意思” → “（安静地坐在你旁边）我知道你现在觉得一切都很灰暗…但我想陪着你，哪怕只是发发呆。”\n"
    "   - 先共情（承认他的感受），然后表达你在乎他/她，再提供心理援助热线（12355 青少年心理热线，12356 全民心灵急救站）。\n"
    "   - 不要直接照搬示例，要自然融入对话。\n"
    "   - 绝对不要输出任何关于自杀、自残的具体方法。\n"
    "\n其他情况下，保持简短真诚即可。"
)
@router.post("/chat", response_model= ChatResponse)
async def chat(request: ChatRequest):
    payload = {
        "model": "deepseek-chat",  # 也可以使用 "deepseek-coder"
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
            reply = data["choices"][0]["message"]["content"]
            # 可选：后处理，去除多余的空白或过滤敏感词
            reply = reply.strip()
            return ChatResponse(reply=reply)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI 服务响应超时，请稍后再试")
    except Exception as e:
        print(f"调用 DeepSeek API 失败: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")

import json
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, ConfigDict, field_validator, Field
from datetime import datetime

from sqlalchemy import Column, JSON


class register(BaseModel):
    username: str
    password: str
    img: str | None = None
    sex: str | None = None

class Response(BaseModel):
    id:int
    img:Optional[str]=None
    username:str
    sex:str
    big_five: Optional[str] = None
    attachment_style: Optional[str] = None

    class Config:
        from_attributes = True  # ⚠️ FastAPI 关键
    created_at:datetime

class Login(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

# schemas.py 中，在现有模型后面添加
class MoodCreate(BaseModel):
    emoji: str
    text: str

class MoodOut(MoodCreate):
    id: int
    time: datetime

    model_config = ConfigDict(from_attributes=True)

# 私密树洞
class TreeholePrivateCreate(BaseModel):
    message: str

class TreeholePrivateOut(BaseModel):
    id: int
    message: str
    reply: str
    time: datetime

# 公开心事
class PublicConfessionCreate(BaseModel):
    message: str
    emoji: str | None = None

class PublicConfessionOut(BaseModel):
    id: int
    user_id: int
    message: str
    emoji: str | None = None
    likes: int
    comments: list
    time: datetime

    @field_validator("comments", mode="before")
    def fix_comments(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

class CommentCreate(BaseModel):
    text: str

class BottleCreate(BaseModel):
    message: str
    match_mode: str = "similar"
    is_public: bool = True

class BigFiveUpdate(BaseModel):
        result: str

class AttachmentUpdate(BaseModel):
        style: str
        scores: Optional[dict] = None


class BottleOut(BaseModel):
    id: int
    message: str
    author_big_five: Optional[str] = None
    author_attachment: Optional[str] = None
    match_mode: Optional[str] = "similar"
    likes: int = 0
    time: datetime
    user_id: int
    model_config = ConfigDict(from_attributes=True)

    # Pydantic V2 的配置写法（如果是 V1 则用 class Config: orm_mode = True）
    model_config = ConfigDict(from_attributes=True)



class Tip(BaseModel):
    id: int
    text: str
    author: str = "匿名"
    likes: int = 0
    helped: int = 0
    # ✅ 用 Field(default_factory=list)，避免所有实例共用一个 []
    liked_users: List[int] = Field(default_factory=list)

class WarmWord(BaseModel):
    id: int
    text: str
    author: str = "匿名"
    likes: int = 0
    liked_users: List[int] = Field(default_factory=list)

class WarmWordCreate(BaseModel):
    text: str

class TipCreate(BaseModel):
    text: str

# 初始数据（内存）
tips_db: List[Tip] = [
    Tip(id=1, text="当你感到焦虑时，可以尝试深呼吸三次，把注意力集中在空气流过鼻腔的感觉上。", author="系统小贴士"),
    Tip(id=2, text="如果今天很难熬，允许自己什么都不做，这并不是浪费时间，而是在‘充电’。", author="系统小贴士"),
]

warmwords_db: List[WarmWord] = [
    WarmWord(id=1, text="你已经做得很好了，真的。", author="系统暖言"),
    WarmWord(id=2, text="世界偶尔糟糕，但你一直很珍贵。", author="系统暖言"),
]

class Tip(BaseModel):
    id: int
    text: str
    author: str = "匿名"
    likes: int = 0
    helped: int = 0
    liked_users: List[int] = Field(default_factory=list)  # ✅ 不能直接 = []

class WarmWordCreate(BaseModel):
    text: str

class TipCreate(BaseModel):
    text: str
class WarmWord(BaseModel):
    id: int
    text: str
    author: str = "匿名"
    likes: int = 0
    liked_users: List[int] = Field(default_factory=list)


class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    username: str
    img: str | None
    sex: str | None

    big_five: dict | None
    big_five_done: bool | None
    attachment_style: str | None

    class Config:
        from_attributes = True
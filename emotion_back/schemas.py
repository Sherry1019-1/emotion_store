from typing import Optional

from pydantic import BaseModel
from datetime import datetime


class register(BaseModel):
    img:Optional[str]=None
    username:str
    password:str
    sex:str
    zodiac:str
    mbti:str

class Response(BaseModel):
    id:int
    img:Optional[str]=None
    username:str
    sex:str
    zodiac:str
    mbti:str
    created_at:datetime

class Login(BaseModel):
    username:str
    password:str

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
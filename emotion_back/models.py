from os import path

from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Text, JSON, Boolean

from database import Base
class Users(Base):
    __tablename__ = "user_info"
    id = Column(Integer, primary_key=True,autoincrement=True)
    img=Column(String(500))
    username=Column(String(30),unique=True)
    password = Column(String(128))
    sex=Column(String)
    zodiac=Column(String)
    mbti=Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# models.py 中，在 User 模型后面添加
class MoodRecord(Base):
    __tablename__ = "mood_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String(10), nullable=False)
    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), server_default=func.now())

class TreeholeHistory(Base):
    __tablename__ = "treehole_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    reply = Column(Text, nullable=False)   # 系统自动生成的回信
    time = Column(DateTime(timezone=True), server_default=func.now())

class PublicConfession(Base):
    __tablename__ = "public_confessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    emoji = Column(String(10), nullable=True)   # 表情符号，可选
    likes = Column(Integer, default=0)
    comments = Column(JSON, default=list)      # 存储 [{user_id, text, time}]
    time = Column(DateTime(timezone=True), server_default=func.now())

class Bottle(Base):
    __tablename__ = "bottles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    author_mbti = Column(String(4), nullable=False)
    author_zodiac = Column(String(20), nullable=False)
    match_mode = Column(String(20), nullable=False)   # 'similar' 或 'complementary'
    is_public = Column(Boolean, default=True)
    likes = Column(Integer, default=0)
    picked = Column(Boolean, default=False)
    picker_id = Column(Integer, nullable=True)
    time = Column(DateTime(timezone=True), server_default=func.now())
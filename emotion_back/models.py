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
    big_five = Column(String, nullable=True)
    big_five_done = Column(Boolean, default=False)
    # 依恋类型：安全型、焦虑型、回避型、恐惧型
    attachment_style = Column(String(20), nullable=True)
    # 存储30题的具体原始得分，用于更精确匹配
    attachment_scores = Column(JSON, nullable=True)

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

    # models.py

class PublicConfession(Base):
        __tablename__ = "public_confessions"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
        message = Column(Text, nullable=False)
        emoji = Column(String(10), nullable=True)
        likes = Column(Integer, default=0)
        # 新增：记录点赞过的人的 ID 列表
        liked_users = Column(JSON, default=list)
        comments = Column(JSON, default=list)
        time = Column(DateTime(timezone=True), server_default=func.now())

class Bottle(Base):
        __tablename__ = "bottles"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("user_info.id", ondelete="CASCADE"), nullable=False)
        message = Column(Text, nullable=False)
        author_big_five = Column(String(100))
        author_attachment = Column(String(20))
        is_public = Column(Boolean, default=False)
        match_mode = Column(String(20))
        picked = Column(Boolean, default=False)
        picker_id = Column(Integer, nullable=True)
        likes = Column(Integer, default=0)
        # 新增：记录点赞过的人的 ID 列表
        liked_users = Column(JSON, default=list)
        # 新增：评论字段
        comments = Column(JSON, default=list)
        time = Column(DateTime(timezone=True), server_default=func.now())

class WarmWord(Base):
    __tablename__ = "warm_words"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_info.id", ondelete="SET NULL"), nullable=True)
    text = Column(Text, nullable=False)
    author = Column(String(50), nullable=False, default="匿名用户")
    likes = Column(Integer, default=0)

    # 记录点过赞的用户 id 列表（和 Bottle / PublicConfession 一样用 JSON）
    liked_users = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
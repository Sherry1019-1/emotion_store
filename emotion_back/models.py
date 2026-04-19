from os import path

from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Text

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


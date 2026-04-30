# database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# 数据库连接地址
DATABASE_URL = "sqlite+aiosqlite:///./mood.db"

# 1. 创建异步引擎
engine = create_async_engine(DATABASE_URL, echo=True)

# 2. 创建异步会话工厂（明确指定 AsyncSession）
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# 3. 模型基类
Base = declarative_base()

# 4. 依赖函数：获取数据库会话
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

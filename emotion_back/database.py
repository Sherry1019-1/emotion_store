from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
# 数据库连接地址
DATABASE_URL = "sqlite+aiosqlite:///./emotion.db"

# 创建异步引擎
engine = create_async_engine(DATABASE_URL, echo=True)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# 模型基类
Base = declarative_base()

# 依赖函数：获取数据库会话
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
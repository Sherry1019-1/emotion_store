from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import users, moods, treehole, bottles
from routers import users, ai

# 1. 定义 lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

# 2. 创建 FastAPI 实例
app = FastAPI(lifespan=lifespan)
app.include_router(ai.router)
# 3. 配置 CORS 中间件（必须在 app 创建之后）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 先全部允许（开发阶段）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 注册路由
app.include_router(users.router)
app.include_router(moods.router)
app.include_router(treehole.router)
app.include_router(bottles.router)
# 5. 根路径
@app.get("/")
async def root():
    return {"message": "24h情绪便利店后端已启动"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8081)
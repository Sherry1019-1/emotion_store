from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

from routers import users, moods, treehole, bottles, community, ai, big_five


# 1. 定义 lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

# 2. 创建 FastAPI 实例
app = FastAPI(lifespan=lifespan)
origins = [
    "http://124.222.15.227",          # 你的服务器公网IP
    "http://124.222.15.227:5500",     # 如果你在服务器上挂载前端预览
    "https://to-feel-good.store",     # 未来的域名（备案后）
    "http://to-feel-good.store",
    "http://127.0.0.1:5500",          # 本地开发调试保留
    "http://localhost:5500",
]
# 3. 配置 CORS 中间件（必须在 app 创建之后）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# main.py
app.include_router(big_five.router)
app.include_router(community.router, prefix="/api/community",tags=["社区广场"])
app.include_router(users.router, prefix="/api/users")
app.include_router(moods.router, prefix="/api/moods", tags=["情绪"])
app.include_router(treehole.router, prefix="/api/treehole", tags=["树洞"])
app.include_router(bottles.router, prefix="/api/bottles", tags=["漂流瓶"])

app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
# 5. 根路径
@app.get("/")
async def root():
    return {"message": "24h情绪便利店后端已启动"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
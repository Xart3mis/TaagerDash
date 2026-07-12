from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import auth, funnel, insights, users, targets, invites, teams

app = FastAPI(
    title="TaagerDash",
    description="Consolidated Advertising Campaign Performance Tracker",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(targets.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(funnel.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(teams.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}

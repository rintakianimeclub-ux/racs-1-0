from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----------------- Setup -----------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("rintaki")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

app = FastAPI(title="Rintaki Anime Club API")
api = APIRouter(prefix="/api")

# ----------------- Helpers -----------------
def now_utc():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def set_jwt_cookies(response: Response, user_id: str):
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clear_auth_cookies(response: Response):
    for c in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(c, path="/")

def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "picture": u.get("picture"),
        "role": u.get("role", "member"),
        "points": u.get("points", 0),
        "badges": u.get("badges", []),
        "bio": u.get("bio", ""),
        "created_at": u.get("created_at"),
    }

async def get_current_user(request: Request) -> dict:
    # 1. session_token cookie (Emergent Google)
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > now_utc():
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user

    # 2. JWT access_token cookie or Bearer
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

async def add_points(user_id: str, amount: int, reason: str):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"points": amount}})
    await db.points_transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "amount": amount,
        "reason": reason,
        "created_at": iso(now_utc()),
    })

async def push_notification(user_id: str, title: str, body: str, kind: str = "info", link: Optional[str] = None):
    await db.notifications.insert_one({
        "notif_id": f"n_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "body": body,
        "kind": kind,
        "link": link,
        "read": False,
        "created_at": iso(now_utc()),
    })

# ----------------- Models -----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ThreadCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    category: str = Field(default="General")

class ReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)

class EventCreate(BaseModel):
    title: str
    description: str
    location: str = ""
    starts_at: str  # ISO string
    cover_image: Optional[str] = None

class NewsletterCreate(BaseModel):
    title: str
    summary: str
    content: str
    cover_image: Optional[str] = None

class VideoCreate(BaseModel):
    title: str
    description: str = ""
    url: str  # youtube, vimeo or direct
    thumbnail: Optional[str] = None

class MessageCreate(BaseModel):
    to_user_id: str
    body: str = Field(min_length=1, max_length=2000)

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None

# ----------------- Startup -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.forum_threads.create_index("created_at")
    await db.forum_replies.create_index("thread_id")
    await db.messages.create_index([("from_user_id", 1), ("to_user_id", 1)])
    await db.notifications.create_index("user_id")
    await db.events.create_index("starts_at")
    await db.daily_logins.create_index([("user_id", 1), ("date", 1)], unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rintaki.org").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@Rintaki2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Rintaki Admin",
            "role": "admin",
            "points": 0,
            "badges": ["Founder"],
            "bio": "Rintaki Anime Club Society admin",
            "picture": None,
            "created_at": iso(now_utc()),
        })
        logger.info("Seeded admin user")
    else:
        if not existing.get("password_hash") or not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})
            logger.info("Updated admin password")

    # Seed a couple demo events & a welcome thread if empty
    if await db.events.count_documents({}) == 0:
        await db.events.insert_many([
            {
                "event_id": f"ev_{uuid.uuid4().hex[:10]}",
                "title": "Anime MKE 2026 Meetup",
                "description": "Join the Rintaki crew at Anime Milwaukee for panels, cosplay, and trading card drops.",
                "location": "Wisconsin Center, Milwaukee",
                "starts_at": iso(now_utc() + timedelta(days=20)),
                "cover_image": "https://images.pexels.com/photos/30462154/pexels-photo-30462154.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
                "created_at": iso(now_utc()),
            },
            {
                "event_id": f"ev_{uuid.uuid4().hex[:10]}",
                "title": "Otaku Hangout Night",
                "description": "Casual club meetup — watch parties, manga swap, snacks.",
                "location": "Rintaki HQ Lounge",
                "starts_at": iso(now_utc() + timedelta(days=7)),
                "cover_image": "https://images.unsplash.com/photo-1697541986349-08125ac922a1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxyZXRybyUyMGphcGFuZXNlJTIwYWVzdGhldGljfGVufDB8fHx8MTc3NjgwNjI0Mnww&ixlib=rb-4.1.0&q=85",
                "created_at": iso(now_utc()),
            },
        ])

    if await db.newsletters.count_documents({}) == 0:
        await db.newsletters.insert_one({
            "newsletter_id": f"nl_{uuid.uuid4().hex[:10]}",
            "title": "Otaku World — Vol. 5, Issue 1",
            "summary": "Fresh interviews, trading card drops, and your Rinaka Points highlights.",
            "content": "Welcome back, otaku family! This month we're featuring interviews with Karen Sakurai & Kana Ueda, plus the full trading card collection reveal.",
            "cover_image": "https://images.pexels.com/photos/31369734/pexels-photo-31369734.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "author": "Rintaki Admin",
            "created_at": iso(now_utc()),
        })

    if await db.forum_threads.count_documents({}) == 0:
        admin = await db.users.find_one({"email": admin_email})
        if admin:
            await db.forum_threads.insert_one({
                "thread_id": f"th_{uuid.uuid4().hex[:10]}",
                "title": "Welcome to the Rintaki Forums!",
                "body": "Introduce yourself, share your favorite anime & grab 10 Rinaka Points for your first post.",
                "category": "Announcements",
                "author_id": admin["user_id"],
                "author_name": admin["name"],
                "likes": [],
                "reply_count": 0,
                "pinned": True,
                "created_at": iso(now_utc()),
            })

# ----------------- Auth Endpoints -----------------
@api.get("/")
async def root():
    return {"ok": True, "app": "Rintaki Anime Club API"}

@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "member",
        "points": 10,  # welcome bonus
        "badges": ["New Member"],
        "bio": "",
        "picture": None,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    await db.points_transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}", "user_id": user_id, "amount": 10,
        "reason": "Welcome bonus", "created_at": iso(now_utc()),
    })
    set_jwt_cookies(response, user_id)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return public_user(user)

@api.post("/auth/login")
async def login(data: LoginIn, request: Request, response: Response):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"key": key})
    if attempt and attempt.get("count", 0) >= 5:
        last = attempt.get("last")
        if isinstance(last, str):
            last = datetime.fromisoformat(last)
        if last and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last and now_utc() - last < timedelta(minutes=15):
            raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"key": key},
            {"$inc": {"count": 1}, "$set": {"last": iso(now_utc())}},
            upsert=True,
        )
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"key": key})
    set_jwt_cookies(response, user["user_id"])
    return public_user(user)

@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

@api.post("/auth/google/session")
async def google_session(request: Request, response: Response, x_session_id: Optional[str] = Header(None, alias="X-Session-ID")):
    if not x_session_id:
        raise HTTPException(400, "Missing X-Session-ID header")
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": x_session_id},
            )
            if r.status_code != 200:
                raise HTTPException(401, "Invalid session")
            data = r.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Auth provider error")

    email = data["email"].lower()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "member",
            "points": 10,
            "badges": ["New Member"],
            "bio": "",
            "created_at": iso(now_utc()),
        }
        await db.users.insert_one(user)
        await db.points_transactions.insert_one({
            "tx_id": f"tx_{uuid.uuid4().hex[:12]}", "user_id": user_id, "amount": 10,
            "reason": "Welcome bonus", "created_at": iso(now_utc()),
        })
    else:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": name, "picture": picture}})

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "created_at": iso(now_utc()),
        "expires_at": iso(now_utc() + timedelta(days=7)),
    })

    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none",
                        max_age=7*24*60*60, path="/")
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return public_user(user)

# ----------------- Profile -----------------
@api.patch("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return public_user(u)

@api.get("/users/{user_id}")
async def get_user(user_id: str):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return public_user(u)

# ----------------- Rintaki Feed -----------------
@api.get("/rintaki/feed")
async def rintaki_feed():
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get("https://rintaki.org/wp-json/wp/v2/posts", params={"per_page": 12, "_embed": "true"})
            if r.status_code != 200:
                return {"posts": []}
            posts = r.json()
        simplified = []
        for p in posts:
            media = None
            try:
                media = p.get("_embedded", {}).get("wp:featuredmedia", [{}])[0].get("source_url")
            except Exception:
                media = None
            simplified.append({
                "id": p.get("id"),
                "title": p.get("title", {}).get("rendered", ""),
                "excerpt": p.get("excerpt", {}).get("rendered", ""),
                "link": p.get("link"),
                "date": p.get("date"),
                "image": media,
            })
        return {"posts": simplified}
    except Exception as e:
        logger.warning(f"rintaki feed error: {e}")
        return {"posts": []}

# ----------------- Forums -----------------
@api.get("/forums/threads")
async def list_threads(category: Optional[str] = None):
    q = {}
    if category:
        q["category"] = category
    threads = await db.forum_threads.find(q, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(100)
    return {"threads": threads}

@api.post("/forums/threads")
async def create_thread(data: ThreadCreate, user: dict = Depends(get_current_user)):
    t = {
        "thread_id": f"th_{uuid.uuid4().hex[:10]}",
        "title": data.title,
        "body": data.body,
        "category": data.category,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture"),
        "likes": [],
        "reply_count": 0,
        "pinned": False,
        "created_at": iso(now_utc()),
    }
    await db.forum_threads.insert_one(t)
    await add_points(user["user_id"], 5, "Created a forum thread")
    t.pop("_id", None)
    return t

@api.get("/forums/threads/{thread_id}")
async def get_thread(thread_id: str):
    t = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Thread not found")
    replies = await db.forum_replies.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"thread": t, "replies": replies}

@api.post("/forums/threads/{thread_id}/replies")
async def reply_thread(thread_id: str, data: ReplyCreate, user: dict = Depends(get_current_user)):
    t = await db.forum_threads.find_one({"thread_id": thread_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    reply = {
        "reply_id": f"rp_{uuid.uuid4().hex[:10]}",
        "thread_id": thread_id,
        "body": data.body,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture"),
        "likes": [],
        "created_at": iso(now_utc()),
    }
    await db.forum_replies.insert_one(reply)
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$inc": {"reply_count": 1}})
    await add_points(user["user_id"], 2, "Replied to a thread")
    if t["author_id"] != user["user_id"]:
        await push_notification(t["author_id"], "New reply", f"{user['name']} replied to your thread '{t['title']}'", "reply", f"/forums/{thread_id}")
    reply.pop("_id", None)
    return reply

@api.post("/forums/threads/{thread_id}/like")
async def like_thread(thread_id: str, user: dict = Depends(get_current_user)):
    t = await db.forum_threads.find_one({"thread_id": thread_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    likes = t.get("likes", [])
    if user["user_id"] in likes:
        await db.forum_threads.update_one({"thread_id": thread_id}, {"$pull": {"likes": user["user_id"]}})
        return {"liked": False}
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$addToSet": {"likes": user["user_id"]}})
    if t["author_id"] != user["user_id"]:
        await add_points(t["author_id"], 1, "Thread got a like")
    return {"liked": True}

# ----------------- Points / Leaderboard -----------------
@api.get("/points/me")
async def my_points(user: dict = Depends(get_current_user)):
    txs = await db.points_transactions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"points": user.get("points", 0), "transactions": txs, "badges": user.get("badges", [])}

@api.post("/points/daily-claim")
async def daily_claim(user: dict = Depends(get_current_user)):
    today = now_utc().date().isoformat()
    try:
        await db.daily_logins.insert_one({"user_id": user["user_id"], "date": today, "created_at": iso(now_utc())})
    except Exception:
        raise HTTPException(400, "Already claimed today")
    await add_points(user["user_id"], 5, "Daily login bonus")
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "points": u.get("points", 0)}

@api.get("/points/leaderboard")
async def leaderboard():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("points", -1).limit(20).to_list(20)
    return {"leaderboard": [public_user(u) for u in users]}

# ----------------- Events -----------------
@api.get("/events")
async def list_events():
    events = await db.events.find({}, {"_id": 0}).sort("starts_at", 1).to_list(100)
    return {"events": events}

@api.post("/events")
async def create_event(data: EventCreate, user: dict = Depends(require_admin)):
    ev = {
        "event_id": f"ev_{uuid.uuid4().hex[:10]}",
        **data.model_dump(),
        "created_at": iso(now_utc()),
    }
    await db.events.insert_one(ev)
    # Notify all users
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
    for u in all_users:
        await push_notification(u["user_id"], "New event!", data.title, "event", "/events")
    ev.pop("_id", None)
    return ev

# ----------------- Newsletters -----------------
@api.get("/newsletters")
async def list_newsletters():
    items = await db.newsletters.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"newsletters": items}

@api.post("/newsletters")
async def create_newsletter(data: NewsletterCreate, user: dict = Depends(require_admin)):
    n = {
        "newsletter_id": f"nl_{uuid.uuid4().hex[:10]}",
        **data.model_dump(),
        "author": user["name"],
        "created_at": iso(now_utc()),
    }
    await db.newsletters.insert_one(n)
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
    for u in all_users:
        await push_notification(u["user_id"], "New newsletter", data.title, "newsletter", "/newsletters")
    n.pop("_id", None)
    return n

# ----------------- Videos -----------------
@api.get("/videos")
async def list_videos():
    items = await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"videos": items}

@api.post("/videos")
async def create_video(data: VideoCreate, user: dict = Depends(require_admin)):
    v = {
        "video_id": f"v_{uuid.uuid4().hex[:10]}",
        **data.model_dump(),
        "author": user["name"],
        "created_at": iso(now_utc()),
    }
    await db.videos.insert_one(v)
    v.pop("_id", None)
    return v

# ----------------- Messages -----------------
@api.get("/messages/conversations")
async def conversations(user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    pipeline = [
        {"$match": {"$or": [{"from_user_id": uid}, {"to_user_id": uid}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {"$cond": [{"$eq": ["$from_user_id", uid]}, "$to_user_id", "$from_user_id"]},
            "last_body": {"$first": "$body"},
            "last_at": {"$first": "$created_at"},
            "last_from": {"$first": "$from_user_id"},
        }},
        {"$sort": {"last_at": -1}},
    ]
    rows = await db.messages.aggregate(pipeline).to_list(100)
    convos = []
    for r in rows:
        other_id = r["_id"]
        other = await db.users.find_one({"user_id": other_id}, {"_id": 0, "password_hash": 0})
        if other:
            convos.append({
                "user": public_user(other),
                "last_body": r["last_body"],
                "last_at": r["last_at"],
                "last_from_me": r["last_from"] == uid,
            })
    return {"conversations": convos}

@api.get("/messages/with/{other_id}")
async def conversation_with(other_id: str, user: dict = Depends(get_current_user)):
    uid = user["user_id"]
    msgs = await db.messages.find(
        {"$or": [
            {"from_user_id": uid, "to_user_id": other_id},
            {"from_user_id": other_id, "to_user_id": uid},
        ]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    # mark as read
    await db.messages.update_many({"from_user_id": other_id, "to_user_id": uid, "read": False}, {"$set": {"read": True}})
    other = await db.users.find_one({"user_id": other_id}, {"_id": 0, "password_hash": 0})
    return {"messages": msgs, "other": public_user(other) if other else None}

@api.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    if data.to_user_id == user["user_id"]:
        raise HTTPException(400, "Cannot message yourself")
    other = await db.users.find_one({"user_id": data.to_user_id})
    if not other:
        raise HTTPException(404, "Recipient not found")
    msg = {
        "message_id": f"m_{uuid.uuid4().hex[:10]}",
        "from_user_id": user["user_id"],
        "to_user_id": data.to_user_id,
        "from_name": user["name"],
        "body": data.body,
        "read": False,
        "created_at": iso(now_utc()),
    }
    await db.messages.insert_one(msg)
    await push_notification(data.to_user_id, "New message", f"{user['name']}: {data.body[:50]}", "message", f"/messages/{user['user_id']}")
    msg.pop("_id", None)
    return msg

# ----------------- Notifications -----------------
@api.get("/notifications")
async def list_notifs(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"notifications": items, "unread": unread}

@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}

# ----------------- Admin -----------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "threads": await db.forum_threads.count_documents({}),
        "events": await db.events.count_documents({}),
        "newsletters": await db.newsletters.count_documents({}),
        "videos": await db.videos.count_documents({}),
    }

@api.get("/members")
async def list_members(user: dict = Depends(get_current_user)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"members": [public_user(u) for u in items if u["user_id"] != user["user_id"]]}

# ----------------- Wire up -----------------
app.include_router(api)

_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[_frontend_url, "http://localhost:3000"],
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()

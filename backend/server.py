from dotenv import load_dotenv
load_dotenv()

import os
import re
import jwt
import json
import stat
import shutil
import asyncio
import tempfile
import subprocess
import bcrypt
import secrets
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Annotated

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Local persistence (portable snapshot of users + login activity, kept in repo)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
USERS_FILE = os.path.join(DATA_DIR, "users.json")
ACTIVITY_FILE = os.path.join(DATA_DIR, "login_activity.json")
APP_ROOT = os.path.dirname(BASE_DIR)  # /app
CONTINUE_FILE = os.path.join(APP_ROOT, "memory", "EMERGENT_CONTINUE.md")
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

app = FastAPI(title="StudyLocus API")
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": now_utc() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc.get("role", "user"),
        "created_at": doc.get("created_at"),
    }


# --------------------- Local JSON persistence helpers ---------------------
def _read_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _write_json(path: str, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    os.replace(tmp, path)


async def sync_users_file():
    """Mirror all users (hashed passwords only) to a local JSON file for portability."""
    docs = await db.users.find().to_list(10000)
    users = []
    for d in docs:
        created = d.get("created_at")
        users.append({
            "id": str(d["_id"]),
            "email": d.get("email"),
            "name": d.get("name", ""),
            "role": d.get("role", "user"),
            "password_hash": d.get("password_hash"),
            "created_at": created.isoformat() if isinstance(created, datetime) else created,
        })
    _write_json(USERS_FILE, users)


def log_activity(event: str, identifier: str, user_id: Optional[str] = None, success: bool = True):
    activity = _read_json(ACTIVITY_FILE, [])
    activity.append({
        "event": event,
        "identifier": identifier,
        "user_id": user_id,
        "success": success,
        "timestamp": now_utc().isoformat(),
    })
    _write_json(ACTIVITY_FILE, activity)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = ""


class LoginInput(BaseModel):
    email: str
    password: str


class TaskInput(BaseModel):
    text: str
    priority: Optional[str] = "medium"
    done: Optional[bool] = False


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    priority: Optional[str] = None
    done: Optional[bool] = None


class StudyLogInput(BaseModel):
    subject: str
    seconds: int
    date: Optional[str] = None  # ISO yyyy-mm-dd


class TestInput(BaseModel):
    date: str
    name: str


class MockScoreInput(BaseModel):
    name: str
    phy: float = 0
    chem: float = 0
    math: float = 0
    maxMarks: float = 300


class SettingsInput(BaseModel):
    examType: Optional[str] = None
    examYear: Optional[str] = None
    customExamDate: Optional[str] = None
    subjects: Optional[List[str]] = None
    targetScore: Optional[float] = None
    theme: Optional[str] = None
    cardData: Optional[Any] = None
    layout: Optional[Any] = None
    newDefaults: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")


@api.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "password_hash": hash_password(body.password),
           "name": body.name or email.split("@")[0], "role": "user", "created_at": now_utc()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    # seed default settings
    await db.settings.update_one(
        {"user_id": str(res.inserted_id)},
        {"$setOnInsert": {"user_id": str(res.inserted_id), "examType": "jee-mains",
                          "examYear": "2027", "customExamDate": None,
                          "subjects": ["Physics", "Chemistry", "Maths"], "targetScore": 250,
                          "layout": None}},
        upsert=True,
    )
    token = create_access_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    await sync_users_file()
    log_activity("register", email, str(res.inserted_id), success=True)
    return {"user": serialize_user(doc), "token": token}


@api.post("/auth/login")
async def login(body: LoginInput, response: Response):
    identifier = body.email.strip().lower()
    user = await db.users.find_one({"email": identifier})
    if not user or not verify_password(body.password, user["password_hash"]):
        log_activity("login", identifier, success=False)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(str(user["_id"]), identifier)
    set_auth_cookie(response, token)
    log_activity("login", identifier, str(user["_id"]), success=True)
    return {"user": serialize_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": serialize_user(user)}


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {"examType": "jee-mains", "examYear": "2027", "customExamDate": None,
                    "subjects": ["Physics", "Chemistry", "Maths"], "targetScore": 250,
                    "theme": "default", "cardData": {}, "layout": None}


@api.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    doc = await db.settings.find_one({"user_id": uid})
    if not doc:
        doc = {"user_id": uid, **DEFAULT_SETTINGS}
        await db.settings.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/settings")
async def update_settings(body: SettingsInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"user_id": uid}, {"$set": update}, upsert=True)
    doc = await db.settings.find_one({"user_id": uid})
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
def clean(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc.pop("user_id", None)
    return doc


@api.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.tasks.find({"user_id": uid}).sort("created_at", 1).to_list(500)
    return [clean(d) for d in docs]


@api.post("/tasks")
async def create_task(body: TaskInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    doc = {"user_id": uid, "text": body.text, "priority": body.priority,
           "done": body.done, "created_at": now_utc()}
    res = await db.tasks.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.tasks.update_one({"_id": ObjectId(task_id), "user_id": uid}, {"$set": update})
    doc = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": uid})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return clean(doc)


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    await db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": uid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Study logs
# ---------------------------------------------------------------------------
@api.get("/studylogs")
async def list_studylogs(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.studylogs.find({"user_id": uid}).sort("created_at", -1).to_list(2000)
    return [clean(d) for d in docs]


@api.post("/studylogs")
async def create_studylog(body: StudyLogInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    date = body.date or now_utc().strftime("%Y-%m-%d")
    doc = {"user_id": uid, "subject": body.subject, "seconds": body.seconds,
           "date": date, "created_at": now_utc()}
    res = await db.studylogs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.delete("/studylogs/{log_id}")
async def delete_studylog(log_id: str, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    await db.studylogs.delete_one({"_id": ObjectId(log_id), "user_id": uid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Test planner
# ---------------------------------------------------------------------------
@api.get("/tests")
async def list_tests(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.tests.find({"user_id": uid}).sort("date", 1).to_list(500)
    return [clean(d) for d in docs]


@api.post("/tests")
async def create_test(body: TestInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    doc = {"user_id": uid, "date": body.date, "name": body.name, "created_at": now_utc()}
    res = await db.tests.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.delete("/tests/{test_id}")
async def delete_test(test_id: str, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    await db.tests.delete_one({"_id": ObjectId(test_id), "user_id": uid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Mock test scores
# ---------------------------------------------------------------------------
@api.get("/scores")
async def list_scores(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    docs = await db.scores.find({"user_id": uid}).sort("created_at", 1).to_list(500)
    return [clean(d) for d in docs]


@api.post("/scores")
async def create_score(body: MockScoreInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    doc = {"user_id": uid, "name": body.name, "phy": body.phy, "chem": body.chem,
           "math": body.math, "maxMarks": body.maxMarks, "created_at": now_utc()}
    res = await db.scores.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.delete("/scores/{score_id}")
async def delete_score(score_id: str, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    await db.scores.delete_one({"_id": ObjectId(score_id), "user_id": uid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin: export full source to GitHub + continuation log
# ---------------------------------------------------------------------------
class ExportInput(BaseModel):
    repo: str
    pat: str
    summary: Optional[str] = None


def _run_git(args, cwd, env):
    res = subprocess.run(["git", *args], cwd=cwd, env=env, text=True,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300, check=False)
    if res.returncode:
        raise RuntimeError(f"git {' '.join(args[:2])} failed: {res.stderr[-800:]}")
    return res.stdout.strip()


def _export_sync(repo: str, pat: str, summary: Optional[str]):
    owner, name = repo.split("/", 1)
    headers = {"Accept": "application/vnd.github+json",
               "Authorization": f"Bearer {pat}",
               "X-GitHub-Api-Version": "2022-11-28"}
    with httpx.Client(base_url="https://api.github.com", headers=headers, timeout=30) as gh:
        chk = gh.get(f"/repos/{owner}/{name}")
        if chk.status_code == 404:
            created = gh.post("/user/repos", json={"name": name, "private": True,
                                                   "auto_init": False,
                                                   "description": "StudyLocus source export"})
            if created.status_code not in (201, 422):
                raise RuntimeError(f"GitHub repo creation failed ({created.status_code}): {created.text[:200]}")
        elif chk.status_code == 401:
            raise RuntimeError("GitHub token unauthorized (401) — check the PAT and its 'repo' scope")
        elif chk.status_code != 200:
            raise RuntimeError(f"GitHub repo lookup failed ({chk.status_code}): {chk.text[:200]}")

    with tempfile.TemporaryDirectory(prefix="sl-export-") as td:
        stage = os.path.join(td, "repo")
        ignore = shutil.ignore_patterns(".git", ".env", ".env.*", "node_modules", ".venv",
                                        "venv", "__pycache__", "*.pyc", ".pytest_cache",
                                        "dist", "build", ".emergent")
        shutil.copytree(APP_ROOT, stage, ignore=ignore)
        cont = ""
        if os.path.exists(CONTINUE_FILE):
            with open(CONTINUE_FILE, "r", encoding="utf-8") as f:
                cont = f.read()
        log_text = (summary or "").strip() or cont or "No summary recorded yet."
        with open(os.path.join(stage, "EMERGENT_CONTINUE.md"), "w", encoding="utf-8") as f:
            f.write(f"# Emergent Continuation Log\n\n"
                    f"_Exported (UTC): {now_utc().isoformat()}_\n\n"
                    f"Paste this into a new Emergent app to continue where you left off.\n\n"
                    f"---\n\n{log_text}\n")

        askpass = os.path.join(td, "askpass.sh")
        safe = pat.replace("'", "'\\''")
        with open(askpass, "w", encoding="utf-8") as f:
            f.write("#!/bin/sh\ncase \"$1\" in\n"
                    "  *Username*) printf '%s\\n' x-access-token ;;\n"
                    f"  *) printf '%s\\n' '{safe}' ;;\nesac\n")
        os.chmod(askpass, stat.S_IRWXU)
        env = {**os.environ, "GIT_ASKPASS": askpass, "GIT_TERMINAL_PROMPT": "0"}

        _run_git(["init", "-b", "main"], stage, env)
        _run_git(["config", "user.name", "StudyLocus Exporter"], stage, env)
        _run_git(["config", "user.email", "exporter@studylocus.local"], stage, env)
        _run_git(["add", "--all"], stage, env)
        _run_git(["commit", "--allow-empty", "-m", "Export StudyLocus source"], stage, env)
        commit = _run_git(["rev-parse", "HEAD"], stage, env)
        _run_git(["remote", "add", "origin", f"https://github.com/{owner}/{name}.git"], stage, env)
        _run_git(["push", "--force", "origin", "HEAD:main"], stage, env)
    return {"repository": repo, "url": f"https://github.com/{owner}/{name}", "commit": commit}


@api.post("/admin/export-github")
async def export_github(body: ExportInput, admin: dict = Depends(get_current_admin)):
    repo = body.repo.strip()
    if not REPO_RE.fullmatch(repo):
        raise HTTPException(status_code=400, detail="Repository must be in the form owner/name")
    if not body.pat or len(body.pat.strip()) < 20:
        raise HTTPException(status_code=400, detail="A valid GitHub Personal Access Token is required")
    try:
        result = await asyncio.to_thread(_export_sync, repo, body.pat.strip(), body.summary)
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=400, detail="Git operation timed out — try again")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(exc)[:300]}")
    await db.export_audit.insert_one({"repo": result["repository"], "commit": result["commit"],
                                      "by": admin.get("email"), "created_at": now_utc()})
    return result


@api.get("/admin/export-log")
async def export_log(admin: dict = Depends(get_current_admin)):
    text = ""
    if os.path.exists(CONTINUE_FILE):
        with open(CONTINUE_FILE, "r", encoding="utf-8") as f:
            text = f.read()
    audits = await db.export_audit.find().sort("created_at", -1).to_list(20)
    out = []
    for a in audits:
        out.append({"id": str(a["_id"]), "repo": a.get("repo"), "commit": a.get("commit"),
                    "by": a.get("by"), "created_at": a.get("created_at")})
    users_count = await db.users.count_documents({})
    return {"summary": text, "exports": out, "users_count": users_count}


@api.get("/")
async def root():
    return {"status": "ok", "service": "StudyLocus API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.settings.create_index("user_id", unique=True)
    await db.tasks.create_index("user_id")
    await db.studylogs.create_index("user_id")
    await db.tests.create_index("user_id")
    await db.scores.create_index("user_id")
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@studylocus.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        res = await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password),
                                         "name": "Admin", "role": "admin", "created_at": now_utc()})
        await db.settings.update_one({"user_id": str(res.inserted_id)},
                                     {"$setOnInsert": {"user_id": str(res.inserted_id), **DEFAULT_SETTINGS}},
                                     upsert=True)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    # seed username-based admin shortcut (login with "deep" / "deep8670")
    uname = os.environ.get("ADMIN_USERNAME", "deep").strip().lower()
    upass = os.environ.get("ADMIN_USERNAME_PASSWORD", "deep8670")
    u_existing = await db.users.find_one({"email": uname})
    if not u_existing:
        r = await db.users.insert_one({"email": uname, "password_hash": hash_password(upass),
                                       "name": "Deep", "role": "admin", "created_at": now_utc()})
        await db.settings.update_one({"user_id": str(r.inserted_id)},
                                     {"$setOnInsert": {"user_id": str(r.inserted_id), **DEFAULT_SETTINGS}},
                                     upsert=True)
    elif not verify_password(upass, u_existing["password_hash"]) or u_existing.get("role") != "admin":
        await db.users.update_one({"email": uname},
                                  {"$set": {"password_hash": hash_password(upass), "role": "admin"}})
    await sync_users_file()

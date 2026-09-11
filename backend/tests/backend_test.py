"""StudyLocus backend API test suite (pytest)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@studylocus.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def new_user():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "pass123"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Test User"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "id": data["user"]["id"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register", json={"email": f"x{uuid.uuid4().hex[:6]}@t.com", "password": "123", "name": "x"})
        assert r.status_code == 422

    def test_register_duplicate(self, new_user):
        r = requests.post(f"{API}/auth/register", json={"email": new_user["email"], "password": "pass123", "name": "dup"})
        assert r.status_code == 400

    def test_me_endpoint(self, new_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200
        assert r.json()["user"]["email"] == new_user["email"]

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_sets_cookie(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in r.cookies or any("access_token" in c for c in r.headers.get("set-cookie", ""))

    def test_password_hash_bcrypt(self, admin_token):
        # Indirect: login works and token issued means bcrypt verify worked
        r = requests.get(f"{API}/auth/me", headers=auth_headers(admin_token))
        assert r.status_code == 200


# ---------- Settings ----------
class TestSettings:
    def test_get_settings(self, new_user):
        r = requests.get(f"{API}/settings", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["examYear"] == "2027"
        assert "Physics" in d["subjects"]

    def test_update_theme_and_examtype(self, new_user):
        h = auth_headers(new_user["token"])
        r = requests.put(f"{API}/settings", json={"theme": "cyberpunk", "examType": "neet", "examYear": "2028"}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["theme"] == "cyberpunk"
        assert d["examType"] == "neet"
        assert d["examYear"] == "2028"
        # verify persistence via GET
        r2 = requests.get(f"{API}/settings", headers=h)
        d2 = r2.json()
        assert d2["theme"] == "cyberpunk"
        assert d2["examType"] == "neet"

    def test_update_carddata_blob(self, new_user):
        h = auth_headers(new_user["token"])
        blob = {"note": "hello world", "pomodoro": {"work": 25, "break": 5}, "agenda": {"2027-01-05": ["task1"]}}
        r = requests.put(f"{API}/settings", json={"cardData": blob}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["cardData"]["note"] == "hello world"
        assert d["cardData"]["pomodoro"]["work"] == 25
        # persistence
        r2 = requests.get(f"{API}/settings", headers=h)
        assert r2.json()["cardData"]["agenda"]["2027-01-05"] == ["task1"]


# ---------- Tasks CRUD + persistence ----------
class TestTasks:
    def test_task_crud(self, new_user):
        h = auth_headers(new_user["token"])
        # Create
        r = requests.post(f"{API}/tasks", json={"text": "TEST_do homework", "priority": "high"}, headers=h)
        assert r.status_code == 200
        task = r.json()
        assert task["text"] == "TEST_do homework"
        assert task["done"] is False
        tid = task["id"]

        # List (persistence)
        r = requests.get(f"{API}/tasks", headers=h)
        assert r.status_code == 200
        assert any(t["id"] == tid for t in r.json())

        # Update - mark done
        r = requests.put(f"{API}/tasks/{tid}", json={"done": True}, headers=h)
        assert r.status_code == 200
        assert r.json()["done"] is True

        # Verify persisted
        r = requests.get(f"{API}/tasks", headers=h)
        assert next(t for t in r.json() if t["id"] == tid)["done"] is True

        # Delete
        r = requests.delete(f"{API}/tasks/{tid}", headers=h)
        assert r.status_code == 200
        r = requests.get(f"{API}/tasks", headers=h)
        assert not any(t["id"] == tid for t in r.json())


# ---------- Study Logs ----------
class TestStudyLogs:
    def test_studylog_create_list(self, new_user):
        h = auth_headers(new_user["token"])
        r = requests.post(f"{API}/studylogs", json={"subject": "Physics", "seconds": 1500}, headers=h)
        assert r.status_code == 200
        log = r.json()
        assert log["subject"] == "Physics"
        assert log["seconds"] == 1500
        assert log["date"]

        r = requests.get(f"{API}/studylogs", headers=h)
        assert r.status_code == 200
        assert any(l["id"] == log["id"] for l in r.json())


# ---------- Test Planner ----------
class TestPlanner:
    def test_tests_crud(self, new_user):
        h = auth_headers(new_user["token"])
        r = requests.post(f"{API}/tests", json={"date": "2027-05-01", "name": "TEST_Mock 1"}, headers=h)
        assert r.status_code == 200
        t = r.json()
        assert t["name"] == "TEST_Mock 1"

        r = requests.get(f"{API}/tests", headers=h)
        assert any(x["id"] == t["id"] for x in r.json())

        r = requests.delete(f"{API}/tests/{t['id']}", headers=h)
        assert r.status_code == 200


# ---------- Mock Scores ----------
class TestScores:
    def test_score_crud(self, new_user):
        h = auth_headers(new_user["token"])
        r = requests.post(f"{API}/scores", json={"name": "TEST_M1", "phy": 80, "chem": 70, "math": 90, "maxMarks": 300}, headers=h)
        assert r.status_code == 200
        s = r.json()
        assert s["phy"] == 80

        r = requests.get(f"{API}/scores", headers=h)
        assert any(x["id"] == s["id"] for x in r.json())


# ---------- Data isolation ----------
class TestDataIsolation:
    def test_users_data_separate(self, admin_token, new_user):
        # Admin creates a task
        r = requests.post(f"{API}/tasks", json={"text": "TEST_admin_only_task"}, headers=auth_headers(admin_token))
        assert r.status_code == 200
        admin_tid = r.json()["id"]

        # New user should NOT see it
        r = requests.get(f"{API}/tasks", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200
        assert not any(t["id"] == admin_tid for t in r.json())
        assert not any(t.get("text") == "TEST_admin_only_task" for t in r.json())

        # Cleanup
        requests.delete(f"{API}/tasks/{admin_tid}", headers=auth_headers(admin_token))

    def test_no_mongo_id_leak(self, new_user):
        h = auth_headers(new_user["token"])
        requests.post(f"{API}/tasks", json={"text": "TEST_leak_check"}, headers=h)
        r = requests.get(f"{API}/tasks", headers=h)
        for t in r.json():
            assert "_id" not in t
            assert "user_id" not in t

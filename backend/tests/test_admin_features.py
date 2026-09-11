"""Tests for admin login, JSON persistence, and export endpoints."""
import os
import json
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://repo-memory.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
DATA_DIR = "/app/backend/data"


@pytest.fixture(scope="module")
def deep_token():
    r = requests.post(f"{API}/auth/login", json={"email": "deep", "password": "deep8670"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "admin"
    return body["token"]


@pytest.fixture(scope="module")
def normal_user():
    email = f"TEST_user_{int(time.time())}@example.com"
    password = "pass1234"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Test User"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "user"
    return {"email": email, "password": password, "token": body["token"], "id": body["user"]["id"]}


# ---------- Admin login (deep shortcut) ----------
def test_deep_admin_login_works(deep_token):
    assert isinstance(deep_token, str) and len(deep_token) > 20


def test_deep_admin_me(deep_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {deep_token}"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "admin"


# ---------- Export-log auth guard ----------
def test_export_log_no_auth_returns_401():
    r = requests.get(f"{API}/admin/export-log")
    assert r.status_code == 401


def test_export_log_normal_user_returns_403(normal_user):
    r = requests.get(f"{API}/admin/export-log",
                     headers={"Authorization": f"Bearer {normal_user['token']}"})
    assert r.status_code == 403


def test_export_log_admin_returns_200(deep_token):
    r = requests.get(f"{API}/admin/export-log", headers={"Authorization": f"Bearer {deep_token}"})
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body and "exports" in body and "users_count" in body
    assert isinstance(body["users_count"], int) and body["users_count"] >= 1


# ---------- Export-github validation ----------
def test_export_github_invalid_repo_format(deep_token):
    r = requests.post(f"{API}/admin/export-github",
                      headers={"Authorization": f"Bearer {deep_token}"},
                      json={"repo": "not-a-valid-repo", "pat": "ghp_" + "x" * 36})
    assert r.status_code == 400
    assert "owner/name" in r.json()["detail"].lower() or "owner/name" in r.json()["detail"]


def test_export_github_short_pat(deep_token):
    r = requests.post(f"{API}/admin/export-github",
                      headers={"Authorization": f"Bearer {deep_token}"},
                      json={"repo": "someowner/some-repo", "pat": "short"})
    assert r.status_code == 400


def test_export_github_normal_user_forbidden(normal_user):
    r = requests.post(f"{API}/admin/export-github",
                      headers={"Authorization": f"Bearer {normal_user['token']}"},
                      json={"repo": "someowner/some-repo", "pat": "ghp_" + "x" * 36})
    assert r.status_code == 403


def test_export_github_invalid_pat_returns_502(deep_token):
    """Well-formed but invalid PAT should reach GitHub and return graceful 502."""
    r = requests.post(f"{API}/admin/export-github",
                      headers={"Authorization": f"Bearer {deep_token}"},
                      json={"repo": "someowner-doesnotexist/some-repo",
                            "pat": "ghp_" + "x" * 36,
                            "summary": "test"},
                      timeout=60)
    assert r.status_code == 502, f"Expected 502, got {r.status_code}: {r.text[:200]}"
    # Ingress may replace 5xx body with HTML; hitting backend directly returns JSON detail with "Export failed"
    # so accept either JSON detail or HTML gateway body as long as status is 502.
    try:
        detail = r.json().get("detail", "")
        assert "Export failed" in detail
        assert "401" in detail or "unauthorized" in detail.lower()
    except ValueError:
        # HTML from ingress: backend still emitted 502 which is what we want to confirm
        pass


# ---------- Local JSON persistence ----------
def test_users_json_contains_registered_user(normal_user):
    path = os.path.join(DATA_DIR, "users.json")
    assert os.path.exists(path)
    with open(path) as f:
        users = json.load(f)
    match = [u for u in users if u["email"] == normal_user["email"].lower()]
    assert len(match) == 1
    assert match[0]["password_hash"].startswith("$2")


def test_login_activity_json_appended(normal_user):
    # perform login to append an event
    r = requests.post(f"{API}/auth/login",
                      json={"email": normal_user["email"], "password": normal_user["password"]})
    assert r.status_code == 200
    path = os.path.join(DATA_DIR, "login_activity.json")
    assert os.path.exists(path)
    with open(path) as f:
        events = json.load(f)
    ident = normal_user["email"].lower()
    matching = [e for e in events if e.get("identifier") == ident]
    assert any(e["event"] == "register" for e in matching)
    assert any(e["event"] == "login" and e["success"] for e in matching)

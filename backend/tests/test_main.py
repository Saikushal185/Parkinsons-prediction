from app.main import cors_origins


def test_cors_origins_include_local_development_hosts_by_default(monkeypatch):
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)

    assert cors_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_cors_origins_include_deployed_frontend_from_environment(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://pd-model-lab.vercel.app")

    assert cors_origins() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pd-model-lab.vercel.app",
    ]

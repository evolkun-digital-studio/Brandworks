"""API endpoint tests."""

from __future__ import annotations


class TestHealthEndpoint:
    """Tests for /api/v1/health."""

    def test_health_imports_cleanly(self):
        """Verify the health router can be imported."""
        from app.api.v1.health import router

        assert router is not None

    def test_health_route_exists(self):
        from app.api.v1.health import router

        routes = [r.path for r in router.routes]
        assert "/health" in routes


class TestAuthEndpoints:
    """Tests for /api/v1/auth."""

    def test_auth_router_importable(self):
        from app.api.v1.auth import router

        assert router is not None

    def test_login_route_exists(self):
        from app.api.v1.auth import router

        paths = [r.path for r in router.routes]
        assert "/auth/login" in paths

    def test_refresh_route_exists(self):
        from app.api.v1.auth import router

        paths = [r.path for r in router.routes]
        assert "/auth/refresh" in paths


class TestLeadsEndpoints:
    """Tests for /api/v1/leads."""

    def test_leads_router_importable(self):
        from app.api.v1.leads import router

        assert router is not None


class TestDepartmentsEndpoints:
    """Tests for /api/v1/departments."""

    def test_departments_router_importable(self):
        from app.api.v1.departments import router

        assert router is not None


class TestTelephonyEndpoints:
    """Tests for /api/v1/telephony."""

    def test_telephony_router_importable(self):
        from app.api.v1.telephony import router

        assert router is not None


class TestMainApp:
    """Tests for FastAPI application factory."""

    def test_app_creates_without_error(self):
        from app.main import create_app

        app = create_app()
        assert app is not None
        assert app.title == "Kinikh IVR"

    def test_exception_handlers_registered(self):
        from app.main import create_app

        app = create_app()
        # FastAPI stores exception handlers in a dict keyed by type/status code.
        assert len(app.exception_handlers) > 0

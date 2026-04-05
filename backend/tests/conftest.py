"""
Fixtures compartidas para tests del backend.
Usa SQLite async in-memory con adaptaciones para PostgreSQL types.
"""
import uuid
import sqlite3
from datetime import date, datetime, timedelta, timezone

import pytest

# Register UUID adapter for SQLite
sqlite3.register_adapter(uuid.UUID, str)

from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, String, TypeDecorator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_current_user, get_current_admin_user
from app.core.tenant import get_org_id, get_current_org


class SQLiteUUID(TypeDecorator):
    """UUID type compatible con SQLite — convierte UUID<->String."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


def _patch_metadata_for_sqlite(metadata):
    """Adapta tipos PostgreSQL-specific para SQLite."""
    from sqlalchemy import JSON
    for table in metadata.tables.values():
        for column in table.columns:
            if "UUID" in str(column.type).upper():
                column.type = SQLiteUUID()
            if "ARRAY" in str(column.type).upper():
                column.type = JSON()
            if column.server_default is not None:
                try:
                    default_text = str(column.server_default.arg)
                    if "gen_random_uuid" in default_text:
                        column.server_default = None
                except Exception:
                    pass


# ─── Test user fixtures ──────────────────────────────────────────

TEST_USER_ID = str(uuid.uuid4())
TEST_ORG_ID = str(uuid.uuid4())
TEST_USER_EMAIL = "test@st4rtup.app"

TEST_USER = {
    "user_id": TEST_USER_ID,
    "email": TEST_USER_EMAIL,
    "user_metadata": {},
    "role": "admin",
}

TEST_ORG = {
    "org_id": TEST_ORG_ID,
    "name": "Test Organization",
    "slug": "test-org",
    "plan": "growth",
    "max_users": 10,
    "max_leads": 1000,
    "is_active": True,
}


# ─── Database fixtures ───────────────────────────────────────────

@pytest.fixture
async def db_engine():
    """Crea un engine SQLite async in-memory para tests."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign key support in SQLite
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Import all models before creating tables
    import app.models  # noqa

    # Patch PostgreSQL-specific types for SQLite
    _patch_metadata_for_sqlite(Base.metadata)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    """Sesión de DB aislada para cada test."""
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(db_session):
    """Cliente HTTP async para tests de endpoints."""
    from app.main import app
    from app.models import User, UserRole
    from app.models.organization import Organization, OrgMember

    # Insert test organization
    test_org = Organization(
        id=uuid.UUID(TEST_ORG_ID),
        name="Test Organization",
        slug="test-org",
        plan="growth",
        max_users=10,
        max_leads=1000,
    )
    db_session.add(test_org)
    await db_session.flush()

    # Insert test user in DB so FK constraints (e.g. invited_by) work
    test_user_obj = User(
        id=uuid.UUID(TEST_USER_ID),
        email=TEST_USER_EMAIL,
        full_name="Test User",
        role=UserRole.ADMIN,
    )
    db_session.add(test_user_obj)
    await db_session.flush()

    # Link user to org
    db_session.add(OrgMember(
        org_id=uuid.UUID(TEST_ORG_ID),
        user_id=uuid.UUID(TEST_USER_ID),
        role="owner",
    ))
    await db_session.commit()

    async def override_get_db():
        yield db_session

    def override_get_current_user():
        return TEST_USER

    def override_get_current_admin_user():
        return TEST_USER

    def override_get_org_id():
        return TEST_ORG_ID

    def override_get_current_org():
        return TEST_ORG

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user
    app.dependency_overrides[get_org_id] = override_get_org_id
    app.dependency_overrides[get_current_org] = override_get_current_org

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Factory fixtures ────────────────────────────────────────────

@pytest.fixture
def lead_data():
    """Datos base para crear un lead."""
    return {
        "company_name": "Empresa Test S.L.",
        "company_sector": "Tecnología",
        "company_size": "50-250",
        "company_city": "Madrid",
        "company_country": "España",
        "contact_name": "Juan Pérez",
        "contact_email": "juan@empresatest.com",
        "contact_phone": "+34 600 000 000",
        "source": "website",
        "status": "new",
    }


@pytest.fixture
def visit_data():
    """Datos base para crear una visita (necesita lead_id)."""
    return {
        "visit_date": datetime.now(timezone.utc).isoformat(),
        "visit_type": "presencial",
        "duration_minutes": 60,
        "location": "Madrid - Oficina cliente",
        "result": "positive",
        "summary": "Reunión productiva sobre necesidades GRC",
    }


@pytest.fixture
def email_data():
    """Datos base para crear un email (necesita lead_id)."""
    return {
        "subject": "Propuesta St4rtup GRC",
        "to_email": "cliente@empresa.com",
        "body_html": "<p>Estimado cliente, le enviamos nuestra propuesta...</p>",
        "body_text": "Estimado cliente, le enviamos nuestra propuesta...",
        "is_follow_up": False,
    }


@pytest.fixture
def contact_data():
    """Datos base para crear un contacto (necesita lead_id)."""
    return {
        "full_name": "María García",
        "email": "maria@empresatest.com",
        "phone": "+34 600 111 222",
        "job_title": "CISO",
        "role_type": "ciso",
        "influence_level": "decision_maker",
        "relationship_status": "supporter",
        "is_primary": True,
    }


@pytest.fixture
def action_data():
    """Datos base para crear una acción (necesita lead_id)."""
    return {
        "title": "Enviar propuesta GRC",
        "description": "Preparar y enviar propuesta de servicios",
        "action_type": "follow_up",
        "priority": "high",
        "due_date": (date.today() + timedelta(days=3)).isoformat(),
        "assigned_to": "Comercial Test",
    }


@pytest.fixture
def offer_data():
    """Datos base para crear una oferta (necesita lead_id)."""
    return {
        "title": "Propuesta GRC Enterprise",
        "description": "Plataforma GRC completa con módulos ENS y NIS2",
        "items": [
            {"name": "Licencia GRC Enterprise", "quantity": 1, "unit_price": 15000},
            {"name": "Implementación", "quantity": 1, "unit_price": 5000},
        ],
        "subtotal": 20000,
        "tax_rate": 21,
        "tax_amount": 4200,
        "total": 24200,
        "currency": "EUR",
        "valid_until": (date.today() + timedelta(days=30)).isoformat(),
        "payment_terms": "30 días fecha factura",
    }


@pytest.fixture
def user_data():
    """Datos base para crear un usuario."""
    return {
        "email": "nuevo@st4rtup.app",
        "full_name": "Nuevo Usuario",
        "role": "viewer",
        "phone": "+34 600 222 333",
    }


@pytest.fixture
async def created_lead(client, lead_data):
    """Crea un lead y retorna la respuesta."""
    response = await client.post("/api/v1/leads/", json=lead_data)
    assert response.status_code == 201
    return response.json()

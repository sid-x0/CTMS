import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.session import get_db, Base
from app.main import app
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
AsyncSessionTesting = async_sessionmaker(bind=engine_test, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionTesting() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def test_admin_user() -> User:
    async with AsyncSessionTesting() as db:
        user = User(
            name="Test Admin",
            email="admin@test.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.ADMINISTRATOR.value,
            organization="AIIA Test",
            active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest_asyncio.fixture
async def test_pi_user() -> User:
    async with AsyncSessionTesting() as db:
        user = User(
            name="Test PI",
            email="pi@test.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PRINCIPAL_INVESTIGATOR.value,
            organization="AIIA Test",
            active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest_asyncio.fixture
async def test_regulator_user() -> User:
    async with AsyncSessionTesting() as db:
        user = User(
            name="Test Regulator",
            email="regulator@test.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.REGULATOR.value,
            organization="Ayush Ministry",
            active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

@pytest.fixture
def admin_headers(test_admin_user: User) -> dict:
    token = create_access_token(subject=test_admin_user.id, role=test_admin_user.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def pi_headers(test_pi_user: User) -> dict:
    token = create_access_token(subject=test_pi_user.id, role=test_pi_user.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def regulator_headers(test_regulator_user: User) -> dict:
    token = create_access_token(subject=test_regulator_user.id, role=test_regulator_user.role)
    return {"Authorization": f"Bearer {token}"}

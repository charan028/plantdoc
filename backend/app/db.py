import asyncpg
from neo4j import AsyncDriver, AsyncGraphDatabase
from app.config import Settings


class PostgresClient:
    def __init__(self, settings: Settings) -> None:
        self._dsn = settings.postgres_dsn
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._dsn:
            self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=3)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def health(self) -> bool:
        if not self._pool:
            return False
        async with self._pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return True

    async def init_chat_tables(self) -> None:
        if not self._pool:
            return
        async with self._pool.acquire() as conn:
            # Create chat_sessions table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            # Create chat_messages table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    role TEXT NOT NULL, -- 'user' or 'model'
                    content TEXT NOT NULL,
                    image_url TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)

    async def create_chat_session(self, user_id: str, title: str = "New Chat") -> str:
        if not self._pool:
             raise Exception("Database not connected")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id",
                user_id, title
            )
            return str(row["id"])

    async def add_message(self, session_id: str, role: str, content: str, image_url: str | None = None) -> str:
        if not self._pool:
             raise Exception("Database not connected")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO chat_messages (session_id, role, content, image_url)
                VALUES ($1::uuid, $2, $3, $4)
                RETURNING id
                """,
                session_id, role, content, image_url
            )
            return str(row["id"])

    async def get_chat_history(self, session_id: str) -> list[dict]:
        if not self._pool:
             return []
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, session_id, role, content, image_url, timestamp
                FROM chat_messages
                WHERE session_id = $1::uuid
                ORDER BY timestamp ASC
                """,
                session_id
            )
            return [dict(row) for row in rows]

    async def get_user_sessions(self, user_id: str) -> list[dict]:
        if not self._pool:
             return []
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, title, created_at
                FROM chat_sessions
                WHERE user_id = $1
                ORDER BY created_at DESC
                """,
                user_id
            )
            return [dict(row) for row in rows]


class Neo4jClient:
    def __init__(self, settings: Settings) -> None:
        self._uri = settings.neo4j_uri
        self._user = settings.neo4j_user
        self._password = settings.neo4j_password
        self._driver: AsyncDriver | None = None

    async def connect(self) -> None:
        if self._uri and self._user and self._password:
            self._driver = AsyncGraphDatabase.driver(self._uri, auth=(self._user, self._password))

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()

    async def health(self) -> bool:
        if not self._driver:
            return False
        async with self._driver.session() as session:
            await session.run("RETURN 1")
        return True

    async def add_plant(self, user_id: str, plant_id: str, species: str, health_status: str) -> None:
        if not self._driver:
            return
        query = (
            "MERGE (u:User {id: $user_id}) "
            "MERGE (p:Plant {id: $plant_id}) "
            "SET p.species = $species, p.health_status = $health_status "
            "MERGE (u)-[:OWNS]->(p)"
        )
        async with self._driver.session() as session:
            await session.run(
                query,
                user_id=user_id,
                plant_id=plant_id,
                species=species,
                health_status=health_status,
            )

# copied from twscrape

import asyncio
import random
import sqlite3
from collections import defaultdict

import aiosqlite

MIN_SQLITE_VERSION = "3.24"

_lock = asyncio.Lock()


def lock_retry(max_retries=10):
    # this lock decorator has double nature:
    # 1. it uses asyncio lock in same process
    # 2. it retries when db locked by other process (eg. two cli instances running)
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for i in range(max_retries):
                try:
                    async with _lock:
                        return await func(*args, **kwargs)
                except sqlite3.OperationalError as e:
                    if i == max_retries - 1 or "database is locked" not in str(e):
                        raise e

                    await asyncio.sleep(random.uniform(0.5, 1.0))

        return wrapper

    return decorator


async def get_sqlite_version():
    async with aiosqlite.connect(":memory:") as db:
        async with db.execute("SELECT SQLITE_VERSION()") as cur:
            rs = await cur.fetchone()
            return rs[0] if rs else "3.0.0"


async def check_version():
    ver = await get_sqlite_version()
    ver = ".".join(ver.split(".")[:2])

    try:
        msg = f"SQLite version '{ver}' is too old, please upgrade to {MIN_SQLITE_VERSION}+"
        if float(ver) < float(MIN_SQLITE_VERSION):
            raise SystemError(msg)
    except ValueError:
        pass


async def migrate(db: aiosqlite.Connection):
    async with db.execute("PRAGMA user_version") as cur:
        rs = await cur.fetchone()
        uv = rs[0] if rs else 0

    async def v1():
        qs = """
        CREATE TABLE IF NOT EXISTS `db_scraper_scraps` (
            `uid` text PRIMARY KEY NOT NULL,
            `saved_with_id` integer,
            `json` text NOT NULL
        );"""
        await db.execute(qs)

    migrations = {
        1: v1,
    }

    # logger.debug(f"Current migration v{uv} (latest v{len(migrations)})")
    for i in range(uv + 1, len(migrations) + 1):
        print(f"Running migration to v{i}")
        try:
            await migrations[i]()
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise e

        await db.execute(f"PRAGMA user_version = {i}")
        await db.commit()


class DB:
    _init_queries: defaultdict[str, list[str]] = defaultdict(list)
    _init_once: defaultdict[str, bool] = defaultdict(bool)

    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None

    async def __aenter__(self):
        await check_version()
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row

        if not self._init_once[self.db_path]:
            await migrate(db)
            self._init_once[self.db_path] = True

        self.conn = db
        return db

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            await self.conn.commit()
            await self.conn.close()


@lock_retry()
async def execute(db_path: str, qs: str, params: dict | None = None):
    async with DB(db_path) as db:
        await db.execute(qs, params)


@lock_retry()
async def fetchone(db_path: str, qs: str, params: dict | None = None):
    async with DB(db_path) as db:
        async with db.execute(qs, params) as cur:
            row = await cur.fetchone()
            return row


@lock_retry()
async def fetchall(db_path: str, qs: str, params: dict | None = None):
    async with DB(db_path) as db:
        async with db.execute(qs, params) as cur:
            rows = await cur.fetchall()
            return rows


@lock_retry()
async def executemany(db_path: str, qs: str, params: list[dict]):
    async with DB(db_path) as db:
        await db.executemany(qs, params)

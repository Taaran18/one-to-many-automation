import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")

connect_args = {}
using_pooler = "pooler.supabase.com" in SQLALCHEMY_DATABASE_URL or "supabase.co" in SQLALCHEMY_DATABASE_URL

if using_pooler:
    connect_args = {"sslmode": "require"}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, poolclass=NullPool)
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, pool_size=5, max_overflow=5, pool_timeout=30, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

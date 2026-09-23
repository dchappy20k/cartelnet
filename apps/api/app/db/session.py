from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.base import Base

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables in the database."""
    # Import all models so that Base.metadata has registered every table
    import app.modules.organizations.models  # noqa
    import app.modules.companies.models      # noqa
    import app.modules.tenders.models        # noqa
    import app.modules.bids.models           # noqa
    import app.modules.risk.models           # noqa
    import app.modules.investigations.models # noqa
    import app.modules.ingestion.models      # noqa

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

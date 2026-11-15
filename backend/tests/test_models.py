import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.sqlite import base as sqlite_base

from app.models.base import Base
from app.models import (
    User,
    Category,
    Supplier,
    Medicine,
    InventoryBatch,
    Customer,
    Sale,
    SaleItem,
    Attachment
)

def test_model_compilation():
    engine = create_engine("sqlite:///:memory:")
    # SQLite does not support Postgres schemas like 'public', so we create tables without schema for sqlite
    for table in Base.metadata.tables.values():
        table.schema = None
    Base.metadata.create_all(engine)
    assert True

#!/usr/bin/env python
"""Test database URL generation"""
from app.core.config import settings

print("=" * 60)
print("DATABASE URL DEBUG")
print("=" * 60)
print(f"Original DATABASE_URL: {settings.DATABASE_URL}")
print()
print(f"async_database_url: {settings.async_database_url}")
print()
print("=" * 60)

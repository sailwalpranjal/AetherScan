"""
Middleware Module
=================

Contains middleware components for request/response processing,
security, and access control.

Author: Pranjal Sailwal
"""

from .database_guard import (
    DatabaseGuard,
    DatabaseAccessViolation,
    DatabaseConnectionProxy,
    get_database_guard,
    require_db_token
)

__all__ = [
    'DatabaseGuard',
    'DatabaseAccessViolation',
    'DatabaseConnectionProxy',
    'get_database_guard',
    'require_db_token'
]

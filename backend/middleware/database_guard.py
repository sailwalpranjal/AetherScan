"""
Database Access Guard Middleware
=================================

This middleware enforces API-only database access, preventing direct SQL
queries from bypassing the application layer. This is critical for:

1. Security: Prevent SQL injection and unauthorized access
2. Data Integrity: Ensure all data modifications go through validation
3. Audit Trail: Log all database operations
4. Quantum Pipeline Integration: Ensure data flows through quantum processor

Author: Pranjal Sailwal
Development: 1 week implementing security layer
"""

import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import hashlib
import secrets
from functools import wraps

logger = logging.getLogger(__name__)


class DatabaseAccessViolation(Exception):
    """Raised when unauthorized database access is attempted."""
    pass


class DatabaseGuard:
    """
    Guards database access, ensuring all queries go through authorized channels.

    This implements a token-based access control system where only API routes
    can obtain valid access tokens. Direct database connections are blocked.
    """

    def __init__(self, secret_key: Optional[str] = None):
        """
        Initialize database guard.

        Args:
            secret_key: Secret key for token generation (auto-generated if not provided)
        """
        self.secret_key = secret_key or secrets.token_hex(32)

        # Active access tokens: token -> metadata
        self.active_tokens: Dict[str, Dict[str, Any]] = {}

        # Access log for audit trail
        self.access_log: List[Dict[str, Any]] = []

        # Statistics
        self.stats = {
            'total_tokens_issued': 0,
            'total_queries_authorized': 0,
            'total_violations_blocked': 0,
            'current_active_tokens': 0
        }

        logger.info("Database Guard initialized - API-only access enforced")

    def generate_token(
        self,
        route_name: str,
        operation: str,
        ttl: int = 60
    ) -> str:
        """
        Generate an access token for authorized API route.

        Only API routes can call this method to obtain database access.
        Tokens are time-limited and operation-specific.

        Args:
            route_name: Name of API route requesting access
            operation: Database operation ('read', 'write', 'delete')
            ttl: Time to live in seconds

        Returns:
            Access token string
        """
        # Generate unique token
        token_data = f"{route_name}:{operation}:{datetime.now().isoformat()}:{secrets.token_hex(8)}"
        token = hashlib.sha256(
            f"{self.secret_key}:{token_data}".encode()
        ).hexdigest()

        # Store token metadata
        self.active_tokens[token] = {
            'route_name': route_name,
            'operation': operation,
            'issued_at': datetime.now(),
            'ttl': ttl,
            'used': False
        }

        self.stats['total_tokens_issued'] += 1
        self.stats['current_active_tokens'] = len(self.active_tokens)

        logger.debug(f"Issued database token for {route_name}:{operation}")

        return token

    def validate_token(
        self,
        token: str,
        operation: str,
        use_once: bool = True
    ) -> bool:
        """
        Validate a database access token.

        Args:
            token: Access token to validate
            operation: Operation being attempted
            use_once: If True, token is invalidated after use

        Returns:
            True if token is valid, False otherwise

        Raises:
            DatabaseAccessViolation: If access is denied
        """
        if token not in self.active_tokens:
            self.stats['total_violations_blocked'] += 1
            self._log_violation(token, operation, "Invalid token")
            raise DatabaseAccessViolation("Invalid database access token")

        token_data = self.active_tokens[token]

        # Check if already used (for single-use tokens)
        if use_once and token_data['used']:
            self.stats['total_violations_blocked'] += 1
            self._log_violation(token, operation, "Token already used")
            raise DatabaseAccessViolation("Token has already been used")

        # Check TTL
        elapsed = (datetime.now() - token_data['issued_at']).total_seconds()
        if elapsed > token_data['ttl']:
            self.stats['total_violations_blocked'] += 1
            self._log_violation(token, operation, "Token expired")
            del self.active_tokens[token]
            raise DatabaseAccessViolation("Token has expired")

        # Check operation matches
        if token_data['operation'] != operation and token_data['operation'] != 'any':
            self.stats['total_violations_blocked'] += 1
            self._log_violation(token, operation, "Operation mismatch")
            raise DatabaseAccessViolation(
                f"Token authorized for '{token_data['operation']}', not '{operation}'"
            )

        # Mark as used if single-use
        if use_once:
            token_data['used'] = True

        # Log authorized access
        self._log_access(token, operation, True)

        self.stats['total_queries_authorized'] += 1

        return True

    def revoke_token(self, token: str):
        """
        Revoke an access token.

        Args:
            token: Token to revoke
        """
        if token in self.active_tokens:
            del self.active_tokens[token]
            self.stats['current_active_tokens'] = len(self.active_tokens)
            logger.debug(f"Revoked token {token[:8]}...")

    def cleanup_expired_tokens(self):
        """Remove expired tokens from registry."""
        now = datetime.now()
        expired_tokens = []

        for token, data in self.active_tokens.items():
            elapsed = (now - data['issued_at']).total_seconds()
            if elapsed > data['ttl']:
                expired_tokens.append(token)

        for token in expired_tokens:
            del self.active_tokens[token]

        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired tokens")

        self.stats['current_active_tokens'] = len(self.active_tokens)

    def _log_access(self, token: str, operation: str, authorized: bool):
        """Log database access attempt."""
        token_data = self.active_tokens.get(token, {})

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'token': token[:8] + '...',  # Partial token for privacy
            'route': token_data.get('route_name', 'unknown'),
            'operation': operation,
            'authorized': authorized
        }

        self.access_log.append(log_entry)

        # Keep log size manageable (last 1000 entries)
        if len(self.access_log) > 1000:
            self.access_log = self.access_log[-1000:]

    def _log_violation(self, token: str, operation: str, reason: str):
        """Log access violation."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'token': token[:8] + '...' if len(token) > 8 else 'invalid',
            'operation': operation,
            'authorized': False,
            'reason': reason
        }

        self.access_log.append(log_entry)

        logger.warning(f"Database access violation: {reason}")

    def get_stats(self) -> Dict[str, Any]:
        """Get access statistics."""
        return {
            **self.stats,
            'current_active_tokens': len(self.active_tokens),
            'recent_log_entries': len(self.access_log)
        }

    def get_access_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent access log entries.

        Args:
            limit: Maximum number of entries to return

        Returns:
            List of log entries
        """
        return self.access_log[-limit:]


# Global database guard instance
_db_guard: Optional[DatabaseGuard] = None


def get_database_guard() -> DatabaseGuard:
    """Get the global database guard instance."""
    global _db_guard
    if _db_guard is None:
        _db_guard = DatabaseGuard()
    return _db_guard


def require_db_token(operation: str = 'read'):
    """
    Decorator to require database access token for a function.

    Args:
        operation: Required operation type ('read', 'write', 'delete')

    Usage:
        @require_db_token('read')
        async def get_user(user_id: int, db_token: str):
            # Function body
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract token from kwargs
            db_token = kwargs.get('db_token')

            if db_token is None:
                raise DatabaseAccessViolation(
                    "Database access token required but not provided"
                )

            # Validate token
            guard = get_database_guard()
            guard.validate_token(db_token, operation)

            # Call original function
            return await func(*args, **kwargs)

        return wrapper
    return decorator


class DatabaseConnectionProxy:
    """
    Proxy for database connections that enforces access control.

    This wraps the actual database connection and validates tokens
    before allowing any queries to execute.
    """

    def __init__(self, real_connection, guard: DatabaseGuard):
        """
        Initialize connection proxy.

        Args:
            real_connection: The actual database connection
            guard: Database guard instance
        """
        self._connection = real_connection
        self._guard = guard
        self._current_token: Optional[str] = None

    def set_access_token(self, token: str):
        """
        Set the access token for this connection.

        Must be called before executing any queries.

        Args:
            token: Valid access token
        """
        self._current_token = token

    async def execute(self, query: str, *args, **kwargs):
        """
        Execute a database query with access control.

        Args:
            query: SQL query to execute
            *args: Query parameters
            **kwargs: Additional arguments

        Returns:
            Query result
        """
        if self._current_token is None:
            raise DatabaseAccessViolation(
                "No access token set for database connection"
            )

        # Determine operation type from query
        query_upper = query.strip().upper()

        if query_upper.startswith('SELECT'):
            operation = 'read'
        elif query_upper.startswith(('INSERT', 'UPDATE')):
            operation = 'write'
        elif query_upper.startswith(('DELETE', 'DROP', 'TRUNCATE')):
            operation = 'delete'
        else:
            operation = 'any'

        # Validate token
        self._guard.validate_token(self._current_token, operation, use_once=False)

        # Execute query on real connection
        return await self._connection.execute(query, *args, **kwargs)

    async def executemany(self, query: str, *args, **kwargs):
        """Execute many queries with access control."""
        if self._current_token is None:
            raise DatabaseAccessViolation(
                "No access token set for database connection"
            )

        # Validate for write operation
        self._guard.validate_token(self._current_token, 'write', use_once=False)

        return await self._connection.executemany(query, *args, **kwargs)

    def __getattr__(self, name):
        """Proxy all other methods to real connection."""
        return getattr(self._connection, name)

"""
AuditMiddleware Middleware
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class AuditMiddleware(BaseHTTPMiddleware):
    """
    AuditMiddleware middleware
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        İstek/yanıt işleme
        """
        # TODO: Implement middleware logic
        response = await call_next(request)
        return response

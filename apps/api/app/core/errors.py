from typing import Any, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class CartelNetException(Exception):
    """Base domain exception."""

    def __init__(self, message: str, code: str = "CARTELNET_ERROR", status_code: int = status.HTTP_400_BAD_REQUEST, details: Optional[Any] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class TenantAccessDeniedException(CartelNetException):
    def __init__(self, message: str = "Access to requested tenant resource is denied."):
        super().__init__(message, code="TENANT_ACCESS_DENIED", status_code=status.HTTP_403_FORBIDDEN)


class EntityNotFoundException(CartelNetException):
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(f"{entity_name} with ID '{entity_id}' not found.", code="ENTITY_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)


async def cartelnet_exception_handler(request: Request, exc: CartelNetException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )

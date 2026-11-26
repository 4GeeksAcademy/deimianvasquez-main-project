"""
HealthCore — Users Router
==========================
Endpoints for User CRUD.

Routes:
- ``POST /users``       — Register a new user (public).
- ``GET /users``        — List all users (protected).
- ``GET /users/{id}``   — Get user by ID (protected).
- ``PUT /users/{id}``   — Update user (protected; self or admin).
- ``DELETE /users/{id}`` — Delete user (protected; self or admin).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.deps import get_current_user
from app.users.schemas import UserCreate, UserResponse, UserUpdate
from app.users.service import (
    UserAuthorizationError,
    UserConflictError,
    create_user,
    delete_user_by_id,
    get_user_by_id,
    list_users,
    update_user,
)

router = APIRouter(tags=["Users"])


# ── Response model for paginated list ──────────────────────────────

from pydantic import BaseModel


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    skip: int
    limit: int


# ── Endpoints ──────────────────────────────────────────────────────


@router.post("", response_model=UserResponse, status_code=201)
def register_user(payload: UserCreate):
    """
    Register a new user.

    This is the **only public endpoint** under ``/users``.
    - Hashes the password before storing.
    - Creates a linked ``Profile`` automatically.
    - Default role is ``user``.

    Accepts optional ``name``, ``phone``, ``address`` to populate the
    initial profile in the same operation.
    """
    try:
        user = create_user(payload)
    except UserConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return user


@router.get("", response_model=PaginatedUsers)
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserCreate = Depends(get_current_user),  # noqa: ARG001
):
    """
    List all registered users (protected).

    Requires a valid JWT token.
    """
    items, total = list_users(skip=skip, limit=limit)
    return PaginatedUsers(items=items, total=total, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: UserCreate = Depends(get_current_user),  # noqa: ARG001
):
    """
    Get a user by their ID (protected).

    Requires a valid JWT token.
    Returns 404 if the user does not exist.
    """
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user_by_id(
    user_id: int,
    payload: UserUpdate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Update a user's credential fields (protected).

    - A user can update their own record.
    - An admin can update any record.
    - Only an admin can change the ``role`` field.

    Returns 403 if the caller lacks permission.
    Returns 404 if the target user does not exist.
    """
    try:
        updated = update_user(
            user_id=user_id,
            data=payload,
            current_user_id=current_user.id,
            current_user_role=current_user.role,
        )
    except UserAuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except UserConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated


@router.delete("/{user_id}", status_code=204)
def delete_user_by_id_endpoint(
    user_id: int,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Delete a user and their linked profile (protected).

    - A user can delete their own record.
    - An admin can delete any record.

    Returns 403 if the caller lacks permission.
    Returns 404 if the target user does not exist.
    """
    try:
        deleted = delete_user_by_id(
            user_id=user_id,
            current_user_id=current_user.id,
            current_user_role=current_user.role,
        )
    except UserAuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None
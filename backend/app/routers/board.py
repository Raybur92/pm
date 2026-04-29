from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Board, Card, KanbanColumn, get_session
from app.utils.auth import require_auth
from app.utils.board import (
    create_card,
    delete_card,
    get_board_for_user,
    move_card,
    rename_column,
    update_card,
)

router = APIRouter(prefix="/api/board", tags=["board"])


# --- Response schemas ---

class CardOut(BaseModel):
    id: int
    column_id: int
    title: str
    details: str
    position: int

    model_config = {"from_attributes": True}


class ColumnOut(BaseModel):
    id: int
    title: str
    position: int
    cards: list[CardOut]

    model_config = {"from_attributes": True}


class BoardOut(BaseModel):
    id: int
    title: str
    columns: list[ColumnOut]

    model_config = {"from_attributes": True}


# --- Request schemas ---

class RenameColumnRequest(BaseModel):
    title: str


class CreateCardRequest(BaseModel):
    title: str
    details: str = ""


class UpdateCardRequest(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None


class MoveCardRequest(BaseModel):
    column_id: int
    position: int


# --- Routes ---

@router.get("", response_model=BoardOut)
def get_board(
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    return BoardOut(
        id=board.id,
        title=board.title,
        columns=[
            ColumnOut(
                id=col.id,
                title=col.title,
                position=col.position,
                cards=[CardOut.model_validate(c) for c in col.cards],
            )
            for col in board.columns
        ],
    )


@router.post("/columns/{column_id}/rename", response_model=ColumnOut)
def rename_column_route(
    column_id: int,
    body: RenameColumnRequest,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    col = rename_column(session, column_id, body.title, board.id)
    return ColumnOut(
        id=col.id,
        title=col.title,
        position=col.position,
        cards=[CardOut.model_validate(c) for c in col.cards],
    )


@router.post("/columns/{column_id}/cards", response_model=CardOut, status_code=201)
def create_card_route(
    column_id: int,
    body: CreateCardRequest,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    card = create_card(session, column_id, body.title, body.details, board.id)
    return CardOut.model_validate(card)


@router.put("/cards/{card_id}", response_model=CardOut)
def update_card_route(
    card_id: int,
    body: UpdateCardRequest,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    card = update_card(session, card_id, board.id, body.title, body.details)
    return CardOut.model_validate(card)


@router.delete("/cards/{card_id}", status_code=204)
def delete_card_route(
    card_id: int,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    delete_card(session, card_id, board.id)


@router.post("/cards/{card_id}/move", response_model=CardOut)
def move_card_route(
    card_id: int,
    body: MoveCardRequest,
    user_id: int = Depends(require_auth),
    session: Session = Depends(get_session),
):
    board = get_board_for_user(session, user_id)
    card = move_card(session, card_id, body.column_id, body.position, board.id)
    return CardOut.model_validate(card)

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.database import Board, Card, KanbanColumn


def get_board_for_user(session: Session, user_id: int) -> Board:
    board = session.scalar(select(Board).where(Board.user_id == user_id))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


def _get_column(session: Session, column_id: int, board_id: int) -> KanbanColumn:
    col = session.get(KanbanColumn, column_id)
    if not col or col.board_id != board_id:
        raise HTTPException(status_code=404, detail="Column not found")
    return col


def _get_card(session: Session, card_id: int, board_id: int) -> Card:
    card = session.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    col = session.get(KanbanColumn, card.column_id)
    if not col or col.board_id != board_id:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def rename_column(session: Session, column_id: int, title: str, board_id: int) -> KanbanColumn:
    col = _get_column(session, column_id, board_id)
    col.title = title
    session.commit()
    session.refresh(col)
    return col


def create_card(session: Session, column_id: int, title: str, details: str, board_id: int) -> Card:
    _get_column(session, column_id, board_id)
    count = session.scalar(select(func.count()).select_from(Card).where(Card.column_id == column_id))
    card = Card(column_id=column_id, title=title, details=details or "", position=count)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def update_card(
    session: Session,
    card_id: int,
    board_id: int,
    title: Optional[str],
    details: Optional[str],
) -> Card:
    card = _get_card(session, card_id, board_id)
    if title is not None:
        card.title = title
    if details is not None:
        card.details = details
    session.commit()
    session.refresh(card)
    return card


def delete_card(session: Session, card_id: int, board_id: int) -> None:
    card = _get_card(session, card_id, board_id)
    old_position = card.position
    old_column_id = card.column_id
    session.delete(card)
    session.flush()
    session.execute(
        update(Card)
        .where(Card.column_id == old_column_id, Card.position > old_position)
        .values(position=Card.position - 1)
    )
    session.commit()


def move_card(
    session: Session,
    card_id: int,
    target_column_id: int,
    target_position: int,
    board_id: int,
) -> Card:
    card = _get_card(session, card_id, board_id)
    _get_column(session, target_column_id, board_id)

    src_col_id = card.column_id
    src_pos = card.position

    if src_col_id == target_column_id:
        if src_pos == target_position:
            return card
        if src_pos < target_position:
            session.execute(
                update(Card)
                .where(Card.column_id == src_col_id, Card.position > src_pos, Card.position <= target_position)
                .values(position=Card.position - 1)
            )
        else:
            session.execute(
                update(Card)
                .where(Card.column_id == src_col_id, Card.position >= target_position, Card.position < src_pos)
                .values(position=Card.position + 1)
            )
        card.position = target_position
    else:
        session.execute(
            update(Card)
            .where(Card.column_id == src_col_id, Card.position > src_pos)
            .values(position=Card.position - 1)
        )
        target_count = session.scalar(select(func.count()).select_from(Card).where(Card.column_id == target_column_id))
        target_position = min(target_position, target_count)
        session.execute(
            update(Card)
            .where(Card.column_id == target_column_id, Card.position >= target_position)
            .values(position=Card.position + 1)
        )
        card.column_id = target_column_id
        card.position = target_position

    session.commit()
    session.refresh(card)
    return card

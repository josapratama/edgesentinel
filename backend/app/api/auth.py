import hmac
import hashlib
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db, AsyncSessionLocal
from app.models.entities import SettingItem
from app.models.schemas import PinVerifyPayload, PinChangePayload

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEFAULT_PIN = "123456"
SESSION_SECRET = "edgesentinel_secret_auth_token"


async def get_current_pin(db: AsyncSession) -> str:
    stmt = select(SettingItem).where(SettingItem.key == "admin_pin")
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    return item.value if item else DEFAULT_PIN


def generate_auth_token(pin: str) -> str:
    return hashlib.sha256(f"{pin}_{SESSION_SECRET}_{time.strftime('%Y%m')}".encode()).hexdigest()[:32]


@router.get("/status")
async def get_auth_status(db: AsyncSession = Depends(get_db)):
    pin = await get_current_pin(db)
    return {
        "pin_required": True,
        "default_pin_active": pin == DEFAULT_PIN
    }


@router.post("/verify")
async def verify_pin(payload: PinVerifyPayload, db: AsyncSession = Depends(get_db)):
    current_pin = await get_current_pin(db)
    if payload.pin.strip() != current_pin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN Keamanan Salah!"
        )

    token = generate_auth_token(current_pin)
    return {
        "authenticated": True,
        "token": token,
        "message": "PIN Berhasil Diverifikasi."
    }


@router.post("/change-pin")
async def change_pin(payload: PinChangePayload, db: AsyncSession = Depends(get_db)):
    current_pin = await get_current_pin(db)
    if payload.old_pin.strip() != current_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN Lama tidak cocok."
        )

    new_pin = payload.new_pin.strip()
    if len(new_pin) < 4 or len(new_pin) > 8 or not new_pin.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN Baru harus berupa 4 - 8 angka."
        )

    stmt = select(SettingItem).where(SettingItem.key == "admin_pin")
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if item:
        item.value = new_pin
    else:
        db.add(SettingItem(key="admin_pin", value=new_pin))

    await db.commit()
    new_token = generate_auth_token(new_pin)
    return {
        "success": True,
        "token": new_token,
        "message": "PIN Keamanan berhasil diperbarui!"
    }

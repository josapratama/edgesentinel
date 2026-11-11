import os
import json
import uuid
import shutil
import logging
import cv2
import numpy as np
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings, SNAPSHOTS_DIR
from app.core.database import get_db
from app.models.entities import KnownFace
from app.models.schemas import KnownFaceResponse
from app.services.face_service import face_service

logger = logging.getLogger("edgesentinel.faces")
router = APIRouter(prefix="/faces", tags=["Face Recognition"])

FACES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "faces"
FACES_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=list[KnownFaceResponse])
async def list_faces(db: AsyncSession = Depends(get_db)):
    stmt = select(KnownFace).order_by(KnownFace.created_at.desc())
    res = await db.execute(stmt)
    faces = res.scalars().all()
    public_base = settings.PUBLIC_URL.rstrip("/")
    return [
        KnownFaceResponse(
            id=f.id,
            name=f.name,
            relation=f.relation,
            photo_url=f"{public_base}/snapshots/{f.photo_filename}",
            created_at=f.created_at
        )
        for f in faces
    ]


@router.post("", response_model=KnownFaceResponse, status_code=status.HTTP_201_CREATED)
async def register_face(
    name: str = Form(...),
    relation: str = Form("Keluarga"),
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Nama tidak boleh kosong.")

    # Read uploaded image bytes
    contents = await photo.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Format gambar tidak valid.")

    # Extract face and descriptor
    face_norm = face_service.extract_face(img)
    if face_norm is None:
        raise HTTPException(status_code=400, detail="Tidak dapat menemukan wajah yang jelas pada foto. Pastikan wajah menghadap ke kamera dengan pencahayaan cukup.")

    descriptor = face_service.compute_descriptor(face_norm)

    # Save photo to snapshots directory so it can be served publicly
    face_id = str(uuid.uuid4())
    filename = f"face_{face_id[:8]}.jpg"
    photo_path = SNAPSHOTS_DIR / filename
    cv2.imwrite(str(photo_path), img)

    known_face = KnownFace(
        id=face_id,
        name=name.strip(),
        relation=relation.strip(),
        photo_filename=filename,
        features_json=json.dumps(descriptor)
    )
    db.add(known_face)
    await db.commit()
    await db.refresh(known_face)

    public_base = settings.PUBLIC_URL.rstrip("/")
    return KnownFaceResponse(
        id=known_face.id,
        name=known_face.name,
        relation=known_face.relation,
        photo_url=f"{public_base}/snapshots/{known_face.photo_filename}",
        created_at=known_face.created_at
    )


@router.delete("/{face_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_face(face_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(KnownFace).where(KnownFace.id == face_id)
    res = await db.execute(stmt)
    face = res.scalar_one_or_none()
    if not face:
        raise HTTPException(status_code=404, detail="Wajah tidak ditemukan.")

    # Remove photo if exists
    p = SNAPSHOTS_DIR / face.photo_filename
    if p.exists():
        try:
            p.unlink()
        except Exception:
            pass

    await db.delete(face)
    await db.commit()
    return None

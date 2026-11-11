from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.entities import AlertRule
from app.models.schemas import AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse

router = APIRouter(prefix="/rules", tags=["Alert Rules"])


@router.get("", response_model=list[AlertRuleResponse])
async def list_alert_rules(db: AsyncSession = Depends(get_db)):
    stmt = select(AlertRule).order_by(desc(AlertRule.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(payload: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = AlertRule(
        name=payload.name,
        camera_id=payload.camera_id,
        object_classes=payload.object_classes.lower(),
        min_confidence=payload.min_confidence,
        start_hour=payload.start_hour,
        end_hour=payload.end_hour,
        whatsapp_number=payload.whatsapp_number,
        cooldown_seconds=payload.cooldown_seconds,
        webhook_url=payload.webhook_url,
        is_active=payload.is_active
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(rule_id: str, payload: AlertRuleUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(AlertRule).where(AlertRule.id == rule_id)
    res = await db.execute(stmt)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "object_classes" in update_data and update_data["object_classes"]:
        update_data["object_classes"] = update_data["object_classes"].lower()

    for k, v in update_data.items():
        setattr(rule, k, v)

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(rule_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(AlertRule).where(AlertRule.id == rule_id)
    res = await db.execute(stmt)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    await db.delete(rule)
    await db.commit()
    return None


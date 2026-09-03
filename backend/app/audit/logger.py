import json
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.audit import AuditLog

# Process-level lock to ensure strict sequential hash chaining under concurrent requests
_audit_lock = asyncio.Lock()


def _serialize(obj: Any) -> str:
    if obj is None:
        return ""
    if isinstance(obj, (dict, list)):
        return json.dumps(obj, default=str)
    if hasattr(obj, "__dict__"):
        d = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return json.dumps(d, default=str)
    return str(obj)


def _compute_hash(payload: dict, previous_hash: Optional[str]) -> str:
    """
    Compute SHA-256 hash of the current audit record payload concatenated with
    the previous record's hash. This creates a tamper-evident hash chain.
    Note: This is tamper-evident (hash chain), NOT cryptographically signed.
    """
    chain_input = json.dumps(payload, default=str, sort_keys=True) + (previous_hash or "GENESIS")
    return hashlib.sha256(chain_input.encode("utf-8")).hexdigest()


def _normalize_timestamp(ts) -> Optional[str]:
    """
    Normalize a datetime to a consistent string for hashing.
    Strips timezone info and returns UTC ISO format.
    This ensures consistency between creation time and verification time
    regardless of SQLite/PostgreSQL datetime handling.
    """
    if ts is None:
        return None
    if hasattr(ts, "replace"):
        # Strip timezone info to get consistent naive UTC string
        return ts.replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S.%f")
    return str(ts)


async def _get_latest_record_hash(db: AsyncSession) -> Optional[str]:
    """Fetch the record_hash of the most recent audit log entry."""
    result = await db.execute(
        select(AuditLog.record_hash).order_by(AuditLog.id.desc()).limit(1)
    )
    row = result.scalar_one_or_none()
    return row


async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    description: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    previous_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Append-only audit logger for CTMS compliance and traceability.
    Implements SHA-256 hash chaining for tamper-evidence.
    This does NOT constitute a legally immutable audit trail.
    """
    async with _audit_lock:
        ts = datetime.now(timezone.utc)

        prev_val_str = _serialize(previous_value) if previous_value is not None else None
        new_val_str = _serialize(new_value) if new_value is not None else None

        # Fetch the previous hash to build the chain
        prev_hash = await _get_latest_record_hash(db)

        # Compute hash of this record's payload
        payload_for_hash = {
            "timestamp": _normalize_timestamp(ts),
            "user_id": user_id,
            "user_email": user_email,
            "user_role": user_role,
            "action": action.upper(),
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id is not None else None,
            "previous_value": prev_val_str,
            "new_value": new_val_str,
            "description": description,
        }
        record_hash = _compute_hash(payload_for_hash, prev_hash)

        audit_entry = AuditLog(
            timestamp=ts,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            action=action.upper(),
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            previous_value=prev_val_str,
            new_value=new_val_str,
            ip_address=ip_address,
            description=description,
            previous_hash=prev_hash,
            record_hash=record_hash
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry


async def verify_audit_chain(db: AsyncSession) -> dict:
    """
    Walk through all audit log entries in insertion order and verify
    that each record's hash is consistent with its stored payload and
    the previous record's hash.

    Returns a dict with:
        - valid: bool
        - total_records: int
        - first_invalid_id: int | None
        - message: str
    """
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.id.asc())
    )
    records = result.scalars().all()

    if not records:
        return {"valid": True, "total_records": 0, "first_invalid_id": None,
                "message": "No audit records. Chain is trivially valid."}

    prev_hash = None
    for record in records:
        payload_for_hash = {
            "timestamp": _normalize_timestamp(record.timestamp),
            "user_id": record.user_id,
            "user_email": record.user_email,
            "user_role": record.user_role,
            "action": record.action,
            "entity_type": record.entity_type,
            "entity_id": record.entity_id,
            "previous_value": record.previous_value,
            "new_value": record.new_value,
            "description": record.description,
        }
        expected_hash = _compute_hash(payload_for_hash, prev_hash)

        # Records created before hash-chaining was added will have NULL record_hash
        if record.record_hash is None:
            # Accept as legacy, skip validation for this entry
            prev_hash = record.record_hash
            continue

        if record.record_hash != expected_hash:
            return {
                "valid": False,
                "total_records": len(records),
                "first_invalid_id": record.id,
                "message": f"Hash mismatch at record id={record.id}. Possible tampering detected."
            }

        if record.previous_hash != prev_hash:
            return {
                "valid": False,
                "total_records": len(records),
                "first_invalid_id": record.id,
                "message": f"Chain break at record id={record.id}. Previous hash does not match."
            }

        prev_hash = record.record_hash

    return {
        "valid": True,
        "total_records": len(records),
        "first_invalid_id": None,
        "message": f"Chain valid. {len(records)} records verified. No tampering detected."
    }

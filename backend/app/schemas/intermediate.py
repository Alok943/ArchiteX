from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


# ─────────────────────────────────────────
# STAGE 1 — Intent Extraction Output
# ─────────────────────────────────────────

class AccessRule(BaseModel):
    feature: str                        # e.g. "analytics"
    allowed_roles: list[str]            # e.g. ["admin"]


class IntentOutput(BaseModel):
    entities: list[str]                 # e.g. ["User", "Contact", "Payment"]
    roles: list[str]                    # e.g. ["admin", "user"]
    features: list[str]                 # e.g. ["auth", "dashboard", "payments"]
    access_rules: list[AccessRule]      # who can access what
    assumptions: list[str]              # e.g. ["UUID primary keys", "JWT auth"]
    clarification_needed: bool = False  # True if prompt is too vague
    clarification_questions: list[str] = []  # populated if above is True


# ─────────────────────────────────────────
# STAGE 2 — System Design Output
# ─────────────────────────────────────────

class APIGroup(BaseModel):
    name: str                           # e.g. "auth"
    endpoints: list[str]                # e.g. ["/api/login", "/api/logout"]


class DBTableDesign(BaseModel):
    name: str                           # e.g. "users"
    relates_to: list[str] = []          # e.g. ["roles", "contacts"]


class DesignOutput(BaseModel):
    pages: list[str]                    # e.g. ["login", "dashboard", "contacts"]
    api_groups: list[APIGroup]
    db_tables: list[DBTableDesign]
    flows: list[str]                    # e.g. ["login_flow", "contact_crud"]
    premium_gated: list[str] = []       # pages/features behind paywall
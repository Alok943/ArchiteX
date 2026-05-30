import logging
from app.schemas.output import AppConfig
from app.schemas.intermediate import IntentOutput

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# Intent-awareness helpers
# These control which validators run based on what was actually requested.
# ─────────────────────────────────────────

def _wants(intent: IntentOutput, keywords: list[str]) -> bool:
    """Return True if ANY of the keywords appear in ANY intent feature."""
    features_text = " ".join(intent.features).lower()
    return any(kw in features_text for kw in keywords)


def _stems(word: str) -> list[str]:
    """Return the word plus stemmed variants for fuzzy matching."""
    w = word.lower().strip()
    stems = [w]
    for suffix in ["ment", "tion", "ing", "ness", "ity", "able", "ible", "ed", "er", "es", "s"]:
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            stems.append(w[: -len(suffix)])
    return stems


# ─────────────────────────────────────────
# CONDITION 1 — Feature Coverage
# ─────────────────────────────────────────

def validate_feature_coverage(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Condition 1: Feature requested in intent but missing from generated schema.

    Uses keyword-based matching: splits multi-word features into individual
    keywords and checks if ALL keywords (or their stems) appear in the schema.
    e.g. 'appointment management' → checks 'appointment' AND 'manag' independently.
    """
    errors = []
    schema_text = str(config.model_dump()).lower()

    for feature in intent.features:
        keywords = feature.lower().split()

        if len(keywords) <= 1:
            found = any(stem in schema_text for stem in _stems(feature.lower()))
        else:
            found = all(
                any(stem in schema_text for stem in _stems(kw))
                for kw in keywords
            )

        if not found:
            errors.append({
                "rule": "FEATURE_COVERAGE",
                "layer": "global",
                "message": f"Feature '{feature}' requested but not implemented",
                "field": feature,
            })

    if errors:
        logger.warning(f"Feature coverage: {len(errors)} missing feature(s)")
    return errors


# ─────────────────────────────────────────
# CONDITION 2 & 3 — Entity Coverage
# Only runs for entities that were explicitly requested in the intent.
# ─────────────────────────────────────────

def validate_entity_coverage(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Conditions 2 & 3: DB entity exists but has no API or no UI.

    Intent-aware: skips internal/junction tables (e.g. migrations, sessions)
    that are not explicitly mentioned in the user's intent.
    """
    errors = []

    # Build a set of entity names the user actually requested
    intent_text = " ".join(intent.entities + intent.features).lower()
    api_text = str(config.api_schema).lower()
    ui_text = str(config.ui_schema).lower()

    # Internal/system tables that should not require a UI/API
    SYSTEM_TABLES = {"sessions", "migrations", "logs", "audit_logs", "tokens", "refresh_tokens"}

    for table in config.db_schema:
        table_name = table.name.lower()

        # Skip system/internal tables
        if table_name in SYSTEM_TABLES:
            continue

        # Only validate tables that are referenced in the intent
        table_stems = _stems(table_name)
        is_requested = any(stem in intent_text for stem in table_stems)
        if not is_requested:
            logger.debug(f"Skipping entity coverage for '{table_name}' (not in intent)")
            continue

        if table_name not in api_text:
            errors.append({
                "rule": "ENTITY_API_MISSING",
                "layer": "api",
                "message": f"'{table_name}' exists in DB but has no API endpoint",
                "field": table_name,
            })

        if table_name not in ui_text:
            errors.append({
                "rule": "ENTITY_UI_MISSING",
                "layer": "ui",
                "message": f"'{table_name}' exists in DB but has no UI page",
                "field": table_name,
            })

    if errors:
        logger.warning(f"Entity coverage: {len(errors)} gap(s)")
    return errors


# ─────────────────────────────────────────
# CONDITION 4 — CRUD Completeness
# Only checks entities explicitly requested in intent.
# Read-only entities (reports, audit logs) skip DELETE/POST.
# ─────────────────────────────────────────

def validate_crud_completeness(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Condition 4: DB entity exists but is missing CRUD methods.

    Intent-aware: only checks entities the user explicitly mentioned.
    Skips read-only entities (analytics, reports, audit).
    """
    errors = []
    intent_text = " ".join(intent.entities + intent.features).lower()

    # Entities that are naturally read-only — don't need full CRUD
    READ_ONLY_PATTERNS = ["report", "analytic", "audit", "log", "metric", "stat", "history"]
    SYSTEM_TABLES = {"sessions", "migrations", "logs", "audit_logs", "tokens", "refresh_tokens"}

    for table in config.db_schema:
        table_name = table.name.lower()

        if table_name in SYSTEM_TABLES:
            continue

        # Only check entities referenced in the intent
        table_stems = _stems(table_name)
        is_requested = any(stem in intent_text for stem in table_stems)
        if not is_requested:
            continue

        # Read-only tables only need GET
        is_read_only = any(pat in table_name for pat in READ_ONLY_PATTERNS)
        required = {"GET"} if is_read_only else {"GET", "POST", "PUT", "DELETE"}

        methods_found = set()
        for endpoint in config.api_schema:
            if table_name in endpoint.path.lower():
                methods_found.add(endpoint.method)

        missing = required - methods_found
        if missing:
            errors.append({
                "rule": "CRUD_MISSING",
                "layer": "api",
                "message": f"Table '{table_name}' missing CRUD methods: {', '.join(sorted(missing))}",
                "field": table_name,
            })

    if errors:
        logger.warning(f"CRUD completeness: {len(errors)} incomplete entit(ies)")
    return errors


# ─────────────────────────────────────────
# CONDITION 5 — FK References
# Always runs — structural integrity, no intent dependency.
# ─────────────────────────────────────────

def validate_fk_references(
    config: AppConfig,
) -> list[dict]:
    """Condition 5: Foreign key references a table that doesn't exist."""
    errors = []
    table_names = {t.name.lower() for t in config.db_schema}
    field_refs = {
        f"{t.name.lower()}.{f.name.lower()}"
        for t in config.db_schema
        for f in t.fields
    }

    for table in config.db_schema:
        for field in table.fields:
            if field.is_fk:
                ref_table = field.is_fk.split(".")[0].lower()
                ref_full = field.is_fk.lower()

                if ref_table not in table_names:
                    errors.append({
                        "rule": "FK_REFERENCE_INVALID",
                        "layer": "db",
                        "message": f"FK '{table.name}.{field.name}' references '{field.is_fk}' but table '{ref_table}' does not exist",
                        "field": f"{table.name}.{field.name}",
                    })
                elif ref_full not in field_refs:
                    errors.append({
                        "rule": "FK_REFERENCE_INVALID",
                        "layer": "db",
                        "message": f"FK '{table.name}.{field.name}' references '{field.is_fk}' but that field does not exist",
                        "field": f"{table.name}.{field.name}",
                    })

    if errors:
        logger.warning(f"FK references: {len(errors)} broken FK(s)")
    return errors


# ─────────────────────────────────────────
# CONDITION 10 — Premium Gating
# Only runs if premium/subscription explicitly requested.
# ─────────────────────────────────────────

def validate_premium_gating(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Condition 10: Premium features requested but no gating in auth_rules."""
    PREMIUM_KW = ["premium", "paid", "subscription", "pro", "payment", "plan"]
    if not _wants(intent, PREMIUM_KW):
        return []

    auth_roles = [rule.role.lower() for rule in config.auth_rules]
    has_gating = any(kw in role for role in auth_roles for kw in PREMIUM_KW)

    if not has_gating:
        logger.warning("Premium gating: missing premium role")
        return [{
            "rule": "PREMIUM_GATING_MISSING",
            "layer": "auth",
            "message": "Premium features requested but no premium role/gating found in auth_rules",
            "field": "auth_rules",
        }]
    return []


# ─────────────────────────────────────────
# CONDITION 11 — Analytics
# Only runs if analytics/dashboard explicitly requested.
# ─────────────────────────────────────────

def validate_analytics(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Condition 11: Analytics/dashboard requested but no chart components found."""
    ANALYTICS_KW = ["analytics", "metrics", "reports", "stats", "reporting"]
    # "dashboard" alone is too generic — only trigger if combined with data terms
    if not _wants(intent, ANALYTICS_KW):
        return []

    has_chart = any(
        comp.type == "chart"
        for page in config.ui_schema
        for comp in page.components
    )

    if not has_chart:
        logger.warning("Analytics: no chart components found")
        return [{
            "rule": "ANALYTICS_INCOMPLETE",
            "layer": "ui",
            "message": "Analytics/metrics requested but no chart components found in UI",
            "field": "ui_schema",
        }]
    return []


# ─────────────────────────────────────────
# CONDITION 12 — Auth Completeness
# Only runs if login/register/auth explicitly requested.
# ─────────────────────────────────────────

def validate_auth_completeness(
    config: AppConfig,
    intent: IntentOutput,
) -> list[dict]:
    """Condition 12: Login/registration requested but auth endpoints or pages missing."""
    errors = []
    features_lower = [f.lower() for f in intent.features]

    wants_login = any(kw in fl for fl in features_lower for kw in ["login", "sign-in", "signin", "auth"])
    wants_register = any(kw in fl for fl in features_lower for kw in ["register", "signup", "sign-up", "registration"])

    # "auth" alone implies both
    if any("auth" in fl for fl in features_lower):
        wants_login = True
        wants_register = True

    if not wants_login and not wants_register:
        return []

    api_paths = [ep.path.lower() for ep in config.api_schema]
    page_names = [p.name.lower() for p in config.ui_schema]
    page_routes = [p.route.lower() for p in config.ui_schema]

    if wants_login:
        if not any("login" in p or "signin" in p for p in api_paths):
            errors.append({
                "rule": "AUTH_INCOMPLETE",
                "layer": "api",
                "message": "Login requested but no login endpoint found (expected /api/auth/login or similar)",
                "field": "api_schema",
            })
        if not any("login" in n or "signin" in n for n in page_names + page_routes):
            errors.append({
                "rule": "AUTH_INCOMPLETE",
                "layer": "ui",
                "message": "Login requested but no login page found",
                "field": "ui_schema",
            })

    if wants_register:
        if not any("register" in p or "signup" in p for p in api_paths):
            errors.append({
                "rule": "AUTH_INCOMPLETE",
                "layer": "api",
                "message": "Registration requested but no register/signup endpoint found",
                "field": "api_schema",
            })
        if not any("register" in n or "signup" in n for n in page_names + page_routes):
            errors.append({
                "rule": "AUTH_INCOMPLETE",
                "layer": "ui",
                "message": "Registration requested but no register/signup page found",
                "field": "ui_schema",
            })

    if not config.auth_rules:
        errors.append({
            "rule": "AUTH_INCOMPLETE",
            "layer": "auth",
            "message": "Auth features requested but auth_rules is empty",
            "field": "auth_rules",
        })

    if errors:
        logger.warning(f"Auth completeness: {len(errors)} missing auth component(s)")
    return errors
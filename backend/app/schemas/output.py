from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, model_validator


# ─────────────────────────────────────────
# DATABASE LAYER
# ─────────────────────────────────────────

class DBField(BaseModel):
    name: str
    type: Literal["string", "uuid", "int", "bool", "timestamp", "text", "float"]
    nullable: bool = False
    is_pk: bool = False
    is_fk: Optional[str] = None  # format: "table.field" e.g. "roles.id"


class DBTable(BaseModel):
    name: str
    fields: list[DBField]

    @model_validator(mode="after")
    def must_have_primary_key(self) -> DBTable:
        pks = [f for f in self.fields if f.is_pk]
        if not pks:
            raise ValueError(f"Table '{self.name}' must have at least one primary key field.")
        return self


# ─────────────────────────────────────────
# API LAYER
# ─────────────────────────────────────────

class APIEndpoint(BaseModel):
    path: str                                    # e.g. "/api/contacts"
    method: Literal["GET", "POST", "PUT", "DELETE"]
    auth_required: bool
    roles: list[str]                             # e.g. ["admin", "user"]
    request_fields: list[str]                    # e.g. ["users.email", "users.name"]
    response_fields: list[str]                   # e.g. ["contacts.id", "contacts.name"]
    description: str = ""


# ─────────────────────────────────────────
# UI LAYER
# ─────────────────────────────────────────

class UIComponent(BaseModel):
    id: str                                      # e.g. "contacts_table"
    type: Literal["form", "table", "chart", "card", "navbar", "modal"]
    bound_api: str                               # must match an APIEndpoint.path
    fields: list[str]                            # fields rendered in this component
    label: str = ""


class UIPage(BaseModel):
    name: str                                    # e.g. "contacts"
    route: str                                   # e.g. "/contacts"
    roles: list[str]                             # who can access this page
    components: list[UIComponent]


# ─────────────────────────────────────────
# AUTH LAYER
# ─────────────────────────────────────────

class AuthRule(BaseModel):
    role: str                                    # e.g. "admin"
    allowed_pages: list[str]                     # must match UIPage.name values
    allowed_endpoints: list[str]                 # must match APIEndpoint.path values


# ─────────────────────────────────────────
# ROOT CONFIG
# ─────────────────────────────────────────

class ValidationError(BaseModel):
    rule: str                                    # e.g. "R1", "R2"
    layer: Literal["db", "api", "ui", "auth"]
    message: str
    field: Optional[str] = None                  # specific broken field/reference


class AppConfig(BaseModel):
    app_name: str
    db_schema: list[DBTable]
    api_schema: list[APIEndpoint]
    ui_schema: list[UIPage]
    auth_rules: list[AuthRule]
    assumptions: list[str]                       # documented defaults made by the system
    validation_errors: list[ValidationError] = []  # populated if repair fails after 3 retries
    retry_count: int = 0                         # how many repair iterations were needed

    # ── Cross-layer validators ──────────────────

    @model_validator(mode="after")
    def api_fields_exist_in_db(self) -> AppConfig:
        """R1: Every API request/response field must reference a real DB table.field"""
        all_db_fields = {
            f"{table.name}.{field.name}"
            for table in self.db_schema
            for field in table.fields
        }
        for endpoint in self.api_schema:
            for ref in endpoint.request_fields + endpoint.response_fields:
                if ref not in all_db_fields:
                    raise ValueError(
                        f"R1 violation: API '{endpoint.path}' references '{ref}' "
                        f"which does not exist in DB schema."
                    )
        return self

    @model_validator(mode="after")
    def ui_bound_apis_exist(self) -> AppConfig:
        """R2: Every UIComponent.bound_api must reference a real APIEndpoint.path"""
        api_paths = {ep.path for ep in self.api_schema}
        for page in self.ui_schema:
            for component in page.components:
                if component.bound_api not in api_paths:
                    raise ValueError(
                        f"R2 violation: Component '{component.id}' on page '{page.name}' "
                        f"references unknown API '{component.bound_api}'."
                    )
        return self

    @model_validator(mode="after")
    def auth_pages_exist(self) -> AppConfig:
        """R3: Every AuthRule.allowed_page must reference a real UIPage.name"""
        page_names = {page.name for page in self.ui_schema}
        for rule in self.auth_rules:
            for page in rule.allowed_pages:
                if page not in page_names:
                    raise ValueError(
                        f"R3 violation: Auth rule for role '{rule.role}' "
                        f"references unknown page '{page}'."
                    )
        return self

    @model_validator(mode="after")
    def auth_endpoints_exist(self) -> AppConfig:
        """R4: Every AuthRule.allowed_endpoint must reference a real APIEndpoint.path"""
        api_paths = {ep.path for ep in self.api_schema}
        for rule in self.auth_rules:
            for endpoint in rule.allowed_endpoints:
                if endpoint not in api_paths:
                    raise ValueError(
                        f"R4 violation: Auth rule for role '{rule.role}' "
                        f"references unknown endpoint '{endpoint}'."
                    )
        return self

    @model_validator(mode="after")
    def roles_are_consistent(self) -> AppConfig:
        """R5: Roles used in API endpoints must be defined in AuthRules"""
        defined_roles = {rule.role for rule in self.auth_rules}
        for endpoint in self.api_schema:
            for role in endpoint.roles:
                if role not in defined_roles:
                    raise ValueError(
                        f"R5 violation: Endpoint '{endpoint.path}' uses role '{role}' "
                        f"which is not defined in auth_rules."
                    )
        return self

    @model_validator(mode="after")
    def gated_pages_require_auth(self) -> AppConfig:
        """R6: Pages restricted to specific roles must have auth_required=True on their endpoints"""
        api_map = {ep.path: ep for ep in self.api_schema}
        for page in self.ui_schema:
            if page.roles and page.roles != ["public"]:
                for component in page.components:
                    ep = api_map.get(component.bound_api)
                    if ep and not ep.auth_required:
                        raise ValueError(
                            f"R6 violation: Page '{page.name}' is role-restricted but "
                            f"its endpoint '{component.bound_api}' has auth_required=False."
                        )
        return self
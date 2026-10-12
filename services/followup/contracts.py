"""Typed boundary between the authorized API snapshot and the model runtime."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Record(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    kind: Literal["goal", "plan", "step", "checkin", "feedback"]
    text: str = Field(max_length=5000)
    completed: bool | None = None


class Stats(StrictModel):
    total_steps: int = Field(ge=0, le=100)
    completed_steps: int = Field(ge=0, le=100)


class Context(StrictModel):
    records: list[Record] = Field(min_length=1, max_length=149)
    stats: Stats
    truncated: bool

    @model_validator(mode="after")
    def consistent(self):
        if len({r.id for r in self.records}) != len(self.records):
            raise ValueError("Duplicate source ID")
        steps = [r for r in self.records if r.kind == "step"]
        if self.stats.total_steps != len(steps) or self.stats.completed_steps != sum(r.completed is True for r in steps):
            raise ValueError("Incorrect step counts")
        if len([r for r in self.records if r.kind == "goal"]) != 1:
            raise ValueError("One goal required")
        return self


class DraftRequest(StrictModel):
    context: Context


class Evidence(StrictModel):
    text: str = Field(min_length=1, max_length=1200)
    sources: list[str] = Field(min_length=1, max_length=12)


class Draft(StrictModel):
    summary: list[Evidence] = Field(min_length=1, max_length=8)
    followups: list[Evidence] = Field(max_length=8)
    draft: str = Field(min_length=1, max_length=4000)

    def check_sources(self, context: Context):
        known = {r.id for r in context.records}
        if any(ref not in known for item in self.summary + self.followups for ref in item.sources):
            raise ValueError("Unknown source reference")
        if not self.draft.strip():
            raise ValueError("Empty draft")
        return self

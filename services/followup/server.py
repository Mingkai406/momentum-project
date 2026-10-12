import asyncio
import hmac
import json
import logging
import os
import time
from fastapi import FastAPI, HTTPException, Request
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from contracts import DraftRequest
from agent import generate

# Dedicated provider exports only our metadata spans, not ADK prompts/responses.
provider = TracerProvider()
if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
tracer = provider.get_tracer("momentum.followup")
logger = logging.getLogger("momentum.followup")
logging.basicConfig(level=logging.INFO)
# Model SDK exceptions can contain provider response text. Only our sanitized
# metadata logger is enabled by default; never enable SDK debug logs with user data.
logging.getLogger("google.adk").setLevel(logging.CRITICAL)
logging.getLogger("google.genai").setLevel(logging.CRITICAL)
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
slots = asyncio.Semaphore(4)


@app.middleware("http")
async def authenticate_and_bound(request: Request, call_next):
    from starlette.responses import JSONResponse
    if request.url.path == "/health":
        return await call_next(request)
    token = os.getenv("FOLLOWUP_AGENT_TOKEN", "")
    supplied = request.headers.get("authorization", "")
    if len(token) < 32 or not hmac.compare_digest(supplied.encode(), ("Bearer " + token).encode()):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 100_000:
            return JSONResponse({"error": "Request too large"}, status_code=413)
    request._body = bytes(body)
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/draft")
async def draft(data: DraftRequest, request: Request):
    # Vertex is deliberate: do not silently fall back to a developer API key.
    if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").lower() != "true" or not os.getenv("GOOGLE_CLOUD_PROJECT"):
        raise HTTPException(503, "Vertex AI is not configured")
    ctx = TraceContextTextMapPropagator().extract(dict(request.headers))
    started = time.monotonic()
    with tracer.start_as_current_span("followup.generate", context=ctx) as span:
        trace_id = format(span.get_span_context().trace_id, "032x")
        try:
            async with asyncio.timeout(40):
                async with slots:
                    result = await generate(data.context, tracer)
            usage = result["usage"]
            for name in ("model_calls", "tool_calls", "input_tokens", "output_tokens", "estimated_cost_usd"):
                if usage[name] is not None:
                    span.set_attribute(name, usage[name])
            logger.info(json.dumps({"event": "agent.ready", "trace_id": trace_id, "duration_ms": round((time.monotonic() - started) * 1000), **usage}))
            return result
        except TimeoutError:
            logger.warning(json.dumps({"event": "agent.timeout", "trace_id": trace_id}))
            raise HTTPException(504, "Agent timed out") from None
        except Exception:
            # No exception strings, prompts, source records or credentials in logs.
            logger.warning(json.dumps({"event": "agent.failed", "trace_id": trace_id}))
            raise HTTPException(502, "Agent failed to prepare a draft") from None

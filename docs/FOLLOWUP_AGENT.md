# Mentor follow-up assistant

The assistant helps a mentor turn a student's goal, GROW plan, action steps, check-ins and prior feedback into an editable follow-up. It summarizes progress with source references and suggests questions or next steps. It never sends email, changes student tasks, or writes feedback by itself.

## Review and share

1. Sign in as a mentor with an accepted student connection and open a goal.
2. Choose **Prepare follow-up**. The API assembles the authorized snapshot; the browser cannot supply another student's context.
3. Review observations, suggestions and the expandable original records. Edit the feedback text.
4. Check **I have reviewed the sources and am ready to share this feedback**, then confirm. Any further edit clears the checkbox.
5. The API rechecks access and the goal revision and saves the exact reviewed text in the existing feedback thread. A stale or expired draft must be regenerated. Removing access prevents sharing even if the draft is already open.

Manual feedback remains available during service failures and without model configuration. The static public playground provides an explicitly labeled, template-based example using its current fictional goal records. It supports source review, editing, explicit confirmation, draft expiry, replay protection, and rejection after records change or access is revoked. It never calls a model or presents examples as real model responses. Browser-local checks demonstrate behavior; they are not a security boundary for real accounts. The server remains the authorization boundary for hosted data.

## Local service setup

The ordinary `npm run dev` workflow needs no model credentials. The following optional setup is for a personal GCP project with Vertex AI enabled, permission to invoke the chosen model, and Application Default Credentials. No GCP project or cloud resources are created by these commands.

From the repository root:

```sh
python3.12 -m venv .venv-agent
.venv-agent/bin/python -m pip install -r services/followup/requirements-dev.txt
cp services/followup/.env.example services/followup/.env
```

Edit the ignored `.env` file: supply your project ID, region and a random service token of at least 32 characters. A local token can be generated with `openssl rand -hex 32`. Configure ADC separately before invoking a real model. Never commit the token or an ADC file.

In the first terminal, load those settings and start the service:

```sh
set -a
. services/followup/.env
set +a
.venv-agent/bin/uvicorn server:app --app-dir services/followup --host 127.0.0.1 --port 8000 --no-access-log
```

In a second terminal, load the same settings, then start the application:

```sh
set -a
. services/followup/.env
set +a
export FOLLOWUP_AGENT_URL=http://127.0.0.1:8000
npm run dev
```

Open `http://127.0.0.1:3000` and use the existing student invitation/acceptance flow. `.env` files are not loaded automatically by either startup command. `/health` checks the Python process, not Vertex credentials or model availability.

The included Dockerfile packages only the Python service. For hosted use, keep it on restricted infrastructure, use HTTPS and the shared secret between Express and Python, and grant the service identity only the required Vertex permissions. Do not send a browser JWT to the service or expose its token through `NEXT_PUBLIC_*`. Hosting, live credentials and container execution are separate from the local checks below.

## Data and authority boundaries

- Express derives identity from verified authentication. Only mentors with an accepted relationship can generate/read/confirm a draft; another mentor cannot read that mentor's draft.
- A short repeatable-read transaction creates a consistent snapshot. Identity fields and email columns are omitted, but free-text records can still contain personal information. Deployments must decide which records are appropriate to send to the model.
- The agent receives one goal and at most 100 steps, 24 check-ins and 20 feedback records. Context over 80 KB is rejected. Truncation is explicit, and counts refer to the included steps.
- The ADK agent has only `read_goal`, `read_progress` and `submit_draft` tools. The final tool validates a draft in memory; it has no database write capability. Both read tools must run before submission.
- Model output must match a strict schema and cite known source IDs. This validates structure and provenance IDs, **not factual correctness**. Human review remains necessary, including for misleading or instruction-like text in student records.
- Confirmation requires explicit `confirmed: true`, locks the goal/relationship/draft, checks current authorization and revision, and writes feedback atomically. Child-record mutations bump the goal revision. Concurrent identical confirmations return the same feedback; changing the text after sharing is rejected.
- Draft approval expires after 24 hours. Drafts and their source snapshots persist in PostgreSQL; expiry is not deletion. The API can retrieve a draft by ID, but the current UI does not restore unfinished edits after reload. An operator must set a retention policy before using real student data. Goal deletion cascades to drafts; deleting a draft does not delete its published feedback. Retain confirmed draft records for the intended retry/audit window.

The default limits are six generation requests per minute per mentor, one active request per mentor and eight per API process, four simultaneous model runs per Python process, six model calls and eight tool calls per draft. Generation has a 40-second service deadline and 45-second API deadline. These in-memory limits are per process; a distributed deployment needs a shared quota layer.

## Tracing and costs

The API returns a trace ID and forwards W3C trace context to Python. Metadata-only spans cover generation, each model call and read/validation tools. Logs correlate preparation, validation failures and confirmation with that ID. They do not include prompts, source text, feedback text, credentials or raw provider exceptions.

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to send the dedicated application spans to an OTLP/HTTP collector. This provider deliberately does not register globally or export ADK's prompt/response telemetry. Do not enable SDK debug logging on real student records. Without a collector, JSON event logs still carry the trace ID.

Token counts come from provider usage metadata. Cost is `null` unless both `INPUT_USD_PER_MILLION` and `OUTPUT_USD_PER_MILLION` are explicitly configured from current model pricing. The estimate excludes hosting and other infrastructure charges.

## Verification and live evaluation

```sh
npm run check
npm run test:agent:browser
PYTHONPATH=services/followup .venv-agent/bin/python -m pytest tests/agent -q
```

The API tests use real PostgreSQL. Browser tests use the real web/API/database flow with a deterministic HTTP model-service fixture. Python tests execute the real ADK Runner and tool loop with a scripted model, including trace propagation. These checks run without GCP credentials and do not measure real model quality.

`evaluation-cases.json` contains 20 fictional scenarios: missing records, conflicting evidence, incomplete tasks, older/newer check-ins, prompt injection attempts and other edge cases. Once personal Vertex access is configured, an explicit, billable evaluation compares direct-context generation with ADK tools:

```sh
.venv-agent/bin/python services/followup/evaluate.py --live --limit 3 --output .local/evaluations/followup-first-run.json
```

Use `--limit 20` for the full set. Output paths must be new. Failures are retained, as are latency, token usage, optional cost and each case's human-review rubric. Valid schema/source IDs are not a semantic pass: review unsupported claims, source relevance, useful next steps and injection handling before treating results as model-quality evidence. Do not reuse a fixture result as a live evaluation.

**Current validation boundary:** no personal GCP project/ADC was available, so real Vertex requests, live model quality, OTLP collector delivery and hosted deployment have not been verified. Existing functionality and offline integration are tested; connecting a real project is the next step.

# irid.ai — Backend

FastAPI service exposing face enrollment and recognition over ONNX Runtime
(ArcFace embeddings + InsightFace SCRFD detection), with a FAISS-backed
gallery for fast 1:N identity search.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # adjust CORS_ORIGINS to match your frontend URL
uvicorn api.main:app --reload --port 8000
```

The first run downloads the ONNX model from Hugging Face into the local
cache if it isn't already present under `models/`.

## Docker

```bash
docker build -t face-recognition-backend .
docker run -p 8000:8000 -v $(pwd)/data:/app/data face-recognition-backend
```

## Endpoints

| Method | Path        | Description                                    |
|--------|-------------|-------------------------------------------------|
| GET    | `/health`   | Service + model status                          |
| POST   | `/enroll`   | `multipart/form-data`: `name`, `file` (image)    |
| POST   | `/recognize`| `multipart/form-data`: `file` (image), `threshold` (float, optional) |

Full request/response schemas are in `api/schemas.py`; interactive docs are
served at `/docs` (Swagger) and `/redoc` once the server is running.

## Project layout

```
backend/
├── api/          FastAPI app, routes, request/response schemas
├── src/          Detection, alignment, embedding, and gallery logic
├── scripts/      CLI tools: batch enrollment, inference benchmarking
├── tests/        Unit tests (mocked ONNX/InsightFace)
├── data/         Persisted FAISS index + name mapping (gitignored in prod)
└── models/       ONNX model weights (downloaded on first run)
```

## Frontend integration

The `../frontend` app expects this API at `VITE_API_URL` (defaults to
`http://localhost:8000` for local dev) and calls exactly the three endpoints
above. Set `CORS_ORIGINS` here to include the frontend's dev server URL
(`http://localhost:5173` for `vite dev`, or your deployed origin) or requests
will be blocked by the browser.

Only `/health`, `/enroll`, and `/recognize` exist today. Frontend pages that
reference additional endpoints (`/logs`, `/identities`, `/audit-log`,
`/auth/login` — used by the system logs, entity management, live video, and
login screens) fall back to demo data until those routes are implemented on
this backend; see `frontend/README.md` for the exact contracts they expect.

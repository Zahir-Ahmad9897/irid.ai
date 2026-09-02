# irid.ai - Biometric Intelligence Platform

A full-stack, AI-powered biometric face recognition platform. irid.ai allows you to enroll identities, run real-time face verification, and manage a secure recognition gallery.

## 🚀 Features

- **Secure Recognition**: Powered by ArcFace and FAISS for secure vector search.
- **Fast & Accurate**: Uses 512-dimensional embeddings for blazing-fast inference.
- **Live Video Recognition**: Stream directly from a camera with real-time bounding-box matching.
- **Identity & Bulk Enrollment**: Register single subjects or drag-and-drop batch photos to enroll many identities at once.
- **System Logs**: Browse detections, filter known vs. unknown faces, and export logs to CSV.

## 🛠 Tech Stack

- **Backend**: FastAPI, Python 3.10, InsightFace (ONNX), FAISS
- **Frontend**: React, Vite, Tailwind CSS (Custom "Ink & Brass" theme), Lucide Icons
- **Deployment**: Docker & Docker Compose

## 📁 Repository Structure

```text
irid.ai/
├── backend/          # FastAPI + ONNX/FAISS recognition service
│   ├── api/          # REST endpoints (router)
│   ├── src/          # Core logic (FaceRecognizer)
│   ├── data/         # Mounted volume for FAISS index and JSON mappings
│   └── models/       # ONNX models (auto-downloaded)
├── frontend/         # React admin dashboard
│   ├── src/          # Components, Contexts, Pages
│   └── public/       # Static assets
└── docker-compose.yml
```

## 🐳 Running with Docker (Recommended)

The easiest way to get started is using Docker Compose. This handles all dependencies, including C++ compilers required for the face recognition models.

```bash
# Clone the repository
git clone <your-repo-url>
cd irid.ai

# Build and start the containers
docker compose up --build
```
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/docs`

## 💻 Local Development

If you prefer to run the services locally without Docker:

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows

# Install dependencies (requires build-essential/C++ compiler for insightface)
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run the API
uvicorn api.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Setup environment variables (VITE_API_URL=http://localhost:8000)
cp .env.example .env

# Start the dev server
npm run dev
```

*Note: Ensure `CORS_ORIGINS` in `backend/.env` includes your frontend URL (e.g., `http://localhost:5173` or `http://localhost:3000`) so the browser is allowed to communicate with the API.*

"""
RiskLens AI — Modal Serverless Backend Deployment Configuration

This file deploys the production Express backend to Modal Serverless Web Endpoints
using containerized Node.js runtime environment. All Express routes, controllers,
services, 8-agent Gemini pipeline, and PostgreSQL database connections are 100% preserved.

Modal Setup Instructions:
-------------------------
1. Install Modal CLI:
   pip install modal

2. Authenticate with Modal:
   modal setup

3. Create Modal Secrets (Environment Variables):
   modal secret create risklens-secrets \\
     GEMINI_API_KEY="your-gemini-api-key" \\
     DATABASE_URL="postgresql://user:pass@host:5432/dbname" \\
     DATA_STORE_PROVIDER="postgres" \\
     NODE_ENV="production"

4. Deploy Backend to Production:
   modal deploy modal_app.py

5. Serve Locally for Testing:
   modal serve modal_app.py

6. Monitor Logs & Health Check:
   modal logs risklens-ai-backend
   curl https://<your-modal-subdomain>.modal.run/api/health
"""

import modal
import subprocess
import time

app = modal.App("risklens-ai-backend")

# Container image definition with Node.js 22 & production build bundle
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "gnupg")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_dir(".", "/root/app", copy=True)
    .run_commands(
        "cd /root/app && npm ci && npm run build",
    )
)

# Reference secrets stored securely in Modal Cloud
secrets = [
    modal.Secret.from_name("risklens-secrets"),
]

@app.function(
    image=image,
    secrets=secrets,
    timeout=300,
    min_containers=1,
)
@modal.web_server(port=3000, startup_timeout=60)
def run_server():
    """Starts the production Node Express server inside Modal serverless container."""
    cmd = ["node", "/root/app/dist/server.cjs"]
    subprocess.Popen(cmd, cwd="/root/app")

# Automated CI/CD & Zero-Downtime Deployment Pipeline

This document outlines the architecture, configuration, and implementation details of the automated continuous integration and continuous deployment (CI/CD) pipeline for **Artha**.

---

## Pipeline Overview

The Artha CI/CD pipeline is designed to automatically build container images for all microservices, push them to a private registry, and deploy them to a single DigitalOcean Droplet with **zero-downtime** rolling restarts.

```
                      ┌─────────────────────────┐
                      │  Git Push to Jasmita /  │
                      │       main branch       │
                      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │ GitHub Actions Runner   │
                      └────────────┬────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼ (Concurrent Matrix Build)                         ▼ (Deploy Job)
┌───────────────────┐                               ┌─────────────────┐
│ Build and push    │                               │ SCP config &    │
│ microservice      │                               │ deploy.sh to    │
│ images to GHCR    │                               │ production host │
└────────┬──────────┘                               └────────┬────────┘
         │                                                   │
         ▼                                                   ▼
┌───────────────────┐                               ┌─────────────────┐
│ ghcr.io/kashyap-  │                               │ Trigger SSH to  │
│ 1811/<service>    │                               │ execute         │
└───────────────────┘                               │ scripts/deploy.sh│
                                                    └────────┬────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ Zero-Downtime   │
                                                    │ Rolling Restart │
                                                    └─────────────────┘
```

---

## 1. GitHub Actions Workflow

The continuous integration workflow is defined in [`.github/workflows/build-all.yml`](../.github/workflows/build-all.yml). It consists of two main jobs:

### Job A: `build-and-push`
*   **Environment**: `ubuntu-latest`.
*   **Triggers**: Automatic pushes to `Jasmita` or `main` branches when files change in any microservice folder, `docker-compose.yml`, or the deployment scripts.
*   **Matrix Strategy**: Builds and pushes all 7 backend microservice images in parallel:
    *   `service-registry`
    *   `api-gateway`
    *   `user-service`
    *   `budget-service` (stored in the `/budget` folder)
    *   `expense-service` (stored in the `/expense` folder)
    *   `notification-service`
    *   `analysis-service`
*   **GitHub Container Registry (GHCR)**: Authenticates using the automatic `${{ secrets.GITHUB_TOKEN }}` to push images.
*   **Tagging**: Images are tagged with both `:latest` and the short git commit SHA (e.g., `:9302c80`) for precise deployment tracking.
*   **Caching**: Employs GitHub Actions cache (`type=gha`) to speed up subsequent Docker builds.
*   **Opt-in Node.js 24**: Sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to ensure all JavaScript actions execute under Node.js 24, avoiding deprecation warnings.

### Job B: `deploy`
*   **Execution**: Starts only after the `build-and-push` matrix job completes successfully.
*   **SCP Copy**: Copies configuration files (`docker-compose.yml`, `docker-compose.infra.yml`, and `nginx`) and the deployment script to the server at `/opt/artha/` using secure credentials stored in GitHub Secrets.
*   **SSH Orchestration**: Logs into the Droplet via SSH to execute `scripts/deploy.sh` using the short git commit SHA as the deployment tag argument.

---

## 2. Zero-Downtime Rolling Deployment Strategy

The deployment script [`scripts/deploy.sh`](../scripts/deploy.sh) orchestrates a rolling update to prevent connection drops. Since the production server operates on a strict **4GB RAM** budget, running duplicate container pairs concurrently for all services is not feasible. The script updates services **sequentially in dependency order**, starting temporary instances briefly during the handover.

### Step-by-Step Rolling Update Flow for a Microservice

For each microservice (e.g., `user-service`):
1.  **Deregister Leftovers**: Stops and removes any existing temporary container (e.g., `artha-user-service-temp`) to avoid name conflicts.
2.  **Start Temporary Container**: Launches the temp container with the new image tag:
    ```bash
    docker compose up -d --no-deps user-service-temp
    ```
3.  **Wait for Healthcheck**: Polls the temp container's health state via `docker inspect` until it is reported as `"healthy"`. If the container crashes or fails to start, the script logs the error and aborts immediately.
4.  **Recreate Main Container**: Updates and restarts the main container with the new image:
    ```bash
    docker compose up -d --no-deps user-service
    ```
5.  **Wait for Main Healthcheck**: Blocks until the new main container becomes `"healthy"`.
6.  **Clean Up Temp**: Stops and removes the temporary container to release system memory.

### Sequence of Service Rollover
1.  `service-registry` (Eureka discovery server)
2.  `user-service` (Core authentication and user database)
3.  `api-gateway` (Router and request entry point)
4.  `budget-service`
5.  `expense-service`
6.  `notification-service`
7.  `analysis-service`
8.  `nginx` (Config reload / start if stopped)

---

## 3. Key Technical Challenges & Solutions

### A. Eureka Instance ID Collisions
*   **Problem**: In Spring Cloud Netflix Eureka, each instance registers with an ID. Originally, `EUREKA_INSTANCE_INSTANCE_ID` was configured as `${SERVER_IP:-localhost}:user-service:8083:${HOSTNAME}`. Because the `HOSTNAME` environment variable is evaluated by Docker Compose on the host machine during deployment, and `HOSTNAME` is unset in the host shell, both the main container and the temp container registered with the exact same ID (`134.209.153.30:user-service:8083:`).
*   **Consequence**: When the temp container shut down, it sent a status change request to Eureka to set its status to `DOWN` and deregistered. However, because the main container continued to heartbeat under the *same* collided ID, Eureka retained the instance in the registry but locked in `DOWN` status, resulting in immediate `503 Service Unavailable` routing failures on the API Gateway.
*   **Solution**: Escaped the suffix in `docker-compose.yml` to `$${HOSTNAME}`. This bypasses host-side evaluation, passing the literal `${HOSTNAME}` to the container. Spring Boot resolves this variable using the container's internal environment, which is set to the unique container short ID (e.g., `dc9e3c3a7938`).

### B. Spring Boot Actuator & Security Access
*   **Problem**: `user-service`, `budget-service`, and `expense-service` initially did not include Spring Boot Actuator, meaning they lacked `/actuator/health` endpoints. Additionally, Spring Security in `user-service` and `api-gateway` blocked `/actuator/**` by default, returning `302 Redirect` or `401 Unauthorized` responses. Because of this, the `curl` healthcheck command in `docker-compose.yml` could not verify actual health.
*   **Solution**: 
    1. Added `spring-boot-starter-actuator` to the Maven dependencies of all microservices.
    2. Modified `SecurityConfig.java` in `user-service` and `api-gateway` to explicitly permit unauthenticated traffic to `/actuator/**` (specifically `/actuator/health`).
    3. Added the `-f` (fail) flag to the `curl` health check commands in `docker-compose.yml` (e.g. `curl -f -s -o /dev/null ...`) so that HTTP errors (like 503) correctly signal container unhealthiness to Docker.

---

## 4. Production Host Security & Maintenance

*   **Credential Protection**: All sensitive parameters (SSH keys, database passwords, API keys, Kafka and Redis credentials) are stored securely in GitHub Repository Secrets and injected at runtime. No secrets are committed to the codebase.
*   **Disk Space Management**: The Droplet's disk space is preserved by running `docker image prune -f` at the end of every successful deployment. This cleans up dangling image layers created by pulling updated image tags.

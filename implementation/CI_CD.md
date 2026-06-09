# Automated CI/CD & Service-Specific Deployment Pipeline

This document outlines the architecture, configuration, and implementation details of the optimized continuous integration and continuous deployment (CI/CD) pipeline for **Artha**.

---

## Pipeline Overview

The Artha CI/CD pipeline is designed to build container images for all microservices, push them to a private registry, and deploy them with **zero-downtime** rolling updates.

To optimize deployment speed and resource utilization on the host, the pipeline only builds and rolls the services that have changed, while triggering a full redeployment of all services if common configuration files are modified.

```
                      ┌─────────────────────────┐
                      │  Git Push to Jasmita /  │
                      │       main branch       │
                      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │  detect-changes Job     │  Path filtering with dorny/paths-filter
                      └────────────┬────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼ (If microservice code changes)                     ▼ (If any change)
┌───────────────────┐                               ┌─────────────────┐
│ build-and-push    │                               │ deploy Job      │
│ (Only changed     │                               │                 │
│  services)        │                               │ • Copy configs  │
└────────┬──────────┘                               │ • Trigger SSH to│
         │                                          │   run deploy.sh │
         ▼                                          └────────┬────────┘
┌───────────────────┐                                        │
│ Push changed tags │◄───────────────────────────────────────┘
│ to GHCR (:latest) │
└───────────────────┘
```

---

## 1. GitHub Actions Workflow

The continuous integration workflow is defined in [`.github/workflows/build-all.yml`](../.github/workflows/build-all.yml) and consists of three jobs:

### Job A: `detect-changes`
*   **Triggers**: Automatic pushes to `Jasmita` or `main` branches when files change in any microservice folder, `docker-compose.yml`, or the deployment scripts.
*   **Path Filtering**: Evaluates which directories have changes.
*   **Outputs**:
    *   `services`: A JSON array of the changed microservices (e.g. `["user-service", "budget-service"]`).
    *   `any_changed`: Set to `true` if any watched files have changed.
    *   `has_builds`: Set to `true` if any microservice directory has changed and needs image builds.
    *   `deploy_args`: If configuration files (like `docker-compose.yml`, `nginx/`, or `deploy.sh`) change, this is set to `all` to force a full redeployment of all services. Otherwise, it converts the JSON array of changes to a space-separated string (e.g. `user-service budget-service`) to be passed to the deployment script.

### Job B: `build-and-push`
*   **Execution**: Starts only if `detect-changes` outputs `has_builds == 'true'`.
*   **Dynamic Matrix Strategy**: The matrix is dynamically generated from the `services` array output by the change detection step. Only changed services are built and pushed.
*   **Tagging & Caching**: Employs GitHub Actions cache (`type=gha`) for fast layering. Images are pushed to GHCR, tagged with both `:latest` and the short git commit SHA.

### Job C: `deploy`
*   **Execution**: Starts after `build-and-push` finishes (whether it was successful or skipped, e.g. when only configuration files changed). It executes if `any_changed == 'true'`.
*   **SCP Transfer**: Copies configuration files (`docker-compose.yml`, `docker-compose.infra.yml`, and `nginx`) and the deployment script to `/opt/artha/` on the production Droplet.
*   **SSH Invocation**: Runs `scripts/deploy.sh` on the Droplet, passing the Git SHA and the space-separated list of target services as arguments.

---

## 2. Zero-Downtime Deployment & Handover Strategy

The deployment script [`scripts/deploy.sh`](../scripts/deploy.sh) orchestrates the zero-downtime rolling update. By default, it updates containers sequentially to remain within the host's **4GB RAM** budget.

### Service-Specific Arguments
*   **Full Redeployment**: If the script is invoked with `all` as the second argument (e.g. `deploy.sh abc1234 all`), it rolls all 7 microservices in sequence.
*   **Targeted Redeployment**: If a specific list of service arguments is provided (e.g. `deploy.sh abc1234 user-service budget-service`), it only pre-pulls, updates, and restarts those specific microservice containers. All other running containers remain active, reducing downtime and system overhead.

### Step-by-Step Handover (Zero-Downtime)
For each target microservice (e.g. `user-service`):
1.  **Stop Leftovers**: Cleans up any existing temporary container (e.g. `artha-user-service-temp`).
2.  **Start Temp Container**: Launches `user-service-temp` running the new image.
3.  **Wait for Actuator Healthcheck**: Polls the temp container's `/actuator/health` endpoint. The container is considered ready only when the status reports `"healthy"`.
4.  **Recreate Main Container**: Updates and restarts the main container (`artha-user-service`) with the new image.
5.  **Wait for Main Healthcheck**: Polls the main container's `/actuator/health` until healthy.
6.  **Teardown Temp**: Gracefully terminates the temporary container, freeing up system memory.

---

## 3. Key Technical Challenges & Solutions

### A. Eureka Instance ID Collisions
*   **Problem**: Spring Cloud Netflix Eureka requires unique instance IDs. Using `${HOSTNAME}` in `docker-compose.yml` led to collisions (both main and temp containers registered as `134.209.153.30:user-service:8083:`) because `HOSTNAME` is evaluated by Docker Compose on the host machine where the variable is unset. When the temp container stopped, it sent a `DOWN` status update, which remained stuck for the collided instance ID despite heartbeats from the main container.
*   **Solution**: Escaped the variable in `docker-compose.yml` to `$${HOSTNAME}`. This passes the literal `${HOSTNAME}` to the container, allowing Spring Boot to resolve it inside the container using the JVM environment. The JVM resolves it to the container's short ID (e.g. `dc9e3c3a7938`), guaranteeing unique instance IDs for both main and temp containers.

### B. Spring Boot Actuator & Security Permissions
*   **Problem**: Microservices lacked the `spring-boot-starter-actuator` dependency, and Spring Security blocked the `/actuator/**` path, returning `302` redirects or `401` unauthorized responses. This prevented Docker's healthcheck curl requests from succeeding.
*   **Solution**:
    1.  Added `spring-boot-starter-actuator` to all Spring Boot microservices.
    2.  Modified `SecurityConfig.java` to permit unauthenticated traffic to `/actuator/**`.
    3.  Added the `-f` (fail) flag to curl commands in `docker-compose.yml` health checks so that HTTP failures (like 503) correctly flag containers as unhealthy.

---

## 4. Production Host Maintenance

*   **Dangling Image Pruning**: The deployment script runs `docker image prune -f` at the end of every run to clean up old dangling container layers and preserve the host's disk space.

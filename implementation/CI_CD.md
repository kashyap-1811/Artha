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

## 1. GitHub Actions Workflow Detailed Execution

The continuous integration and continuous deployment pipeline is defined in [`.github/workflows/build-all.yml`](../.github/workflows/build-all.yml). It is divided into three jobs: `detect-changes`, `build-and-push`, and `deploy`.

---

### Job A: `detect-changes`
This job runs on an `ubuntu-latest` runner and evaluates repository changes to determine which microservices need to be rebuilt and deployed. It executes the following steps:

#### 1. Set up job
*   **What happens**: GitHub Actions initializes the runner virtual machine (allocating a clean Ubuntu environment), registers the repository configuration, and configures runner-level permissions.

#### 2. Checkout Code
*   **What happens**: Clones the git repository into the runner's workspace using `actions/checkout@v4` to make the codebase files available for the subsequent steps.
```yaml
- name: Checkout Code
  uses: actions/checkout@v4
```

#### 3. Detect Changes in Directories
*   **What happens**: Uses the `dorny/paths-filter@v3` action to run `git diff` against the baseline branch. It checks which directories contain modified files and maps them to service identifiers or a global `config` identifier.
```yaml
- name: Detect Changes in Directories
  id: filter
  uses: dorny/paths-filter@v3
  with:
    base: ${{ github.ref_name }}
    filters: |
      service-registry: 'service-registry/**'
      api-gateway: 'api-gateway/**'
      user-service: 'user-service/**'
      expense-service: 'expense/**'
      budget-service: 'budget/**'
      notification-service: 'notification-service/**'
      analysis-service: 'analysis-service/**'
      config:
        - 'docker-compose.yml'
        - 'docker-compose.infra.yml'
        - 'scripts/deploy.sh'
        - 'nginx/**'
        - '.github/workflows/build-all.yml'
```

#### 4. Set Services Matrix Output
*   **What happens**: A custom bash script executes to evaluate the triggers. If triggered manually, it outputs all services. If triggered by a git push, it filters out the `"config"` key from the changes list, determines if builds are required, and formats the output arguments (space-separated list of changed services or `"all"` for full redeploys) into `$GITHUB_OUTPUT`.
```yaml
- name: Set Services Matrix Output
  id: set-matrix
  run: |
    if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
      SERVICES_LIST="[\"service-registry\", \"api-gateway\", \"user-service\", \"expense-service\", \"budget-service\", \"notification-service\", \"analysis-service\"]"
      echo "services=$SERVICES_LIST" >> $GITHUB_OUTPUT
      echo "any_changed=true" >> $GITHUB_OUTPUT
      echo "has_builds=true" >> $GITHUB_OUTPUT
      echo "deploy_args=all" >> $GITHUB_OUTPUT
    else
      CHANGES='${{ steps.filter.outputs.changes }}'
      CONFIG_CHANGED='${{ steps.filter.outputs.config }}'
      FILTERED_CHANGES=$(echo "$CHANGES" | jq -c 'map(select(. != "config"))')
      echo "services=$FILTERED_CHANGES" >> $GITHUB_OUTPUT
      if [ "$CHANGES" != "[]" ]; then
        echo "any_changed=true" >> $GITHUB_OUTPUT
      else
        echo "any_changed=false" >> $GITHUB_OUTPUT
      fi
      if [ "$FILTERED_CHANGES" != "[]" ]; then
        echo "has_builds=true" >> $GITHUB_OUTPUT
      else
        echo "has_builds=false" >> $GITHUB_OUTPUT
      fi
      if [ "$CONFIG_CHANGED" = "true" ]; then
        echo "deploy_args=all" >> $GITHUB_OUTPUT
      else
        SPACE_SEPARATED=$(echo "$FILTERED_CHANGES" | jq -r '. | join(" ")')
        echo "deploy_args=$SPACE_SEPARATED" >> $GITHUB_OUTPUT
      fi
    fi
```

#### 5. Post Checkout Code
*   **What happens**: Automatically executed by GitHub to clean up Git authentication tokens and workspace credentials initialized during checkout.

#### 6. Complete job
*   **What happens**: Registers the outputs (`services`, `any_changed`, `has_builds`, `deploy_args`) in the GitHub orchestrator and shuts down the runner environment.

---

### Job B: `build-and-push`
This job runs in parallel for each changed service (driven by the dynamic matrix from Job A) to compile Docker images and push them to **GitHub Container Registry (GHCR)** at `ghcr.io`. It executes the following steps:

#### 1. Set up job
*   **What happens**: GitHub spins up parallel Ubuntu virtual machines for each active service in the build matrix (e.g. one for `user-service`, one for `budget-service`, etc.).

#### 2. Checkout Code
*   **What happens**: Clones the git repository to the matrix workspace using `actions/checkout@v4`.

#### 3. Get Short Git SHA
*   **What happens**: Runs `git rev-parse --short HEAD` to extract the 7-character commit SHA used for tagging the compiled image.
```yaml
- name: Get Short Git SHA
  id: vars
  run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
```

#### 4. Determine Service Path
*   **What happens**: Maps the matrix service identifier to the correct context subdirectory in the project workspace (e.g. `expense-service` directory is `./expense`).
```yaml
- name: Determine Service Path
  id: path
  run: |
    SERVICE_NAME="${{ matrix.service }}"
    if [ "$SERVICE_NAME" = "expense-service" ]; then
      echo "path=./expense" >> $GITHUB_OUTPUT
    elif [ "$SERVICE_NAME" = "budget-service" ]; then
      echo "path=./budget" >> $GITHUB_OUTPUT
    else
      echo "path=./$SERVICE_NAME" >> $GITHUB_OUTPUT
    fi
```

#### 5. Set up QEMU
*   **What happens**: Uses `docker/setup-qemu-action@v3` to install QEMU static emulators, allowing the builder to cross-compile images for alternate CPU architectures (like ARM64) if needed.

#### 6. Set up Docker Buildx
*   **What happens**: Configures Docker Buildx (`docker/setup-buildx-action@v3`) to initialize the high-performance BuildKit compilation engine, which supports parallel layer compilation and remote caching.

#### 7. Log in to GitHub Container Registry
*   **What happens**: Logins the runner's docker client into `ghcr.io` using the dynamic job token `secrets.GITHUB_TOKEN` to grant write permissions to your GitHub Packages.
```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

#### 8. Set Image Repository Name
*   **What happens**: Normalizes the destination repository path string to lowercase (e.g. `ghcr.io/kashyap-1811/user-service`) to comply with strict Docker repository naming conventions.
```yaml
- name: Set Image Repository Name
  id: prep
  run: echo "repo=$(echo "ghcr.io/${{ github.repository_owner }}/${{ matrix.service }}" | tr '[:upper:]' '[:lower:]')" >> "$GITHUB_OUTPUT"
```

#### 9. Build and Push Image
*   **What happens**: Compiles the Dockerfile using the high-performance GitHub Actions cache backend (`type=gha` to load existing compiled layers). It tags the resulting image as `:latest` and `:<short-git-sha>` and pushes it to the **GitHub Packages (GHCR)** registry.
```yaml
- name: Build and Push Image
  id: build_push
  uses: docker/build-push-action@v6
  continue-on-error: true
  with:
    context: ${{ steps.path.outputs.path }}
    file: ${{ steps.path.outputs.path }}/Dockerfile
    push: true
    tags: |
      ${{ steps.prep.outputs.repo }}:latest
      ${{ steps.prep.outputs.repo }}:${{ steps.vars.outputs.sha_short }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### 10. Sleep before retry / Retry Build and Push Image
*   **What happens**: If the initial build-and-push fails (due to connection issues or GHCR timeouts), the runner sleeps for 10 seconds and retries the compilation step once. In successful runs, these steps are skipped.

#### 11. Post Build and Push Image
*   **What happens**: Clean up local build variables and cached configs generated by the build action.

#### 12. Post Log in to GitHub Container Registry
*   **What happens**: Automatically logs out the Docker daemon from `ghcr.io` to ensure no active package-write sessions remain on the runner VM.

#### 13. Post Set up Docker Buildx
*   **What happens**: Tears down and stops the BuildKit container builder.

#### 14. Post Set up QEMU
*   **What happens**: Wipes the QEMU emulator installation.

#### 15. Post Checkout Code
*   **What happens**: Wipes the cloned source directories from the runner workspace to maintain security.

#### 16. Complete job
*   **What happens**: Shuts down the runner environment and records the build status in GitHub.

---

### Job C: `deploy`
This job triggers after the builds complete (or be skipped) if `any_changed == 'true'`. It deploys the newly built image tags to your DigitalOcean droplet. It executes the following steps:

#### 1. Set up job
*   **What happens**: Launches a clean Ubuntu runner virtual machine for the deployment phase.

#### 2. Build appleboy/scp-action@v0.1.7
*   **What happens**: Pre-builds or loads the SCP action dependencies required to establish an encrypted tunnel to the server.

#### 3. Checkout Code
*   **What happens**: Clones the git repository to retrieve the production configurations (`docker-compose.yml`, `docker-compose.infra.yml`, and `nginx/` config files).

#### 4. Get Short Git SHA
*   **What happens**: Resolves the current short commit SHA to pass to the deployment script.
```yaml
- name: Get Short Git SHA
  id: vars
  run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
```

#### 5. Copy deployment files to server (SCP)
*   **What happens**: Uses `appleboy/scp-action@v0.1.7` to securely copy `docker-compose.yml`, `docker-compose.infra.yml`, `scripts/deploy.sh`, and the `nginx` directory over SSH to `/opt/artha` on your DigitalOcean droplet using the encrypted credentials stored in your GitHub Secrets.
```yaml
- name: Copy deployment files to server
  uses: appleboy/scp-action@v0.1.7
  with:
    host: ${{ secrets.SERVER_IP }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    source: "docker-compose.yml,docker-compose.infra.yml,scripts/deploy.sh,nginx"
    target: "/opt/artha"
```

#### 6. SSH and run deploy script
*   **What happens**: Uses `appleboy/ssh-action@v1.2.0` to open an SSH shell session on the droplet. It removes directory conflicts, makes the shell script executable, exports GHCR secrets into the shell environment, and runs `/opt/artha/scripts/deploy.sh <short-sha> <deploy_args>`.
```yaml
- name: SSH and run deploy script
  uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.SERVER_IP }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    envs: GHCR_PAT,GHCR_USERNAME
    script: |
      if [ -d "/opt/artha/nginx/nginx.conf" ]; then
        rm -rf /opt/artha/nginx/nginx.conf
      fi
      if [ -d "/opt/artha/nginx/nginx.conf.production" ]; then
        rm -rf /opt/artha/nginx/nginx.conf.production
      fi
      
      chmod +x /opt/artha/scripts/deploy.sh
      
      export GHCR_PAT="${{ secrets.GHCR_PAT }}"
      export GHCR_USERNAME="${{ secrets.GHCR_USERNAME }}"
      
      /opt/artha/scripts/deploy.sh ${{ steps.vars.outputs.sha_short }} ${{ needs.detect-changes.outputs.deploy_args }}
```

#### 7. Post Checkout Code
*   **What happens**: Cleans up the checkout directories and git tokens on the runner VM.

#### 8. Complete job
*   **What happens**: Closes connection, uploads the deploy logs, and shuts down the runner environment.

---

## 2. Near-Zero-Downtime Deployment & Handover Strategy

While absolute "100% zero-downtime" is theoretically impossible on a single-node host (due to host port-binding limitations and Eureka registry propagation delays), the deployment pipeline utilizes a **parallel handover strategy** to achieve near-zero downtime (minimal latency/packet drop).

---

### A. Constraints of a Single-Node Host
On a single DigitalOcean Droplet, two major issues prevent absolute zero-downtime during traditional deployments:
1.  **Docker Compose Port Recreate Gap**: During a standard container restart (`docker compose up -d`), Docker must stop the running container, unbind its port, create a new container, and rebind the port. During this recreation window (typically 2 to 5 seconds), any incoming request to that service fails.
2.  **Eureka Registry Sync Lag**: Eureka client caches (like those in the API Gateway) only refresh their registry snapshots periodically (e.g., every 30 seconds). When a service's IP changes, the Gateway might route traffic to the old, terminated container IP for up to 30 seconds, causing HTTP `503 Service Unavailable` errors.

---

### B. The Handover Strategy: How We Minimize Downtime
To resolve these constraints, the script [`scripts/deploy.sh`](../scripts/deploy.sh) implements a parallel handover mechanism using temporary containers to act as a buffer. 

#### Step-by-Step Handover Flow:

```
[Production Traffic] ──► [API Gateway] ──► [artha-user-service (Old Version)]
                                                   ▲
1. Spin up artha-user-service-temp (New Version)  │ (Still serving traffic)
2. Wait for Actuator /health to report "healthy"  │
                                                   ▼
[Production Traffic] ──► [API Gateway] ──► [artha-user-service-temp (New Version)]
                                                   ▲
3. Recreate main artha-user-service (New Version) │ (Serves traffic during swap)
4. Wait for Actuator /health to report "healthy"  │
                                                   ▼
[Production Traffic] ──► [API Gateway] ──► [artha-user-service (New Version)]
5. Stop and remove artha-user-service-temp
```

1.  **Step 1: Clean Leftovers**
    *   **What happens**: The script runs `dcompose rm -f -s <service>-temp` to forcefully stop and delete any orphaned temp containers from previous runs. This ensures a clean name allocation in the Docker engine.
2.  **Step 2: Startup Parallel Temp Container**
    *   **What happens**: The script starts `artha-<service>-temp` running the new image. Crucially, **the old main container (`artha-<service>`) remains active and continues to serve all production traffic** at this time.
3.  **Step 3: Verification via Spring Boot Actuator**
    *   **What happens**: The script polls the temp container's `/actuator/health` endpoint. The main container is not touched until the temp container is fully booted, successfully connected to PostgreSQL/Redis, connected to Kafka, and registered in Eureka.
4.  **Step 4: Swapping the Main Container**
    *   **What happens**: Once the temp container is confirmed healthy, the script runs `dcompose up -d --no-deps <service>`. Docker Compose stops the old main container and starts the new one.
    *   **Downtime Mitigation**: During this swap, **the API Gateway automatically redirects incoming traffic to the running temp container** (`artha-<service>-temp`). Since both containers share the same Eureka service registration name, the gateway routes requests to the active temp container, preventing connection drops during the main container's recreation window.
5.  **Step 5: Main Container Healthcheck Verification**
    *   **What happens**: The script polls `/actuator/health` on the new main container until it reports `"healthy"`.
6.  **Step 6: Clean Teardown**
    *   **What happens**: Only after the new main container is fully healthy and taking over traffic does the script stop and remove the temp container (`artha-<service>-temp`), releasing the host's memory resources.

---

## 3. Coordinated Rollback System (Transactional Deployments)

To prevent partial updates where some services in a git commit succeed but others fail to start or pass health checks, the deployment script implements a transactional, coordinated rollback system.

### A. Pre-Deployment State Backup
Before any updates occur, the script queries Docker for the current running image ID of each target service and tags it locally as `rollback-<service>` to serve as a restore point:
```bash
OLD_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)
if [ -n "$OLD_IMAGE_ID" ]; then
  docker tag "$OLD_IMAGE_ID" "$IMAGE_NAME:rollback-$SERVICE"
fi
```

### B. Sequential Deployment & Halt on Failure
The script deploys target services one by one. If any service fails during its healthcheck, the script sets `DEPLOY_FAILED=true` and immediately skips deployment of all subsequent services:
```bash
if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "budget-service"; then
  if deploy_zero_downtime budget-service "$(get_service_tag budget-service)"; then
    mark_deployed "budget-service"
  else
    DEPLOY_FAILED=true
  fi
fi
```

### C. Reverse-Order Rollback Execution
If `DEPLOY_FAILED` is set to `true`, a global rollback is initiated. The script loops through all services in **reverse order** of deployment. For each service marked as successfully deployed in the current run:
- If a previous container was running, the script rolls it back to the `rollback-<service>` image tag (using zero-downtime rolling updates if supported).
- If no previous container was running, the service is stopped and removed.
```bash
# Rollback snippet
if [ "$HAD_PREVIOUS" = "true" ]; then
  deploy_zero_downtime "$SERVICE" "rollback-$SERVICE"
else
  dcompose stop "$SERVICE" && dcompose rm -f "$SERVICE"
fi
```

### D. Temporary Tag Cleanup
At the end of the script (on both success and failure paths), the local temporary `rollback-<service>` docker tags are cleaned up to keep the environment pristine:
```bash
docker rmi "$IMAGE_NAME:rollback-$SERVICE" 2>/dev/null || true
```

---

## 4. Key Technical Challenges & Solutions

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

## 5. Production Host Maintenance

*   **Automated Image Pruning**: The deployment script runs `docker image prune -a -f --filter "until=24h"` at the end of every deployment. This deletes all unused images (both tagged and untagged) older than 24 hours while keeping recently used/built images, freeing up massive disk space (e.g., reclaiming ~15+ GB of wasted storage).

---

## 6. Real-time Monitoring & Self-Healing (Telegram Alerts)

To ensure the production environment is completely self-monitoring and self-healing, a sidecar auto-healing daemon and a real-time event watcher are deployed on the DigitalOcean host.

### A. Auto-Restarting and Self-Healing
1.  **Process Crashes**: If a microservice crashes (e.g., exits with a non-zero exit code due to an Out of Memory error or unhandled JVM crash), Docker’s `restart: unless-stopped` policy automatically restarts the container process within seconds.
2.  **App Freezes & Deadlocks**: If a container stays running but stops responding (e.g., database connection pool exhaustion or infinite loop), its health check will fail. After 5 retries (100 seconds total), its health status changes from `healthy` to `unhealthy`.
3.  **Autoheal Daemon**: The `autoheal` container (configured in `docker-compose.yml`) listens to Docker daemon events. When a container becomes `unhealthy`, Autoheal automatically executes a restart on that container.

### B. Telegram Alert Notification Daemon
A lightweight shell script [`scripts/monitor-docker.sh`](../scripts/monitor-docker.sh) runs as a persistent Linux `systemd` background service (`docker-monitor.service`) to stream real-time alert notifications directly to a private Telegram group.

#### 1. Event Monitoring Pipeline
The daemon listens to Docker events for `die`, `health_status`, and `start` actions:
```
  Container Crashes  ──► (die event, exit != 0) ──► Send "💥 Crash Alert" (with exit code/OOM and logs)
  Container Freezes  ──► (health unhealthy)     ──► Send "🚨 Health Alert" (with failed health logs)
  Autoheal Restarts  ──► (start event)          ──► Send "🔄 Recovery Alert" (booting up...)
  Healthy Status     ──► (health healthy)       ──► Send "✅ Healthy Alert" (fully online)
```

#### 2. Advanced Diagnostic Capturing
*   **OOM Detection**: The script inspects the container's `.State.OOMKilled` attribute using `docker inspect` to report if the OS kernel terminated the process due to memory limits.
*   **Log Extraction**: It retrieves the last 25 lines of stdout/stderr logs from the failing container, escapes HTML special characters, and formats them inside a `<pre><code>` block.
*   **State Tracking**: It maintains an internal state machine (using variables like `CRASHED` and `RECOVERING`) to track transitions. This ensures "Healthy" notifications are only sent when a container is recovering from a previous failure, avoiding spam during normal git deployments.
*   **Safe JSON Payload Construction**: The script uses `jq --arg` options to dynamically build the JSON payload, ensuring complex log formatting (newlines, tabs, quotes) does not break curl payload parsing when hitting the Telegram Bot API endpoint:
    `https://api.telegram.org/bot<TOKEN>/sendMessage`


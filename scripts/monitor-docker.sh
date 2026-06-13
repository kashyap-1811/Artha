#!/bin/bash
# monitor-docker.sh

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables must be set."
  exit 1
fi

send_telegram() {
  local MESSAGE="$1"
  local PAYLOAD
  PAYLOAD=$(jq -n \
    --arg chat_id "${TELEGRAM_CHAT_ID}" \
    --arg text "${MESSAGE}" \
    --arg parse_mode "HTML" \
    '{chat_id: $chat_id, text: $text, parse_mode: $parse_mode}')

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
       -H "Content-Type: application/json" \
       -d "${PAYLOAD}" > /dev/null
}

echo "=================================================="
echo "Starting Telegram Docker Failure Monitor Daemon..."
echo "Monitoring 'die', 'health_status', and 'start' events..."
echo "=================================================="

docker events --filter 'event=die' --filter 'event=health_status' --filter 'event=start' --format '{{.Actor.Attributes.name}} {{.Action}}' | while read -r CONTAINER_NAME EVENT
do
  # Ignore non-core/non-Artha and third-party containers (except autoheal)
  if [[ ! "$CONTAINER_NAME" =~ ^(artha-|autoheal) ]]; then
    continue
  fi

  # Ignore temporary pipeline-only or zero-downtime temporary containers
  if [[ "$CONTAINER_NAME" == *"-temp"* ]]; then
    continue
  fi

  # Suppress alerts if a deployment is in progress
  if [ -f "/opt/artha/.deploying" ]; then
    echo "$(date +"%Y-%m-%d %H:%M:%S") [INFO] Suppressed $EVENT event for $CONTAINER_NAME (deployment in progress)"
    continue
  fi

  # 1. Handle Unhealthy Containers (Freezes / Healthcheck Failures)
  if [ "$EVENT" = "health_status: unhealthy" ]; then
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    LOGS=$(docker logs --tail 25 "$CONTAINER_NAME" 2>&1)
    
    # Escape HTML special characters inside logs so Telegram's HTML parse mode doesn't break
    LOGS_ESCAPED=$(echo "$LOGS" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
    
    PAYLOAD="<b>🚨 Artha Health Alert 🚨</b>
Container <b>${CONTAINER_NAME}</b> failed its health check and became <b>unhealthy</b>.
<b>Time:</b> ${TIMESTAMP} UTC

<b>Recent Logs:</b>
<pre><code>${LOGS_ESCAPED}</code></pre>"

    # Mark as failed so we can track the recovery restart
    eval "CRASHED_${CONTAINER_NAME//-/_}=true"
    send_telegram "$PAYLOAD"
  fi

  # 1b. Handle Container Becoming Healthy (Successful Recovery)
  if [ "$EVENT" = "health_status: healthy" ]; then
    REC_VAR="RECOVERING_${CONTAINER_NAME//-/_}"
    if [ "${!REC_VAR}" = "true" ]; then
      TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
      PAYLOAD="✅ <b>Artha Healthy Alert</b> ✅
Container <b>${CONTAINER_NAME}</b> is now fully healthy and serving traffic.
<b>Time:</b> ${TIMESTAMP} UTC"
      
      send_telegram "$PAYLOAD"
      eval "RECOVERING_${CONTAINER_NAME//-/_}=false"
    fi
  fi

  # 2. Handle Process Crashes (Non-zero exits)
  if [ "$EVENT" = "die" ]; then
    EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' "$CONTAINER_NAME" 2>/dev/null || true)
    OOM_KILLED=$(docker inspect --format='{{.State.OOMKilled}}' "$CONTAINER_NAME" 2>/dev/null || true)
    
    # Ignore normal/clean exits (Exit Code 0)
    if [ "$EXIT_CODE" != "0" ] && [ -n "$EXIT_CODE" ]; then
      TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
      
      REASON="Process exited with code ${EXIT_CODE}"
      if [ "$OOM_KILLED" = "true" ]; then
        REASON="Out of Memory (OOM Killer terminated the container)"
      fi
      
      LOGS=$(docker logs --tail 25 "$CONTAINER_NAME" 2>&1)
      LOGS_ESCAPED=$(echo "$LOGS" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
      
      PAYLOAD="<b>💥 Artha Crash Alert 💥</b>
Container <b>${CONTAINER_NAME}</b> crashed!
<b>Time:</b> ${TIMESTAMP} UTC
<b>Reason:</b> ${REASON}

<b>Recent Stack Trace / Logs:</b>
<pre><code>${LOGS_ESCAPED}</code></pre>"

      # Mark as crashed so we can track the recovery restart
      eval "CRASHED_${CONTAINER_NAME//-/_}=true"
      send_telegram "$PAYLOAD"
    fi
  fi

  # 3. Handle Container Auto-Restarts (Recovery Notification)
  if [ "$EVENT" = "start" ]; then
    CRASH_VAR="CRASHED_${CONTAINER_NAME//-/_}"
    if [ "${!CRASH_VAR}" = "true" ]; then
      TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
      PAYLOAD="🔄 <b>Artha Recovery Alert</b> 🔄
Container <b>${CONTAINER_NAME}</b> has been restarted by Docker/Autoheal and is now booting up.
<b>Time:</b> ${TIMESTAMP} UTC"
      
      send_telegram "$PAYLOAD"
      # Mark as recovering so we catch when it becomes healthy
      eval "RECOVERING_${CONTAINER_NAME//-/_}=true"
      # Reset the crash state
      eval "CRASHED_${CONTAINER_NAME//-/_}=false"
    fi
  fi
done

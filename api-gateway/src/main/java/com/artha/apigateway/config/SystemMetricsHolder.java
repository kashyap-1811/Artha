package com.artha.apigateway.config;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe windowed metrics accumulator.
 *
 * Collects per-request telemetry (latency, errors) from the reactive request path
 * using lock-free atomic operations (no blocking, no synchronization overhead).
 *
 * The DynamicRateLimitUpdater scheduler calls snapshotAndReset() every 10 seconds
 * to atomically drain the window counters and get a clean snapshot for health evaluation.
 */
@Component
public class SystemMetricsHolder {

    // ── Rolling window counters (reset every scheduler cycle) ────────────────

    /** Total requests in the current 10-second window */
    private final AtomicLong windowRequests = new AtomicLong(0);

    /** Error requests (4xx or 5xx) in the current window */
    private final AtomicLong windowErrors = new AtomicLong(0);

    /** Sum of all response latencies in milliseconds for the current window */
    private final AtomicLong windowLatencyMs = new AtomicLong(0);

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Records one completed request.
     * Called from the reactive request chain — must be non-blocking.
     * AtomicLong operations are CAS-based and fully thread-safe without locking.
     *
     * @param latencyMs  end-to-end latency of this request in milliseconds
     * @param isError    true if the response status was 4xx or 5xx
     */
    public void recordRequest(long latencyMs, boolean isError) {
        windowRequests.incrementAndGet();
        windowLatencyMs.addAndGet(latencyMs);
        if (isError) {
            windowErrors.incrementAndGet();
        }
    }

    /**
     * Atomically drains all counters and returns a snapshot of the just-completed window.
     * After this call, all counters reset to 0 for the next window.
     *
     * Called ONLY from the @Scheduled thread — never from the reactive path.
     *
     * @return immutable Snapshot of the last 10-second window
     */
    public Snapshot snapshotAndReset() {
        long requests = windowRequests.getAndSet(0);
        long errors   = windowErrors.getAndSet(0);
        long latency  = windowLatencyMs.getAndSet(0);
        return new Snapshot(requests, errors, latency);
    }

    // ── Snapshot record ───────────────────────────────────────────────────────

    /**
     * Immutable snapshot of a single 10-second metrics window.
     */
    public record Snapshot(long requests, long errors, long totalLatencyMs) {

        /** Error rate as a percentage 0–100. Returns 0 if no requests. */
        public double errorRatePercent() {
            return requests == 0 ? 0.0 : (double) errors / requests * 100.0;
        }

        /** Average latency in milliseconds. Returns 0 if no requests. */
        public double avgLatencyMs() {
            return requests == 0 ? 0.0 : (double) totalLatencyMs / requests;
        }

        @Override
        public String toString() {
            return String.format("requests=%d, errors=%d, errorRate=%.2f%%, avgLatency=%.1fms",
                    requests, errors, errorRatePercent(), avgLatencyMs());
        }
    }
}

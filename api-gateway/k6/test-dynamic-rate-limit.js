import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom Metrics
const successRate = new Rate('success_rate');
const rateLimitedRate = new Rate('rate_limited_rate');

// Test Configuration: Simulate fluctuating load to observe dynamic limit changes
export const options = {
  discardResponseBodies: true,
  stages: [
    // Stage 1: Low load - 5 users for 30s. Rate limit should be max (20 RPS)
    { duration: '30s', target: 5 },
    
    // Stage 2: Medium load - 50 users for 30s. Limit should adjust downward (280/50 ≈ 5 RPS)
    { duration: '30s', target: 50 },
    
    // Stage 3: High load - 150 users for 30s. Limit should adjust lower (280/150 ≈ 1 RPS)
    { duration: '30s', target: 150 },
    
    // Stage 4: Cool down - 5 users for 70s. Need 60s for the sliding window to clear old users, limit should recover to 20 RPS
    { duration: '70s', target: 5 },
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Use a deterministic endpoint and dummy token
const endpoint = '/budget/api/budgets/active?companyId=test-123';

export default function () {
  // Use VU ID to simulate different users so ActiveUserTrackingFilter tracks them properly
  // In our system, the token identifies the user. We will spoof different tokens for different VUs.
  const userId = `user-${__VU}`;
  const url = `${BASE_URL}${endpoint}`;

  const params = {
    headers: {
      'X-User-Id': userId, // Depending on RateLimitConfig, if it respects X-User-Id we can spoof it. Let's provide a dummy JWT or X-User-Id.
      'Content-Type': 'application/json',
    },
  };

  const res = http.get(url, params);

  // Checks
  const isSuccess = check(res, {
    'status is 200 (Success)': (r) => r.status === 200,
    'status is 429 (Rate Limited)': (r) => r.status === 429,
  });

  // Metrics recording
  successRate.add(res.status === 200);
  rateLimitedRate.add(res.status === 429);

  // Simulate user think time (10 requests per second per VU if limit allows)
  sleep(0.1); 
}

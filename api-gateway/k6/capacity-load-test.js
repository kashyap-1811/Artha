import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ✅ Custom Metrics
const successRate = new Rate('success_rate');
const errorRate = new Rate('error_rate');
const latencyTrend = new Trend('custom_latency');

// ✅ Test Configuration
export const options = {
  discardResponseBodies: true, // improves performance accuracy

  stages: [
    { duration: '2m', target: 20 },   // Warm-up
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 600 },
    { duration: '2m', target: 800 },
    { duration: '1m', target: 0 },    // Cool-down
  ],

  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% < 1s
    error_rate: ['rate<0.05'],         // <5% errors
    success_rate: ['rate>0.95'],       // >95% success
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// ✅ Multiple endpoints (realistic traffic simulation)
const endpoints = [
  '/budget/api/budgets/active?companyId=test-123',
  '/budget/api/budgets/all?companyId=test-123',
  '/expense/api/expenses?companyId=test-123',
  '/users/api/users/c559db95-c4de-42ba-af5e-832a27069439',
  '/users/api/users/by-email?email=kashu@gmail.com'
];

// ✅ Common headers
const params = {
  headers: {
    Authorization: `Bearer ${__ENV.TOKEN || 'YOUR_JWT_TOKEN'}`,
    'Content-Type': 'application/json',
  },
};

export default function () {
  // 🔁 Random endpoint selection (realistic behavior)
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${BASE_URL}${endpoint}`;

  const res = http.get(url, params);

  // ✅ Checks
  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'not rate limited (429)': (r) => r.status !== 429,
    'not server error (5xx)': (r) => r.status < 500,
  });

  // ✅ Metrics recording
  successRate.add(isSuccess);
  errorRate.add(!isSuccess);
  latencyTrend.add(res.timings.duration);

  // 🧠 Simulate real user think time
  sleep(1);
}
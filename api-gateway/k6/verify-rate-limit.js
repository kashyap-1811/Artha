import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 50, // Fire 50 simultaneous active workers to instantly hit the RPS limit
    duration: '3s', // Short duration, all we care is checking for the 429 bounce error
    thresholds: {
        'http_req_failed': ['rate>0.5'], // We expect MORE than half to fail with 429
    },
};

export default function () {
    const url = `${__ENV.BASE_URL}/budget/api/budgets/active?companyId=test-123`;
    const params = {
        headers: {
            'Authorization': `Bearer ${__ENV.TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    
    // Send request immediately
    const res = http.get(url, params);

    // Assert that we correctly receive 200 HTTP codes (within limits) and 429 HTTP codes (over dynamic limits)
    check(res, {
        'status is 200 (Success)': (r) => r.status === 200,
        'status is 429 (Rate Limited)': (r) => r.status === 429,
    });
}

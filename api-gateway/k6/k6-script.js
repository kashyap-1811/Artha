import http from 'k6/http';

export const options = {
  scenarios: {
    test: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
};

export default function () {
  http.get('http://localhost:8080/budget/api/budgets/76759f4a-f822-4509-8ec9-1d5c206201e9/details', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJrYXNodUBnbWFpbC5jb20iLCJ1c2VySWQiOiJjNTU5ZGI5NS1jNGRlLTQyYmEtYWY1ZS04MzJhMjcwNjk0MzkiLCJpYXQiOjE3NzE1NzkxMTMsImV4cCI6MTc3MjQ0MzExM30.yCp07n8mICwpjhMhs0yiS4I7ZJVict_YnOr_ofvbA_G9hnIdPTqHof7T-708qUN2' },
  });
}
import http from "k6/http";
import { Counter } from "k6/metrics";

const ok200 = new Counter("status_200");
const tooMany429 = new Counter("status_429");
const otherStatus = new Counter("status_other");
const targetUrl = __ENV.TARGET_URL || "http://localhost:8080/auth/hello";

export const options = {
  scenarios: {
    auth_hello_rate_limit: {
      executor: "constant-arrival-rate",
      rate: 100,
      timeUnit: "1s",
      duration: "10s",
      preAllocatedVUs: 120,
      maxVUs: 200,
    },
  },
  thresholds: {
    status_429: ["count>0"],
  },
};

export default function () {
  const res = http.get(targetUrl);

  if (res.status === 200) {
    ok200.add(1);
  } else if (res.status === 429) {
    tooMany429.add(1);
  } else {
    otherStatus.add(1);
  }
}

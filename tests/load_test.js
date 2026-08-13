import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '5m',
};

const API_URL = __ENV.API_URL || 'http://localhost:8080/api/tickets';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Fetch all tickets
  const listRes = http.get(API_URL);
  check(listRes, {
    'list status is 200': (r) => r.status === 200,
  });

  // 2. Create ticket
  const payload = JSON.stringify({
    title: `Load Test Ticket VU:${__VU} Iter:${__ITER}`,
    description: 'This ticket is created during load testing.',
    status: 'OPEN',
    priority: 'MEDIUM',
    category: 'SOFTWARE',
    reportedBy: 'k6-load-tester'
  });

  const createRes = http.post(API_URL, payload, params);
  const created = check(createRes, {
    'create status is 201': (r) => r.status === 201,
  });

  if (created) {
    let ticketId;
    try {
      const body = JSON.parse(createRes.body);
      ticketId = body.id;
    } catch (e) {
      // Ignored
    }

    if (ticketId) {
      // 3. Fetch specific ticket
      const getRes = http.get(`${API_URL}/${ticketId}`);
      check(getRes, {
        'fetch status is 200': (r) => r.status === 200,
      });

      // 4. Delete specific ticket
      const deleteRes = http.del(`${API_URL}/${ticketId}`);
      check(deleteRes, {
        'delete status is 204': (r) => r.status === 204,
      });
    }
  }

  // Short pause between iterations
  sleep(1);
}

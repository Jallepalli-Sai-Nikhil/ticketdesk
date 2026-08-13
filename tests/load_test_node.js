/**
 * Light Load Sanity Check in Node.js
 * Simulates 20 concurrent users for 5 minutes.
 */

const API_URL = process.env.API_URL || 'http://ticketdesk-m1-alb-756973487.ap-south-1.elb.amazonaws.com/api/tickets';
const DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CONCURRENT_USERS = 20;

let totalRequests = 0;
let failedRequests = 0;
let stopTests = false;

async function runUserSession(userId) {
  let iteration = 0;
  while (!stopTests) {
    iteration++;
    const headers = { 'Content-Type': 'application/json' };
    
    try {
      // 1. GET (list)
      totalRequests++;
      const listRes = await fetch(API_URL);
      if (listRes.status !== 200) {
        failedRequests++;
        console.error(`[User ${userId}] List fail: Status ${listRes.status}`);
      }

      // 2. POST (create)
      totalRequests++;
      const createRes = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `Load Test Ticket U:${userId} I:${iteration}`,
          description: 'Load test iteration',
          status: 'OPEN',
          priority: 'MEDIUM',
          category: 'SOFTWARE',
          reportedBy: 'load-tester'
        })
      });

      if (createRes.status !== 201) {
        failedRequests++;
        console.error(`[User ${userId}] Create fail: Status ${createRes.status}`);
      } else {
        const ticket = await createRes.json();
        const ticketId = ticket.id;

        // 3. GET /id (fetch)
        totalRequests++;
        const getRes = await fetch(`${API_URL}/${ticketId}`);
        if (getRes.status !== 200) {
          failedRequests++;
          console.error(`[User ${userId}] Fetch fail: Status ${getRes.status}`);
        }

        // 4. DELETE (cleanup)
        totalRequests++;
        const delRes = await fetch(`${API_URL}/${ticketId}`, {
          method: 'DELETE'
        });
        if (delRes.status !== 204) {
          failedRequests++;
          console.error(`[User ${userId}] Delete fail: Status ${delRes.status}`);
        }
      }
    } catch (err) {
      failedRequests++;
      console.error(`[User ${userId}] Network error:`, err.message);
    }

    // Wait 1 second before next iteration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  console.log(`Starting Node.js load test against: ${API_URL}`);
  console.log(`Duration: 5 minutes, Concurrency: ${CONCURRENT_USERS} users`);

  // Start virtual users
  const users = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    users.push(runUserSession(i));
  }

  // Set timeout to stop
  setTimeout(() => {
    console.log('\nStopping tests (duration reached)...');
    stopTests = true;
  }, DURATION_MS);

  // Wait for duration to finish
  await new Promise(resolve => setTimeout(resolve, DURATION_MS + 2000));

  console.log('\n--- LOAD TEST SUMMARY ---');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Failed Requests: ${failedRequests}`);
  
  if (failedRequests > 0) {
    console.log('FAIL: Load test completed with errors.');
    process.exit(1);
  } else {
    console.log('SUCCESS: Load test completed with NO ERRORS.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});

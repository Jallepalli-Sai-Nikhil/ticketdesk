/**
 * Smoke Test Script for TicketDesk API
 * Run with: node smoke_test.js
 */

const API_URL = process.env.API_URL || 'http://localhost:8080/api/tickets';

async function runSmokeTest() {
  console.log(`Starting smoke test against: ${API_URL}`);
  
  // 1. Create Ticket (POST)
  const testTicket = {
    title: 'Smoke Test Ticket',
    description: 'This is a temporary ticket created by smoke test script.',
    status: 'OPEN',
    priority: 'LOW',
    category: 'SOFTWARE',
    reportedBy: 'SmokeTester'
  };

  console.log('\n--- 1. Creating Ticket (POST) ---');
  let createRes;
  try {
    createRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTicket)
    });
  } catch (err) {
    console.error('FAIL: Could not connect to API.', err.message);
    process.exit(1);
  }

  if (createRes.status !== 201) {
    console.error(`FAIL: Expected status 201, got ${createRes.status}`);
    const text = await createRes.text();
    console.error(`Response: ${text}`);
    process.exit(1);
  }

  const createdTicket = await createRes.json();
  const ticketId = createdTicket.id;
  console.log(`SUCCESS: Ticket created with ID ${ticketId}`);
  console.log(JSON.stringify(createdTicket, null, 2));

  // 2. Fetch Specific Ticket (GET /id)
  console.log(`\n--- 2. Fetching Ticket (GET /${ticketId}) ---`);
  const getRes = await fetch(`${API_URL}/${ticketId}`);
  if (getRes.status !== 200) {
    console.error(`FAIL: Expected status 200, got ${getRes.status}`);
    process.exit(1);
  }
  const fetchedTicket = await getRes.json();
  console.log('SUCCESS: Ticket fetched matches ID');
  console.log(JSON.stringify(fetchedTicket, null, 2));

  // 3. List All Tickets (GET)
  console.log('\n--- 3. Listing All Tickets (GET) ---');
  const listRes = await fetch(API_URL);
  if (listRes.status !== 200) {
    console.error(`FAIL: Expected status 200, got ${listRes.status}`);
    process.exit(1);
  }
  const list = await listRes.json();
  const found = list.some(t => t.id === ticketId);
  if (!found) {
    console.error(`FAIL: Ticket ID ${ticketId} not found in the list`);
    process.exit(1);
  }
  console.log(`SUCCESS: Found ticket ${ticketId} in the list of ${list.length} tickets`);

  // 4. Delete Ticket (DELETE)
  console.log(`\n--- 4. Deleting Ticket (DELETE /${ticketId}) ---`);
  const deleteRes = await fetch(`${API_URL}/${ticketId}`, {
    method: 'DELETE'
  });
  if (deleteRes.status !== 204) {
    console.error(`FAIL: Expected status 204, got ${deleteRes.status}`);
    process.exit(1);
  }
  console.log(`SUCCESS: Ticket ${ticketId} deleted`);

  // 5. Verify Ticket is Gone (GET /id -> 404)
  console.log(`\n--- 5. Verifying Deletion (GET /${ticketId}) ---`);
  const getGoneRes = await fetch(`${API_URL}/${ticketId}`);
  if (getGoneRes.status !== 404) {
    console.error(`FAIL: Expected status 404, got ${getGoneRes.status}`);
    process.exit(1);
  }
  console.log('SUCCESS: Ticket is confirmed deleted (404 Not Found)');
  
  console.log('\n=== ALL SMOKE TESTS PASSED ===');
}

runSmokeTest().catch(err => {
  console.error('Unexpected error during test execution:', err);
  process.exit(1);
});

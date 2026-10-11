#!/bin/bash

echo "=== Test 1: Health Check ==="
curl http://localhost:3001/
echo ""
echo ""

echo "=== Test 2: Create User ==="
curl -X POST http://localhost:3001/api/users/role \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-001","email":"test@example.com","role":"student"}'
echo ""
echo ""

echo "=== Test 3: Get User Role ==="
curl http://localhost:3001/api/users/test-001/role
echo ""
echo ""

echo "=== Test 4: Create Goal ==="
curl -X POST http://localhost:3001/api/goals \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-001","goal_number":1,"goal_title":"Complete Project","goal_description":"Build GSM system","category":"Work/School"}'
echo ""
echo ""

echo "=== Test 5: Get Goals ==="
curl http://localhost:3001/api/goals/user/test-001
echo ""
echo ""

echo "=== Test 6: Get Profile ==="
curl http://localhost:3001/api/users/test-001/profile
echo ""
echo ""

echo "All tests completed!"

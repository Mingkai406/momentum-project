#!/bin/bash

URL="https://momentum-backend-m4u6.onrender.com"

echo "=== Test 1: Health Check ==="
curl $URL/
echo ""
echo ""

echo "=== Test 2: API Documentation ==="
curl $URL/api
echo ""
echo ""

echo "=== Test 3: Create User ==="
curl -X POST $URL/api/users/role \
  -H "Content-Type: application/json" \
  -d '{"user_id":"prod-test-001","email":"test@production.com","role":"student"}'
echo ""
echo ""

echo "=== Test 4: Get User Role ==="
curl $URL/api/users/prod-test-001/role
echo ""
echo ""

echo "=== Test 5: Create Goal ==="
curl -X POST $URL/api/goals \
  -H "Content-Type: application/json" \
  -d '{"user_id":"prod-test-001","goal_number":1,"goal_title":"Production Test","goal_description":"Testing","category":"Work/School"}'
echo ""
echo ""

echo "=== Test 6: Get User Goals ==="
curl $URL/api/goals/user/prod-test-001
echo ""
echo ""

echo "=== Test 7: Get User Profile ==="
curl $URL/api/users/prod-test-001/profile
echo ""
echo ""

echo "All production tests completed!"

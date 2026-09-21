#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001/api}"
LOG_FILE="/tmp/multiventas-functional-api.log"

node apps/api/dist/main.js >"$LOG_FILE" 2>&1 &
api_pid=$!

cleanup() {
  kill "$api_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT

fail() {
  echo "FUNCTIONAL SMOKE FAILED: $*" >&2
  echo "--- API LOG ---" >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
}

for attempt in $(seq 1 40); do
  if curl --fail --silent "$BASE_URL/health/ready" >/tmp/ready.json; then
    break
  fi
  if ! kill -0 "$api_pid" 2>/dev/null; then
    fail "API exited before database readiness"
  fi
  [ "$attempt" -lt 40 ] || fail "API/database not ready after 40 seconds"
  sleep 1
done

categories=$(curl --fail --silent "$BASE_URL/categories") || fail "categories endpoint"
echo "$categories" | jq -e 'length >= 3' >/dev/null || fail "seed categories missing"

products=$(curl --fail --silent "$BASE_URL/products?limit=2") || fail "public products endpoint"
product_id=$(echo "$products" | jq -r '.items[0].id // empty')
[ -n "$product_id" ] || fail "seed product missing"

store=$(curl --fail --silent "$BASE_URL/stores/tienda-demo-1") || fail "public store endpoint"
echo "$store" | jq -e '.slug == "tienda-demo-1"' >/dev/null || fail "public store response invalid"

buyer=$(curl --fail --silent   -X POST "$BASE_URL/auth/register/buyer"   -H 'content-type: application/json'   --data '{"email":"ci-buyer@multiventas.test","password":"TestPass123!","name":"CI Buyer"}') || fail "buyer registration"
buyer_access=$(echo "$buyer" | jq -r '.accessToken // empty')
buyer_refresh=$(echo "$buyer" | jq -r '.refreshToken // empty')
[ -n "$buyer_access" ] && [ -n "$buyer_refresh" ] || fail "buyer tokens missing"

session=$(curl --fail --silent "$BASE_URL/auth/session" -H "authorization: Bearer $buyer_access") || fail "buyer session"
echo "$session" | jq -e '.email == "ci-buyer@multiventas.test"' >/dev/null || fail "buyer session invalid"

curl --fail --silent   -X POST "$BASE_URL/cart"   -H "authorization: Bearer $buyer_access"   -H 'content-type: application/json'   --data "{"productId":"$product_id","quantity":1}" >/tmp/cart-add.json || fail "cart add"

curl --fail --silent   -X PATCH "$BASE_URL/cart/$product_id"   -H "authorization: Bearer $buyer_access"   -H 'content-type: application/json'   --data '{"quantity":2}' >/tmp/cart-update.json || fail "cart update"

cart=$(curl --fail --silent "$BASE_URL/cart" -H "authorization: Bearer $buyer_access") || fail "cart get"
echo "$cart" | jq -e --arg id "$product_id" 'any(.[]; .productId == $id and .quantity == 2)' >/dev/null || fail "cart quantity not updated"

curl --fail --silent   -X DELETE "$BASE_URL/cart/$product_id"   -H "authorization: Bearer $buyer_access" >/tmp/cart-delete.json || fail "cart delete"
cart=$(curl --fail --silent "$BASE_URL/cart" -H "authorization: Bearer $buyer_access") || fail "cart get after delete"
echo "$cart" | jq -e 'length == 0' >/dev/null || fail "cart not empty after delete"

refreshed=$(curl --fail --silent   -X POST "$BASE_URL/auth/refresh"   -H 'content-type: application/json'   --data "{"refreshToken":"$buyer_refresh"}") || fail "token refresh"
buyer_access=$(echo "$refreshed" | jq -r '.accessToken // empty')
[ -n "$buyer_access" ] || fail "refreshed access token missing"

vendor=$(curl --fail --silent   -X POST "$BASE_URL/auth/register/vendor"   -H 'content-type: application/json'   --data '{"email":"ci-vendor@multiventas.test","password":"TestPass123!","name":"CI Vendor","businessName":"CI Comercio","storeName":"CI Store","storeSlug":"ci-store"}') || fail "vendor registration"
vendor_access=$(echo "$vendor" | jq -r '.accessToken // empty')
[ -n "$vendor_access" ] || fail "vendor token missing"

vendor_me=$(curl --fail --silent "$BASE_URL/vendors/me" -H "authorization: Bearer $vendor_access") || fail "vendor profile"
vendor_id=$(echo "$vendor_me" | jq -r '.id // empty')
[ -n "$vendor_id" ] || fail "vendor id missing"

vendor_stores=$(curl --fail --silent "$BASE_URL/vendor/stores" -H "authorization: Bearer $vendor_access") || fail "vendor stores"
store_id=$(echo "$vendor_stores" | jq -r '.[0].id // empty')
[ -n "$store_id" ] || fail "vendor store missing"
echo "$vendor_stores" | jq -e 'length == 1 and .[0].slug == "ci-store"' >/dev/null || fail "tenant store isolation failed"

curl --fail --silent   -X POST "$BASE_URL/vendor/products"   -H "authorization: Bearer $vendor_access"   -H 'content-type: application/json'   --data "{"storeId":"$store_id","slug":"ci-product","sku":"CI-001","title":"CI Product","price":999,"stock":5}" >/tmp/vendor-product.json || fail "vendor product create"

vendor_products=$(curl --fail --silent "$BASE_URL/vendor/products" -H "authorization: Bearer $vendor_access") || fail "vendor products"
echo "$vendor_products" | jq -e 'length == 1 and .[0].slug == "ci-product"' >/dev/null || fail "tenant product isolation failed"

admin=$(curl --fail --silent   -X POST "$BASE_URL/auth/login"   -H 'content-type: application/json'   --data '{"email":"admin@multiventas.local","password":"ChangeMeNow123!"}') || fail "admin login"
admin_access=$(echo "$admin" | jq -r '.accessToken // empty')
[ -n "$admin_access" ] || fail "admin token missing"

dashboard=$(curl --fail --silent "$BASE_URL/admin/dashboard" -H "authorization: Bearer $admin_access") || fail "admin dashboard"
echo "$dashboard" | jq -e '.users >= 4 and .vendors >= 3 and .products >= 11' >/dev/null || fail "admin dashboard counts invalid"

curl --fail --silent   -X PATCH "$BASE_URL/vendors/$vendor_id/review"   -H "authorization: Bearer $admin_access"   -H 'content-type: application/json'   --data '{"status":"APPROVED","kycStatus":"VERIFIED"}' >/tmp/vendor-review.json || fail "admin vendor approval"

vendor_me=$(curl --fail --silent "$BASE_URL/vendors/me" -H "authorization: Bearer $vendor_access") || fail "vendor profile after approval"
echo "$vendor_me" | jq -e '.status == "APPROVED" and .kycStatus == "VERIFIED"' >/dev/null || fail "vendor approval not persisted"

echo "Functional smoke passed: database, auth, public catalog, cart, vendor tenant isolation and admin flows."

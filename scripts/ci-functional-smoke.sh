#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001/api}"
LOG_FILE="/tmp/multiventas-functional-api.log"
RESPONSE_FILE="/tmp/multiventas-functional-response.json"

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

request() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local -a args
  args=(--silent --show-error --output "$RESPONSE_FILE" --write-out "%{http_code}" --request "$method" "$BASE_URL$path" --header "content-type: application/json")
  if [ -n "$token" ]; then
    args+=(--header "authorization: Bearer $token")
  fi
  if [ -n "$body" ]; then
    args+=(--data "$body")
  fi

  local status
  status=$(curl "${args[@]}") || {
    echo "curl failed for $method $path" >&2
    return 1
  }

  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "$method $path -> HTTP $status" >&2
    cat "$RESPONSE_FILE" >&2 || true
    echo >&2
    return 1
  fi

  cat "$RESPONSE_FILE"
}

for attempt in $(seq 1 40); do
  if request GET /health/ready >/tmp/ready.json 2>/dev/null; then
    break
  fi
  if ! kill -0 "$api_pid" 2>/dev/null; then
    fail "API exited before database readiness"
  fi
  [ "$attempt" -lt 40 ] || fail "API/database not ready after 40 seconds"
  sleep 1
done

categories=$(request GET /categories) || fail "categories endpoint"
echo "$categories" | jq -e 'length >= 3' >/dev/null || fail "seed categories missing"

products=$(request GET '/products?limit=2') || fail "public products endpoint"
product_id=$(echo "$products" | jq -r '.items[0].id // empty')
[ -n "$product_id" ] || fail "seed product missing"

store=$(request GET /stores/tienda-demo-1) || fail "public store endpoint"
echo "$store" | jq -e '.slug == "tienda-demo-1"' >/dev/null || fail "public store response invalid"

buyer_body=$(jq -cn '{email:"ci-buyer@multiventas.test",password:"TestPass123!",name:"CI Buyer"}')
buyer=$(request POST /auth/register/buyer "" "$buyer_body") || fail "buyer registration"
buyer_access=$(echo "$buyer" | jq -r '.accessToken // empty')
buyer_refresh=$(echo "$buyer" | jq -r '.refreshToken // empty')
[ -n "$buyer_access" ] && [ -n "$buyer_refresh" ] || fail "buyer tokens missing"

session=$(request GET /auth/session "$buyer_access") || fail "buyer session"
echo "$session" | jq -e '.email == "ci-buyer@multiventas.test"' >/dev/null || fail "buyer session invalid"

cart_add_body=$(jq -cn --arg id "$product_id" '{productId:$id,quantity:1}')
request POST /cart "$buyer_access" "$cart_add_body" >/tmp/cart-add.json || fail "cart add"

request PATCH "/cart/$product_id" "$buyer_access" '{"quantity":2}' >/tmp/cart-update.json || fail "cart update"

cart=$(request GET /cart "$buyer_access") || fail "cart get"
echo "$cart" | jq -e --arg id "$product_id" 'any(.[]; .productId == $id and .quantity == 2)' >/dev/null || fail "cart quantity not updated"

request DELETE "/cart/$product_id" "$buyer_access" >/tmp/cart-delete.json || fail "cart delete"
cart=$(request GET /cart "$buyer_access") || fail "cart get after delete"
echo "$cart" | jq -e 'length == 0' >/dev/null || fail "cart not empty after delete"

refresh_body=$(jq -cn --arg token "$buyer_refresh" '{refreshToken:$token}')
refreshed=$(request POST /auth/refresh "" "$refresh_body") || fail "token refresh"
buyer_access=$(echo "$refreshed" | jq -r '.accessToken // empty')
[ -n "$buyer_access" ] || fail "refreshed access token missing"

vendor_body=$(jq -cn '{email:"ci-vendor@multiventas.test",password:"TestPass123!",name:"CI Vendor",businessName:"CI Comercio",storeName:"CI Store",storeSlug:"ci-store"}')
vendor=$(request POST /auth/register/vendor "" "$vendor_body") || fail "vendor registration"
vendor_access=$(echo "$vendor" | jq -r '.accessToken // empty')
[ -n "$vendor_access" ] || fail "vendor token missing"

vendor_me=$(request GET /vendors/me "$vendor_access") || fail "vendor profile"
vendor_id=$(echo "$vendor_me" | jq -r '.id // empty')
[ -n "$vendor_id" ] || fail "vendor id missing"

vendor_stores=$(request GET /vendor/stores "$vendor_access") || fail "vendor stores"
store_id=$(echo "$vendor_stores" | jq -r '.[0].id // empty')
[ -n "$store_id" ] || fail "vendor store missing"
echo "$vendor_stores" | jq -e 'length == 1 and .[0].slug == "ci-store"' >/dev/null || fail "tenant store isolation failed"

vendor_product_body=$(jq -cn --arg storeId "$store_id" '{storeId:$storeId,slug:"ci-product",sku:"CI-001",title:"CI Product",price:999,stock:5}')
request POST /vendor/products "$vendor_access" "$vendor_product_body" >/tmp/vendor-product.json || fail "vendor product create"
vendor_product_id=$(jq -r '.id // empty' /tmp/vendor-product.json)
[ -n "$vendor_product_id" ] || fail "created vendor product id missing"

request PATCH "/vendor/products/$vendor_product_id" "$vendor_access" '{"title":"CI Product Updated","price":1299,"stock":8,"status":"ACTIVE"}' >/tmp/vendor-product-update.json || fail "vendor product update"
jq -e '.title == "CI Product Updated" and (.price|tonumber) == 1299 and .stock == 8 and .status == "ACTIVE"' /tmp/vendor-product-update.json >/dev/null || fail "vendor product update not persisted"

request POST "/vendor/products/$vendor_product_id/images" "$vendor_access" '{"url":"https://example.com/ci-product.jpg","alt":"CI Product"}' >/tmp/vendor-product-image.json || fail "vendor product image add"
vendor_image_id=$(jq -r '.id // empty' /tmp/vendor-product-image.json)
[ -n "$vendor_image_id" ] || fail "vendor product image id missing"

vendor_products=$(request GET /vendor/products "$vendor_access") || fail "vendor products"
echo "$vendor_products" | jq -e 'length == 1 and .[0].slug == "ci-product" and .[0].status == "ACTIVE" and .[0].stock == 8 and (. [0].images | length) == 1' >/dev/null || fail "tenant product management failed"

request DELETE "/vendor/products/$vendor_product_id/images/$vendor_image_id" "$vendor_access" >/tmp/vendor-product-image-delete.json || fail "vendor product image delete"

admin_body=$(jq -cn '{email:"admin@multiventas.local",password:"ChangeMeNow123!"}')
admin=$(request POST /auth/login "" "$admin_body") || fail "admin login"
admin_access=$(echo "$admin" | jq -r '.accessToken // empty')
[ -n "$admin_access" ] || fail "admin token missing"

dashboard=$(request GET /admin/dashboard "$admin_access") || fail "admin dashboard"
echo "$dashboard" | jq -e '.users >= 4 and .vendors >= 3 and .products >= 11' >/dev/null || fail "admin dashboard counts invalid"

review_body='{"status":"APPROVED","kycStatus":"VERIFIED"}'
request PATCH "/vendors/$vendor_id/review" "$admin_access" "$review_body" >/tmp/vendor-review.json || fail "admin vendor approval"

vendor_me=$(request GET /vendors/me "$vendor_access") || fail "vendor profile after approval"
echo "$vendor_me" | jq -e '.status == "APPROVED" and .kycStatus == "VERIFIED"' >/dev/null || fail "vendor approval not persisted"

echo "Functional smoke passed: database, auth, public catalog, cart, vendor tenant isolation and admin flows."

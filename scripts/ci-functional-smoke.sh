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

raw_card_status=$(curl --silent --show-error -o /tmp/raw-card-rejected.json -w '%{http_code}' \
  -X POST "$BASE_URL/orders/checkout" \
  -H "authorization: Bearer $buyer_access" \
  -H 'content-type: application/json' \
  --data '{"cardNumber":"4111111111111111","securityCode":"123"}') || fail "raw card rejection request"
[ "$raw_card_status" = "400" ] || fail "raw card fields were not rejected"
jq -e '.message | tostring | contains("cardNumber")' /tmp/raw-card-rejected.json >/dev/null || fail "raw card rejection reason missing"

request PATCH /users/me "$buyer_access" '{"name":"CI Buyer Updated","phone":"+59899111222"}' >/tmp/profile-update.json || fail "profile update"
profile=$(request GET /users/me "$buyer_access") || fail "profile get"
echo "$profile" | jq -e '.name == "CI Buyer Updated" and .phone == "+59899111222" and (.avatarUrl == null)' >/dev/null || fail "profile update not persisted"

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

mp_status=$(request GET /payments/mercadopago/status "$vendor_access") || fail "Mercado Pago status"
echo "$mp_status" | jq -e '.connected == false' >/dev/null || fail "new vendor should not have Mercado Pago connected"
echo "$mp_status" | jq -e '.redirectUri == "https://example.com/api/payments/mercadopago/callback"' >/dev/null || fail "Mercado Pago redirect URI was not derived from WEB_PUBLIC_URL"

mp_connect=$(request GET /payments/mercadopago/connect "$vendor_access") || fail "Mercado Pago connect URL"
mp_url=$(echo "$mp_connect" | jq -r '.authorizationUrl // empty')
[ -n "$mp_url" ] || fail "Mercado Pago authorization URL missing"
echo "$mp_url" | grep -q '^https://auth\.mercadopago\.com\.uy/authorization?' || fail "Mercado Pago authorization host invalid"
echo "$mp_url" | grep -q 'client_id=ci' || fail "Mercado Pago client_id missing"
echo "$mp_url" | grep -q 'platform_id=mp' || fail "Mercado Pago platform_id missing"
echo "$mp_url" | grep -q 'redirect_uri=https%3A%2F%2Fexample.com%2Fapi%2Fpayments%2Fmercadopago%2Fcallback' || fail "Mercado Pago derived redirect_uri missing"
if echo "$mp_url" | grep -q 'scope='; then fail "Mercado Pago OAuth URL contains unsupported explicit scope"; fi

vendor_me=$(request GET /vendors/me "$vendor_access") || fail "vendor profile"
vendor_id=$(echo "$vendor_me" | jq -r '.id // empty')
[ -n "$vendor_id" ] || fail "vendor id missing"

vendor_stores=$(request GET /vendor/stores "$vendor_access") || fail "vendor stores"
store_id=$(echo "$vendor_stores" | jq -r '.[0].id // empty')
[ -n "$store_id" ] || fail "vendor store missing"
echo "$vendor_stores" | jq -e 'length == 1 and .[0].slug == "ci-store"' >/dev/null || fail "tenant store isolation failed"

vendor_product_body=$(jq -cn --arg storeId "$store_id" '{storeId:$storeId,slug:"ci-product",sku:"CI-001",title:"CI Product",price:999,stock:5,deliveryOptions:[{type:"PICKUP",fee:0,details:"Retiro CI 123"}]}')
request POST /vendor/products "$vendor_access" "$vendor_product_body" >/tmp/vendor-product.json || fail "vendor product create"
vendor_product_id=$(jq -r '.id // empty' /tmp/vendor-product.json)
[ -n "$vendor_product_id" ] || fail "created vendor product id missing"

admin_body=$(jq -cn '{email:"jorgitom18@gmail.com",password:"ChangeMeNow123!"}')
admin=$(request POST /auth/login "" "$admin_body") || fail "admin login"
admin_access=$(echo "$admin" | jq -r '.accessToken // empty')
[ -n "$admin_access" ] || fail "admin token missing"

dashboard=$(request GET /admin/dashboard "$admin_access") || fail "admin dashboard"
echo "$dashboard" | jq -e '.users >= 4 and .vendors >= 3 and .products >= 11' >/dev/null || fail "admin dashboard counts invalid"
echo "$admin" | jq -e '.user.roles | index("ADMIN")' >/dev/null || fail "jorgitom admin role missing"
request GET /admin/orders "$admin_access" >/tmp/admin-orders.json || fail "admin orders"
jq -e 'type == "array"' /tmp/admin-orders.json >/dev/null || fail "admin orders response invalid"

mp_before=$(request GET /admin/mercadopago "$admin_access") || fail "admin Mercado Pago config"
echo "$mp_before" | jq -e '.provider == "MERCADO_PAGO" and .hasClientSecret == true' >/dev/null || fail "admin Mercado Pago defaults invalid"

request PATCH /admin/mercadopago "$admin_access" '{"accountEmail":"fees@multiventas.test","clientId":"ci-marketplace-client","clientSecret":"ci-marketplace-secret","feeRate":0.075}' >/tmp/mp-config.json || fail "admin Mercado Pago update"
jq -e '.accountEmail == "fees@multiventas.test" and .clientId == "ci-marketplace-client" and .hasClientSecret == true and (.feeRate|tonumber) == 0.075 and (has("clientSecret")|not)' /tmp/mp-config.json >/dev/null || fail "admin Mercado Pago config response invalid"

mp_connect=$(request GET /payments/mercadopago/connect "$vendor_access") || fail "vendor Mercado Pago OAuth URL"
echo "$mp_connect" | jq -e '.authorizationUrl | contains("client_id=ci-marketplace-client")' >/dev/null || fail "vendor OAuth did not use admin marketplace config"

review_body='{"status":"APPROVED","kycStatus":"VERIFIED"}'
request PATCH "/vendors/$vendor_id/review" "$admin_access" "$review_body" >/tmp/vendor-review.json || fail "admin vendor approval"

vendor_me=$(request GET /vendors/me "$vendor_access") || fail "vendor profile after approval"
echo "$vendor_me" | jq -e '.status == "APPROVED" and .kycStatus == "VERIFIED"' >/dev/null || fail "vendor approval not persisted"

vendor_stores=$(request GET /vendor/stores "$vendor_access") || fail "vendor stores after approval"
echo "$vendor_stores" | jq -e 'length == 1 and .[0].slug == "ci-store" and .[0].status == "ACTIVE"' >/dev/null || fail "vendor store was not activated on approval"

request PATCH "/vendor/stores/$store_id" "$vendor_access" '{"name":"CI Store Branded","description":"Brand test","primaryColor":"#112233"}' >/tmp/store-branding.json || fail "store branding update"
jq -e '.name == "CI Store Branded" and .description == "Brand test" and .primaryColor == "#112233"' /tmp/store-branding.json >/dev/null || fail "store branding not persisted"

public_store=$(request GET /stores/ci-store) || fail "public branded store"
echo "$public_store" | jq -e '.name == "CI Store Branded" and .primaryColor == "#112233"' >/dev/null || fail "public store branding missing"

buyer_orders=$(request GET /orders/mine "$buyer_access") || fail "buyer orders"
echo "$buyer_orders" | jq -e 'type == "array"' >/dev/null || fail "buyer orders invalid"

vendor_orders=$(request GET /vendor/orders "$vendor_access") || fail "vendor orders"
echo "$vendor_orders" | jq -e 'type == "array"' >/dev/null || fail "vendor orders invalid"

request PATCH "/vendor/products/$vendor_product_id" "$vendor_access" '{"title":"CI Product Updated","price":1299,"stock":8,"status":"ACTIVE","deliveryOptions":[{"type":"SHIPPING_PAID","fee":200,"details":"Montevideo"},{"type":"PICKUP","fee":0,"details":"Retiro CI 123"}]}' >/tmp/vendor-product-update.json || fail "vendor product update"
jq -e '.title == "CI Product Updated" and (.price|tonumber) == 1299 and .stock == 8 and .status == "ACTIVE" and (.deliveryOptions|length) == 2 and any(.deliveryOptions[]; .type == "SHIPPING_PAID" and (.fee|tonumber) == 200)' /tmp/vendor-product-update.json >/dev/null || fail "vendor product update or delivery options not persisted"

request POST "/vendor/products/$vendor_product_id/images" "$vendor_access" '{"url":"https://example.com/ci-product.jpg","alt":"CI Product"}' >/tmp/vendor-product-image.json || fail "vendor product image add"
vendor_image_id=$(jq -r '.id // empty' /tmp/vendor-product-image.json)
[ -n "$vendor_image_id" ] || fail "vendor product image id missing"

vendor_products=$(request GET /vendor/products "$vendor_access") || fail "vendor products"
echo "$vendor_products" | jq -e 'length == 1 and .[0].slug == "ci-product" and .[0].status == "ACTIVE" and .[0].stock == 8 and (.[0].images | length) == 1 and (.[0].deliveryOptions | length) == 2' >/dev/null || fail "tenant product management failed"

public_vendor_products=$(request GET '/products?q=CI%20Product%20Updated') || fail "public vendor product search"
echo "$public_vendor_products" | jq -e --arg id "$vendor_product_id" 'any(.items[]; .id == $id and .status == "ACTIVE" and (.deliveryOptions|length) == 2)' >/dev/null || fail "published vendor product or delivery methods are not visible publicly"

public_store=$(request GET /stores/ci-store) || fail "public branded store after publish"
echo "$public_store" | jq -e '.primaryColor == "#112233" and .productCount >= 1' >/dev/null || fail "branded storefront metadata invalid"

request POST "/favorites/$vendor_product_id" "$buyer_access" >/tmp/favorite-add.json || fail "favorite add"
jq -e --arg id "$vendor_product_id" '.favorite == true and .productId == $id' /tmp/favorite-add.json >/dev/null || fail "favorite add response invalid"

favorite_ids=$(request GET /favorites/ids "$buyer_access") || fail "favorite ids"
echo "$favorite_ids" | jq -e --arg id "$vendor_product_id" 'index($id) != null' >/dev/null || fail "favorite id missing"

favorites=$(request GET /favorites "$buyer_access") || fail "favorites list"
echo "$favorites" | jq -e --arg id "$vendor_product_id" 'any(.[]; .product.id == $id and .product.title == "CI Product Updated")' >/dev/null || fail "favorite product missing"

request DELETE "/favorites/$vendor_product_id" "$buyer_access" >/tmp/favorite-delete.json || fail "favorite delete"
favorite_ids=$(request GET /favorites/ids "$buyer_access") || fail "favorite ids after delete"
echo "$favorite_ids" | jq -e --arg id "$vendor_product_id" 'index($id) == null' >/dev/null || fail "favorite was not removed"

public_stores=$(request GET '/stores?limit=20') || fail "public stores directory"
echo "$public_stores" | jq -e 'any(.items[]; .slug == "ci-store" and .name == "CI Store Branded" and .productCount >= 1)' >/dev/null || fail "published vendor store missing from store directory"

store_products=$(request GET '/products?store=ci-store&limit=24') || fail "public store product catalog"
echo "$store_products" | jq -e --arg id "$vendor_product_id" '.total >= 1 and any(.items[]; .id == $id and .store.slug == "ci-store")' >/dev/null || fail "published product missing from seller storefront"

vendor_dashboard=$(request GET /vendor/dashboard "$vendor_access") || fail "vendor commercial dashboard"
echo "$vendor_dashboard" | jq -e '.vendor.status == "APPROVED" and .onboarding.totalSteps == 5 and .onboarding.completeSteps >= 3 and .metrics.products >= 1 and .metrics.activeProducts >= 1' >/dev/null || fail "vendor dashboard or onboarding invalid"

promotion_body=$(jq -cn --arg storeId "$store_id" '{storeId:$storeId,name:"CI Welcome",code:"CI10",type:"PERCENT",value:10,minOrderAmount:100,maxUses:10}')
request POST /vendor/promotions "$vendor_access" "$promotion_body" >/tmp/vendor-promotion.json || fail "vendor promotion create"
promotion_id=$(jq -r '.id // empty' /tmp/vendor-promotion.json)
[ -n "$promotion_id" ] || fail "promotion id missing"

promotions=$(request GET /vendor/promotions "$vendor_access") || fail "vendor promotions list"
echo "$promotions" | jq -e 'any(.[]; .code == "CI10" and (.value|tonumber) == 10 and .isActive == true)' >/dev/null || fail "promotion list invalid"

cart_add_body=$(jq -cn --arg id "$vendor_product_id" '{productId:$id,quantity:1}')
request POST /cart "$buyer_access" "$cart_add_body" >/tmp/cart-promo-add.json || fail "promo cart add"

pickup_preview_body=$(jq -cn --arg id "$vendor_product_id" '{couponCode:"CI10",deliverySelections:{($id):"PICKUP"}}')
coupon_preview=$(request POST /orders/checkout/preview "$buyer_access" "$pickup_preview_body") || fail "coupon checkout preview"
echo "$coupon_preview" | jq -e '.discountAmount == 129.9 and .shippingAmount == 0 and .total == 1169.1 and .requiresShippingAddress == false and any(.groups[]; .couponCode == "CI10")' >/dev/null || fail "pickup coupon preview invalid"

shipping_preview_body=$(jq -cn --arg id "$vendor_product_id" '{couponCode:"CI10",deliverySelections:{($id):"SHIPPING_PAID"}}')
shipping_preview=$(request POST /orders/checkout/preview "$buyer_access" "$shipping_preview_body") || fail "paid shipping checkout preview"
echo "$shipping_preview" | jq -e '.discountAmount == 129.9 and .shippingAmount == 200 and .total == 1369.1 and .requiresShippingAddress == true and any(.groups[].items[]; .selectedDelivery.type == "SHIPPING_PAID" and (.selectedDelivery.fee|tonumber) == 200)' >/dev/null || fail "paid shipping preview invalid"

request DELETE "/cart/$vendor_product_id" "$buyer_access" >/tmp/cart-promo-delete.json || fail "promo cart cleanup"

request DELETE "/vendor/promotions/$promotion_id" "$vendor_access" >/tmp/vendor-promotion-delete.json || fail "vendor promotion delete"

buyer_user_id=$(psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -Atc "SELECT id FROM users WHERE email = 'ci-buyer@multiventas.test' LIMIT 1;")
[ -n "$buyer_user_id" ] || fail "review buyer seed missing"

notify_order_id=$(psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -Atc "INSERT INTO orders (tenant_id, store_id, buyer_id, status, currency, subtotal, shipping_amount, discount_amount, total, created_at, updated_at) VALUES ('$vendor_id', '$store_id', '$buyer_user_id', 'PAID', 'UYU', 1299, 0, 0, 1299, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id;" | head -n1)
[ -n "$notify_order_id" ] || fail "notification order seed missing"
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO order_items (tenant_id, order_id, product_id, title, sku, quantity, unit_price, total, delivery_method, delivery_amount, delivery_details, created_at) VALUES ('$vendor_id', '$notify_order_id', '$vendor_product_id', 'CI Product Updated', 'CI-001', 1, 1299, 1299, 'PICKUP', 0, 'Retiro CI 123', CURRENT_TIMESTAMP);" >/dev/null

request PATCH "/vendor/orders/$notify_order_id/status" "$vendor_access" '{"status":"SHIPPED"}' >/tmp/notify-order-shipped.json || fail "order shipped notification transition"
request PATCH "/vendor/orders/$notify_order_id/status" "$vendor_access" '{"status":"DELIVERED"}' >/tmp/notify-order-delivered.json || fail "order delivered notification transition"

reorder_result=$(request POST "/orders/$notify_order_id/reorder" "$buyer_access") || fail "reorder delivered order"
echo "$reorder_result" | jq -e --arg id "$vendor_product_id" 'any(.added[]; .productId == $id and .quantity == 1)' >/dev/null || fail "reorder did not add available product"
buyer_cart=$(request GET /cart "$buyer_access") || fail "cart after reorder"
echo "$buyer_cart" | jq -e --arg id "$vendor_product_id" 'any(.[]; .productId == $id and .quantity == 1)' >/dev/null || fail "reorder cart state invalid"
request DELETE "/cart/$vendor_product_id" "$buyer_access" >/tmp/reorder-cart-cleanup.json || fail "reorder cart cleanup"

buyer_notifications=$(request GET /notifications "$buyer_access") || fail "buyer notifications"
echo "$buyer_notifications" | jq -e '(.unread >= 3) and any(.items[]; .type == "ORDER_SHIPPED") and any(.items[]; .type == "ORDER_DELIVERED") and any(.items[]; .type == "REVIEW_REQUEST")' >/dev/null || fail "buyer order notifications missing"

first_notification_id=$(echo "$buyer_notifications" | jq -r '.items[0].id // empty')
[ -n "$first_notification_id" ] || fail "buyer notification id missing"
request PATCH "/notifications/$first_notification_id/read" "$buyer_access" >/tmp/notification-read.json || fail "mark notification read"
request PATCH "/notifications/read-all" "$buyer_access" >/tmp/notifications-read-all.json || fail "mark all notifications read"
buyer_notifications=$(request GET /notifications "$buyer_access") || fail "buyer notifications after read"
echo "$buyer_notifications" | jq -e '.unread == 0' >/dev/null || fail "notifications did not mark as read"

review_order_id=$(psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -Atc "INSERT INTO orders (tenant_id, store_id, buyer_id, status, currency, subtotal, shipping_amount, discount_amount, total, created_at, updated_at) VALUES ('$vendor_id', '$store_id', '$buyer_user_id', 'DELIVERED', 'UYU', 1299, 0, 0, 1299, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id;" | head -n1)
[ -n "$review_order_id" ] || fail "review order seed missing"

review_order_item_id=$(psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -Atc "INSERT INTO order_items (tenant_id, order_id, product_id, title, sku, quantity, unit_price, total, created_at) VALUES ('$vendor_id', '$review_order_id', '$vendor_product_id', 'CI Product Updated', 'CI-001', 1, 1299, 1299, CURRENT_TIMESTAMP) RETURNING id;" | head -n1)
[ -n "$review_order_item_id" ] || fail "review order item seed missing"

review_payload=$(jq -cn --arg orderItemId "$review_order_item_id" '{orderItemId:$orderItemId,rating:5,comment:"Excelente compra CI"}')
review_created=$(request POST /reviews "$buyer_access" "$review_payload") || fail "verified review create"
review_id=$(echo "$review_created" | jq -r '.id // empty')
[ -n "$review_id" ] || fail "review id missing"
echo "$review_created" | jq -e '.status == "PENDING" and .rating == 5' >/dev/null || fail "new review should start pending"

vendor_notifications=$(request GET /notifications "$vendor_access") || fail "vendor notifications after review"
echo "$vendor_notifications" | jq -e 'any(.items[]; .type == "REVIEW_RECEIVED")' >/dev/null || fail "vendor review notification missing"

duplicate_review_status=$(curl --silent --show-error -o /tmp/duplicate-review.json -w '%{http_code}'   -X POST "$BASE_URL/reviews"   -H "authorization: Bearer $buyer_access"   -H 'content-type: application/json'   --data "$review_payload") || fail "duplicate review request"
[ "$duplicate_review_status" = "400" ] || fail "duplicate review was not rejected"

buyer_orders=$(request GET /orders/mine "$buyer_access") || fail "buyer orders after review"
echo "$buyer_orders" | jq -e --arg item "$review_order_item_id" 'any(.[]?.items[]?; .id == $item and .review.status == "PENDING")' >/dev/null || fail "buyer cannot read own pending review"

pending_reviews=$(request GET '/admin/reviews?status=PENDING' "$admin_access") || fail "admin pending reviews"
echo "$pending_reviews" | jq -e --arg id "$review_id" 'any(.items[]; .id == $id and .orderItemId != null)' >/dev/null || fail "pending review missing from moderation"

request PATCH "/admin/reviews/$review_id" "$admin_access" '{"status":"PUBLISHED"}' >/tmp/review-published.json || fail "review moderation publish"
jq -e '.status == "PUBLISHED"' /tmp/review-published.json >/dev/null || fail "review not published"

buyer_notifications=$(request GET /notifications "$buyer_access") || fail "buyer notifications after review moderation"
echo "$buyer_notifications" | jq -e 'any(.items[]; .type == "REVIEW_PUBLISHED")' >/dev/null || fail "buyer review published notification missing"

public_reviews=$(request GET "/reviews/products/$vendor_product_id?limit=10") || fail "public product reviews"
echo "$public_reviews" | jq -e --arg id "$review_id" '.summary.average == 5 and .summary.count >= 1 and any(.items[]; .id == $id and .verifiedPurchase == true and .rating == 5)' >/dev/null || fail "published verified review missing publicly"

store_reputation=$(request GET "/reviews/stores/$store_id/summary") || fail "public store reputation"
echo "$store_reputation" | jq -e '.average == 5 and .count >= 1' >/dev/null || fail "store reputation summary invalid"

request DELETE "/vendor/products/$vendor_product_id/images/$vendor_image_id" "$vendor_access" >/tmp/vendor-product-image-delete.json || fail "vendor product image delete"

echo "Functional smoke passed: database, auth, catalog, favorites, reorder, cart retention, delivery methods, notifications, vendor dashboard, promotions, verified reviews, tenant isolation and admin flows."

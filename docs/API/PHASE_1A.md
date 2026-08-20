# MohallaShop — API Contract (Phase 1a)

> **Scope:** endpoints for the first vertical slice — Customer shopping +
> Shopkeeper order handling. Rider, payments, and admin endpoints are **not**
> in Phase 1a (admin read endpoints deferred to Phase 1b; the RBAC matrix
> documents intent).
>
> **Base URL:** `/api/v1` · **Auth:** Supabase JWT as `Authorization: Bearer <token>`
> (verified server-side; see ADR-0002).

---

## 1. Conventions (inherited from Phase 0)

### Error envelope (all non-2xx)

```json
{ "error": { "code": "not_found", "message": "Shop not found", "details": {} } }
```

| Status | Meaning                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| 400    | malformed request (rare; prefer 422)                                                                              |
| 401    | missing/invalid token (`unauthenticated`)                                                                         |
| 403    | authenticated but insufficient role/ownership (`forbidden`)                                                       |
| 404    | resource not found (`not_found`)                                                                                  |
| 409    | state conflict / illegal transition / oversell (`conflict`, `illegal_state_transition`, `insufficient_inventory`) |
| 422    | validation failure (`validation_failed`)                                                                          |

### Money

All monetary values are **strings** with 2 decimal places (INR), e.g. `"199.00"`.
The frontend never sends a price that the backend trusts.

### Timestamps

ISO-8601 UTC, e.g. `"2026-08-09T11:30:00Z"`.

### Pagination

List endpoints accept `page` (≥ 1, default 1) and `page_size` (1–50, default 20):

```json
{
  "items": [/* … */],
  "pagination": { "page": 1, "page_size": 20, "total": 137, "total_pages": 7 }
}
```

Offset pagination now; cursor pagination deferred to a high-volume phase.

### Resource ownership

Every shopkeeper route resolves "my shop" from `shops.owner_user_id = principal.user_id`.
A shopkeeper can never read or mutate another shop's resources (enforced server-side).

---

## 2. Authentication & current user

### `GET /auth/me`

- **Auth:** any authenticated principal.
- **Returns:** `200` `{ user_id, phone, email, roles[] }` (Phase 0 endpoint).

### `GET /me/profile`

- **Auth:** `customer | shopkeeper | admin`. **Idempotent:** ensures the `users` row
  exists for the principal (lazy bootstrap on first call), creates an empty profile.
- **200:** `{ user_id, phone, email, display_name, avatar_url }`

### `PATCH /me/profile`

- **Auth:** any authenticated principal.
- **Body:** `{ display_name?: string, avatar_url?: string }`
- **200:** the updated profile. **422:** invalid body.

---

## 3. Addresses

### `GET /me/addresses`

- **Auth:** `customer` (shopkeeper/admin may also read their own; primary use is customer).
- **200:** `{ items: Address[] }` (not paginated — small per-user set).

### `POST /me/addresses`

- **Body:** `{ label?, line1, line2?, landmark?, city, state, pincode, contact_name?, contact_phone?, is_default? }`
- **201:** the created `Address`. Setting `is_default=true` clears the previous default.

### `PATCH /me/addresses/{address_id}`

- **Body:** any subset of the create fields.
- **200 / 404 / 422.**

### `DELETE /me/addresses/{address_id}`

- **204** on success; **404** if not owned.

> **`Address`:** `{ id, label, line1, line2, landmark, city, state, pincode, contact_name, contact_phone, is_default }`

---

## 4. Shops & products (customer discovery)

### `GET /shops`

- **Auth:** `customer | shopkeeper | admin`.
- **Query:** `page`, `page_size`, `q?` (ILIKE name/description), `city?`.
- **Rule:** returns only `status = active` shops.
- **200:** paginated `ShopSummary[]`.

### `GET /shops/{shop_id}`

- **200:** full `Shop` (active only — inactive/missing → 404).
- **`Shop`:** `{ id, name, description, phone, address:{ line1, city, state, pincode, latitude?, longitude? }, status }`

### `GET /shops/{shop_id}/products`

- **Query:** `page`, `page_size`, `q?`, `category_id?`, `only_in_stock?` (bool).
- **Rule:** shop must be active; only `is_active` products; `only_in_stock` filters by `inventory.quantity_available > 0`.
- **200:** paginated `Product[]`.

### `GET /products/{product_id}`

- **200:** `Product` (active product of an active shop, else 404).
- **`Product`:** `{ id, shop_id, name, description, price, unit, image_url, in_stock (bool), category_id? }`

---

## 5. Cart

The cart is **single-shop**. The first item binds `cart.shop_id`; an item from
another shop is rejected.

### `GET /cart`

- **Auth:** `customer`.
- **200:** `{ id, shop_id?, items: CartItem[] }` (creates an empty cart if none).
- **`CartItem`:** `{ id, product_id, product_name, unit, unit_price (display), image_url?, quantity, line_total (display) }`

### `POST /cart/items`

- **Body:** `{ product_id, quantity }` (quantity ≥ 1).
- **Business rules:**
  - product must be `is_active` and belong to an active shop (else 404/422).
  - if cart has a different `shop_id` → `409 cart_cross_shop`.
  - if product already in cart → increments quantity.
- **201:** the updated cart (same shape as `GET /cart`).

### `PATCH /cart/items/{item_id}`

- **Body:** `{ quantity }` (≥ 1). `quantity = 0` is rejected (use DELETE).
- **200:** updated cart.

### `DELETE /cart/items/{item_id}`

- **200:** updated cart. Removing the last item resets `cart.shop_id = null`.

### `DELETE /cart`

- **200:** empty cart (clears all items, resets `shop_id`).

---

## 6. Orders (customer)

### `POST /orders`

- **Auth:** `customer`.
- **Body:** `{ address_id, notes? }`
- **Behavior (atomic; see SCHEMA §7):**
  1. load active cart; fail if empty (`409 empty_cart`)
  2. validate `address_id` ownership (`404`/`422`)
  3. lock products/inventory; validate active & in-stock (`409 insufficient_inventory`,
     `422` for inactive items)
  4. compute totals **server-side** from `products.price`
  5. decrement inventory (conditional UPDATE; rollback on oversell)
  6. create `order` (`pending_shop`), `order_items` (snapshots), history row,
     clear cart items
- **201:** the created `OrderDetail`.
- **Errors:** `409 insufficient_inventory|empty_cart|cart_cross_shop`, `404`, `422`.

### `GET /orders`

- **Auth:** `customer`.
- **Query:** `page`, `page_size`, `status?` (filter).
- **200:** paginated `OrderSummary[]`.

### `GET /orders/{order_id}`

- **Auth:** `customer` (own order only → else 404).
- **200:** `OrderDetail` (incl. `items[]` and `history[]`).

### `POST /orders/{order_id}/cancel`

- **Auth:** `customer` (own order).
- **Allowed only from `pending_shop` or `accepted`.** Restocks items atomically.
- **200:** `OrderDetail`. **409 illegal_state_transition** otherwise.

---

## 7. Shopkeeper

All `/shopkeeper/*` routes require role `shopkeeper` (+ `super_admin`) **and** resolve
the single shop owned by the principal (`GET /shopkeeper/shop` returns it; if the
principal owns no shop → `404 no_shop`).

### `GET /shopkeeper/shop`

- **200:** the shopkeeper's `Shop` (incl. counts: products, pending orders).

### `GET /shopkeeper/orders`

- **Query:** `page`, `page_size`, `status?`.
- **200:** paginated `OrderSummary[]` scoped to the shopkeeper's shop.

### `GET /shopkeeper/orders/{order_id}`

- **200:** `OrderDetail`; **404** if the order is not in the shopkeeper's shop
  (ownership isolation).

### `POST /shopkeeper/orders/{order_id}/accept`

- **Transition:** `pending_shop → accepted`. **200** `OrderDetail`; **409** illegal.

### `POST /shopkeeper/orders/{order_id}/reject`

- **Body:** `{ reason? }`. **Transition:** `pending_shop → rejected`. Restocks items.
- **200** `OrderDetail`; **409** illegal.

### `POST /shopkeeper/orders/{order_id}/preparing`

- **Transition:** `accepted → preparing`. **200 / 409.**

### `POST /shopkeeper/orders/{order_id}/ready`

- **Transition:** `preparing → ready_for_pickup`. **200 / 409.** (End of Phase 1a.)

---

## 8. Common resource shapes

```jsonc
// OrderSummary
{ "id", "order_no", "status", "total_amount", "item_count", "placed_at" }

// OrderDetail = OrderSummary +
{
  "shop": { "id", "name" },
  "customer": { "user_id", "display_name" },      // present for shopkeeper view
  "subtotal", "delivery_fee", "total_amount", "notes",
  "delivery_address": { "line1", "line2", "landmark", "city", "state", "pincode",
                        "contact_name", "contact_phone" },
  "items": [ { "product_id", "product_name", "product_unit", "unit_price", "quantity", "line_total" } ],
  "history": [ { "from_state", "to_state", "actor_role", "reason", "created_at" } ]
}
```

---

## 9. Phase 1a non-goals (documented for later)

- Full-text/geolocation search, category browse API, product CRUD endpoints (shopkeeper product management is Phase 1b).
- Online payment capture (Razorpay) and delivery/rider handoff.
- Admin management endpoints (read-only oversight arrives in Phase 1b).
- Webhooks, notifications, analytics event ingestion.

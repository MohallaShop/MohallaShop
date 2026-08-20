# MohallaShop — Database Schema (Phase 1a)

> **Scope:** the minimum complete data model for the first vertical slice —
> `Customer login → profile → browse shops → products → cart → checkout → order →
shopkeeper accept/reject/preparing/ready`. Rider delivery, online payments,
> and analytics are **out of scope** for Phase 1a.
>
> **Status:** Specification — ratified before implementation (per Master Prompt §2/§3).
> Implementation lives in `backend/alembic/versions/`.

---

## 1. Conventions

| Concern            | Decision                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Engine             | PostgreSQL 16                                                                              |
| Primary keys       | `UUID` (`gen_random_uuid()`), except `users.id` which **is** the Supabase user id (`sub`). |
| Timestamps         | `TIMESTAMPTZ`, `NOT NULL DEFAULT now()`. `updated_at` advanced by a per-table trigger.     |
| Money              | `NUMERIC(12,2)` (INR). Never `FLOAT`. Serialized as a string in the API.                   |
| Quantities         | `INTEGER`, `CHECK (>= 0)` where it represents stock.                                       |
| Enums              | PostgreSQL `ENUM` types for finite state machines (order status).                          |
| Soft delete        | **Not used in Phase 1a.** Deactivation via boolean/status flags; orders are immutable.     |
| Naming             | `snake_case` tables/columns; FKs `<entity>_id`; indexes `ix_<table>_<cols>`.               |
| Unicode            | All `TEXT`.                                                                                |
| Row Level Security | **Not used.** The application database is accessed only by the FastAPI service role;       |
|                    | clients never connect to Postgres directly. FastAPI is the sole authorization layer        |
|                    | (see §16 / ADR-0002).                                                                      |

### Identity → authorization boundary

```
Supabase Auth identity (sub UUID, phone, email, app_metadata.roles)
        │
        ▼
Application: users.id  (= Supabase sub)        ← anchor for all FKs
        │
        ▼
Role in verified JWT (customer | shopkeeper | admin | super_admin)
        │
        ▼
Business entities (shops, orders, cart, …) authorized by FastAPI
```

The application DB stores **no** Supabase credentials (no password hash, no OTP
secret). `users.id` mirrors the Supabase `sub`; `roles` are **not** stored in a
table — they live in the JWT `app_metadata.roles` claim and are re-verified on
every request (ADR-0002).

> **Role-less default:** a verified principal with no `app_metadata.roles`
> (fresh email/phone signup) is treated as `customer` by the backend
> (ADR-0002). Roles are additive privileges granted server-side; this default
> cannot reach shopkeeper/rider/admin surfaces.

---

## 2. Entities selected for Phase 1a

| Table                 | Purpose                                       | Status  |
| --------------------- | --------------------------------------------- | ------- |
| `users`               | Application anchor for a Supabase identity    | ✅ used |
| `user_profiles`       | 1:1 display profile (name, avatar)            | ✅ used |
| `addresses`           | Saved customer delivery addresses             | ✅ used |
| `categories`          | Flat product categories (no API yet)          | ✅ used |
| `shops`               | Shop catalog + ownership                      | ✅ used |
| `products`            | Shop products; **server-side price**          | ✅ used |
| `inventory`           | 1:1 stock per product (concurrency-safe)      | ✅ used |
| `carts`               | One active, **single-shop** cart per customer | ✅ used |
| `cart_items`          | Cart line items                               | ✅ used |
| `orders`              | Order header + totals + address snapshot      | ✅ used |
| `order_items`         | **Snapshotted** line items                    | ✅ used |
| `order_state_history` | Immutable transition audit trail              | ✅ used |

### Entities evaluated and **deferred** (with reason)

| Entity                  | Deferred because…                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `shop_members`          | Phase 1a has a **single owner per shop** (`shops.owner_user_id`). Multi-staff later. |
| `product_images`        | One `image_url` per product is enough for MVP; gallery later.                        |
| `payments`              | Online payments (Razorpay) are Phase 1b. Phase 1a is implicitly COD.                 |
| `deliveries` / `riders` | No delivery in Phase 1a (slice ends at `READY_FOR_PICKUP`).                          |
| `notifications`         | Out of scope for the first transaction.                                              |
| `complaints`            | Phase 1b+.                                                                           |

---

## 3. Detailed table definitions

### 3.1 `users` — application anchor for a Supabase identity

**Purpose:** stable application identity for foreign keys (`orders.customer_user_id`,
`shops.owner_user_id`). Created lazily on the first authenticated `/me/profile` call.
Stores **no** auth secrets.

| Column       | Type        | Null | Default | Constraints               |
| ------------ | ----------- | ---- | ------- | ------------------------- |
| `id`         | UUID        | no   | —       | **PK** (= Supabase `sub`) |
| `phone`      | TEXT        | yes  | —       | `UNIQUE` when non-null    |
| `email`      | TEXT        | yes  | —       | `UNIQUE` when non-null    |
| `created_at` | TIMESTAMPTZ | no   | `now()` |                           |
| `updated_at` | TIMESTAMPTZ | no   | `now()` | trigger                   |

- **Indexes:** `users (phone)` (partial, where non-null), `users (email)` (partial).
- **RBAC:** a row is readable/writable by its owner; admins read all.
- **Ownership:** self.

> `phone`/`email` are denormalized from Supabase for convenience and uniqueness
> in discovery; Supabase remains the source of truth for verified contact info.

### 3.2 `user_profiles` — 1:1 display profile

| Column         | Type        | Null | Default | Constraints                              |
| -------------- | ----------- | ---- | ------- | ---------------------------------------- |
| `user_id`      | UUID        | no   | —       | **PK**, FK→`users(id)` ON DELETE CASCADE |
| `display_name` | TEXT        | yes  | —       |                                          |
| `avatar_url`   | TEXT        | yes  | —       |                                          |
| `created_at`   | TIMESTAMPTZ | no   | `now()` |                                          |
| `updated_at`   | TIMESTAMPTZ | no   | `now()` | trigger                                  |

- **RBAC:** owner CRUD; admin read.

### 3.3 `addresses` — saved delivery destinations

| Column          | Type        | Null | Default             | Constraints                                     |
| --------------- | ----------- | ---- | ------------------- | ----------------------------------------------- |
| `id`            | UUID        | no   | `gen_random_uuid()` | **PK**                                          |
| `user_id`       | UUID        | no   | —                   | FK→`users(id)` ON DELETE CASCADE                |
| `label`         | TEXT        | yes  | —                   | e.g. "Home"                                     |
| `line1`         | TEXT        | no   | —                   |                                                 |
| `line2`         | TEXT        | yes  | —                   |                                                 |
| `landmark`      | TEXT        | yes  | —                   |                                                 |
| `city`          | TEXT        | no   | —                   |                                                 |
| `state`         | TEXT        | no   | —                   |                                                 |
| `pincode`       | TEXT        | no   | —                   | `CHECK (char_length(pincode) BETWEEN 3 AND 10)` |
| `contact_name`  | TEXT        | yes  | —                   |                                                 |
| `contact_phone` | TEXT        | yes  | —                   |                                                 |
| `is_default`    | BOOLEAN     | no   | `false`             |                                                 |
| `created_at`    | TIMESTAMPTZ | no   | `now()`             |                                                 |
| `updated_at`    | TIMESTAMPTZ | no   | `now()`             | trigger                                         |

- **Indexes:** `addresses (user_id)`.
- **RBAC:** owner CRUD; not visible to other customers or to shopkeepers.
- **Separation:** clearly distinct from `user_profiles` — a profile is _who_, an
  address is _where_; a user may have several addresses.

### 3.4 `categories` — flat product categories

| Column       | Type        | Null | Default             | Constraints                                                         |
| ------------ | ----------- | ---- | ------------------- | ------------------------------------------------------------------- |
| `id`         | UUID        | no   | `gen_random_uuid()` | **PK**                                                              |
| `name`       | TEXT        | no   | —                   | `UNIQUE`                                                            |
| `slug`       | TEXT        | no   | —                   | `UNIQUE`                                                            |
| `parent_id`  | UUID        | yes  | —                   | FK→`categories(id)` ON DELETE SET NULL (self-ref, future hierarchy) |
| `sort_order` | INTEGER     | no   | `0`                 |                                                                     |
| `created_at` | TIMESTAMPTZ | no   | `now()`             |                                                                     |

- **RBAC:** public read; admin write (no API in Phase 1a; seeded).
- **Indexes:** `categories (slug)`.

### 3.5 `shops` — shop catalog and ownership

| Column            | Type         | Null | Default             | Constraints                                          |
| ----------------- | ------------ | ---- | ------------------- | ---------------------------------------------------- |
| `id`              | UUID         | no   | `gen_random_uuid()` | **PK**                                               |
| `owner_user_id`   | UUID         | no   | —                   | FK→`users(id)` ON DELETE RESTRICT                    |
| `name`            | TEXT         | no   | —                   | `CHECK (char_length(name) BETWEEN 1 AND 120)`        |
| `description`     | TEXT         | yes  | —                   |                                                      |
| `phone`           | TEXT         | yes  | —                   | contact                                              |
| `status`          | shop_status  | no   | `'active'`          | `CHECK (status IN ('active','inactive'))` (Phase 1a) |
| `address_line1`   | TEXT         | yes  | —                   |                                                      |
| `address_city`    | TEXT         | yes  | —                   |                                                      |
| `address_state`   | TEXT         | yes  | —                   |                                                      |
| `address_pincode` | TEXT         | yes  | —                   |                                                      |
| `latitude`        | NUMERIC(9,6) | yes  | —                   |                                                      |
| `longitude`       | NUMERIC(9,6) | yes  | —                   |                                                      |
| `created_at`      | TIMESTAMPTZ  | no   | `now()`             |                                                      |
| `updated_at`      | TIMESTAMPTZ  | no   | `now()`             | trigger                                              |

- **Enum `shop_status`:** `active`, `inactive`. (More states — `pending_verification`,
  `suspended` — added with admin/approvals in Phase 1b.)
- **Indexes:** `shops (owner_user_id)`; `shops (status)`; `shops (address_city)`.
- **Discovery rule:** customers only ever see `status = 'active'` shops.
- **Ownership:** `owner_user_id` is the shopkeeper. A shopkeeper may manage **only**
  the shop(s) they own (enforced server-side; see RBAC matrix).
- **ON DELETE RESTRICT** on owner: a user owning shops cannot be deleted without
  reassigning/removing shops first.

### 3.6 `products` — shop products with server-side price

| Column        | Type          | Null | Default             | Constraints                                       |
| ------------- | ------------- | ---- | ------------------- | ------------------------------------------------- |
| `id`          | UUID          | no   | `gen_random_uuid()` | **PK**                                            |
| `shop_id`     | UUID          | no   | —                   | FK→`shops(id)` ON DELETE CASCADE                  |
| `category_id` | UUID          | yes  | —                   | FK→`categories(id)` ON DELETE SET NULL            |
| `name`        | TEXT          | no   | —                   | `CHECK (char_length(name) BETWEEN 1 AND 160)`     |
| `description` | TEXT          | yes  | —                   |                                                   |
| `price`       | NUMERIC(12,2) | no   | —                   | `CHECK (price >= 0)` — **server source of truth** |
| `unit`        | TEXT          | no   | —                   | e.g. `kg`, `500 g`, `pc`, `dozen`                 |
| `image_url`   | TEXT          | yes  | —                   |                                                   |
| `is_active`   | BOOLEAN       | no   | `true`              |                                                   |
| `created_at`  | TIMESTAMPTZ   | no   | `now()`             |                                                   |
| `updated_at`  | TIMESTAMPTZ   | no   | `now()`             | trigger                                           |

- **Indexes:** `products (shop_id)`; `products (shop_id, is_active)`; `products (category_id)`.
- **RBAC:** public read of active products in active shops; shopkeeper CRUD on
  own shop's products; admin CRUD.
- **Price rule:** the frontend **never** supplies price at checkout. `order_items`
  snapshot the price read here.

### 3.7 `inventory` — concurrency-safe stock (1:1 with product)

| Column                | Type        | Null | Default             | Constraints                                     |
| --------------------- | ----------- | ---- | ------------------- | ----------------------------------------------- |
| `id`                  | UUID        | no   | `gen_random_uuid()` | **PK**                                          |
| `product_id`          | UUID        | no   | —                   | **UNIQUE**, FK→`products(id)` ON DELETE CASCADE |
| `quantity_available`  | INTEGER     | no   | `0`                 | `CHECK (quantity_available >= 0)`               |
| `low_stock_threshold` | INTEGER     | yes  | —                   | `CHECK (low_stock_threshold >= 0)`              |
| `updated_at`          | TIMESTAMPTZ | no   | `now()`             | trigger                                         |

- **Indexes:** `inventory (product_id)` (unique).
- **Concurrency:** see §4. Stock is never decremented in the cart; it is
  decremented **atomically at order creation** and **restocked on cancel/reject**.

### 3.8 `carts` — one active, single-shop cart per customer

| Column       | Type        | Null | Default             | Constraints                                |
| ------------ | ----------- | ---- | ------------------- | ------------------------------------------ |
| `id`         | UUID        | no   | `gen_random_uuid()` | **PK**                                     |
| `user_id`    | UUID        | no   | —                   | FK→`users(id)` ON DELETE CASCADE           |
| `shop_id`    | UUID        | yes  | —                   | FK→`shops(id)` ON DELETE SET NULL          |
| `status`     | cart_status | no   | `'active'`          | `CHECK (status IN ('active','abandoned'))` |
| `created_at` | TIMESTAMPTZ | no   | `now()`             |                                            |
| `updated_at` | TIMESTAMPTZ | no   | `now()`             | trigger                                    |

- **Partial unique index:** one active cart per user:
  `UNIQUE INDEX (user_id) WHERE status = 'active'`.
- **Single-shop rule:** `shop_id` is set when the first item is added. Adding a
  product from a **different** shop is rejected until the cart is emptied (see §5).
- **Cart → order conversion:** on successful checkout the cart's items are
  deleted and `shop_id` reset to NULL; the row stays `status = 'active'` to be
  reused for the next shop.
- **RBAC:** owner only.

### 3.9 `cart_items`

| Column                | Type          | Null | Default             | Constraints                         |
| --------------------- | ------------- | ---- | ------------------- | ----------------------------------- |
| `id`                  | UUID          | no   | `gen_random_uuid()` | **PK**                              |
| `cart_id`             | UUID          | no   | —                   | FK→`carts(id)` ON DELETE CASCADE    |
| `product_id`          | UUID          | no   | —                   | FK→`products(id)` ON DELETE CASCADE |
| `quantity`            | INTEGER       | no   | —                   | `CHECK (quantity >= 1)`             |
| `unit_price_snapshot` | NUMERIC(12,2) | no   | —                   | `CHECK (>= 0)` — **display only**   |
| `created_at`          | TIMESTAMPTZ   | no   | `now()`             |                                     |
| `updated_at`          | TIMESTAMPTZ   | no   | `now()`             | trigger                             |

- **Unique:** `(cart_id, product_id)` — one line per product per cart.
- **Snapshot vs. price:** `unit_price_snapshot` is for display convenience only.
  **Checkout always reads `products.price` server-side**; the order snapshots that.
- **Inactive product behavior:** a product becoming `is_active = false` is **not**
  auto-removed; at checkout the item is rejected and the customer is told which item.

### 3.10 `orders` — order header + totals + address snapshot

| Column                   | Type          | Null | Default             | Constraints                                   |
| ------------------------ | ------------- | ---- | ------------------- | --------------------------------------------- |
| `id`                     | UUID          | no   | `gen_random_uuid()` | **PK**                                        |
| `order_no`               | TEXT          | no   | —                   | **UNIQUE**, human-readable (e.g. `MS-7XK2Q9`) |
| `customer_user_id`       | UUID          | no   | —                   | FK→`users(id)` ON DELETE RESTRICT             |
| `shop_id`                | UUID          | no   | —                   | FK→`shops(id)` ON DELETE RESTRICT             |
| `status`                 | order_status  | no   | —                   | enum (see §6)                                 |
| `subtotal`               | NUMERIC(12,2) | no   | —                   | `CHECK (>= 0)`                                |
| `delivery_fee`           | NUMERIC(12,2) | no   | `0`                 | `CHECK (>= 0)` (0 in Phase 1a)                |
| `total_amount`           | NUMERIC(12,2) | no   | —                   | `CHECK (>= 0)`, `= subtotal + delivery_fee`   |
| `notes`                  | TEXT          | yes  | —                   |                                               |
| `delivery_line1`         | TEXT          | no   | —                   | **address snapshot**                          |
| `delivery_line2`         | TEXT          | yes  | —                   | snapshot                                      |
| `delivery_landmark`      | TEXT          | yes  | —                   | snapshot                                      |
| `delivery_city`          | TEXT          | no   | —                   | snapshot                                      |
| `delivery_state`         | TEXT          | no   | —                   | snapshot                                      |
| `delivery_pincode`       | TEXT          | no   | —                   | snapshot                                      |
| `delivery_contact_name`  | TEXT          | yes  | —                   | snapshot                                      |
| `delivery_contact_phone` | TEXT          | yes  | —                   | snapshot                                      |
| `placed_at`              | TIMESTAMPTZ   | no   | `now()`             |                                               |
| `created_at`             | TIMESTAMPTZ   | no   | `now()`             |                                               |
| `updated_at`             | TIMESTAMPTZ   | no   | `now()`             | trigger                                       |

- **Enum `order_status`:** `placed`, `pending_shop`, `accepted`, `preparing`,
  `ready_for_pickup`, `rejected`, `cancelled`.
- **Indexes:** `orders (customer_user_id, created_at DESC)`; `orders (shop_id, created_at DESC)`;
  `orders (status)`; `orders (order_no)`.
- **Address snapshot:** the delivery address is **copied** into the order so an
  order is immutable even if the customer later edits/deletes the address.
- **RBAC:** customer reads their own; shopkeeper reads/manages their shop's; admin all.

### 3.11 `order_items` — **snapshotted** line items

| Column         | Type          | Null | Default             | Constraints                                                                   |
| -------------- | ------------- | ---- | ------------------- | ----------------------------------------------------------------------------- |
| `id`           | UUID          | no   | `gen_random_uuid()` | **PK**                                                                        |
| `order_id`     | UUID          | no   | —                   | FK→`orders(id)` ON DELETE CASCADE                                             |
| `product_id`   | UUID          | yes  | —                   | FK→`products(id)` ON DELETE SET NULL (nullable: product may be removed later) |
| `product_name` | TEXT          | no   | —                   | **snapshot** of `products.name`                                               |
| `product_unit` | TEXT          | no   | —                   | snapshot of `products.unit`                                                   |
| `unit_price`   | NUMERIC(12,2) | no   | —                   | snapshot of `products.price` at checkout                                      |
| `quantity`     | INTEGER       | no   | —                   | `CHECK (quantity >= 1)`                                                       |
| `line_total`   | NUMERIC(12,2) | no   | —                   | `= unit_price * quantity`                                                     |

- **Indexes:** `order_items (order_id)`.
- **History integrity:** `order_items` reconstructs a past order **without** the
  current `products` row. `product_id` is kept for reference only.

### 3.12 `order_state_history` — immutable transition audit trail

| Column          | Type         | Null | Default             | Constraints                                                          |
| --------------- | ------------ | ---- | ------------------- | -------------------------------------------------------------------- |
| `id`            | UUID         | no   | `gen_random_uuid()` | **PK**                                                               |
| `order_id`      | UUID         | no   | —                   | FK→`orders(id)` ON DELETE CASCADE                                    |
| `from_state`    | order_status | yes  | —                   | NULL on creation                                                     |
| `to_state`      | order_status | no   | —                   |                                                                      |
| `actor_user_id` | UUID         | yes  | —                   | FK→`users(id)` ON DELETE SET NULL (system actions may have no actor) |
| `actor_role`    | TEXT         | yes  | —                   | the role the actor used                                              |
| `reason`        | TEXT         | yes  | —                   | free text (e.g. reject/cancel reason)                                |
| `created_at`    | TIMESTAMPTZ  | no   | `now()`             |                                                                      |

- **Indexes:** `order_state_history (order_id, created_at)`.
- One row **per transition** (creation writes `from_state = NULL, to_state = pending_shop`).

---

## 4. Inventory & concurrency — preventing oversell

**Problem:** stock = 1; customers A and B both buy 1 simultaneously; both must not
succeed.

**Solution (atomic, no application-level locks):** at order creation, within a
single transaction, decrement each item with a **conditional UPDATE**:

```sql
UPDATE inventory
   SET quantity_available = quantity_available - :qty
 WHERE product_id = :product_id
   AND quantity_available >= :qty
```

- If `rowcount == 0` → stock was insufficient → raise `insufficient_inventory` →
  the whole transaction rolls back (no partial order, no partial deduction).
- `SELECT ... FOR UPDATE` is additionally taken on the inventory rows at the start
  of the critical section to serialize competing transactions on the same rows
  (belt-and-suspenders with the conditional UPDATE).
- **Reservation is not used in Phase 1a:** stock is deducted on order creation.
  On `rejected`/`cancelled` the quantities are **returned** to `quantity_available`
  in the same transaction that performs the transition.
- Cart mutations **never** touch inventory.

---

## 5. Cart model decisions

1. **One active cart per customer** (enforced by a partial unique index).
2. **Single-shop cart:** the cart is bound to a shop on the first item. Adding an
   item from a different shop is rejected with `cart_cross_shop` until the customer
   empties the cart. This keeps checkout = one order = one shop = one shopkeeper,
   matching neighbourhood-store behaviour and the simplest possible fulfillment.
   _(Multi-shop split-checkout is a deliberate future enhancement, not a Phase 1a need.)_
3. **Quantity validation:** `>= 1` at write; upper bound checked against available
   stock at **checkout** (not at add-to-cart, to avoid races).
4. **Inactive/changed product:** not auto-removed; validated at checkout.
5. **Price changes:** cart shows a snapshot; **checkout reads live server price**.

---

## 6. Order state machine (Phase 1a)

```
                  (creation) → PENDING_SHOP
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        ▼                            ▼                             ▼
    REJECTED                    ACCEPTED                       CANCELLED
   (shopkeeper,                 │                       (customer, restock)
    restock)                    │
                                 ├──→ PREPARING ──→ READY_FOR_PICKUP
                                 │     (shopkeeper)   (shopkeeper)
                                 ▼
                             CANCELLED
                       (customer, restock)
```

| Transition                     | Actor           | Condition                           | Restock?     | Reversible?   |
| ------------------------------ | --------------- | ----------------------------------- | ------------ | ------------- |
| `→ pending_shop`               | system (create) | cart valid, stock available         | no (deducts) | n/a           |
| `pending_shop → accepted`      | shopkeeper      | owns the shop                       | no           | no            |
| `pending_shop → rejected`      | shopkeeper      | owns the shop; `reason` recommended | **yes**      | no (terminal) |
| `pending_shop → cancelled`     | customer        | own order                           | **yes**      | no (terminal) |
| `accepted → preparing`         | shopkeeper      | owns the shop                       | no           | no            |
| `accepted → cancelled`         | customer        | own order                           | **yes**      | no (terminal) |
| `preparing → ready_for_pickup` | shopkeeper      | owns the shop                       | no           | no            |

- The `placed` enum value is reserved; creation collapses into `pending_shop` and
  records one history row (`from_state = NULL`). This avoids a meaningless
  auto-transition while preserving the documented vocabulary.
- **No transition is reversible.** Every transition appends a history row.
- Transitions are validated by a single `transition(event)` routine — clients
  never set `status` directly (Master Prompt §11).

---

## 7. Order creation — atomic sequence

```
authorize customer (JWT)
  → load customer's active cart (lock: SELECT ... FOR UPDATE)
  → fail if cart empty
  → validate address_id belongs to customer
  → for each cart_item: lock product + inventory (FOR UPDATE)
  → validate product.is_active, product.shop_id == cart.shop_id
  → conditional UPDATE inventory (decrement where available >= qty);
        if any rowcount == 0 → raise insufficient_inventory → ROLLBACK
  → read server prices; compute subtotal/total
  → INSERT order (status=pending_shop, address snapshot)
  → INSERT order_items (snapshots)
  → INSERT order_state_history (NULL → pending_shop)
  → delete cart_items; reset cart.shop_id = NULL
  → COMMIT
```

On any failure the transaction rolls back: **no partial order, no partial
inventory deduction.** Restock only happens on explicit reject/cancel transitions.

---

## 8. Indexes summary

Customer discovery: `shops(status)`, `shops(address_city)`, `products(shop_id, is_active)`.
Ownership lookups: `shops(owner_user_id)`, `orders(customer_user_id)`,
`orders(shop_id)`. Uniqueness: partial unique on active carts, `order_no`,
`users.phone/email` (partial), `(cart_id, product_id)`.

---

## 9. Migrations

Implemented in `backend/alembic/versions/<phase_1a>.py` (single migration):
creates all enums, tables, constraints, indexes, and `updated_at` triggers.
Verified with `alembic upgrade head` + `alembic downgrade -1` + `upgrade head`
against a real PostgreSQL 16 instance (see Final Report).

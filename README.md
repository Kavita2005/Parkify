# Parkify
Smart multi-vehicle parking: search, reserve, pay online, QR entry/exit, live availability, owner and admin dashboards.

**Stack:** Java 21 · Spring Boot · Spring Data JPA · Spring Security + JWT · PostgreSQL · WebSocket (STOMP) · Kafka (optional) · JUnit 5 + Mockito · Swagger ·
React · Vite · Tailwind CSS · Axios · Recharts · OpenStreetMap + Leaflet. Extras: lucide-react (icons), qrcode.react (QR codes), Razorpay (optional real payments).
No cloud, Docker or CI.

## Install first
Java 21, Maven, Node 20, PostgreSQL 14+.

## 1. Database (once)
```sql
CREATE USER parkify WITH PASSWORD 'parkify';
CREATE DATABASE parkify OWNER parkify;
```
Tables are created on first start. Other credentials? Set `DB_URL`, `DB_USER`, `DB_PASSWORD`.

## 2. Backend
```
cd backend
mvn spring-boot:run          # tests: mvn test
```
Swagger: http://localhost:8080/swagger-ui.html · WebSocket: ws://localhost:8080/ws

## 3. Frontend
```
cd frontend
cp .env.example .env         # Windows: copy .env.example .env
npm install
npm run dev
```
Open http://localhost:5173. The map uses OpenStreetMap: **no API key and no billing**, but you need an internet connection (map tiles and place search come from OpenStreetMap; keep place searches light, per their usage policy).

## Roles
| Role | How to get it | Sees |
|---|---|---|
| Driver | Sign Up → "Find and book parking" | Home, Find Parking, My Bookings (pay, QR passes, cancel), Pricing, About |
| Lot provider | Sign Up → "Provide parking" | My Lots (dashboard, add lots), Gate (scan passes, who is inside) |
| Admin | Created on first start: `admin@parkify.com` / `Admin@12345` (change with `ADMIN_EMAIL`, `ADMIN_PASSWORD`) | Admin (overview, approve/suspend lots, enable/disable users), Gate |

New lots from providers stay hidden until an admin approves them (Admin → Parking lots → Approve).

## Booking, payment and QR flow
1. Driver picks a space → slot is held for 10 minutes → driver pays online.
2. Paid → booking is Confirmed and an entry pass (QR + code) appears.
3. At the gate the provider scans (or types) the entry pass → Checked in; the driver then gets an exit pass.
4. On leaving, the provider scans the exit pass. If the driver stayed past the booked end, the gate shows **"Pay ₹X to exit"** and the vehicle is not released yet.
   The driver sees an **overstay box** on the booking (live minutes and fee), pays online (the payment covers the next 15 minutes so they can drive out), and the gate scans again → Completed.
   If the driver can't pay in the app, staff can choose **"Collected at gate: allow exit"**, which records a cash payment. Overstay fee = the space's hourly rate × minutes over.
5. Unpaid holds expire automatically. Cancelling a paid booking marks the payment refunded.

Payments: see **Real online payments** below.
Camera scanning uses the browser's built-in QR detector (Chrome). Other browsers can type the pass code.

## Real online payments (Razorpay)
Without keys the app uses a built-in **test gateway** (no money moves). With keys it switches to **real Razorpay checkout** automatically (UPI, cards, net banking).

1. Create a Razorpay account → Dashboard → Account & Settings → API Keys → generate **Test** keys (`rzp_test_...`). Test keys are a full integration with simulated money.
2. Set these environment variables before starting the backend (they are *not* read from `.env`):
   - macOS/Linux: `export RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx`
   - Windows PowerShell: `$env:RAZORPAY_KEY_ID="rzp_test_xxx"; $env:RAZORPAY_KEY_SECRET="xxx"`
   - IntelliJ: Run → Edit Configurations → Environment variables
3. Webhook (recommended; confirms a booking even if the browser closes): Razorpay Dashboard → Webhooks → add
   `https://<your-public-url>/api/v1/payments/webhook`, events `payment.captured` and `order.paid`, set a secret, then start the backend with `RAZORPAY_WEBHOOK_SECRET=<that secret>`.
   Razorpay can't reach `localhost`, so use a tunnel (for example ngrok) while testing locally.
4. Pay a booking. Use Razorpay's test card/UPI details from their docs.
5. **Going live (real money):** complete Razorpay's business verification (KYC) and activation, then swap in `rzp_live_...` keys and the live webhook. Use HTTPS in production.

Behaviour: the server creates the order and amount (never the browser), verifies Razorpay's signature before confirming, auto-refunds payments that arrive after the 10-minute hold expired, and requests a refund when a paid booking is cancelled (status `REFUND_PENDING` if Razorpay rejects the call; the admin overview shows payment counts).
Not included: payouts/splits to lot owners, receipts/GST invoices.

## No double booking
- **Same space:** two bookings can never overlap on one space, enforced by the database itself (PostgreSQL exclusion constraint), so simultaneous clicks are safe. Needs the `btree_gist` extension.
- **Same driver:** a driver can book as many spaces as they like (no limit). To forbid overlapping bookings per driver, set `BLOCK_USER_OVERLAP=true`.
- **Lead time:** a booking must start at least 15 minutes from now, so the driver can reach the lot (`MIN_LEAD_MINUTES`).
- **Gate timing:** the gate accepts an entry pass only from 15 minutes before the booked start to 15 minutes after it (`ENTRY_EARLY_MINUTES`, `NO_SHOW_GRACE_MINUTES`). An exit pass works only after entry.
- **Automatic no-show:** if the entry pass has not been scanned 15 minutes after the booked start, a background job (every 30 s) sets the booking to `NO_SHOW`. The payment is kept (there is no separate deposit: the amount paid is retained and never refunded), the space is released for other drivers, and the driver gets a notification. A scan inside the window never cancels the booking. Drivers see this policy before paying.
- **Slot map:** next to the map on Find Parking, the selected lot is drawn as a parking-lot diagram built from live booking data: green dashed bays are free, red bays hold a vehicle (booked), grey bays are unavailable. It follows the chosen time window and updates live; click a green bay to reserve that exact space. It is a generated diagram, not a surveyed floor plan or photo.
- **Early exit refund:** if the driver leaves before the booked end, the unused time (hourly rate x minutes left) is refunded. A background job issues the refund within minutes (always inside 2 hours of exit); the driver is notified. Bank crediting time after that depends on the bank.
- **Slot released on exit:** when the exit pass is scanned the booking is COMPLETED, which frees the space straight away for other drivers (screens update live).
- **Lot editing:** lot providers use "Edit lot" on My Lots to change name, address and map pin, set the price per vehicle type, switch spaces on or off (blocked while a space has upcoming bookings) and add spaces.
- **Slot picker:** the Reserve pop-up shows every space (CAR-1, CAR-2, 2W-1, ...) as a coloured tile for the chosen time: green = available, red = already booked, grey = unavailable. Tiles update live.

## API error format
Every error returns the same JSON, so the frontend can show `message` directly:
```json
{ "timestamp": "2026-11-02T09:05:00Z", "status": 409, "error": "CONFLICT", "message": "Space already booked for that time", "path": "/api/v1/bookings" }
```
Validation errors also include a `fields` map. Unexpected errors return a generic 500 message and are logged on the server only.

## Space names
New lots name their spaces by vehicle type: `CAR-1, CAR-2 ... 2W-1, 2W-2 ... EV-1 ... TRK-1 ... BUS-1 ... VAN-1 ... RV-1 ... CYC-1`.
To rename spaces of lots created earlier, run this once in pgAdmin on the `parkify` database:
```sql
WITH n AS (
  SELECT id,
    CASE vehicle_type WHEN 'TWO_WHEELER' THEN '2W' WHEN 'CAR' THEN 'CAR' WHEN 'SUV' THEN 'SUV' WHEN 'EV_CAR' THEN 'EV'
      WHEN 'TRUCK' THEN 'TRK' WHEN 'BUS' THEN 'BUS' WHEN 'VAN' THEN 'VAN' WHEN 'RV' THEN 'RV' WHEN 'CYCLE' THEN 'CYC' ELSE vehicle_type END AS p,
    row_number() OVER (PARTITION BY parking_lot_id, vehicle_type ORDER BY id) AS k
  FROM parking_spaces)
UPDATE parking_spaces s SET space_number = n.p || '-' || n.k FROM n WHERE n.id = s.id;
```

## Vehicle categories
Cars, two-wheelers, electric vehicles, trucks, buses, vans/tempo, RV/camper, bicycles. Each lot sets spaces and prices per category.

## Optional switches (environment variables)
`KAFKA_ENABLED=true` (publish booking events to a local Kafka)

## Not done yet
Attendant role (the lot provider scans at the gate), vehicle profiles and dimension checks, rate plans (daily/overnight), owner payouts, receipts,
reviews, audit log, trained forecast, integration/concurrency tests. Don't quote performance or accuracy numbers until measured.

## Security notes
Change `JWT_SECRET`, the admin password and the DB password for non-local use. Don't commit `.env`.

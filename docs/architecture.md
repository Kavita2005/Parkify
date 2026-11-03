# Architecture
React (Vite, Tailwind, Google Maps) ⇄ Spring Boot REST (/api/v1, JWT) ⇄ PostgreSQL.
Real-time: STOMP over WebSocket at /ws — public topic `/topic/availability`, private queue `/user/queue/notifications` (JWT on CONNECT).
Booking flow: validate → insert booking (PostgreSQL exclusion constraint blocks overlaps) in one transaction →
after commit, Spring events (a) broadcast availability over WebSocket, (b) save + push a notification.
Optional: KAFKA_ENABLED=true also publishes `booking-events` to Kafka through a transactional outbox.

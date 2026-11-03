
# 🚗 Parkify – Smart Multi-Vehicle Parking System

**Smart Parking. Easy Booking. Secure Entry.**

Parkify is a full-stack parking management platform that allows users to discover parking spaces, reserve slots, make online payments, and access parking through QR-based entry and exit. It supports multiple vehicle categories with real-time parking availability.

## ✨ Features

- 🔍 Search nearby parking locations.
- 🚘 Multi-vehicle parking support.
- 🅿️ Real-time parking slot availability.
- 📅 Parking reservation and booking management.
- 💳 Online payment integration with Razorpay.
- 📱 QR-based vehicle entry and exit.
- 👤 Driver dashboard.
- 🏢 Parking owner dashboard.
- 🛡️ Admin dashboard with parking approval.
- 🗺️ OpenStreetMap integration.
- ⚡ Live updates using WebSocket.
- 🔐 JWT authentication and role-based access.
- ⏱️ Overstay fee calculation and refund handling.

## 🛠️ Tech Stack

**Backend:** Java 21, Spring Boot, Spring Security, Spring Data JPA, JWT

**Frontend:** React, Vite, Tailwind CSS, Axios, Recharts

**Database:** PostgreSQL

**Real-Time:** WebSocket, STOMP

**Other Tools:** Swagger, JUnit 5, Mockito, Leaflet, OpenStreetMap, Razorpay (optional), Kafka (optional)

## 🏗️ Project Structure

```text
Parkify/
├── backend/
│   ├── src/
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Java 21
- Maven
- Node.js 20+
- PostgreSQL 14+

### 1. Clone Repository

```bash
git clone https://github.com/Kavita2005/Parkify.git
cd Parkify
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE USER parkify WITH PASSWORD 'your_password';
CREATE DATABASE parkify OWNER parkify;
```

Configure your backend database environment variables:

```text
DB_URL
DB_USER
DB_PASSWORD
```

### 3. Start Backend

```bash
cd backend
mvn spring-boot:run
```

Backend: http://localhost:8080

Swagger: http://localhost:8080/swagger-ui.html

### 4. Start Frontend

Open another terminal:

```bash
cd frontend
```

Create your environment file:

```bash
copy .env.example .env
```

Install dependencies:

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173

## 🚘 Supported Vehicles

- Cars
- Two-Wheelers
- Electric Vehicles
- SUVs
- Trucks
- Buses
- Vans / Tempos
- RVs / Campers
- Bicycles

## 🔄 How It Works

1. Driver searches for an available parking lot.
2. Selects vehicle type, parking space, and time.
3. Books the selected space.
4. Completes online payment.
5. Receives a QR entry pass.
6. Scans QR at the parking gate.
7. Scans the exit pass when leaving.
8. Booking is completed and the space is released.

## 🔐 Security

- Spring Security authentication.
- JWT-based authorization.
- Role-based access control.
- Backend payment verification.
- Environment-based secret configuration.

Never commit `.env` files, database passwords, JWT secrets, or payment credentials.

## 🚀 Future Enhancements

- Dedicated parking attendant role.
- Vehicle profiles and dimension checks.
- Daily and overnight pricing.
- Parking owner payouts.
- Reviews and ratings.
- Parking demand forecasting.



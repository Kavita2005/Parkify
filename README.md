
# Parkify – Smart Multi-Vehicle Parking Management System

Parkify is a full-stack smart parking management system developed using **Java 21, Spring Boot, Spring Data JPA, Spring Security, React.js, and PostgreSQL**. The system provides separate role-based functionality for **Drivers, Parking Lot Providers, and Admins** to manage parking lots, vehicle spaces, reservations, payments, and QR-based vehicle entry and exit.

## Project Overview

Parkify is designed to digitize and simplify parking discovery, reservation, and management across multiple vehicle categories.

The application provides real-time parking availability, online booking, payment integration, and QR-based entry and exit. It implements **role-based access control**, allowing drivers to reserve parking spaces, providers to manage parking operations, and administrators to approve parking lots and manage users.

## Features

### Driver

* Driver registration and login
* Search nearby parking locations
* View real-time parking availability
* Select vehicle category and parking space
* Book parking spaces for selected time slots
* Online payment integration
* Generate QR-based entry and exit passes
* View booking history and payment status
* Cancel eligible bookings
* View overstay charges
* Receive booking notifications
* View parking locations using OpenStreetMap

### Parking Lot Provider

* Provider registration and login
* Create and manage parking lots
* Add and manage parking spaces
* Configure prices for different vehicle categories
* Edit parking lot details and map locations
* View parking occupancy and booking information
* Scan QR codes for vehicle entry and exit
* Manually verify parking pass codes
* View vehicles currently inside the parking lot
* Manage parking space availability

### Admin

* Admin login and authentication
* View administrative dashboard
* View registered users
* Approve or suspend parking lots
* Enable or disable user accounts
* Manage parking lot approvals
* Monitor platform operations

## Technology Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* Tailwind CSS
* Axios
* Recharts
* Lucide React
* qrcode.react
* OpenStreetMap
* Leaflet

### Backend

* Java 21
* Spring Boot
* Spring MVC
* Spring Data JPA
* Hibernate
* Spring Security
* JWT Authentication
* REST APIs
* WebSocket
* STOMP
* Maven

### Database

* PostgreSQL
* SQL
* Database Constraints

### Payment Integration

* Razorpay (Optional)
* Built-in Test Payment Gateway

### Real-Time Communication

* WebSocket
* STOMP
* Apache Kafka (Optional)

### Testing

* JUnit 5
* Mockito

### Development Tools

* Git
* GitHub
* VS Code
* IntelliJ IDEA
* Postman
* Swagger / OpenAPI

## Project Architecture

```text
                       Parkify
                          |
             ┌────────────┴────────────┐
             |                         |
             ▼                         ▼
      React.js Frontend         Spring Boot Backend
             |                         |
             |        REST APIs        |
             └────────────┬────────────┘
                          |
                          ▼
                    Spring Security
                       + JWT
                          |
                          ▼
                    Spring Data JPA
                          |
                          ▼
                      PostgreSQL
                          |
             ┌────────────┴────────────┐
             |                         |
             ▼                         ▼
       WebSocket / STOMP        Razorpay Integration
             |
             ▼
      Live Availability Updates
```

## Role-Based Access

```text
                    ┌─────────────┐
                    │    Admin    │
                    └──────┬──────┘
                           |
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Manage Users  Approve Lots  Monitor System


                    ┌─────────────┐
                    │   Provider  │
                    └──────┬──────┘
                           |
                 ┌─────────┴─────────┐
                 ▼                   ▼
            Manage Lots         Gate Management
                 |
                 ▼
          Manage Parking Spaces


                    ┌─────────────┐
                    │    Driver   │
                    └──────┬──────┘
                           |
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Find Parking   Book Space   Make Payment
              |            |            |
              └────────────┼────────────┘
                           ▼
                    QR Entry / Exit
```

## Main Modules

### 1. Authentication & Authorization

The system provides secure authentication and role-based access using Spring Security and JWT.

User roles:

* Admin
* Parking Lot Provider
* Driver

Each role can access only the functionality permitted for that role.

### 2. Parking Lot Management

Parking providers can:

* Register and create parking lots.
* Add parking spaces.
* Configure vehicle-wise pricing.
* Update parking lot details.
* Manage parking space availability.

Newly created parking lots remain hidden until approved by an administrator.

### 3. Multi-Vehicle Parking Management

Parkify supports multiple vehicle categories:

* Cars
* Two-Wheelers
* Electric Vehicles
* SUVs
* Trucks
* Buses
* Vans / Tempos
* RVs / Campers
* Bicycles

Each parking lot can configure spaces and pricing for supported vehicle categories.

### 4. Parking Reservation

Drivers can search for parking spaces and reserve a specific space for a selected time window.

Features include:

* Time-based parking reservations.
* 10-minute temporary booking holds.
* Booking confirmation after successful payment.
* Prevention of overlapping bookings for the same parking space.
* Automatic expiration of unpaid holds.

### 5. Real-Time Parking Availability

The application uses WebSocket and STOMP to update parking availability without requiring manual page refreshes.

A generated parking-slot diagram displays:

* Green – Available spaces
* Red – Booked spaces
* Grey – Unavailable spaces

The diagram updates according to the selected booking time.

### 6. Payment Management

Parkify supports a built-in test payment gateway and optional Razorpay integration.

Features include:

* Online payment processing.
* Backend payment verification.
* Payment status tracking.
* Refund requests for eligible cancellations.
* Overstay fee calculation.
* Early-exit refund processing.
* Cash payment recording at the parking gate.

### 7. QR-Based Entry and Exit

The system generates QR passes for confirmed bookings.

* Entry QR verification.
* Exit QR verification.
* Manual pass code verification.
* Vehicle check-in and check-out.
* Booking completion after exit.

### 8. Parking Gate Management

Parking providers can manage vehicle entry and exit through the gate dashboard.

The system validates entry and exit passes and handles overstay payments before allowing vehicle release.

### 9. Map Integration

Parkify integrates OpenStreetMap and Leaflet for:

* Parking location discovery.
* Map-based parking search.
* Parking lot location markers.
* Map pin selection and editing.

No Google Maps API key or billing account is required.

## Booking Workflow

```text
Driver Searches Parking
          |
          ▼
Select Vehicle Category
          |
          ▼
Choose Available Space
          |
          ▼
Temporary Booking Hold
          |
          ▼
Complete Online Payment
          |
          ▼
Booking Confirmation
          |
          ▼
Generate Entry QR Pass
          |
          ▼
Scan at Parking Gate
          |
          ▼
Vehicle Checked In
          |
          ▼
Scan Exit QR Pass
          |
          ▼
Booking Completed
          |
          ▼
Parking Space Released
```

## CRUD Operations

Parkify implements CRUD functionality through REST APIs for major application entities.

Examples include:

* User management
* Parking lot management
* Parking space management
* Booking management
* Vehicle category management
* Payment management

## REST API

The React frontend communicates with the Spring Boot backend through REST APIs.

Main API areas include:

```text
/api/v1/auth
/api/v1/bookings
/api/v1/payments
/api/v1/admin
/api/v1/parking-lots
```

The exact endpoints depend on the backend implementation.

API documentation is available through Swagger UI.

## Database

The application uses **PostgreSQL** for persistent data storage.

Major entities include:

```text
User
ParkingLot
ParkingSpace
Booking
Payment
Vehicle
```

Relationships and persistence operations are managed using Hibernate and Spring Data JPA.

PostgreSQL database constraints help prevent overlapping reservations for the same parking space.

## Project Structure

```text
Parkify/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   ├── pom.xml
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

## How to Run the Project

### Prerequisites

* Java 21
* Maven
* Node.js 20+
* PostgreSQL 14+

### Backend – Spring Boot

Navigate to the backend directory:

```bash
cd backend
```

Run the application:

```bash
mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8080
```

Swagger Documentation:

```text
http://localhost:8080/swagger-ui.html
```

### Frontend – React.js

Open another terminal:

```bash
cd frontend
```

Create the environment file:

```cmd
copy .env.example .env
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### Database Configuration

Create a PostgreSQL database:

```sql
CREATE USER parkify WITH PASSWORD 'your_password';
CREATE DATABASE parkify OWNER parkify;
```

Configure the backend database connection using environment variables:

```text
DB_URL
DB_USER
DB_PASSWORD
```

Do not commit actual database credentials or sensitive environment variables to GitHub.

## Future Enhancements

* Dedicated parking attendant role.
* Vehicle profiles and dimension verification.
* Daily and overnight parking plans.
* Parking owner payouts.
* GST invoices and receipts.
* Parking reviews and ratings.
* Audit logs.
* Trained parking-demand forecasting.
* Integration and concurrency testing.

## Project Details

**Project:** Parkify – Smart Multi-Vehicle Parking Management System

**Year:** 2026

**Type:** Full Stack Web Application

### Technologies

`Java 21` `Spring Boot` `Spring Security` `JWT` `Hibernate` `React.js` `Vite` `PostgreSQL` `WebSocket` `STOMP` `REST API` `Razorpay` `Leaflet` `Git` `GitHub`

---

## Author

**Kavita Chimman**

* GitHub: https://github.com/Kavita2005
* LinkedIn: https://www.linkedin.com/in/kavitachimman

---

**Parkify – Smart Parking, Simpler Journeys.** 🚗

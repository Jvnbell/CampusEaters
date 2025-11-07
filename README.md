# Campus Food Delivery Robot

## Overview
This project aims to develop an autonomous food delivery robot to assist University of Tampa students—particularly those with mobility challenges—by delivering meals from dining halls directly to dorms. The solution integrates **hardware** (motors, sensors, chassis, food compartment) and **software** (navigation algorithms, database, web ordering system) to create a seamless and inclusive food delivery system.  

Our long-term goal is to demonstrate how robotics can improve **accessibility, independence, and convenience** at UTampa and college campuses at large.

---

## Features (Planned)
- **Autonomous Navigation**: Robot follows pre-defined routes and avoids obstacles using onboard sensors.  
- **Secure Food Compartment**: Lockable container to safely carry meals (up to ~5 lbs).  
- **Web Ordering System**: Students place delivery requests through a simple website.  
- **Order Tracking**: Real-time status updates (in development).  
- **Recipient Authentication**: PIN/QR-based unlocking system for secure delivery (future work).  

---

## Sprint Roadmap

### Semester 1
- **Sprint 1**: Wire motors, write PWM code, scaffold backend & website.  
- **Sprint 2**: Construct chassis, database setup, order placement.  
- **Sprint 3**: Construct power distribution system, simple order status updates, hardware stress test.  

### Semester 2
- **More to come**.   

---

## Tech Stack
**Hardware**
- Chassis 
- Motors (Greartisan DC 12V 100RPM Gear Motor x2)
- Motor Driver (DROK DC Motor Driver, L298 Dual H Bridge Motor Speed Controller)
- LIDAR for obstacle detection
- Arduino Mega for motor control
- Secure container (custom-built)

**Software**
- Backend: Node.js / Express (API for orders)
- Frontend: React (student order interface)
- Database: MongoDB
- Robot Control: Python (navigation, hardware integration)
- Communication: Wi-Fi for orders & status updates

---

## Team
- **Hardware Team - Michael Beehler, Javon Bell** – Chassis, motors, electronics, sensors  
- **Software Team - Endi Troqe, Maya Schroeder** – Robot navigation + API integration, Frontend ordering system  

---

## Goals
- Deliver a **functional prototype** by end of Semester 1.  
- Create a **reliable, accessible delivery system** by end of Semester 2.  
- Showcase how robotics can solve **real accessibility challenges** on campus.  

---

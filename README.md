# 🏪 KamiKamiKita - Advanced Fullstack POS & Backoffice System

![Project Status](https://img.shields.io/badge/Status-Deployed_on_VPS-success) 
![Tech Stack](https://img.shields.io/badge/Frontend-Next.js%20%7C%20Tailwind-blue)
![Tech Stack](https://img.shields.io/badge/Backend-Golang-cyan)

## 📌 Overview
KamiKamiKita is a comprehensive, production-ready Point of Sale (POS) and Backoffice management system designed specifically for F&B operations like coffee shops and slow bars. Built with a focus on real-world business logic, it handles everything from dynamic order queuing ("Bill Gantung") to secure employee management.

## ✨ Key Features
- **Smart Cashier (POS):** 
  - Streamlined transaction processing (Cash, QRIS, Transfer).
  - **"Bill Gantung" (Hold Bill):** Allows cashiers to hold incomplete orders (e.g., waiting for customers to decide) without blocking the queue.
  - Real-time cart calculation (Subtotal, Tax, Discounts).
- **Admin Backoffice Dashboard:**
  - Real-time sales recapitulation and profit tracking.
  - Product and inventory management (SKU, COGS/HPP, Selling Price, Stock).
  - Excel report generation for daily/monthly closing.
- **Advanced Employee Management:**
  - ✅ **Facial Recognition Attendance (Work in Progress):** UI and logic structure built for webcam-based clock-in/out. Currently working on stabilizing the camera API integration for the production environment.

## 🛠️ Tech Stack & Architecture
- **Backend:** Golang (RESTful API)
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Database / ORM:** PostgreSQL, Prisma ORM
- **Infrastructure:** Independently deployed on a Linux Virtual Private Server (VPS). 

## 💡 Engineering Highlights
1. **Concurrency & Performance:** The Golang backend is optimized to handle concurrent transaction requests during peak hours without data race conditions in stock management.
2. **Modern Frontend Integration:** The UI is built using server-side rendering (SSR) capabilities of Next.js, ensuring fast load times and a native-app feel for the cashier interface.
3. **Hardware Integration (WIP):** Structuring native browser integrations for webcam-based facial recognition.

---
*Built as a final showcase project during the Hacktiv8 Golang Bootcamp.*
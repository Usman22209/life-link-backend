# LifeLink Backend Service 🚀

This is the backend API service for **LifeLink** — built with [NestJS](https://nestjs.com) and [Supabase](https://supabase.com).

## 🛠️ API Modules & Architecture

* **Auth Module (`/auth`)**: Signup, login, Google OAuth, password reset, token refresh, and logout.
* **Profile Module (`/profile`)**: Fetch user profile, onboarding update, and notification/language settings.
* **Blood Request Module (`/blood-requests`)**: Feed pagination, urgent requests carousel, create request, my requests, details, and status updates.
* **Donations Module (`/donations`)**: Accept donation intent, donor log, request pledges, and unit status updates.
* **Chat Module (`/chat`)**: Chat threads and 1-on-1 message sending.
* **Notifications Module (`/notifications`)**: Alert inbox, unread counter, mark read, and OneSignal device push token registration.
* **File Storage Module (`/file`)**: Profile image upload and management.
* **Support Module (`/support`)**: FAQs and support ticket submission.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### 4. Run API Test Suite (33 Endpoints Verification)
```bash
node test-all-33-apis.js
```

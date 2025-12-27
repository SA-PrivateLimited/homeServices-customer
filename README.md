# Home Services Platform

A comprehensive home services platform with three separate applications (Customer, Provider, Admin) sharing a single Firebase backend.

## Project Structure

```
home-services/
├── HomeServices/           # Customer mobile app (Android + iOS)
├── HomeServicesProvider/   # Service provider mobile app (Android + iOS)
├── HomeServicesAdmin/      # Admin mobile app (Android + iOS)
├── ARCHITECTURE.md         # Complete technical documentation
└── README.md              # This file
```

## Three Applications

### 1. HomeServices (Customer App)
**Bundle ID:** `com.homeservices.customer`

**For:** Customers who need home services

**Features:**
- Browse service categories (Plumber, Electrician, Carpenter, AC Repair, etc.)
- Book services with auto-location detection
- Track service provider on map in real-time
- Multiple payment options (COD, UPI)
- Rate and review providers
- Service history

### 2. HomeServicesProvider (Service Provider App)
**Bundle ID:** `com.homeservices.provider`

**For:** Service providers (Plumbers, Electricians, etc.)

**Features:**
- Receive job requests with loud hooter sound (Uber/Ola style)
- Accept/Reject jobs with 30-second timeout
- Works even when phone is locked
- Online/Offline toggle
- Navigate to customer location
- Update job status
- View daily/weekly earnings
- Job history and statistics

**Critical Requirement:**
- High-priority FCM notifications
- Foreground service for Android
- Background audio for iOS
- Looping hooter sound until provider responds

### 3. HomeServicesAdmin (Admin App + Web Panel)
**Bundle ID:** `com.homeservices.admin`

**For:** Platform administrators

**Features:**
- Live dashboard of active jobs
- Monitor providers online/offline
- Manage service categories
- Manual job assignment
- Block/unblock providers
- Analytics and reports
- Commission settings
- Broadcast notifications

## Architecture Highlights

**Single Firebase Backend:**
- Shared Firestore database
- Shared Authentication (Phone OTP)
- Shared Cloud Functions
- Shared Cloud Messaging
- Role-based access control via security rules

**Separate Apps Benefits:**
- Tailored UX for each user type
- Smaller APK sizes (only include needed features)
- Independent update cycles
- Different permissions per app
- Better App Store presence

## Technology Stack

**Mobile Apps:**
- React Native
- TypeScript
- Firebase (Auth, Firestore, Storage, FCM)
- React Navigation
- Google Maps

**Backend:**
- Firebase Cloud Functions (Node.js/TypeScript)
- Firestore (NoSQL database)
- Firebase Cloud Messaging

**Admin Web Panel (Future):**
- Next.js 14
- Tailwind CSS
- Firebase Web SDK

## Quick Start

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio / Xcode
- Firebase CLI

### Installation

1. **Install dependencies for each app:**
```bash
cd HomeServices && npm install
cd ../HomeServicesProvider && npm install
cd ../HomeServicesAdmin && npm install
```

2. **Configure Firebase:**
- Add `google-services.json` to each app's `android/app/` directory
- Add `GoogleService-Info.plist` to each app's iOS directory

3. **Run the apps:**

**Customer App:**
```bash
cd HomeServices
npx react-native run-android
# or
npx react-native run-ios
```

**Provider App:**
```bash
cd HomeServicesProvider
npx react-native run-android
# or
npx react-native run-ios
```

**Admin App:**
```bash
cd HomeServicesAdmin
npx react-native run-android
```

## Key Differences from HomeServices

| Feature | HomeServices | Home Services |
|---------|----------|---------------|
| User Types | Patient, Doctor, Admin | Customer, Provider, Admin |
| Services | Medical consultations | Home services (Plumber, Electrician, etc.) |
| Booking | Appointment scheduling | Immediate + scheduled requests |
| Provider Notification | Normal priority | HIGH priority with hooter sound |
| Location Tracking | Not critical | Real-time tracking essential |
| Payment | Consultation fees | Service-based pricing |

## Role Mapping

| HomeServices | Home Services |
|----------|---------------|
| Patient | Customer |
| Doctor | Service Provider |
| Admin | Admin |
| Consultation | Service Request |
| Appointment | Job/Booking |

## Documentation

For complete technical details, see:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Full system architecture, database schema, security rules, implementation guide

## Implementation Status

- [x] Architecture design completed
- [x] Database schema defined
- [x] Security rules documented
- [x] FCM notification flow designed
- [x] Hooter implementation specified
- [ ] Customer app modifications
- [ ] Provider app modifications (high priority)
- [ ] Admin app modifications
- [ ] Cloud Functions deployment
- [ ] Testing
- [ ] Production deployment

## Next Steps

1. **Update Firebase Configuration**
   - Create new Firebase project for Home Services
   - Add three apps (Customer, Provider, Admin)
   - Deploy Firestore security rules

2. **Modify Customer App (HomeServices)**
   - Update bundle ID
   - Change patient → customer terminology
   - Replace doctor list with service categories
   - Implement service request flow

3. **Modify Provider App (HomeServicesProvider)** ⭐ PRIORITY
   - Update bundle ID
   - Change doctor → provider terminology
   - Implement hooter sound service (Android native)
   - Setup high-priority FCM
   - Add job accept/reject with timer
   - Implement online/offline toggle

4. **Modify Admin App (HomeServicesAdmin)**
   - Update bundle ID
   - Update terminology
   - Add service category management

## Critical Features to Implement

### Provider App Hooter (HIGHEST PRIORITY)

The hooter sound is the most critical feature:
- Must work when app is in background
- Must work when phone is locked
- Must bypass Do Not Disturb
- Must loop continuously until provider responds
- Must have full-screen notification

**Android Implementation:**
- Foreground Service (`JobNotificationService.java`)
- Wake Lock
- High-importance notification channel
- Background audio

**iOS Implementation:**
- Background audio capability
- `react-native-sound` with looping
- High-priority push notifications

## Support

For questions or issues:
1. Check [ARCHITECTURE.md](ARCHITECTURE.md)
2. Review HomeServices codebase (reference implementation)
3. Consult Firebase/React Native documentation

## License

Same as HomeServices project

---

**Created:** 2025-12-20
**Based on:** HomeServices Architecture
**Status:** Development

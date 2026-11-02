# SPEC.md — TripSplit Android Group Expense Management App

**Status: FINALIZED**
**Version: 1.0.0**
**Target: Android (Expo / React Native)**

---

## 1. Vision & Overview
TripSplit is a production-quality, offline-first Android group expense management application designed with Google Stitch's Material 3 design system. It eliminates group payment friction with real-time Firebase synchronization, a smart debt simplification graph engine, and native Indian UPI deep linking with QR scanning and generation.

---

## 2. Design System & Tokens (from Stitch Exports)
The visual identity follows Google Stitch Material You (M3) specifications:
- **Primary**: `#005138` (Active `#006C4C`), On-Primary: `#FFFFFF`, Container: `#006C4C`, On-Container: `#93EAC2`
- **Secondary**: `#6750A4` (Tonal Indigo), On-Secondary: `#FFFFFF`, Container: `#BBA2FD`, On-Container: `#4B3486`
- **Tertiary**: `#004E58` / `#006874`, Container: `#97E4F2`, On-Tertiary: `#FFFFFF`
- **Surface Elevation**:
  - `surface`: `#F3FCF4` (Canvas baseline)
  - `surface-container-lowest`: `#FFFFFF` (Cards, Inputs, Modals)
  - `surface-container-low`: `#EDF6EE`
  - `surface-container`: `#E7F0E9`
  - `surface-container-high`: `#E1EAE3`
  - `surface-container-highest`: `#DCE5DD`
- **Semantic**:
  - Positive/Credit ("You are Owed"): `#006C4C` (Mint Emerald), Container `#D6F5E8`
  - Negative/Debit ("You Owe"): `#BA1A1A` (Crimson), Container `#FFDAD6`
- **Typography**: Roboto Flex with M3 scales (`display-md`, `headline-sm`, `title-lg`, `title-md`, `body-lg`, `body-md`, `label-lg`, `label-md`).
- **Shapes**: `full` (9999px pill) for Buttons/Chips/Badges, `3xl` (28px) for Bottom Sheets, `2xl` (16–20px) for Cards.

---

## 3. Technology Stack & Dependencies
- **Framework**: React Native with Expo SDK 52+
- **Navigation**: Expo Router (typed file-based routes)
- **Language**: TypeScript (strict mode, zero unconstrained `any`)
- **Backend & Auth**: Firebase Auth, Cloud Firestore (offline persistence enabled), Firebase Storage
- **UI / Components**: React Native Paper (M3 provider), Vector Icons / Material Symbols, React Native Safe Area Context
- **Animation**: React Native Reanimated 3, React Native Gesture Handler
- **Media & Device Hardware**:
  - `expo-camera` (QR code scanning for UPI barcodes)
  - `expo-image-picker` (receipts & profile avatar uploads)
  - `react-native-qrcode-svg` (dynamic vector QR generation for UPI settlement)
- **Charts & Data Visualization**: `react-native-gifted-charts` with `react-native-svg` (smooth donut, bar, line charts responsive across Android screen sizes)
- **Testing**: Jest, `@testing-library/react-native` for unit testing the Calculation Engine & Debt Simplifier

---

## 4. Key Functional Modules & Features

### 4.1 Authentication & First-Time Setup Wizard
- Firebase Auth email/password, register, login, password reset, email verification check.
- Persistent session using AsyncStorage / Firebase Auth persistence.
- First-time wizard step-by-step modal for:
  - Full Name & Profile Photo upload
  - Country & Default Base Currency (INR, USD, EUR, GBP, etc.)
  - Preferred Language
  - Primary UPI ID (with manual entry or QR scanning)
- Cross-device login support (syncing user profile and linked trips).

### 4.2 Firebase Cloud Sync & Offline-First Architecture
- Cloud Firestore with offline cache enabled (`enableIndexedDbPersistence` / native cache).
- Local write queuing and automatic synchronization when network reconnects.
- Real-time snapshots on active trip ledgers and user settlements.
- Offline status badge in top app bar indicating Online/Syncing/Offline state.
- Security Rules: Member-only trip read/write access; Storage rules for user avatars and trip receipt images.

### 4.3 Trip & Participant Management
- Full CRUD for trips: Title, description, cover photo, start/end dates, base currency.
- Participants list: Add from email/contacts or manual name + UPI ID.
- Member stats: Total Paid, Total Share, Net Balance.

### 4.4 Expense Management
- Fields: Title, Amount, Currency, Date (fully editable with past date picker), Category, Paid By member, Split With (multi-select participants), optional description, receipt photo.
- Split Modes:
  - **Equally**: Divides total amount equally among selected participants.
  - **Unequally / Exact Amounts**: Custom amount per selected person.
  - **Percentages**: Percentage shares totaling 100%.
  - **By Shares**: Integer weight ratio (e.g. 1 share vs 2 shares).
- Pre-save live calculation preview: "Each pays ₹X", "You get back ₹Y".

### 4.5 Categories System
- 16 built-in categories: Food & Dining, Restaurant, Travel, Transport, Hotel & Accommodation, Tea & Coffee, Snacks, Shopping, Entertainment, Tickets, Fuel, Groceries, Medical, Parking, Drinks, Other.
- Custom categories: Name, icon name, theme color.
- Safe deletion preserving historical expenses.

### 4.6 Expense Calculation & Smart Debt Simplification Engine
- **Net Balance Formula**:
  $$\text{Net Balance}_i = \text{Total Amount Paid}_i - \text{Total Expense Share}_i$$
- **Minimum-Cash-Flow Simplification Algorithm**:
  Greedy priority queue / heap solver that pairs the largest debtor with the largest creditor, minimizing total transactions (e.g. turning 11 circular debts into 3 direct transfers).
- Partial settlement tracking, settlement history log, and status updates (Pending, Partially Paid, Settled).

### 4.7 UPI Integration (Very Important)
- **Save Member UPI**: Manual text validation (VPA regex `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`) or QR camera scanning extracting `pa` parameter from `upi://pay?pa=...`.
- **Automatic Payment QR Generation**: Vector SVG QR generated from formatted payload:
  `upi://pay?pa={UPI_ID}&pn={NAME}&am={AMOUNT}&cu=INR&tn={TRIP_NAME}%20Settlement`
- **Pay Now Deep Linking**:
  - Opens Android Intent chooser / deep link for `upi://pay?...` (Google Pay, PhonePe, Paytm, BHIM).
  - Safety rule: Does not automatically mark as paid on intent launch.
  - Manual "Mark as Paid" action with timestamp and settlement confirmation dialog.

### 4.8 Analytics & Visualization
- Category Distribution (Donut Chart with colored legend).
- Daily / Weekly / Monthly Spending Trend (Line Chart).
- Member Spending Contribution (Bar Chart).
- Filters: This Trip, Last 7 Days, This Month, All Time.
- Responsive, vertically scrollable without scroll conflicts.

### 4.9 Multi-Currency Support
- Real-time/cached exchange rates against Base Currency.
- Store original currency & converted base currency per expense.
- Never alter historical exchange rates of recorded expenses.

### 4.10 Activity History
- Real-time timeline feed recording: Trip created, Expense added/updated/deleted, Settlement recorded, Member joined.

---

## 5. Verification & Testing Criteria
1. **Mathematical Precision**: Calculation engine and debt simplifier verified with unit test suites.
2. **UPI Linkage**: Correct URI syntax generated, verified with sample inputs.
3. **Offline Sync**: Pending writes stored and synchronized upon online reconnect.
4. **Android Expo Go Compatibility**: Runs cleanly with `npx expo start` without native crash.

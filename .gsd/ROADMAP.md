# ROADMAP.md — TripSplit Android Group Expense Management App

## Phase Plan & Status

- [x] **Phase 1: Design Inspection & Asset Ingestion** (Stage 1)
  - Inspect Google Stitch screen exports (Home, Add Expense, Smart Settlement, Analytics, Profile, App Icon).
  - Extract Material 3 design tokens (`DESIGN.md`, colors, typography, shapes).

- [ ] **Phase 2: Expo Setup & Project Architecture** (Stage 2)
  - Initialize Expo React Native project with TypeScript and Expo Router.
  - Configure dependencies (React Native Paper, Reanimated, Gesture Handler, Expo Image Picker, Expo Camera, react-native-qrcode-svg, react-native-gifted-charts, react-native-svg, Firebase SDK).
  - Establish modular directory structure (`src/components`, `src/screens`, `src/services`, `src/engine`, `src/types`, `src/hooks`, `src/theme`).

- [ ] **Phase 3: Material 3 Design System & Shared Components** (Stage 3)
  - Configure M3 theme provider matching Stitch tokens.
  - Implement reusable components: `TopAppBar`, `BottomNavBar`, `M3Card`, `SegmentedPills`, `CategoryChip`, `AvatarStack`, `CurrencyInput`, `StatusBadge`, `ExtendedFAB`.

- [ ] **Phase 4: Firebase Authentication & Setup Wizard** (Stage 4)
  - Firebase config with environment variable fallback.
  - Auth services: Email/Password SignUp, SignIn, SignOut, Password Reset, Auth State Listener.
  - Setup Wizard modal: Name, photo, country, default currency, UPI ID.

- [ ] **Phase 5: Trip & Member Management** (Stage 5)
  - Trip CRUD with Firestore real-time listener.
  - Member management: Add member, assign UPI ID, remove member, participant avatar display.
  - Active vs Archived trips filter.

- [ ] **Phase 6: Expense Management & Calculation Engine** (Stage 6)
  - Expense modal/screen with past date support, category selector, receipt photo picker.
  - Split modes: Equal, Unequal, Percentage, By Shares.
  - Exact calculation engine: Total Paid, Total Share, Net Balance.
  - Unit tests for calculation accuracy and rounding precision.

- [ ] **Phase 7: Smart Debt Simplification Algorithm** (Stage 7)
  - Minimum Cash Flow algorithm implementation using min/max heaps.
  - Transaction reduction (e.g. from 11 payments to 3 transfers).
  - Unit tests verifying graph optimization with diverse group debt scenarios.

- [ ] **Phase 8: UPI Integration & Payment Flows** (Stage 8)
  - Camera QR scanner extracting `pa` from UPI QR codes.
  - Dynamic SVG QR code generator for settlement amounts (`upi://pay?pa=...`).
  - Native Android deep links for Google Pay, PhonePe, Paytm.
  - Manual "Mark as Paid" action with verification and confirmation.

- [ ] **Phase 9: Analytics Dashboard & Charts** (Stage 9)
  - Category distribution Donut chart with legend and percentages.
  - Monthly & Daily spending trend Line chart.
  - Member expenditure Bar chart.
  - Time filters: This Trip, This Month, All Time.

- [ ] **Phase 10: Multi-Currency & Exchange Engine** (Stage 10)
  - Currency conversion service with cached rates.
  - Historical rate locking per expense.
  - Base currency toggle in settings.

- [ ] **Phase 11: Offline-First Synchronization & Activity Feed** (Stage 11)
  - Firestore offline persistence & sync queue.
  - Online/Offline status banner.
  - Activity feed logging all group actions.
  - Firestore and Storage security rules definition.

- [ ] **Phase 12: End-to-End Testing & Verification** (Stage 12)
  - Run test suites for calculation engine and debt simplification.
  - TypeScript strict analysis check.
  - Expo Go readiness check (`npx expo start`).

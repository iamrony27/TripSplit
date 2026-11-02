# STATE.md — Current Session Memory

**Project**: TripSplit (Android Group Expense Management App)
**Status**: All 12 Phases Implemented & Empirically Verified
**Latest Commit**: `9750966` (`feat(phase-3): complete expo router screens, m3 stitch navigation, auth flow, and upi scanner`)

## Completed Milestones

1. **Design System & Asset Fidelity**:
   - Google Stitch tokens faithfully extracted and applied to `src/theme/` (colors, typography, shapes, paper theme).
   - All 6 Stitch screens mapped and realized with Material 3 styling.

2. **Core Computational Engines**:
   - `src/engine/expenseCalculator.ts`: Exact cent distribution across 4 split modes (Equal, Unequal, Percentage, By Shares) with zero floating point drift.
   - `src/engine/debtSimplifier.ts`: Minimum Cash Flow greedy matching algorithm reducing complex circular debts into minimum transfers.
   - 11 unit tests running in Jest (`PASS 11/11`).

3. **UPI Payment & QR System**:
   - `src/services/upi/upiParser.ts`: NPCI compliant parser for `upi://pay` URIs and VPA validation.
   - `src/services/upi/upiLauncher.ts`: Android deep linking to Google Pay, PhonePe, and Paytm.
   - `src/components/settlement/UpiQrModal.tsx`: Dynamic SVG QR code generator with NPCI URI payload.
   - `app/scan-qr.tsx`: Device camera QR scanner powered by `expo-camera` CameraView.

4. **Firebase Cloud Synchronization & Security**:
   - Firebase Authentication (Email/Password, Demo instant login, persistent sessions via AsyncStorage).
   - Cloud Firestore with `persistentLocalCache` for full offline-first durability and background sync.
   - `firestore.rules`: Scoped member authorization on trips, expenses, payments, and immutable audit logs.
   - `storage.rules`: Hardened image size and content-type validation for avatars and receipts.

5. **Screen Hierarchy (Expo Router)**:
   - `app/_layout.tsx`: Root providers and modal stacks.
   - `app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`.
   - `app/setup-wizard.tsx`: First-time setup wizard (photo, currency, UPI ID).
   - `app/(tabs)/index.tsx`: Stitch Screen 1 Home Dashboard (financial hero cards, quick action pills, recent expenses).
   - `app/(tabs)/trips.tsx`: Trip CRUD with search and switch-active capability.
   - `app/(tabs)/analytics.tsx`: Stitch Screen 4 Analytics & Breakdown (Bento summary, category donut, member bar, daily trend line charts).
   - `app/(tabs)/activity.tsx`: Group audit event timeline.
   - `app/(tabs)/profile.tsx`: Stitch Screen 5 Profile & Member UPI QR card with live QR matrix.
   - `app/trip/create.tsx`: Trip creator with base currency picker and participant onboarding.
   - `app/trip/[id].tsx`: Detailed trip view with member balance cards and expense ledger.
   - `app/trip/add-expense.tsx`: Stitch Screen 2 Add Expense & Split (live computed shares, 16 category pills, receipt picker).
   - `app/trip/settle.tsx`: Stitch Screen 3 Smart Settlement & UPI (debt reduction graph, Pay Now, Show QR, Mark as Paid).
   - `app/scan-qr.tsx`: Full-screen camera QR scanner.

## Empirical Verification Proof
- `npm test`: **11 passed, 0 failed, 2 test suites**.
- `npx tsc --noEmit`: **0 errors**.
- `npx expo export --platform android --no-bytecode`: **1834 modules bundled successfully**.

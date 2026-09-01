# Firebase Firestore Schema Documentation

This document describes the Firestore database structure used by the **Smart Event Management System**.

---

## Collections Overview

### 1. `users`
- **Document ID**: `string(id)` (e.g., `"1"`, `"2"`)
- **Fields**:
  - `id` (`int`): Sequential integer ID for compatibility.
  - `name` (`string`): Full name.
  - `registration_number` (`string|null`): Student registration number (Unique).
  - `department` (`string|null`): Department / Branch.
  - `semester` (`string|null`): Current semester.
  - `email` (`string`): User email address (Unique, lowercase).
  - `hashed_password` (`string`): Bcrypt hashed password.
  - `role` (`string`): `'student'`, `'faculty'`, or `'admin'`.
  - `profile_picture` (`string|null`): Path or URL to profile picture.
  - `is_email_verified` (`boolean`): Whether email OTP was verified.
  - `is_active` (`boolean`): Account active status.
  - `created_at` (`timestamp`): Account creation time.
  - `updated_at` (`timestamp`): Last profile update time.

---

### 2. `events`
- **Document ID**: `string(id)` (e.g., `"1"`, `"2"`)
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `title` (`string`): Event title.
  - `description` (`string`): Detailed description.
  - `category` (`string`): Event category (Technical, Cultural, Sports, etc.).
  - `venue` (`string`): Location / Hall / Auditorium.
  - `event_date` (`string`): ISO date (`YYYY-MM-DD`).
  - `event_time` (`string`): Time string (e.g., `10:00 AM`).
  - `poster_url` (`string|null`): Uploaded poster path.
  - `total_seats` (`int`): Total capacity.
  - `available_seats` (`int`): Remaining available seats.
  - `created_by` (`int|null`): Faculty/Admin user ID who created the event.
  - `organizer_name` (`string|null`): Cached creator name for fast retrieval.
  - `organizer_email` (`string|null`): Cached creator email.
  - `organizer_department` (`string|null`): Cached creator department.
  - `created_at` (`timestamp`): Creation time.
  - `updated_at` (`timestamp`): Last update time.

---

### 3. `registrations`
- **Document ID**: `string(id)`
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `event_id` (`int`): Event ID reference.
  - `student_id` (`int`): Student user ID reference.
  - `ticket_code` (`string`): Unique random ticket code.
  - `status` (`string`): `'registered'`, `'approved'`, `'cancelled'`, `'attended'`, `'completed'`.
  - `qr_code_path` (`string|null`): Path to generated QR code ticket image.
  - `registered_at` (`timestamp`): Registration timestamp.

---

### 4. `certificates`
- **Document ID**: `string(id)`
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `registration_number` (`string`): Student's registration number (Access control contract).
  - `event_id` (`int|null`): Optional associated event ID.
  - `title` (`string`): Certificate title (e.g., "1st Place - Web Dev Hackathon").
  - `file_path` (`string`): Server storage path to the certificate PDF/image.
  - `uploaded_by` (`int|null`): User ID of the faculty/admin who uploaded it.
  - `uploaded_at` (`timestamp`): Upload timestamp.

---

### 5. `notifications`
- **Document ID**: `string(id)`
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `user_id` (`int`): Target user ID.
  - `title` (`string`): Notification title.
  - `message` (`string`): Notification body text.
  - `type` (`string`): `'upcoming_event'`, `'certificate_uploaded'`, `'registration_approved'`, `'deadline_reminder'`, `'general'`.
  - `is_read` (`boolean`): Whether user marked it as read.
  - `created_at` (`timestamp`): Notification creation timestamp.

---

### 6. `password_resets` & `email_verifications`
- **Document ID**: `string(id)`
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `user_id` (`int`): User ID.
  - `otp_code` (`string`): 6-digit OTP.
  - `is_used` (`boolean`): Flag indicating if already redeemed.
  - `expires_at` (`timestamp`): Expiration datetime (typically 10 minutes).
  - `created_at` (`timestamp`): Creation timestamp.

---

### 7. `audit_logs`
- **Document ID**: `string(id)`
- **Fields**:
  - `id` (`int`): Sequential integer ID.
  - `user_id` (`int|null`): User ID if authenticated.
  - `action` (`string`): Action name (e.g., `'login_success'`, `'password_reset'`).
  - `entity_type` (`string|null`): e.g., `'user'`, `'event'`.
  - `entity_id` (`int|null`): Entity ID.
  - `ip_address` (`string|null`): Client IP address.
  - `details` (`string|null`): Optional context.
  - `created_at` (`timestamp`): Timestamp.

---

### 8. `_counters`
- **Document ID**: Collection name (e.g., `"users"`, `"events"`, `"registrations"`, etc.)
- **Fields**:
  - `current_id` (`int`): Current max sequential integer ID managed atomically via Firestore transactions.

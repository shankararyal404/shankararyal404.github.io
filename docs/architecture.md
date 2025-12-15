# System Architecture

## Overview
This project follows a serverless architecture using Firebase and a decoupled static frontend.

## Directory Structure
- **`public/`**: Static frontend (HTML/CSS/JS). Deployed to Firebase Hosting or Vercel.
- **`functions/`**: Backend business logic hosted on Firebase Cloud Functions.
- **`admin/`**: Single Page Application for content management.
- **`assets/`**: Shared static assets (images, icons).

## Tech Stack
- **Frontend**: Vanilla JS (ES Modules), Modular CSS.
- **Backend**: Node.js (Firebase Functions).
- **Database**: Cloud Firestore (NoSQL).
- **Storage**: Firebase Storage (Media), Cloudflare R2 (Large files).

## Data Flow
1. User loads `public/index.html`.
2. JS fetches data from `api.js` (currently mock, will point to Firestore).
3. Admin uses `admin/index.html` to authenticate and write to Firestore/Storage via Backend Functions.

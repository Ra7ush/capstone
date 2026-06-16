# Capstone API — Postman Testing Guide

## How to Fix the "Unauthorized" Error

The error `"Unauthorized: No valid authentication token provided."` happens because all API routes require a **Bearer Token** in the request header. This token comes from Supabase Auth when a user logs in.

**The fix:** You must first call the **Login** request to get a token, and all other requests will automatically use it.

---

## Quick Start (3 Steps)

### Step 1: Import the Collection
1. Open **Postman**
2. Click **Import** (top-left)
3. Select the file: `backend/Capstone_API_Postman.json`

### Step 2: Set Your Login Credentials
1. Open the **"Auth - Login"** request (first request in the collection)
2. Go to the **Body** tab
3. Replace `YOUR_EMAIL` and `YOUR_PASSWORD` with your real account credentials
4. Click **Send**

> ✅ If successful, the token is **automatically saved** to the collection. You do NOT need to copy/paste anything.

### Step 3: Test Any Route
Click on any other request in the collection and hit **Send**. They will all work because the token is injected automatically via the collection-level Bearer Token setting.

---

## How It Works

- The **"Auth - Login"** request calls Supabase's auth endpoint to get a JWT token
- A **Post-response script** automatically saves the `access_token` and `user_id` to collection variables
- Every other request inherits **Bearer Token** auth from the collection, using the saved `auth_token` variable
- Routes that need a user ID use the saved `{{user_id}}` variable

---

## If the Token Expires

Tokens expire after ~1 hour. If you start getting 401 errors again, simply:
1. Go back to **"Auth - Login"**
2. Click **Send** again
3. Continue testing

---

## Collection Contents (44 Requests)

| Category       | Requests Included                                      |
|----------------|--------------------------------------------------------|
| Auth           | Login & Get Token                                      |
| Admin          | Verify, Dashboard, Health, Users, Payouts, Moderations |
| Profile        | My Profile, User by ID, Posts, Search, Notifications   |
| Community      | Discover, Joined, Feed, Create Post                    |
| Follow         | Suggested, Followers, Following                        |
| Creator        | Verification Status, Profile, Stats, Activity          |
| Service        | Get All, Get Mine                                      |
| Message        | Conversations, Requests, Count                         |
| Purchase       | Get Purchases                                          |
| Subscription   | Plans, My Subscription                                 |
| Block          | Blocked Users List                                     |
| Notifications  | Get All, Unread Count                                  |
| Reviews        | Create Review                                          |
| Moderation     | Submit Report                                          |
| AI             | Recommendations, Chat, Smart Search                    |
| Health         | Health Check (no auth needed)                          |

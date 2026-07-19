# HomeRun Developer Setup Guide

This guide is for setting up the HomeRun project locally so you can run the app, edit code, test changes, and push updates safely.

---

# 1. Required Downloads

Before opening the project, install the following:

## Node.js

Install the LTS version of Node.js.

After installing, check it in your terminal:

```bash
node -v
npm -v
```

Both commands should print version numbers.

---

## Git

Install Git.

Check it with:

```bash
git --version
```

---

## Visual Studio Code

Install VS Code.

Recommended extensions:

```txt
Prettier - Code formatter
ES7+ React/Redux/React-Native snippets
Expo Tools
GitLens
```

---

## Expo Go

Install Expo Go on your phone from the App Store or Google Play Store.

This lets you run the app on your phone while developing.

---

# 2. Download the Project

Open a terminal and go to the folder where you want the project.

Example:

```bash
cd Desktop
```

Clone the repo:

```bash
git clone REPLACE_WITH_REPO_LINK
```

Go into the project folder:

```bash
cd REPLACE_WITH_PROJECT_FOLDER_NAME
```

Open it in VS Code:

```bash
code .
```

---

# 3. Install Project Packages

Inside the project folder, run:

```bash
npm install
```

Then install Expo-compatible native packages:

```bash
npx expo install
```

If a specific package is missing later, install it with:

```bash
npm install package-name
```

For Expo packages, use:

```bash
npx expo install package-name
```

---

# 4. Create the `.env` File

In the root of the project, create a file named:

```txt
.env
```

It should be in the same area as `package.json`.

Add:

```env
EXPO_PUBLIC_SUPABASE_URL=REPLACE_WITH_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_SUPABASE_ANON_KEY
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=REPLACE_WITH_GOOGLE_MAPS_API_KEY
```

Ask for the actual values. Do not guess them.

After creating or editing `.env`, restart Expo with:

```bash
npx expo start -c
```

---

# 5. Start the App

Run:

```bash
npx expo start
```

Scan the QR code with Expo Go.

If the app acts weird, does not update, or shows old code, restart with:

```bash
npx expo start -c
```

---

# 6. Basic File Structure

Important folders:

```txt
app/
  Main screens and routes.

lib/
  Supabase setup and helper files.

assets/
  Images, logos, and static files.

.env
  API keys and environment variables.

package.json
  Project package list and scripts.
```

This app uses Expo Router.

That means files in `app/` become routes.

Example:

```txt
app/privacy-policy.tsx
```

is opened with:

```tsx
router.push("/privacy-policy")
```

---

# 7. How to Edit Safely

Before editing anything, pull the latest code:

```bash
git pull
```

Create your own branch:

```bash
git checkout -b your-name-feature-name
```

Example:

```bash
git checkout -b teammate-post-task-fix
```

Make changes.

Test the app.

Then commit:

```bash
git add .
git commit -m "Describe the change"
git push
```

Do not push straight to `main` unless the team agrees.

---

# 8. Important Rules

Follow these rules while editing:

```txt
Do not delete files unless you know they are unused.
Do not rename routes without updating router.push links.
Do not change database table or column names without checking first.
Do not change Supabase RLS policies without checking first.
Do not commit the .env file.
Test both customer and worker flows after major changes.
```

---

# 9. Common Commands

Start app:

```bash
npx expo start
```

Start app and clear cache:

```bash
npx expo start -c
```

Install dependencies:

```bash
npm install
```

Check Git status:

```bash
git status
```

Pull latest code:

```bash
git pull
```

Create branch:

```bash
git checkout -b branch-name
```

Commit changes:

```bash
git add .
git commit -m "message"
git push
```

---

# 10. Common Issues

## The app will not update

Run:

```bash
npx expo start -c
```

---

## The app cannot connect to Supabase

Check that `.env` exists and has:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Then restart Expo:

```bash
npx expo start -c
```

---

## Google Places or address autocomplete does not work

Check that `.env` has:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Also make sure the Google Cloud project has Places API enabled.

Restart Expo after changing the key:

```bash
npx expo start -c
```

---

## Worker sees no tasks

Check:

```txt
The task status is open.
The task has latitude and longitude.
The task has location filled.
The worker allowed location permission.
The worker radius is large enough.
```

---

## A route does not work

Example:

```tsx
router.push("/worker-home")
```

requires this file:

```txt
app/worker-home.tsx
```

Check spelling carefully.

---

# 11. Location System Notes

The location system uses:

```txt
Google Places API
Expo Location
Supabase PostGIS
```

Google Places gets task address coordinates.

Expo Location gets the worker's current phone location.

Supabase PostGIS filters tasks by radius.

The worker location is temporary. It is not permanently stored.

The task location is stored in the `tasks` table.

Important task columns:

```txt
address
latitude
longitude
place_id
location
```

---

# 12. Before Making a Feature

Before starting a feature, check:

```txt
Which screen file is involved?
Which Supabase table is involved?
Does the feature affect customer, worker, or both?
Does the route already exist?
Does the database already have the needed columns?
```

Make small changes and test often.

---

# 13. What Not to Touch Without Checking

Do not change these without asking first:

```txt
Supabase table names
Supabase column names
RLS policies
Auth flow
Payment flow
Agreement confirmation flow
Worker/customer role routing
.env variable names
```

These parts affect many screens.

---

# 14. Testing Checklist

After making changes, test:

```txt
Can the app open?
Can customer login work?
Can worker login work?
Can customer post a task?
Can worker see nearby tasks?
Can navigation still move between screens?
Did the terminal show any red errors?
```

For location changes, also check Supabase:

```txt
tasks.latitude
tasks.longitude
tasks.location
tasks.status
```

---

# 15. Final Setup Checklist

A new developer is ready when they can:

```txt
Clone the repo
Install dependencies
Create .env
Run npx expo start
Open app in Expo Go
Login with a test account
Edit a screen
See the change on their phone
Create a branch
Push a commit
```

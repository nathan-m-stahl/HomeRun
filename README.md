# HomeRun

HomeRun is an Expo React Native app for a local task marketplace.

Customers can post home tasks, and workers can view nearby jobs, send requests, message customers, track jobs, and manage completed work.

This guide explains how to download, open, run, and edit the project from the beginning.

---

# 1. Install the Required Programs

Before opening the project, install these programs.

---

## Install VS Code

VS Code is the code editor used to edit the app.

Download it here:

https://code.visualstudio.com/

After installing VS Code, open it once to make sure it works.

Recommended VS Code extensions:

- Prettier - Code formatter
- ES7+ React/Redux/React-Native snippets
- GitLens
- Expo Tools

To install extensions:

1. Open VS Code
2. Click the Extensions icon on the left side
3. Search for the extension name
4. Click Install

---

## Install Node.js

Node.js allows the app to install and run JavaScript packages.

Download the LTS version here:

https://nodejs.org/

After installing Node.js, check that it worked.

Open a terminal and run:

```bash
node -v
npm -v
```

Both commands should show version numbers.

---

## Install Git

Git is used to download the project from GitHub and save code changes.

Download Git here:

https://git-scm.com/downloads

After installing Git, check that it worked:

```bash
git --version
```

It should show a Git version number.

---

# 2. Download the Project from GitHub

Open a terminal.

A terminal is where you type commands.

On Windows, you can use:

- PowerShell
- Command Prompt
- VS Code Terminal

Choose a place on your computer where you want the project folder.

Recommended location:

```txt
C:\Projects
```

Avoid putting coding projects inside OneDrive if possible.

Go to that folder:

```bash
cd C:\
mkdir Projects
cd Projects
```

Now clone the project:

```bash
git clone https://github.com/nathan-m-stahl/HomeRun.git
```

Go into the project folder:

```bash
cd HomeRun
```

---

# 3. Open the Project in VS Code

From inside the `HomeRun` folder, run:

```bash
code .
```

This opens the project in VS Code.

If `code .` does not work:

1. Open VS Code manually
2. Click File
3. Click Open Folder
4. Select the `HomeRun` folder

---

# 4. Understand the VS Code Layout

When the project opens, the left side shows the file explorer.

Important folders and files:

```txt
app/                  Main app pages and screens
assets/               Images, logos, icons, and app pictures
components/           Reusable UI components
lib/                  Shared helper files, including Supabase setup
app.json              Expo app configuration
package.json          Project dependencies and scripts
README.md             This setup guide
```

Most screen editing happens inside the `app` folder.

Examples:

```txt
app/post-task.tsx              Post a new task page
app/login.tsx                  Login page
app/(tabs)/customer-home.tsx   Customer home page
app/(tabs)/worker-home.tsx     Worker home page
app/worker-task-details.tsx    Worker task details page
```

---

# 5. Open the Terminal in VS Code

In VS Code:

1. Click Terminal at the top
2. Click New Terminal

A terminal should open at the bottom of VS Code.

Make sure the terminal is inside the project folder.

It should look something like:

```txt
C:\Projects\HomeRun>
```

If it is not inside the project folder, run:

```bash
cd C:\Projects\HomeRun
```

---

# 6. Install Project Dependencies

Before running the app for the first time, install the project packages.

Run:

```bash
npm install
```

This creates a `node_modules` folder.

Do not edit or upload `node_modules`.

It is generated automatically.

---

# 7. Create the .env File

This app needs environment variables for Supabase and Google Maps.

Create a file in the main project folder called:

```txt
.env
```

Add this inside it:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Replace the example values with the real keys.

Important:

```txt
Never upload .env to GitHub.
```

The `.gitignore` file should include:

```gitignore
.env
node_modules/
.expo/
```

---

# 8. Start the App

In the VS Code terminal, run:

```bash
npx expo start
```

Expo will start the development server.

You will see a QR code in the terminal.

To open the app on your phone:

1. Install Expo Go from the App Store or Google Play Store
2. Make sure your phone and computer are on the same Wi-Fi
3. Scan the QR code
4. The app should open on your phone

If the app acts weird after code changes, restart Expo with a cleared cache:

```bash
npx expo start -c
```

---

# 9. How to Edit the Code

Most app screens are inside the `app` folder.

For example, to edit the customer home page:

1. Open the `app` folder
2. Open the `(tabs)` folder
3. Open `customer-home.tsx`
4. Make your changes
5. Save the file

To save a file:

```txt
Ctrl + S
```

On Mac:

```txt
Command + S
```

After saving, Expo usually refreshes the app automatically.

---

# 10. Basic React Native Editing

React Native uses components like:

```tsx
<Text>Hello</Text>
```

for text.

```tsx
<TouchableOpacity>
  <Text>Button</Text>
</TouchableOpacity>
```

for buttons.

```tsx
<View>
  ...
</View>
```

for containers.

Styles are usually at the bottom of the file:

```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#1F7A4D",
  },
});
```

If you want to change how something looks, check the `styles` section.

---

# 11. Common Files to Edit

## Customer Home

```txt
app/(tabs)/customer-home.tsx
```

This controls the customer homepage.

It shows:

- Active tasks
- Worker requests
- Upcoming jobs
- Quick actions

---

## Worker Home

```txt
app/(tabs)/worker-home.tsx
```

This controls the worker homepage.

It shows:

- Available nearby tasks
- Distance from worker location
- Worker stats
- Quick actions

---

## Post Task Page

```txt
app/post-task.tsx
```

This controls the form customers use to post new tasks.

It includes:

- Task title
- Description
- Category
- Payment type
- Address autocomplete
- Date and time
- Supabase insert logic

---

## Supabase Setup

```txt
lib/supabase.ts
```

This connects the app to Supabase.

Do not edit this unless the Supabase setup changes.

---

# 12. How to Stop the App

In the terminal where Expo is running, press:

```txt
Ctrl + C
```

If it asks if you want to terminate the batch job, type:

```txt
y
```

Then press Enter.

---

# 13. Useful Terminal Commands

Start the app:

```bash
npx expo start
```

Start the app and clear cache:

```bash
npx expo start -c
```

Install packages:

```bash
npm install
```

Check Git status:

```bash
git status
```

Download the newest code from GitHub:

```bash
git pull origin main
```

Save your changes locally:

```bash
git add .
git commit -m "Describe what you changed"
```

Upload your changes to GitHub:

```bash
git push
```

---

# 14. GitHub Safety Rules

Never upload these:

```txt
.env
node_modules/
.expo/
```

Before every commit, run:

```bash
git status
```

Make sure `.env` is not listed.

If `.env` is accidentally staged, run:

```bash
git rm --cached .env
```

This removes it from Git tracking but keeps it on your computer.

---

# 15. Normal Beginner Workflow

When starting work:

```bash
git pull origin main
```

Then start the app:

```bash
npx expo start
```

Edit files in VS Code.

After making changes, check what changed:

```bash
git status
```

Save the changes to Git:

```bash
git add .
git commit -m "Describe your changes"
```

Push the changes to GitHub:

```bash
git push
```

---

# 16. If Something Breaks

First, try restarting Expo:

```bash
npx expo start -c
```

If packages seem broken, try:

```bash
npm install
```

If the app shows an error, read the red error screen carefully.

The most useful information is usually:

- File name
- Line number
- Error message

Example:

```txt
Cannot find name 'onRefresh'
```

That means the code is trying to use something that has not been created or imported yet.

---

# 17. Important Notes

This app uses:

- Expo
- React Native
- Expo Router
- Supabase
- Google Places API
- PostGIS location filtering

Task addresses are selected with Google Places autocomplete.

Worker distance is calculated using stored task latitude and longitude.

The worker homepage uses the worker’s current GPS location to show nearby tasks.

---

# 18. Quick Start Summary

For someone opening the project for the first time:

```bash
git clone https://github.com/nathan-m-stahl/HomeRun.git
cd HomeRun
npm install
```

Create the `.env` file.

Then run:

```bash
npx expo start
```

Open the app with Expo Go.

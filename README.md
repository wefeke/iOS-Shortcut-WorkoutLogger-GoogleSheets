# Google Sheets Workout Logger: API & iOS Shortcut

This repository contains all the components needed to turn a simple Google Sheet into a powerful, private workout tracker.

It consists of two parts:

1.  **A Backend API:** A Google Apps Script that runs on your Google Sheet, exposing it as a secure web API.
2.  **A Frontend Shortcut:** An iOS Shortcut that provides a user-friendly interface to talk to your API, letting you view a daily dashboard and log new sets.

-----

## Part 1: How It Works - The Google Sheet Backend

The core of this project is a Google Apps Script that you install on your Google Sheet. This script acts as a mini-server. When you send it a request (a URL), it runs a function. This function can read data from your sheet (like finding your PR) or write new data to it (like logging a new set).

This allows your private sheet to act like a custom database without any public-facing servers.

### Required Table Structure

To use this project, your Google Sheet **must** have a sheet (tab) with the following columns in this specific order. The header names (e.g., `Date`) don't matter, but the column *order* does.

| Column A | Column B | Column C | Column D | Column E |
| :--- | :--- | :--- | :--- | :--- |
| `Date` | `Exercise` | `Weight` | `Set` | `Note` |

  * **Date (A):** Will be auto-filled by the API in `M/d/yyyy` format.
  * **Exercise (B):** The name of the exercise (e.g., "Brustpresse"). This *must exactly match* the names you define in your iOS Shortcut.
  * **Weight (C):** The weight used (e.g., `80`).
  * **Set (D):** The set number (e.g., `1`, `2`, or `3`).
  * **Note (E):** Any optional notes for your set.

-----

## Part 2: API Setup & Deployment

This part explains how to install and configure the backend code.

### Step 2.1: Insert the Code

1.  Open the Google Sheet you want to use as your database.
2.  Go to **Extensions** \> **Apps Script**. This will open a new browser tab with the script editor.
    <img width="1386" height="276" alt="CleanShot 2025-10-25 at 20 25 34@2x" src="https://github.com/user-attachments/assets/d9ab21cb-c2be-418d-8924-6de5a4f1e653" />
3.  Delete function myFunction() {} in the `Code.gs` file.
    ![connecting-google-sheets-shortcuts-v0-dfpjqlxtf6rd1 png](https://github.com/user-attachments/assets/8b2e2597-3fe0-4b1a-be0a-9502dd221819)

5.  Copy the entire contents of the [Code.gs](Code.gs) file from this repository and paste it into the empty editor.

### Step 2.2: Configure the Script

At the very top of the `Code.gs` file, you will find the **Personal Configuration Section**. You must change these values to match your setup.

```javascript
/*
=================================================================
== YOUR PERSONAL CONFIGURATION SECTION ==
=================================================================
*/

// 1. Your Google Sheet ID (from the URL)
const SPREADSHEET_ID = <img width="1298" height="276" alt="CleanShot 2025-10-25 at 20 25 06@2x" src="https://github.com/user-attachments/assets/01a2e6e9-753c-4f80-94c2-29569c75f1da" />
"1f_XG_yZjM0yhskRnvGLo5jc3mjTjd3rz2zmv7YShdnQ";

// 2. The name of the specific sheet (tab at the bottom)
const SHEET_NAME = "Kennet";

// 3. Your Timezone (IMPORTANT for "today's" date)
const TIME_ZONE = "Europe/Berlin";

// 4. How many sets per exercise is your goal?
const TARGET_SETS = 3;
```

  * `SPREADSHEET_ID`: Get this from your Google Sheet's URL. It's the long string of characters in the middle: `.../spreadsheets/d/`**`[THIS_IS_THE_ID]`**`/edit...`
  * `SHEET_NAME`: The name of the tab at the bottom of your sheet (e.g., "Workouts", "Kennet").
  * `TIME_ZONE`: This is critical for the tracking logic. The script uses this to determine what "today" is. (Examples: `"America/New_York"`, `"Europe/London"`).
  * `TARGET_SETS`: The number of sets you aim to complete for an exercise each day (e.g., `3`).

### Step 2.3: How the API Tracks Data

This script is designed to be a *daily* dashboard. The tracking logic is based on your `TIME_ZONE` and `TARGET_SETS` settings.

  * When you request your dashboard, the `getDashboardData` function scans all entries in your sheet.
  * It counts how many rows have an **`Exercise`** name that matches your request AND a **`Date`** that matches today (based on your `TIME_ZONE`).
  * It then subtracts this count from your `TARGET_SETS` to get `remainingSets`.
  * If `remainingSets` is 0, the exercise is considered "complete" and is filtered out of the response.

### Step 2.4: API Endpoints (Functions)

The script has two main functions (endpoints) you will use:

1.  **`addTransaction` (action=add)**

      * **Input Parameters:** `exercise`, `weight`, `set`, `note` (optional).
      * **Output:** A simple JSON object confirming success or error.
      * **What it does:** Adds a new row to your sheet with the current date and the data you provided.

2.  **`getDashboardData` (action=getDashboardData)**

      * **Input Parameters:** `exercises` (a single, comma-separated string of all exercise names you want to check).
      * **Output:** A complex JSON object containing your dashboard. The object's keys are the exercise names, allowing for easy data lookup.
      * **What it does:** For every *unfinished* exercise, it calculates and returns:
          * `pr`: Your all-time max weight (Personal Record).
          * `remainingSets`: How many sets are left today.
          * `nextSetNumber`: The number for the next set (e.g., if you've done 1 set, this will be `2`).
          * `lastSets`: An array of the last 3 sets you logged for that exercise.

### Step 2.5: Deploy the API

This is the final, most important step to get your API URL.

1.  In the Apps Script editor, click the blue **"Deploy"** button (top-right).
2.  Select **"New deployment"**. 
* ![connecting-google-sheets-shortcuts-v0-qu3chsz9i6rd1 png](https://github.com/user-attachments/assets/06b02d02-c56f-47eb-90d6-74528892c1c0)
4.  Click the "Select type" gear icon (left) and choose **"Web app"**.
* ![connecting-google-sheets-shortcuts-v0-tnw2jcdfi6rd1 png](https://github.com/user-attachments/assets/5359708d-f570-4eb5-847f-fddc9c555be5)
5.  In the "Who has access" dropdown, select **"Anyone"**.
* NOTE/DISCLAIMER - Adjusting this setting so ANYone can access this carries some (albeit small) amount of risk. You are making it so that anyone with the link can hit your endpoint. However, this step is required for the solution to work. DO NOT share the URL for your script with anyone.
* ![connecting-google-sheets-shortcuts-v0-mhj89vkri6rd1 png](https://github.com/user-attachments/assets/e9629491-60e7-4737-ac52-1b01286fd316)
6.  Click **"Deploy"** and authorize access.
* ![connecting-google-sheets-shortcuts-v0-f1tw7edsj6rd1 png](https://github.com/user-attachments/assets/dd817921-7e1a-4009-91b8-8328ec338ae7) ![connecting-google-sheets-shortcuts-v0-1salvno2k6rd1 png](https://github.com/user-attachments/assets/eb716ec9-648e-4a17-b2ab-0e88a87f18f5) ![connecting-google-sheets-shortcuts-v0-ry0qzwrbk6rd1 png](https://github.com/user-attachments/assets/73ddbc15-a666-4af1-b426-bd399bc0c582)
7.  It will process and then show a **"Web app URL"**. **Copy this URL.** This is the `yourAppURL` you will need for Part 3.
* ![connecting-google-sheets-shortcuts-v0-ukidd48tk6rd1 png](https://github.com/user-attachments/assets/dd1c3e5b-9d10-4fb6-b733-69061d5b31bb)


-----

## Part 3: iOS Shortcut Setup

This is the frontend client that gives you a nice interface for your new API.

### Step 3.1: Download the Shortcut

You can download the pre-built iOS Shortcut here:

**[SHORTCUT](https://www.icloud.com/shortcuts/f99706cf344a472685b915d40c666c24)**

### Step 3.2: Configure the Shortcut

Once downloaded, you must configure it to point to your new, personal API.

1.  Open the **Shortcuts** app on your iPhone or Mac.

2.  Find the downloaded shortcut and tap the "..." (three dots) to edit it.

3.  At the very top of the script, you will find two **"Text"** fields. You MUST change them.

      * **`yourAppURL`**

          * <img width="1242" height="312" alt="CleanShot 2025-10-25 at 20 37 35@2x" src="https://github.com/user-attachments/assets/41ce8943-db46-460d-a98f-0f0d3511d2e3" />
          * **What it is:** This is the API endpoint.
          * **Action:** Replace the placeholder text `yourAppURL` with the **Web app URL** you copied in Step 2.5.

      * **`yourExercises`**
  
          * <img width="1222" height="300" alt="CleanShot 2025-10-25 at 20 38 14@2x" src="https://github.com/user-attachments/assets/15645ff6-36ae-46de-a79a-687d9b23f466" />
          * **What it is:** This is the master list of all exercises the shortcut should check for your dashboard.
          * **Action:** Replace the placeholder text with your comma-separated list of exercises. The format must be:
            `ExerciseOne,ExerciseTwo,AnotherExercise`
          * **Example:** `Brustpresse,Ruderzug,Schulterpresse,Latzug`
          * **IMPORTANT:** These names must *exactly match* the names you use in your Google Sheet's `Exercise` column.

### Step 3.3: Shortcut Execution Logic

When you run the shortcut, here is what happens:

1.  **Fetch Data:** The shortcut first calls your API's `getDashboardData` endpoint, sending your master list of exercises.
2.  **Build Menu:** The API returns a JSON object of *only* your unfinished exercises. The shortcut reads the names of these exercises (the JSON keys) and builds a menu for you to choose from (e.g., "Schulterpresse (2 sets left)").
3.  **Select Exercise:** You tap the exercise you want to do.
4.  **Show Details:** The shortcut looks up the details for your selected exercise (PR, last sets, next set \#) from the JSON it already has.
5.  **Prompt User:** It asks you to input the `Weight`, pre-filling the `Set` number for you (e.g., "Set 2").
6.  **Log Data:** Once you confirm, the shortcut calls your API's `add` endpoint, sending the exercise name, the weight you entered, and the set number to be saved in your Google Sheet.
7.  **Done\!** You receive a "Workout Saved\!" notification.

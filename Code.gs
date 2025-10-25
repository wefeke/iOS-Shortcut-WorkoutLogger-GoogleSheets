/*
=================================================================
== CONFIGURATION SECTION ==
=================================================================
Adjust all important settings here.
*/

// 1. Your Google Sheet ID (from the URL)
const SPREADSHEET_ID = "";

// 2. The name of the specific sheet (tab at the bottom)
const SHEET_NAME = "";

// 3. Your Timezone (IMPORTANT for "today's" date)
// Examples: "Europe/Berlin", "GMT+2", "America/New_York"
const TIME_ZONE = "";

// 4. How many sets per exercise is your goal?
const TARGET_SETS = ;

/*
=================================================================
== LOGIC STARTS HERE (do not change) ==
=================================================================
*/

// Global variable for the sheet (uses your settings from above)
const transactionSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

/**
 * SWITCHBOARD
 * This function receives EVERY request to your API.
 * It looks at the "action" parameter (e.g., "add" or "getDashboardData")
 * and forwards you to the correct "department" (function).
 */
function doGet(payload) {
  const action = payload.parameter.action;

  try {
    if (action === "add") {
      // Forward to the "Data Entry" department
      return addTransaction(payload);
      
    } else if (action === "getDashboardData") {
      // Forward to the "Research & Analysis" department
      return getDashboardData(payload);
      
    } else {
      // Invalid request
      return createJsonResponse({ status: "Error", message: "Invalid 'action'. Use 'add' or 'getDashboardData'." });
    }
  } catch (error) {
    // Catches any unexpected errors
    return createJsonResponse({ status: "Error", message: "An unexpected error occurred: " + error.message });
  }
}


/**
 * DATA ENTRY
 * This function is called when you save a new workout (action=add).
 * It takes your data (exercise, weight, set), stamps today's date
 * on it, and writes it to the next empty row in the sheet.
 */
function addTransaction(payload) {
  // 1. Get data from the request
  const exercise = payload.parameter.exercise;
  const weight = payload.parameter.weight;
  const set = payload.parameter.set;
  const note = payload.parameter.note;

  // 2. Check if all required data is present
  if (!exercise || !weight || !set) {
    return createJsonResponse({ status: "Error", message: "Missing fields. 'exercise', 'weight', and 'set' are required." });
  }

  // 3. Get today's date (without time, based on your timezone)
  const timeStamp = Utilities.formatDate(new Date(), TIME_ZONE, "M/d/yyyy");

  // 4. Write to the sheet
  try {
    transactionSheet.appendRow([timeStamp, exercise, weight, set, note]);
    return createJsonResponse({ status: "Success", message: "Workout saved!" });
  } catch (error) {
    return createJsonResponse({ status: "Error", message: "Error while saving: " + error.message });
  }
}


/**
 * RESEARCH & ANALYSIS
 * This is the main function for your dashboard (action=getDashboardData).
 * It searches your sheet for all exercises you request
 * and gathers all key info (PR, last sets, sets done today).
 */
function getDashboardData(payload) {
  // 1. Get the list of requested exercises from the parameters
  const exercisesParams = payload.parameters.exercises; 
  if (!exercisesParams || exercisesParams.length === 0) {
    return createJsonResponse({ status: "Error", message: "No 'exercises' parameter provided." });
  }

  // (Ensures that "Exercise1,Exercise2" works)
  let inputExercises = [];
  exercisesParams.forEach(param => {
    inputExercises = inputExercises.concat(param.split(','));
  });

  // 2. Prepare an empty "report sheet" (a data map) for each requested exercise
  let exerciseDataMap = {};
  let cleanInputExercises = []; 
  
  inputExercises.forEach(ex => {
    const trimmedEx = ex.trim(); // Removes spaces
    if (trimmedEx.length > 0 && !exerciseDataMap[trimmedEx]) {
      exerciseDataMap[trimmedEx] = {
        pr: 0,
        setsToday: 0, // Counter for today's sets
        allSets: []   // A list for all found sets
      };
      cleanInputExercises.push(trimmedEx); // Remembers the order
    }
  });

  // 3. Get today's date and ALL data from the "file cabinet" (the sheet)
  const todayString = Utilities.formatDate(new Date(), TIME_ZONE, "M/d/yyyy");
  const allData = transactionSheet.getDataRange().getValues();

  // Column indexes (so the code knows where to look)
  const TIMESTAMP_COL = 0; // Column A
  const EXERCISE_COL = 1;  // Column B
  const WEIGHT_COL = 2;    // Column C
  const SET_COL = 3;       // Column D
  const NOTE_COL = 4;      // Column E

  // 4. Go through the entire "file cabinet" (all rows) ONCE
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const rowExercise = String(row[EXERCISE_COL]).trim();

    // Only look at rows for exercises we care about (those on our "report sheet")
    if (exerciseDataMap.hasOwnProperty(rowExercise)) {
      
      const data = exerciseDataMap[rowExercise];
      const currentWeight = parseFloat(row[WEIGHT_COL]);
      
      // A) PR-CHECK: Is this weight higher than the current max?
      if (!isNaN(currentWeight) && currentWeight > data.pr) {
        data.pr = currentWeight;
      }

      // B) TODAY-CHECK: Is this entry from today?
      const rowTimestampStr = String(row[TIMESTAMP_COL]);
      const rowDateString = rowTimestampStr.split(" ")[0]; // Takes just the date
      if (rowDateString === todayString) {
        data.setsToday++; // Increment counter
      }

      // C) DATA GATHERING: Add this set to the "allSets" list for the exercise
      data.allSets.push({
        timestamp: rowTimestampStr,
        weight: row[WEIGHT_COL],
        setNumber: row[SET_COL],
        note: row[NOTE_COL] || "" // Use the note, or "" if empty
      });
    }
  }

  // 5. CREATE FINAL REPORTS (and filter)
  // We create an empty object (a dictionary) for the response
  let dashboardData = {}; 
  
  // Loop through the list of requested exercises (in the original order)
  for (const exerciseName of cleanInputExercises) {
    const data = exerciseDataMap[exerciseName];
    
    // Calculate the remaining sets
    const remainingSets = Math.max(0, TARGET_SETS - data.setsToday);

    // FILTER: Only add exercises to the response that are NOT YET FINISHED today
    if (remainingSets > 0) {
    
      // Calculate the number for the next set
      const nextSet = data.setsToday + 1;
      
      // Get the last 3 sets from the list (and reverse them -> newest first)
      const lastSets = data.allSets.slice(-3).reverse();

      // Add the finished report to the response object
      // (The key is the exercise name)
      dashboardData[exerciseName] = {
        pr: data.pr,
        remainingSets: remainingSets,
        nextSetNumber: nextSet,
        lastSets: lastSets
      };
    }
  }

  // 6. Send the finished reports to the "Translator"
  return createJsonResponse({
    status: "Success",
    dashboardData: dashboardData
  });
}


/**
 * TRANSLATOR (createJsonResponse)
 * This small helper function is like a translator.
 * It takes Google's internal data (the "reports")
 * and converts them into a universal language (JSON)
 * that your app (e.g., Shortcuts) can understand.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function build_backend( csv) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var backsheet = spreadsheet.getSheetByName('back');
  var lastRow = backsheet.getLastRow();
  var startRow = lastRow + 1;
  var numberOfColumns = csv[0].length;
  var range = backsheet.getRange(startRow, 1, csv.length, numberOfColumns);
  var other_range = backsheet.getRange(startRow, 1, csv.length-1, numberOfColumns);

  if(startRow === 1){
      range.setValues(csv);
  } else {
      // Slice off the header if not starting at the first row of the sheet
      other_range.setValues(csv.slice(1));
  }
}
//////////////////////////////////////////////////////////////////
function getCSV(url,key){
  
  var result = [];
  var key_str = key.join(",")

  var response = UrlFetchApp.fetch(url);
  var content = response.getContentText();
  var csv = Utilities.parseCsv(content);  

  var dpsMean = csv[1][1];

  var name =csv[1][0];
  name = String(name);
  name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();

  var colval = csv[1][2];
  var colvalues = colval.split('/');

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var ttsheet = spreadsheet.getSheetByName('tiertranslator');
  var ttwuwu = ttsheet.getRange("A197:B" + ttsheet.getLastRow());
  var ttData = ttwuwu.getValues();

  // Calculate the difference and add it as a new column
  for (var j = 0; j < csv.length; j++) {
    var row = csv[j];
    var mval = parseFloat(csv[j][1]);

    var difference = mval - parseFloat(dpsMean); 

    var colval = csv[j][0];
    if (typeof colval === 'string' && colval.includes('/')) {
      // Split the third column values by "/"
      var colvalues = colval.split('/');
      var itemid = colvalues[3]

      for (var g = 0; g < ttData.length; g++) {

        if (parseInt(itemid) === parseInt(ttData[g][0])) {  
          colvalues[3] = parseInt(ttData[g][1]);   

        }
       }
      }
      else{
        var colvalues = ["","","","","","","",""]
        }
    for(var z =0; z < colvalues.length; z++){
        row.push(colvalues[z])
      }
    
    csv[j].splice(0,1);
    csv[j].unshift(dpsMean);
    csv[j].unshift(name);
    csv[j].push(difference); 

    csv[j].push(key_str);
    
  }
  result.push(["Name0", "DPSmean","dps_mean","dps_min","dps_max","dps_std_dev","dps_mean_std_dev","instanceid","encounterid","simtype","itemid","ilv","bonus","slot","details","dif","key"]);

  result = result.concat(csv.slice(1));

  return result
}
//////////////////////////////////////////////////////////////////
function importurl(url){
  var result = [];

  //var url = "https://www.raidbots.com/simbot/report/bQBKHj7safehZzwuHdzo5x";

  var pattern = /\/report\/([^\/]+)/;
  var match = url.match(pattern);
  var simid = match[1];

  var jsonurl = `https://www.raidbots.com/reports/${simid}/data.json`
  var csvurl = `https://www.raidbots.com/reports/${simid}/data.csv`

  try {
    var jresponse = UrlFetchApp.fetch(jsonurl);
    var jcontent = jresponse.getContentText();
    
    var jsonData = JSON.parse(jcontent);
  } catch (e) {
    console.error("Error fetching or parsing data: ", e);
  }

  // Check if jsonData.sim.players is defined and is an array
  if (jsonData && jsonData.sim && jsonData.sim.players && Array.isArray(jsonData.sim.players)) {

    var specializations = jsonData.sim.players.map(player => player.specialization);
    var name = jsonData.sim.players.map(player => player.name);
      
  } else {
    console.log("The expected jsonData.sim.players JSON structure is not present");
    var specializations = "unknown";
    var name = "unknown";
  }
  if (Array.isArray(jsonData.sim.profilesets.results)) {

    var firstitem = jsonData.sim.profilesets.results.map(results => results.name);
    var firstitemstring = String(firstitem[0]);
    var instanceid =firstitemstring.slice(0,4);

    var regexPattern = /-([^-\s]+)-/;
    var diff = firstitemstring.match(regexPattern)[1];
    
  } else {
    console.log("The expected profilesets JSON structure is not present");

    }

  name = String(name);
  name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();  

  var key = [instanceid,diff,name,specializations];
  buildmain(key,simid);

  var csv = getCSV(csvurl,key);
  
  remove_keys(key);
  build_backend(csv);

}
//////////////////////////////////////////////////////////////////
function buildmain(key,simid){

  if(key==null)
  {
    var key=[1,2,3,4];
  }
  var timestamp = new Date();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var formatsheet = spreadsheet.getSheetByName('Format');
  var formatrange = formatsheet.getDataRange();  // Get all data in 'Format'
  var formattableData = formatrange.getValues();

  var mainsheet = spreadsheet.getSheetByName('Main');
  var tableData = mainsheet.getDataRange();  

  for (var j = 1; j < 45; j++) {

    var specclass = formattableData[j][9] ;
    if(specclass == key[3] ){
      var char_class = formattableData[j][0];
      var char_spec =  formattableData[j][1];
    }
  }
  

  rowvalues = [String(key[2]),String(key[1]),char_class,char_spec,simid,timestamp,key.join(",")];
  mainsheet.appendRow(rowvalues)

}
//////////////////////////////////////////////////////////////////
function remove_keys(key) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var backsheet = spreadsheet.getSheetByName('back');
  var backRange = backsheet.getDataRange();
  var backData = backRange.getValues();

  // Assuming the "key" is in the last column (adjust if needed)
  var keyColumnIndex = backData[0].length - 1;

  // Filter out rows that match the specified key
  var filteredData = backData.filter(function(row) {
    // Assuming the key is stored as a string, so convert to a string to ensure accurate comparison
    return String(row[keyColumnIndex]) !== String(key);
  });

  // Clear the entire existing data to remove all rows
  backsheet.clearContents();

  // If there are rows left after filtering, write them back to the spreadsheet
  if (filteredData.length > 0) {
    var newRange = backsheet.getRange(1, 1, filteredData.length, filteredData[0].length);
    newRange.setValues(filteredData);
  }
}

function iterate_urls() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Entry');
  var lastRow = sheet.getRange("B2:B").getValues().filter(String).length;

  var columnCRange = sheet.getRange(2, 2, lastRow, 1); // Use all rows starting from row 2
  var columnCValues = columnCRange.getValues();

  //var columnCValues = [["https://www.raidbots.com/simbot/report/bQBKHj7safehZzwuHdzo5x","https://www.raidbots.com/simbot/report/34AGmRbVMgvafReNDJJ8tN"]]
  for (var i = 0; i < columnCValues.length; i++) {
    var currentValue = columnCValues[i][0]; 

    if (currentValue) {
      try {
        importurl(currentValue);
        var cell = sheet.getRange(i + 2, 2);
        cell.clearContent(); // delete existing values
        //  format
        cell.setBorder(false, true, false, true, false, false, 'black',SpreadsheetApp.BorderStyle.SOLID_MEDIUM); // (top, left, bottom, right, vert, horz)
        cell.setBackground('#666666'); // fill
      } catch (error) {
        console.log(`Error importing URL for value: ${currentValue}, Error: ${error}`);
      }
    }
  }
}

function deleteback() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const entrySheet = ss.getSheetByName('Entry');
  const entryData = entrySheet.getRange('H2:H60').getValues(); // Returns a 2D array
  

  const mainSheet = ss.getSheetByName('Main');
  const mainData = mainSheet.getRange('G2:H' + mainSheet.getLastRow()).getValues(); // G and H columns together
  
  const uniqueValues = [...new Set(mainData.map(row => row[0]))]; // Extract column G and ensure uniqueness

  const backSheet = ss.getSheetByName('Back');
  let backData = backSheet.getRange('A2:Q' + backSheet.getLastRow()).getValues(); // Adjust the range if there are more columns
  const keysToDelete = [];


  entryData.forEach((item, index) => {
    if (item[0] === true) {
      keysToDelete.push(uniqueValues[index]);
    }
  });


  const filteredData = backData.filter(row => !keysToDelete.includes(row[16])); // Assumes Q is the 17th column
  
  // Clear and write
  backSheet.clearContents(); // Clear contents only
  if (filteredData.length > 0) {
    backSheet.getRange(2, 1, filteredData.length, filteredData[0].length).setValues(filteredData);
  }

  mainData.forEach((row, index) => {
    if (keysToDelete.includes(row[0])) { // Check G
      row[1] = 'x'; 
    }
  });


  mainSheet.getRange(2, 7, mainData.length, 2).setValues(mainData); // Columns G and H start at column index 7

  // Set all values in H2:H60 to false
  const falseValues = Array(59).fill([false]);
  entrySheet.getRange('H2:H60').setValues(falseValues);
}



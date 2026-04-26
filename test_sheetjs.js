const XLSX = require('xlsx');

const workbook = XLSX.readFile('test.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// B2 is our rich text cell
const cell = worksheet['B2'];
console.log("SheetJS cell:");
console.log(cell);

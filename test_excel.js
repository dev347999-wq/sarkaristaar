const ExcelJS = require('exceljs');

async function test() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('My Sheet');

  sheet.addRow(['ID', 'Question']);
  
  // Add a rich text cell
  sheet.addRow([
    1, 
    {
      richText: [
        { text: 'The historian referenced a ' },
        { font: { bold: true }, text: 'bailey' },
        { text: ' in Norman military architecture.' }
      ]
    }
  ]);

  await workbook.xlsx.writeFile('test.xlsx');
  console.log("Wrote test.xlsx");

  // Now read it back
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('test.xlsx');
  const sheet2 = wb2.getWorksheet(1);
  const cell = sheet2.getCell('B2');
  console.log("Read back B2 value:");
  console.log(JSON.stringify(cell.value, null, 2));

  // Test cellToString logic
  const val = cell.value;
  const cellToString = (val) => {
    if (val == null) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) {
      return val.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (item.richText) return cellToString(item.richText);
          let text = item.text || item.t || item.v || '';
          if (item.font && text) {
            if (item.font.bold) text = `<b>${text}</b>`;
            if (item.font.italic) text = `<i>${text}</i>`;
            if (item.font.underline) text = `<u>${text}</u>`;
          }
          return text;
        }
        return String(item || '');
      }).join('');
    }
    if (typeof val === 'object') {
      if (val.richText) return cellToString(val.richText);
      let text = val.text || val.t || val.v || '';
      if (val.font && text) {
        if (val.font.bold) text = `<b>${text}</b>`;
        if (val.font.italic) text = `<i>${text}</i>`;
        if (val.font.underline) text = `<u>${text}</u>`;
      }
      return text;
    }
    return String(val);
  };
  console.log("cellToString result:", cellToString(val));
}

test();

class TargetStorage {
  constructor(sheetsService) {
    if (!sheetsService) {
      throw new Error('GoogleSheetsService is required for TargetStorage.');
    }
    this.sheetsService = sheetsService;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    // Sheet name for storing monthly targets
    this.sheetName = 'targets';
    this.targetRange = `${this.sheetName}!A:C`; // Columns: Tháng, Mục tiêu, Cập nhật lúc
  }

  // Get target for specific month (YYYY-MM format)
  async getTarget(month = null) {
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for TargetStorage');
    }

    try {
      // If no month specified, use current month
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Read all data from targets sheet
      const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.targetRange);
      
      if (!data || data.length === 0) {
        console.log(`[TargetStorage] No target data found in sheet`);
        return { monthlyTarget: 0, month: targetMonth, lastUpdated: null };
      }

      // Find row for the specified month (skip header row)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === targetMonth) {
          const monthlyTarget = parseFloat(String(row[1]).replace(/[^0-9.-]+/g, "")) || 0;
          const lastUpdated = row[2] || null;
          
          console.log(`[TargetStorage] Found target for ${targetMonth}: ${monthlyTarget}`);
          return {
            monthlyTarget,
            month: targetMonth,
            lastUpdated,
          };
        }
      }

      // Month not found, return 0
      console.log(`[TargetStorage] No target found for month ${targetMonth}`);
      return { monthlyTarget: 0, month: targetMonth, lastUpdated: null };
      
    } catch (error) {
      console.error('[TargetStorage] Error reading target from Google Sheet:', error);
      return { monthlyTarget: 0, month: month || new Date().toISOString().slice(0, 7), lastUpdated: null };
    }
  }

  // Set target for specific month (YYYY-MM format)
  async setTarget(monthlyTarget, month = null) {
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for TargetStorage');
    }

    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const valueToSet = parseFloat(monthlyTarget) || 0;
      const timestamp = new Date().toISOString();

      // Read all data from targets sheet
      const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.targetRange);
      
      let rowIndex = -1;
      
      // Find if month already exists (skip header row)
      if (data && data.length > 0) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === targetMonth) {
            rowIndex = i + 1; // +1 because sheets are 1-indexed
            break;
          }
        }
      }

      if (rowIndex > 0) {
        // Update existing row
        const updateRange = `${this.sheetName}!B${rowIndex}:C${rowIndex}`;
        await this.sheetsService.updateRowValues(this.spreadsheetId, updateRange, [[valueToSet, timestamp]]);
        console.log(`[TargetStorage] Updated target for ${targetMonth} to ${valueToSet}`);
      } else {
        // Append new row
        const appendRange = `${this.sheetName}!A:C`;
        await this.sheetsService.appendRow(this.spreadsheetId, appendRange, [[targetMonth, valueToSet, timestamp]]);
        console.log(`[TargetStorage] Added new target for ${targetMonth}: ${valueToSet}`);
      }

      return {
        monthlyTarget: valueToSet,
        month: targetMonth,
        lastUpdated: timestamp,
      };
    } catch (error) {
      console.error('[TargetStorage] Error saving target to Google Sheet:', error);
      throw error;
    }
  }
}

module.exports = TargetStorage;

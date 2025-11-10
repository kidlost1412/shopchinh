class TargetStorage {
  constructor(sheetsService) {
    if (!sheetsService) {
      throw new Error('GoogleSheetsService is required for TargetStorage.');
    }
    this.sheetsService = sheetsService;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    // Use existing columns in 'rutve' sheet: I (Mục tiêu) and J (Tháng mục tiêu)
    this.sheetName = 'rutve';
    this.targetRange = `${this.sheetName}!I:J`; // Columns: I = Mục tiêu, J = Tháng mục tiêu
  }

  // Get target for specific month (YYYY-MM format)
  async getTarget(month = null) {
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for TargetStorage');
    }

    try {
      // If no month specified, use current month
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Read columns I and J from rutve sheet
      const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.targetRange);
      
      if (!data || data.length === 0) {
        console.log(`[TargetStorage] No target data found in sheet`);
        return { monthlyTarget: 0, month: targetMonth, lastUpdated: null };
      }

      // Find row where column J (index 1) matches the target month
      // Skip header row (index 0)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowMonth = row[1] ? String(row[1]).trim() : ''; // Column J (Tháng mục tiêu)
        
        if (rowMonth === targetMonth) {
          const monthlyTarget = parseFloat(String(row[0] || '0').replace(/[^0-9.-]+/g, "")) || 0; // Column I (Mục tiêu)
          
          console.log(`[TargetStorage] Found target for ${targetMonth}: ${monthlyTarget} at row ${i + 1}`);
          return {
            monthlyTarget,
            month: targetMonth,
            lastUpdated: new Date().toISOString(),
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

      // Read columns I and J from rutve sheet
      const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.targetRange);
      
      let rowIndex = -1;
      
      // Find if month already exists (skip header row)
      if (data && data.length > 0) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowMonth = row[1] ? String(row[1]).trim() : ''; // Column J (Tháng mục tiêu)
          
          if (rowMonth === targetMonth) {
            rowIndex = i + 1; // +1 because sheets are 1-indexed
            break;
          }
        }
      }

      if (rowIndex > 0) {
        // Update existing row - only update column I (Mục tiêu)
        const updateRange = `${this.sheetName}!I${rowIndex}`;
        await this.sheetsService.updateCellValue(this.spreadsheetId, updateRange, valueToSet);
        console.log(`[TargetStorage] Updated target for ${targetMonth} to ${valueToSet} at row ${rowIndex}`);
      } else {
        // Append new row with both columns I and J
        const appendRange = `${this.sheetName}!I:J`;
        await this.sheetsService.appendRow(this.spreadsheetId, appendRange, [[valueToSet, targetMonth]]);
        console.log(`[TargetStorage] Added new target for ${targetMonth}: ${valueToSet}`);
      }

      return {
        monthlyTarget: valueToSet,
        month: targetMonth,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TargetStorage] Error saving target to Google Sheet:', error);
      throw error;
    }
  }
}

module.exports = TargetStorage;

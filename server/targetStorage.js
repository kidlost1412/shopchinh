class TargetStorage {
  constructor(sheetsService) {
    if (!sheetsService) {
      throw new Error('GoogleSheetsService is required for TargetStorage.');
    }
    this.sheetsService = sheetsService;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    // Define the cell where the target is stored, e.g., 'rutve!I2'
    // You can add GOOGLE_SHEET_TARGET_RANGE to your .env file
    this.targetRange = process.env.GOOGLE_SHEET_TARGET_RANGE || 'rutve!I2';
  }

  // Get current target from Google Sheets
  async getTarget() {
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for TargetStorage');
    }

    try {
      const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.targetRange);
      const rawValue = (data && data.length > 0 && data[0].length > 0) ? data[0][0] : '0';
      const monthlyTarget = parseFloat(String(rawValue).replace(/[^0-9.-]+/g, "")) || 0;

      // The response format is kept similar to the old one for frontend compatibility
      return {
        monthlyTarget,
        lastUpdated: new Date().toISOString(), // Note: This is the read time, not the update time
        updatedBy: 'google_sheet',
      };
    } catch (error) {
      console.error('Error reading target from Google Sheet:', error);
      // Return a default value on error to avoid breaking the frontend
      return { monthlyTarget: 0, lastUpdated: null, updatedBy: 'error' };
    }
  }

  // Set new target in Google Sheets
  async setTarget(monthlyTarget, updatedBy = 'user') {
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for TargetStorage');
    }

    try {
      const valueToSet = parseFloat(monthlyTarget) || 0;
      await this.sheetsService.updateCellValue(this.spreadsheetId, this.targetRange, valueToSet);
      
      console.log(`[TargetStorage] Target updated to ${valueToSet} in ${this.targetRange} by ${updatedBy}`);
      
      return {
        monthlyTarget: valueToSet,
        lastUpdated: new Date().toISOString(),
        updatedBy,
      };
    } catch (error) {
      console.error('Error saving target to Google Sheet:', error);
      throw error; // Re-throw the error to be caught by the API endpoint
    }
  }
}

module.exports = TargetStorage;

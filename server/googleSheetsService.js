const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Use credentials from environment variables for Vercel deployment
      const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
      };

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Google service account credentials not found in environment variables');
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      return false;
    }
  }

  async getSheetData(spreadsheetId, range) {
    try {
      if (!this.sheets) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Google Sheets service');
        }
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  async getAllSheetData(spreadsheetId, sheetName = 'Sheet1') {
    try {
      // Get all data from the sheet
      const range = `${sheetName}!A:AH`; // Covers all columns up to AH
      return await this.getSheetData(spreadsheetId, range);
    } catch (error) {
      console.error('Error fetching all sheet data:', error);
      throw error;
    }
  }

  async getSheetInfo(spreadsheetId) {
    try {
      if (!this.sheets) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Google Sheets service');
        }
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      console.error('Error fetching sheet info:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;

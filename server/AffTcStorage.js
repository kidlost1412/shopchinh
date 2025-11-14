 const DEFAULT_AFF_TC = [
  'hoaithuongkhonhattoancau',
  'hoa.mc.lan7338',
  'trongcaykhongkho2025',
  'cogaiphanbon',
  'phuongdamca38',
  'linhhai_92',
  'taphoaphanbon',
  'nydamca140824',
  'trinhdamca86',
  'nongduoctoancau_',
  'trongcaykhongkho25',
  'toancau70',
  'nongduoctoancau76',
  'nongduoctoancauhatinh',
  'hangnongduoc',
  'huongtoancau',
  'thienannongduoctoancau',
  'nongduoctoancauofficial'
];

class AffTcStorage {
  constructor(sheetsService) {
    if (!sheetsService) {
      throw new Error('GoogleSheetsService is required for AffTcStorage.');
    }

    this.sheetsService = sheetsService;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for AffTcStorage');
    }

    this.sheetName = 'aff_tc';
    this.sheetRange = `${this.sheetName}!A:B`;
    this.headerRow = ['AFF Name', 'Created At'];
  }

  sanitizeName(name) {
    return typeof name === 'string' ? name.trim() : '';
  }

  async ensureSheetStructure() {
    await this.sheetsService.ensureSheetExists(this.spreadsheetId, this.sheetName);
    let data;
    try {
      data = await this.sheetsService.getSheetData(this.spreadsheetId, this.sheetRange);
    } catch (error) {
      console.error('[AffTcStorage] Failed to read sheet data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      const timestamp = new Date().toISOString();
      const values = [
        this.headerRow,
        ...DEFAULT_AFF_TC.map(name => [name, timestamp])
      ];

      await this.sheetsService.updateRowValues(
        this.spreadsheetId,
        `${this.sheetName}!A1:B${values.length}`,
        values
      );

      return {
        affNames: [...DEFAULT_AFF_TC],
        lastUpdated: timestamp
      };
    }

    return null;
  }

  parseData(data) {
    const affNames = [];
    let lastUpdated = null;

    if (!data || data.length === 0) {
      return { affNames, lastUpdated };
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const rawName = this.sanitizeName(row[0]);
      if (!rawName) continue;

      affNames.push(rawName);

      const timestamp = row[1] ? new Date(row[1]) : null;
      if (timestamp && !isNaN(timestamp.getTime())) {
        if (!lastUpdated || timestamp > lastUpdated) {
          lastUpdated = timestamp;
        }
      }
    }

    return {
      affNames,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null
    };
  }

  async getAffList() {
    const seeded = await this.ensureSheetStructure();
    if (seeded) {
      return seeded;
    }

    const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.sheetRange);
    return this.parseData(data);
  }

  async addAffName(name) {
    const sanitized = this.sanitizeName(name);
    if (!sanitized) {
      throw new Error('AFF name is required');
    }

    await this.ensureSheetStructure();

    const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.sheetRange);
    const { affNames } = this.parseData(data);
    const lower = sanitized.toLowerCase();

    if (affNames.some(existing => existing.toLowerCase() === lower)) {
      return {
        added: false,
        affNames,
        lastUpdated: new Date().toISOString()
      };
    }

    await this.sheetsService.appendRow(
      this.spreadsheetId,
      this.sheetRange,
      [[sanitized, new Date().toISOString()]]
    );

    const updated = await this.getAffList();
    return {
      added: true,
      affNames: updated.affNames,
      lastUpdated: updated.lastUpdated
    };
  }

  async removeAffName(name) {
    const sanitized = this.sanitizeName(name);
    if (!sanitized) {
      throw new Error('AFF name is required');
    }

    await this.ensureSheetStructure();

    const data = await this.sheetsService.getSheetData(this.spreadsheetId, this.sheetRange);
    const lower = sanitized.toLowerCase();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      if (this.sanitizeName(row[0]).toLowerCase() === lower) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      const parsed = this.parseData(data);
      return {
        removed: false,
        affNames: parsed.affNames,
        lastUpdated: parsed.lastUpdated
      };
    }

    await this.sheetsService.deleteRow(this.spreadsheetId, this.sheetName, rowIndex);

    const updated = await this.getAffList();
    return {
      removed: true,
      affNames: updated.affNames,
      lastUpdated: updated.lastUpdated
    };
  }

  async setAffList(names = []) {
    await this.ensureSheetStructure();

    const sanitized = names
      .map(name => this.sanitizeName(name))
      .filter(Boolean);

    // Remove duplicates while preserving order
    const seen = new Set();
    const uniqueNames = [];
    for (const name of sanitized) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueNames.push(name);
      }
    }

    const timestamp = new Date().toISOString();
    const values = [
      this.headerRow,
      ...uniqueNames.map(name => [name, timestamp])
    ];

    await this.sheetsService.clearRange(this.spreadsheetId, this.sheetRange);
    await this.sheetsService.updateRowValues(
      this.spreadsheetId,
      `${this.sheetName}!A1:B${values.length || 1}`,
      values.length > 0 ? values : [this.headerRow]
    );

    if (uniqueNames.length === 0) {
      // Ensure header exists
      await this.sheetsService.updateRowValues(
        this.spreadsheetId,
        `${this.sheetName}!A1:B1`,
        [this.headerRow]
      );
    }

    const updated = await this.getAffList();
    return {
      affNames: updated.affNames,
      lastUpdated: updated.lastUpdated
    };
  }
}

module.exports = {
  AffTcStorage,
  DEFAULT_AFF_TC,
};

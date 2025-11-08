// Rutve Data Processor - Xử lý file rutve.csv cho Finance
// Hoàn toàn độc lập với Dashboard

class RutveProcessor {
  constructor(googleSheetsService) {
    console.log('[RutveProcessor] Khởi tạo Rutve Processor độc lập');
    this.sheetsService = googleSheetsService;
    // Sử dụng cùng Google Sheet ID với dữ liệu chính
    this.rutveSpreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    this.rutveSheetName = 'rutve'; // Tên sheet trong Google Sheets
  }

  // Parse CSV line với xử lý số có dấu chấm
  parseCSVLine(line) {
    if (!line || typeof line !== 'string') return [];
    
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim().replace(/"/g, ''));
    return result;
  }

  // Parse date với nhiều định dạng
  parseRutveDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Handle format: YYYY-MM-DD (advertising)
      if (dateString.includes('-') && dateString.length === 10) {
        return new Date(dateString);
      }
      
      // Handle format: DD/MM/YYYY (withdrawals)
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        return new Date(year, month - 1, day);
      }
      
      return new Date(dateString);
    } catch (error) {
      console.error(`[RutveProcessor] Error parsing date: ${dateString}`, error);
      return null;
    }
  }

  // Đọc và parse file rutve.csv
  async getRutveData() {
    console.log('[RutveProcessor] Reading rutve data from Google Sheets');
    
    try {
      // Lấy dữ liệu từ Google Sheets
      const rawData = await this.sheetsService.getAllSheetData(this.rutveSpreadsheetId, this.rutveSheetName);
      
      if (!rawData || rawData.length === 0) {
        console.warn('[RutveProcessor] No rutve data found in Google Sheets');
        return {
          advertising: [],
          withdrawals: []
        };
      }

      const headers = rawData[0]; // Dòng đầu tiên là headers
      console.log('[RutveProcessor] Headers:', headers);
      
      const advertising = [];
      const withdrawals = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        if (!row || row.length < 4) continue; // Cần ít nhất 4 cột
        
        // Parse theo cấu trúc: Ngày rút tiền, Số tiền rút, ngày nộp tiền, số tiền nộp, Tổng số tiền thuế, Tổng phụ, ngày rút tiền gvm, số tiền gvm
        const withdrawalDate = row[0]; // Ngày rút tiền
        const withdrawalAmount = row[1]; // Số tiền rút
        const advertisingDate = row[2]; // ngày nộp tiền  
        const advertisingDeposit = row[3]; // số tiền nộp
        const advertisingTax = row[4]; // Tổng số tiền thuế
        const advertisingActualReceived = row[5]; // Tổng phụ (thực nhận)
        const gvmDate = row[6]; // ngày rút tiền gvm
        const gvmAmount = row[7]; // số tiền gvm

        // Withdrawal record
        if (withdrawalDate && withdrawalAmount) {
          withdrawals.push({
            date: withdrawalDate,
            dateParsed: this.parseRutveDate(withdrawalDate),
            amount: this.parseNumber(withdrawalAmount),
            type: 'withdrawal',
            raw: {
              date: withdrawalDate,
              amount: withdrawalAmount
            }
          });
        }

        // Advertising record
        if (advertisingDate && (advertisingDeposit || advertisingTax || advertisingActualReceived)) {
          advertising.push({
            date: advertisingDate,
            dateParsed: this.parseRutveDate(advertisingDate),
            totalDeposit: this.parseNumber(advertisingDeposit),
            tax: this.parseNumber(advertisingTax),
            actualReceived: this.parseNumber(advertisingActualReceived),
            type: 'advertising',
            raw: {
              date: advertisingDate,
              deposit: advertisingDeposit,
              tax: advertisingTax,
              actualReceived: advertisingActualReceived
            }
          });
        }

        // GVM record
        if (gvmDate && gvmAmount) {
          withdrawals.push({
            date: gvmDate,
            dateParsed: this.parseRutveDate(gvmDate),
            amount: this.parseNumber(gvmAmount),
            type: 'gvm',
            raw: {
              date: gvmDate,
              amount: gvmAmount
            }
          });
        }
      }

      console.log(`[RutveProcessor] Loaded ${advertising.length} advertising records, ${withdrawals.length} withdrawal records`);
      
      return {
        advertising,
        withdrawals
      };
    } catch (error) {
      console.error('[RutveProcessor] Error reading rutve data from Google Sheets:', error);
      return {
        advertising: [],
        withdrawals: []
      };
    }
  }

  // Parse number helper - Xử lý định dạng Việt Nam
  parseNumber(value) {
    if (!value || value === '') return 0;
    
    // Remove dots (thousands separator in Vietnamese format) and convert to number
    const cleanValue = value.toString().replace(/\./g, '').replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  // Tính tổng tiền quảng cáo theo khoảng thời gian
  calculateAdvertisingSummary(advertisingData, startDate, endDate) {
    console.log(`[RutveProcessor] Calculating advertising summary for ${startDate} to ${endDate}`);
    
    if (!startDate && !endDate) {
      console.log('[RutveProcessor] No date filter for advertising');
      return this.summarizeAdvertising(advertisingData);
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const filteredData = advertisingData.filter(record => {
      if (!record.dateParsed) return false;
      
      if (start && record.dateParsed < start) return false;
      if (end && record.dateParsed > end) return false;
      
      return true;
    });

    console.log(`[RutveProcessor] Filtered advertising: ${filteredData.length} records`);
    return this.summarizeAdvertising(filteredData);
  }

  // Tính tổng tiền rút theo khoảng thời gian
  calculateWithdrawalSummary(withdrawalData, startDate, endDate) {
    console.log(`[RutveProcessor] Calculating withdrawal summary for ${startDate} to ${endDate}`);
    
    // Phân tách withdrawal và GVM
    const regularWithdrawals = withdrawalData.filter(record => record.type === 'withdrawal');
    const gvmWithdrawals = withdrawalData.filter(record => record.type === 'gvm');
    
    // Tổng tiền rút thường tất cả thời gian (không filter)
    const totalWithdrawn = regularWithdrawals.reduce((sum, record) => {
      return sum + (record.amount || 0);
    }, 0);

    // Tổng GVM tất cả thời gian (không filter - theo yêu cầu)
    const totalGvmFee = gvmWithdrawals.reduce((sum, record) => {
      return sum + (record.amount || 0);
    }, 0);

    // Tiền rút trong kỳ (có filter)
    let periodWithdrawn = 0;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      const filteredData = regularWithdrawals.filter(record => {
        if (!record.dateParsed) return false;
        
        if (start && record.dateParsed < start) return false;
        if (end && record.dateParsed > end) return false;
        
        return true;
      });

      periodWithdrawn = filteredData.reduce((sum, record) => {
        return sum + (record.amount || 0);
      }, 0);

      console.log(`[RutveProcessor] Filtered withdrawals: ${filteredData.length} records`);
    } else {
      periodWithdrawn = totalWithdrawn;
    }

    console.log(`[RutveProcessor] Total withdrawn (all time): ${totalWithdrawn.toLocaleString()}`);
    console.log(`[RutveProcessor] Total GVM fee (all time): ${totalGvmFee.toLocaleString()}`);
    console.log(`[RutveProcessor] Period withdrawn: ${periodWithdrawn.toLocaleString()}`);

    return {
      totalWithdrawn,
      totalGvmFee,
      periodWithdrawn,
      totalRecords: withdrawalData.length,
      gvmRecordCount: gvmWithdrawals.length
    };
  }

  // Tóm tắt dữ liệu quảng cáo
  summarizeAdvertising(advertisingData) {
    const summary = advertisingData.reduce((acc, record) => {
      acc.totalDeposit += record.totalDeposit || 0;
      acc.totalTax += record.tax || 0;
      acc.actualReceived += record.actualReceived || 0;
      return acc;
    }, {
      totalDeposit: 0,
      totalTax: 0,
      actualReceived: 0
    });

    console.log(`[RutveProcessor] Advertising summary:`, summary);
    return {
      ...summary,
      recordCount: advertisingData.length
    };
  }
}

module.exports = RutveProcessor;

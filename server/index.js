require('dotenv').config();
const express = require('express');
const cors = require('cors');
const GoogleSheetsService = require('./googleSheetsService');
const DataProcessor = require('./dataProcessor');
const TikTokFinanceProcessor = require('./TikTokFinanceProcessor');
const RutveProcessor = require('./RutveProcessor');
const FinanceOrderProcessor = require('./FinanceOrderProcessor');
const DonaffProcessor = require('./DonaffProcessor');
const TargetStorage = require('./targetStorage');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const sheetsService = new GoogleSheetsService();
const dataProcessor = new DataProcessor();
const financeProcessor = new TikTokFinanceProcessor();
const rutveProcessor = new RutveProcessor(sheetsService);
const financeOrderProcessor = new FinanceOrderProcessor();
const donaffProcessor = new DonaffProcessor();
const targetStorage = new TargetStorage(sheetsService);

// Cache for sheet data
let cachedData = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for AFF data - INDEPENDENT
let cachedAffData = null;
let lastAffFetchTime = null;
const AFF_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get fresh data
async function getFreshData() {
  const now = Date.now();
  
  if (cachedData && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'PosSheets(mẫu mới nhất)';
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    const rawData = await sheetsService.getAllSheetData(spreadsheetId, sheetName);
    const orders = dataProcessor.groupOrdersByID(rawData);
    
    cachedData = orders;
    lastFetchTime = now;
    
    console.log(`Fetched ${orders.length} orders from Google Sheets`);
    return orders;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Helper function to get fresh AFF data - INDEPENDENT
async function getFreshAffData() {
  const now = Date.now();
  
  if (cachedAffData && lastAffFetchTime && (now - lastAffFetchTime) < AFF_CACHE_DURATION) {
    return cachedAffData;
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
    const affSheetName = 'donaff'; // Sheet name for AFF data
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured for AFF');
    }

    console.log(`[AFF API] Fetching AFF data from sheet: ${affSheetName}`);
    const rawAffData = await sheetsService.getAllSheetData(spreadsheetId, affSheetName);
    const affOrders = donaffProcessor.processAffOrders(rawAffData);
    
    cachedAffData = affOrders;
    lastAffFetchTime = now;
    
    console.log(`[AFF API] Fetched ${affOrders.length} AFF orders from Google Sheets`);
    return affOrders;
  } catch (error) {
    console.error('[AFF API] Error fetching AFF data:', error);
    throw error;
  }
}

// API Routes

// Get dashboard metrics
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let orders = await getFreshData();
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const metrics = dataProcessor.calculateMetrics(orders);
    
    res.json({
      success: true,
      data: metrics,
      totalOrders: orders.length,
      lastUpdated: lastFetchTime,
      columnWarnings: dataProcessor.getColumnWarnings(),
      columnStatus: dataProcessor.getColumnMappingStatus()
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

// Get orders by status
app.get('/api/orders', async (req, res) => {
  try {
    const { status, startDate, endDate, search, page = 1, limit = 50 } = req.query;
    
    let orders = await getFreshData();
    
    // Apply filters
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    if (status) {
      console.log(`[API /api/orders] Received filter request for status: "${status}"`);
      orders = dataProcessor.filterByStatus(orders, status);
    }
    
    if (search) {
      orders = dataProcessor.searchOrders(orders, search);
    }
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        total: orders.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(orders.length / parseInt(limit))
        }
      },
      lastUpdated: lastFetchTime
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Get single order details
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await getFreshData();
    
    const order = orders.find(o => o.id === id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
});

// Get combined charts data for dashboard
app.get('/api/dashboard/charts', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let orders = await getFreshData();
    
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const revenueData = dataProcessor.generateRevenueTrend(orders);
    const statusData = dataProcessor.generateStatusDistribution(orders);
    
    res.json({
      success: true,
      data: {
        revenueData,
        statusData
      }
    });
  } catch (error) {
    console.error('Error getting charts data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch charts data'
    });
  }
});

// Get revenue trend data for charts
app.get('/api/analytics/revenue-trend', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let orders = await getFreshData();
    
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const trendData = dataProcessor.generateRevenueTrend(orders);
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Error getting revenue trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue trend data'
    });
  }
});

// Get status distribution data for pie chart
app.get('/api/analytics/status-distribution', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let orders = await getFreshData();
    
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const distributionData = dataProcessor.generateStatusDistribution(orders);
    
    res.json({
      success: true,
      data: distributionData
    });
  } catch (error) {
    console.error('Error getting status distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status distribution data'
    });
  }
});

// Get product analysis data - NEW FEATURE
app.get('/api/analytics/products', async (req, res) => {
  try {
    const { startDate, endDate, countOnlyShippedOrders } = req.query;
    
    let orders = await getFreshData();
    
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const productData = dataProcessor.generateProductAnalysis(orders, countOnlyShippedOrders === 'true');
    
    res.json({
      success: true,
      data: productData
    });
  } catch (error) {
    console.error('Error getting product analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product analysis data'
    });
  }
});

// Get product orders for detailed view - NEW FEATURE
app.get('/api/analytics/products/:productName/orders', async (req, res) => {
  try {
    const { productName } = req.params;
    const { startDate, endDate, countOnlyShippedOrders } = req.query;
    
    let orders = await getFreshData();
    
    if (startDate || endDate) {
      orders = dataProcessor.filterByDateRange(orders, startDate, endDate);
    }
    
    const productOrders = dataProcessor.getProductOrders(orders, decodeURIComponent(productName), countOnlyShippedOrders === 'true');
    
    res.json({
      success: true,
      data: productOrders
    });
  } catch (error) {
    console.error('Error getting product orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product orders data'
    });
  }
});

// Target API endpoints
// Get current monthly target
app.get('/api/target', async (req, res) => {
  try {
    const targetData = await targetStorage.getTarget(); // Now an async function
    res.json({
      success: true,
      data: targetData
    });
  } catch (error) {
    console.error('Error getting target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch target data'
    });
  }
});

// Set monthly target
app.post('/api/target', async (req, res) => {
  try {
    const { monthlyTarget } = req.body;
    
    if (monthlyTarget === undefined || monthlyTarget === null) {
      return res.status(400).json({
        success: false,
        error: 'Monthly target is required'
      });
    }
    
    const targetData = await targetStorage.setTarget(monthlyTarget, 'user'); // Now an async function
    
    res.json({
      success: true,
      data: targetData,
      message: 'Target updated successfully'
    });
  } catch (error) {
    console.error('Error setting target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update target'
    });
  }
});

// Finance API endpoints - Hoàn toàn độc lập
app.get('/api/finance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[API Finance] Request for period: ${startDate} to ${endDate}`);
    
    // Lấy TẤT CẢ đơn hàng (không filter)
    const allOrders = await getFreshData();
    console.log(`[API Finance] Retrieved ${allOrders.length} orders`);
    
    // Lấy dữ liệu rutve
    const rutveData = await rutveProcessor.getRutveData();
    console.log(`[API Finance] Retrieved rutve data: ${rutveData.advertising.length} ads, ${rutveData.withdrawals.length} withdrawals`);
    
    // Tính toán advertising và withdrawal summary
    const advertisingSummary = rutveProcessor.calculateAdvertisingSummary(
      rutveData.advertising, 
      startDate, 
      endDate
    );
    
    const withdrawalSummary = rutveProcessor.calculateWithdrawalSummary(
      rutveData.withdrawals, 
      startDate, 
      endDate
    );
    
    // Generate finance report
    const financeReport = financeProcessor.generateFinanceReport(
      allOrders,
      startDate,
      endDate,
      advertisingSummary,
      withdrawalSummary
    );
    
    res.json({
      success: true,
      data: financeReport,
      meta: {
        totalOrdersInput: allOrders.length,
        ordersInPeriod: financeReport.ordersInPeriod,
        advertisingRecords: advertisingSummary.recordCount || 0,
        withdrawalRecords: withdrawalSummary.totalRecords || 0,
        lastUpdated: lastFetchTime,
        dateRange: { startDate, endDate }
      }
    });
    
  } catch (error) {
    console.error('[API Finance] Error generating finance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate finance report',
      details: error.message
    });
  }
});

// Refresh cache endpoint
app.post('/api/refresh', async (req, res) => {
  try {
    cachedData = null;
    lastFetchTime = null;
    
    const orders = await getFreshData();
    
    res.json({
      success: true,
      message: 'Data refreshed successfully',
      totalOrders: orders.length,
      lastUpdated: lastFetchTime
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data'
    });
  }
});

// Get orders by fee type for modal details - Using dedicated FinanceOrderProcessor
app.get('/api/finance/orders/:feeType', async (req, res) => {
  try {
    const { feeType } = req.params;
    const { startDate, endDate, search, page = 1, limit = 10 } = req.query;
    
    console.log(`\n🔍 [API Finance Orders] Request for fee type: ${feeType}, page: ${page}, search: "${search}"`);
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    let orders = await getFreshData();
    
    console.log(`📊 [API] Total orders before date filter: ${orders.length}`);
    
    // CRITICAL FIX: Use SAME date filtering logic as TikTokFinanceProcessor
    if (startDate || endDate) {
      const ordersBeforeFilter = orders.length;
      // Use TikTokFinanceProcessor's filterOrdersByFinanceDate instead of dataProcessor
      orders = financeProcessor.filterOrdersByFinanceDate(orders, startDate, endDate);
      console.log(`📅 [API] Finance date filter applied: ${ordersBeforeFilter} -> ${orders.length} orders`);
      
      // Check orders with tax after using SAME logic as Finance Report
      const taxOrdersAfterFilter = orders.filter(o => parseFloat(o.tax) > 0).length;
      console.log(`🏷️ [API] Orders with tax after FINANCE filter: ${taxOrdersAfterFilter}`);
    }
    
    console.log(`📊 [API] Total orders after date filter: ${orders.length}`);
    
    // CRITICAL: Check if orders have the fee data structure we expect
    if (orders.length > 0) {
      const sampleOrder = orders[0];
      console.log(`🔍 [API] Sample order structure:`, {
        id: sampleOrder.id,
        hasAffFee: 'affFee' in sampleOrder,
        hasTax: 'tax' in sampleOrder,
        hasXtraFee: 'xtraFee' in sampleOrder,
        taxValue: sampleOrder.tax,
        taxType: typeof sampleOrder.tax,
        allKeys: Object.keys(sampleOrder).filter(k => k.includes('fee') || k.includes('tax') || k.includes('Fee'))
      });
    }
    
    // Use dedicated FinanceOrderProcessor for better debugging
    const filteredOrders = financeOrderProcessor.filterOrdersByFeeType(orders, feeType);
    
    // Apply search filter
    let searchedOrders = filteredOrders;
    if (search) {
      searchedOrders = financeOrderProcessor.searchOrders(filteredOrders, search);
    }
    
    // Pagination
    const paginationResult = financeOrderProcessor.paginateOrders(searchedOrders, page, limit);
    
    // Calculate total fee for this type
    const totalFee = financeOrderProcessor.calculateTotalFeeForType(filteredOrders, feeType);
    
    res.json({
      success: true,
      data: {
        orders: paginationResult.orders,
        total: searchedOrders.length,
        totalFee: totalFee,
        feeType: feeType,
        pagination: paginationResult.pagination
      },
      lastUpdated: lastFetchTime
    });
    
  } catch (error) {
    console.error(`[API Finance Orders] Error getting orders for fee type ${req.params.feeType}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders by fee type'
    });
  }
});

// =============================================================================
// AFF API ENDPOINTS - HOÀN TOÀN ĐỘC LẬP
// =============================================================================

// Get AFF dashboard metrics - Main endpoint for 5 cards + top 3
app.get('/api/aff/metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[AFF API] Request for AFF metrics: ${startDate} to ${endDate}`);
    
    // Get ALL AFF orders (không filter)
    const allAffOrders = await getFreshAffData();
    console.log(`[AFF API] Retrieved ${allAffOrders.length} AFF orders`);
    
    // Apply date filter if provided
    let filteredOrders = allAffOrders;
    if (startDate || endDate) {
      filteredOrders = donaffProcessor.filterAffOrdersByDateRange(allAffOrders, startDate, endDate);
      console.log(`[AFF API] After date filter: ${filteredOrders.length} orders`);
    }
    
    // Calculate metrics for 5 cards
    const metrics = donaffProcessor.calculateAffMetrics(filteredOrders);
    
    // Calculate top 3 performers
    const top3Performers = donaffProcessor.calculateTop3Performers(filteredOrders);
    
    // Get column warnings
    const columnWarnings = donaffProcessor.getColumnWarnings();
    const columnStatus = donaffProcessor.getColumnMappingStatus();
    
    res.json({
      success: true,
      data: {
        metrics: metrics,
        top3Performers: top3Performers,
        totalProcessed: allAffOrders.length,
        filteredCount: filteredOrders.length,
        dateRange: { startDate, endDate }
      },
      meta: {
        lastUpdated: lastAffFetchTime,
        columnWarnings: columnWarnings,
        columnStatus: columnStatus
      }
    });
    
  } catch (error) {
    console.error('[AFF API] Error getting AFF metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AFF metrics',
      details: error.message
    });
  }
});

// Get AFF details table - For the main table
app.get('/api/aff/details', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 1000 } = req.query; // Increased limit to show all AFFs
    console.log(`[AFF API] Request for AFF details: ${startDate} to ${endDate}, page ${page}`);
    
    // Get filtered AFF orders
    const allAffOrders = await getFreshAffData();
    let filteredOrders = allAffOrders;
    if (startDate || endDate) {
      filteredOrders = donaffProcessor.filterAffOrdersByDateRange(allAffOrders, startDate, endDate);
    }
    
    // Calculate detailed AFF stats
    const affDetails = donaffProcessor.calculateAffDetails(filteredOrders);
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedDetails = affDetails.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        affDetails: paginatedDetails,
        total: affDetails.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(affDetails.length / parseInt(limit))
        }
      },
      meta: {
        lastUpdated: lastAffFetchTime,
        filteredCount: filteredOrders.length
      }
    });
    
  } catch (error) {
    console.error('[AFF API] Error getting AFF details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AFF details',
      details: error.message
    });
  }
});

// Get orders by AFF and status - For popup modals
app.get('/api/aff/orders/:affName/:status', async (req, res) => {
  try {
    const { affName, status } = req.params;
    const { startDate, endDate, search, page = 1, limit = 10 } = req.query;
    
    console.log(`[AFF API] Request for orders: AFF=${affName}, Status=${status}, Page=${page}`);
    
    // Get filtered AFF orders
    const allAffOrders = await getFreshAffData();
    let filteredOrders = allAffOrders;
    if (startDate || endDate) {
      filteredOrders = donaffProcessor.filterAffOrdersByDateRange(allAffOrders, startDate, endDate);
    }
    
    // Filter by AFF name
    let affOrders = filteredOrders.filter(order => order.affName === decodeURIComponent(affName));
    
    // Filter by status
    if (status !== 'total') {
      const statusMap = {
        'completed': 'completed',
        'processing': 'processing', 
        'cancelled': 'cancelled'
      };
      const targetStatus = statusMap[status];
      if (targetStatus) {
        affOrders = affOrders.filter(order => order.statusMapped === targetStatus);
      }
    }
    
    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      affOrders = affOrders.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        order.productName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = affOrders.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        total: affOrders.length,
        affName: decodeURIComponent(affName),
        status: status,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(affOrders.length / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('[AFF API] Error getting AFF orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AFF orders',
      details: error.message
    });
  }
});

// Get content analysis for specific AFF - For inline analysis
app.get('/api/aff/analysis/:affName', async (req, res) => {
  try {
    const { affName } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`[AFF API] Request for content analysis: AFF=${affName}`);
    
    // Get filtered AFF orders
    const allAffOrders = await getFreshAffData();
    let filteredOrders = allAffOrders;
    if (startDate || endDate) {
      filteredOrders = donaffProcessor.filterAffOrdersByDateRange(allAffOrders, startDate, endDate);
    }
    
    // Analyze content breakdown for this AFF
    const contentAnalysis = donaffProcessor.analyzeAffByContent(filteredOrders, decodeURIComponent(affName));
    
    // Get top 3 products for this AFF
    const top3Products = donaffProcessor.getTop3Products(filteredOrders, decodeURIComponent(affName));
    
    res.json({
      success: true,
      data: {
        affName: decodeURIComponent(affName),
        contentAnalysis: contentAnalysis,
        top3Products: top3Products,
        totalAnalyzed: contentAnalysis.reduce((sum, item) => sum + item.orderCount, 0)
      }
    });
    
  } catch (error) {
    console.error('[AFF API] Error getting AFF content analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AFF content analysis',
      details: error.message
    });
  }
});

// Refresh AFF cache endpoint
app.post('/api/aff/refresh', async (req, res) => {
  try {
    cachedAffData = null;
    lastAffFetchTime = null;
    
    const affOrders = await getFreshAffData();
    
    res.json({
      success: true,
      message: 'AFF data refreshed successfully',
      totalAffOrders: affOrders.length,
      lastUpdated: lastAffFetchTime
    });
  } catch (error) {
    console.error('[AFF API] Error refreshing AFF data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh AFF data',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TikTok Shop API Server is running',
    timestamp: new Date().toISOString(),
    cacheStatus: cachedData ? 'loaded' : 'empty',
    affCacheStatus: cachedAffData ? 'loaded' : 'empty',
    lastFetchTime: lastFetchTime,
    lastAffFetchTime: lastAffFetchTime
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log(`TikTok Shop API Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

module.exports = app;

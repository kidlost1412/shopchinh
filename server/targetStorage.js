const fs = require('fs');
const path = require('path');

class TargetStorage {
  constructor() {
    this.dataFile = path.join(__dirname, 'targets.json');
    this.ensureDataFile();
  }

  // Ensure data file exists
  ensureDataFile() {
    if (!fs.existsSync(this.dataFile)) {
      const defaultData = {
        monthlyTarget: 0,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(defaultData, null, 2));
    }
  }

  // Get current target
  getTarget() {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading target data:', error);
      return { monthlyTarget: 0, lastUpdated: null, updatedBy: null };
    }
  }

  // Set new target
  setTarget(monthlyTarget, updatedBy = 'user') {
    try {
      const data = {
        monthlyTarget: parseFloat(monthlyTarget) || 0,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`[TargetStorage] Target updated to ${monthlyTarget} by ${updatedBy}`);
      return data;
    } catch (error) {
      console.error('Error saving target data:', error);
      throw error;
    }
  }

  // Get target history (for future enhancement)
  getTargetHistory() {
    // For now, just return current target
    // In future, we can implement history tracking
    return [this.getTarget()];
  }
}

module.exports = TargetStorage;

const fs = require('fs');
const path = require('path');

const target = '/home/samar/dashboard-tasks.json';

// Wait for the file to exist before watching
const watchInterval = setInterval(() => {
  if (fs.existsSync(target)) {
    clearInterval(watchInterval);
    
    // Read current state to avoid triggering immediately on load if no pending tasks
    let lastData = fs.readFileSync(target, 'utf8');
    
    fs.watchFile(target, { interval: 1000 }, () => {
      try {
        const currentData = fs.readFileSync(target, 'utf8');
        if (currentData !== lastData) {
          const tasks = JSON.parse(currentData);
          if (tasks.some(t => t.status === 'PENDING')) {
            console.log("PENDING TASK DETECTED!");
            process.exit(0);
          }
          lastData = currentData;
        }
      } catch (err) {
        // file might be in the middle of a write
      }
    });
  }
}, 1000);

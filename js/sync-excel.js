const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const EXCEL_URL = process.argv[2];
const OUTPUT_PATH = 'data/schedule.json';

if (!EXCEL_URL) {
    console.error("No Excel URL provided.");
    process.exit(1);
}

console.log(`Starting sync from: ${EXCEL_URL}`);

// Ensure xlsx is available
try {
    require.resolve('xlsx');
} catch (e) {
    console.log("Installing xlsx...");
    execSync('npm install xlsx');
}
const XLSX = require('xlsx');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function run() {
    const tempFile = 'temp_sync.xlsx';
    try {
        await downloadFile(EXCEL_URL, tempFile);
        console.log("File downloaded.");

        const workbook = XLSX.readFile(tempFile);
        const stateSheet = workbook.Sheets['APP_STATE_DO_NOT_EDIT'];

        if (!stateSheet) {
            throw new Error("Could not find 'APP_STATE_DO_NOT_EDIT' sheet in the Excel file.");
        }

        const jsonStr = stateSheet['A2'] ? stateSheet['A2'].v : null;
        if (!jsonStr) {
            throw new Error("Cell A2 in 'APP_STATE_DO_NOT_EDIT' is empty.");
        }

        // Validate JSON
        const data = JSON.parse(jsonStr);
        if (!data.employees) {
            throw new Error("Invalid app state JSON: missing employees array.");
        }

        // Save to data/schedule.json
        if (!fs.existsSync('data')) fs.mkdirSync('data');
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
        console.log(`Successfully updated ${OUTPUT_PATH}`);

    } catch (err) {
        console.error("Sync failed:", err.message);
        process.exit(1);
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

run();

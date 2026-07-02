import { app, saveState, getWeeklySchedule } from './state.js';
import { formatHoursToHHMMString, format12HourTime, formatBreakTime, getShiftHours } from './utils.js';

export function exportScheduleToSpreadsheet() {
        if (typeof XLSX === 'undefined') { alert("Could not export data. The required library is missing."); return; }
        const wb = XLSX.utils.book_new();

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        if (app.showSaturday !== false) days.push('Sat');
        if (app.showSunday !== false) days.push('Sun');

        const dayLabels = {
            'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };

        const monday = new Date(app.scheduleWeekDate + 'T12:00:00');
        const currentWeekSchedules = getWeeklySchedule(app.scheduleWeekDate);

        const ws = {};
        const merges = [];
        const cols = [{ wch: 30 }]; // Employee column
        for (let i = 0; i < days.length; i++) {
            cols.push({ wch: 12 }, { wch: 12 }, { wch: 12 }); // 3 cols per day
        }
        ws['!cols'] = cols;

        // Styles
        const headerStyle = {
            font: { bold: true, name: 'Inter', sz: 10 },
            fill: { fgColor: { rgb: "F3F4F6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "9CA3AF" } },
                bottom: { style: "thin", color: { rgb: "9CA3AF" } },
                left: { style: "thin", color: { rgb: "9CA3AF" } },
                right: { style: "thin", color: { rgb: "9CA3AF" } }
            }
        };
        const branchHeaderStyle = {
            ...headerStyle,
            font: { bold: true, sz: 12 }
        };
        const baseCellStyle = {
            font: { name: 'Inter', sz: 9 },
            alignment: { vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "D1D5DB" } },
                bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                left: { style: "thin", color: { rgb: "D1D5DB" } },
                right: { style: "thin", color: { rgb: "D1D5DB" } }
            }
        };

        const bannerStyles = {
            'PERSONAL DAY': { bg: "F4CCCC", text: "CC0000" },
            'HOLIDAY': { bg: "FFD966", text: "7F6000" },
            'SICK TIME': { bg: "D9EAD3", text: "274E13" },
            'VACATION': { bg: "CFE2F3", text: "0B5394" },
            'OFF': { bg: "E5E7EB", text: "374151" }
        };

        // Header Row 1
        ws[XLSX.utils.encode_cell({ r: 0, c: 0 })] = { v: "@", s: headerStyle };
        for (let i = 0; i < days.length; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            const mmdd = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
            const startCol = 1 + (i * 3);
            ws[XLSX.utils.encode_cell({ r: 0, c: startCol })] = { v: mmdd, s: headerStyle };
            ws[XLSX.utils.encode_cell({ r: 0, c: startCol + 1 })] = { s: headerStyle };
            ws[XLSX.utils.encode_cell({ r: 0, c: startCol + 2 })] = { s: headerStyle };
            merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
        }

        // Header Row 2
        ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = { v: "258", s: branchHeaderStyle };
        for (let i = 0; i < days.length; i++) {
            const startCol = 1 + (i * 3);
            ws[XLSX.utils.encode_cell({ r: 1, c: startCol })] = { v: dayLabels[days[i]].toUpperCase(), s: headerStyle };
            ws[XLSX.utils.encode_cell({ r: 1, c: startCol + 1 })] = { s: headerStyle };
            ws[XLSX.utils.encode_cell({ r: 1, c: startCol + 2 })] = { s: headerStyle };
            merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: startCol + 2 } });
        }

        // Employee Rows
        app.employees.forEach((emp, empIdx) => {
            const startRow = 2 + (empIdx * 3);
            const empSched = currentWeekSchedules.find(s => s.employeeId === emp.id);

            let empTotalHrs = 0;
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
                const dayData = empSched ? empSched.days[d] : null;
                if (dayData && dayData.active) empTotalHrs += getShiftHours(dayData);
            });

            const blockBottomBorder = { style: "medium", color: { rgb: "9CA3AF" } };
            const cardLeftBorder = { style: "medium", color: { rgb: "D1D5DB" } };

            const getNameStyle = { ...baseCellStyle, font: { bold: true, sz: 11 }, border: { ...baseCellStyle.border, left: cardLeftBorder } };
            const getRoleStyle = { ...baseCellStyle, font: { sz: 9, color: { rgb: "9CA3AF" } }, border: { ...baseCellStyle.border, left: cardLeftBorder } };
            const getTotalStyle = { ...baseCellStyle, alignment: { horizontal: "right", vertical: "bottom" }, font: { sz: 9, color: { rgb: "9CA3AF" } }, border: { ...baseCellStyle.border, left: cardLeftBorder, bottom: blockBottomBorder } };

            // Employee Info Col
            ws[XLSX.utils.encode_cell({ r: startRow, c: 0 })] = { v: emp.name, s: getNameStyle };
            ws[XLSX.utils.encode_cell({ r: startRow + 1, c: 0 })] = { v: emp.role || '', s: getRoleStyle };
            ws[XLSX.utils.encode_cell({ r: startRow + 2, c: 0 })] = { v: formatHoursToHHMMString(empTotalHrs), s: getTotalStyle };

            // Day Cells
            days.forEach((day, dayIdx) => {
                const startCol = 1 + (dayIdx * 3);
                const dayData = empSched ? empSched.days[day] : null;
                const dayHrs = getShiftHours(dayData);

                const typeUpper = (dayData?.type || '').toUpperCase();
                const isSpecialDay = !dayData?.active || (typeUpper !== 'REGULAR' && typeUpper !== 'OFF' && typeUpper !== 'OPEN BRANCH' && typeUpper !== 'CLOSE BRANCH');

                const cellStyleTop = { ...baseCellStyle };
                const cellStyleMid = { ...baseCellStyle };
                const cellStyleBot = { ...baseCellStyle, alignment: { horizontal: "right", vertical: "bottom" }, border: { ...baseCellStyle.border, bottom: blockBottomBorder } };

                if (isSpecialDay) {
                    const label = !dayData?.active ? 'OFF' : typeUpper;
                    let styleKey = 'OFF';
                    if (label.includes('VACATION')) styleKey = 'VACATION';
                    else if (label.includes('SICK')) styleKey = 'SICK TIME';
                    else if (label.includes('PERSONAL')) styleKey = 'PERSONAL DAY';
                    else if (label.includes('HOLIDAY')) styleKey = 'HOLIDAY';

                    const style = bannerStyles[styleKey];
                    const specialHeaderStyle = {
                        ...baseCellStyle,
                        fill: { fgColor: { rgb: style.bg } },
                        font: { bold: true, sz: 10, color: { rgb: style.text } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };

                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol })] = { v: label.includes('SICK') ? 'SICK TIME' : (label.includes('PERSONAL') ? 'PERSONAL DAY' : label), s: specialHeaderStyle };
                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol + 1 })] = { s: specialHeaderStyle };
                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol + 2 })] = { s: specialHeaderStyle };
                    merges.push({ s: { r: startRow, c: startCol }, e: { r: startRow, c: startCol + 2 } });

                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol })] = { s: baseCellStyle };
                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol + 1 })] = { s: baseCellStyle };
                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol + 2 })] = { s: baseCellStyle };

                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol })] = { s: cellStyleBot };
                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol + 1 })] = { s: cellStyleBot };
                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol + 2 })] = { v: formatHoursToHHMMString(dayHrs), s: { ...cellStyleBot, font: { color: { rgb: "9CA3AF" } } } };
                } else {
                    // Regular Shift
                    // Row 1: Location (Bold & Uppercase)
                    const locationVal = (dayData.location || '').toUpperCase();
                    const isSpecialAssignment = locationVal.toLowerCase() === 'special assignment';
                    const locationStyle = {
                        ...cellStyleTop,
                        font: { bold: true, italic: isSpecialAssignment, sz: 9, color: { rgb: isSpecialAssignment ? "CC0000" : "434343" } },
                        alignment: { horizontal: "left" }
                    };
                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol })] = { v: locationVal, s: locationStyle };
                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol + 1 })] = { s: cellStyleTop };
                    ws[XLSX.utils.encode_cell({ r: startRow, c: startCol + 2 })] = { s: cellStyleTop };
                    merges.push({ s: { r: startRow, c: startCol }, e: { r: startRow, c: startCol + 2 } });

                    // Row 2: Shift In, Shift Out, Break
                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol })] = { v: format12HourTime(dayData.shiftIn), s: { ...cellStyleMid, alignment: { horizontal: "left" } } };
                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol + 1 })] = { v: format12HourTime(dayData.shiftOut), s: { ...cellStyleMid, alignment: { horizontal: "center" } } };
                    ws[XLSX.utils.encode_cell({ r: startRow + 1, c: startCol + 2 })] = { v: formatBreakTime(dayData.breakMins), s: { ...cellStyleMid, alignment: { horizontal: "right" }, font: { color: { rgb: "9CA3AF" } } } };

                    // Row 3: Role (Tag) and Day Total (Bottom Right)
                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol })] = { v: dayData.role || '', s: { ...cellStyleBot, alignment: { horizontal: "left" }, font: { sz: 8, color: { rgb: "9CA3AF" } } } };
                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol + 1 })] = { s: cellStyleBot };
                    ws[XLSX.utils.encode_cell({ r: startRow + 2, c: startCol + 2 })] = { v: formatHoursToHHMMString(dayHrs), s: { ...cellStyleBot, font: { color: { rgb: "9CA3AF" } } } };
                }
            });
        });

        ws['!merges'] = merges;
        const range = { s: { r: 0, c: 0 }, e: { r: 2 + app.employees.length * 3 - 1, c: 1 + days.length * 3 - 1 } };
        ws['!ref'] = XLSX.utils.encode_range(range);

        XLSX.utils.book_append_sheet(wb, ws, 'Weekly Schedule');
        XLSX.writeFile(wb, `Team_Schedule_Week_${app.scheduleWeekDate}.xlsx`);
    }

export function exportScheduleToICS() {
        const currentWeekSchedules = getWeeklySchedule(app.scheduleWeekDate);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayOffsets = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Team Schedule//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        const mondayDate = new Date(app.scheduleWeekDate + 'T12:00:00');

        app.employees.forEach(emp => {
            const empSched = currentWeekSchedules.find(s => s.employeeId === emp.id);
            if (!empSched) return;

            days.forEach(day => {
                const dayData = empSched.days[day];
                if (!dayData || !dayData.active) return;

                // Skip if it's an absence and we only want work shifts,
                // but let's include everything for now.
                const typeUpper = (dayData.type || 'Regular').toUpperCase();
                const isAbsence = ['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(typeUpper);

                const eventDate = new Date(mondayDate);
                eventDate.setDate(mondayDate.getDate() + dayOffsets[day]);
                const dateStr = eventDate.toISOString().split('T')[0].replace(/-/g, '');

                let startTime = '090000';
                let endTime = '170000';
                let summary = `${emp.name}: ${dayData.type || 'Shift'}`;

                if (!isAbsence && dayData.shiftIn && dayData.shiftOut) {
                    startTime = dayData.shiftIn.replace(/:/g, '') + '00';
                    endTime = dayData.shiftOut.replace(/:/g, '') + '00';
                    summary = `${emp.name}: ${dayData.location || 'Work'}`;
                } else if (isAbsence) {
                    // All day event for absence
                    const endDate = new Date(eventDate);
                    endDate.setDate(eventDate.getDate() + 1);
                    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

                    icsContent.push('BEGIN:VEVENT');
                    icsContent.push(`UID:sched-${app.scheduleWeekDate}-${emp.id}-${day}`);
                    icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                    icsContent.push(`DTSTART;VALUE=DATE:${dateStr}`);
                    icsContent.push(`DTEND;VALUE=DATE:${endDateStr}`);
                    icsContent.push(`SUMMARY:${emp.name}: ${typeUpper}`);
                    icsContent.push('END:VEVENT');
                    return;
                }

                icsContent.push('BEGIN:VEVENT');
                // Use a stable UID so Outlook can potentially update existing entries
                icsContent.push(`UID:sched-${app.scheduleWeekDate}-${emp.id}-${day}`);
                icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                icsContent.push(`DTSTART:${dateStr}T${startTime}`);
                icsContent.push(`DTEND:${dateStr}T${endTime}`);
                icsContent.push(`SUMMARY:${summary}`);
                icsContent.push(`LOCATION:${dayData.location || ''}`);
                icsContent.push(`DESCRIPTION:Role: ${dayData.role || ''}\\nBreak: ${dayData.breakMins}m`);
                icsContent.push('END:VEVENT');
            });
        });

        icsContent.push('END:VCALENDAR');

        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `Team_Schedule_${app.scheduleWeekDate}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Success', 'Outlook .ics file generated!', 'success');
    }

export function exportToSpreadsheet(employees, logEntries, leaveTypes, year) {
        if (typeof XLSX === 'undefined') { alert("Could not export data. The required library is missing."); return; }
        const wb = XLSX.utils.book_new();
        const dashboardData = [['Team Leave Summary', '', 'Year:', year], [], ['Employee Name', 'Vacation Allotment', 'Vacation Taken', 'Vacation Remaining', 'Sick Days Taken', 'Personal Days Taken', 'Total Days Taken']];
        employees.forEach(emp => { dashboardData.push([emp.name, emp.vacationAllotment]); });
        const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
        employees.forEach((_, index) => {
            const r = index + 4;
            const formula = (type) => `SUMIFS('Data Log'!D:D,'Data Log'!B:B,A${r},'Data Log'!C:C,"${type}",'Data Log'!A:A,">="&DATE($D$1,1,1),'Data Log'!A:A,"<="&DATE($D$1,12,31))`;
            dashboardSheet[`C${r}`] = {t:'n', f: formula('Vacation')};
            dashboardSheet[`D${r}`] = {t:'n', f: `B${r}-C${r}`};
            dashboardSheet[`E${r}`] = {t:'n', f: formula('Sick Day')};
            dashboardSheet[`F${r}`] = {t:'n', f: formula('Personal Day')};
            dashboardSheet[`G${r}`] = {t:'n', f: `SUM(C${r},E${r},F${r})`};
        });
        dashboardSheet['!cols'] = [{wch:25},{wch:18},{wch:15},{wch:20},{wch:18},{wch:20},{wch:18}];
        XLSX.utils.book_append_sheet(wb, dashboardSheet, 'Dashboard');
        const employeeMap = new Map(employees.map(e => [e.id, e.name]));
        const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.id, lt.name]));
        const logData = [['Date', 'Employee Name', 'Absence Type', 'Duration (Days)', 'Notes'], ...[...logEntries].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(log => [log.date, employeeMap.get(log.employeeId), leaveTypeMap.get(log.leaveTypeId), log.duration, log.notes])];
        const logSheet = XLSX.utils.aoa_to_sheet(logData);
        logSheet['!cols'] = [{wch:12},{wch:25},{wch:18},{wch:15},{wch:40}];
        XLSX.utils.book_append_sheet(wb, logSheet, 'Data Log');
        const setupData = [['Employee List', 'Vacation Allotment', '', 'Absence Types', 'Duration (HH:MM)', 'Color'], ...Array.from({length: Math.max(employees.length, leaveTypes.length)}, (_, i) => [employees[i]?.name, employees[i]?.vacationAllotment, '', leaveTypes[i]?.name, leaveTypes[i]?.durationHHMM, leaveTypes[i]?.color])];
        const setupSheet = XLSX.utils.aoa_to_sheet(setupData);
        setupSheet['!cols'] = [{wch:25},{wch:20},{wch:5},{wch:20},{wch:15},{wch:10}];
        XLSX.utils.book_append_sheet(wb, setupSheet, 'Setup');
        const months = Array.from({length: 12}, (_, i) => new Date(year, i).toLocaleString('default', {month:'short'}));
        const yearlyHeader = ['Employee', ...months, 'Annual Total'];
        const yearlyData = [yearlyHeader, ...employees.map(emp => {
            const monthlyTotals = Array(12).fill(0);
            logEntries.filter(log => log.employeeId === emp.id && new Date(log.date).getFullYear() === year).forEach(log => { monthlyTotals[new Date(log.date).getMonth()] += log.duration; });
            return [emp.name, ...monthlyTotals, monthlyTotals.reduce((a,b)=>a+b,0)];
        })];
        const yearlySheet = XLSX.utils.aoa_to_sheet(yearlyData);
        yearlySheet['!cols'] = [{wch:25},...Array(12).fill({wch:8}),{wch:15}];
        XLSX.utils.book_append_sheet(wb, yearlySheet, 'Yearly Overview');

        // ADDED: Full App State Sheet for Round-Trip
        const stateData = [['App State JSON'], [JSON.stringify(app)]];
        const stateSheet = XLSX.utils.aoa_to_sheet(stateData);
        XLSX.utils.book_append_sheet(wb, stateSheet, 'APP_STATE_DO_NOT_EDIT');

        XLSX.writeFile(wb, `Team_Schedule_Tracker_${year}.xlsx`);
    }

export function importFromExcel(file) {
        if (typeof XLSX === 'undefined') { alert("Could not import data. The required library is missing."); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Try to find the hidden state sheet first
                const stateSheet = workbook.Sheets['APP_STATE_DO_NOT_EDIT'];
                if (stateSheet) {
                    const jsonStr = stateSheet['A2'] ? stateSheet['A2'].v : null;
                    if (jsonStr) {
                        const loadedApp = JSON.parse(jsonStr);
                        // Validation: Check if it looks like our app state
                        if (loadedApp.employees && Array.isArray(loadedApp.employees)) {
                            app = { ...app, ...loadedApp };
                            // Re-instantiate dates
                            app.dailyCalendarDate = new Date(app.dailyCalendarDate);
                            app.monthlyCalendarDate = new Date(app.monthlyCalendarDate);
                            saveState();
                            render();
                            showToast("Import Success", "Data fully restored from Excel file.", "success");
                            return;
                        }
                    }
                }

                // Fallback: If no state sheet, we could try to parse the other sheets,
                // but that's much more complex and error-prone.
                alert("This Excel file does not appear to contain valid Team Schedule backup data.");
            } catch (err) {
                console.error("Excel Import Error:", err);
                alert("Error reading Excel file. Make sure it's a valid .xlsx file exported from this app.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

export function openShareModal(renderSchedule) {
    const modalEl = document.getElementById('share-schedule-modal');
    const empListEl = document.getElementById('share-employee-list');
    const startWeekEl = document.getElementById('share-start-week');
    const endWeekEl = document.getElementById('share-end-week');

    // Populate employee list
    empListEl.innerHTML = app.employees.map(emp => `
        <label class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
            <input type="checkbox" name="share-emp" value="${emp.id}" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
            <span class="text-sm font-semibold text-gray-700">${emp.name}</span>
        </label>
    `).join('');

    // Default date range: current week to end of month
    startWeekEl.value = app.scheduleWeekDate;
    const monday = new Date(app.scheduleWeekDate + 'T12:00:00');
    const endOfMonth = new Date(monday.getFullYear(), monday.getMonth() + 1, 0);

    // Find last Monday of the month for end week
    let lastMon = new Date(endOfMonth);
    while(lastMon.getDay() !== 1) lastMon.setDate(lastMon.getDate() - 1);
    endWeekEl.value = lastMon.toISOString().split('T')[0];

    let selectedFormat = 'image';
    const formatBtns = document.querySelectorAll('.share-format-btn');
    formatBtns.forEach(btn => {
        btn.onclick = () => {
            formatBtns.forEach(b => b.classList.remove('border-blue-500', 'bg-blue-50'));
            btn.classList.add('border-blue-500', 'bg-blue-50');
            selectedFormat = btn.dataset.format;
        };
    });
    // Set default active format
    document.querySelector('.share-format-btn[data-format="image"]').click();

    document.getElementById('share-select-all-emps').onclick = () => {
        document.querySelectorAll('input[name="share-emp"]').forEach(cb => cb.checked = true);
    };
    document.getElementById('share-deselect-all-emps').onclick = () => {
        document.querySelectorAll('input[name="share-emp"]').forEach(cb => cb.checked = false);
    };

    const closeBtn = document.getElementById('share-modal-close-btn');
    const cancelBtn = document.getElementById('share-cancel-btn');
    const confirmBtn = document.getElementById('share-confirm-btn');

    const closeModal = () => modalEl.classList.remove('is-open');
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    confirmBtn.onclick = () => {
        const selectedEmps = Array.from(document.querySelectorAll('input[name="share-emp"]:checked')).map(cb => cb.value);
        const startWeek = startWeekEl.value;
        const endWeek = endWeekEl.value;

        if (selectedEmps.length === 0) {
            alert("Please select at least one employee.");
            return;
        }
        if (!startWeek || !endWeek) {
            alert("Please select both start and end weeks.");
            return;
        }

        handleShareExport(selectedEmps, startWeek, endWeek, selectedFormat);
        closeModal();
    };

    modalEl.classList.add('is-open');
}

function handleShareExport(employeeIds, startWeekStr, endWeekStr, format) {
    const weeks = [];
    let currentWeek = new Date(startWeekStr + 'T12:00:00');
    const endWeek = new Date(endWeekStr + 'T12:00:00');

    while (currentWeek <= endWeek) {
        weeks.push(currentWeek.toISOString().split('T')[0]);
        currentWeek.setDate(currentWeek.getDate() + 7);
    }

    if (format === 'image') {
        exportScheduleToImage();
    } else if (format === 'ics') {
        employeeIds.forEach(empId => {
            exportEmployeeScheduleToICS(empId, weeks);
        });
    } else if (format === 'excel') {
        exportBulkScheduleToExcel(employeeIds, weeks);
    }
}

export function exportScheduleToImage() {
    const container = document.getElementById('schedule-view-container');
    if (!container || typeof html2canvas === 'undefined') {
        alert("Image export failed: missing container or library.");
        return;
    }

    // Hide elements we don't want in picture
    const hideSelectors = ['#add-employee-inline-btn', '#add-employee-inline-btn-vertical', '.row-delete-inline-btn', '.row-default-btn', '.row-clear-btn'];
    const hiddenEls = [];
    hideSelectors.forEach(s => {
        container.querySelectorAll(s).forEach(el => {
            if (el.style.display !== 'none') {
                el.dataset.oldDisplay = el.style.display;
                el.style.display = 'none';
                hiddenEls.push(el);
            }
        });
    });

    html2canvas(container, {
        backgroundColor: '#f3f4f6',
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Team_Schedule_${app.scheduleWeekDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore hidden
        hiddenEls.forEach(el => el.style.display = el.dataset.oldDisplay || '');
        showToast('Success', 'Schedule image generated!', 'success');
    });
}

export function exportEmployeeScheduleToICS(employeeId, weeks) {
    const emp = app.employees.find(e => e.id === employeeId);
    if (!emp) return;

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Team Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    weeks.forEach(weekDateStr => {
        const weekSchedules = getWeeklySchedule(weekDateStr);
        const empSched = weekSchedules.find(s => s.employeeId === employeeId);
        if (!empSched) return;

        const mondayDate = new Date(weekDateStr + 'T12:00:00');
        const dayOffsets = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };

        Object.entries(empSched.days).forEach(([day, dayData]) => {
            if (!dayData || !dayData.active) return;

            const eventDate = new Date(mondayDate);
            eventDate.setDate(mondayDate.getDate() + dayOffsets[day]);
            const dateStr = eventDate.toISOString().split('T')[0].replace(/-/g, '');

            const typeUpper = (dayData.type || 'Regular').toUpperCase();
            const isAbsence = ['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(typeUpper);

            if (isAbsence) {
                const endDate = new Date(eventDate);
                endDate.setDate(eventDate.getDate() + 1);
                const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
                icsContent.push('BEGIN:VEVENT');
                icsContent.push(`UID:sched-${weekDateStr}-${employeeId}-${day}`);
                icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                icsContent.push(`DTSTART;VALUE=DATE:${dateStr}`);
                icsContent.push(`DTEND;VALUE=DATE:${endDateStr}`);
                icsContent.push(`SUMMARY:${emp.name}: ${typeUpper}`);
                icsContent.push('END:VEVENT');
            } else {
                const startTime = (dayData.shiftIn || '09:00').replace(/:/g, '') + '00';
                const endTime = (dayData.shiftOut || '17:00').replace(/:/g, '') + '00';
                icsContent.push('BEGIN:VEVENT');
                icsContent.push(`UID:sched-${weekDateStr}-${employeeId}-${day}`);
                icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                icsContent.push(`DTSTART:${dateStr}T${startTime}`);
                icsContent.push(`DTEND:${dateStr}T${endTime}`);
                icsContent.push(`SUMMARY:${emp.name}: ${dayData.location || 'Work'}`);
                icsContent.push(`LOCATION:${dayData.location || ''}`);
                icsContent.push(`DESCRIPTION:Role: ${dayData.role || ''}\\nBreak: ${dayData.breakMins}m`);
                icsContent.push('END:VEVENT');
            }
        });
    });

    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Schedule_${emp.name.replace(/ /g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportBulkScheduleToExcel(employeeIds, weeks) {
    if (typeof XLSX === 'undefined') { alert("Missing XLSX library."); return; }
    const wb = XLSX.utils.book_new();

    weeks.forEach(weekDateStr => {
        const weekSchedules = getWeeklySchedule(weekDateStr);
        const filteredSchedules = weekSchedules.filter(s => employeeIds.includes(s.employeeId));

        const data = [['Employee', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']];
        filteredSchedules.forEach(sched => {
            const emp = app.employees.find(e => e.id === sched.employeeId);
            const row = [emp.name];
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
                const d = sched.days[day];
                if (!d || !d.active) row.push('OFF');
                else if (['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(d.type.toUpperCase())) row.push(d.type);
                else row.push(`${d.shiftIn}-${d.shiftOut} (${d.location})`);
            });
            data.push(row);
        });

        const sheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, sheet, weekDateStr);
    });

    XLSX.writeFile(wb, `Bulk_Schedule_Export.xlsx`);
}

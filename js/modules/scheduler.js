import { app, saveState, getWeeklySchedule } from './state.js';
import { ICONS } from './config.js';
import {
    formatHoursToHHMMString, format12HourTime, getShiftHours,
    getEmployeeBgColor, getEmployeeTextClass, getMondayDateString,
    getWeekDisplayRange, format12Hour, calculateHours, formatBreakTime,
    getContrastYIQ, hhmmToHours
} from './utils.js';
import {
    renderPageHeader, renderEmptyState, showToast, showConfirm
} from './ui-components.js';
import { exportScheduleToSpreadsheet, exportScheduleToICS, exportToSpreadsheet, importFromExcel, openShareModal } from './exports.js';

export function renderSchedule() {
        const downloadIcon = ICONS.download;
        const loadIcon = ICONS.load;
        const saveIcon = ICONS.save;

        if (!app.scheduleWeekDate) {
            app.scheduleWeekDate = getMondayDateString(new Date());
        }

        if (app.employees.length === 0) {
            renderEmptyState('Welcome to the Team Schedule!', 'Add employees in the Setup tab to start scheduling.', 'Go to Setup', () => { app.activeTab = 'Setup'; render(); });
            return;
        }

        const weekSchedules = getWeeklySchedule(app.scheduleWeekDate);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        if (app.showSaturday !== false) days.push('Sat');
        if (app.showSunday !== false) days.push('Sun');

        if (!app.scheduleViewMode) {
            app.scheduleViewMode = 'editor';
        }

        let viewToggleHtml = `
            <div class="flex items-center bg-gray-200 p-1 rounded-lg">
                <button id="view-mode-editor" class="px-2 md:px-4 py-1 md:py-1.5 rounded-md text-[11px] md:text-sm font-semibold transition-all ${app.scheduleViewMode === 'editor' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}">Weekly Spreadsheet</button>
                <button id="view-mode-calendar" class="px-2 md:px-4 py-1 md:py-1.5 rounded-md text-[11px] md:text-sm font-semibold transition-all ${app.scheduleViewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}">Coverage Summary</button>
            </div>
        `;

        let viewScopeHtml = `
            <div class="flex items-center bg-gray-200 p-1 rounded-lg">
                <button id="view-type-daily" class="px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${app.scheduleViewType === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="Daily Timeline View">D</button>
                <button id="view-type-weekly" class="px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${app.scheduleViewType === 'weekly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="Weekly Spreadsheet View">W</button>
                <button id="view-type-monthly" class="px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${app.scheduleViewType === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="Monthly Calendar View">M</button>
            </div>
        `;

        let mainScheduleContent = '';
        if (app.scheduleViewType === 'daily') {
            mainScheduleContent = renderScheduleDaily(weekSchedules, days);
        } else if (app.scheduleViewType === 'monthly') {
            mainScheduleContent = renderScheduleMonthly();
        } else {
            if (app.scheduleViewMode === 'editor') {
                if (app.layoutOrientation === 'vertical') {
                    mainScheduleContent = renderScheduleVertical(weekSchedules, days);
                } else {
                    mainScheduleContent = renderScheduleEditor(weekSchedules, days);
                }
            } else {
                mainScheduleContent = renderScheduleCalendar(weekSchedules, days);
            }
        }

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div>
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                     <div>


                     </div>
                     <div class="flex flex-wrap items-center gap-2 md:gap-3">
                         ${viewScopeHtml}
                         ${viewToggleHtml}

                         <!-- Compact Persistence Buttons -->
                         <div class="flex items-center space-x-1 bg-gray-100 p-0.5 md:p-1 rounded-lg border border-gray-200">
                             <!-- Excel Operations -->
                             <input type="file" id="load-excel-input" class="hidden" accept=".xlsx">
                             <label for="load-excel-input" class="p-1 md:p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer" title="Load from Excel">
                                 ${loadIcon}
                             </label>
                             <button id="save-excel-btn" class="p-1 md:p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-all" title="Save to Excel">
                                 ${downloadIcon}
                             </button>

                             <div class="w-px h-3 md:h-4 bg-gray-300 mx-0.5"></div>

                             <!-- JSON Operations -->
                             <input type="file" id="load-json-input" class="hidden" accept=".json">
                             <label for="load-json-input" class="p-1 md:p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-all cursor-pointer" title="Load JSON Backup">
                                 ${loadIcon}
                             </label>
                             <button id="save-json-btn" class="p-1 md:p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-all" title="JSON Backup">
                                 ${saveIcon}
                             </button>
                         </div>

                         <button id="export-ics-btn" class="flex items-center bg-blue-600 text-white py-1.5 md:py-2 px-3 md:px-4 rounded-md hover:bg-blue-700 font-semibold shadow-md transition-colors" title="Export to Outlook (.ics)">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                             <span class="ml-1.5 md:ml-2 text-[10px] md:text-xs uppercase font-bold">Outlook Export</span>
                         </button>

                         <button id="open-share-modal-btn" class="flex items-center bg-yellow-500 text-black py-1.5 md:py-2 px-3 md:px-4 rounded-md hover:bg-yellow-600 font-semibold shadow-md transition-colors" title="Share Schedule Options">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                             <span class="ml-1.5 md:ml-2 text-[10px] md:text-xs uppercase font-black">Share</span>
                         </button>

                         <button id="export-schedule-btn" class="flex items-center bg-green-600 text-white py-1.5 md:py-2 px-3 md:px-4 rounded-md hover:bg-green-700 font-semibold shadow-md transition-colors" title="Export CURRENT WEEK only">
                             <span class="scale-90 md:scale-100">${downloadIcon}</span><span class="ml-1.5 md:ml-2 text-[10px] md:text-xs uppercase font-bold">Export Week</span>
                         </button>
                     </div>
                </div>

                <!-- Week Selector Panel -->
                ${renderPageHeader('Team Schedule', 'Schedule')}
                <!-- White Control Bar Below Yellow Header -->
                <div class="bg-white p-4 border-b border-x border-gray-300 rounded-b-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md w-full">
                         <div class="flex flex-wrap items-center gap-3">
                             <div class="flex items-center space-x-2">
                                 <label for="week-picker" class="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-wider">Jump to Week:</label>
                                 <input type="date" id="week-picker" value="${app.scheduleWeekDate}" class="p-1 md:p-1.5 border border-gray-300 rounded-lg text-[11px] md:text-xs font-bold text-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none" /></div><div class="flex items-center space-x-1 bg-gray-100 p-0.5 md:p-1 rounded-lg border border-gray-200"><button id="today-week-btn" class="px-1.5 md:px-2 py-0.5 hover:bg-gray-200 rounded-md transition text-black font-black text-[10px] md:text-xs mr-0.5" aria-label="Today">Today</button><button id="prev-week-btn" class="px-1.5 md:px-2 py-0.5 hover:bg-gray-200 rounded-md transition text-black font-black text-[10px] md:text-xs" aria-label="Previous week">&lt;</button><button id="next-week-btn" class="px-1.5 md:px-2 py-0.5 hover:bg-gray-200 rounded-md transition text-black font-black text-[10px] md:text-xs" aria-label="Next week">&gt;</button></div><div class="hidden" style="display:none !important">
                             </div>

                             <div class="flex items-center bg-gray-100 p-0.5 md:p-1 rounded-lg border border-gray-200">
                                 <button id="toggle-horizontal-view" class="px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${app.layoutOrientation !== 'vertical' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="Switch to Horizontal View">Horizontal</button>
                                 <button id="toggle-vertical-view" class="px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${app.layoutOrientation === 'vertical' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="Switch to Vertical View">Vertical</button>
                             </div>
                         </div>

                         <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>
                          <div class="flex items-center space-x-2">
                              <input type="checkbox" id="toggle-coverage-totals" ${app.showCoverageTotals ? 'checked' : ''} class="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer" />
                              <label for="toggle-coverage-totals" class="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none">Show Review Rows</label>
                          </div>
                          <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>

                         <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <button id="copy-prev-week-btn" class="flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 px-3 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition whitespace-nowrap">
                                Copy Last Week
                            </button>
                            <div class="flex flex-1 md:flex-none gap-2">
                                <button id="smart-fill-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 py-1.5 px-2 md:px-3 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition whitespace-nowrap" title="AI-Powered Auto-Scheduler">
                                    Smart Fill
                                </button>
                                <button id="fill-defaults-btn" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 py-1.5 px-2 md:px-3 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition whitespace-nowrap" title="Pre-populates Monday-Friday with configured default shift hours">
                                    Fill Defaults
                                </button>
                                <button id="clear-week-btn" class="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-1.5 px-2 md:px-3 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition whitespace-nowrap">
                                    Clear Week
                                </button>
                            </div>
                         </div>
                     </div>
                </div>

                <!-- Main Schedule View Content -->
                <div id="schedule-view-container">
                     ${mainScheduleContent}
                </div>
            </div>
        `;

        document.getElementById('view-mode-editor').onclick = () => { app.scheduleViewMode = 'editor'; app.scheduleViewType = 'weekly'; saveState(); renderSchedule(); };
        document.getElementById('view-mode-calendar').onclick = () => { app.scheduleViewMode = 'calendar'; app.scheduleViewType = 'weekly'; saveState(); renderSchedule(); };

        document.getElementById('view-type-daily').onclick = () => { app.scheduleViewType = 'daily'; saveState(); renderSchedule(); };
        document.getElementById('view-type-weekly').onclick = () => { app.scheduleViewType = 'weekly'; saveState(); renderSchedule(); };
        document.getElementById('view-type-monthly').onclick = () => { app.scheduleViewType = 'monthly'; saveState(); renderSchedule(); };

        const toggleHorizontalBtn = document.getElementById('toggle-horizontal-view');
        if (toggleHorizontalBtn) {
            toggleHorizontalBtn.onclick = () => { app.layoutOrientation = 'horizontal'; saveState(); renderSchedule(); };
        }
        const toggleVerticalBtn = document.getElementById('toggle-vertical-view');
        if (toggleVerticalBtn) {
            toggleVerticalBtn.onclick = () => { app.layoutOrientation = 'vertical'; saveState(); renderSchedule(); };
        }

        const todayWeekBtn = document.getElementById('today-week-btn');
        if (todayWeekBtn) {
            todayWeekBtn.onclick = () => {
                app.scheduleWeekDate = getMondayDateString(new Date());
                saveState();
                renderSchedule();
            };
        }

        document.getElementById('prev-week-btn').onclick = () => {
            const current = new Date(app.scheduleWeekDate + 'T12:00:00');
            current.setDate(current.getDate() - 7);
            app.scheduleWeekDate = getMondayDateString(current);
            saveState();
            renderSchedule();
        };

        document.getElementById('next-week-btn').onclick = () => {
            const current = new Date(app.scheduleWeekDate + 'T12:00:00');
            current.setDate(current.getDate() + 7);
            app.scheduleWeekDate = getMondayDateString(current);
            saveState();
            renderSchedule();
        };

        document.getElementById('week-picker').onchange = (e) => {
            if (e.target.value) {
                app.scheduleWeekDate = getMondayDateString(new Date(e.target.value + 'T12:00:00'));
                saveState();
                renderSchedule();
            }
        };

        const toggleCoverageBtn = document.getElementById('toggle-coverage-totals');
        if (toggleCoverageBtn) {
            toggleCoverageBtn.onchange = (e) => {
                app.showCoverageTotals = e.target.checked;
                saveState();
                renderSchedule();
            };
        }

        document.getElementById('copy-prev-week-btn').onclick = () => {
            const current = new Date(app.scheduleWeekDate + 'T12:00:00');
            current.setDate(current.getDate() - 7);
            const prevWeekStr = getMondayDateString(current);
            const prevSchedules = app.schedules[prevWeekStr];

            if (prevSchedules && prevSchedules.length > 0) {
                app.schedules[app.scheduleWeekDate] = JSON.parse(JSON.stringify(prevSchedules));
                saveState();
                renderSchedule();
                showToast('Success', 'Copied schedule from previous week!', 'success');
            } else {
                alert('No schedule data found for the previous week (' + prevWeekStr + ').');
            }
        };

        document.getElementById('fill-defaults-btn').onclick = () => {
            const defaultIn = app.defaultShiftIn || '08:30';
            const defaultOut = app.defaultShiftOut || '17:00';
            const defaultBreak = app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45;
            const defaultInFormatted = format12HourTime(defaultIn);
            const defaultOutFormatted = format12HourTime(defaultOut);

            showConfirm(
                "Pre-populate Shifts",
                `Are you sure you want to pre-populate Mon-Fri shifts to ${defaultInFormatted} - ${defaultOutFormatted} with a ${defaultBreak} min break for all employees? (This overrides current weekly schedule changes)`,
                () => {
                    const sList = getWeeklySchedule(app.scheduleWeekDate);
                    sList.forEach(sched => {
                        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
                            sched.days[day] = { active: true, type: 'Regular', location: '', shiftIn: defaultIn, shiftOut: defaultOut, breakMins: defaultBreak };
                        });
                        ['Sat', 'Sun'].forEach(day => {
                            sched.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0 };
                        });
                    });
                    saveState();
                    renderSchedule();
                    showToast('Success', 'Default shifts loaded!', 'success');
                },
                "Pre-populate",
                false
            );
        };

        document.getElementById('clear-week-btn').onclick = () => {
            showConfirm(
                "Clear Schedule",
                "Are you sure you want to clear all schedule details for this week? All shifts will be set to OFF.",
                () => {
                    const sList = getWeeklySchedule(app.scheduleWeekDate);
                    sList.forEach(sched => {
                        days.forEach(day => {
                            sched.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' };
                        });
                    });
                    saveState();
                    renderSchedule();
                    showToast('Cleared', 'All days set to OFF for this week.', 'info');
                }
            );
        };

        const smartFillBtn = document.getElementById('smart-fill-btn');
        if (smartFillBtn) {
            smartFillBtn.onclick = () => {
                showConfirm(
                    "Smart Fill Schedule",
                    "Smart Fill will automatically assign opening, closing, and standard shifts for the week. It ensures at least 2 openers and 2 closers each day while respecting existing leave logs. Proceed?",
                    () => {
                        runSmartFill();
                        renderSchedule();
                        showToast("Smart Fill Complete", "Shifts have been automatically distributed.", "success");
                    },
                    "Run Smart Fill",
                    false
                );
            };
        }

        const openShareModalBtn = document.getElementById('open-share-modal-btn');
        if (openShareModalBtn) {
            openShareModalBtn.onclick = () => openShareModal();
        }

        document.getElementById('export-schedule-btn').onclick = () => {
            exportScheduleToSpreadsheet();
        };

        const exportIcsBtn = document.getElementById('export-ics-btn');
        if (exportIcsBtn) {
            exportIcsBtn.onclick = () => {
                exportScheduleToICS();
            };
        }

        const loadExcelInputSched = document.getElementById('load-excel-input');
        if (loadExcelInputSched) {
            loadExcelInputSched.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    importFromExcel(file);
                    e.target.value = '';
                }
            };
        }

        const saveExcelBtn = document.getElementById('save-excel-btn');
        if (saveExcelBtn) {
            saveExcelBtn.onclick = () => {
                exportToSpreadsheet(app.employees, app.logEntries, app.leaveTypes, app.currentYear);
            };
        }

        const loadJsonInput = document.getElementById('load-json-input');
        if (loadJsonInput) {
            loadJsonInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const loadedData = JSON.parse(event.target.result);
                        if (loadedData.employees && loadedData.logEntries && loadedData.leaveTypes) {
                            app = loadedData;
                            // Fix dates
                            app.dailyCalendarDate = new Date(app.dailyCalendarDate);
                            app.monthlyCalendarDate = new Date(app.monthlyCalendarDate);
                            saveState();
                            render();
                            showToast('Success', 'JSON Data loaded successfully!', 'success');
                        } else { alert('Invalid data file format.'); }
                    } catch (err) { alert('Error reading or parsing data file.'); console.error(err); }
                    finally { e.target.value = ''; }
                };
                reader.readAsText(file);
            };
        }

        const saveJsonBtn = document.getElementById('save-json-btn');
        if (saveJsonBtn) {
            saveJsonBtn.onclick = () => {
                const dataStr = JSON.stringify(app, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `team-schedule-backup-${app.currentYear}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Success', 'JSON Backup downloaded.', 'success');
            };
        }

        document.querySelectorAll('[data-quick-tab]').forEach(btn => {
            btn.onclick = () => {
                app.activeTab = btn.dataset.quickTab;
                saveState();
                render();
            };
        });

        if (app.scheduleViewMode === 'editor' || app.layoutOrientation === 'vertical') {
            attachEditorListeners(weekSchedules, days);
        } else if (app.scheduleViewType === 'daily' || app.scheduleViewType === 'monthly') {
            attachCalendarViewListeners();
        }
    }

    function attachCalendarViewListeners() {
        const prevDayBtn = document.getElementById('day-prev-btn');
        if (prevDayBtn) prevDayBtn.onclick = () => { app.dailyCalendarDate.setDate(app.dailyCalendarDate.getDate() - 1); saveState(); renderSchedule(); };

        const nextDayBtn = document.getElementById('day-next-btn');
        if (nextDayBtn) nextDayBtn.onclick = () => { app.dailyCalendarDate.setDate(app.dailyCalendarDate.getDate() + 1); saveState(); renderSchedule(); };

        const prevMonthBtn = document.getElementById('month-prev-btn');
        if (prevMonthBtn) prevMonthBtn.onclick = () => { app.monthlyCalendarDate.setMonth(app.monthlyCalendarDate.getMonth() - 1); saveState(); renderSchedule(); };

        const nextMonthBtn = document.getElementById('month-next-btn');
        if (nextMonthBtn) nextMonthBtn.onclick = () => { app.monthlyCalendarDate.setMonth(app.monthlyCalendarDate.getMonth() + 1); saveState(); renderSchedule(); };
    }

export function renderScheduleEditor(weekSchedules, days) {
        const dayLabels = {
            'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };

        const dailyTotals = days.map(day => {
            let totalHrs = 0;
            let countActive = 0;
            weekSchedules.forEach(sched => {
                const dayData = sched.days[day];
                if (dayData && dayData.active) {
                    totalHrs += getShiftHours(dayData);
                    countActive++;
                }
            });
            return { hours: parseFloat(totalHrs.toFixed(2)), count: countActive };
        });

        const totalHrsSum = dailyTotals.reduce((sum, t) => sum + t.hours, 0);

        const monday = new Date(app.scheduleWeekDate + 'T12:00:00');
        const headersHtml = `
            <th class="px-4 py-3 bg-[#f3f4f6] border-b border-r border-gray-300 text-left font-black text-gray-800 text-xs tracking-wider sticky-col" style="min-width: 220px;">
                <div class="text-[10px] text-gray-400 font-bold mb-0.5">@</div>
                <div class="text-xs font-black uppercase text-gray-800">258</div>
            </th>
            ${days.map((day, index) => {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + index);
                const mmdd = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
                const dayLabel = dayLabels[day].toUpperCase();
                return `
                    <th class="px-3 py-3 bg-[#f3f4f6] border-b border-r border-gray-300 text-center" style="min-width: 170px;">
                        <div class="text-[10px] text-gray-400 font-black mb-0.5">${mmdd}</div>
                        <div class="text-xs font-black text-gray-800 uppercase tracking-widest">${dayLabel}</div>
                    </th>
                `;
            }).join('')}
        `;

        const bannerStyles = {
            'PERSONAL DAY': { bg: 'bg-[#f4cccc]', text: 'text-[#cc0000] border-[#ea9999]' },
            'HOLIDAY': { bg: 'bg-[#ffd966]', text: 'text-[#7f6000] border-[#ffd966]' },
            'SICK TIME': { bg: 'bg-[#d9ead3]', text: 'text-[#274e13] border-[#93c47d]' },
            'VACATION': { bg: 'bg-[#cfe2f3]', text: 'text-[#0b5394] border-[#9fc5e8]' },
            'OFF': { bg: 'bg-[#e5e7eb]', text: 'text-gray-700 border-gray-300' }
        };

        const rowsHtml = app.employees.map(emp => {
            const empSched = weekSchedules.find(s => s.employeeId === emp.id);
            if (!empSched) return '';

            let empTotalHrs = 0;
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
                const dayData = empSched.days[d] || { active: false, type: 'OFF', location: '', shiftIn: app.defaultShiftIn || '08:30', shiftOut: app.defaultShiftOut || '17:00', breakMins: app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45 };
                empTotalHrs += getShiftHours(dayData);
            });
            const dayCellsHtml = days.map(day => {
                const dayData = empSched.days[day] || { active: false, type: 'OFF', location: '', shiftIn: app.defaultShiftIn || '08:30', shiftOut: app.defaultShiftOut || '17:00', breakMins: app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45 };
                const dayHrs = getShiftHours(dayData);

                let cellClass = '';
                let cellContent = '';

                const typeUpper = (dayData.type || '').toUpperCase();
                const isSpecialDay = !dayData.active || (typeUpper !== 'REGULAR' && typeUpper !== 'OFF' && typeUpper !== 'OPEN BRANCH' && typeUpper !== 'CLOSE BRANCH');

                if (isSpecialDay) {
                    const label = !dayData.active ? 'OFF' : typeUpper;
                    let style = bannerStyles['OFF'];
                    if (label.includes('VACATION')) style = bannerStyles['VACATION'];
                    else if (label.includes('SICK')) style = bannerStyles['SICK TIME'];
                    else if (label.includes('PERSONAL')) style = bannerStyles['PERSONAL DAY'];
                    else if (label.includes('HOLIDAY')) style = bannerStyles['HOLIDAY'];

                    const formattedHrs = formatHoursToHHMMString(dayHrs);
                    const empTextClass = getEmployeeTextClass(emp.cardColor);

                    cellClass = 'bg-white border-gray-300 hover:bg-gray-50/50';
                    cellContent = `
                        <div class="flex flex-col h-full justify-between min-h-[75px] select-none text-left relative w-full">
                             <!-- Special Day Header Banner -->
                             <div class="${style.bg} ${style.text} text-[10px] font-black tracking-wider uppercase py-1.5 px-2 text-center border-b border-black/5 w-full">
                                 ${label.includes('SICK') ? 'SICK TIME' : (label.includes('PERSONAL') ? 'PERSONAL DAY' : label)}
                             </div>
                             <!-- Empty space in middle -->
                             <div class="flex-grow"></div>
                             <!-- Bottom Row: Role & Hours -->
                             <div class="flex justify-between items-center text-[10px] px-2 pb-2 pt-1 border-t border-gray-100/50 mt-1">
                                 <span class="${empTextClass} font-bold">${dayData.role || ''}</span>
                                 <span class="text-gray-400 font-bold">${formattedHrs}</span>
                             </div>
                        </div>
                    `;
                } else {
                    // Regular Shift
                    const breakStr = formatBreakTime(dayData.breakMins);
                    const locationStr = dayData.location !== undefined ? dayData.location : '';
                    const empTextClass = getEmployeeTextClass(emp.cardColor);

                    const isSpecialAssignment = locationStr.toLowerCase() === 'special assignment';
                    const locationHtml = isSpecialAssignment
                        ? `<span class="text-[#cc0000] italic font-black text-xs">Special Assignment</span>`
                        : `<span class="text-[#434343] font-black text-xs uppercase tracking-tight">${locationStr}</span>`;

                    cellClass = 'bg-white border-gray-300 hover:bg-gray-50/80';
                    cellContent = `
                        <div class="flex flex-col h-full min-h-[75px] select-none text-left p-2 w-full">
                             <!-- Top Row: Location (always has consistent height for neat horizontal alignment) -->
                             <div class="pb-1 min-h-[22px] flex items-center ${locationStr.trim() ? 'border-b border-gray-100/40' : ''}">
                                 ${locationStr.trim() ? locationHtml : '<span class="text-transparent select-none text-xs font-black uppercase tracking-tight">&nbsp;</span>'}
                             </div>
                             <div class="flex-grow"></div>
                             <!-- Middle Row: Shift Times (12h format) and Break -->
                             <div class="grid grid-cols-3 items-center text-[11px] font-semibold text-[#434343] py-2">
                                 <div class="text-left">${format12HourTime(dayData.shiftIn)}</div>
                                 <div class="text-center">${format12HourTime(dayData.shiftOut)}</div>
                                 <div class="text-right text-gray-500 font-normal">${breakStr}</div>
                             </div>
                             <!-- Bottom Row: Role & Daily total hours -->
                             <div class="flex justify-between items-center text-[10px] pt-1 border-t border-gray-100/50">
                                 <span class="${empTextClass} font-semibold uppercase tracking-tight">${dayData.role || ''}</span>
                                 <span class="${empTextClass} font-normal">${formatHoursToHHMMString(dayHrs)}</span>
                             </div>
                        </div>
                    `;
                }

                return `
                    <td class="p-0 border-r border-b border-gray-300 transition-all cursor-pointer ${cellClass} schedule-cell align-top" style="height: 1px;" data-emp-id="${emp.id}" data-day="${day}">
                        ${cellContent}
                    </td>
                `;
            }).join('');

            const empBgClass = getEmployeeBgColor(emp.cardColor);
            const weeklyTotalFormatted = formatHoursToHHMMString(empTotalHrs);

            return `
                <tr class="hover:bg-gray-50/30 bg-white group" data-emp-id="${emp.id}">
                     <td class="p-2 border-r border-b border-gray-300 sticky-col ${empBgClass} transition-all" style="height: 1px;">
                          <div class="flex flex-col h-full justify-between min-h-[75px]">
                               <div class="flex justify-between items-start gap-1">
                                   <input type="text" class="employee-inline-name font-black text-sm text-[#434343] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none w-3/4 transition-all" value="${emp.name}" data-emp-id="${emp.id}" placeholder="Name" />
                                   <!-- Inline Hover controls for Quick Fill/Clear -->
                                   <div class="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button class="row-default-btn text-[9px] text-blue-600 hover:underline font-extrabold uppercase" title="Fill Defaults">Fill</button>
                                       <button class="row-clear-btn text-[9px] text-red-600 hover:underline font-extrabold uppercase" title="Clear Shifts">Clear</button>
                                   </div>
                               </div>
                               <div class="mt-1">
                                   <input type="text" class="employee-inline-role text-[10px] font-normal text-gray-400 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none w-full transition-all uppercase tracking-tight" value="${emp.role || ''}" data-emp-id="${emp.id}" placeholder="Role/Title" />
                               </div>
                               <div class="flex justify-between items-center mt-1">
                                   <button class="row-delete-inline-btn flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 hover:text-red-600 bg-transparent hover:bg-red-50 border border-dashed border-red-200 hover:border-red-400 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100" data-emp-id="${emp.id}" title="Delete Row">
                                       <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"></path></svg>
                                       <span>Remove Row</span>
                                   </button>
                                   <div class="text-right text-[10px] font-normal text-gray-400 mr-1">${weeklyTotalFormatted}</div>
                               </div>
                          </div>
                      </td>
                      ${dayCellsHtml}
                 </tr>
             `;
        }).join('');

        const footerCoverageHrsHtml = days.map((day, i) => `
            <td class="px-3 py-3 text-center border-r border-b border-gray-300 font-black text-gray-800 text-xs">
                 ${formatHoursToHHMMString(dailyTotals[i].hours)}
            </td>
        `).join('');

        const footerActiveStaffHtml = days.map((day, i) => `
            <td class="px-3 py-3 text-center border-r border-b border-gray-300 text-[10px] font-black text-gray-500 uppercase tracking-wide">
                 ${dailyTotals[i].count} Active
            </td>
        `).join('');

        return `
            <div class="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                 <div class="overflow-x-auto">
                     <table class="w-full border-collapse table-fixed" style="min-width: 1250px;">
                         <thead>
                             <tr class="divide-x divide-gray-200">
                                 ${headersHtml}
                             </tr>
                         </thead>
                         <tbody class="divide-y divide-gray-200">
                             ${rowsHtml}
                             <!-- Add Employee Row Inline Button -->
                             <tr class="bg-gray-100 hover:bg-gray-100/90 transition-all">
                                 <td class="p-2 sticky-col bg-gray-100">
                                     <button id="add-employee-inline-btn" class="flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-600 bg-transparent hover:bg-blue-50/50 border border-dashed border-gray-300 hover:border-blue-300/80 rounded transition-all cursor-pointer opacity-60 hover:opacity-100">
                                         <svg class="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                                         <span>Add Row</span>
                                     </button>
                                 </td>
                                 <td colspan="${days.length}" class="bg-gray-100"></td>
                             </tr>
                         </tbody>
                         <tfoot class="${app.showCoverageTotals ? '' : 'hidden'}">
                             <tr class="bg-gray-50 divide-x divide-gray-100 font-semibold border-t-2 border-gray-300">
                                 <td class="px-4 py-3 sticky-col bg-gray-50 border-r border-b border-gray-300 font-black text-gray-800 text-xs uppercase tracking-wider">
                                     Daily Net Coverage
                                 </td>
                                 ${footerCoverageHrsHtml}

                             </tr>
                             <tr class="bg-gray-100/50 divide-x divide-gray-100 border-t border-gray-200">
                                 <td class="px-4 py-3 sticky-col bg-gray-100/50 border-r border-b border-gray-300 text-[10px] font-black text-gray-600 uppercase tracking-wider">
                                     Scheduled Staff Count
                                 </td>
                                 ${footerActiveStaffHtml}

                             </tr>
                         </tfoot>
                     </table>
                 </div>
            </div>
        `;
    }

export function renderScheduleVertical(weekSchedules, days) {
        const dayLabels = {
            'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };

        const monday = new Date(app.scheduleWeekDate + 'T12:00:00');

        const dayBlocksHtml = days.map((day, index) => {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + index);
            const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
            const dayLabel = dayLabels[day];

            const rowsHtml = app.employees.map(emp => {
                const empSched = weekSchedules.find(s => s.employeeId === emp.id);
                const dayData = empSched ? empSched.days[day] : null;

                let startText = '';
                let stopText = '';
                let startStyle = 'background-color: #ffffff; color: #1f2937;';
                let stopStyle = 'background-color: #ffffff; color: #1f2937;';
                let startClass = 'text-gray-800';
                let stopClass = 'text-gray-800';

                const isActive = dayData && dayData.active;
                const typeUpper = dayData ? (dayData.type || 'Regular').toUpperCase() : 'OFF';

                if (!isActive || typeUpper === 'OFF') {
                    const offColor = app.offRowColor || '#ffffff';
                    const isOffColorBlack = offColor.toLowerCase() === '#000000';
                    const isOffColorWhite = offColor.toLowerCase() === '#ffffff';
                    const isOffColorLightGrey = offColor.toLowerCase() === '#f3f4f6' || offColor.toLowerCase() === '#e5e7eb';

                    let offTextColor = '#ffffff';
                    if (isOffColorWhite) {
                        offTextColor = '#ffffff';
                        startText = '';
                        stopText = '';
                    } else if (isOffColorLightGrey) {
                        offTextColor = offColor;
                        startText = '';
                        stopText = '';
                    } else if (isOffColorBlack) {
                        offTextColor = '#000000';
                        startText = '';
                        stopText = '';
                    } else {
                        const contrast = getContrastYIQ(offColor);
                        offTextColor = contrast === 'white' ? '#ffffff' : '#6b7280';
                        startText = 'OFF';
                        stopText = 'OFF';
                    }

                    startStyle = `background-color: ${offColor}; color: ${offTextColor};`;
                    stopStyle = `background-color: ${offColor}; color: ${offTextColor};`;
                    startClass = 'text-center font-black text-xs uppercase tracking-wider select-none';
                    stopClass = 'text-center font-black text-xs uppercase tracking-wider select-none';
                } else {
                    const isSpecialDay = typeUpper !== 'REGULAR' && typeUpper !== 'OPEN BRANCH' && typeUpper !== 'CLOSE BRANCH';

                    if (isSpecialDay) {
                        const lt = app.leaveTypes.find(l => l.name.toUpperCase() === typeUpper || l.id.toUpperCase() === typeUpper);
                        const ltColor = lt?.color || '#6b7280';
                        startText = dayData.type;
                        stopText = dayData.type;
                        startStyle = `background-color: ${ltColor}; color: white;`;
                        stopStyle = `background-color: ${ltColor}; color: white;`;
                        startClass = 'text-center font-black text-xs uppercase tracking-wider';
                        stopClass = 'text-center font-black text-xs uppercase tracking-wider';
                    } else if (typeUpper === 'OPEN BRANCH') {
                        startText = format12HourTime(dayData.shiftIn || '07:45');
                        stopText = format12HourTime(dayData.shiftOut || '16:15');
                        startStyle = `background-color: ${app.openBranchColor || '#d9ead3'}; color: #274e13;`;
                        stopStyle = `background-color: #ffffff; color: #1f2937;`;
                    } else if (typeUpper === 'CLOSE BRANCH') {
                        startText = format12HourTime(dayData.shiftIn || '08:30');
                        stopText = format12HourTime(dayData.shiftOut || '17:15');
                        startStyle = `background-color: #ffffff; color: #1f2937;`;
                        stopStyle = `background-color: ${app.closeBranchColor || '#f4cccc'}; color: #cc0000;`;
                    } else {
                        const sIn = dayData.shiftIn || '';
                        const sOut = dayData.shiftOut || '';

                        startText = format12HourTime(sIn);
                        stopText = format12HourTime(sOut);

                        if (sIn === '07:45') {
                            startStyle = `background-color: ${app.openBranchColor || '#d9ead3'}; color: #274e13;`;
                        }
                        if (sOut === '17:15') {
                            stopStyle = `background-color: ${app.closeBranchColor || '#f4cccc'}; color: #cc0000;`;
                        }
                    }
                }

                const empBgClass = getEmployeeBgColor(emp.cardColor);

                // Calculate weekly total hours for this employee
                let empTotalHrs = 0;
                if (empSched) {
                    days.forEach(d => {
                        const dData = empSched.days[d];
                        if (dData && dData.active) {
                            empTotalHrs += getShiftHours(dData);
                        }
                    });
                }
                const weeklyTotalFormatted = formatHoursToHHMMString(empTotalHrs);

                return `
                    <tr class="group" data-emp-id="${emp.id}">
                        <td class="px-4 py-2.5 border border-gray-300 font-semibold text-[#434343] text-sm ${empBgClass} relative" style="width: 220px;">
                            <div class="flex flex-col h-full justify-between">
                                <div class="flex justify-between items-start">
                                    <span class="font-black text-sm text-[#434343]">${emp.name}</span>
                                    <button class="row-delete-inline-btn flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 hover:text-red-600 bg-transparent hover:bg-red-50 border border-dashed border-red-200 hover:border-red-400 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer" data-emp-id="${emp.id}" title="Delete Row">
                                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"></path></svg>
                                        <span>Remove Row</span>
                                    </button>
                                </div>
                                <div class="flex justify-between items-center text-[10px] text-gray-500 font-normal uppercase mt-0.5 tracking-tight">
                                    <span>${emp.role || ''}</span>
                                    <span class="font-bold text-gray-400">${weeklyTotalFormatted}</span>
                                </div>
                            </div>
                        </td>
                        <td class="schedule-cell cursor-pointer px-4 py-2.5 border border-gray-300 text-center font-bold text-sm ${startClass}" style="width: 150px; ${startStyle}" data-emp-id="${emp.id}" data-day="${day}">
                            ${startText}
                        </td>
                        <td class="schedule-cell cursor-pointer px-4 py-2.5 border border-gray-300 text-center font-bold text-sm ${stopClass}" style="width: 150px; ${stopStyle}" data-emp-id="${emp.id}" data-day="${day}">
                            ${stopText}
                        </td>
                    </tr>
                `;
            }).join('');

            // Calculate daily coverage totals
            let dayTotalHrs = 0;
            let activeCount = 0;
            app.employees.forEach(employee => {
                const empSched = weekSchedules.find(s => s.employeeId === employee.id);
                const dData = empSched ? empSched.days[day] : null;
                if (dData && dData.active) {
                    dayTotalHrs += getShiftHours(dData);
                    activeCount++;
                }
            });
            const dayTotalHrsFormatted = formatHoursToHHMMString(dayTotalHrs);

            return `
                <div class="flex flex-col md:flex-row items-start gap-4 mb-8">
                    <!-- Date Sidebar on left (Desktop-only) -->
                    <div class="w-24 text-right font-black text-gray-500 text-xs pt-3 shrink-0 md:block hidden">
                        <div class="text-xs font-black text-gray-500 tracking-wider">${dateStr}</div>
                        <div class="text-[10px] text-gray-400 font-bold mt-0.5">${dayLabel.toUpperCase()}</div>
                    </div>
                    <!-- Date Banner (Mobile-only) -->
                    <div class="font-black text-gray-400 text-xs block md:hidden mb-1 uppercase tracking-wider">
                        Date: ${dateStr} (${dayLabel})
                    </div>

                    <div class="flex-grow overflow-x-auto w-full">
                        <table class="border-collapse border border-gray-300 shadow-sm w-full" style="min-width: 500px; max-width: 650px;">
                            <thead>
                                <tr class="divide-x divide-gray-200">
                                    <th class="px-4 py-2.5 bg-[#f3f4f6] text-[#434343] border border-gray-300 text-left font-black text-xs uppercase tracking-wider" style="width: 220px;">
                                        Employee Name
                                    </th>
                                    <th class="px-4 py-2.5 bg-[#f3f4f6] text-gray-500 border border-gray-300 text-center font-black text-xs uppercase tracking-wider" style="width: 150px;">
                                        Shift In
                                    </th>
                                    <th class="px-4 py-2.5 bg-[#f3f4f6] text-gray-500 border border-gray-300 text-center font-black text-xs uppercase tracking-wider" style="width: 150px;">
                                        Shift Out
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${rowsHtml}
                            </tbody>
                            <tfoot class="${app.showCoverageTotals ? '' : 'hidden'} border-t-2 border-gray-300 bg-gray-50">
                                <tr class="divide-x divide-gray-200">
                                    <td class="px-4 py-2.5 border border-gray-300 font-black text-[11px] text-gray-800 uppercase tracking-wider">
                                        Daily Net Coverage
                                    </td>
                                    <td colspan="2" class="px-4 py-2.5 border border-gray-300 text-center font-black text-xs text-gray-800">
                                        ${dayTotalHrsFormatted}
                                    </td>
                                </tr>
                                <tr class="divide-x divide-gray-200 bg-gray-100/50">
                                    <td class="px-4 py-2.5 border border-gray-300 font-black text-[10px] text-gray-600 uppercase tracking-wider">
                                        Scheduled Staff Count
                                    </td>
                                    <td colspan="2" class="px-4 py-2.5 border border-gray-300 text-center font-black text-[10px] text-gray-500 uppercase tracking-wider">
                                        ${activeCount} Active
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white shadow-xl rounded-xl border border-gray-200 p-6 max-w-3xl mx-auto">
                <div class="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                    <h2 class="text-sm font-black text-gray-500 uppercase tracking-wider">Daily Shift Details (Vertical View)</h2>
                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Click any row to edit</span>
                </div>
                <div class="space-y-4">
                    ${dayBlocksHtml}
                </div>
                <!-- Add Employee Row Inline Button for Vertical View -->
                <div class="mt-8 flex justify-center">
                    <button id="add-employee-inline-btn-vertical" class="flex items-center space-x-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 hover:text-blue-600 bg-white hover:bg-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-300 rounded-lg transition-all cursor-pointer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        <span>Add New Employee Row</span>
                    </button>
                </div>
            </div>
        `;
    }

export function renderScheduleCalendar(weekSchedules, days) {
        const daysOfWeekFull = {
            'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };

        const monday = new Date(app.scheduleWeekDate + 'T12:00:00');
        const dayCards = days.map((day, index) => {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + index);
            const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const workingStaff = [];
            let totalHrs = 0;

            weekSchedules.forEach(sched => {
                const dayData = sched.days[day];
                if (dayData && dayData.active) {
                    const emp = app.employees.find(e => e.id === sched.employeeId);
                    if (emp) {
                        const hrs = calculateHours(dayData.shiftIn, dayData.shiftOut, dayData.breakMins);
                        workingStaff.push({
                            name: emp.name,
                            shift: `${format12Hour(dayData.shiftIn)} – ${format12Hour(dayData.shiftOut)}`,
                            break: dayData.breakMins > 0 ? `(${dayData.breakMins}m break)` : 'no break',
                            hours: hrs
                        });
                        totalHrs += hrs;
                    }
                }
            });

            workingStaff.sort((a, b) => a.shift.localeCompare(b.shift));
            const staffListHtml = workingStaff.length > 0
                ? workingStaff.map(s => `
                     <div class="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100/80 transition-colors border border-gray-100">
                         <div class="flex flex-col">
                             <span class="text-sm font-bold text-gray-800">${s.name}</span>
                             <span class="text-xs text-gray-500 font-semibold mt-0.5">${s.shift} <span class="text-gray-400 font-normal">${s.break}</span></span>
                         </div>
                         <span class="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-1 rounded">${s.hours} hrs</span>
                     </div>
                 `).join('')
                : `
                     <div class="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                         <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">No shifts scheduled</span>
                     </div>
                 `;

            return `
                 <div class="bg-white p-5 shadow-md border border-gray-200 rounded-xl flex flex-col justify-between">
                     <div>
                         <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                             <div class="flex flex-col">
                                 <span class="text-base font-extrabold text-gray-800">${daysOfWeekFull[day]}</span>
                                 <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">${dateStr}</span>
                             </div>
                             <span class="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">${workingStaff.length} Scheduled</span>
                         </div>
                         <div class="space-y-2.5">
                             ${staffListHtml}
                         </div>
                     </div>
                     ${workingStaff.length > 0 ? `
                         <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500">
                             <span>Daily Total Hours:</span>
                             <span class="text-gray-800 text-sm font-black">${parseFloat(totalHrs.toFixed(2))}h</span>
                         </div>
                     ` : ''}
                 </div>
             `;
        }).join('');

        return `
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 ${dayCards}
             </div>
        `;
    }

export function attachEditorListeners(weekSchedules, days) {
        const container = document.getElementById('schedule-view-container');
        if (!container) return;

        container.addEventListener('click', e => {
            const target = e.target;

            // Check if clicked cell is a schedule cell (or child of it)
            const cell = target.closest('.schedule-cell');
            if (cell) {
                const empId = cell.dataset.empId;
                const day = cell.dataset.day;
                openSchedModal(empId, day, app.scheduleWeekDate);
                return;
            }

            const rowDeleteInlineBtn = target.closest('.row-delete-inline-btn');
            if (rowDeleteInlineBtn) {
                const empId = rowDeleteInlineBtn.dataset.empId;
                const emp = app.employees.find(x => x.id === empId);
                const empName = emp ? emp.name : 'this employee';
                showConfirm(
                    "Delete Row",
                    `Are you sure you want to delete ${empName}? All their schedule data and log entries will also be permanently removed.`,
                    () => {
                        app.employees = app.employees.filter(x => x.id !== empId);
                        app.logEntries = app.logEntries.filter(log => log.employeeId !== empId);
                        for (const weekDate in app.schedules) {
                            app.schedules[weekDate] = app.schedules[weekDate].filter(s => s.employeeId !== empId);
                        }
                        saveState();
                        renderSchedule();
                        showToast("Deleted", `${empName} has been deleted.`, "info");
                    }
                );
                return;
            }

            const addEmployeeBtn = target.closest('#add-employee-inline-btn') || target.closest('#add-employee-inline-btn-vertical');
            if (addEmployeeBtn) {
                const newEmpId = `emp${Date.now()}`;
                const nextTitleNum = app.employees.length + 1;
                const newEmp = {
                    id: newEmpId,
                    name: 'New Employee',
                    role: `Title ${nextTitleNum}`,
                    cardColor: 'white',
                    vacationAllotment: 15
                };
                app.employees.push(newEmp);
                saveState();
                renderSchedule();

                setTimeout(() => {
                    if (app.layoutOrientation !== 'vertical') {
                        const newInput = container.querySelector(`.employee-inline-name[data-emp-id="${newEmpId}"]`);
                        if (newInput) {
                            newInput.focus();
                            newInput.select();
                        }
                    } else {
                        // In vertical view, we might want to jump to Setup or just show toast
                        showToast("Employee Added", "Added 'New Employee'. You can now set their shifts.", "success");
                    }
                }, 50);
                return;
            }

            const rowDefaultBtn = target.closest('.row-default-btn');
            if (rowDefaultBtn) {
                const row = target.closest('tr');
                const empId = row.dataset.empId;
                const empSched = weekSchedules.find(s => s.employeeId === empId);
                if (empSched) {
                    const defaultIn = app.defaultShiftIn || '08:30';
                    const defaultOut = app.defaultShiftOut || '17:00';
                    const defaultBreak = app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45;
                    const defaultInFormatted = format12HourTime(defaultIn);
                    const defaultOutFormatted = format12HourTime(defaultOut);

                    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
                        empSched.days[day] = { active: true, type: 'Regular', location: '', shiftIn: defaultIn, shiftOut: defaultOut, breakMins: defaultBreak };
                    });
                    ['Sat', 'Sun'].forEach(day => {
                        empSched.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0 };
                    });
                    saveState();
                    renderSchedule();
                    showToast('Row Filled', `Monday-Friday shifts filled with standard ${defaultInFormatted}-${defaultOutFormatted} hours.`, 'success');
                }
                return;
            }

            const rowClearBtn = target.closest('.row-clear-btn');
            if (rowClearBtn) {
                const row = target.closest('tr');
                const empId = row.dataset.empId;
                const empSched = weekSchedules.find(s => s.employeeId === empId);
                if (empSched) {
                    days.forEach(day => {
                        empSched.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0 };
                    });
                    saveState();
                    renderSchedule();
                    showToast('Row Cleared', 'All days set to OFF.', 'info');
                }
                return;
            }
        });

        // Listen to inline employee name input changes
        container.querySelectorAll('.employee-inline-name').forEach(input => {
            input.addEventListener('input', e => {
                const empId = e.target.dataset.empId;
                const emp = app.employees.find(x => x.id === empId);
                if (emp) {
                    emp.name = e.target.value;
                    saveState();
                }
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
            input.addEventListener('focusout', () => {
                renderSchedule();
            });
        });

        // Listen to inline employee role input changes
        container.querySelectorAll('.employee-inline-role').forEach(input => {
            input.addEventListener('input', e => {
                const empId = e.target.dataset.empId;
                const emp = app.employees.find(x => x.id === empId);
                if (emp) {
                    emp.role = e.target.value;
                    saveState();
                }
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
            input.addEventListener('focusout', () => {
                renderSchedule();
            });
        });
    }

export function updateCellAndRowTotals(cell, empSched, day, weekSchedules, days) {
        const dayData = empSched.days[day];
        const dayHrs = getShiftHours(dayData);

        const hrsBadge = cell.querySelector('.bg-blue-100');
        if (hrsBadge) {
            hrsBadge.textContent = `${dayHrs}h`;
        }

        let empTotalHrs = 0;
        days.forEach(d => {
            const dData = empSched.days[d];
            if (dData && dData.active) {
                empTotalHrs += getShiftHours(dData);
            }
        });

        const row = cell.closest('tr');
        const rowTotalTd = row.querySelector('.row-total-hrs');
        if (rowTotalTd) {
            rowTotalTd.textContent = `${parseFloat(empTotalHrs.toFixed(2))}h`;
        }

        const dailyTotals = days.map(d => {
            let totalHrs = 0;
            let countActive = 0;
            weekSchedules.forEach(sched => {
                const dData = sched.days[d];
                if (dData && dData.active) {
                    totalHrs += getShiftHours(dData);
                    countActive++;
                }
            });
            return { hours: parseFloat(totalHrs.toFixed(2)), count: countActive };
        });

        const container = document.getElementById('main-content');
        const colTotalTds = container.querySelectorAll('.col-total-hrs');
        colTotalTds.forEach((td, i) => {
            td.textContent = `${dailyTotals[i].hours}h`;
        });

        const colTotalStaffTds = container.querySelectorAll('.col-total-staff');
        colTotalStaffTds.forEach((td, i) => {
            td.textContent = `${dailyTotals[i].count} Active`;
        });

        const grandTotalSum = dailyTotals.reduce((sum, t) => sum + t.hours, 0);
        const grandTotalTd = document.getElementById('grand-total-hrs');
        if (grandTotalTd) {
            grandTotalTd.textContent = `${parseFloat(grandTotalSum.toFixed(2))}h`;
        }

        saveState();
    }

export function openSchedModal(employeeId, day, weekDate) {
        const modalEl = document.getElementById('edit-schedule-modal');
        const emp = app.employees.find(e => e.id === employeeId);
        const weekSchedules = getWeeklySchedule(weekDate);
        const empSched = weekSchedules.find(s => s.employeeId === employeeId);
        if (!empSched) return;

        const dayData = empSched.days[day] || { active: false, type: 'OFF', location: '', shiftIn: app.defaultShiftIn || '08:30', shiftOut: app.defaultShiftOut || '17:00', breakMins: app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45 };

        document.getElementById('sched-emp-id').value = employeeId;
        document.getElementById('sched-day-code').value = day;

        document.getElementById('sched-modal-title').textContent = `Shift Detail: ${emp.name}`;
        document.getElementById('sched-modal-subtitle').textContent = `${day}day (${dayData.type || 'Regular'})`;

        const schedTypeSelect = document.getElementById('sched-type');
        schedTypeSelect.value = dayData.active ? (dayData.type || 'Regular') : 'OFF';

        const schedLocationPresets = document.getElementById('sched-location-presets');
        const schedLocationCustom = document.getElementById('sched-location-custom');
        const locationVal = dayData.location !== undefined ? dayData.location : '';
        const isPreset = ['', 'Open Branch', 'Close Branch', 'Teller', 'Platform', 'Call Night', 'Special Assignment', 'Boca', 'West Palm Beach'].includes(locationVal);

        if (isPreset) {
            schedLocationPresets.value = locationVal;
            schedLocationCustom.value = '';
            schedLocationCustom.style.display = 'none';
        } else {
            schedLocationPresets.value = 'Custom';
            schedLocationCustom.value = locationVal;
            schedLocationCustom.style.display = 'block';
        }

        const typeVal = dayData.active ? (dayData.type || 'Regular') : 'OFF';
        const isInitialAbsence = ['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(typeVal);

        document.getElementById('sched-in').value = isInitialAbsence ? '' : (dayData.shiftIn || '09:00');
        document.getElementById('sched-out').value = isInitialAbsence ? '' : (dayData.shiftOut || '17:00');
        document.getElementById('sched-break').value = String(isInitialAbsence ? 0 : (dayData.breakMins !== undefined ? dayData.breakMins : 60));
        document.getElementById('sched-role').value = dayData.role || '';

        // Handle field visibility
        const regularFields = document.getElementById('sched-regular-fields');
        if (schedTypeSelect.value === 'OFF') {
            regularFields.style.display = 'none';
        } else {
            regularFields.style.display = 'block';
        }

        const schedPresetTimes = document.getElementById('sched-preset-times');

        schedTypeSelect.onchange = () => {
            if (schedTypeSelect.value === 'OFF') {
                regularFields.style.display = 'none';
            } else {
                regularFields.style.display = 'block';
            }

            const isAbsence = ['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(schedTypeSelect.value);
            if (isAbsence) {
                document.getElementById('sched-in').value = '';
                document.getElementById('sched-out').value = '';
                document.getElementById('sched-break').value = '0';
                if (schedPresetTimes) schedPresetTimes.value = '';
            } else if (schedTypeSelect.value === 'Open Branch') {
                document.getElementById('sched-in').value = '07:45';
                document.getElementById('sched-out').value = '16:15';
                document.getElementById('sched-break').value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                if (schedPresetTimes) schedPresetTimes.value = 'open';
            } else if (schedTypeSelect.value === 'Close Branch') {
                document.getElementById('sched-in').value = '08:30';
                document.getElementById('sched-out').value = '17:15';
                document.getElementById('sched-break').value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                if (schedPresetTimes) schedPresetTimes.value = 'close';
            } else if (schedTypeSelect.value === 'Regular') {
                document.getElementById('sched-in').value = app.defaultShiftIn || '08:30';
                document.getElementById('sched-out').value = app.defaultShiftOut || '17:00';
                document.getElementById('sched-break').value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                if (schedPresetTimes) {
                    const defaultIn = app.defaultShiftIn || '08:30';
                    const defaultOut = app.defaultShiftOut || '17:00';
                    if (defaultIn === '07:45' && defaultOut === '16:15') {
                        schedPresetTimes.value = 'open';
                    } else if (defaultIn === '08:30' && defaultOut === '17:15') {
                        schedPresetTimes.value = 'close';
                    } else if (defaultIn === '08:30' && defaultOut === '17:00') {
                        schedPresetTimes.value = 'standard';
                    } else {
                        schedPresetTimes.value = '';
                    }
                }
            }
        };

        schedLocationPresets.onchange = () => {
            if (schedLocationPresets.value === 'Custom') {
                schedLocationCustom.style.display = 'block';
            } else {
                schedLocationCustom.style.display = 'none';
            }
        };

        if (schedPresetTimes) {
            const currentIn = dayData.shiftIn || '';
            const currentOut = dayData.shiftOut || '';
            if (currentIn === '07:45' && currentOut === '16:15') {
                schedPresetTimes.value = 'open';
            } else if (currentIn === '08:30' && currentOut === '17:15') {
                schedPresetTimes.value = 'close';
            } else if (currentIn === '08:30' && currentOut === '17:00') {
                schedPresetTimes.value = 'standard';
            } else {
                schedPresetTimes.value = '';
            }

            schedPresetTimes.onchange = () => {
                const val = schedPresetTimes.value;
                const shiftInEl = document.getElementById('sched-in');
                const shiftOutEl = document.getElementById('sched-out');
                const breakEl = document.getElementById('sched-break');
                if (val === 'open') {
                    shiftInEl.value = '07:45';
                    shiftOutEl.value = '16:15';
                    breakEl.value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                    schedTypeSelect.value = 'Open Branch';
                } else if (val === 'close') {
                    shiftInEl.value = '08:30';
                    shiftOutEl.value = '17:15';
                    breakEl.value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                    schedTypeSelect.value = 'Close Branch';
                } else if (val === 'standard') {
                    shiftInEl.value = '08:30';
                    shiftOutEl.value = '17:00';
                    breakEl.value = String(app.defaultBreakMins !== undefined ? app.defaultBreakMins : 45);
                    schedTypeSelect.value = 'Regular';
                }
            };
        }

        const shiftInEl = document.getElementById('sched-in');
        if (shiftInEl) {
            shiftInEl.addEventListener('change', () => {
                if (schedPresetTimes) schedPresetTimes.value = '';
            });
        }

        const shiftOutEl = document.getElementById('sched-out');
        if (shiftOutEl) {
            shiftOutEl.addEventListener('change', () => {
                if (schedPresetTimes) schedPresetTimes.value = '';
            });
        }

        // Setup Close Event Handlers
        const closeBtn = document.getElementById('sched-modal-close-btn');
        const cancelBtn = document.getElementById('sched-modal-cancel-btn');
        const form = document.getElementById('sched-modal-form');

        const closeModal = () => {
            modalEl.classList.remove('is-open');
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        form.onsubmit = (e) => {
            e.preventDefault();
            const activeType = schedTypeSelect.value;
            const activeWorking = activeType !== 'OFF';

            dayData.active = activeWorking;
            dayData.type = activeType;

            if (activeWorking) {
                const finalLocation = schedLocationPresets.value === 'Custom' ? schedLocationCustom.value : schedLocationPresets.value;
                dayData.location = finalLocation || '';
                dayData.shiftIn = document.getElementById('sched-in').value;
                dayData.shiftOut = document.getElementById('sched-out').value;
                dayData.breakMins = parseInt(document.getElementById('sched-break').value, 10) || 0;
                dayData.role = document.getElementById('sched-role').value || '';
            } else {
                dayData.location = '';
                dayData.shiftIn = '';
                dayData.shiftOut = '';
                dayData.breakMins = 0;
                dayData.role = '';
            }

            saveState();
            closeModal();
            renderSchedule();
            showToast('Shift Updated', `Updated shift for ${emp.name} on ${day}.`, 'success');
        };

        modalEl.classList.add('is-open');
    }

export function renderScheduleMonthly() {
        const date = app.monthlyCalendarDate || new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthName = date.toLocaleString('default', { month: 'long' });

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

        // Adjust for Monday start (0=Mon, 6=Sun)
        let firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Get all schedules for the month
        const weeksInMonth = [];
        let currentIterDate = new Date(year, month, 1);
        // Go back to the Monday of the first week
        currentIterDate.setDate(currentIterDate.getDate() - firstDayIndex);

        while (currentIterDate.getFullYear() < year || (currentIterDate.getFullYear() === year && currentIterDate.getMonth() <= month)) {
            weeksInMonth.push(getMondayDateString(new Date(currentIterDate)));
            currentIterDate.setDate(currentIterDate.getDate() + 7);
        }

        const monthlySchedules = {};
        weeksInMonth.forEach(w => {
            monthlySchedules[w] = getWeeklySchedule(w);
        });

        const calendarCells = [];
        // Pad start
        for (let i = 0; i < firstDayIndex; i++) calendarCells.push('<div class="bg-gray-50 border-r border-b border-gray-200 min-h-[120px]"></div>');

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month, d);
            const weekStr = getMondayDateString(currentDayDate);
            const dayNameShort = daysOfWeek[currentDayDate.getDay() === 0 ? 6 : currentDayDate.getDay() - 1];

            const daySchedules = monthlySchedules[weekStr];
            const activeShifts = [];

            daySchedules.forEach(s => {
                const dayData = s.days[dayNameShort];
                if (dayData && dayData.active && !['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(dayData.type.toUpperCase())) {
                    const emp = app.employees.find(e => e.id === s.employeeId);
                    if (emp) activeShifts.push({ name: emp.name, shift: `${format12HourTime(dayData.shiftIn)}-${format12HourTime(dayData.shiftOut)}` });
                }
            });

            calendarCells.push(`
                <div class="bg-white border-r border-b border-gray-200 min-h-[120px] p-2 flex flex-col gap-1 overflow-hidden">
                    <span class="text-xs font-black text-gray-400">${d}</span>
                    <div class="flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                        ${activeShifts.map(s => `
                            <div class="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-100 truncate font-bold" title="${s.name}: ${s.shift}">
                                ${s.name.split(' ')[0]}: ${s.shift}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
        }

        return `
            <div class="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden max-w-6xl mx-auto">
                <div class="bg-[#f3f4f6] p-4 border-b border-gray-200 flex justify-between items-center">
                    <div class="flex flex-col">
                        <h2 class="text-xl font-black text-gray-800 uppercase tracking-tight">${monthName} ${year}</h2>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Full Monthly Shift Calendar</p>
                    </div>
                    <div class="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200">
                        <button id="month-prev-btn" class="p-1 hover:bg-gray-100 rounded transition">&lt;</button>
                        <span class="text-xs font-black px-2">${monthName}</span>
                        <button id="month-next-btn" class="p-1 hover:bg-gray-100 rounded transition">&gt;</button>
                    </div>
                </div>
                <div class="grid grid-cols-7 bg-gray-100">
                    ${daysOfWeek.map(d => `<div class="bg-gray-50 border-r border-b border-gray-200 p-2 text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">${d}</div>`).join('')}
                    ${calendarCells.join('')}
                </div>
            </div>
        `;
    }

export function renderScheduleDaily(weekSchedules, days) {
        const date = app.dailyCalendarDate || new Date();
        const weekStr = getMondayDateString(date);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayName = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];

        const daySchedules = getWeeklySchedule(weekStr);
        const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

        const hourHeaders = hours.map(h => `<div class="flex-1 text-center text-[9px] font-black text-gray-400 border-l border-gray-100 py-1">${format12Hour(`${h}:00`)}</div>`);

        const rowsHtml = app.employees.map(emp => {
            const empSched = daySchedules.find(s => s.employeeId === emp.id);
            const dayData = empSched ? empSched.days[dayName] : null;

            let barHtml = '';
            if (dayData && dayData.active && !['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(dayData.type.toUpperCase())) {
                const start = hhmmToHours(dayData.shiftIn);
                const end = hhmmToHours(dayData.shiftOut);
                const left = ((start - 7) / 12) * 100;
                const width = ((end - start) / 12) * 100;

                barHtml = `
                    <div class="absolute h-6 top-1/2 -translate-y-1/2 bg-blue-500 rounded-md shadow-sm flex items-center justify-center overflow-hidden border border-blue-600 group/bar" style="left: ${left}%; width: ${width}%;">
                        <span class="text-[9px] font-black text-white px-1 truncate">${format12HourTime(dayData.shiftIn)} - ${format12HourTime(dayData.shiftOut)}</span>
                    </div>
                `;
            } else if (dayData && dayData.active) {
                barHtml = `<div class="absolute inset-0 bg-yellow-50 flex items-center justify-center text-[10px] font-black text-yellow-700 uppercase tracking-widest opacity-50">${dayData.type}</div>`;
            }

            return `
                <div class="flex border-b border-gray-100 hover:bg-gray-50 transition">
                    <div class="w-32 p-3 border-r border-gray-200 shrink-0 bg-white">
                        <div class="text-xs font-black text-gray-800 truncate">${emp.name}</div>
                        <div class="text-[9px] text-gray-400 font-bold uppercase tracking-tight">${emp.role || 'Staff'}</div>
                    </div>
                    <div class="flex-grow relative h-12 bg-white">
                        <div class="absolute inset-0 flex">${hours.map(() => `<div class="flex-1 border-l border-gray-50"></div>`).join('')}</div>
                        ${barHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Coverage Heatmap
        const coverage = hours.map(h => {
            let count = 0;
            daySchedules.forEach(s => {
                const dd = s.days[dayName];
                if (dd && dd.active && !['HOLIDAY', 'VACATION', 'SICK TIME', 'PERSONAL DAY'].includes(dd.type.toUpperCase())) {
                    const start = hhmmToHours(dd.shiftIn);
                    const end = hhmmToHours(dd.shiftOut);
                    if (h >= start && h < end) count++;
                }
            });
            return count;
        });

        const heatmapHtml = coverage.map(c => {
            let color = 'bg-red-100 text-red-700';
            if (c >= 3) color = 'bg-green-100 text-green-700';
            else if (c >= 2) color = 'bg-orange-100 text-orange-700';
            return `<div class="flex-1 ${color} text-center py-1 text-[10px] font-black border-l border-white/20">${c}</div>`;
        }).join('');

        return `
            <div class="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden max-w-5xl mx-auto">
                <div class="bg-[#f3f4f6] p-4 border-b border-gray-200 flex justify-between items-center">
                    <div class="flex flex-col">
                        <h2 class="text-xl font-black text-gray-800 uppercase tracking-tight">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Daily Coverage Timeline</p>
                    </div>
                    <div class="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200">
                        <button id="day-prev-btn" class="p-1 hover:bg-gray-100 rounded transition">&lt;</button>
                        <button id="day-next-btn" class="p-1 hover:bg-gray-100 rounded transition">&gt;</button>
                    </div>
                </div>

                <div class="flex flex-col">
                    <div class="flex bg-gray-50 border-b border-gray-200">
                        <div class="w-32 border-r border-gray-200 shrink-0"></div>
                        <div class="flex-grow flex text-center font-black text-[10px] text-gray-400 py-1 uppercase tracking-widest">Shift Timeline (7AM - 7PM)</div>
                    </div>

                    <div class="flex bg-gray-50 border-b border-gray-200">
                        <div class="w-32 border-r border-gray-200 shrink-0 flex items-center px-3">
                            <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Coverage</span>
                        </div>
                        <div class="flex-grow flex">${heatmapHtml}</div>
                    </div>

                    <div class="flex bg-gray-50 border-b border-gray-100">
                        <div class="w-32 border-r border-gray-200 shrink-0"></div>
                        <div class="flex-grow flex">${hourHeaders.join('')}</div>
                    </div>

                    <div class="flex flex-col max-h-[600px] overflow-y-auto">
                        ${rowsHtml}
                    </div>
                </div>

                <div class="p-4 bg-gray-50 border-t border-gray-200 flex gap-4">
                    <div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-100 border border-red-200 rounded"></div><span class="text-[10px] font-bold text-gray-500 uppercase">Understaffed (&lt;2)</span></div>
                    <div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div><span class="text-[10px] font-bold text-gray-500 uppercase">Thin (2)</span></div>
                    <div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-green-100 border border-green-200 rounded"></div><span class="text-[10px] font-bold text-gray-500 uppercase">Good (3+)</span></div>
                </div>
            </div>
        `;
    }

export function runSmartFill() {
    const sList = getWeeklySchedule(app.scheduleWeekDate);
    const monday = new Date(app.scheduleWeekDate + 'T12:00:00');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    days.forEach((day, index) => {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + index);
        const dateStr = currentDate.toISOString().split('T')[0];

        // 1. Identify available employees (not on leave)
        const availableEmps = app.employees.filter(emp => {
            const leave = app.logEntries.find(log => log.employeeId === emp.id && log.date === dateStr);
            return !leave;
        });

        // Shuffle for randomness
        availableEmps.sort(() => Math.random() - 0.5);

        // 2. Clear existing for this day
        sList.forEach(s => {
            if (!availableEmps.find(e => e.id === s.employeeId)) {
                // Keep leave status if leave exists (though availableEmps filtered them out)
                const leave = app.logEntries.find(log => log.employeeId === s.employeeId && log.date === dateStr);
                if (leave) {
                    const lt = app.leaveTypes.find(l => l.id === leave.leaveTypeId);
                    s.days[day] = { active: true, type: lt?.name || 'Vacation', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' };
                } else {
                    s.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' };
                }
            } else {
                s.days[day] = { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' };
            }
        });

        // 3. Assign 2 Openers
        const openers = availableEmps.splice(0, 2);
        openers.forEach(emp => {
            const s = sList.find(sl => sl.employeeId === emp.id);
            s.days[day] = { active: true, type: 'Open Branch', location: 'Open Branch', shiftIn: '07:45', shiftOut: '16:15', breakMins: 45, role: emp.role };
        });

        // 4. Assign 2 Closers
        const closers = availableEmps.splice(0, 2);
        closers.forEach(emp => {
            const s = sList.find(sl => sl.employeeId === emp.id);
            s.days[day] = { active: true, type: 'Close Branch', location: 'Close Branch', shiftIn: '08:30', shiftOut: '17:15', breakMins: 45, role: emp.role };
        });

        // 5. Assign rest as standard
        availableEmps.forEach(emp => {
            const s = sList.find(sl => sl.employeeId === emp.id);
            s.days[day] = { active: true, type: 'Regular', location: 'Platform', shiftIn: '08:30', shiftOut: '17:00', breakMins: 45, role: emp.role };
        });
    });

    saveState();
}

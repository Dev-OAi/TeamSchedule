import { app, loadState, saveState } from './modules/state.js';
import { ICONS } from './modules/config.js';
import {
    hhmmToHours, sortData, formatHoursToHHMMString
} from './modules/utils.js';
import {
    renderPageHeader, renderEmptyState, generateDailyCalendarHTML,
    generateMonthlyCalendarHTML, generateYearlyGridViewHTML, showToast, showConfirm
} from './modules/ui-components.js';
import { renderSchedule } from './modules/scheduler.js';
import { exportToSpreadsheet, importFromExcel } from './modules/exports.js';

const mainContent = document.getElementById('main-content');
const navItems = document.querySelectorAll('.nav-item');
const modal = document.getElementById('edit-daily-modal');

function render() {
        mainContent.classList.add('fade-out');
        setTimeout(() => {
            switch (app.activeTab) {
                case 'Dashboard': renderDashboard(); break;
                case 'Data Log': renderDataLog(); break;
                case 'Schedule': renderSchedule(); break;
                case 'Setup': renderSetup(); break;
                default: renderDashboard();
            }
            updateNav();

            // Bind quick tab navigation header buttons on any rendered page
            document.querySelectorAll('[data-quick-tab]').forEach(btn => {
                btn.onclick = () => {
                    app.activeTab = btn.dataset.quickTab;
                    saveState();
                    render();
                };
            });

            mainContent.classList.remove('fade-out');
        }, 200);
    }

function updateNav() {
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === app.activeTab);
        });
    }

function renderDashboard() {
        if (app.employees.length === 0) {
            renderEmptyState('Welcome to Team Schedule!', 'Add your first employee in the Setup tab to get started.', 'Go to Setup', () => { app.activeTab = 'Setup'; render(); });
            return;
        }

        const calculateLeaveData = (employeeId, year) => {
            const data = { vacationTaken: 0, sickTaken: 0, personalTaken: 0, totalDays: 0, totalHours: 0 };
            const leaveTypesMap = new Map(app.leaveTypes.map(lt => [lt.id, lt]));
            const logs = app.logEntries.filter(log => log.employeeId === employeeId && new Date(log.date).getFullYear() === year);

            logs.forEach(log => {
                data.totalDays += log.duration;
                const leaveTypeName = leaveTypesMap.get(log.leaveTypeId)?.name.toLowerCase();
                if (leaveTypeName?.includes('vacation')) data.vacationTaken += log.duration;
                if (leaveTypeName?.includes('sick')) data.sickTaken += log.duration;
                if (leaveTypeName?.includes('personal')) data.personalTaken += log.duration;

                const leaveType = leaveTypesMap.get(log.leaveTypeId);
                if (leaveType?.durationHHMM) {
                    data.totalHours += log.duration * hhmmToHours(leaveType.durationHHMM);
                }
            });
            return data;
        };

        const sortedEmployees = sortData(app.employees, app.dashboardSort);

        const summaryTableRows = sortedEmployees.map(employee => {
            const leaveData = calculateLeaveData(employee.id, app.currentYear);
            const vacationRemaining = employee.vacationAllotment - leaveData.vacationTaken;
            const remainingClass = vacationRemaining < 0 ? 'text-red-500' : 'text-green-600';

            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <th scope="row" class="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">${employee.name}</th>
                    <td class="px-6 py-3 text-center">${employee.vacationAllotment}</td>
                    <td class="px-6 py-3 text-center">${leaveData.vacationTaken}</td>
                    <td class="px-6 py-3 text-center font-semibold ${remainingClass}">${vacationRemaining}</td>
                    <td class="px-6 py-3 text-center">${leaveData.sickTaken}</td>
                    <td class="px-6 py-3 text-center">${leaveData.personalTaken}</td>
                    <td class="px-6 py-3 text-center font-semibold">${leaveData.totalDays}</td>
                    <td class="px-6 py-3 text-center font-bold text-blue-600">${parseFloat(leaveData.totalHours.toFixed(2))}</td>
                </tr>`;
        }).join('');

        const getSortClass = (key) => app.dashboardSort.key === key ? `sort-${app.dashboardSort.order}` : '';

        const summaryHtml = `
            <div>
              ${renderPageHeader('Dashboard', 'Dashboard')}

              <!-- White Control Bar Below Yellow Header -->
              <div class="bg-white p-4 border-b border-x border-gray-300 rounded-b-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md w-full">
                  <div class="flex items-center space-x-2">
                      <label for="year-select" class="text-xs font-black text-gray-500 uppercase tracking-wider">Year:</label>
                      <input id="year-select" type="number" value="${app.currentYear}" class="p-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none w-24 shadow-inner" />
                  </div>
              </div>

              <div class="bg-white shadow-lg rounded-xl overflow-hidden mt-8">
                <h2 class="text-2xl font-semibold text-gray-700 p-6">Team Leave Summary</h2>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm text-left text-gray-600">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 sortable ${getSortClass('name')}" data-sort-key="name">Employee Name</th>
                        <th scope="col" class="px-6 py-3 text-center sortable ${getSortClass('vacationAllotment')}" data-sort-key="vacationAllotment">Vacation Allotment</th>
                        <th scope="col" class="px-6 py-3 text-center">Vacation Taken</th>
                        <th scope="col" class="px-6 py-3 text-center">Vacation Remaining</th>
                        <th scope="col" class="px-6 py-3 text-center">Sick Days Taken</th>
                        <th scope="col" class="px-6 py-3 text-center">Personal Days Taken</th>
                        <th scope="col" class="px-6 py-3 text-center font-semibold">Total Days Taken</th>
                        <th scope="col" class="px-6 py-3 text-center font-bold">Total Hours Taken</th>
                      </tr>
                    </thead>
                    <tbody>${summaryTableRows}</tbody>
                  </table>
                </div>
              </div>
            </div>`;

        mainContent.innerHTML = summaryHtml + generateDailyCalendarHTML() + generateMonthlyCalendarHTML() + generateYearlyGridViewHTML(app.currentYear, true);

        // --- Event Listeners for Dashboard ---
        const yearSelect = mainContent.querySelector('#year-select');
        if (yearSelect) yearSelect.addEventListener('change', (e) => { app.currentYear = parseInt(e.target.value, 10); saveState(); renderDashboard(); });

        const saveBtn = mainContent.querySelector('#save-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(app, null, 2); const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = 'leave-tracker-data.json'; a.click(); URL.revokeObjectURL(url);
        });

        const loadDataInput = mainContent.querySelector('#load-data-input');
        if (loadDataInput) loadDataInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedData = JSON.parse(event.target.result);
                    if (loadedData.employees && loadedData.logEntries && loadedData.leaveTypes) {
                        app = loadedData; loadState(); saveState(); render(); alert('Data loaded successfully!');
                    } else { alert('Invalid data file format.'); }
                } catch (err) { alert('Error reading or parsing data file.'); console.error(err); }
                finally { e.target.value = ''; }
            };
            reader.readAsText(file);
        });

        const downloadBtn = mainContent.querySelector('#download-btn');
        if (downloadBtn) downloadBtn.addEventListener('click', () => { exportToSpreadsheet(app.employees, app.logEntries, app.leaveTypes, app.currentYear); });

        const loadExcelInput = mainContent.querySelector('#load-excel-input');
        if (loadExcelInput) {
            loadExcelInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    importFromExcel(file);
                    e.target.value = '';
                }
            });
        }

        const prevDayBtn = mainContent.querySelector('#prev-day');
        if (prevDayBtn) prevDayBtn.addEventListener('click', () => { app.dailyCalendarDate.setDate(app.dailyCalendarDate.getDate() - 1); saveState(); renderDashboard(); });

        const nextDayBtn = mainContent.querySelector('#next-day');
        if (nextDayBtn) nextDayBtn.addEventListener('click', () => { app.dailyCalendarDate.setDate(app.dailyCalendarDate.getDate() + 1); saveState(); renderDashboard(); });

        const prevMonthBtn = mainContent.querySelector('#prev-month');
        if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => { app.monthlyCalendarDate.setMonth(app.monthlyCalendarDate.getMonth() - 1); saveState(); renderDashboard(); });

        const nextMonthBtn = mainContent.querySelector('#next-month');
        if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => { app.monthlyCalendarDate.setMonth(app.monthlyCalendarDate.getMonth() + 1); saveState(); renderDashboard(); });

        const conflictToggle = mainContent.querySelector('#conflict-toggle');
        if (conflictToggle) conflictToggle.addEventListener('change', (e) => { app.highlightConflicts = e.target.checked; saveState(); renderDashboard(); });

        mainContent.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const key = header.dataset.sortKey;
                if (app.dashboardSort.key === key) { app.dashboardSort.order = app.dashboardSort.order === 'asc' ? 'desc' : 'asc'; }
                else { app.dashboardSort.key = key; app.dashboardSort.order = 'asc'; }
                saveState(); renderDashboard();
            });
        });
        mainContent.querySelectorAll('.edit-daily-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const { employeeId, dateStr } = e.currentTarget.dataset;
            openEditModal(employeeId, dateStr);
        }));
    }

function renderDataLog() {
        const trashIcon = ICONS.trash;
        if (app.logEntries.length === 0 && app.filters.employeeId === 'all' && app.filters.leaveTypeId === 'all') {
            mainContent.innerHTML = `<div>
                ${renderPageHeader('Data Log', 'Data Log')}
                <div class="h-6"></div>
                <div class="text-center bg-white shadow-lg rounded-xl p-12 border border-gray-300">
                     <h2 class="text-2xl font-semibold text-gray-700 mb-2">No Log Entries Yet</h2>
                     <p class="text-gray-500">Add an absence entry using the form to get started.</p>
                </div>
            </div>`;
            document.getElementById('add-log-container')?.classList.remove('lg:col-span-1');
            document.getElementById('add-log-container')?.classList.add('lg:col-span-3'); // Make form full width if no logs
            return;
        }

        const employeeOptions = app.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        const leaveTypeOptions = app.leaveTypes.map(lt => `<option value="${lt.id}">${lt.name}</option>`).join('');

        const filteredLogs = app.logEntries.filter(log => {
            const { employeeId, leaveTypeId } = app.filters;
            const employeeMatch = employeeId === 'all' || log.employeeId === employeeId;
            const leaveTypeMatch = leaveTypeId === 'all' || log.leaveTypeId === leaveTypeId;
            return employeeMatch && leaveTypeMatch;
        });

        const sortedLogs = sortData(filteredLogs, app.logSort);

        const logRows = sortedLogs.map(log => {
            const employeeOptionsForSelect = app.employees.map(e => `<option value="${e.id}" ${log.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');
            const leaveTypeOptionsForSelect = app.leaveTypes.map(lt => `<option value="${lt.id}" ${log.leaveTypeId === lt.id ? 'selected' : ''}>${lt.name}</option>`).join('');
            const inputClasses = `editable-log-field w-full p-2 border border-transparent bg-transparent rounded-md hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition`;

            return `
            <tr class="bg-white border-b hover:bg-gray-50 group" data-log-id="${log.id}">
                <td class="px-2 py-1 align-middle"><input type="date" value="${log.date}" data-field="date" class="${inputClasses}"></td>
                <td class="px-2 py-1 align-middle"><select data-field="employeeId" class="${inputClasses} font-medium text-gray-900">${employeeOptionsForSelect}</select></td>
                <td class="px-2 py-1 align-middle"><select data-field="leaveTypeId" class="${inputClasses}">${leaveTypeOptionsForSelect}</select></td>
                <td class="px-2 py-1 align-middle"><select data-field="duration" class="${inputClasses} text-center" style="text-align-last: center;"><option value="1" ${log.duration === 1 ? 'selected' : ''}>1</option><option value="0.5" ${log.duration === 0.5 ? 'selected' : ''}>0.5</option></select></td>
                <td class="px-2 py-1 align-middle"><input type="text" value="${log.notes || ''}" placeholder="-" data-field="notes" class="${inputClasses}"></td>
                <td class="px-2 py-1 align-middle text-right">
                    <button class="delete-log text-gray-400 group-hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition" aria-label="Delete log for ${app.employees.find(e=>e.id===log.employeeId)?.name || ''} on ${log.date}">
                        ${trashIcon}
                    </button>
                </td>
            </tr>`;
        }).join('');

        const getSortClass = (key) => app.logSort.key === key ? `sort-${app.logSort.order}` : '';
        const filterEmployeeOptions = `<option value="all">All Employees</option>` + app.employees.map(e => `<option value="${e.id}" ${app.filters.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');
        const filterLeaveTypeOptions = `<option value="all">All Types</option>` + app.leaveTypes.map(lt => `<option value="${lt.id}" ${app.filters.leaveTypeId === lt.id ? 'selected' : ''}>${lt.name}</option>`).join('');

        mainContent.innerHTML = `
        <div>
            ${renderPageHeader('Data Log', 'Data Log')}
            <div class="h-6"></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1">
                    <div id="add-log-container" class="bg-white p-6 shadow-lg rounded-xl">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Add New Absence</h2>
                        <form id="add-log-form" class="space-y-4">
                            <div><label id="start-date-label" for="startDate" class="block text-sm font-medium text-gray-700">Date</label><input type="date" id="startDate" name="startDate" value="${new Date().toISOString().split('T')[0]}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required></div>
                            <div class="flex items-center"><input id="log-range-toggle" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"><label for="log-range-toggle" class="ml-2 block text-sm text-gray-900">Log a date range</label></div>
                            <div id="date-range-options" class="hidden space-y-4">
                                <div><label for="endDate" class="block text-sm font-medium text-gray-700">End Date</label><input type="date" id="endDate" name="endDate" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></div>
                                <div class="flex items-center"><input id="excludeWeekends" name="excludeWeekends" type="checkbox" checked class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"><label for="excludeWeekends" class="ml-2 block text-sm text-gray-900">Exclude weekends</label></div>
                            </div>
                            <div><label for="employeeId" class="block text-sm font-medium text-gray-700">Employee</label><select name="employeeId" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required>${employeeOptions}</select></div>
                            <div><label for="leaveTypeId" class="block text-sm font-medium text-gray-700">Absence Type</label><select name="leaveTypeId" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required>${leaveTypeOptions}</select></div>
                            <div><label id="duration-label" for="duration" class="block text-sm font-medium text-gray-700">Duration (Days)</label><select name="duration" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"><option value="1">Full Day</option><option value="0.5">Half Day</option></select></div>
                            <div><label id="notes-label" for="notes" class="block text-sm font-medium text-gray-700">Notes</label><textarea name="notes" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea></div>
                            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold shadow-md">Add Entry</button>
                        </form>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white shadow-lg rounded-xl flex flex-col">
                    <div id="filter-container" class="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">Filter Entries</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label for="filter-employee" class="block text-sm font-medium text-gray-700">Employee</label>
                                <select id="filter-employee" data-filter-key="employeeId" class="filter-control mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">${filterEmployeeOptions}</select>
                            </div>
                            <div>
                                <label for="filter-type" class="block text-sm font-medium text-gray-700">Type</label>
                                <select id="filter-type" data-filter-key="leaveTypeId" class="filter-control mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">${filterLeaveTypeOptions}</select>
                            </div>
                            <div class="self-end">
                                <button id="clear-filters-btn" class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-semibold shadow-md">Clear</button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-y-auto flex-grow">
                        <table class="w-full text-sm text-left text-gray-600 table-fixed">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" class="px-2 py-3 w-3/12 sortable ${getSortClass('date')}" data-sort-key="date">Date</th>
                                    <th scope="col" class="px-2 py-3 w-[28%] sortable ${getSortClass('employeeId')}" data-sort-key="employeeId">Employee</th>
                                    <th scope="col" class="px-2 py-3 w-[28%] sortable ${getSortClass('leaveTypeId')}" data-sort-key="leaveTypeId">Type</th>
                                    <th scope="col" class="px-2 py-3 w-1/12 text-center sortable ${getSortClass('duration')}" data-sort-key="duration">Duration</th>
                                    <th scope="col" class="px-2 py-3 w-3/12 sortable ${getSortClass('notes')}" data-sort-key="notes">Notes</th>
                                    <th scope="col" class="px-2 py-3 w-[5%] text-right"><span class="sr-only">Delete</span></th>
                                </tr>
                            </thead>
                            <tbody id="log-table-body">${logRows || `<tr><td colspan="6" class="text-center p-8 text-gray-500">No entries match your filters.</td></tr>`}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('log-range-toggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.getElementById('date-range-options').classList.toggle('hidden', !isChecked);
            document.getElementById('start-date-label').textContent = isChecked ? 'Start Date' : 'Date';
            document.getElementById('duration-label').textContent = isChecked ? 'Duration (per day)' : 'Duration (Days)';
            document.getElementById('notes-label').textContent = isChecked ? 'Notes (applies to all days)' : 'Notes';
            document.getElementById('endDate').required = isChecked;
        });

        document.getElementById('add-log-form').addEventListener('submit', (e) => {
            e.preventDefault(); const formData = new FormData(e.target); const isRange = document.getElementById('log-range-toggle').checked;
            const sharedData = { employeeId: formData.get('employeeId'), leaveTypeId: formData.get('leaveTypeId'), duration: parseFloat(formData.get('duration')), notes: formData.get('notes').trim() };
            let entriesAdded = 0;
            if (isRange && formData.get('endDate')) {
                const startDate = new Date(formData.get('startDate') + 'T12:00:00Z'); const endDate = new Date(formData.get('endDate') + 'T12:00:00Z');
                const excludeWeekends = formData.has('excludeWeekends');
                if (endDate < startDate) { alert('End date cannot be before the start date.'); return; }
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const dayOfWeek = currentDate.getUTCDay();
                    if (!(excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6))) {
                        app.logEntries.push({ ...sharedData, id: `log${Date.now()}-${entriesAdded}`, date: currentDate.toISOString().split('T')[0] }); entriesAdded++;
                    }
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                }
            } else {
                app.logEntries.push({ ...sharedData, id: `log${Date.now()}`, date: formData.get('startDate') }); entriesAdded = 1;
            }
            if (entriesAdded > 0) {
                saveState(); const successMsg = document.createElement('div');
                successMsg.className = 'mt-4 p-3 bg-green-100 text-green-800 rounded-md text-sm';
                successMsg.textContent = `Successfully added ${entriesAdded} day(s) of leave.`;
                document.getElementById('add-log-container').appendChild(successMsg);
                setTimeout(() => successMsg.remove(), 4000); e.target.reset();
                document.getElementById('date-range-options').classList.add('hidden'); renderDataLog();
            }
        });

        const logContainer = mainContent.querySelector('.lg\\:col-span-2');
        if (logContainer) {
            logContainer.addEventListener('change', e => {
                const target = e.target;
                if (target.matches('.editable-log-field')) {
                    const logId = target.closest('tr').dataset.logId;
                    const field = target.dataset.field;
                    let value = target.value;
                    const logEntry = app.logEntries.find(log => log.id === logId);
                    if (logEntry) {
                        if (field === 'duration') value = parseFloat(value);
                        logEntry[field] = value;
                        saveState();
                        target.classList.add('bg-green-100');
                        setTimeout(() => target.classList.remove('bg-green-100'), 1500);
                    }
                } else if (target.matches('.filter-control')) {
                     app.filters[target.dataset.filterKey] = target.value;
                     saveState();
                     renderDataLog();
                }
            });

            logContainer.addEventListener('click', (e) => {
                const target = e.target;
                const deleteButton = target.closest('.delete-log');
                if (deleteButton) {
                    const logId = deleteButton.closest('tr').dataset.logId;
                    app.logEntries = app.logEntries.filter(log => log.id !== logId);
                    saveState();
                    renderDataLog();
                    return;
                }
                const sortHeader = target.closest('.sortable');
                if (sortHeader) {
                    const key = sortHeader.dataset.sortKey;
                    if (app.logSort.key === key) {
                        app.logSort.order = app.logSort.order === 'asc' ? 'desc' : 'asc';
                    } else {
                        app.logSort.key = key;
                        app.logSort.order = 'asc';
                    }
                    saveState();
                    renderDataLog();
                    return;
                }
                if (target.id === 'clear-filters-btn') {
                    app.filters = { employeeId: 'all', leaveTypeId: 'all' };
                    saveState();
                    renderDataLog();
                }
            });
        }
    }

function renderSetup() {
        const trashIcon = ICONS.trash;
        const employeeListItems = app.employees.length > 0
            ? app.employees.map(emp => `
                <li class="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 last:border-0" data-emp-id="${emp.id}">
                    <div class="flex-grow w-full sm:w-auto grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Employee Name</label>
                            <input type="text" value="${emp.name}" data-emp-id="${emp.id}" data-field="name" class="emp-edit-input p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none w-full">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Role / Title</label>
                            <input type="text" value="${emp.role || 'FSA'}" data-emp-id="${emp.id}" data-field="role" class="emp-edit-input p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none w-full" placeholder="e.g. BM, FSA">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Card Theme Color</label>
                            <select data-emp-id="${emp.id}" data-field="cardColor" class="emp-edit-select p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none w-full bg-white">
                                <option value="white" ${emp.cardColor === 'white' ? 'selected' : ''}>White (Default)</option>
                                <option value="gray" ${emp.cardColor === 'gray' ? 'selected' : ''}>Gray</option>
                                <option value="blue" ${emp.cardColor === 'blue' ? 'selected' : ''}>Light Blue</option>
                                <option value="yellow" ${emp.cardColor === 'yellow' ? 'selected' : ''}>Gold / Yellow</option>
                                <option value="green" ${emp.cardColor === 'green' ? 'selected' : ''}>Mint Green</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Vacation Allotment</label>
                            <input type="number" value="${emp.vacationAllotment || 15}" data-emp-id="${emp.id}" data-field="vacationAllotment" class="emp-edit-input p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none w-full">
                        </div>
                    </div>
                    <button data-emp-id="${emp.id}" class="delete-employee text-red-500 hover:text-red-700 p-2.5 rounded-full hover:bg-gray-100 self-end sm:self-center transition" aria-label="Delete ${emp.name}">
                        ${trashIcon}
                    </button>
                </li>
            `).join('')
            : `<li class="py-4 text-center text-gray-500 font-semibold">No employees added yet.</li>`;

        const leaveTypeListItems = app.leaveTypes.map(lt => `
            <li class="py-3 flex justify-between items-center space-x-4"><div class="flex-grow"><span contenteditable="true" data-lt-id="${lt.id}" data-field="name" class="p-1 rounded-md hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-md font-medium text-gray-800">${lt.name}</span></div><div class="flex items-center space-x-3"><input type="color" value="${lt.color || '#6b7280'}" data-lt-id="${lt.id}" data-field="color" class="w-8 h-8 p-0 border-none rounded-md cursor-pointer" aria-label="Change color for ${lt.name}"><input type="text" value="${lt.durationHHMM}" data-lt-id="${lt.id}" data-field="durationHHMM" class="w-20 p-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center" placeholder="HH:MM"><button data-lt-id="${lt.id}" class="delete-leavetype text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-100" aria-label="Delete ${lt.name}">${trashIcon}</button></div></li>`).join('');

        const adminSection = `
            <div class="bg-white p-6 shadow-lg rounded-xl border-2 ${app.adminMode ? 'border-yellow-400' : 'border-transparent'}">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-gray-700">Cloud Sync (GitHub)</h2>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold text-gray-500 uppercase">Admin Mode</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="admin-mode-toggle" class="sr-only peer" ${app.adminMode ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                        </label>
                    </div>
                </div>

                ${app.adminMode ? `
                    <div class="space-y-4 animate-fade-in">
                        <p class="text-sm text-gray-600">To update the shared schedule, copy the data below and paste it into your GitHub repository's <code class="bg-gray-100 px-1 rounded text-red-500">data/schedule.json</code> file.</p>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">GitHub Repo URL</label>
                            <input type="text" id="github-repo-url" value="${app.githubRepoUrl || ''}" placeholder="https://github.com/user/repo" class="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono">
                        </div>

                        <div class="flex flex-col gap-2">
                            <button id="save-to-cloud-btn" class="flex items-center justify-center space-x-2 w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg hover:bg-emerald-700 font-bold shadow-md transition ${!app.githubRepoUrl ? 'opacity-50 pointer-events-none' : ''}">
                                ${ICONS.save || ''} <span>🚀 Save to Cloud (No Copy-Paste)</span>
                            </button>
                            <div class="grid grid-cols-2 gap-2">
                                <button id="copy-sync-data-btn" class="flex items-center justify-center space-x-2 bg-gray-800 text-white py-2 px-3 rounded-lg hover:bg-black font-bold shadow-md transition text-[11px]">
                                    ${ICONS.copy} <span>Manual Copy</span>
                                </button>
                                <a id="github-edit-link" href="${app.githubRepoUrl ? `${app.githubRepoUrl}/edit/main/data/schedule.json` : '#'}" target="_blank" class="flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 font-bold shadow-md transition text-center text-[11px] ${!app.githubRepoUrl ? 'opacity-50 pointer-events-none' : ''}">
                                    ${ICONS.externalLink || ''} <span>GitHub Editor</span>
                                </a>
                            </div>
                        </div>

                        <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <h4 class="text-xs font-bold text-blue-800 uppercase mb-1">Workflow:</h4>
                            <ol class="text-[11px] text-blue-700 space-y-1 list-decimal list-inside">
                                <li>Click "Save to Cloud"</li>
                                <li>Click "Submit New Issue" on the GitHub page that opens</li>
                                <li>GitHub will automatically update the data file and close the issue</li>
                            </ol>
                        </div>

                        <div class="pt-4 border-t border-gray-100">
                            <h3 class="text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">External Excel Sync</h3>
                            <p class="text-xs text-gray-500 mb-3">Optionally, provide a direct download link to an Excel file (OneDrive/Dropbox) to sync from external source.</p>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Excel Download URL</label>
                                    <input type="text" id="excel-sync-url" value="${app.excelSyncUrl || ''}" placeholder="https://onedrive.live.com/download?..." class="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono">
                                </div>
                                <button id="trigger-excel-sync-btn" class="w-full bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-blue-200 hover:bg-blue-100 transition shadow-sm ${!app.excelSyncUrl ? 'opacity-50 pointer-events-none' : ''}">
                                    Sync Now from Excel
                                </button>
                            </div>
                        </div>
                    </div>
                ` : `
                    <p class="text-sm text-gray-500 italic">Admin mode allows you to update the cloud-hosted data for all viewers.</p>
                `}
            </div>
        `;

        mainContent.innerHTML = `
            <div>
                ${renderPageHeader('Setup Settings', 'Setup')}
                <div class="h-6"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-8">
                        ${adminSection}
                    <!-- Employee List Card -->
                    <div class="bg-white p-6 shadow-lg rounded-xl">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Employee List</h2>
                        <form id="add-employee-form" class="space-y-4 mb-6 bg-gray-50/50 p-4 border border-gray-200/60 rounded-xl">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label for="name" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Name</label>
                                    <input type="text" name="name" placeholder="Name" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold" required>
                                </div>
                                <div>
                                    <label for="role" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Role / Title</label>
                                    <input type="text" name="role" placeholder="e.g. FSA" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold" required>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label for="cardColor" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Card Theme Color</label>
                                    <select name="cardColor" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white">
                                        <option value="white">White (Default)</option>
                                        <option value="gray">Gray (BM / ABM)</option>
                                        <option value="blue">Light Blue (BOC)</option>
                                        <option value="yellow">Gold / Yellow (FSA)</option>
                                        <option value="green">Mint Green (Teller)</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="vacationAllotment" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Vacation (Days)</label>
                                    <input type="number" name="vacationAllotment" value="15" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold" required>
                                </div>
                            </div>
                            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-bold shadow-md transition">Add Employee</button>
                        </form>
                        <div class="mt-4 border-t border-gray-200">
                            <ul class="divide-y divide-gray-200">${employeeListItems}</ul>
                        </div>
                    </div>

                    <!-- Right Column (Absence Types & Default Shift Settings) -->
                    <div class="space-y-8">
                        <!-- Absence Types Card -->
                        <div class="bg-white p-6 shadow-lg rounded-xl">
                            <h2 class="text-xl font-semibold text-gray-700 mb-4">Absence Types</h2>
                            <p class="text-sm text-gray-500 mb-4">Edit names, duration (HH:MM), and color.</p>
                            <div class="border-t border-gray-200">
                                <ul id="leave-type-list" class="divide-y divide-gray-200">${leaveTypeListItems}</ul>
                            </div>
                            <div class="mt-4">
                                <button id="add-leave-type-btn" class="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 font-semibold shadow-sm">Add New Type</button>
                            </div>
                        </div>

                        <!-- Default Shift Settings Card -->
                        <div class="bg-white p-6 shadow-lg rounded-xl">
                            <h2 class="text-xl font-semibold text-gray-700 mb-4">Default Shift Settings</h2>
                            <p class="text-sm text-gray-500 mb-4">Set default hours and meal break for new shifts and automated fills.</p>
                            <div class="space-y-4">
                                <div>
                                    <label for="default-preset" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Default Shift Preset</label>
                                    <select id="default-preset" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 bg-white">
                                        <option value="custom" ${(app.defaultShiftPreset === 'custom' || !app.defaultShiftPreset) ? 'selected' : ''}>Custom (Set below)</option>
                                        <option value="open" ${app.defaultShiftPreset === 'open' ? 'selected' : ''}>Open Branch (7:45 AM - 4:15 PM)</option>
                                        <option value="close" ${app.defaultShiftPreset === 'close' ? 'selected' : ''}>Close Branch (8:30 AM - 5:15 PM)</option>
                                        <option value="standard" ${app.defaultShiftPreset === 'standard' ? 'selected' : ''}>Standard Shift (8:30 AM - 5:00 PM)</option>
                                    </select>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label for="default-shift-in" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Default Shift In</label>
                                        <input type="time" id="default-shift-in" value="${app.defaultShiftIn || '08:30'}" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800">
                                    </div>
                                    <div>
                                        <label for="default-shift-out" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Default Shift Out</label>
                                        <input type="time" id="default-shift-out" value="${app.defaultShiftOut || '17:00'}" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800">
                                    </div>
                                </div>
                                <div>
                                    <label for="default-break" class="block text-xs font-bold text-gray-500 uppercase tracking-wide">Default Meal / Break Duration</label>
                                    <select id="default-break" class="mt-1 block w-full p-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 bg-white">
                                        <option value="0" ${(app.defaultBreakMins === 0) ? 'selected' : ''}>No break (00:00)</option>
                                        <option value="15" ${(app.defaultBreakMins === 15) ? 'selected' : ''}>15 mins (00:15)</option>
                                        <option value="30" ${(app.defaultBreakMins === 30) ? 'selected' : ''}>30 mins (00:30)</option>
                                        <option value="45" ${(app.defaultBreakMins === 45 || app.defaultBreakMins === undefined) ? 'selected' : ''}>45 mins (00:45)</option>
                                        <option value="60" ${(app.defaultBreakMins === 60) ? 'selected' : ''}>60 mins (01:00)</option>
                                        <option value="90" ${(app.defaultBreakMins === 90) ? 'selected' : ''}>90 mins (01:30)</option>
                                        <option value="120" ${(app.defaultBreakMins === 120) ? 'selected' : ''}>2 hours (02:00)</option>
                                    </select>
                                </div>
                                <div class="border-t border-gray-100 pt-4 mt-4 space-y-3">
                                    <h3 class="text-xs font-black text-gray-500 uppercase tracking-wider">Schedule Columns Visibility</h3>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div class="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <input type="checkbox" id="show-saturday-toggle" ${app.showSaturday !== false ? 'checked' : ''} class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                            <label for="show-saturday-toggle" class="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none">Show Saturday Column</label>
                                        </div>
                                        <div class="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <input type="checkbox" id="show-sunday-toggle" ${app.showSunday !== false ? 'checked' : ''} class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                                            <label for="show-sunday-toggle" class="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none">Show Sunday Column</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="border-t border-gray-100 pt-4 mt-4 space-y-3">
                                    <h3 class="text-xs font-black text-gray-500 uppercase tracking-wider">Highlight Colors</h3>
                                    <p class="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Used in Vertical Layout to spot branch shifts & OFF days at a glance.</p>

                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label for="open-branch-color" class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Open Branch (Green)</label>
                                            <div class="mt-1 flex items-center space-x-2">
                                                <input type="color" id="open-branch-color" value="${app.openBranchColor || '#d9ead3'}" class="w-8 h-8 p-0 border border-gray-300 rounded-md cursor-pointer bg-white">
                                                <span id="open-color-hex" class="text-xs font-bold font-mono text-gray-500">${app.openBranchColor || '#d9ead3'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label for="close-branch-color" class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Close Branch (Pink)</label>
                                            <div class="mt-1 flex items-center space-x-2">
                                                <input type="color" id="close-branch-color" value="${app.closeBranchColor || '#f4cccc'}" class="w-8 h-8 p-0 border border-gray-300 rounded-md cursor-pointer bg-white">
                                                <span id="close-color-hex" class="text-xs font-bold font-mono text-gray-500">${app.closeBranchColor || '#f4cccc'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label for="off-row-color" class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Inactive / OFF Day Row Color</label>
                                        <div class="mt-1 flex items-center space-x-2">
                                            <input type="color" id="off-row-color" value="${app.offRowColor || '#ffffff'}" class="w-8 h-8 p-0 border border-gray-300 rounded-md cursor-pointer bg-white">
                                            <span id="off-color-hex" class="text-xs font-bold font-mono text-gray-500">${app.offRowColor || '#ffffff'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button id="save-default-settings-btn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-bold shadow-md transition">Save Default Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('add-employee-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('name').trim();
            const roleInput = formData.get('role').trim();
            const nextTitleNum = app.employees.length + 1;
            const role = roleInput || `Title ${nextTitleNum}`;
            const cardColor = formData.get('cardColor');
            const vacationAllotment = parseInt(formData.get('vacationAllotment'), 10) || 15;

            const newEmployee = {
                id: `emp${Date.now()}`,
                name,
                role,
                cardColor,
                vacationAllotment
            };

            if (newEmployee.name) {
                app.employees.push(newEmployee);
                saveState();
                renderSetup();
            }
        });

        // Inline editing handlers
        mainContent.addEventListener('change', e => {
            const target = e.target;
            if (target.classList.contains('emp-edit-select')) {
                const empId = target.dataset.empId;
                const field = target.dataset.field;
                const emp = app.employees.find(e => e.id === empId);
                if (emp) {
                    emp[field] = target.value;
                    saveState();
                }
            }
        });

        mainContent.addEventListener('focusout', e => {
            const target = e.target;
            if (target.classList.contains('emp-edit-input')) {
                const empId = target.dataset.empId;
                const field = target.dataset.field;
                const emp = app.employees.find(e => e.id === empId);
                if (emp) {
                    let value = target.value.trim();
                    if (field === 'vacationAllotment') {
                        value = parseInt(value, 10) || 15;
                    }
                    if (value !== '') {
                        emp[field] = value;
                        saveState();
                    } else {
                        target.value = emp[field];
                    }
                }
            }
        });

        document.querySelectorAll('.delete-employee').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.empId;
                const emp = app.employees.find(emp => emp.id === id);
                const empName = emp ? emp.name : "this employee";
                showConfirm(
                    "Delete Employee",
                    `Are you sure you want to delete ${empName}? All their schedule data and log entries will also be permanently removed.`,
                    () => {
                        app.employees = app.employees.filter(emp => emp.id !== id);
                        app.logEntries = app.logEntries.filter(log => log.employeeId !== id);
                        saveState();
                        renderSetup();
                        showToast("Deleted", `${empName} has been deleted.`, "info");
                    }
                );
            });
        });
        const leaveTypeListEl = document.getElementById('leave-type-list');
        leaveTypeListEl.addEventListener('focusout', (e) => {
            const target = e.target; if (target.dataset.ltId) {
                const leaveType = app.leaveTypes.find(lt => lt.id === target.dataset.ltId); if (!leaveType) return;
                const field = target.dataset.field;
                if (field === 'name') {
                    const value = target.textContent.trim();
                    if (value) leaveType.name = value; else target.textContent = leaveType.name;
                } else if (field === 'durationHHMM') {
                    const value = target.value;
                    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) leaveType.durationHHMM = value; else { target.value = leaveType.durationHHMM; showToast("Invalid Format", "Please use HH:MM format.", "info"); }
                }
                saveState();
            }
        });
        leaveTypeListEl.addEventListener('input', e => {
            const target = e.target;
            if (target.dataset.ltId && target.dataset.field === 'color') {
                const leaveType = app.leaveTypes.find(lt => lt.id === target.dataset.ltId);
                if(leaveType) { leaveType.color = target.value; saveState(); }
            }
        });
        document.querySelectorAll('.delete-leavetype').forEach(button => {
            button.addEventListener('click', e => {
                if(app.leaveTypes.length <= 1) { showToast("Notice", "You must have at least one absence type.", "info"); return; }
                const ltId = e.currentTarget.dataset.ltId;
                const ltName = app.leaveTypes.find(lt => lt.id === ltId)?.name || "this absence type";
                showConfirm(
                    "Delete Absence Type",
                    `Are you sure you want to delete "${ltName}"?`,
                    () => {
                        app.leaveTypes = app.leaveTypes.filter(lt => lt.id !== ltId);
                        saveState();
                        renderSetup();
                        showToast("Deleted", `Absence type "${ltName}" has been deleted.`, "info");
                    }
                );
            });
        });
        document.getElementById('add-leave-type-btn').addEventListener('click', () => { app.leaveTypes.push({ id: `lt${Date.now()}`, name: 'New Absence Type', durationHHMM: '08:00', color: '#888888' }); saveState(); renderSetup(); });

        const defaultPresetSelect = document.getElementById('default-preset');
        if (defaultPresetSelect) {
            defaultPresetSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const shiftInEl = document.getElementById('default-shift-in');
                const shiftOutEl = document.getElementById('default-shift-out');
                if (val === 'open') {
                    shiftInEl.value = '07:45';
                    shiftOutEl.value = '16:15';
                } else if (val === 'close') {
                    shiftInEl.value = '08:30';
                    shiftOutEl.value = '17:15';
                } else if (val === 'standard') {
                    shiftInEl.value = '08:30';
                    shiftOutEl.value = '17:00';
                }
            });
        }

        const shiftInInput = document.getElementById('default-shift-in');
        if (shiftInInput) {
            shiftInInput.addEventListener('change', () => {
                if (defaultPresetSelect) defaultPresetSelect.value = 'custom';
            });
        }

        const shiftOutInput = document.getElementById('default-shift-out');
        if (shiftOutInput) {
            shiftOutInput.addEventListener('change', () => {
                if (defaultPresetSelect) defaultPresetSelect.value = 'custom';
            });
        }

        const saveDefaultBtn = document.getElementById('save-default-settings-btn');

        const openColorInput = document.getElementById('open-branch-color');
        if (openColorInput) {
            openColorInput.addEventListener('input', (e) => {
                const label = document.getElementById('open-color-hex');
                if (label) label.textContent = e.target.value;
            });
        }
        const closeColorInput = document.getElementById('close-branch-color');
        if (closeColorInput) {
            closeColorInput.addEventListener('input', (e) => {
                const label = document.getElementById('close-color-hex');
                if (label) label.textContent = e.target.value;
            });
        }
        const offColorInput = document.getElementById('off-row-color');
        if (offColorInput) {
            offColorInput.addEventListener('input', (e) => {
                const label = document.getElementById('off-color-hex');
                if (label) label.textContent = e.target.value;
            });
        }

        if (saveDefaultBtn) {
            saveDefaultBtn.addEventListener('click', () => {
                app.defaultShiftIn = document.getElementById('default-shift-in').value;
                app.defaultShiftOut = document.getElementById('default-shift-out').value;
                app.defaultBreakMins = parseInt(document.getElementById('default-break').value, 10);
                app.defaultShiftPreset = document.getElementById('default-preset') ? document.getElementById('default-preset').value : 'custom';

                if (openColorInput) app.openBranchColor = openColorInput.value;
                if (closeColorInput) app.closeBranchColor = closeColorInput.value;
                if (offColorInput) app.offRowColor = offColorInput.value;

                const showSaturdayToggle = document.getElementById('show-saturday-toggle');
                if (showSaturdayToggle) app.showSaturday = showSaturdayToggle.checked;

                const showSundayToggle = document.getElementById('show-sunday-toggle');
                if (showSundayToggle) app.showSunday = showSundayToggle.checked;

                saveState();
                showToast('Success', 'Default shift and highlight color settings saved!', 'success');
            });
        }

        // Admin Sync Listeners
        const adminModeToggle = document.getElementById('admin-mode-toggle');
        if (adminModeToggle) {
            adminModeToggle.addEventListener('change', (e) => {
                app.adminMode = e.target.checked;
                saveState();
                renderSetup();
            });
        }

        const repoUrlInput = document.getElementById('github-repo-url');
        if (repoUrlInput) {
            repoUrlInput.addEventListener('change', (e) => {
                app.githubRepoUrl = e.target.value.trim();
                saveState();
                renderSetup();
            });
        }

        const copyBtn = document.getElementById('copy-sync-data-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const dataToCopy = JSON.stringify(app, null, 2);

                navigator.clipboard.writeText(dataToCopy).then(() => {
                    showToast('Copied!', 'Application data copied to clipboard.', 'success');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast('Error', 'Failed to copy to clipboard.', 'error');
                });
            });
        }

        const saveToCloudBtn = document.getElementById('save-to-cloud-btn');
        if (saveToCloudBtn) {
            saveToCloudBtn.onclick = () => {
                const payload = JSON.stringify(app, null, 2);

                const issueBody = encodeURIComponent(`---DATA_SYNC_START---\n${payload}\n---DATA_SYNC_END---`);
                const issueTitle = encodeURIComponent(`Schedule Update: ${new Date().toLocaleString()}`);
                const url = `${app.githubRepoUrl}/issues/new?title=${issueTitle}&body=${issueBody}`;

                window.open(url, '_blank');
                showToast('GitHub Opened', 'Please click "Submit New Issue" on GitHub to finish the update.', 'info');
            };
        }

        const excelSyncUrlInput = document.getElementById('excel-sync-url');
        if (excelSyncUrlInput) {
            excelSyncUrlInput.addEventListener('change', (e) => {
                app.excelSyncUrl = e.target.value.trim();
                saveState();
                renderSetup();
            });
        }

        const triggerExcelSyncBtn = document.getElementById('trigger-excel-sync-btn');
        if (triggerExcelSyncBtn) {
            triggerExcelSyncBtn.onclick = () => {
                // To trigger a GitHub Action via Issue (without API token),
                // we can open a special issue that tells the action to fetch from Excel.
                const issueBody = encodeURIComponent(`---EXCEL_SYNC_TRIGGER---\nURL: ${app.excelSyncUrl}\n---END---`);
                const issueTitle = encodeURIComponent(`Sync from Excel: ${new Date().toLocaleString()}`);
                const url = `${app.githubRepoUrl}/issues/new?title=${issueTitle}&body=${issueBody}`;

                window.open(url, '_blank');
                showToast('Sync Triggered', 'Click "Submit New Issue" to start the Excel sync process.', 'info');
            };
        }
    }

function openEditModal(employeeId, dateStr) {
        const modalTitle = modal.querySelector('#modal-title');
        const modalForm = modal.querySelector('#modal-form');
        const employee = app.employees.find(e => e.id === employeeId);
        const logEntry = app.logEntries.find(log => log.employeeId === employeeId && log.date === dateStr);

        const leaveTypeOptions = app.leaveTypes.map(lt => `<option value="${lt.id}" ${logEntry?.leaveTypeId === lt.id ? 'selected' : ''}>${lt.name}</option>`).join('');

        modalTitle.textContent = `${logEntry ? 'Edit' : 'Add'} Leave for ${employee.name}`;

        modalForm.innerHTML = `
            <input type="hidden" name="employeeId" value="${employeeId}">
            <input type="hidden" name="date" value="${dateStr}">
            ${logEntry ? `<input type="hidden" name="logId" value="${logEntry.id}">` : ''}
            <div>
                <label for="modal-leaveTypeId" class="block text-sm font-medium text-gray-700">Absence Type</label>
                <select id="modal-leaveTypeId" name="leaveTypeId" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required>${leaveTypeOptions}</select>
            </div>
            <div>
                <label for="modal-duration" class="block text-sm font-medium text-gray-700">Duration (Days)</label>
                <select id="modal-duration" name="duration" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value="1" ${logEntry?.duration === 1 ? 'selected' : ''}>Full Day</option>
                    <option value="0.5" ${logEntry?.duration === 0.5 ? 'selected' : ''}>Half Day</option>
                </select>
            </div>
            <div>
                <label for="modal-notes" class="block text-sm font-medium text-gray-700">Notes</label>
                <textarea id="modal-notes" name="notes" rows="3" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">${logEntry?.notes || ''}</textarea>
            </div>
            <div class="flex justify-between items-center pt-4">
                <div>${logEntry ? `<button type="button" id="modal-delete-btn" class="text-red-600 hover:text-red-800 font-semibold">Delete Entry</button>` : ''}</div>
                <button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold shadow-md">Save Changes</button>
            </div>
        `;

        modalForm.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(modalForm);
            const data = Object.fromEntries(formData.entries());
            data.duration = parseFloat(data.duration);

            if (data.logId) { // Editing existing log
                const index = app.logEntries.findIndex(l => l.id === data.logId);
                app.logEntries[index] = { ...app.logEntries[index], ...data };
            } else { // Adding new log
                app.logEntries.push({ ...data, id: `log${Date.now()}` });
            }
            saveState();
            renderDashboard();
            closeEditModal();
        };

        if (logEntry) {
            document.getElementById('modal-delete-btn').onclick = () => {
                showConfirm(
                    "Delete Leave Entry",
                    "Are you sure you want to delete this leave entry? This cannot be undone.",
                    () => {
                        app.logEntries = app.logEntries.filter(l => l.id !== logEntry.id);
                        saveState();
                        renderDashboard();
                        closeEditModal();
                        showToast("Deleted", "Leave entry has been deleted.", "info");
                    }
                );
            };
        }

        modal.classList.add('is-open');
    }

function closeEditModal() {
        modal.classList.remove('is-open');
    }

function toggleSidebar(collapsed) {
        app.sidebarCollapsed = collapsed;
        saveState();

        const sidebar = document.getElementById('sidebar');
        const expandBtn = document.getElementById('sidebar-expand-btn');
        const mainViewport = document.getElementById('main-content-viewport');
        const overlay = document.getElementById('sidebar-overlay');

        if (sidebar && expandBtn) {
            if (app.sidebarCollapsed) {
                sidebar.classList.add('w-0', 'p-0', 'border-r-0');
                sidebar.classList.remove('w-64', 'p-4', 'border-r');
                expandBtn.classList.remove('hidden');
                if (overlay) overlay.classList.add('hidden');
                if (mainViewport) {
                    mainViewport.classList.add('pl-16');
                }
            } else {
                sidebar.classList.add('w-64', 'p-4', 'border-r');
                sidebar.classList.remove('w-0', 'p-0', 'border-r-0');
                expandBtn.classList.add('hidden');
                if (overlay && window.innerWidth < 768) overlay.classList.remove('hidden');
                if (mainViewport) {
                    mainViewport.classList.remove('pl-16');
                }
            }
        }
    }

document.addEventListener('DOMContentLoaded', async () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginPass = document.getElementById('login-password');
    const loginErr = document.getElementById('login-error');
    const appContainer = document.getElementById('app-container');

    // Check if already "logged in" for this session
    const sessionKey = sessionStorage.getItem('vly_auth');
    if (sessionKey === '%%APP_PASSWORD%%') {
        proceedToApp();
    }

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const pass = loginPass.value.toUpperCase();
        if (pass === '%%APP_PASSWORD%%') {
            sessionStorage.setItem('vly_auth', '%%APP_PASSWORD%%');
            proceedToApp();
        } else {
            loginErr.classList.remove('hidden');
            loginPass.value = '';
            loginPass.focus();
        }
    };

    async function proceedToApp() {
        await loadState();

        loginOverlay.classList.add('opacity-0');
        setTimeout(() => {
            loginOverlay.style.display = 'none';
            appContainer.classList.remove('opacity-0', 'pointer-events-none');
        }, 500);

        // Standard App Init
        initApp();
    }

    function initApp() {
    app.sidebarCollapsed = true;
    toggleSidebar(true);

    const expandBtn = document.getElementById('sidebar-expand-btn');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const overlay = document.getElementById('sidebar-overlay');
    if (expandBtn) expandBtn.addEventListener('click', () => toggleSidebar(false));
    if (collapseBtn) collapseBtn.addEventListener('click', () => toggleSidebar(true));
    if (overlay) overlay.addEventListener('click', () => toggleSidebar(true));

    navItems.forEach(item => item.addEventListener('click', () => {
        app.activeTab = item.dataset.tab;
        saveState();
        render();
        if (window.innerWidth < 768) {
            toggleSidebar(true);
        }
    }));
    document.getElementById('modal-close-btn').addEventListener('click', closeEditModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });
        render();
    }
});
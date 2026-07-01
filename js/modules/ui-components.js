import { app, saveState } from './state.js';
import { ICONS } from './config.js';
import { getContrastYIQ } from './utils.js';

export function renderPageHeader(title, currentTab) {
        const getButtonClass = (tab) => {
            if (currentTab === tab) {
                return "p-1 rounded bg-black/25 text-black border border-black/15 shadow-sm";
            }
            return "p-1 rounded text-black/80 hover:bg-black/10 hover:text-black transition duration-150";
        };

        return `
            <div class="bg-[#f1c232] text-black font-extrabold uppercase p-3 rounded-t-xl border border-gray-300 flex flex-row justify-between items-center text-left gap-4 tracking-wider shadow-sm">
                 <div class="flex items-center gap-2">
                     <h1 class="text-lg md:text-xl font-black text-black tracking-tight uppercase inline-block select-none">${title}</h1>
                 </div>

                 <!-- Quick Navigation Header Buttons -->
                 <div class="flex items-center space-x-1 bg-black/10 p-0.5 rounded-lg border border-black/5 shadow-inner shrink-0">
                     <!-- Team Schedule Quick Button -->
                     <button data-quick-tab="Schedule" class="${getButtonClass('Schedule')} relative group" title="Team Schedule" aria-label="Team Schedule">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span class="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-black text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">Team Schedule</span>
                     </button>
                     <!-- Dashboard Quick Button -->
                     <button data-quick-tab="Dashboard" class="${getButtonClass('Dashboard')} relative group" title="Dashboard" aria-label="Dashboard">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          <span class="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-black text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">Dashboard</span>
                     </button>
                     <!-- Data Log Quick Button -->
                     <button data-quick-tab="Data Log" class="${getButtonClass('Data Log')} relative group" title="Data Log" aria-label="Data Log">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                          <span class="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-black text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">Data Log</span>
                     </button>

                     <div class="h-3.5 w-[1px] bg-black/20 mx-0.5"></div>

                     <!-- Setup Quick Button (Settings) -->
                     <button data-quick-tab="Setup" class="${getButtonClass('Setup')} relative group" title="Setup Settings" aria-label="Setup Settings">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span class="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-black text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">Setup Settings</span>
                     </button>
                 </div>
            </div>
        `;
    }

export function renderEmptyState(title, message, buttonText, buttonAction) {
        const container = document.getElementById('main-content');
        container.innerHTML = `
            <div class="text-center py-20">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">${title}</h1>
                <p class="text-lg text-gray-500 mb-8">${message}</p>
                ${buttonText && buttonAction ? `<button id="empty-state-action" class="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-semibold shadow-md">${buttonText}</button>` : ''}
            </div>
        `;
        if(buttonText && buttonAction) {
            document.getElementById('empty-state-action').addEventListener('click', buttonAction);
        }
    }

export function generateDailyCalendarHTML() {
        const pencilIcon = ICONS.pencil;
        const date = app.dailyCalendarDate;
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const leavesToday = app.logEntries.filter(log => log.date === dateStr);
        const employeeRows = app.employees.map(emp => {
            const leave = leavesToday.find(l => l.employeeId === emp.id);
            let statusHtml, detailsHtml, notesHtml, rowClass;
            if (leave) {
                const leaveType = app.leaveTypes.find(lt => lt.id === leave.leaveTypeId);
                statusHtml = `<span class="font-semibold text-red-600">On Leave</span>`;
                detailsHtml = `${leaveType?.name || 'Unknown'} (${leave.duration === 0.5 ? 'Half Day' : 'Full Day'})`;
                notesHtml = leave.notes || '-';
                rowClass = 'bg-red-50 hover:bg-red-100';
            } else {
                statusHtml = `<span class="font-semibold text-green-600">Available</span>`;
                detailsHtml = '-';
                notesHtml = '-';
                rowClass = 'bg-white hover:bg-gray-50';
            }
            return `<tr class="${rowClass} border-b"><th scope="row" class="px-6 py-4 font-medium text-gray-900">${emp.name}</th><td class="px-6 py-4">${statusHtml}</td><td class="px-6 py-4">${detailsHtml}</td><td class="px-6 py-4">${notesHtml}</td><td class="px-6 py-4 text-center"><button class="edit-daily-btn text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200" data-employee-id="${emp.id}" data-date-str="${dateStr}" aria-label="Edit entry for ${emp.name}">${pencilIcon}</button></td></tr>`;
        }).join('');
        return `<div class="bg-white shadow-lg rounded-xl overflow-hidden mt-12"><div class="p-6"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold text-gray-800">Daily View</h2><div class="flex items-center space-x-2"><button id="prev-day" class="p-2 bg-white border rounded-md shadow-sm hover:bg-gray-50" aria-label="Previous day"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button><h3 class="text-xl font-bold text-gray-800 text-center w-64">${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3><button id="next-day" class="p-2 bg-white border rounded-md shadow-sm hover:bg-gray-50" aria-label="Next day"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button></div></div></div><div class="overflow-x-auto"><table class="w-full text-sm text-left text-gray-600"><thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" class="px-6 py-3">Employee</th><th scope="col" class="px-6 py-3">Status</th><th scope="col" class="px-6 py-3">Details</th><th scope="col" class="px-6 py-3">Notes</th><th scope="col" class="px-6 py-3 text-center">Edit</th></tr></thead><tbody>${employeeRows}</tbody></table></div></div>`;
    }

export function generateMonthlyCalendarHTML() {
        const date = app.monthlyCalendarDate; const year = date.getFullYear(); const month = date.getMonth();
        const monthName = date.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `<th class="p-1 font-semibold text-gray-600 border-l border-gray-200 text-center text-xs" style="min-width: 30px;">${i + 1}</th>`).join('');
        const leavesByDay = {};
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            leavesByDay[i] = app.logEntries.filter(log => log.date === dateStr).length;
        }
        const employeeRows = app.employees.map(employee => {
            const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const leave = app.logEntries.find(log => log.employeeId === employee.id && log.date === dateStr);
                const conflictClass = app.highlightConflicts && leavesByDay[day] > 1 ? 'conflict-highlight' : '';
                if (leave) {
                    const leaveType = app.leaveTypes.find(lt => lt.id === leave.leaveTypeId);
                    const abbreviation = leaveType ? leaveType.name.charAt(0) : 'L';
                    const bgColor = leaveType?.color || '#a1a1aa';
                    const textColor = getContrastYIQ(bgColor);
                    const content = leave.duration < 1 ? `½` : abbreviation;
                    return `<td class="relative border-l border-gray-200 text-center p-0"><div style="background-color: ${bgColor}; color: ${textColor};" class="w-full h-full flex items-center justify-center font-bold text-xs p-1 ${conflictClass}" title="${leaveType?.name || ''}">${content}</div></td>`;
                }
                return `<td class="relative border-l border-gray-200 h-10 p-0"><div class="w-full h-full ${conflictClass}"></div></td>`;
            }).join('');
            return `<tr class="border-t border-gray-200"><td class="sticky-col bg-white hover:bg-gray-50 p-2 text-sm text-left font-medium text-gray-800 border-r w-36 truncate">${employee.name}</td>${dayCells}</tr>`;
        }).join('');
        return `<div class="bg-white shadow-lg rounded-xl mt-12"><div class="p-6"><div class="flex justify-between items-center mb-6"><div class="flex items-center space-x-4"><h2 class="text-2xl font-semibold text-gray-700">Monthly Calendar</h2><div class="flex items-center"><input id="conflict-toggle" type="checkbox" ${app.highlightConflicts ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"><label for="conflict-toggle" class="ml-2 block text-sm text-gray-700">Highlight Conflicts</label></div></div><div class="flex items-center space-x-2"><button id="prev-month" class="p-2 bg-white border rounded-md shadow-sm hover:bg-gray-50" aria-label="Previous month"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button><h3 class="text-xl font-bold text-gray-800 w-32 text-center">${monthName} ${year}</h3><button id="next-month" class="p-2 bg-white border rounded-md shadow-sm hover:bg-gray-50" aria-label="Next month"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button></div></div></div><div class="overflow-x-auto"><table class="w-full border-collapse" style="min-width: 800px;"><thead><tr class="bg-gray-50"><th class="sticky-col bg-gray-50 p-2 text-sm text-left font-semibold text-gray-700 border-r w-36">Employee</th>${dayHeaders}</tr></thead><tbody>${employeeRows}</tbody></table></div></div>`;
    }

export function generateYearlyGridViewHTML(year) {
        const months = Array.from({length: 12}, (_, i) => i);
        const monthNames = months.map(m => new Date(year, m).toLocaleString('default', { month: 'short' }));
        const monthHeaders = monthNames.map(name => `<th class="px-4 py-3 text-center">${name.toUpperCase()}</th>`).join('');

        const employeeRows = app.employees.map(emp => {
            const monthlyTotals = months.map(month => {
                return app.logEntries.filter(log => log.employeeId === emp.id && new Date(log.date).getFullYear() === year && new Date(log.date).getMonth() === month).reduce((sum, log) => sum + log.duration, 0);
            });
            return { name: emp.name, totals: monthlyTotals };
        });

        const tableRows = employeeRows.map(empData => {
            const grandTotal = empData.totals.reduce((sum, total) => sum + total, 0);
            const monthCells = empData.totals.map(total => {
                let fontColorClass = 'text-gray-500';
                if (total > 0) {
                    if (total === 1) { fontColorClass = 'text-orange-500'; }
                    else if (total >= 2) { fontColorClass = 'text-red-600'; }
                }
                return `<td class="px-4 py-4 text-center font-bold ${fontColorClass}">${total > 0 ? total : '-'}</td>`;
            }).join('');
            return `<tr class="border-b border-gray-200 hover:bg-gray-50"><th scope="row" class="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">${empData.name}</th>${monthCells}<td class="px-4 py-4 text-center font-bold text-blue-600">${grandTotal > 0 ? grandTotal : '-'}</td></tr>`;
        }).join('');

        const title = `<h2 class="text-2xl font-bold text-gray-800 p-6">Yearly Leave Summary for ${year}</h2>`;
        const header = `<thead class="text-xs text-gray-500 uppercase bg-white border-b"><tr class="font-semibold"><th scope="col" class="px-6 py-3 text-left">Employee</th>${monthHeaders}<th scope="col" class="px-4 py-3 text-center">Annual Total</th></tr></thead>`;

        return `<div class="bg-white shadow-lg rounded-xl overflow-hidden mt-12">${title}<div class="overflow-x-auto"><table class="w-full text-sm text-left text-gray-600">${header}<tbody>${tableRows}</tbody></table></div></div>`;
    }

export function showToast(title, message, type = 'success') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-3';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        let typeClasses = 'bg-white border-green-500 text-green-800';
        let iconHtml = `
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;

        if (type === 'info') {
            typeClasses = 'bg-white border-blue-500 text-blue-800';
            iconHtml = `
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        }

        toast.className = `flex items-center space-x-3 p-4 border-l-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-y-5 opacity-0 ${typeClasses}`;
        toast.innerHTML = `
            <div>${iconHtml}</div>
            <div class="flex flex-col">
                <span class="text-sm font-bold">${title}</span>
                <span class="text-xs text-gray-500 font-semibold mt-0.5">${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('translate-y-5', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-5', 'opacity-0');
            setTimeout(() => { toast.remove(); }, 300);
        }, 3000);
    }

export function showConfirm(title, message, onConfirm, okText = 'Confirm', isDestructive = true) {
        let confirmModal = document.getElementById('custom-confirm-modal');
        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'custom-confirm-modal';
            confirmModal.className = 'modal fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full justify-center items-center z-[100]';
            confirmModal.innerHTML = `
                <div class="relative mx-auto p-6 border w-full max-w-sm shadow-2xl rounded-2xl bg-white border-gray-100 transform transition-all duration-300">
                    <h3 id="custom-confirm-title" class="text-lg font-extrabold text-gray-900 mb-2">Are you sure?</h3>
                    <p id="custom-confirm-message" class="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
                    <div class="flex justify-end space-x-3">
                        <button id="custom-confirm-cancel-btn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition">Cancel</button>
                        <button id="custom-confirm-ok-btn" class="px-4 py-2 text-white rounded-lg text-sm font-bold transition shadow-md"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmModal);
        }

        document.getElementById('custom-confirm-title').textContent = title;
        document.getElementById('custom-confirm-message').textContent = message;

        const okBtn = document.getElementById('custom-confirm-ok-btn');
        okBtn.textContent = okText;
        if (isDestructive) {
            okBtn.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition shadow-md';
        } else {
            okBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition shadow-md';
        }

        const closeModal = () => {
            confirmModal.classList.remove('is-open');
        };

        const onCancel = () => {
            closeModal();
        };

        const onOk = () => {
            closeModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };

        const cancelBtn = document.getElementById('custom-confirm-cancel-btn');
        cancelBtn.onclick = onCancel;
        okBtn.onclick = onOk;
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                closeModal();
            }
        };

        confirmModal.classList.add('is-open');
    }

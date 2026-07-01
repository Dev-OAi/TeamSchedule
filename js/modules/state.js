import { INITIAL_LEAVE_TYPES, INITIAL_EMPLOYEES } from './config.js';

export let app = {
        activeTab: 'Schedule',
        currentYear: new Date().getFullYear(),
        dailyCalendarDate: new Date(),
        monthlyCalendarDate: new Date(),
        highlightConflicts: false,
        dashboardSort: { key: 'name', order: 'asc' },
        logSort: { key: 'date', order: 'desc' },
        filters: { employeeId: 'all', leaveTypeId: 'all' },
        leaveTypes: [
            { id: 'vacation', name: 'Vacation', durationHHMM: '08:00', color: '#3b82f6' },
            { id: 'sick', name: 'Sick Day', durationHHMM: '08:00', color: '#ef4444' },
            { id: 'personal', name: 'Personal Day', durationHHMM: '08:00', color: '#f59e0b' },
            { id: 'jury', name: 'Jury Duty', durationHHMM: '08:00', color: '#8b5cf6' },
            { id: 'bereavement', name: 'Bereavement', durationHHMM: '08:00', color: '#6b7280' },
            { id: 'other', name: 'Other', durationHHMM: '08:00', color: '#10b981' },
        ],
        employees: [
            { id: 'emp1', name: 'Alice Smith', role: 'Title 1', cardColor: 'white', vacationAllotment: 15 },
            { id: 'emp2', name: 'Bob Johnson', role: 'Title 2', cardColor: 'white', vacationAllotment: 20 },
            { id: 'emp3', name: 'Charlie Brown', role: 'Title 3', cardColor: 'white', vacationAllotment: 15 },
        ],
        logEntries: [
            { id: 'log1', date: '2024-01-15', employeeId: 'emp1', leaveTypeId: 'vacation', duration: 1, notes: 'Pre-approved' },
            { id: 'log2', date: '2024-02-05', employeeId: 'emp2', leaveTypeId: 'sick', duration: 1, notes: 'Called out, flu' },
            { id: 'log3', date: '2024-02-20', employeeId: 'emp3', leaveTypeId: 'vacation', duration: 0.5, notes: 'AM half-day' },
            { id: 'log4', date: '2024-03-01', employeeId: 'emp1', leaveTypeId: 'sick', duration: 1, notes: 'Called out, migraine' },
            { id: 'log5', date: '2024-04-10', employeeId: 'emp2', leaveTypeId: 'personal', duration: 1, notes: 'Appointment' },
            { id: 'log6', date: '2024-04-10', employeeId: 'emp1', leaveTypeId: 'vacation', duration: 1, notes: '' },
        ],
        schedules: {},
        scheduleWeekDate: '',
        scheduleViewMode: 'editor',
        showCoverageTotals: false,
        defaultShiftIn: '08:30',
        defaultShiftOut: '17:00',
        defaultBreakMins: 45,
        defaultShiftPreset: 'standard',
        offRowColor: '#ffffff',
        showSaturday: false,
        showSunday: false,
        adminMode: false,
        githubRepoUrl: ''
    };

export function saveState() {
        try {
            localStorage.setItem('teamScheduleTrackerData_v1', JSON.stringify(app));
        } catch (e) {
            console.error("Could not save data to local storage.", e);
        }
    }

export async function loadState() {
        // Try to load from cloud first
        try {
            const response = await fetch('data/schedule.json');
            if (response.ok) {
                const cloudData = await response.json();
                console.log("Loaded data from cloud.");
                applyDataToApp(cloudData);
                return;
            }
        } catch (e) {
            console.warn("Could not load data from cloud, falling back to local storage.", e);
        }

        let savedData = localStorage.getItem('teamScheduleTrackerData_v1');
        if (!savedData) {
            savedData = localStorage.getItem('leaveTrackerData_v4');
        }
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                applyDataToApp(parsedData);
            } catch (e) {
                console.error("Failed to load saved data. Using default data.", e);
                localStorage.removeItem('leaveTrackerData_v4');
            }
        }
    }

function applyDataToApp(parsedData) {
                const defaultState = {
                    activeTab: 'Schedule',
                    currentYear: new Date().getFullYear(),
                    dailyCalendarDate: new Date(),
                    monthlyCalendarDate: new Date(),
                    highlightConflicts: false,
                    dashboardSort: { key: 'name', order: 'asc' },
                    logSort: { key: 'date', order: 'desc' },
                    filters: { employeeId: 'all', leaveTypeId: 'all' },
                    leaveTypes: [],
                    employees: [],
                    logEntries: [],
                    schedules: {},
                    scheduleWeekDate: '',
                    scheduleViewMode: 'editor',
                    layoutOrientation: 'horizontal',
                    openBranchColor: '#d9ead3',
                    closeBranchColor: '#f4cccc',
                    offRowColor: '#ffffff',
                    showCoverageTotals: false,
                    defaultShiftIn: '08:30',
                    defaultShiftOut: '17:00',
                    defaultBreakMins: 45,
                    defaultShiftPreset: 'standard',
                    showSaturday: false,
                    showSunday: false,
                    adminMode: false,
                    githubRepoUrl: '',
                    ...parsedData
                };

                if (parsedData.showWeekend !== undefined) {
                    if (parsedData.showSaturday === undefined) defaultState.showSaturday = parsedData.showWeekend;
                    if (parsedData.showSunday === undefined) defaultState.showSunday = parsedData.showWeekend;
                }

                Object.assign(app, defaultState);

                if (app.offRowColor === '#000000') {
                    app.offRowColor = '#ffffff';
                }

                app.leaveTypes = app.leaveTypes.map((lt, index) => ({
                    color: app.leaveTypes[index]?.color || '#6b7280',
                    ...lt
                }));

                app.employees = app.employees.map(emp => ({
                    role: emp.role || 'FSA',
                    cardColor: emp.cardColor || 'white',
                    vacationAllotment: emp.vacationAllotment || 15,
                    ...emp
                }));

                app.dailyCalendarDate = new Date(app.dailyCalendarDate);
                app.monthlyCalendarDate = new Date(app.monthlyCalendarDate);
                if (isNaN(app.dailyCalendarDate.getTime())) app.dailyCalendarDate = new Date();
                if (isNaN(app.monthlyCalendarDate.getTime())) app.monthlyCalendarDate = new Date();

    }

export function getWeeklySchedule(weekDate) {
    if (!app.schedules) {
        app.schedules = {};
    }
    if (!app.schedules[weekDate]) {
        app.schedules[weekDate] = [];
    }

    app.employees.forEach(emp => {
        let empSched = app.schedules[weekDate].find(s => s.employeeId === emp.id);
        if (!empSched) {
            empSched = {
                employeeId: emp.id,
                days: {
                    "Mon": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Tue": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Wed": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Thu": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Fri": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Sat": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' },
                    "Sun": { active: false, type: 'OFF', location: '', shiftIn: '', shiftOut: '', breakMins: 0, role: '' }
                }
            };
            app.schedules[weekDate].push(empSched);
        }
    });

    return app.schedules[weekDate];
}

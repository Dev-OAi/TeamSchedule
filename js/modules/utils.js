import { app } from './state.js';

export function hhmmToHours(hhmm) {
        if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
        const [hours, minutes] = hhmm.split(':').map(Number);
        return hours + (minutes / 60);
    }

export function getContrastYIQ(hexcolor){
        if (!hexcolor || typeof hexcolor !== 'string') return 'black';
        if (hexcolor.startsWith('#')) {
            hexcolor = hexcolor.substring(1);
        }
        if (hexcolor.length < 6) return 'black';
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

export function formatHoursToHHMMString(hours) {
        if (isNaN(hours) || hours <= 0) return '00 hrs : 00 min';
        const hrs = Math.floor(hours);
        const mins = Math.round((hours - hrs) * 60);
        const hrsStr = String(hrs).padStart(2, '0');
        const minsStr = String(mins).padStart(2, '0');
        return `${hrsStr} hrs : ${minsStr} min`;
    }

export function format12HourTime(timeStr) {
        if (!timeStr) return '';
        const [hourStr, minStr] = timeStr.split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 should be 12
        return `${hour}:${minStr} ${ampm}`;
    }

export function formatBreakTime(breakMins) {
        const mins = parseInt(breakMins, 10) || 0;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

export function getDatesOfWeek(mondayStr) {
        const dates = [];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const monday = new Date(mondayStr + 'T12:00:00');
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push({
                dayCode: days[i],
                dateDisplay: `${d.getMonth() + 1}/${d.getDate()}`,
                dayDisplay: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
            });
        }
        return dates;
    }

export function formatDateToMMDDYYYY(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }

export function getSortableValue(item, key) {
        if (!item) return null;
        let value;
        if (key === 'employeeId') {
            value = app.employees.find(e => e.id === item[key])?.name;
        } else if (key === 'leaveTypeId') {
            value = app.leaveTypes.find(lt => lt.id === item[key])?.name;
        } else {
            value = key.split('.').reduce((o, i) => o ? o[i] : undefined, item);
        }

        if (key.includes('date')) return new Date(value);
        return value;
    }

export function sortData(data, sortConfig) {
        const { key, order } = sortConfig;
        return [...data].sort((a, b) => {
            const valA = getSortableValue(a, key);
            const valB = getSortableValue(b, key);

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            return order === 'asc' ? comparison : -comparison;
        });
    }

export function calculateHours(shiftIn, shiftOut, breakMins) {
        if (!shiftIn || !shiftOut) return 0;
        const [inH, inM] = shiftIn.split(':').map(Number);
        const [outH, outM] = shiftOut.split(':').map(Number);
        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) {
            diffMins += 24 * 60; // Overnight shift
        }
        const bMins = parseInt(breakMins, 10) || 0;
        const netMins = diffMins - bMins;
        return netMins > 0 ? parseFloat((netMins / 60).toFixed(2)) : 0;
    }

export function getLeaveTypeDefaultHours(type) {
        if (!type) return 8.0;
        const typeUpper = type.toUpperCase();

        // Find matching leaveType from app.leaveTypes
        const match = app.leaveTypes.find(lt => {
            const idUpper = lt.id.toUpperCase();
            const nameUpper = lt.name.toUpperCase();
            return idUpper === typeUpper ||
                   nameUpper === typeUpper ||
                   (typeUpper === 'SICK TIME' && (idUpper === 'SICK' || nameUpper.includes('SICK'))) ||
                   (typeUpper === 'PERSONAL DAY' && (idUpper === 'PERSONAL' || nameUpper.includes('PERSONAL'))) ||
                   (typeUpper === 'HOLIDAY' && (idUpper === 'HOLIDAY' || nameUpper.includes('HOLIDAY')));
        });

        if (match && match.durationHHMM) {
            const parts = match.durationHHMM.split(':');
            const hh = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            if (!isNaN(hh) && !isNaN(mm)) {
                return hh + (mm / 60);
            }
        }
        return 8.0; // Default to 8 hours if not found
    }

export function getShiftHours(dayData) {
        if (!dayData || !dayData.active) return 0;
        const typeUpper = (dayData.type || 'Regular').toUpperCase();
        if (typeUpper !== 'REGULAR' && typeUpper !== 'OFF' && typeUpper !== 'OPEN BRANCH' && typeUpper !== 'CLOSE BRANCH') {
            return getLeaveTypeDefaultHours(dayData.type);
        }
        return calculateHours(dayData.shiftIn, dayData.shiftOut, dayData.breakMins);
    }

export function getEmployeeBgColor(cardColor) {
        switch (cardColor) {
            case 'gray': return 'bg-[#f3f4f6]'; // Gray
            case 'blue': return 'bg-[#cfe2f3]'; // Light Blue
            case 'yellow': return 'bg-[#ffd966]'; // Gold / Yellow
            case 'green': return 'bg-[#d9ead3]'; // Mint Green
            default: return 'bg-white'; // White (Default)
        }
    }

export function getEmployeeTextClass(cardColor) {
        switch (cardColor) {
            case 'gray': return 'text-gray-600';
            case 'blue': return 'text-[#0b5394]';
            case 'yellow': return 'text-[#b45f06]';
            case 'green': return 'text-[#274e13]';
            default: return 'text-gray-400';
        }
    }

export function getMondayDateString(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return formatDateToYYYYMMDD(monday);
    }

export function formatDateToYYYYMMDD(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

export function getWeekDisplayRange(mondayStr) {
        const monday = new Date(mondayStr + 'T12:00:00');
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${monday.toLocaleDateString('en-US', options)} – ${sunday.toLocaleDateString('en-US', options)}`;
    }

export function format12Hour(timeStr) {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minStr} ${ampm}`;
}

export function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

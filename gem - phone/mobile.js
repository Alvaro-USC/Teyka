/* ═══════════════════════════════════════════════════════════════
   GEM Mobile — App Logic
   Trade Republic chart + Swipe + iOS Notifications
   Rest periods: vertical red bands instead of dots
   ═══════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────
let DATA = null;
let state = { userIdx: 0, dayIdx: 0, screenIdx: 0, range: 'day', notifShown: false };
let mainChart = null, histChart = null;

// ─── IS Levels ──────────────────────────────────────────────
const LEVELS = [
    { max: 25, name: 'Estado óptimo', cls: 'level-optimal', color: '#C7C7CC' },
    { max: 50, name: 'Monitoreo activo', cls: 'level-attention', color: '#EF9A9A' },
    { max: 70, name: 'Considera un descanso', cls: 'level-alert', color: '#EF5350' },
    { max: 100, name: 'Necesitas desconectar', cls: 'level-critical', color: '#C62828' },
];

function getLevel(is) {
    return LEVELS.find(l => is <= l.max) || LEVELS[3];
}

function isColor(val) {
    if (val <= 25) return '#C7C7CC';
    if (val <= 50) return '#EF9A9A';
    if (val <= 70) return '#EF5350';
    return '#C62828';
}

// ─── SVG Icons ──────────────────────────────────────────────
const SVG = {
    alertCircle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    checkCircle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    chart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>`,
    alertTriangle: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    bell: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    calendar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
};

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    updateClock();
    setInterval(updateClock, 30000);

    try {
        const res = await fetch('gem_data.json');
        DATA = await res.json();
    } catch (e) {
        console.error('Failed to load data:', e);
        return;
    }

    initUserModal();
    initRangeSelector();
    initBottomNav();
    initNotification();
    selectUser(0);
});

function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('status-time').textContent = `${h}:${m}`;
}

function updateGreeting(userName) {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 20) greeting = 'Buenas tardes';
    else greeting = 'Buenas noches';

    // Extract a name: "Usuario 1" → "Álvaro" (use fixed name for demo)
    const names = ['Álvaro', 'María', 'Carlos', 'Lucía', 'Diego', 'Ana', 'Pablo', 'Sofía'];
    const idx = state.userIdx % names.length;
    const name = names[idx];
    
    document.getElementById('greeting-name').textContent = `Hola, ${name}`;
    document.getElementById('greeting-sub').textContent = `${greeting} · Tu resumen de hoy`;
}

// ─── User Selection ─────────────────────────────────────────
function initUserModal() {
    const trigger = document.getElementById('user-trigger');
    const modal = document.getElementById('user-modal');

    trigger.addEventListener('click', () => {
        buildUserList();
        modal.classList.add('modal-visible');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('modal-visible');
    });
}

function buildUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = '';
    DATA.users.forEach((u, i) => {
        const level = getLevel(u.summary.avg_is);
        const avatarColors = ['#E53935','#F4511E','#7B1FA2','#1976D2','#00897B','#43A047','#FF8F00','#5E35B1'];
        const names = ['Álvaro', 'María', 'Carlos', 'Lucía', 'Diego', 'Ana', 'Pablo', 'Sofía'];
        const item = document.createElement('div');
        item.className = `user-item ${i === state.userIdx ? 'user-selected' : ''}`;
        item.innerHTML = `
            <div class="user-avatar" style="background:${avatarColors[i % 8]}">${names[i][0]}</div>
            <div class="user-info">
                <div class="user-name">${names[i]}</div>
                <div class="user-detail">${u.summary.avg_screen}min pantalla · ${u.summary.avg_steps} pasos</div>
            </div>
            <div class="user-is" style="background:${level.color}20;color:${level.color}">${u.summary.avg_is}%</div>
        `;
        item.addEventListener('click', () => {
            selectUser(i);
            document.getElementById('user-modal').classList.remove('modal-visible');
        });
        list.appendChild(item);
    });
}

function selectUser(idx) {
    state.userIdx = idx;
    const user = DATA.users[idx];
    state.dayIdx = user.days.length - 1;
    state.notifShown = false;
    updateGreeting(user.id);
    renderDay();
    renderHistory();
}

// ─── Render Day View ────────────────────────────────────────
function renderDay() {
    const user = DATA.users[state.userIdx];
    const day = user.days[state.dayIdx];

    // IS gauge
    const avgIS = day.daily_is;
    const level = getLevel(avgIS);
    document.getElementById('is-number').textContent = Math.round(avgIS);
    document.getElementById('is-level').textContent = level.name;

    // Animate SVG arc
    const arc = document.getElementById('is-arc');
    const circumference = 327;
    const offset = circumference - (circumference * Math.min(avgIS, 100) / 100);
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = level.color;

    // Date display
    document.getElementById('is-date').textContent = day.date;

    const hero = document.querySelector('.is-hero');
    hero.className = 'is-hero ' + level.cls;

    // Health cards
    setText('h-rmssd', Math.round(day.rmssd_avg));
    setText('h-steps', day.steps_total.toLocaleString('es-ES'));
    setText('h-screen', Math.round(day.screen_total));
    setText('h-active', Math.round(day.active_min));

    setBar('hf-rmssd', day.rmssd_avg / 35, day.rmssd_avg > 25 ? '#34C759' : day.rmssd_avg > 15 ? '#FF9F0A' : '#E53935');
    setBar('hf-steps', Math.min(day.steps_total / 12000, 1), day.steps_total > 8000 ? '#34C759' : day.steps_total > 4000 ? '#FF9F0A' : '#E53935');
    setBar('hf-screen', Math.min(day.screen_total / 600, 1), day.screen_total > 400 ? '#E53935' : day.screen_total > 200 ? '#FF9F0A' : '#34C759');
    setBar('hf-active', Math.min(day.active_min / 300, 1), day.active_min > 120 ? '#34C759' : day.active_min > 60 ? '#FF9F0A' : '#E53935');

    // Decomposition
    const hourNow = new Date().getHours();
    const hourData = day.hourly[Math.min(hourNow, 23)] || day.hourly[12];
    setText('d-stress', Math.round(hourData.stress));
    setText('d-behavior', Math.round(hourData.behavior));
    setBar('df-stress', hourData.stress / 100, '#E53935');
    setBar('df-behavior', hourData.behavior / 100, '#FF9F0A');

    // Rest points
    renderRestPoints(day);

    // Chart
    if (state.range === 'day') {
        renderDayChart(day);
    } else if (state.range === 'week') {
        renderWeekChart(user);
    } else {
        renderMonthChart(user);
    }

    // Maybe trigger notification
    const maxIS = Math.max(...day.hourly.map(h => h.is));
    if (maxIS > 65 && !state.notifShown) {
        setTimeout(() => showNotification(day), 2000);
    }
}

function renderRestPoints(day) {
    const container = document.getElementById('rest-points');
    container.innerHTML = '';
    if (!day.rest_points || day.rest_points.length === 0) {
        container.innerHTML = `<div class="rest-point rest-low">${SVG.checkCircle} Sin alertas hoy</div>`;
        return;
    }
    day.rest_points.forEach(h => {
        const isVal = day.hourly[h]?.is || 0;
        const cls = isVal > 70 ? 'rest-high' : isVal > 50 ? 'rest-mid' : 'rest-low';
        const pip = document.createElement('div');
        pip.className = `rest-point ${cls}`;
        pip.innerHTML = `${SVG.alertCircle} ${h}:00`;
        container.appendChild(pip);
    });
}

// ─── Trade Republic Chart — RED BANDS for rest zones ────────
function renderDayChart(day) {
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (mainChart) mainChart.destroy();

    const labels = day.hourly.map(h => `${h.hour}:00`);
    const values = day.hourly.map(h => h.is);
    const restSet = new Set(day.rest_points || []);

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    const maxVal = Math.max(...values);
    if (maxVal > 70) {
        gradient.addColorStop(0, 'rgba(229, 57, 53, 0.35)');
        gradient.addColorStop(0.5, 'rgba(229, 57, 53, 0.08)');
        gradient.addColorStop(1, 'rgba(229, 57, 53, 0)');
    } else if (maxVal > 40) {
        gradient.addColorStop(0, 'rgba(239, 154, 154, 0.30)');
        gradient.addColorStop(0.5, 'rgba(239, 154, 154, 0.08)');
        gradient.addColorStop(1, 'rgba(239, 154, 154, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(199, 199, 204, 0.15)');
        gradient.addColorStop(1, 'rgba(199, 199, 204, 0)');
    }

    const restBandsPlugin = {
        id: 'restBands',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea, scales: { x, y } } = chart;
            if (!chartArea || !x || !y) return;
            
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || !meta.data.length || restSet.size === 0) return;
            
            ctx.save();
            const points = meta.data;

            const periods = [];
            const sorted = Array.from(restSet).sort((a,b)=>a-b);
            sorted.forEach(hour => {
                const i = day.hourly.findIndex(h => h.hour === hour);
                if (i === -1) return;
                periods.push({ start: Math.max(0, i - 1), end: Math.min(points.length - 1, i + 1) });
            });

            const merged = [];
            periods.forEach(p => {
                if (!merged.length) merged.push({...p});
                else {
                    const last = merged[merged.length - 1];
                    if (p.start <= last.end) last.end = Math.max(last.end, p.end);
                    else merged.push({...p});
                }
            });

            merged.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(points[p.start].x, chartArea.bottom);
                ctx.lineTo(points[p.start].x, points[p.start].y);

                for (let i = p.start + 1; i <= p.end; i++) {
                    const pt = points[i];
                    if (pt && pt.cp1x !== undefined && pt.cp1y !== undefined && pt.cp2x !== undefined && pt.cp2y !== undefined) {
                        ctx.bezierCurveTo(pt.cp1x, pt.cp1y, pt.cp2x, pt.cp2y, pt.x, pt.y);
                    } else if (pt) {
                        ctx.lineTo(pt.x, pt.y);
                    }
                }
                
                ctx.lineTo(points[p.end].x, chartArea.bottom);
                ctx.closePath();

                ctx.fillStyle = 'rgba(229, 57, 53, 0.25)'; // Relleno semitransparente sin contorno perimetral
                ctx.fill();

                // Sello de colisión superior: Difumina el anti-aliasing contra la curva maestra 
                // para que abrace perfectamente la línea roja de Chart.js
                ctx.beginPath();
                ctx.moveTo(points[p.start].x, points[p.start].y);
                for (let i = p.start + 1; i <= p.end; i++) {
                    const pt = points[i];
                    if (pt && pt.cp1x !== undefined && pt.cp1y !== undefined) {
                        ctx.bezierCurveTo(pt.cp1x, pt.cp1y, pt.cp2x, pt.cp2y, pt.x, pt.y);
                    } else if (pt) {
                        ctx.lineTo(pt.x, pt.y);
                    }
                }
                ctx.strokeStyle = 'rgba(229, 57, 53, 0.25)'; // Mismo color rojo translúcido
                ctx.lineWidth = 2.5; // Grosor exacto de sellado
                ctx.lineJoin = 'round';
                ctx.stroke();
            });

            const yPos = y.getPixelForValue(70);
            if (yPos >= chartArea.top && yPos <= chartArea.bottom) {
                ctx.strokeStyle = 'rgba(229, 57, 53, 0.35)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(chartArea.left, yPos);
                ctx.lineTo(chartArea.right, yPos);
                ctx.stroke();
            }

            ctx.restore();
        }
    };

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: isColor(maxVal),
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: isColor(maxVal),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10, family: 'Inter' },
                        maxTicksLimit: 8,
                        callback: (v, i) => i % 3 === 0 ? labels[i] : '',
                        color: '#AEAEB2',
                    },
                    border: { display: false },
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: { display: false },
                    border: { display: false },
                }
            },
            onHover: (e, elements) => {
                const tooltip = document.getElementById('chart-tooltip');
                if (elements.length) {
                    const idx = elements[0].index;
                    const h = day.hourly[idx];
                    tooltip.querySelector('#tooltip-hour').textContent = `${h.hour}:00`;
                    tooltip.querySelector('#tooltip-is').textContent = `${Math.round(h.is)}%`;
                    tooltip.classList.add('visible');
                    const x = elements[0].element.x;
                    const y = elements[0].element.y;
                    tooltip.style.left = `${x - 30}px`;
                    tooltip.style.top = `${y - 55}px`;
                } else {
                    tooltip.classList.remove('visible');
                }
            }
        },
        plugins: [restBandsPlugin]
    });
}

function renderWeekChart(user) {
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (mainChart) mainChart.destroy();

    const startIdx = Math.max(0, state.dayIdx - 6);
    const weekDays = user.days.slice(startIdx, state.dayIdx + 1);
    const labels = weekDays.map(d => {
        const dt = new Date(d.date);
        return ['Dom','Lun','Mar','Mie','Jue','Vie','Sáb'][dt.getDay()];
    });
    const values = weekDays.map(d => d.daily_is);

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(229, 57, 53, 0.20)');
    gradient.addColorStop(1, 'rgba(229, 57, 53, 0)');

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#EF5350',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: values.map(v => isColor(v)),
                pointBorderColor: '#FFF',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter' } } },
                y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { display: false }, border: { display: false } }
            }
        }
    });
}

function renderMonthChart(user) {
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (mainChart) mainChart.destroy();

    const labels = user.days.map(d => {
        const dt = new Date(d.date);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    const values = user.days.map(d => d.daily_is);

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(229, 57, 53, 0.15)');
    gradient.addColorStop(1, 'rgba(229, 57, 53, 0)');

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#EF9A9A',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10, family: 'Inter' } }, border: { display: false } },
                y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { display: false }, border: { display: false } }
            }
        }
    });
}

// ─── Range Selector ─────────────────────────────────────────
function initRangeSelector() {
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('range-active'));
            btn.classList.add('range-active');
            state.range = btn.dataset.range;
            renderDay();
        });
    });
}

// ─── Bottom Nav ─────────────────────────────────────────────
function initBottomNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.screen);
            navigateToScreen(idx);
        });
    });

    document.querySelector('.chart-container').addEventListener('dblclick', () => {
        showDaySelector();
    });
}

function navigateToScreen(idx) {
    state.screenIdx = idx;
    document.getElementById('screens').style.transform = `translateX(-${idx * 100}%)`;
    document.querySelectorAll('.nav-btn').forEach((b, i) => {
        b.classList.toggle('nav-active', i === idx);
    });
}

function showDaySelector() {
    const modal = document.getElementById('day-modal');
    const slider = document.getElementById('day-slider');
    const label = document.getElementById('day-slider-label');
    const user = DATA.users[state.userIdx];

    slider.max = user.days.length - 1;
    slider.value = state.dayIdx;
    label.textContent = user.days[state.dayIdx].date;

    slider.oninput = () => {
        state.dayIdx = parseInt(slider.value);
        label.textContent = user.days[state.dayIdx].date;
    };

    document.getElementById('day-done').onclick = () => {
        modal.classList.remove('modal-visible');
        renderDay();
        renderHistory();
    };

    modal.classList.add('modal-visible');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.classList.remove('modal-visible'); renderDay(); }
    });
}

// ─── History Calendar ───────────────────────────────────────
function renderHistory() {
    const user = DATA.users[state.userIdx];
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    ['L','M','X','J','V','S','D'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    if (user.days.length > 0) {
        const dt = new Date(user.days[state.dayIdx].date);
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        document.getElementById('history-month').textContent = `${months[dt.getMonth()]} ${dt.getFullYear()}`;
    }

    const firstDate = new Date(user.days[0].date);
    const startDow = (firstDate.getDay() + 6) % 7;

    for (let i = 0; i < startDow; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day';
        grid.appendChild(empty);
    }

    user.days.forEach((day, i) => {
        const dt = new Date(day.date);
        const cell = document.createElement('div');
        cell.className = `cal-day ${i === state.dayIdx ? 'cal-selected' : ''}`;

        const is = day.daily_is;
        let bg;
        if (is <= 25) bg = '#F5F5F5';
        else if (is <= 40) bg = '#FFEBEE';
        else if (is <= 60) bg = '#FFCDD2';
        else bg = '#EF9A9A';
        cell.style.background = bg;
        cell.textContent = dt.getDate();

        cell.addEventListener('click', () => {
            state.dayIdx = i;
            renderDay();
            renderHistory();
        });

        grid.appendChild(cell);
    });

    renderHistoryChart(user);
    renderHistoryStats(user);
}

function renderHistoryChart(user) {
    const ctx = document.getElementById('history-chart');
    if (!ctx) return;
    if (histChart) histChart.destroy();

    const values = user.days.map(d => d.daily_is);
    const labels = user.days.map(d => {
        const dt = new Date(d.date);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    const pointColors = user.days.map((d, i) =>
        i === state.dayIdx ? '#E53935' : 'transparent'
    );

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(229,57,53,0.12)');
    gradient.addColorStop(1, 'rgba(229,57,53,0)');

    histChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#EF9A9A',
                borderWidth: 1.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                pointRadius: user.days.map((_, i) => i === state.dayIdx ? 6 : 0),
                pointBackgroundColor: pointColors,
                pointBorderColor: '#FFF',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { min: 0, max: 100, display: false }
            }
        }
    });
}

function renderHistoryStats(user) {
    const container = document.getElementById('history-stats');
    const values = user.days.map(d => d.daily_is);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const maxIS = Math.max(...values);
    const alerts = user.days.reduce((sum, d) => sum + d.alerts, 0);

    let trendCls = 'trend-stable', trendLabel = '→ Estable';
    if (values.length >= 14) {
        const first7 = values.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const last7 = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
        if (last7 > first7 + 3) { trendCls = 'trend-up'; trendLabel = '↑ Subiendo'; }
        else if (last7 < first7 - 3) { trendCls = 'trend-down'; trendLabel = '↓ Bajando'; }
    }

    container.innerHTML = `
        <div class="history-stat-card">
            <div class="hstat-icon">${SVG.chart}</div>
            <div><div class="hstat-label">IS Medio</div><div class="hstat-value">${avg.toFixed(1)}%</div></div>
            <div class="hstat-trend ${trendCls}">${trendLabel}</div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">${SVG.alertTriangle}</div>
            <div><div class="hstat-label">IS Máximo</div><div class="hstat-value">${maxIS.toFixed(1)}%</div></div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">${SVG.bell}</div>
            <div><div class="hstat-label">Alertas totales</div><div class="hstat-value">${alerts}</div></div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">${SVG.calendar}</div>
            <div><div class="hstat-label">Días registrados</div><div class="hstat-value">${user.days.length}</div></div>
        </div>
    `;
}

// ─── Navigation ──────────────────────────────────────────────
function initBottomNav() {
    const btns = document.querySelectorAll('.nav-btn');
    const container = document.querySelector('.screens-container');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('nav-active'));
            btn.classList.add('nav-active');

            const screen = parseInt(btn.dataset.screen);
            state.screenIdx = screen;
            container.style.transform = `translateX(-${screen * 100}%)`;

            if (screen === 1) renderHistory();
            else renderDay();
        });
    });
}

// ─── Notification ───────────────────────────────────────────
function initNotification() {
    document.getElementById('notif-now').addEventListener('click', dismissNotif);
    document.getElementById('notif-later').addEventListener('click', dismissNotif);
    document.getElementById('notif-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'notif-overlay') dismissNotif();
    });
}

function showNotification(day) {
    if (state.notifShown) return;
    state.notifShown = true;

    const maxH = day.hourly.reduce((a, b) => a.is > b.is ? a : b);
    const screenTotal = Math.round(day.screen_total);

    document.getElementById('notif-title').textContent = 'Tu cuerpo necesita un descanso';
    document.getElementById('notif-body').textContent =
        `Llevas ${screenTotal} min de pantalla hoy. Tu IS alcanzó ${Math.round(maxH.is)}% a las ${maxH.hour}:00. Intenta caminar 10 minutos.`;

    const card = document.getElementById('notif-card');
    card.classList.add('notif-visible');

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function dismissNotif() {
    document.getElementById('notif-card').classList.remove('notif-visible');
}

// ─── Helpers ────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setBar(id, pct, color) {
    const el = document.getElementById(id);
    if (el) {
        el.style.width = `${Math.min(pct, 1) * 100}%`;
        el.style.background = color;
    }
}

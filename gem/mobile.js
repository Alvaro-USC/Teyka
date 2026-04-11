/* ═══════════════════════════════════════════════════════════════
   GEM Mobile — App Logic
   Trade Republic chart + Swipe + iOS Notifications
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

    const hour = now.getHours();
    const el = document.getElementById('today-greeting');
    if (el) {
        if (hour < 12) el.textContent = 'Buenos días';
        else if (hour < 20) el.textContent = 'Buenas tardes';
        else el.textContent = 'Buenas noches';
    }
}

// ─── User Selection ─────────────────────────────────────────
function initUserModal() {
    const trigger = document.getElementById('user-trigger');
    const modal = document.getElementById('user-modal');
    const list = document.getElementById('user-list');

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
        const item = document.createElement('div');
        item.className = `user-item ${i === state.userIdx ? 'user-selected' : ''}`;
        item.innerHTML = `
            <div class="user-avatar" style="background:${avatarColors[i % 8]}">${i + 1}</div>
            <div class="user-info">
                <div class="user-name">${u.id}</div>
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
    state.dayIdx = user.days.length - 1; // Start at last day (most recent)
    state.notifShown = false;
    document.getElementById('today-user').textContent = user.id;
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

    // Animate SVG arc: circumference = 2π×52 ≈ 327
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
        container.innerHTML = '<div class="rest-point rest-low">Sin alertas hoy ✓</div>';
        return;
    }
    day.rest_points.forEach(h => {
        const isVal = day.hourly[h]?.is || 0;
        const cls = isVal > 70 ? 'rest-high' : isVal > 50 ? 'rest-mid' : 'rest-low';
        const pip = document.createElement('div');
        pip.className = `rest-point ${cls}`;
        pip.innerHTML = `🔴 ${h}:00`;
        container.appendChild(pip);
    });
}

// ─── Trade Republic Chart ───────────────────────────────────
function renderDayChart(day) {
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (mainChart) mainChart.destroy();

    const labels = day.hourly.map(h => `${h.hour}:00`);
    const values = day.hourly.map(h => h.is);
    const restSet = new Set(day.rest_points || []);

    // Create gradient
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

    // Point colors: red for rest points, transparent for others
    const pointBg = day.hourly.map(h =>
        restSet.has(h.hour) ? '#E53935' : 'transparent'
    );
    const pointRadius = day.hourly.map(h =>
        restSet.has(h.hour) ? 5 : 0
    );
    const pointBorder = day.hourly.map(h =>
        restSet.has(h.hour) ? '#FFF' : 'transparent'
    );

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
                pointBackgroundColor: pointBg,
                pointBorderColor: pointBorder,
                pointBorderWidth: 2,
                pointRadius: pointRadius,
                pointHoverRadius: 6,
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
                        font: { size: 10 },
                        maxTicksLimit: 8,
                        callback: (v, i) => i % 3 === 0 ? labels[i] : '',
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
                    const rect = e.chart.canvas.getBoundingClientRect();
                    const x = elements[0].element.x;
                    const y = elements[0].element.y;
                    tooltip.style.left = `${x - 30}px`;
                    tooltip.style.top = `${y - 55}px`;
                } else {
                    tooltip.classList.remove('visible');
                }
            }
        }
    });

    // Threshold line annotation
    const plugin = {
        id: 'thresholdLine',
        afterDraw(chart) {
            const { ctx, scales: { y } } = chart;
            const yPos = y.getPixelForValue(70);
            ctx.save();
            ctx.strokeStyle = 'rgba(229, 57, 53, 0.3)';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(chart.chartArea.left, yPos);
            ctx.lineTo(chart.chartArea.right, yPos);
            ctx.stroke();
            ctx.restore();
        }
    };
    mainChart.config.plugins = [plugin];
    mainChart.update();
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
                x: { grid: { display: false }, border: { display: false } },
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
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } }, border: { display: false } },
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

    // Day selector: tapping the chart switches to day selector
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

    // Headers
    ['L','M','X','J','V','S','D'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    // Month label
    if (user.days.length > 0) {
        const dt = new Date(user.days[state.dayIdx].date);
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        document.getElementById('history-month').textContent = `${months[dt.getMonth()]} ${dt.getFullYear()}`;
    }

    // Calendar days
    const firstDate = new Date(user.days[0].date);
    const startDow = (firstDate.getDay() + 6) % 7; // Monday = 0

    // Empty cells
    for (let i = 0; i < startDow; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day';
        grid.appendChild(empty);
    }

    user.days.forEach((day, i) => {
        const dt = new Date(day.date);
        const cell = document.createElement('div');
        cell.className = `cal-day ${i === state.dayIdx ? 'cal-selected' : ''}`;

        // Color based on IS
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

    // History chart
    renderHistoryChart(user);

    // Stats
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

    // Trend: compare last 7 days vs first 7
    let trend = 'stable', trendCls = 'trend-stable', trendLabel = '→ Estable';
    if (values.length >= 14) {
        const first7 = values.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const last7 = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
        if (last7 > first7 + 3) { trend = 'up'; trendCls = 'trend-up'; trendLabel = '↑ Subiendo'; }
        else if (last7 < first7 - 3) { trend = 'down'; trendCls = 'trend-down'; trendLabel = '↓ Bajando'; }
    }

    container.innerHTML = `
        <div class="history-stat-card">
            <div class="hstat-icon">📊</div>
            <div><div class="hstat-label">IS Medio</div><div class="hstat-value">${avg.toFixed(1)}%</div></div>
            <div class="hstat-trend ${trendCls}">${trendLabel}</div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">🔴</div>
            <div><div class="hstat-label">IS Máximo</div><div class="hstat-value">${maxIS.toFixed(1)}%</div></div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">🔔</div>
            <div><div class="hstat-label">Alertas totales</div><div class="hstat-value">${alerts}</div></div>
        </div>
        <div class="history-stat-card">
            <div class="hstat-icon">📅</div>
            <div><div class="hstat-label">Días registrados</div><div class="hstat-value">${user.days.length}</div></div>
        </div>
    `;
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

    // Vibrate if supported
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

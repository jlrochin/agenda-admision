let citas = [];
let stats = {};

const filtroFecha = document.getElementById('filtroFecha');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnLimpiar = document.getElementById('btnLimpiar');
const citasList = document.getElementById('citasList');
const loadingCitas = document.getElementById('loadingCitas');
const noCitas = document.getElementById('noCitas');

const citasHoy = document.getElementById('citasHoy');
const citasPendientes = document.getElementById('citasPendientes');
const totalCitas = document.getElementById('totalCitas');
const totalMedicos = document.getElementById('totalMedicos');

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function setupEventListeners() {
    btnFiltrar.addEventListener('click', loadCitas);
    btnLimpiar.addEventListener('click', limpiarFiltros);

    const today = new Date().toISOString().split('T')[0];
    filtroFecha.value = today;
}

async function initializeApp() {
    try {
        await Promise.all([
            loadStats(),
            loadCitas()
        ]);
    } catch (error) {
        console.error('Error al inicializar:', error);
        showError('Error al cargar los datos iniciales');
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }

        stats = await response.json();
        updateStatsDisplay();
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateStatsDisplay() {
    citasHoy.textContent = stats.total_citas_hoy || 0;
    citasPendientes.textContent = stats.total_citas_pendientes || 0;
    totalCitas.textContent = stats.total_citas_registradas || 0;
    totalMedicos.textContent = stats.total_medicos || 0;
}

async function loadCitas() {
    try {
        showLoading(true);

        const params = new URLSearchParams();

        if (filtroFecha.value) {
            params.append('fecha', filtroFecha.value);
        }

        const response = await fetch(`/api/citas-simplificadas?${params}`);
        if (!response.ok) {
            throw new Error('Error al cargar citas');
        }

        citas = await response.json();
        displayCitas();

    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar las citas');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    loadingCitas.style.display = show ? 'block' : 'none';
    citasList.style.display = show ? 'none' : 'block';
    noCitas.style.display = 'none';
}

function displayCitas() {
    if (citas.length === 0) {
        citasList.innerHTML = '';
        noCitas.style.display = 'block';
        return;
    }

    noCitas.style.display = 'none';

    const citasPorFecha = agruparCitasPorFecha(citas);

    let html = '';

    Object.keys(citasPorFecha).sort().reverse().forEach(fecha => {
        const citasDeFecha = citasPorFecha[fecha];
        const fechaFormateada = formatearFecha(fecha);

        html += `
            <div class="fecha-group">
                <h3 class="fecha-header">📅 ${fechaFormateada} (${citasDeFecha.length} citas)</h3>
                <div class="citas-del-dia">
        `;

        citasDeFecha.sort((a, b) => b.hora.localeCompare(a.hora));

        citasDeFecha.forEach(cita => {
            html += createCitaCard(cita);
        });

        html += `
                </div>
            </div>
        `;
    });

    citasList.innerHTML = html;
}

function agruparCitasPorFecha(citas) {
    return citas.reduce((grupos, cita) => {
        const fecha = cita.fecha;
        if (!grupos[fecha]) {
            grupos[fecha] = [];
        }
        grupos[fecha].push(cita);
        return grupos;
    }, {});
}

function createCitaCard(cita) {
    const horaFormateada = formatearHora(cita.hora);
    const fechaRegistro = formatearDateTime(cita.created_at);

    return `
        <div class="cita-card cita-simplificada">
            <div class="cita-header">
                <div class="cita-fecha-hora">
                    🕒 ${horaFormateada}
                </div>
                <div class="cita-estado estado-${cita.estado}">
                    ${formatearEstado(cita.estado)}
                </div>
            </div>
            
            <div class="cita-info">
                <div class="info-group">
                    <h4>📄 Número de Expediente</h4>
                    <p class="expediente">${cita.numero_expediente}</p>
                </div>
                
                <div class="info-group">
                    <h4>🆔 CURP</h4>
                    <p class="curp">${cita.curp}</p>
                </div>
                
                <div class="info-group">
                    <h4>📋 Estado</h4>
                    <p class="estado">${formatearEstado(cita.estado)}</p>
                </div>
                
                <div class="info-group">
                    <h4>📅 Registrada</h4>
                    <p>${fechaRegistro}</p>
                </div>
            </div>
            
            <div class="cita-orden">
                <h4>📷 Orden Médica</h4>
                <div class="orden-container">
                    <img src="/uploads/${cita.orden_medica}" alt="Orden Médica" class="orden-imagen" onclick="ampliarImagen('/uploads/${cita.orden_medica}')">
                    <button class="btn-ver-orden" onclick="ampliarImagen('/uploads/${cita.orden_medica}')">
                        🔍 Ver Orden Completa
                    </button>
                </div>
            </div>
            
            <div class="cita-acciones">
                <button class="btn-accion btn-confirmar" onclick="cambiarEstadoCita(${cita.id}, 'confirmada')">
                    ✅ Confirmar
                </button>
                <button class="btn-accion btn-proceso" onclick="cambiarEstadoCita(${cita.id}, 'en-proceso')">
                    ⏳ En Proceso
                </button>
                <button class="btn-accion btn-completar" onclick="cambiarEstadoCita(${cita.id}, 'completada')">
                    🎉 Completar
                </button>
                <button class="btn-accion btn-cancelar" onclick="cambiarEstadoCita(${cita.id}, 'cancelada')">
                    ❌ Cancelar
                </button>
            </div>
        </div>
    `;
}

function ampliarImagen(src) {
    const modal = document.createElement('div');
    modal.className = 'imagen-modal';
    modal.innerHTML = `
        <div class="imagen-modal-content">
            <span class="imagen-modal-close">&times;</span>
            <img src="${src}" alt="Orden Médica" class="imagen-ampliada">
            <p>Orden Médica - Click fuera de la imagen para cerrar</p>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('imagen-modal-close')) {
            document.body.removeChild(modal);
        }
    });
}

async function cambiarEstadoCita(citaId, nuevoEstado) {
    try {
        const response = await fetch(`/api/citas-simplificadas/${citaId}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (response.ok) {
            await Promise.all([loadStats(), loadCitas()]);
        } else {
            console.error('Error al cambiar estado de cita');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function limpiarFiltros() {
    filtroFecha.value = '';
    loadCitas();
}

function formatearFecha(fechaString) {
    const fecha = new Date(fechaString + 'T00:00:00');
    return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatearHora(horaString) {
    const [horas, minutos] = horaString.split(':');
    const hora = parseInt(horas);
    const ampm = hora >= 12 ? 'PM' : 'AM';
    const horaDisplay = hora % 12 || 12;
    return `${horaDisplay}:${minutos} ${ampm}`;
}

function formatearDateTime(datetimeString) {
    const fecha = new Date(datetimeString);
    return fecha.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearEstado(estado) {
    const estados = {
        'pendiente': '⏳ Pendiente',
        'confirmada': '✅ Confirmada',
        'en-proceso': '🔄 En Proceso',
        'completada': '🎉 Completada',
        'cancelada': '❌ Cancelada'
    };

    return estados[estado] || estado;
}

function showError(message) {
    citasList.innerHTML = `
        <div class="error-message">
            <h3>❌ Error</h3>
            <p>${message}</p>
        </div>
    `;
}

let currentDate = new Date();
let selectedDate = null;
let citasData = [];

const calendarDays = document.getElementById("calendarDays");
const currentMonthElement = document.getElementById("currentMonth");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const fechaSeleccionadaInput = document.getElementById("fechaSeleccionada");
const btnHoy = document.getElementById("btnHoy");

const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

initCalendar();
loadStats();
loadCitas();

prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

btnFiltrar.addEventListener("click", filtrarCitas);
btnHoy.addEventListener("click", seleccionarHoy);
btnLimpiar.addEventListener("click", limpiarFiltros);

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthElement.textContent = `${meses[month]} ${year}`;

    calendarDays.innerHTML = "";

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfPrevMonth = new Date(year, month, 0);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayElement = createDayElement(date, month);
        calendarDays.appendChild(dayElement);
    }
}

function createDayElement(date, currentMonth) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = date.getDate();

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isPastDate = date < today.setHours(0, 0, 0, 0);

    if (!isCurrentMonth) {
        dayElement.classList.add("other-month");
    }

    if (isToday) {
        dayElement.classList.add("today");
    }

    if (isPastDate && !isToday) {
        dayElement.classList.add("disabled");
    }

    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        dayElement.classList.add("selected");
    }

    const dateString = formatDate(date);
    const hasCitas = citasData.some(cita => cita.fecha === dateString);
    if (hasCitas) {
        dayElement.classList.add("has-citas");
    }

    if (isCurrentMonth && !isPastDate) {
        dayElement.addEventListener("click", () => selectDate(date));
    }

    return dayElement;
}

function selectDate(date) {
    selectedDate = new Date(date);
    fechaSeleccionadaInput.value = formatDateDisplay(date);
    renderCalendar();
    filtrarCitas();
}

function seleccionarHoy() {
    const today = new Date();
    currentDate = new Date(today);
    selectDate(today);
}

function limpiarFiltros() {
    selectedDate = null;
    fechaSeleccionadaInput.value = "";
    renderCalendar();
    loadCitas();
}

function filtrarCitas() {
    if (!selectedDate) {
        loadCitas();
        return;
    }

    const fechaFiltro = formatDate(selectedDate);
    const citasFiltradas = citasData.filter(cita => cita.fecha === fechaFiltro);
    displayCitas(citasFiltradas);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

async function loadStats() {
    try {
        const response = await fetch("/api/citas/stats");
        const stats = await response.json();

        document.getElementById("citasHoy").textContent = stats.citasHoy || 0;
        document.getElementById("citasPendientes").textContent = stats.citasPendientes || 0;
        document.getElementById("totalCitas").textContent = stats.totalCitas || 0;
        document.getElementById("totalMedicos").textContent = stats.totalMedicos || 5;
    } catch (error) {
        console.error("Error cargando estadísticas:", error);
    }
}

async function loadCitas() {
    const loadingElement = document.getElementById("loadingCitas");
    const citasListElement = document.getElementById("citasList");
    const noCitasElement = document.getElementById("noCitas");

    try {
        loadingElement.style.display = "block";
        citasListElement.style.display = "none";
        noCitasElement.style.display = "none";

        const response = await fetch("/api/citas-simple");
        citasData = await response.json();

        displayCitas(citasData);
        renderCalendar();

    } catch (error) {
        console.error("Error cargando citas:", error);
        citasListElement.innerHTML = "<p class='error'>❌ Error al cargar las citas</p>";
    } finally {
        loadingElement.style.display = "none";
    }
}

function displayCitas(citas) {
    const citasListElement = document.getElementById("citasList");
    const noCitasElement = document.getElementById("noCitas");

    if (citas.length === 0) {
        citasListElement.style.display = "none";
        noCitasElement.style.display = "block";
        return;
    }

    citasListElement.style.display = "block";
    noCitasElement.style.display = "none";

    citasListElement.innerHTML = citas.map(cita => `
      <div class="cita-card ${cita.estado}">
        <div class="cita-header">
          <h3>📋 Expediente: ${cita.numero_expediente}</h3>
          <div class="cita-status status-${cita.estado}">
            ${getStatusIcon(cita.estado)} ${cita.estado.toUpperCase()}
          </div>
        </div>
        
        <div class="cita-body">
          <div class="cita-info">
            <p><strong>🆔 CURP:</strong> ${cita.curp}</p>
            <p><strong>📅 Fecha:</strong> ${formatDateDisplay(new Date(cita.fecha))}</p>
            <p><strong>⏰ Hora:</strong> ${cita.hora}</p>
          </div>
          
          ${cita.orden_medica ? `
            <div class="orden-medica-container">
              <h4>📋 Orden Médica:</h4>
              <img src="${cita.orden_medica}" alt="Orden Médica" class="orden-imagen" onclick="ampliarImagen('${cita.orden_medica}')">
            </div>
          ` : '<p class="sin-orden">❌ Sin orden médica</p>'}
        </div>
        
        <div class="cita-actions">
          <button onclick="cambiarEstado(${cita.id}, 'confirmada')" class="btn-confirmar">✅ Confirmar</button>
          <button onclick="cambiarEstado(${cita.id}, 'en_proceso')" class="btn-proceso">🔄 En Proceso</button>
          <button onclick="cambiarEstado(${cita.id}, 'completada')" class="btn-completar">✅ Completar</button>
          <button onclick="cambiarEstado(${cita.id}, 'cancelada')" class="btn-cancelar">❌ Cancelar</button>
        </div>
      </div>
    `).join("");
}

function getStatusIcon(estado) {
    const icons = {
        'pendiente': '⏳',
        'confirmada': '✅',
        'en_proceso': '🔄',
        'completada': '✅',
        'cancelada': '❌'
    };
    return icons[estado] || '📋';
}

window.cambiarEstado = async function (citaId, nuevoEstado) {
    try {
        const response = await fetch(`/api/citas-simple/${citaId}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (response.ok) {
            loadCitas();
            loadStats();
        } else {
            alert('Error al cambiar el estado de la cita');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
};

window.ampliarImagen = function (src) {
    const modal = document.createElement('div');
    modal.className = 'imagen-modal';
    modal.innerHTML = `
      <div class="imagen-modal-content">
        <span class="close-modal">&times;</span>
        <img src="${src}" alt="Orden Médica Ampliada">
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            document.body.removeChild(modal);
        }
    });
};

setInterval(() => {
    loadStats();
    if (!selectedDate) {
        loadCitas();
    }
}, 30000);

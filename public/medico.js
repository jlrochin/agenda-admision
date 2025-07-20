let citas = [];
let medicos = [];
let stats = {};

const filtroFecha = document.getElementById('filtroFecha');
const filtroMedico = document.getElementById('filtroMedico');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnLimpiar = document.getElementById('btnLimpiar');
const citasList = document.getElementById('citasList');
const loadingCitas = document.getElementById('loadingCitas');
const noCitas = document.getElementById('noCitas');

const citasHoy = document.getElementById('citasHoy');
const citasPendientes = document.getElementById('citasPendientes');
const totalPacientes = document.getElementById('totalPacientes');
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
            loadMedicos(),
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
    totalPacientes.textContent = stats.total_pacientes || 0;
    totalMedicos.textContent = stats.total_medicos || 0;
}

async function loadMedicos() {
    try {
        const response = await fetch('/api/medicos');
        if (!response.ok) {
            throw new Error('Error al cargar médicos');
        }

        medicos = await response.json();
        populateMedicosFilter();
    } catch (error) {
        console.error('Error:', error);
    }
}

function populateMedicosFilter() {
    filtroMedico.innerHTML = '<option value="">Todos los médicos</option>';

    medicos.forEach(medico => {
        const option = document.createElement('option');
        option.value = medico.id;
        option.textContent = `${medico.nombre} ${medico.apellido} - ${medico.especialidad}`;
        filtroMedico.appendChild(option);
    });
}

async function loadCitas() {
    try {
        showLoading(true);

        const params = new URLSearchParams();

        if (filtroFecha.value) {
            params.append('fecha', filtroFecha.value);
        }

        if (filtroMedico.value) {
            params.append('medico_id', filtroMedico.value);
        }

        const response = await fetch(`/api/citas?${params}`);
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

    Object.keys(citasPorFecha).sort().forEach(fecha => {
        const citasDeFecha = citasPorFecha[fecha];
        const fechaFormateada = formatearFecha(fecha);

        html += `
            <div class="fecha-group">
                <h3 class="fecha-header">📅 ${fechaFormateada}</h3>
                <div class="citas-del-dia">
        `;

        citasDeFecha.sort((a, b) => a.hora.localeCompare(b.hora));

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

    return `
        <div class="cita-card">
            <div class="cita-header">
                <div class="cita-fecha-hora">
                    🕒 ${horaFormateada}
                </div>
                <div class="cita-especialidad">
                    ${cita.especialidad_nombre}
                </div>
            </div>
            
            <div class="cita-info">
                <div class="info-group">
                    <h4>👤 Paciente</h4>
                    <p>${cita.paciente_nombre} ${cita.paciente_apellido}</p>
                    <p>📧 ${cita.cedula}</p>
                    <p>📞 ${cita.paciente_telefono}</p>
                </div>
                
                <div class="info-group">
                    <h4>👨‍⚕️ Médico</h4>
                    <p>${cita.medico_nombre} ${cita.medico_apellido}</p>
                </div>
                
                <div class="info-group">
                    <h4>📋 Estado</h4>
                    <p class="estado-${cita.estado}">${formatearEstado(cita.estado)}</p>
                </div>
                
                <div class="info-group">
                    <h4>📅 Agendada</h4>
                    <p>${formatearDateTime(cita.created_at)}</p>
                </div>
            </div>
            
            ${cita.motivo ? `
                <div class="cita-motivo">
                    <h4>💬 Motivo de la consulta</h4>
                    <p>${cita.motivo}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function limpiarFiltros() {
    filtroFecha.value = '';
    filtroMedico.value = '';
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
        'agendada': '📅 Agendada',
        'confirmada': '✅ Confirmada',
        'en-curso': '🔄 En Curso',
        'completada': '✅ Completada',
        'cancelada': '❌ Cancelada',
        'no-asistio': '❌ No Asistió'
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

setInterval(() => {
    loadStats();
    loadCitas();
}, 30000);

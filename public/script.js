let especialidades = [];
let medicos = [];

const especialidadSelect = document.getElementById('especialidad');
const medicoSelect = document.getElementById('medico');
const fechaInput = document.getElementById('fecha');
const citaForm = document.getElementById('citaForm');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementsByClassName('close')[0];

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function setupEventListeners() {
    especialidadSelect.addEventListener('change', function () {
        const especialidadId = this.value;
        if (especialidadId) {
            loadMedicos(especialidadId);
        } else {
            resetMedicoSelect();
        }
    });

    citaForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitCita();
    });

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    fechaInput.min = todayString;

    closeModal.onclick = function () {
        modal.style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    const form = document.getElementById("agendarCitaForm");
    const ordenMedicaInput = document.getElementById("ordenMedica");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const removeImageBtn = document.getElementById("removeImage");
    const curpInput = document.getElementById("curp");

    curpInput.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
        validateCURP(this.value);
    });

    ordenMedicaInput.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener("click", function () {
        ordenMedicaInput.value = "";
        imagePreview.style.display = "none";
        previewImg.src = "";
    });

    function validateCURP(curp) {
        const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
        const isValid = curpPattern.test(curp);

        if (curp.length === 18) {
            if (isValid) {
                curpInput.classList.add("valid");
                curpInput.classList.remove("invalid");
            } else {
                curpInput.classList.add("invalid");
                curpInput.classList.remove("valid");
            }
        } else {
            curpInput.classList.remove("valid", "invalid");
        }

        return isValid;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData();
        const numeroExpediente = document.getElementById("numeroExpediente").value;
        const curp = document.getElementById("curp").value;
        const ordenMedica = document.getElementById("ordenMedica").files[0];

        if (!numeroExpediente.trim()) {
            showModal("❌ Error", "El número de expediente es requerido.");
            return;
        }

        if (!validateCURP(curp)) {
            showModal("❌ Error", "El CURP no tiene un formato válido.");
            return;
        }

        if (!ordenMedica) {
            showModal("❌ Error", "Debe subir una orden médica.");
            return;
        }

        formData.append("numeroExpediente", numeroExpediente);
        formData.append("curp", curp);
        formData.append("ordenMedica", ordenMedica);

        try {
            const response = await fetch("/api/citas", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                showModal(
                    "✅ Cita Agendada",
                    "Su cita ha sido registrada exitosamente.",
                    {
                        expediente: numeroExpediente,
                        curp: curp,
                        fecha: new Date().toLocaleDateString("es-ES"),
                    }
                );
                form.reset();
                imagePreview.style.display = "none";
                previewImg.src = "";
            } else {
                showModal("❌ Error", result.error || "Error al agendar la cita");
            }
        } catch (error) {
            console.error("Error:", error);
            showModal("❌ Error", "Error de conexión. Intente nuevamente.");
        }
    });

    function showModal(title, message, citaData = null) {
        const modal = document.getElementById("modalOverlay");
        const modalTitle = document.getElementById("modalTitle");
        const modalMessage = document.getElementById("modalMessage");
        const citaInfo = document.getElementById("citaInfo");

        modalTitle.textContent = title;
        modalMessage.textContent = message;

        if (citaData) {
            citaInfo.innerHTML = `
        <div class="cita-details">
          <p><strong>📄 Expediente:</strong> ${citaData.expediente}</p>
          <p><strong>🆔 CURP:</strong> ${citaData.curp}</p>
          <p><strong>📅 Fecha de registro:</strong> ${citaData.fecha}</p>
        </div>
      `;
            citaInfo.style.display = "block";
        } else {
            citaInfo.style.display = "none";
        }

        modal.style.display = "flex";
    }

    document.getElementById("modalClose").addEventListener("click", function () {
        document.getElementById("modalOverlay").style.display = "none";
    });

    document.getElementById("modalOverlay").addEventListener("click", function (e) {
        if (e.target === this) {
            this.style.display = "none";
        }
    });
}

async function initializeApp() {
    try {
        await loadEspecialidades();
    } catch (error) {
        console.error('Error al inicializar:', error);
        showError('Error al cargar los datos iniciales. Por favor, recarga la página.');
    }
}

async function loadEspecialidades() {
    try {
        const response = await fetch('/api/especialidades');
        if (!response.ok) {
            throw new Error('Error al cargar especialidades');
        }

        especialidades = await response.json();
        populateEspecialidades();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar las especialidades');
    }
}

function populateEspecialidades() {
    especialidadSelect.innerHTML = '<option value="">Seleccione una especialidad</option>';

    especialidades.forEach(especialidad => {
        const option = document.createElement('option');
        option.value = especialidad.id;
        option.textContent = especialidad.nombre;
        especialidadSelect.appendChild(option);
    });
}

async function loadMedicos(especialidadId) {
    try {
        medicoSelect.disabled = true;
        medicoSelect.innerHTML = '<option value="">Cargando médicos...</option>';

        const response = await fetch(`/api/medicos/${especialidadId}`);
        if (!response.ok) {
            throw new Error('Error al cargar médicos');
        }

        medicos = await response.json();
        populateMedicos();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar los médicos');
        resetMedicoSelect();
    }
}

function populateMedicos() {
    medicoSelect.innerHTML = '<option value="">Seleccione un médico</option>';

    medicos.forEach(medico => {
        const option = document.createElement('option');
        option.value = medico.id;
        option.textContent = `${medico.nombre} ${medico.apellido}`;
        medicoSelect.appendChild(option);
    });

    medicoSelect.disabled = false;
}

function resetMedicoSelect() {
    medicoSelect.innerHTML = '<option value="">Primero seleccione una especialidad</option>';
    medicoSelect.disabled = true;
}

async function submitCita() {
    try {
        const btnText = document.querySelector('.btn-text');
        const btnLoading = document.querySelector('.btn-loading');
        const submitBtn = citaForm.querySelector('button[type="submit"]');

        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;

        const formData = new FormData(citaForm);
        const citaData = {
            paciente: {
                nombre: formData.get('nombre'),
                apellido: formData.get('apellido'),
                cedula: formData.get('cedula'),
                email: formData.get('email'),
                telefono: formData.get('telefono'),
                fechaNacimiento: formData.get('fechaNacimiento'),
                direccion: formData.get('direccion')
            },
            cita: {
                especialidadId: parseInt(formData.get('especialidad')),
                medicoId: parseInt(formData.get('medico')),
                fecha: formData.get('fecha'),
                hora: formData.get('hora'),
                motivo: formData.get('motivo')
            }
        };

        if (!validateCitaData(citaData)) {
            return;
        }

        const response = await fetch('/api/citas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(citaData)
        });

        const result = await response.json();

        if (response.ok) {
            showSuccess(result.message, citaData);
            citaForm.reset();
            resetMedicoSelect();
        } else {
            showError(result.error || 'Error al agendar la cita');
        }

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión. Verifique su conexión a internet.');
    } finally {
        const btnText = document.querySelector('.btn-text');
        const btnLoading = document.querySelector('.btn-loading');
        const submitBtn = citaForm.querySelector('button[type="submit"]');

        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function validateCitaData(data) {
    const { paciente, cita } = data;

    if (!paciente.nombre || !paciente.apellido || !paciente.cedula || !paciente.telefono) {
        showError('Por favor, complete todos los campos obligatorios del paciente.');
        return false;
    }

    if (!cita.especialidadId || !cita.medicoId || !cita.fecha || !cita.hora) {
        showError('Por favor, complete todos los campos obligatorios de la cita.');
        return false;
    }

    const selectedDate = new Date(cita.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        showError('No puede agendar una cita en el pasado.');
        return false;
    }

    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        showError('No se pueden agendar citas los fines de semana.');
        return false;
    }

    return true;
}

function showSuccess(message, citaData) {
    const especialidadNombre = especialidades.find(e => e.id == citaData.cita.especialidadId)?.nombre;
    const medicoNombre = medicos.find(m => m.id == citaData.cita.medicoId);
    const fechaFormatted = new Date(citaData.cita.fecha).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    modalBody.innerHTML = `
        <div class="success-message">
            <h3>✅ Cita Agendada Exitosamente</h3>
            <div style="margin-top: 20px; text-align: left;">
                <p><strong>Paciente:</strong> ${citaData.paciente.nombre} ${citaData.paciente.apellido}</p>
                <p><strong>Especialidad:</strong> ${especialidadNombre}</p>
                <p><strong>Médico:</strong> ${medicoNombre.nombre} ${medicoNombre.apellido}</p>
                <p><strong>Fecha:</strong> ${fechaFormatted}</p>
                <p><strong>Hora:</strong> ${citaData.cita.hora}</p>
                ${citaData.cita.motivo ? `<p><strong>Motivo:</strong> ${citaData.cita.motivo}</p>` : ''}
            </div>
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">
                <p><strong>📞 Recordatorio:</strong></p>
                <p>• Llegue 15 minutos antes de su cita</p>
                <p>• Traiga su documento de identidad</p>
                <p>• Si no puede asistir, llame para reprogramar</p>
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

function showError(message) {
    modalBody.innerHTML = `
        <div class="error-message">
            <h3>❌ Error</h3>
            <p style="margin-top: 15px;">${message}</p>
        </div>
    `;
    modal.style.display = 'block';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}
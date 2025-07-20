document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("agendarCitaForm");
    const tomarFotoInput = document.getElementById("tomarFoto");
    const subirArchivoInput = document.getElementById("subirArchivo");
    const btnTomarFoto = document.getElementById("btnTomarFoto");
    const btnSubirArchivo = document.getElementById("btnSubirArchivo");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const removeImageBtn = document.getElementById("removeImage");
    const curpInput = document.getElementById("curp");

    let selectedFile = null;

    curpInput.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
        validateCURP(this.value);
    });

    btnTomarFoto.addEventListener("click", function () {
        tomarFotoInput.click();
    });

    btnSubirArchivo.addEventListener("click", function () {
        subirArchivoInput.click();
    });

    tomarFotoInput.addEventListener("change", function (e) {
        handleFileSelection(e.target.files[0], "foto");
    });

    subirArchivoInput.addEventListener("change", function (e) {
        handleFileSelection(e.target.files[0], "archivo");
    });

    function handleFileSelection(file, source) {
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                showModal("❌ Error", "Por favor, seleccione un archivo de imagen válido (JPG, PNG, HEIC).");
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                showModal("❌ Error", "El archivo es demasiado grande. Máximo 10MB permitido.");
                return;
            }

            selectedFile = file;
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = "block";

                if (source === "foto") {
                    btnTomarFoto.classList.add("selected");
                    btnSubirArchivo.classList.remove("selected");
                } else {
                    btnSubirArchivo.classList.add("selected");
                    btnTomarFoto.classList.remove("selected");
                }
            };
            reader.readAsDataURL(file);
        }
    }

    removeImageBtn.addEventListener("click", function () {
        tomarFotoInput.value = "";
        subirArchivoInput.value = "";
        selectedFile = null;
        imagePreview.style.display = "none";
        previewImg.src = "";
        btnTomarFoto.classList.remove("selected");
        btnSubirArchivo.classList.remove("selected");
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

        const numeroExpediente = document.getElementById("numeroExpediente").value;
        const curp = document.getElementById("curp").value;

        if (!numeroExpediente.trim()) {
            showModal("❌ Error", "El número de expediente es requerido.");
            return;
        }

        if (!validateCURP(curp)) {
            showModal("❌ Error", "El CURP no tiene un formato válido.");
            return;
        }

        if (!selectedFile) {
            showModal("❌ Error", "Debe subir una orden médica.");
            return;
        }

        const formData = new FormData();
        formData.append("numeroExpediente", numeroExpediente);
        formData.append("curp", curp);
        formData.append("ordenMedica", selectedFile);

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "⏳ Enviando...";
            submitBtn.disabled = true;

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
                selectedFile = null;
                imagePreview.style.display = "none";
                previewImg.src = "";
                btnTomarFoto.classList.remove("selected");
                btnSubirArchivo.classList.remove("selected");
                curpInput.classList.remove("valid", "invalid");
            } else {
                showModal("❌ Error", result.error || "Error al agendar la cita");
            }

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error("Error:", error);
            showModal("❌ Error", "Error de conexión. Intente nuevamente.");

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = "✅ Agendar Cita";
            submitBtn.disabled = false;
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

    form.addEventListener("reset", function () {
        selectedFile = null;
        imagePreview.style.display = "none";
        previewImg.src = "";
        btnTomarFoto.classList.remove("selected");
        btnSubirArchivo.classList.remove("selected");
        curpInput.classList.remove("valid", "invalid");
    });
});

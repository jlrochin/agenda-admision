# 🏥 Agenda de Admisión Hospitalaria

Sistema web para gestionar citas hospitalarias con formulario simplificado.

## 🚀 Características

- **Formulario de pacientes**: Número de expediente + CURP + foto de orden médica
- **Panel médico**: Calendario interactivo para visualizar citas por fecha
- **Validación CURP**: Formato mexicano automático
- **Captura de fotos**: Compatible con móviles y escritorio
- **Estados de citas**: Pendiente, confirmada, en proceso, completada, cancelada

## 📋 Requisitos

- Node.js 14+
- npm

## 📥 Clonar e Instalar

```bash
# Clonar el repositorio
git clone https://github.com/jlrochin/agenda-admision.git

# Entrar al directorio
cd agenda-admision

# Instalar dependencias
npm install
```

## ⚡ Ejecutar en local

```bash
# Iniciar servidor
npm start

# O alternativamente
node server.js
```

**Abrir navegador en:** http://localhost:3000

- **Pacientes**: http://localhost:3000 (formulario de citas)
- **Médicos**: http://localhost:3000/medico (panel administrativo)

## 📁 Estructura

- `server.js` - Backend (Express + SQLite)
- `public/index.html` - Formulario de pacientes
- `public/medico.html` - Panel médico
- `public/styles.css` - Estilos
- `uploads/` - Imágenes subidas (auto-creada)

## 💾 Base de datos

SQLite local (hospital.db) - Se crea automáticamente al iniciar.

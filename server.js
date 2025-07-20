const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Multer (ajusta según necesites)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de tamaño (ej: 10MB)
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|heic|heif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPG, PNG, HEIC)'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const db = new sqlite3.Database('./hospital_agenda.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS especialidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS medicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        especialidad_id INTEGER,
        email TEXT UNIQUE,
        telefono TEXT,
        FOREIGN KEY (especialidad_id) REFERENCES especialidades (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        cedula TEXT UNIQUE NOT NULL,
        email TEXT,
        telefono TEXT NOT NULL,
        fecha_nacimiento DATE,
        direccion TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        medico_id INTEGER NOT NULL,
        especialidad_id INTEGER NOT NULL,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        motivo TEXT,
        estado TEXT DEFAULT 'agendada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
        FOREIGN KEY (medico_id) REFERENCES medicos (id),
        FOREIGN KEY (especialidad_id) REFERENCES especialidades (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS citas_simplificadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_expediente TEXT NOT NULL,
        curp TEXT NOT NULL,
        orden_medica TEXT NOT NULL,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    insertInitialData();
}

function insertInitialData() {
    const especialidades = [
        ['Cardiología', 'Especialista en enfermedades del corazón'],
        ['Neurología', 'Especialista en enfermedades del sistema nervioso'],
        ['Pediatría', 'Especialista en atención médica infantil'],
        ['Ginecología', 'Especialista en salud femenina'],
        ['Traumatología', 'Especialista en lesiones y fracturas']
    ];

    especialidades.forEach(([nombre, descripcion]) => {
        db.run('INSERT OR IGNORE INTO especialidades (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]);
    });

    const medicos = [
        ['Dr. Carlos', 'González', 1, 'carlos.gonzalez@hospital.com', '555-0101'],
        ['Dra. María', 'Rodríguez', 2, 'maria.rodriguez@hospital.com', '555-0102'],
        ['Dr. Juan', 'Pérez', 3, 'juan.perez@hospital.com', '555-0103'],
        ['Dra. Ana', 'Martínez', 4, 'ana.martinez@hospital.com', '555-0104'],
        ['Dr. Luis', 'López', 5, 'luis.lopez@hospital.com', '555-0105']
    ];

    medicos.forEach(([nombre, apellido, especialidad_id, email, telefono]) => {
        db.run('INSERT OR IGNORE INTO medicos (nombre, apellido, especialidad_id, email, telefono) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, especialidad_id, email, telefono]);
    });
}

// Rutas API
app.get('/api/citas-simplificadas', (req, res) => {
    const fecha = req.query.fecha;

    let query = `
        SELECT * FROM citas_simplificadas
        WHERE estado != 'cancelada'
    `;

    const params = [];

    if (fecha) {
        query += ' AND fecha = ?';
        params.push(fecha);
    }

    query += ' ORDER BY fecha DESC, hora DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM citas_simplificadas WHERE fecha = ? AND estado = 'pendiente') as total_citas_hoy,
            (SELECT COUNT(*) FROM citas_simplificadas WHERE estado = 'pendiente') as total_citas_pendientes,
            (SELECT COUNT(*) FROM citas_simplificadas) as total_citas_registradas,
            5 as total_medicos
    `, [today], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows[0]);
    });
});

app.put('/api/citas-simplificadas/:id/estado', (req, res) => {
    const citaId = req.params.id;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'confirmada', 'en-proceso', 'completada', 'cancelada'];

    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }

    db.run(
        'UPDATE citas_simplificadas SET estado = ? WHERE id = ?',
        [estado, citaId],
        function (err) {
            if (err) {
                console.error('Error al actualizar estado:', err);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Cita no encontrada' });
            }

            res.json({ message: 'Estado actualizado correctamente', estado });
        }
    );
});

app.get('/api/especialidades', (req, res) => {
    db.all('SELECT * FROM especialidades ORDER BY nombre', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/medicos/:especialidadId', (req, res) => {
    const especialidadId = req.params.especialidadId;
    db.all(`SELECT m.*, e.nombre as especialidad 
            FROM medicos m 
            JOIN especialidades e ON m.especialidad_id = e.id 
            WHERE m.especialidad_id = ? 
            ORDER BY m.nombre`, [especialidadId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post("/api/citas", upload.single("ordenMedica"), (req, res) => {
    const { numeroExpediente, curp } = req.body;
    const ordenMedica = req.file ? req.file.path : null;

    if (!numeroExpediente || !curp) {
        return res.status(400).json({
            error: "Número de expediente y CURP son requeridos"
        });
    }

    const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
    if (!curpPattern.test(curp)) {
        return res.status(400).json({
            error: "Formato de CURP inválido"
        });
    }

    if (!ordenMedica) {
        return res.status(400).json({
            error: "La orden médica es requerida"
        });
    }

    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0];

    db.run(
        `INSERT INTO citas (numero_expediente, curp, fecha, hora, orden_medica, estado) 
     VALUES (?, ?, ?, ?, ?, 'pendiente')`,
        [numeroExpediente, curp, fecha, hora, ordenMedica],
        function (err) {
            if (err) {
                console.error("Error al crear cita:", err);
                return res.status(500).json({
                    error: "Error interno del servidor"
                });
            }

            res.status(201).json({
                id: this.lastID,
                message: "Cita creada exitosamente",
                numeroExpediente,
                curp,
                fecha,
                hora
            });
        }
    );
});

app.get('/api/citas', (req, res) => {
    const fecha = req.query.fecha;
    const medicoId = req.query.medico_id;

    let query = `
        SELECT c.*, 
               p.nombre as paciente_nombre, p.apellido as paciente_apellido, 
               p.cedula, p.telefono as paciente_telefono,
               m.nombre as medico_nombre, m.apellido as medico_apellido,
               e.nombre as especialidad_nombre
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        JOIN medicos m ON c.medico_id = m.id
        JOIN especialidades e ON c.especialidad_id = e.id
        WHERE c.estado = 'agendada'
    `;

    const params = [];

    if (fecha) {
        query += ' AND c.fecha = ?';
        params.push(fecha);
    }

    if (medicoId) {
        query += ' AND c.medico_id = ?';
        params.push(medicoId);
    }

    query += ' ORDER BY c.fecha, c.hora';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.all(`
        SELECT 
            COUNT(*) as total_citas_hoy,
            (SELECT COUNT(*) FROM citas WHERE estado = 'agendada') as total_citas_pendientes,
            (SELECT COUNT(*) FROM pacientes) as total_pacientes,
            (SELECT COUNT(*) FROM medicos) as total_medicos
        FROM citas 
        WHERE fecha = ? AND estado = 'agendada'
    `, [today], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows[0]);
    });
});

app.get('/api/medicos', (req, res) => {
    db.all(`SELECT m.*, e.nombre as especialidad 
            FROM medicos m 
            JOIN especialidades e ON m.especialidad_id = e.id 
            ORDER BY m.nombre`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/medico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'medico.html'));
});

app.get("/api/citas/stats", (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.all(
        `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN fecha = ? THEN 1 ELSE 0 END) as hoy,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
      (SELECT COUNT(*) FROM medicos) as medicos
     FROM citas_simple`,
        [today],
        (err, rows) => {
            if (err) {
                console.error("Error obteniendo estadísticas:", err);
                return res.status(500).json({ error: "Error interno del servidor" });
            }

            const stats = rows[0] || {};
            res.json({
                citasHoy: stats.hoy || 0,
                citasPendientes: stats.pendientes || 0,
                totalCitas: stats.total || 0,
                totalMedicos: stats.medicos || 5
            });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nCerrando servidor...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Conexión a la base de datos cerrada.');
        }
    });
    process.exit(0);
});
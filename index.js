
// npm install express mysql2 dotenv cors bcrypt

const express = require('express');
const mysql = require('mysql2');
dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Configura el puerto y empieza a escuchar
const PORT = process.env.PORT || 3001;

// Configuración de la conexión con la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// Configurar almacenamiento con Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Asigna un nombre único
  },
});

const upload = multer({ storage });

// Endpoint para manejar la subida de imágenes
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se envió ningún archivo' });
  }
  const imagePath = `/uploads/${req.file.filename}`;
  res.json({ imagePath });
});

// --- Endpoint para Usuarios --- //
// Crear Usuario
app.post('/api/usuarios', async (req, res) => {
  const { nombre, email, contrasena, rol } = req.body;
  if (!nombre || !email || !contrasena) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  try {
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const [result] = await pool.promise().query(
      'INSERT INTO Usuarios (nombre, email, contrasena, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, rol || 'cliente']
    );
    res.status(201).json({ message: 'Usuario creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

// Obtener todos los Usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT * FROM Usuarios WHERE status = "activo"');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// Actualizar Usuario
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, contrasena, rol } = req.body;
  if (!nombre && !email && !contrasena && !rol) {
    return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar.' });
  }
  try {
    let query = 'UPDATE Usuarios SET';
    const fields = [];
    if (nombre) fields.push(` nombre = '${nombre}'`);
    if (email) fields.push(` email = '${email}'`);
    if (contrasena) fields.push(` contrasena = '${await bcrypt.hash(contrasena, 10)}'`);
    if (rol) fields.push(` rol = '${rol}'`);
    query += fields.join(',') + ` WHERE id = ${id}`;
    await pool.promise().query(query);
    res.status(200).json({ message: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

// Eliminar (lógica) Usuario
app.put('/api/usuarios/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.promise().query('UPDATE Usuarios SET status = "inactivo" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Usuario eliminado lógicamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

// --- Endpoint para Platos --- //
// Crear Plato
app.post('/api/platos', async (req, res) => {
  const { nombre, descripcion, precio, categoria, ingredientes, imagen } = req.body;
  if (!nombre || !precio) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
  }
  try {
    console.log('Datos recibidos:', { nombre, descripcion, precio, categoria, ingredientes, imagen });

    const [result] = await pool.promise().query(
      'INSERT INTO Platos (nombre, descripcion, precio, categoria, ingredientes, imagen) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, precio, categoria, ingredientes, imagen]
    );

    res.status(201).json({ message: 'Plato creado', id: result.insertId });
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Error al crear plato.', details: error.message });
  }
});


// Obtener todos los Platos
app.get('/api/platos', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT * FROM Platos WHERE status = "activo"');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener platos.' });
  }
});

// Eliminar (lógica) Plato
app.put('/api/platos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.promise().query('UPDATE Platos SET status = "inactivo" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Plato eliminado lógicamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar plato.' });
  }
});
// Actualizar un plato por ID
app.put('/api/platos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria, ingredientes, imagen } = req.body;

  if (!nombre && !descripcion && !precio && !categoria && !ingredientes && !imagen) {
    return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar.' });
  }

  try {
    const fields = [];
    if (nombre) fields.push(`nombre = '${nombre}'`);
    if (descripcion) fields.push(`descripcion = '${descripcion}'`);
    if (precio) fields.push(`precio = ${precio}`);
    if (categoria) fields.push(`categoria = '${categoria}'`);
    if (ingredientes) fields.push(`ingredientes = '${ingredientes}'`);
    if (imagen) fields.push(`imagen = '${imagen}'`);

    const query = `UPDATE Platos SET ${fields.join(', ')} WHERE id = ?`;

    await pool.promise().query(query, [id]);
    res.status(200).json({ message: 'Plato actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el plato:', error);
    res.status(500).json({ error: 'Error al actualizar el plato.' });
  }
});


// --- Endpoint para Pedidos --- //
// Crear Pedido
app.post('/api/pedidos', async (req, res) => {
  const { usuario_id, mesa, estado } = req.body;
  if (!usuario_id || !mesa) {
    return res.status(400).json({ error: 'Usuario y mesa son obligatorios.' });
  }
  try {
    const [result] = await pool.promise().query(
      'INSERT INTO Pedidos (usuario_id, mesa, estado) VALUES (?, ?, ?)',
      [usuario_id, mesa, estado || 'pendiente']
    );
    res.status(201).json({ message: 'Pedido creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear pedido.' });
  }
});

// Obtener todos los Pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT * FROM Pedidos WHERE status = "activo"');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

// Eliminar (lógica) Pedido
app.put('/api/pedidos/:id/eliminar', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.promise().query('UPDATE Pedidos SET status = "inactivo" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Pedido eliminado lógicamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar pedido.' });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});









// const express = require("express");
// const mysql = require("mysql2");
// const cors = require("cors");

// const app = express();
// const PORT = process.env.PORT || 3001;

// app.use(cors());
// app.use(express.json());

// const db = mysql.createConnection({
//   host: "127.0.0.1",
//   user: "root",
//   password: "123456",
//   database: "dbfruta",
// });

// db.connect((err) => {
//   if (err) {
//     console.error("Error de conexión a la base de datos:", err);
//     return;
//   }
//   console.log("Conectado a la base de datos MySQL");
// });

// // +++++++++++++++++++

// app.get("/api/frutos-secos", (req, res) => {
//   const { nombre, precioMin, precioMax } = req.query;

//   let query = "SELECT * FROM frutos_secos WHERE 1=1";
//   const queryParams = [];

//   if (nombre) {
//     query += " AND nombre LIKE ?";
//     queryParams.push(`%${nombre}%`);
//   }

//   if (precioMin) {
//     query += " AND precio >= ?";
//     queryParams.push(precioMin);
//   }

//   if (precioMax) {
//     query += " AND precio <= ?";
//     queryParams.push(precioMax);
//   }
//   console.log("Consulta SQL:", query);
//   console.log("Parámetros:", queryParams);

//   db.query(query, queryParams, (err, results) => {
//     if (err) {
//       console.error("Error al obtener datos:", err);
//       res.status(500).send("Error al obtener datos");
//       return;
//     }
//     res.json(results);
//   });
// });
// //+++++++++++++++
// app.post("/api/frutos-secos", (req, res) => {
//   const { nombre, descripcion, precio, imagen } = req.body;
//   const query =
//     "INSERT INTO frutos_secos (nombre, descripcion, precio, imagen) VALUES (?, ?, ?, ?)";

//   db.query(query, [nombre, descripcion, precio, imagen], (err, result) => {
//     if (err) {
//       console.error("Error al insertar datos:", err);
//       res.status(500).send("Error al insertar datos");
//       return;
//     }
//     res
//       .status(201)
//       .send({ message: "Producto agregado exitosamente", id: result.insertId });
//   });
// });

// app.put("/api/frutos-secos/:id", (req, res) => {
//   const { id } = req.params;
//   const { nombre, descripcion, precio, imagen } = req.body;
//   const query =
//     "UPDATE frutos_secos SET nombre = ?, descripcion = ?, precio = ?, imagen = ? WHERE id = ?";

//   db.query(query, [nombre, descripcion, precio, imagen, id], (err, result) => {
//     if (err) {
//       console.error("Error al actualizar datos:", err);
//       res.status(500).send("Error al actualizar datos");
//       return;
//     }
//     if (result.affectedRows === 0) {
//       res.status(404).send("Producto no encontrado");
//       return;
//     }
//     res.send({ message: "Producto actualizado exitosamente" });
//   });
// });

// // Ruta para manejar el envío de pedidos
// app.post("/api/contacto", (req, res) => {
//   const { nombre, email, productos, comentario } = req.body;

//   // Registro de los datos recibidos en la consola del servidor
//   console.log("Datos recibidos del formulario:", req.body);

//   const query =
//     "INSERT INTO mensajes_contacto (nombre, email, productos, comentarios) VALUES (?, ?, ?, ?)";
//   db.query(query, [nombre, email, productos, comentario], (err, result) => {
//     if (err) {
//       console.error("Error al insertar el mensaje de contacto:", err);
//       res.status(500).send("Error al guardar el mensaje de contacto");
//       return;
//     }
//     res.status(201).send({
//       message: "Mensaje de contacto enviado exitosamente",
//       id: result.insertId,
//     });
//   });
// });

// app.get("/api/contacto", (req, res) => {
//   const query = "SELECT * FROM mensajes_contacto ORDER BY fecha_envio DESC";

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Error al obtener los mensajes de contacto:", err);
//       res.status(500).send("Error al obtener los mensajes de contacto");
//       return;
//     }
//     res.json(results);
//   });
// });

// app.get("/api/contacto/:id", (req, res) => {
//   const { id } = req.params;
//   const query = "SELECT * FROM mensajes_contacto WHERE id = ?";

//   db.query(query, [id], (err, results) => {
//     if (err) {
//       console.error("Error al obtener el mensaje de contacto:", err);
//       res.status(500).send("Error al obtener el mensaje de contacto");
//       return;
//     }
//     if (results.length === 0) {
//       res.status(404).send("Mensaje de contacto no encontrado");
//       return;
//     }
//     res.json(results[0]);
//   });
// });

// app.listen(PORT, () => {
//   console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
// });

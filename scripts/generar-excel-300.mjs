// Genera un Excel de estudiantes ficticios.
// Uso: node scripts/generar-excel-300.mjs [cantidad=300] [salida=pruebas/admitidos-300.xlsx] [semilla]
// Si existe pruebas/.existentes.json (cédulas y usuarios ya cargados), los evita.
// Correo institucional = inicial del primer nombre + primer apellido @uniempresarial.edu.co
// (lgomez). Si ya existe: inicial del primer nombre + inicial del segundo nombre + primer
// apellido (lagomez). Si aún choca o no hay segundo nombre: se agrega la inicial del
// segundo apellido y, como último recurso, un número.
// Los correos personales usan @example.com (dominio reservado): nunca llegan a nadie.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import * as XLSX from 'xlsx';

// Generador con semilla: el archivo sale igual cada vez que se ejecuta
const CANTIDAD = Number(process.argv[2]) || 300;
const SALIDA = process.argv[3] || 'pruebas/admitidos-300.xlsx';
let semilla = Number(process.argv[4]) || 20261110;
const existentes = existsSync('pruebas/.existentes.json')
  ? JSON.parse(readFileSync('pruebas/.existentes.json', 'utf8'))
  : { cedulas: [], usuarios: [] };
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296);
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

const nombresH = ['Juan', 'Andrés', 'Santiago', 'Sebastián', 'Nicolás', 'Felipe', 'Daniel', 'David', 'Carlos', 'Camilo',
  'Julián', 'Mateo', 'Samuel', 'Alejandro', 'Diego', 'Esteban', 'Miguel', 'José', 'Luis', 'Jorge', 'Óscar', 'Iván',
  'Fabián', 'Martín', 'Tomás', 'Cristian', 'Brayan', 'Kevin', 'Jhon', 'Edwin'];
const nombresM = ['Laura', 'Valentina', 'Daniela', 'Camila', 'María', 'Natalia', 'Paula', 'Sofía', 'Juliana', 'Carolina',
  'Andrea', 'Gabriela', 'Manuela', 'Isabella', 'Luisa', 'Ana', 'Sara', 'Mariana', 'Alejandra', 'Diana', 'Lina', 'Paola',
  'Tatiana', 'Angie', 'Karen', 'Lady', 'Melissa', 'Valeria', 'Ximena', 'Yesica'];
const apellidos = ['Rodríguez', 'Gómez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez',
  'Torres', 'Díaz', 'Vargas', 'Moreno', 'Rojas', 'Castro', 'Ortiz', 'Jiménez', 'Muñoz', 'Suárez', 'Romero', 'Guerrero',
  'Betancourt', 'Herrera', 'Medina', 'Castillo', 'Ruiz', 'Álvarez', 'Gutiérrez', 'Restrepo', 'Ospina', 'Cárdenas',
  'Mejía', 'Salazar', 'Quintero', 'Ríos', 'Peña', 'Cruz', 'Parra', 'Acosta', 'Rincón'];
const programas = [
  ['Administración de Empresas', ['Presencial', 'Nocturno', 'Virtual']],
  ['Contaduría Pública', ['Presencial', 'Nocturno']],
  ['Ingeniería Industrial', ['Presencial']],
  ['Ingeniería de Software', ['Presencial', 'Virtual']],
  ['Finanzas y Comercio Internacional', ['Presencial', 'Virtual']],
  ['Mercadeo y Publicidad', ['Presencial', 'Virtual']],
  ['Tecnología en Gestión Empresarial', ['Nocturno', 'Virtual']],
  ['Tecnología en Logística', ['Nocturno']],
  ['Especialización en Gerencia de Proyectos', ['Especialización']],
  ['Especialización en Finanzas Corporativas', ['Especialización']],
];

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/gi, 'n').toLowerCase().replace(/[^a-z]/g, '');
const ini = (s) => slug(s)[0];

// Correos institucionales que ya existen en la base de prueba
const usados = new Set(existentes.usuarios);
const ejemplosColision = [];

function usuarioInstitucional(n1, n2, a1, a2) {
  const candidatos = [`${ini(n1)}${slug(a1)}`];
  if (n2) candidatos.push(`${ini(n1)}${ini(n2)}${slug(a1)}`);
  candidatos.push(`${ini(n1)}${n2 ? ini(n2) : ''}${slug(a1)}${ini(a2)}`);
  for (const c of candidatos) if (!usados.has(c)) return c;
  for (let i = 2; ; i++) {
    const c = `${candidatos.at(-1)}${i}`;
    if (!usados.has(c)) return c;
  }
}

const clave = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return 'Ue' + Array.from({ length: 7 }, () => c[Math.floor(azar() * c.length)]).join('') + elegir(['*', '#', '!', '$']) + Math.floor(10 + azar() * 90);
};

const cedulas = new Set(existentes.cedulas);
// Mismas columnas y orden de la plantilla oficial "PLANTILLA PLATAFORMA.xlsx"
const filas = [['FECHA', 'NOMBRE', 'DOCUMENTO', 'CORREO PERSONAL', 'PROGRAMA', 'Usuario Ue', 'USUARIO CORREO UE', 'CONTRASEÑA  CORREO UE', 'FIRMA RECIBIDO']];
const hoy = new Date();

for (let i = 0; filas.length <= CANTIDAD; i++) {
  const mujer = azar() < 0.5;
  const n1 = elegir(mujer ? nombresM : nombresH);
  let n2 = azar() < 0.55 ? elegir(mujer ? nombresM : nombresH) : '';
  if (n2 === n1) n2 = '';
  const a1 = elegir(apellidos);
  let a2 = elegir(apellidos);
  if (a2 === a1) a2 = elegir(apellidos);

  let cedula;
  do cedula = String(1020000000 + Math.floor(azar() * 9000000)); while (cedulas.has(cedula));
  cedulas.add(cedula);

  const base = `${ini(n1)}${slug(a1)}`;
  const usuario = usuarioInstitucional(n1, n2, a1, a2);
  if (usuario !== base) ejemplosColision.push(`${[n1, n2, a1, a2].filter(Boolean).join(' ')} → ${usuario} (ya existía ${base})`);
  usados.add(usuario);

  const [programa] = elegir(programas);
  const fecha = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - Math.floor(azar() * 20)));
  filas.push([
    fecha,
    [n1, n2, a1, a2].filter(Boolean).join(' '),
    cedula,
    `${slug(n1)}.${slug(a1)}${semilla % 1000}${i}@example.com`,
    programa,
    usuario,
    `${usuario}@uniempresarial.edu.co`,
    clave(),
    '',
  ]);
}

const hoja = XLSX.utils.aoa_to_sheet(filas, { cellDates: true, dateNF: 'dd/mm/yyyy' });
hoja['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 14 }, { wch: 36 }, { wch: 40 }, { wch: 16 }, { wch: 38 }, { wch: 22 }, { wch: 18 }];
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Admitidos');
mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }));

console.log(`${SALIDA} → ${filas.length - 1} estudiantes`);
console.log(`Choques de correo resueltos con la regla: ${ejemplosColision.length}`);
ejemplosColision.slice(0, 8).forEach((e) => console.log('  ' + e));

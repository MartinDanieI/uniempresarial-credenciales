// Genera pruebas/admitidos-prueba.xlsx con 30 estudiantes ficticios.
// Los correos personales usan @example.com (dominio reservado): nunca llegan a una persona real.
import { randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const nombres = ['Laura', 'Santiago', 'Valentina', 'Juan David', 'Mariana', 'Andrés', 'Camila', 'Sebastián', 'Daniela', 'Felipe',
  'Natalia', 'Julián', 'Paula', 'Nicolás', 'Sofía', 'Mateo', 'Isabella', 'Samuel', 'Gabriela', 'Alejandro',
  'Juliana', 'David', 'Carolina', 'Tomás', 'Manuela', 'Esteban', 'Luisa Fernanda', 'Diego', 'Ana María', 'Cristian'];
const apellidos = ['Rodríguez', 'Gómez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres',
  'Díaz', 'Vargas', 'Moreno', 'Rojas', 'Castro', 'Ortiz', 'Jiménez', 'Muñoz', 'Suárez', 'Romero'];
const programas = [
  ['Administración de Empresas', 'Presencial'],
  ['Contaduría Pública', 'Nocturno'],
  ['Ingeniería Industrial', 'Presencial'],
  ['Ingeniería de Software', 'Virtual'],
  ['Finanzas y Comercio Internacional', 'Presencial'],
  ['Mercadeo y Publicidad', 'Virtual'],
  ['Tecnología en Gestión Empresarial', 'Nocturno'],
  ['Especialización en Gerencia de Proyectos', 'Especialización'],
];
const sinTilde = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clave = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return 'Ue' + Array.from({ length: 7 }, () => c[randomInt(c.length)]).join('') + '*' + randomInt(10, 99);
};

const filas = [['CEDULA', 'NOMBRE', 'PROGRAMA', 'MODALIDAD', 'CORREO_PERSONAL', 'USUARIO_CORREO_UE', 'CONTRASEÑA_CORREO_UE']];
const usados = new Set();
nombres.forEach((nombre, i) => {
  const a1 = apellidos[i % apellidos.length];
  const a2 = apellidos[(i * 7 + 3) % apellidos.length];
  const [programa, modalidad] = programas[i % programas.length];
  let usuario = `${sinTilde(nombre.split(' ')[0])}.${sinTilde(a1)}`;
  if (usados.has(usuario)) usuario += `${sinTilde(a2)[0]}`;
  usados.add(usuario);
  filas.push([
    String(1000100000 + i * 3571),
    `${nombre} ${a1} ${a2}`,
    programa,
    modalidad,
    `${usuario}.prueba@example.com`,
    `${usuario}@uniempresarial.edu.co`,
    clave(),
  ]);
});

const hoja = XLSX.utils.aoa_to_sheet(filas);
hoja['!cols'] = filas[0].map((_, c) => ({ wch: c === 1 || c === 2 ? 38 : 30 }));
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Admitidos');
mkdirSync('pruebas', { recursive: true });
writeFileSync('pruebas/admitidos-prueba.xlsx', XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }));
console.log(`pruebas/admitidos-prueba.xlsx → ${filas.length - 1} estudiantes`);

/** Enlaces y datos oficiales de Uniempresarial (compartidos por portal, PDF y correos). */
export const LINKS = {
  m365: 'https://m365.cloud.microsoft/chat/?auth=2&origindomain=Office',
  campus: 'https://campusvirtual.uniempresarial.edu.co/',
  tutorialMoodle: 'https://www.youtube.com/watch?v=Vmwk0_SSoeg',
  glpi: 'https://helpdesk.uniempresarial.edu.co:4432/index.php?noAUTO=1',
  siga: process.env.NEXT_PUBLIC_SIGA_URL || 'https://uniempresarial.datasae.co/siga_new/web/app.php/login_responsive',
  web: 'https://www.uniempresarial.edu.co',
} as const;

export const CONTACTO = {
  bienestar: 'bienestar@uniempresarial.edu.co',
  institucion: 'Fundación Universitaria Empresarial de la Cámara de Comercio de Bogotá',
  sedePrincipal: 'Carrera 33 A # 30 - 20',
  sedeAdministrativa: 'Transversal 34 Bis # 29 A - 44',
  telefono: '(601) 380 80 00',
  web: 'www.uniempresarial.edu.co',
} as const;

export const DOMINIO_INSTITUCIONAL = '@uniempresarial.edu.co';

export const QRS = [
  { titulo: 'Campus Virtual', url: LINKS.campus },
  { titulo: 'Mesa de servicios GLPI', url: LINKS.glpi },
  { titulo: 'Microsoft Office 365', url: LINKS.m365 },
  { titulo: 'Sistema de Gestión Académico (SIGA)', url: LINKS.siga },
] as const;

export const M365_APPS = [
  { nombre: 'Outlook', desc: 'Tu correo institucional: canal oficial con docentes y áreas administrativas.' },
  { nombre: 'Teams', desc: 'Clases virtuales, reuniones, chat y trabajo en equipo.' },
  { nombre: 'Word', desc: 'Documentos, informes y trabajos escritos.' },
  { nombre: 'Excel', desc: 'Hojas de cálculo, análisis de datos y gráficos.' },
  { nombre: 'PowerPoint', desc: 'Presentaciones para exposiciones y proyectos.' },
  { nombre: 'OneDrive', desc: 'Almacenamiento en la nube para guardar y compartir tus archivos.' },
] as const;

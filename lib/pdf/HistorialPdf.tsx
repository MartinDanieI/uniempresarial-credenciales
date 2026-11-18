import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { CONTACTO } from '../institucional';
import { describirDispositivo, describirUbicacion } from '../dispositivo';
import type { AccessLog, StudentTrazabilidad } from '../types';

// Sin guiones de corte: los correos y nombres no deben partirse con "-"
Font.registerHyphenationCallback((palabra) => [palabra]);

const AZUL = '#0132af';
const NOCHE = '#1a2340';
const ROJO = '#c8102e';
const GRIS = '#5b6883';
const LINEA = '#dfe3ea';

/** Mismos colores por tipo de acción que el historial del panel. */
const ACCIONES: Record<string, { titulo: string; color: string }> = {
  correo_bienvenida: { titulo: 'Correo de bienvenida enviado', color: AZUL },
  recordatorio: { titulo: 'Recordatorio enviado', color: '#f59e0b' },
  consulta_credenciales: { titulo: 'Consultó sus credenciales', color: '#059669' },
  descarga_pdf: { titulo: 'Descargó el manual PDF', color: '#0284c7' },
  impresion_pdf: { titulo: 'Imprimió el manual', color: '#7c3aed' },
  cambio_password: { titulo: 'Restableció su contraseña', color: ROJO },
};

const ZONA = 'America/Bogota';
const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { timeZone: ZONA, dateStyle: 'medium', timeStyle: 'short' }) : '—';
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit' });
const diaClave = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA });
const tituloDia = (clave: string) => {
  const t = new Date(`${clave}T12:00:00Z`).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const s = StyleSheet.create({
  page: { paddingBottom: 56, fontSize: 9.5, fontFamily: 'Helvetica', color: '#22323d' },
  logoBox: { paddingVertical: 12, paddingHorizontal: 36 },
  logo: { width: 230, height: 37 },
  lineaRoja: { height: 3, backgroundColor: ROJO },
  lineaAzul: { height: 3, backgroundColor: AZUL },
  banda: { backgroundColor: AZUL, paddingHorizontal: 36, paddingVertical: 18 },
  rotulo: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  nombre: { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { color: '#ffffff', backgroundColor: '#2a52c4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginTop: 3, fontSize: 8.5 },
  cuerpo: { paddingHorizontal: 36, paddingTop: 16 },
  seccion: { color: ROJO, marginBottom: 8, marginTop: 6 },
  pasos: { flexDirection: 'row', marginBottom: 14 },
  paso: { flex: 1, flexDirection: 'row', paddingRight: 8 },
  punto: { width: 14, height: 14, borderRadius: 7, marginRight: 6, marginTop: 1 },
  pasoTitulo: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: NOCHE },
  pasoDetalle: { fontSize: 7.5, color: GRIS, marginTop: 2 },
  resumen: { flexDirection: 'row', marginBottom: 14 },
  caja: { flex: 1, borderWidth: 1, borderColor: LINEA, borderRadius: 8, padding: 8, marginRight: 6 },
  cifra: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  cifraTexto: { fontSize: 7.5, color: GRIS, marginTop: 2 },
  datos: { flexDirection: 'row', marginBottom: 12 },
  dato: { flex: 1, paddingRight: 8 },
  datoTitulo: { fontSize: 7.5, color: GRIS },
  datoValor: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NOCHE, marginTop: 1 },
  dia: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: NOCHE, marginTop: 8, marginBottom: 5 },
  item: { borderWidth: 1, borderLeftWidth: 4, borderColor: LINEA, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 9, marginBottom: 5 },
  itemFila: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTitulo: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: NOCHE },
  itemHora: { fontSize: 8, color: GRIS },
  itemDetalle: { fontSize: 8.5, marginTop: 2 },
  itemMeta: { fontSize: 7.5, color: GRIS, marginTop: 3 },
  vacio: { fontSize: 9, color: GRIS, marginTop: 6 },
  pie: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 7, color: '#777', borderTopWidth: 1, borderTopColor: LINEA, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
});

function Paso({ hecho, color, titulo, detalle }: { hecho: boolean; color: string; titulo: string; detalle: string }) {
  return (
    <View style={s.paso}>
      <View style={[s.punto, hecho ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: '#c5ccd8' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.pasoTitulo, hecho ? {} : { color: GRIS }]}>{titulo}</Text>
        <Text style={s.pasoDetalle}>{detalle}</Text>
      </View>
    </View>
  );
}

export function HistorialPdf({
  student,
  logs,
  logo,
  generadoPor,
}: {
  student: StudentTrazabilidad;
  logs: AccessLog[];
  logo: Buffer;
  generadoPor: string;
}) {
  const cuenta = (accion: string) => logs.filter((l) => l.accion === accion).length;
  const primeraVez = (...acciones: string[]) => [...logs].reverse().find((l) => acciones.includes(l.accion));
  const manual = primeraVez('descarga_pdf', 'impresion_pdf');
  const clave = primeraVez('cambio_password');
  const ultimaUbicacion = logs.find((l) => l.ciudad || l.pais);

  const porDia = new Map<string, AccessLog[]>();
  for (const l of logs) porDia.set(diaClave(l.created_at), [...(porDia.get(diaClave(l.created_at)) ?? []), l]);

  return (
    <Document title={`Historial - ${student.nombre_completo}`} author="Bienestar Universitario · Uniempresarial" language="es">
      <Page size="LETTER" style={s.page}>
        <View style={s.logoBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.logo} src={logo} />
        </View>
        <View style={s.lineaRoja} />
        <View style={s.lineaAzul} />

        <View style={s.banda}>
          <Text style={[s.rotulo, { color: '#c7d3f5' }]}>Historial del estudiante</Text>
          <Text style={s.nombre}>{student.nombre_completo}</Text>
          <View style={s.chips}>
            <Text style={s.chip}>CC {student.documento_identidad}</Text>
            <Text style={s.chip}>{student.correo_institucional}</Text>
            <Text style={s.chip}>{student.programa_academico}</Text>
          </View>
        </View>

        <View style={s.cuerpo}>
          <Text style={[s.rotulo, s.seccion]}>Recorrido</Text>
          <View style={s.pasos}>
            <Paso
              hecho={!!student.fecha_envio_correo}
              color={AZUL}
              titulo="Recibió la bienvenida"
              detalle={
                student.fecha_envio_correo
                  ? `${fechaHora(student.fecha_envio_correo)}${student.cantidad_recordatorios ? ` · ${student.cantidad_recordatorios} recordatorio(s)` : ''}`
                  : 'Aún no se le ha enviado'
              }
            />
            <Paso
              hecho={student.ha_ingresado}
              color="#059669"
              titulo="Abrió sus credenciales"
              detalle={student.ha_ingresado ? `Firma digital · ${fechaHora(student.fecha_primer_ingreso)}` : 'Pendiente'}
            />
            <Paso hecho={!!manual} color="#0284c7" titulo="Descargó o imprimió el manual" detalle={manual ? fechaHora(manual.created_at) : 'Pendiente'} />
            <Paso
              hecho={!!clave || student.ha_cambiado_password}
              color={ROJO}
              titulo="Restableció su contraseña"
              detalle={clave ? fechaHora(clave.created_at) : 'Opcional'}
            />
          </View>

          <Text style={[s.rotulo, s.seccion]}>Resumen</Text>
          <View style={s.resumen}>
            {[
              ['Consultas', cuenta('consulta_credenciales'), '#047857'],
              ['Descargas', cuenta('descarga_pdf'), '#0369a1'],
              ['Impresiones', cuenta('impresion_pdf'), '#6d28d9'],
              ['Recordatorios', cuenta('recordatorio'), '#d97706'],
            ].map(([t, v, c]) => (
              <View key={t as string} style={s.caja}>
                <Text style={[s.cifra, { color: c as string }]}>{String(v)}</Text>
                <Text style={s.cifraTexto}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={s.datos}>
            <View style={s.dato}>
              <Text style={s.datoTitulo}>Correo personal</Text>
              <Text style={s.datoValor}>{student.correo_personal}</Text>
            </View>
            <View style={s.dato}>
              <Text style={s.datoTitulo}>Último acceso</Text>
              <Text style={s.datoValor}>{fechaHora(student.fecha_ultimo_ingreso)}</Text>
            </View>
            <View style={s.dato}>
              <Text style={s.datoTitulo}>Última ubicación</Text>
              <Text style={s.datoValor}>
                {ultimaUbicacion ? describirUbicacion(ultimaUbicacion.ciudad, ultimaUbicacion.region, ultimaUbicacion.pais) : '—'}
              </Text>
            </View>
          </View>

          <Text style={[s.rotulo, s.seccion]}>Actividad</Text>
          {!logs.length && <Text style={s.vacio}>Todavía no hay actividad registrada.</Text>}
          {[...porDia.entries()].map(([dia, items]) => (
            <View key={dia}>
              <Text style={s.dia} minPresenceAhead={40}>
                {tituloDia(dia)}
              </Text>
              {items.map((l) => {
                const a = ACCIONES[l.accion] ?? { titulo: l.accion, color: GRIS };
                const delSistema = l.accion === 'correo_bienvenida' || l.accion === 'recordatorio';
                const lugar = describirUbicacion(l.ciudad, l.region, l.pais) ?? 'Ubicación no registrada';
                const disp = describirDispositivo(l.user_agent);
                return (
                  <View key={l.id} style={[s.item, { borderLeftColor: a.color }]} wrap={false}>
                    <View style={s.itemFila}>
                      <Text style={s.itemTitulo}>{a.titulo}</Text>
                      <Text style={s.itemHora}>{hora(l.created_at)}</Text>
                    </View>
                    {l.detalle && <Text style={s.itemDetalle}>{l.detalle}</Text>}
                    {!delSistema && <Text style={s.itemMeta}>{[lugar, disp?.texto].filter(Boolean).join('   ·   ')}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={s.pie} fixed>
          <Text>
            {CONTACTO.institucion} · Generado el {fechaHora(new Date().toISOString())} por {generadoPor}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

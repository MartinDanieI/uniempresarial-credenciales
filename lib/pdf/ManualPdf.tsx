import { Document, Link, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer';
import { CONTACTO, LINKS, M365_APPS } from '../institucional';
import type { StudentCredenciales } from '../types';

const ROJO = '#c8102e';
const AZUL = '#0132af';
const NOCHE = '#1a2340';

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 58, paddingHorizontal: 0, fontSize: 10, fontFamily: 'Helvetica', color: '#222' },
  banda: { backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 36 },
  logo: { width: 248, height: 40 },
  lineaRoja: { height: 3, backgroundColor: ROJO },
  lineaAzul: { height: 3, backgroundColor: AZUL, marginBottom: 14 },
  cuerpo: { paddingHorizontal: 36 },
  h1: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: NOCHE, marginBottom: 6 },
  h2: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: AZUL, marginTop: 11, marginBottom: 5 },
  p: { marginBottom: 6 },
  b: { fontFamily: 'Helvetica-Bold' },
  datos: { backgroundColor: '#f3f5f9', borderRadius: 6, padding: 10, marginVertical: 5 },
  fila: { flexDirection: 'row', marginBottom: 3 },
  etiqueta: { width: 150, fontFamily: 'Helvetica-Bold' },
  valor: { flex: 1, fontFamily: 'Courier-Bold' },
  link: { color: AZUL, textDecoration: 'underline' },
  alerta: { borderLeftWidth: 3, borderLeftColor: ROJO, backgroundColor: '#fdf0f3', padding: 8, marginVertical: 6 },
  apps: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  app: { width: '50%', paddingRight: 8, marginBottom: 5 },
  qrs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  qr: { width: '23%', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 6 },
  qrImg: { width: 78, height: 78 },
  qrTxt: { fontSize: 8, textAlign: 'center', marginTop: 4, fontFamily: 'Helvetica-Bold' },
  pie: { position: 'absolute', bottom: 22, left: 36, right: 36, fontSize: 7.5, color: '#777', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 6 },
  num: { position: 'absolute', bottom: 10, right: 36, fontSize: 7.5, color: '#999' },
});

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{valor}</Text>
    </View>
  );
}

export function ManualPdf({
  student,
  qrs,
  logo,
}: {
  student: StudentCredenciales;
  qrs: { titulo: string; dataUrl: string }[];
  logo: Buffer;
}) {
  return (
    <Document title={`Credenciales Uniempresarial - ${student.nombre_completo}`} author="Uniempresarial" language="es">
      <Page size="LETTER" style={s.page}>
        <View fixed>
          <View style={s.banda}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={s.logo} src={logo} />
          </View>
          <View style={s.lineaRoja} />
          <View style={s.lineaAzul} />
        </View>

        <View style={s.cuerpo}>
          <Text style={s.h1}>Manual de ingreso a plataformas institucionales</Text>
          <Text style={s.p}>
            ¡Hola <Text style={s.b}>{student.nombre_completo}</Text>! La Fundación Universitaria Empresarial de la Cámara de
            Comercio de Bogotá te da la bienvenida al programa <Text style={s.b}>{student.programa_academico}</Text>
            {student.modalidad ? ` (${student.modalidad})` : ''}. Estas son tus credenciales de acceso; guárdalas en un lugar
            seguro y no las compartas con nadie.
          </Text>

          <Text style={s.h2}>¿Qué es Microsoft 365?</Text>
          <Text style={s.p}>
            Es la suite de herramientas en la nube que la Universidad pone a tu disposición con tu cuenta institucional:
          </Text>
          <View style={s.apps}>
            {M365_APPS.map((a) => (
              <View key={a.nombre} style={s.app}>
                <Text>
                  <Text style={s.b}>{a.nombre}: </Text>
                  {a.desc}
                </Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>1. ¿Cómo ingresar a tu cuenta de correo electrónico?</Text>
          <Text style={s.p}>
            Ingresa a <Link src={LINKS.m365} style={s.link}>{LINKS.m365}</Link> con estos datos:
          </Text>
          <View style={s.datos}>
            <Dato etiqueta="Correo institucional:" valor={student.correo_institucional} />
            <Dato etiqueta="Contraseña asignada:" valor={student.password_inicial} />
          </View>
          <Text style={s.p}>Al primer ingreso Office te pedirá cambiar la contraseña por una personal.</Text>

          <Text style={s.h2}>2. ¿Cómo ingresar a tu campus virtual?</Text>
          <Text style={s.p}>
            Ingresa a <Link src={LINKS.campus} style={s.link}>{LINKS.campus}</Link> con tu correo institucional (
            {student.correo_institucional}) y la contraseña asignada. Mira el paso a paso en el video tutorial:{' '}
            <Link src={LINKS.tutorialMoodle} style={s.link}>{LINKS.tutorialMoodle}</Link>
          </Text>

          <Text style={s.h2}>3. ¿Cómo ingresar a la mesa de servicios GLPI?</Text>
          <Text style={s.p}>
            Ingresa a <Link src={LINKS.glpi} style={s.link}>{LINKS.glpi}</Link>
          </Text>
          <View style={s.alerta}>
            <Text>
              <Text style={s.b}>Importante: </Text>en GLPI tu usuario es únicamente <Text style={s.b}>{student.usuario_glpi}</Text>{' '}
              (sin @uniempresarial.edu.co). Si escribes el correo completo, el inicio de sesión fallará.
            </Text>
          </View>

          <View wrap={false}>
          <Text style={s.h2}>Accesos rápidos</Text>
          <View style={s.qrs}>
            {qrs.map((q) => (
              <View key={q.titulo} style={s.qr}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image style={s.qrImg} src={q.dataUrl} />
                <Text style={s.qrTxt}>{q.titulo}</Text>
              </View>
            ))}
          </View>
          </View>

          <Text style={[s.p, { marginTop: 8 }]}>
            ¿Necesitas ayuda? Escribe a {CONTACTO.bienestar} o abre un caso en la Mesa de Servicios.
          </Text>
        </View>

        <Text style={s.pie} fixed>
          {CONTACTO.institucion}
          {'\n'}Sede principal: {CONTACTO.sedePrincipal} | Sede Administrativa: {CONTACTO.sedeAdministrativa}
          {'\n'}Teléfono: {CONTACTO.telefono} | Web: {CONTACTO.web}
        </Text>
        <Text style={s.num} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

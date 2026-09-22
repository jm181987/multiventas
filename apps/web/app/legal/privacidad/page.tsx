import { LegalSection, LegalShell } from '@/components/LegalShell';

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Política de privacidad"
      intro="Describe cómo Multiventas procesa información necesaria para operar cuentas, tiendas, pedidos, pagos, seguridad y soporte."
    >
      <LegalSection title="1. Datos que puede procesar la plataforma">
        <p>
          La plataforma puede procesar datos de registro y perfil, datos de contacto, información de vendedores y tiendas,
          pedidos, productos, direcciones de entrega, actividad de sesión, registros técnicos, identificadores de pagos,
          comunicaciones de soporte y archivos que el usuario cargue.
        </p>
      </LegalSection>

      <LegalSection title="2. Finalidades">
        <p>
          Los datos se utilizan para crear y mantener cuentas, ejecutar pedidos, mostrar tiendas y productos, facilitar pagos,
          prevenir fraude y abuso, atender soporte, resolver incidencias, cumplir obligaciones legales y mejorar la seguridad
          y funcionamiento del servicio.
        </p>
      </LegalSection>

      <LegalSection title="3. Pagos y proveedores externos">
        <p>
          Los pagos pueden ser procesados por proveedores externos. Multiventas no necesita almacenar los datos completos
          de tarjetas cuando estos son gestionados directamente por el proveedor de pago. Dichos proveedores tratan
          información conforme a sus propias políticas y obligaciones.
        </p>
      </LegalSection>

      <LegalSection title="4. Compartición necesaria">
        <p>
          Para ejecutar una compra, cierta información puede compartirse con la tienda vendedora, proveedores de pago,
          operadores logísticos, infraestructura tecnológica y otros prestadores estrictamente necesarios para completar
          la operación, brindar soporte o proteger el servicio.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservación y seguridad">
        <p>
          La información se conserva durante el tiempo necesario para prestar el servicio, mantener registros de operaciones,
          resolver disputas, prevenir fraude y cumplir obligaciones legales. Se aplican medidas técnicas y organizativas
          razonables, aunque ningún sistema conectado a Internet puede garantizar seguridad absoluta.
        </p>
      </LegalSection>

      <LegalSection title="6. Derechos y solicitudes">
        <p>
          Los usuarios pueden solicitar acceso, actualización o corrección de sus datos desde las funciones disponibles
          en la cuenta y, cuando corresponda legalmente, solicitar otras medidas mediante los canales oficiales de soporte.
          Algunas operaciones pueden requerir conservar ciertos registros por obligaciones legales, contables o antifraude.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies y almacenamiento local">
        <p>
          La plataforma puede utilizar almacenamiento del navegador y tecnologías similares para mantener la sesión,
          recordar preferencias, proteger la cuenta y mejorar la experiencia. El bloqueo de estas tecnologías puede
          impedir el funcionamiento correcto de algunas áreas autenticadas.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

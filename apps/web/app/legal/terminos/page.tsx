import { LegalSection, LegalShell } from '@/components/LegalShell';

export default function TermsPage() {
  return (
    <LegalShell
      title="Términos de uso"
      intro="Estos términos regulan el acceso y uso de Multiventas como plataforma tecnológica de marketplace multi-vendedor."
    >
      <LegalSection title="1. Rol de Multiventas">
        <p>
          Multiventas proporciona infraestructura tecnológica para que vendedores independientes publiquen productos
          y compradores puedan descubrirlos, realizar pedidos y utilizar medios de pago habilitados. Salvo que se indique
          expresamente lo contrario, Multiventas no es el vendedor, fabricante, importador, distribuidor ni transportista
          de los productos ofrecidos por las tiendas.
        </p>
        <p>
          La relación de compraventa se celebra entre el comprador y la tienda vendedora. La identidad de la tienda,
          sus productos, precios y condiciones se muestran en la plataforma para que el comprador pueda decidir antes de comprar.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuentas y seguridad">
        <p>
          Cada usuario debe proporcionar información veraz y mantener sus credenciales seguras. La cuenta es personal.
          Multiventas puede suspender o limitar cuentas ante fraude, suplantación, incumplimiento de estas reglas,
          actividad ilegal, riesgos para terceros o requerimientos legales.
        </p>
        <p>
          Los vendedores pueden estar sujetos a procesos de aprobación, verificación y conexión con proveedores de pago
          antes de publicar o cobrar operaciones.
        </p>
      </LegalSection>

      <LegalSection title="3. Publicaciones y operaciones">
        <p>
          Los vendedores son responsables de que títulos, imágenes, descripciones, precios, stock, impuestos,
          origen, autenticidad, características y disponibilidad de sus productos sean correctos y legales.
        </p>
        <p>
          Un pedido puede quedar sujeto a confirmación, disponibilidad real, aprobación del pago, controles antifraude
          y condiciones específicas de la tienda. Multiventas puede retirar publicaciones o bloquear operaciones que
          infrinjan estas reglas o representen un riesgo.
        </p>
      </LegalSection>

      <LegalSection title="4. Comisión de la plataforma">
        <p>
          La comisión estándar vigente es del <strong>8% del importe total de cada orden procesada mediante el marketplace</strong>,
          salvo acuerdo comercial distinto informado expresamente al vendedor. La comisión remunera el uso de la infraestructura,
          intermediación tecnológica, herramientas de gestión y funcionalidades de la plataforma.
        </p>
        <p>
          Cuando el proveedor de pagos lo permite, la comisión puede descontarse automáticamente en el flujo de pago.
          Los costos propios del proveedor de pago, impuestos, retenciones, contracargos u otros cargos de terceros
          pueden ser adicionales y se rigen por las condiciones de esos proveedores.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidad por productos y entregas">
        <p>
          Cada vendedor responde por los productos que ofrece, incluyendo calidad, seguridad, autenticidad, legalidad,
          etiquetado, garantías, servicio posventa, devoluciones, reembolsos que correspondan y cumplimiento de la normativa aplicable.
        </p>
        <p>
          La entrega es responsabilidad de la tienda y/o del operador logístico seleccionado. Multiventas no controla
          físicamente el inventario ni la logística y, en la máxima medida permitida por la ley aplicable, no responde
          por pérdida, daño, retraso, entrega incorrecta o falta de entrega imputable al vendedor o transportista.
        </p>
      </LegalSection>

      <LegalSection title="6. Disponibilidad de la plataforma">
        <p>
          El servicio puede experimentar mantenimiento, interrupciones, errores de terceros o cambios técnicos.
          Multiventas procurará mantener una operación razonable, pero no garantiza disponibilidad ininterrumpida
          ni que todas las funciones estén libres de errores en todo momento.
        </p>
      </LegalSection>

      <LegalSection title="7. Propiedad intelectual y contenido">
        <p>
          Cada vendedor declara contar con los derechos necesarios sobre textos, marcas, imágenes y demás contenido
          que publique. Al cargar contenido, autoriza a Multiventas a mostrarlo y procesarlo en la medida necesaria
          para operar, promocionar y mejorar el marketplace.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios y ley aplicable">
        <p>
          Multiventas puede actualizar estas reglas cuando cambien funciones, proveedores, costos o requisitos legales.
          Los cambios relevantes deben comunicarse por medios razonables. Ninguna cláusula pretende excluir derechos
          irrenunciables que correspondan a consumidores o usuarios conforme a la ley aplicable.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

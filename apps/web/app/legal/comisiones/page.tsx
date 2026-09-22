import { LegalSection, LegalShell } from '@/components/LegalShell';

export default function FeesPage() {
  return (
    <LegalShell
      title="Comisiones, pagos, entregas y disputas"
      intro="Explica el fee de la plataforma y cómo se distribuyen responsabilidades económicas y operativas entre Multiventas, vendedores, compradores y proveedores externos."
    >
      <LegalSection title="1. Fee de Multiventas">
        <p>
          La comisión estándar es del <strong>8% del total de cada orden procesada por el marketplace</strong>.
          Por ejemplo, una orden total de 1.000 unidades monetarias genera una comisión estándar de 80 para Multiventas,
          antes de considerar cargos, impuestos o retenciones de terceros.
        </p>
        <p>
          Puede existir un acuerdo comercial diferente para una tienda concreta. Si la comisión cambia de forma general,
          la nueva condición debe informarse antes de aplicarse a futuras operaciones.
        </p>
      </LegalSection>

      <LegalSection title="2. Procesamiento de pagos">
        <p>
          Los pagos se procesan mediante proveedores externos habilitados. Cuando existe funcionalidad de marketplace/split,
          el proveedor puede distribuir el dinero entre vendedor y plataforma y descontar la comisión correspondiente.
          Multiventas no garantiza la aprobación de pagos ni controla las decisiones antifraude, bloqueos o plazos del proveedor.
        </p>
        <p>
          Los costos del proveedor de pago, contracargos, devoluciones, impuestos, retenciones u otros cargos pueden
          afectar el importe neto recibido por el vendedor y son independientes del fee de Multiventas.
        </p>
      </LegalSection>

      <LegalSection title="3. Entregas">
        <p>
          Salvo que una función concreta indique expresamente lo contrario, la tienda es responsable de preparar el pedido
          y coordinar su entrega, directamente o mediante un operador logístico. Los tiempos y costos de entrega informados
          por la tienda deben ser razonables y transparentes.
        </p>
        <p>
          Multiventas no es transportista. En la máxima medida permitida por la ley aplicable, no responde por retrasos,
          extravíos, daños, direcciones incorrectas, ausencia del destinatario o incumplimientos logísticos atribuibles
          a la tienda, comprador o proveedor de transporte.
        </p>
      </LegalSection>

      <LegalSection title="4. Cancelaciones, devoluciones y reembolsos">
        <p>
          Las condiciones de devolución deben respetar la normativa aplicable y las políticas informadas por la tienda.
          Cuando corresponda un reembolso, este puede estar sujeto a los tiempos y mecanismos del proveedor de pago.
          Multiventas puede facilitar información y herramientas, pero la obligación material frente al producto corresponde
          al vendedor cuando la ley así lo determine.
        </p>
      </LegalSection>

      <LegalSection title="5. Reclamos y disputas">
        <p>
          Ante un problema, comprador y vendedor deben intentar resolverlo de buena fe aportando comprobantes, mensajes,
          información del pedido y evidencia de entrega cuando corresponda. Multiventas puede facilitar el intercambio
          de información, suspender preventivamente funciones o aplicar reglas del marketplace, sin convertirse por ello
          en fabricante, vendedor o transportista.
        </p>
      </LegalSection>

      <LegalSection title="6. Contracargos y fraude">
        <p>
          Los contracargos, pagos desconocidos o fraude pueden generar ajustes posteriores. El vendedor debe colaborar
          con la documentación necesaria para acreditar la operación. La asignación económica final puede depender
          de las reglas del proveedor de pago y de la normativa aplicable.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

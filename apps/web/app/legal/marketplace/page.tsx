import { LegalSection, LegalShell } from '@/components/LegalShell';

export default function MarketplaceRulesPage() {
  return (
    <LegalShell
      title="Reglas del marketplace"
      intro="Normas de comportamiento para vendedores y compradores que utilizan Multiventas."
    >
      <LegalSection title="1. Obligaciones del vendedor">
        <p>
          El vendedor debe mantener información comercial y de contacto veraz, publicar únicamente productos que pueda
          ofrecer legalmente, mantener stock y precios actualizados, responder los pedidos y cumplir las condiciones
          anunciadas al comprador.
        </p>
        <p>
          El vendedor es responsable por facturación, impuestos, habilitaciones, garantías, cumplimiento regulatorio,
          seguridad del producto, propiedad intelectual y cualquier obligación que derive de su actividad comercial.
        </p>
      </LegalSection>

      <LegalSection title="2. Productos prohibidos o restringidos">
        <p>
          No pueden publicarse productos ilegales, robados, falsificados, peligrosos, que vulneren derechos de terceros
          o cuya comercialización requiera autorizaciones que el vendedor no posea. Multiventas puede retirar publicaciones,
          suspender tiendas o bloquear cuentas cuando detecte riesgos o incumplimientos.
        </p>
      </LegalSection>

      <LegalSection title="3. Obligaciones del comprador">
        <p>
          El comprador debe proporcionar datos correctos para pago y entrega, revisar la información de la tienda antes
          de comprar, utilizar medios de pago legítimos y actuar de buena fe en reclamos, devoluciones y disputas.
        </p>
      </LegalSection>

      <LegalSection title="4. Reseñas y contenido">
        <p>
          Las reseñas deben reflejar experiencias reales y no pueden contener amenazas, discriminación, datos personales
          de terceros, spam o contenido ilegal. La plataforma puede moderar contenido que incumpla estas reglas.
        </p>
      </LegalSection>

      <LegalSection title="5. Moderación y medidas de seguridad">
        <p>
          Multiventas puede solicitar documentación, limitar funciones, retener temporalmente determinadas acciones,
          suspender publicaciones o cuentas y colaborar con proveedores o autoridades cuando sea razonablemente necesario
          para investigar fraude, abuso, riesgo para usuarios o incumplimientos legales.
        </p>
      </LegalSection>

      <LegalSection title="6. Independencia de las tiendas">
        <p>
          Cada tienda opera como vendedor independiente. La personalización de logo, portada, nombre o identidad visual
          no implica que Multiventas avale, certifique o garantice al vendedor ni sus productos.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

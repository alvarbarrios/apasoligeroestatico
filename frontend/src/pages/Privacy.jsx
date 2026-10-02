import PageHeader from "@/components/PageHeader";
import useTitle from "@/hooks/useTitle";

export default function Privacy() {
  useTitle("Privacidad y cookies");

  return (
    <div data-testid="privacy-page">
      <PageHeader
        eyebrow="Información legal"
        title="Privacidad y cookies"
        intro={["Información sobre los datos que se tratan al utilizar A Paso Ligero y cómo gestionar sus preferencias."]}
        crumbs={[{ to: "/", label: "Inicio" }, { label: "Privacidad y cookies" }]}
      />
      <article className="mx-auto max-w-4xl space-y-10 px-4 py-12 text-sm leading-relaxed text-sage sm:px-6 sm:py-16">
        <section>
          <h2 className="font-display text-2xl font-bold uppercase text-parchment">Responsable y contacto</h2>
          <p className="mt-3">
            El responsable de este sitio es Álvar Barrios Martínez. Para consultas sobre privacidad, acceso,
            rectificación o eliminación de datos, escriba a{" "}
            <a className="text-brass underline" href="mailto:dark_slmnk@hotmail.com">
              dark_slmnk@hotmail.com
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold uppercase text-parchment">Datos y finalidades</h2>
          <p className="mt-3">
            Si utiliza el formulario de contacto, se tratarán los datos que facilite (asunto, mensaje y, si los
            incluye, nombre, correo, teléfono y unidad) para recibir y responder su comunicación. En la versión
            estática, el formulario prepara un mensaje en su propio programa de correo y el envío queda sujeto a ese
            servicio.
          </p>
          <p className="mt-3">
            En el libro de visitas, el nombre, lugar, unidad y mensaje se muestran públicamente. El correo electrónico
            es opcional y no se publica. Puede solicitar que se retire una firma escribiendo al responsable.
          </p>
          <p className="mt-3">
            En la versión conectada, el servicio del sitio procesa temporalmente la dirección IP para limitar envíos
            abusivos y entrega los mensajes de contacto mediante el servicio de correo administrado de Emergent.
            Al cargar las tipografías, el navegador también solicita recursos a Google Fonts. El libro histórico de
            visitas, cuando se abre, pertenece a un servicio externo y se rige por su propia política de privacidad.
          </p>
          <p className="mt-3">
            La analítica opcional se basa en su consentimiento. Los datos del formulario se usan para atender la
            solicitud y las firmas se publican al enviarlas; el control temporal de abusos responde al interés de
            proteger el servicio.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold uppercase text-parchment">Cookies y analítica</h2>
          <p className="mt-3">
            El sitio guarda en el almacenamiento local del navegador su elección de cookies. PostHog, proveedor de
            analítica configurado en este sitio, solo se carga si acepta las cookies opcionales; puede procesar datos
            de uso y grabaciones de sesión. Los campos de entrada están configurados para ocultarse en las
            grabaciones. Si rechaza, PostHog no se carga.
          </p>
          <p className="mt-3">
            Puede cambiar o retirar su decisión con el control «Preferencias de cookies» del pie de página. La
            retirada no afecta al tratamiento anterior a ese cambio.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold uppercase text-parchment">Conservación y derechos</h2>
          <p className="mt-3">
            Los datos de contacto se conservan durante la gestión de la comunicación y, después, durante los plazos
            necesarios para atender posibles responsabilidades. Las firmas del libro permanecen publicadas hasta que
            se solicite su retirada. Puede solicitar acceso, rectificación,
            supresión, limitación u oposición al tratamiento a través del correo indicado; también puede reclamar
            ante la autoridad de protección de datos competente, como la{" "}
            <a className="text-brass underline" href="https://www.aepd.es/" target="_blank" rel="noreferrer">
              Agencia Española de Protección de Datos
            </a>
            .
          </p>
        </section>
        <p className="border-t border-olive-600 pt-4 font-mono text-[10px] uppercase tracking-widest text-khaki">
          Última actualización: 2 de octubre de 2026
        </p>
      </article>
    </div>
  );
}

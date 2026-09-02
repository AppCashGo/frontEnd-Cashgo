import { useEffect, useState } from "react";
import {
  ArrowUp,
  CalendarDays,
  Check,
  Database,
  Eye,
  FileDown,
  HelpCircle,
  Info,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "@/routes/route-paths";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./TermsAndConditionsPage.module.css";

type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LAST_UPDATED = "2 de septiembre de 2026";

const privacySections: PrivacySection[] = [
  {
    id: "alcance",
    title: "1. Alcance de esta política",
    paragraphs: [
      "Esta Política de privacidad explica cómo Cashgo recopila, utiliza, almacena y protege la información cuando creas una cuenta, registras un negocio o utilizas los módulos disponibles en la plataforma.",
      "También describe las decisiones que puedes tomar sobre tus datos y las responsabilidades que asumes cuando registras información de clientes, empleados, proveedores u otros terceros.",
    ],
  },
  {
    id: "datos-recopilados",
    title: "2. Información que recopilamos",
    paragraphs: [
      "Recopilamos la información necesaria para crear tu cuenta, identificar tu negocio, habilitar las funciones de Cashgo y prestar soporte. La información concreta depende de los módulos que utilices.",
    ],
    bullets: [
      "Datos de cuenta, como nombre, teléfono, correo, rol y credenciales de acceso.",
      "Datos del negocio, como nombre comercial, categoría, ubicación, contacto y configuración.",
      "Registros operativos, como productos, ventas, inventario, gastos, comprobantes y reportes.",
      "Datos de contactos y equipo que decidas registrar dentro de la plataforma.",
      "Información técnica básica necesaria para seguridad, diagnóstico y funcionamiento del servicio.",
    ],
  },
  {
    id: "finalidades",
    title: "3. Para qué utilizamos la información",
    paragraphs: [
      "Tratamos la información para prestar el servicio solicitado y mantener una experiencia segura, estable y relevante para cada negocio.",
    ],
    bullets: [
      "Crear y administrar cuentas, negocios, roles y permisos.",
      "Ejecutar las funciones operativas seleccionadas por el usuario.",
      "Generar indicadores, reportes y resultados solicitados dentro de Cashgo.",
      "Prevenir accesos no autorizados, fraude, abuso e incidentes de seguridad.",
      "Atender solicitudes de soporte y mejorar el rendimiento de la plataforma.",
      "Cumplir obligaciones legales cuando resulten aplicables.",
    ],
  },
  {
    id: "base-autorizacion",
    title: "4. Autorización y uso legítimo",
    paragraphs: [
      "El tratamiento se realiza para ofrecer las funcionalidades que solicitas, gestionar la relación de servicio y atender obligaciones aplicables. Cuando sea necesario, solicitaremos una autorización clara antes de tratar información para una finalidad adicional.",
      "Puedes dejar de utilizar funciones opcionales o retirar autorizaciones cuando corresponda, sin afectar los tratamientos que deban conservarse por una obligación válida.",
    ],
  },
  {
    id: "terceros",
    title: "5. Datos de terceros registrados por el negocio",
    paragraphs: [
      "Cuando registras información de clientes, empleados, proveedores u otras personas, actúas como responsable de obtener las autorizaciones necesarias y de utilizar esos datos para finalidades legítimas relacionadas con tu negocio.",
      "Cashgo trata esa información para ejecutar las instrucciones del usuario y habilitar los módulos correspondientes, dentro de los límites del servicio contratado.",
    ],
  },
  {
    id: "proveedores",
    title: "6. Proveedores y transferencias de información",
    paragraphs: [
      "Podemos apoyarnos en proveedores tecnológicos para alojamiento, almacenamiento, seguridad, comunicaciones, análisis operativo o soporte. Estos proveedores reciben únicamente la información necesaria para prestar su función y deben aplicar medidas de protección acordes con el servicio.",
      "La infraestructura utilizada puede procesar información desde ubicaciones diferentes a la del usuario. Cuando aplique, adoptaremos medidas razonables para proteger la información durante estas transferencias.",
    ],
  },
  {
    id: "seguridad",
    title: "7. Seguridad de la información",
    paragraphs: [
      "Aplicamos medidas técnicas y organizativas orientadas a proteger la confidencialidad, integridad y disponibilidad de la información. Ningún sistema es completamente inmune a incidentes, por lo que también necesitamos que cada usuario proteja sus credenciales, dispositivos y permisos de acceso.",
    ],
  },
  {
    id: "conservacion",
    title: "8. Conservación y eliminación",
    paragraphs: [
      "Conservamos la información durante el tiempo necesario para prestar el servicio, mantener la seguridad, resolver solicitudes y cumplir obligaciones aplicables. Los plazos pueden variar según el tipo de dato, el estado de la cuenta y la finalidad del tratamiento.",
      "Cuando la información ya no sea necesaria, procuraremos eliminarla, anonimizarla o bloquear su uso, salvo que exista una razón válida para conservarla.",
    ],
  },
  {
    id: "derechos",
    title: "9. Tus derechos y opciones",
    paragraphs: [
      "De acuerdo con la legislación aplicable, puedes solicitar información sobre el tratamiento de tus datos y ejercer los derechos que correspondan. Antes de responder, podremos pedirte información adicional para verificar tu identidad y proteger la cuenta.",
    ],
    bullets: [
      "Consultar y conocer los datos asociados a tu cuenta.",
      "Solicitar la actualización o corrección de información inexacta.",
      "Pedir la eliminación de datos cuando sea procedente.",
      "Oponerte o limitar determinados tratamientos cuando exista esa posibilidad.",
      "Retirar una autorización, sin afectar usos previos legítimos.",
    ],
  },
  {
    id: "menores",
    title: "10. Uso por menores de edad",
    paragraphs: [
      "Cashgo está orientado a personas con capacidad para administrar o colaborar en un negocio. No está diseñado para que menores de edad creen y administren cuentas por su cuenta. Si identificamos información registrada en contra de esta condición, podremos tomar medidas para restringir el acceso y revisar su eliminación.",
    ],
  },
  {
    id: "cambios",
    title: "11. Actualizaciones de la política",
    paragraphs: [
      "Podemos actualizar esta política cuando cambien las funcionalidades, las prácticas de tratamiento o los requisitos aplicables. La fecha de la versión vigente siempre aparecerá al inicio de esta página y procuraremos informar los cambios relevantes mediante los canales disponibles en Cashgo.",
    ],
  },
  {
    id: "contacto",
    title: "12. Consultas y solicitudes",
    paragraphs: [
      "Para formular preguntas o solicitudes relacionadas con privacidad, utiliza los canales oficiales de soporte disponibles dentro de Cashgo. Indica claramente el tipo de solicitud y la cuenta o negocio relacionado para que podamos orientarte de forma segura.",
    ],
  },
];

export function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState(privacySections[0].id);

  useEffect(() => {
    const sections = privacySections
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      { rootMargin: "-18% 0px -65%", threshold: [0, 0.25, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function printPolicy() {
    window.print();
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroIcon}>
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Privacidad y datos</p>
            <h1>Política de privacidad</h1>
            <p className={styles.heroDescription}>
              Conoce qué información utiliza Cashgo, para qué la necesita y cómo
              ayudamos a protegerla.
            </p>
          </div>
        </div>

        <div className={styles.heroActions}>
          <span className={styles.updatedBadge}>
            <CalendarDays aria-hidden="true" />
            <span>
              Última actualización
              <strong>{LAST_UPDATED}</strong>
            </span>
          </span>
          <button className={styles.printButton} type="button" onClick={printPolicy}>
            <FileDown aria-hidden="true" />
            Imprimir o guardar PDF
          </button>
        </div>
      </header>

      <div className={styles.summary}>
        <span className={styles.summaryIcon}>
          <Info aria-hidden="true" />
        </span>
        <div>
          <strong>Tu información, explicada con claridad</strong>
          <p>
            Cashgo utiliza los datos necesarios para operar la plataforma,
            proteger las cuentas y ofrecer las funciones que cada negocio decide usar.
          </p>
        </div>
        <div className={styles.summaryPoints}>
          <span><Database aria-hidden="true" /> Uso necesario</span>
          <span><LockKeyhole aria-hidden="true" /> Acceso protegido</span>
          <span><UserCheck aria-hidden="true" /> Control del usuario</span>
        </div>
      </div>

      <div className={styles.mobileIndex}>
        <label htmlFor="privacy-section">Ir a una sección</label>
        <select
          id="privacy-section"
          value={activeSection}
          onChange={(event) => {
            const sectionId = event.target.value;
            setActiveSection(sectionId);
            document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {privacySections.map((section) => (
            <option key={section.id} value={section.id}>{section.title}</option>
          ))}
        </select>
      </div>

      <div className={styles.layout}>
        <aside className={styles.indexCard}>
          <p className={styles.indexEyebrow}>En esta página</p>
          <nav aria-label="Contenido de la política de privacidad">
            {privacySections.map((section) => (
              <a
                className={joinClassNames(
                  styles.indexLink,
                  activeSection === section.id && styles.indexLinkActive,
                )}
                href={`#${section.id}`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.title}</span>
                {activeSection === section.id ? <Check aria-hidden="true" /> : null}
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.document}>
          <div className={styles.documentIntro}>
            <p className={styles.documentKicker}>Documento vigente</p>
            <h2>Cómo cuidamos la información en Cashgo</h2>
            <p>
              Esta política se aplica a la información tratada durante el acceso
              y uso de Cashgo, incluidos los datos que el usuario registra en sus
              módulos y configuraciones.
            </p>
          </div>

          <div className={styles.sections}>
            {privacySections.map((section) => (
              <section className={styles.termSection} id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.id === "contacto" ? (
                  <div className={styles.summaryPoints}>
                    <Link className={styles.helpLink} to={routePaths.help}>
                      <HelpCircle aria-hidden="true" /> Ir al Centro de ayuda
                    </Link>
                    <Link className={styles.helpLink} to={routePaths.terms}>
                      <Eye aria-hidden="true" /> Consultar términos de uso
                    </Link>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <footer className={styles.documentFooter}>
            <div>
              <strong>Privacidad disponible cuando la necesites</strong>
              <p>Puedes volver a esta política desde el menú Ayuda.</p>
            </div>
            <button type="button" onClick={scrollToTop}>
              <ArrowUp aria-hidden="true" /> Volver arriba
            </button>
          </footer>
        </article>
      </div>
    </section>
  );
}

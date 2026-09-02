import { useEffect, useState } from "react";
import {
  ArrowUp,
  BookOpenCheck,
  CalendarDays,
  Check,
  FileDown,
  HelpCircle,
  Info,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "@/routes/route-paths";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./TermsAndConditionsPage.module.css";

type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LAST_UPDATED = "2 de septiembre de 2026";

const termsSections: TermsSection[] = [
  {
    id: "aceptacion",
    title: "1. Aceptación de los términos",
    paragraphs: [
      "Al crear una cuenta, ingresar o utilizar Cashgo, confirmas que has leído y aceptas estos Términos y condiciones. Si administras una cuenta en nombre de un negocio, declaras que cuentas con autorización para aceptar estas condiciones en su representación.",
      "Si no estás de acuerdo con alguna de estas condiciones, debes abstenerte de utilizar la plataforma.",
    ],
  },
  {
    id: "servicio",
    title: "2. Descripción del servicio",
    paragraphs: [
      "Cashgo es una plataforma de gestión comercial que centraliza herramientas para operar un negocio, como ventas, productos, inventario, movimientos, facturación, cotizaciones, gastos, contactos, equipo y reportes, según los módulos habilitados para cada cuenta.",
      "Las funcionalidades disponibles pueden variar de acuerdo con el tipo de negocio, el rol del usuario, el plan contratado y las actualizaciones de la plataforma.",
    ],
  },
  {
    id: "cuenta",
    title: "3. Cuenta, acceso y seguridad",
    paragraphs: [
      "Eres responsable de proporcionar información correcta y mantener actualizados los datos de tu cuenta y de tus negocios. También debes proteger tus credenciales y limitar el acceso a personas autorizadas.",
    ],
    bullets: [
      "No compartas códigos de acceso, contraseñas ni sesiones activas.",
      "Asigna a cada integrante del equipo el rol que corresponda a sus funciones.",
      "Informa oportunamente cualquier uso no autorizado o incidente de seguridad.",
    ],
  },
  {
    id: "uso",
    title: "4. Uso permitido y responsabilidades",
    paragraphs: [
      "Debes utilizar Cashgo de forma lícita y de acuerdo con la operación real de tu negocio. Eres responsable de revisar la información registrada y de cumplir las obligaciones comerciales, contables, tributarias, laborales y de protección al consumidor que te correspondan.",
    ],
    bullets: [
      "No intentes vulnerar, interferir o acceder sin autorización a la plataforma.",
      "No utilices Cashgo para actividades fraudulentas, engañosas o contrarias a la ley.",
      "No cargues contenido malicioso ni información sobre la cual no tengas autorización.",
    ],
  },
  {
    id: "informacion",
    title: "5. Información y datos del negocio",
    paragraphs: [
      "Conservas la titularidad y responsabilidad sobre la información que registras en Cashgo. Nos autorizas a tratarla en la medida necesaria para prestar, proteger, mantener y mejorar el servicio.",
      "Debes contar con las autorizaciones necesarias para registrar datos de clientes, empleados, proveedores u otros terceros. El tratamiento de datos personales se complementa con la Política de privacidad de Cashgo.",
    ],
  },
  {
    id: "planes",
    title: "6. Planes, pagos y facturación",
    paragraphs: [
      "Algunas funcionalidades pueden requerir un plan de pago. Antes de contratarlo se mostrarán el precio, la periodicidad y las condiciones aplicables. Los cobros, renovaciones y cambios de plan se gestionarán conforme a la información presentada durante el proceso de contratación.",
      "Salvo que se indique expresamente lo contrario, los valores generados dentro de los módulos operativos son registros del negocio y no representan pagos procesados directamente por Cashgo.",
    ],
  },
  {
    id: "disponibilidad",
    title: "7. Disponibilidad y actualizaciones",
    paragraphs: [
      "Trabajamos para mantener Cashgo disponible y seguro, pero pueden presentarse interrupciones por mantenimiento, actualizaciones, fallas de terceros o situaciones fuera de nuestro control. Cuando sea posible, comunicaremos los cambios que afecten de forma relevante el uso del servicio.",
    ],
  },
  {
    id: "propiedad",
    title: "8. Propiedad intelectual",
    paragraphs: [
      "Cashgo, su identidad visual, software, documentación y contenidos propios están protegidos por las normas aplicables de propiedad intelectual. El acceso a la plataforma no transfiere derechos de propiedad ni autoriza su copia, reventa, ingeniería inversa o explotación no permitida.",
    ],
  },
  {
    id: "suspension",
    title: "9. Suspensión o terminación",
    paragraphs: [
      "Podemos limitar o suspender el acceso cuando sea necesario para proteger la plataforma, prevenir fraude, atender una obligación legal o responder a un incumplimiento relevante de estos términos. El usuario puede dejar de utilizar Cashgo cuando lo decida, sujeto a las obligaciones pendientes de su plan o cuenta.",
    ],
  },
  {
    id: "responsabilidad",
    title: "10. Alcance de responsabilidad",
    paragraphs: [
      "Cashgo facilita la organización de información y procesos del negocio, pero no reemplaza el criterio profesional contable, tributario, jurídico o financiero. El usuario debe verificar los datos, comprobantes, impuestos, precios y decisiones que gestione mediante la plataforma.",
      "La responsabilidad de Cashgo se determinará conforme a la legislación aplicable y a la naturaleza del servicio efectivamente contratado.",
    ],
  },
  {
    id: "cambios",
    title: "11. Cambios a estos términos",
    paragraphs: [
      "Podemos actualizar estos términos para reflejar cambios del servicio, requisitos legales o mejoras de seguridad. La fecha de la versión vigente siempre aparecerá al inicio de esta página. Si el cambio es relevante, procuraremos comunicarlo por los medios disponibles en la cuenta.",
    ],
  },
  {
    id: "contacto",
    title: "12. Preguntas y contacto",
    paragraphs: [
      "Si tienes preguntas sobre estos términos, puedes consultar el Centro de ayuda o comunicarte con el equipo de soporte mediante los canales oficiales disponibles dentro de Cashgo.",
    ],
  },
];

export function TermsAndConditionsPage() {
  const [activeSection, setActiveSection] = useState(termsSections[0].id);

  useEffect(() => {
    const sections = termsSections
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

  function printTerms() {
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
            <Scale aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Información legal</p>
            <h1>Términos y condiciones</h1>
            <p className={styles.heroDescription}>
              Reglas claras para utilizar Cashgo y administrar tu negocio con
              confianza.
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
          <button className={styles.printButton} type="button" onClick={printTerms}>
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
          <strong>Antes de comenzar</strong>
          <p>
            Este documento explica las condiciones generales de uso de Cashgo.
            Léelo con atención antes de crear o administrar una cuenta.
          </p>
        </div>
        <div className={styles.summaryPoints}>
          <span><ShieldCheck aria-hidden="true" /> Uso responsable</span>
          <span><LockKeyhole aria-hidden="true" /> Protección de acceso</span>
          <span><BookOpenCheck aria-hidden="true" /> Información transparente</span>
        </div>
      </div>

      <div className={styles.mobileIndex}>
        <label htmlFor="terms-section">Ir a una sección</label>
        <select
          id="terms-section"
          value={activeSection}
          onChange={(event) => {
            const sectionId = event.target.value;
            setActiveSection(sectionId);
            document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {termsSections.map((section) => (
            <option key={section.id} value={section.id}>{section.title}</option>
          ))}
        </select>
      </div>

      <div className={styles.layout}>
        <aside className={styles.indexCard}>
          <p className={styles.indexEyebrow}>En esta página</p>
          <nav aria-label="Contenido de términos y condiciones">
            {termsSections.map((section) => (
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
            <h2>Condiciones generales de uso de Cashgo</h2>
            <p>
              Estos términos se aplican al acceso y uso de la plataforma Cashgo,
              tanto desde su versión web como desde las experiencias vinculadas
              que pongamos a disposición de los usuarios.
            </p>
          </div>

          <div className={styles.sections}>
            {termsSections.map((section) => (
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
                  <Link className={styles.helpLink} to={routePaths.help}>
                    <HelpCircle aria-hidden="true" />
                    Ir al Centro de ayuda
                  </Link>
                ) : null}
              </section>
            ))}
          </div>

          <footer className={styles.documentFooter}>
            <div>
              <strong>¿Terminaste de leer?</strong>
              <p>Puedes volver a consultar este documento desde el menú Ayuda.</p>
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

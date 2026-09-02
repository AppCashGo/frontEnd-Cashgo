import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Library,
  PlayCircle,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import helpGuides from "@/modules/help/data/help-guides.json";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./HelpCenterPage.module.css";

const WATCHED_STORAGE_KEY = "cashgo-help-watched";
const allCategoriesLabel = "Todos";

type HelpGuide = (typeof helpGuides)[number];

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readWatchedGuides() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const storedValue = window.localStorage.getItem(WATCHED_STORAGE_KEY);
    const parsedValue = storedValue ? (JSON.parse(storedValue) as unknown) : [];

    return new Set(
      Array.isArray(parsedValue)
        ? parsedValue.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategoriesLabel);
  const [selectedGuideId, setSelectedGuideId] = useState(helpGuides[0].id);
  const [watchedGuides, setWatchedGuides] = useState(readWatchedGuides);
  const viewerRef = useRef<HTMLElement | null>(null);
  const categories = useMemo(
    () => [
      allCategoriesLabel,
      ...Array.from(new Set(helpGuides.map((guide) => guide.category))),
    ],
    [],
  );
  const filteredGuides = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return helpGuides.filter((guide) => {
      const matchesCategory =
        category === allCategoriesLabel || guide.category === category;
      const searchableText = normalizeSearchText(
        [
          guide.title,
          guide.shortTitle,
          guide.category,
          guide.description,
          ...guide.goals,
        ].join(" "),
      );

      return matchesCategory &&
        (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [category, query]);
  const selectedGuide =
    helpGuides.find((guide) => guide.id === selectedGuideId) ?? helpGuides[0];
  const progress = Math.round((watchedGuides.size / helpGuides.length) * 100);

  function selectGuide(guide: HelpGuide) {
    setSelectedGuideId(guide.id);

    if (window.matchMedia("(max-width: 1080px)").matches) {
      window.requestAnimationFrame(() => {
        viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function markGuideAsWatched(guideId: string) {
    setWatchedGuides((currentGuides) => {
      const nextGuides = new Set(currentGuides);
      nextGuides.add(guideId);
      window.localStorage.setItem(
        WATCHED_STORAGE_KEY,
        JSON.stringify(Array.from(nextGuides)),
      );
      return nextGuides;
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroIcon}>
            <BookOpen aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Centro de ayuda</p>
            <h1>Aprende a usar Cashgo</h1>
            <p className={styles.heroDescription}>
              Recorridos animados sobre la interfaz real, con cursor, clics y
              narración en español, más una guía descargable para cada módulo.
            </p>
          </div>
        </div>

        <div className={styles.heroMetrics} aria-label="Contenido disponible">
          <div>
            <strong>{helpGuides.length}</strong>
            <span>Videos guiados</span>
          </div>
          <div>
            <strong>{helpGuides.length}</strong>
            <span>Guías en PDF</span>
          </div>
          <div>
            <strong>{progress}%</strong>
            <span>Tu progreso</span>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>Buscar una guía</span>
          <input
            placeholder="Busca por módulo o tarea..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className={styles.categories} aria-label="Categorías" role="list">
          {categories.map((categoryOption) => (
            <button
              className={joinClassNames(
                styles.categoryChip,
                category === categoryOption && styles.categoryChipActive,
              )}
              key={categoryOption}
              type="button"
              onClick={() => setCategory(categoryOption)}
            >
              {categoryOption}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.workspace}>
        <section className={styles.library} aria-labelledby="tutorial-library-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>Biblioteca</p>
              <h2 id="tutorial-library-title">Guías por módulo</h2>
            </div>
            <span className={styles.resultCount}>{filteredGuides.length} resultados</span>
          </div>

          {filteredGuides.length > 0 ? (
            <div className={styles.guideList}>
              {filteredGuides.map((guide) => {
                const isSelected = selectedGuide.id === guide.id;
                const isWatched = watchedGuides.has(guide.id);

                return (
                  <article
                    className={joinClassNames(
                      styles.guideCard,
                      isSelected && styles.guideCardActive,
                    )}
                    key={guide.id}
                  >
                    <button
                      aria-label={`Ver tutorial: ${guide.title}`}
                      className={styles.guideSelect}
                      type="button"
                      onClick={() => selectGuide(guide)}
                    >
                      <span className={styles.playBadge}>
                        {isWatched ? (
                          <CheckCircle2 aria-hidden="true" />
                        ) : (
                          <PlayCircle aria-hidden="true" />
                        )}
                      </span>
                      <span className={styles.guideCopy}>
                        <span className={styles.guideMeta}>
                          <span>{guide.category}</span>
                          <span>
                            <Clock3 aria-hidden="true" /> {guide.duration}
                          </span>
                        </span>
                        <strong>{guide.shortTitle}</strong>
                        <span>{guide.description}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className={styles.guideArrow} />
                    </button>

                    <a className={styles.cardDownload} download href={guide.pdfSrc}>
                      <FileText aria-hidden="true" />
                      Descargar PDF
                    </a>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search aria-hidden="true" />
              <h3>No encontramos esa guía</h3>
              <p>Prueba con otra palabra o selecciona una categoría diferente.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(allCategoriesLabel);
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        <aside className={styles.viewer} ref={viewerRef} aria-label="Tutorial seleccionado">
          <div className={styles.videoFrame}>
            <video
              controls
              key={selectedGuide.id}
              preload="metadata"
              src={selectedGuide.videoSrc}
              onEnded={() => markGuideAsWatched(selectedGuide.id)}
            >
              Tu navegador no puede reproducir este video.
            </video>
          </div>

          <div className={styles.viewerBody}>
            <div className={styles.viewerHeading}>
              <div>
                <p className={styles.sectionEyebrow}>{selectedGuide.category}</p>
                <h2>{selectedGuide.title}</h2>
              </div>
              <span className={styles.durationBadge}>
                <Clock3 aria-hidden="true" /> {selectedGuide.duration}
              </span>
            </div>

            <p className={styles.viewerDescription}>{selectedGuide.description}</p>

            <div className={styles.learningBlock}>
              <h3>En este tutorial aprenderás</h3>
              <ul>
                {selectedGuide.goals.map((goal) => (
                  <li key={goal}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.viewerActions}>
              <a className={styles.primaryAction} download href={selectedGuide.pdfSrc}>
                <Download aria-hidden="true" />
                Descargar guía PDF
              </a>
              <Link className={styles.secondaryAction} to={selectedGuide.route}>
                Abrir módulo
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className={styles.guideSummary}>
              <Library aria-hidden="true" />
              <div>
                <strong>Guía de uso y configuración incluida</strong>
                <span>
                  Incluye la ruta del módulo, objetivos, paso a paso y buenas prácticas.
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

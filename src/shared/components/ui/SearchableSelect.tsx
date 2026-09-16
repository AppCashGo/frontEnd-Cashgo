import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./SearchableSelect.module.css";

type SearchableOption = {
  disabled: boolean;
  key: string;
  label: string;
  value: string;
};

type SearchableSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
> & {
  emptyMessage?: string;
  searchPlaceholder?: string;
};

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  return Children.toArray(node).map(getNodeText).join("").trim();
}

function getOptions(children: ReactNode): SearchableOption[] {
  const options: SearchableOption[] = [];

  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) {
        return;
      }

      if (node.type === Fragment || node.type === "optgroup") {
        visit(node.props.children as ReactNode);
        return;
      }

      if (node.type !== "option") {
        return;
      }

      const label = getNodeText(node.props.children as ReactNode);
      const value = String(node.props.value ?? label);
      options.push({
        disabled: Boolean(node.props.disabled),
        key: `${value}-${options.length}`,
        label,
        value,
      });
    });
  }

  visit(children);
  return options;
}

function normalizeValue(value: SelectHTMLAttributes<HTMLSelectElement>["value"]) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  return value === undefined || value === null ? "" : String(value);
}

export const SearchableSelect = forwardRef<
  HTMLSelectElement,
  SearchableSelectProps
>(function SearchableSelect(
  {
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-label": ariaLabel,
    autoFocus,
    children,
    className,
    defaultValue,
    disabled,
    emptyMessage,
    id,
    onBlur,
    onChange,
    onFocus,
    required,
    searchPlaceholder,
    style,
    title,
    value,
    ...selectProps
  },
  forwardedRef,
) {
  const generatedId = useId();
  const selectId = id ?? `searchable-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => getOptions(children), [children]);
  const fallbackValue =
    normalizeValue(defaultValue) || options.find((option) => !option.disabled)?.value || "";
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0,
    width: 240,
  });
  const currentValue = isControlled ? normalizeValue(value) : internalValue;
  const selectedOption = options.find((option) => option.value === currentValue);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalizedQuery),
  );
  const isEnglish =
    typeof document !== "undefined" &&
    document.documentElement.lang.toLocaleLowerCase().startsWith("en");

  useImperativeHandle(forwardedRef, () => nativeSelectRef.current as HTMLSelectElement);

  useEffect(() => {
    if (autoFocus) {
      triggerRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isControlled || options.length === 0) {
      return;
    }

    const nativeValue = nativeSelectRef.current?.value;
    if (nativeValue !== undefined && nativeValue !== internalValue) {
      setInternalValue(nativeValue);
      return;
    }

    if (!options.some((option) => option.value === internalValue)) {
      setInternalValue(fallbackValue);
    }
  }, [fallbackValue, internalValue, isControlled, options]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const estimatedHeight = Math.min(340, window.innerHeight * 0.52);
      const openAbove =
        window.innerHeight - rect.bottom < estimatedHeight &&
        rect.top > window.innerHeight - rect.bottom;

      setMenuPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: openAbove
          ? Math.max(8, rect.top - estimatedHeight - 6)
          : Math.min(window.innerHeight - 8, rect.bottom + 6),
        width: Math.max(rect.width, 220),
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    window.requestAnimationFrame(() => searchRef.current?.focus());

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  function closeMenu({ restoreFocus = false } = {}) {
    setIsOpen(false);
    setQuery("");
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function commitValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    const nativeSelect = nativeSelectRef.current;
    if (nativeSelect) {
      nativeSelect.value = nextValue;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    closeMenu({ restoreFocus: true });
  }

  function handleNativeChange(event: ChangeEvent<HTMLSelectElement>) {
    if (!isControlled) {
      setInternalValue(event.target.value);
    }
    onChange?.(event);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-required={required}
        className={joinClassNames(styles.trigger, className)}
        disabled={disabled}
        id={selectId}
        ref={triggerRef}
        style={style}
        title={title}
        type="button"
        onClick={() => {
          if (!disabled) {
            setQuery("");
            setIsOpen((current) => !current);
          }
        }}
        onFocus={() => {
          const nativeValue = nativeSelectRef.current?.value;
          if (!isControlled && nativeValue !== undefined) {
            setInternalValue(nativeValue);
          }
          nativeSelectRef.current?.dispatchEvent(
            new FocusEvent("focusin", { bubbles: true }),
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className={styles.value}>{selectedOption?.label ?? "—"}</span>
        <span
          aria-hidden="true"
          className={joinClassNames(
            styles.chevron,
            isOpen ? styles.chevronOpen : undefined,
          )}
        />
      </button>

      <select
        {...selectProps}
        aria-hidden="true"
        className={styles.nativeSelect}
        defaultValue={isControlled ? undefined : defaultValue}
        disabled={disabled}
        ref={nativeSelectRef}
        required={required}
        tabIndex={-1}
        value={isControlled ? value : undefined}
        onBlur={onBlur}
        onChange={handleNativeChange}
        onFocus={onFocus}
      >
        {children}
      </select>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.menu}
              ref={menuRef}
              style={{
                left: menuPosition.left,
                top: menuPosition.top,
                width: menuPosition.width,
              }}
            >
              <div className={styles.searchWrap}>
                <Search aria-hidden="true" className={styles.searchIcon} />
                <input
                  aria-controls={listboxId}
                  aria-label={searchPlaceholder ?? (isEnglish ? "Search options" : "Buscar opciones")}
                  className={styles.search}
                  placeholder={searchPlaceholder ?? (isEnglish ? "Search..." : "Buscar...")}
                  ref={searchRef}
                  role="combobox"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeMenu({ restoreFocus: true });
                    }
                    if (event.key === "Enter") {
                      const firstOption = filteredOptions.find((option) => !option.disabled);
                      if (firstOption) {
                        event.preventDefault();
                        commitValue(firstOption.value);
                      }
                    }
                  }}
                />
              </div>
              <div className={styles.options} id={listboxId} role="listbox">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      aria-selected={option.value === currentValue}
                      className={joinClassNames(
                        styles.option,
                        option.value === currentValue
                          ? styles.optionSelected
                          : undefined,
                      )}
                      disabled={option.disabled}
                      key={option.key}
                      role="option"
                      type="button"
                      onClick={() => commitValue(option.value)}
                    >
                      {option.label}
                    </button>
                  ))
                ) : (
                  <p className={styles.empty}>
                    {emptyMessage ??
                      (isEnglish ? "No matching options" : "No hay opciones coincidentes")}
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});

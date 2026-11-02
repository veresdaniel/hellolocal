import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ColumnFilterComboboxProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
};

/**
 * Column filter that lists the values already in the column and still accepts free text.
 */
export function ColumnFilterCombobox({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
}: ColumnFilterComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipOpenOnFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [armed, setArmed] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 });

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, value]);

  useEffect(() => {
    setActive(0);
    setArmed(false);
  }, [value]);

  useLayoutEffect(() => {
    if (!open) {
      setBox((current) => (current.width === 0 ? current : { top: 0, left: 0, width: 0 }));
      return;
    }
    const place = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
      setBox({ top: rect.bottom + 4, left, width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: "nearest",
    });
  }, [active, open, matches]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    inputRef.current?.focus();
  };

  const showList = open && matches.length > 0;

  return (
    <div ref={rootRef} className="admin-data-table__filter">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          if (skipOpenOnFocus.current) {
            skipOpenOnFocus.current = false;
            return;
          }
          setOpen(true);
          setActive(0);
          setArmed(false);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setArmed(true);
            if (!open) {
              setOpen(true);
              setActive(0);
              return;
            }
            setActive((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setArmed(true);
            if (!open) {
              setOpen(true);
              setActive(Math.max(matches.length - 1, 0));
              return;
            }
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && armed && showList && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {options.length > 0 ? (
        <button
          type="button"
          className="admin-data-table__filter-toggle"
          aria-hidden="true"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((current) => {
              if (current) skipOpenOnFocus.current = true;
              return !current;
            });
            inputRef.current?.focus();
          }}
        >
          ▾
        </button>
      ) : null}
      {showList && box.width > 0
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              className="admin-data-table__filter-menu"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              {matches.map((option, index) => (
                <li key={option} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={option === value}
                    data-active={index === active ? "true" : "false"}
                    className={`admin-data-table__filter-option${index === active ? " is-active" : ""}`}
                    title={option}
                    onMouseEnter={() => {
                      setArmed(true);
                      setActive(index);
                    }}
                    onClick={() => choose(option)}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
}

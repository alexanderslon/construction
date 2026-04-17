import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toJpeg } from "html-to-image";

interface RowData {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  workerPrice: number;
  upperPrice: number;
  column1: string;
}

interface HeaderData {
  city: string;
  address: string;
  customerName: string;
  customerPhone: string;
  squareMeters: string;
  documentNumber: string;
  date: string;
}

interface DocState {
  header: HeaderData;
  rows: RowData[];
  prepayment: string;
  laborer: string;
  otkat: string;
}

const initialRows: RowData[] = [
  { id: 1, name: "Монтаж электрического тёплого пола 1 этаж", unit: "м²", quantity: 10.71, workerPrice: 0, upperPrice: 1200, column1: "" },
  { id: 2, name: "Монтаж электрического тёплого пола 2 этаж (новое)", unit: "м²", quantity: 13, workerPrice: 0, upperPrice: 1200, column1: "" },
  { id: 3, name: "Укладка керамогранита 600×600 на пол 1 этажа (с подрезкой)", unit: "м²", quantity: 21.3, workerPrice: 2500, upperPrice: 3380, column1: "" },
  { id: 4, name: "Затирка швов пола (керамогранит)", unit: "м²", quantity: 21.3, workerPrice: 100, upperPrice: 500, column1: "" },
  { id: 5, name: "Наливной (самовыравнивающийся) пол 2 этаж", unit: "м²", quantity: 22.48, workerPrice: 0, upperPrice: 600, column1: "" },
  { id: 6, name: "Укладка ламината 2 этаж", unit: "м²", quantity: 22.48, workerPrice: 0, upperPrice: 900, column1: "" },
  { id: 7, name: "Монтаж плинтуса (под ламинат)", unit: "м.п.", quantity: 26, workerPrice: 0, upperPrice: 450, column1: "" },
  { id: 8, name: "Шлифовка стен под покраску (после шпаклёвки)", unit: "м²", quantity: 108, workerPrice: 200, upperPrice: 300, column1: "" },
  { id: 9, name: "Локальная доработка шпаклёвки / подмазка", unit: "м²", quantity: 108, workerPrice: 350, upperPrice: 400, column1: "" },
  { id: 10, name: "Грунтование стен под покраску", unit: "м²", quantity: 108, workerPrice: 0, upperPrice: 100, column1: "" },
  { id: 11, name: "Покраска стен (белый цвет, 2 слоя)", unit: "м²", quantity: 108, workerPrice: 500, upperPrice: 600, column1: "" },
  { id: 12, name: "Натяжной потолок (монтаж, белый матовый) — 1+2 этаж", unit: "м²", quantity: 42.49, workerPrice: 0, upperPrice: 1200, column1: "" },
  { id: 13, name: "Установка унитаза", unit: "шт.", quantity: 1, workerPrice: 0, upperPrice: 5000, column1: "" },
  { id: 14, name: "Установка тумбы с раковиной (подключение)", unit: "шт.", quantity: 1, workerPrice: 0, upperPrice: 7000, column1: "" },
  { id: 15, name: "Установка душевого ограждения", unit: "шт.", quantity: 1, workerPrice: 0, upperPrice: 9500, column1: "" },
  { id: 16, name: "Установка гигиенического душа (новое)", unit: "шт.", quantity: 1, workerPrice: 0, upperPrice: 3500, column1: "" },
  { id: 17, name: "Установка тропического (верхнего) душа (новое)", unit: "шт.", quantity: 1, workerPrice: 0, upperPrice: 6000, column1: "" },
  { id: 18, name: "Установка межкомнатной двери в санузел", unit: "шт.", quantity: 2, workerPrice: 0, upperPrice: 9000, column1: "" },
  { id: 19, name: "Облицовка лестницы деревянными ступенями (работа)", unit: "ступ.", quantity: 8, workerPrice: 0, upperPrice: 6000, column1: "" },
  { id: 20, name: "Установка розеток / выключателей / проходных / бра", unit: "шт.", quantity: 38, workerPrice: 0, upperPrice: 500, column1: "" },
  { id: 21, name: "Вывоз строительного мусора (новое)", unit: "—", quantity: 1, workerPrice: 6000, upperPrice: 22000, column1: "" },
  { id: 22, name: "Накладные расходы", unit: "", quantity: 1, workerPrice: 0, upperPrice: 38000, column1: "" },
];

let nextId = 100;

const PREVIEW_STORAGE_PREFIX = "smeta_doc:";

function makePreviewKey(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${PREVIEW_STORAGE_PREFIX}${id}`;
}

function safeFilename(s: string): string {
  return s.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v
      .replaceAll("\u00A0", " ")
      .replace(/\s+/g, "")
      .replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmt(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  if (safe === 0) return "0";
  return safe.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function EditableCell({
  value,
  onChange,
  isNumber,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  isNumber?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    if (isNumber) {
      const parsed = toNumber(draft);
      onChange(String(parsed));
    } else {
      onChange(draft);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm outline-none ${className ?? ""}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <div
      className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-50 min-h-[28px] flex items-center ${className ?? ""}`}
      onDoubleClick={startEdit}
      title="Двойной клик для редактирования"
    >
      {isNumber ? fmt(parseFloat(value) || 0) : value}
    </div>
  );
}

export default function App() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isPreview = useMemo(() => new URLSearchParams(search).get("preview") === "1", [search]);
  const previewKey = useMemo(() => new URLSearchParams(search).get("doc") ?? "", [search]);

  const [header, setHeader] = useState<HeaderData>({
    city: "Москва",
    address: "",
    customerName: "",
    customerPhone: "",
    squareMeters: "",
    documentNumber: "СМ-001",
    date: new Date().toISOString().slice(0, 10),
  });

  const [rows, setRows] = useState<RowData[]>(initialRows);
  const [prepayment, setPrepayment] = useState<string>("5000");
  const [laborer, setLaborer] = useState<string>("0");
  const [otkat, setOtkat] = useState<string>("5000");
  const draggingRowIdRef = useRef<number | null>(null);
  const printContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isPreview) return;
    if (!previewKey) return;
    const raw = localStorage.getItem(previewKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DocState;
      if (parsed?.header) setHeader(parsed.header);
      if (parsed?.rows) setRows(parsed.rows);
      if (typeof parsed?.prepayment === "string") setPrepayment(parsed.prepayment);
      if (typeof parsed?.laborer === "string") setLaborer(parsed.laborer);
      if (typeof parsed?.otkat === "string") setOtkat(parsed.otkat);
    } catch {
      // ignore malformed storage
    }
  }, [isPreview, previewKey]);

  const updateRow = useCallback((id: number, field: keyof RowData, value: string | number) => {
    const numericFields: ReadonlySet<keyof RowData> = new Set(["quantity", "workerPrice", "upperPrice"]);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (numericFields.has(field)) {
          return { ...r, [field]: toNumber(value) };
        }
        return { ...r, [field]: String(value) };
      })
    );
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: nextId++,
        name: "Новая позиция",
        unit: "шт.",
        quantity: 1,
        workerPrice: 0,
        upperPrice: 0,
        column1: "",
      },
    ]);
  };

  const deleteRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const reorderRows = useCallback((fromId: number, toId: number) => {
    if (fromId === toId) return;
    setRows((prev) => {
      const fromIdx = prev.findIndex((r) => r.id === fromId);
      const toIdx = prev.findIndex((r) => r.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    const totalUpperSum = rows.reduce((s, r) => s + toNumber(r.quantity) * toNumber(r.upperPrice), 0);
    const totalWorkerSum = rows.reduce((s, r) => s + toNumber(r.quantity) * toNumber(r.workerPrice), 0);
    const prepaymentN = toNumber(prepayment);
    const laborerN = toNumber(laborer);
    const otkatN = toNumber(otkat);
    const totalExpenses = totalWorkerSum + laborerN + otkatN;
    const myIncome = totalUpperSum - totalExpenses;
    const toPay = totalUpperSum - prepaymentN;
    return {
      totalUpperSum,
      totalWorkerSum,
      prepaymentN,
      laborerN,
      otkatN,
      totalExpenses,
      myIncome,
      toPay,
    };
  }, [rows, prepayment, laborer, otkat]);

  const renderPrintDocument = () => (
    <>
      <div className="print-header mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">СМЕТА НА СТРОИТЕЛЬНО-РЕМОНТНЫЕ РАБОТЫ</h1>
            <p className="text-sm text-gray-600 mt-1">
              Документ № {header.documentNumber} от {header.date}
            </p>
          </div>
          <div className="text-right text-sm text-gray-700">
            {header.city && <p>г. {header.city}</p>}
            {header.address && <p>{header.address}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-800 border-t border-gray-300 pt-3">
          <div><span className="font-semibold">Заказчик:</span> {header.customerName || "—"}</div>
          <div><span className="font-semibold">Телефон:</span> {header.customerPhone || "—"}</div>
          <div><span className="font-semibold">Адрес объекта:</span> {header.address || "—"}</div>
          <div><span className="font-semibold">Площадь:</span> {header.squareMeters || "—"} м²</div>
        </div>
      </div>

      {renderTable(true)}

      <div className="mt-6">
        <div className="border-t-2 border-gray-400 pt-4 mt-4">
          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600">Итого по работам:</div>
              <div className="text-2xl font-extrabold text-gray-900">{fmt(totals.totalUpperSum)} ₽</div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-8">Подпись заказчика</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-8">Подпись подрядчика</div>
          </div>
        </div>
      </div>
    </>
  );

  const openPreview = () => {
    const key = makePreviewKey();
    const state: DocState = { header, rows, prepayment, laborer, otkat };
    localStorage.setItem(key, JSON.stringify(state));

    const url = new URL(window.location.href);
    url.searchParams.set("preview", "1");
    url.searchParams.set("doc", key);
    window.open(url.toString(), "_blank");
  };

  const downloadJpg = async () => {
    const el = printContentRef.current;
    if (!el) return;

    const baseName = safeFilename(`smeta-${header.documentNumber || "doc"}-${header.date || ""}`) || "smeta";
    const dataUrl = await toJpeg(el, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${baseName}.jpg`;
    a.click();
  };

  const headerField = (key: keyof HeaderData, label: string, placeholder: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
        placeholder={placeholder}
        value={header[key]}
        onChange={(e) => setHeader((h) => ({ ...h, [key]: e.target.value }))}
      />
    </div>
  );

  const renderTable = (printMode = false) => {
    const cellPad = printMode ? "px-2 py-1" : "px-1 py-1";
    const textSize = printMode ? "text-[11px]" : "text-sm";

    return (
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse print-table ${textSize}`}>
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <th className={`border border-blue-700 ${cellPad} w-10 text-center`}>№</th>
              <th className={`border border-blue-700 ${cellPad} min-w-[200px]`}>Наименование работ</th>
              <th className={`border border-blue-700 ${cellPad} w-16 text-center`}>Ед. изм.</th>
              <th className={`border border-blue-700 ${cellPad} w-16 text-center`}>Кол-во</th>
              {!printMode && (
                <>
                  <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Цена работника</th>
                  <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Сумма работника</th>
                </>
              )}
              <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Цена, ₽</th>
              <th className={`border border-blue-700 ${cellPad} w-28 text-center`}>Сумма, ₽</th>
              {!printMode && <th className={`border border-blue-700 ${cellPad} w-28 text-center`}>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const qty = toNumber(row.quantity);
              const workerPrice = toNumber(row.workerPrice);
              const upperPrice = toNumber(row.upperPrice);
              const wSum = qty * workerPrice;
              const uSum = qty * upperPrice;
              return (
                <tr
                  key={row.id}
                  draggable={!printMode}
                  onDragStart={() => {
                    if (printMode) return;
                    draggingRowIdRef.current = row.id;
                  }}
                  onDragEnd={() => {
                    draggingRowIdRef.current = null;
                  }}
                  onDragOver={(e) => {
                    if (printMode) return;
                    // allow drop
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (printMode) return;
                    const fromId = draggingRowIdRef.current;
                    if (fromId == null) return;
                    reorderRows(fromId, row.id);
                    draggingRowIdRef.current = null;
                  }}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}
                >
                  <td className={`border border-gray-300 ${cellPad} text-center font-medium text-gray-600`}>
                    {idx + 1}
                  </td>
                  <td className={`border border-gray-300 ${cellPad}`}>
                    <EditableCell
                      value={row.name}
                      onChange={(v) => updateRow(row.id, "name", v)}
                      className={textSize}
                    />
                  </td>
                  <td className={`border border-gray-300 ${cellPad} text-center`}>
                    <EditableCell
                      value={row.unit}
                      onChange={(v) => updateRow(row.id, "unit", v)}
                      className={`${textSize} text-center`}
                    />
                  </td>
                  <td className={`border border-gray-300 ${cellPad} text-center`}>
                    <EditableCell
                      value={String(qty)}
                      onChange={(v) => updateRow(row.id, "quantity", v)}
                      isNumber
                      className={`${textSize} text-center`}
                    />
                  </td>
                  {!printMode && (
                    <>
                      <td className={`border border-gray-300 ${cellPad} text-center`}>
                        <EditableCell
                          value={String(workerPrice)}
                          onChange={(v) => updateRow(row.id, "workerPrice", v)}
                          isNumber
                          className={`${textSize} text-right`}
                        />
                      </td>
                      <td className={`border border-gray-300 ${cellPad} text-right font-medium ${wSum > 0 ? "text-amber-700" : "text-gray-400"}`}>
                        {fmt(wSum)}
                      </td>
                    </>
                  )}
                  <td className={`border border-gray-300 ${cellPad} text-center`}>
                    <EditableCell
                      value={String(upperPrice)}
                      onChange={(v) => updateRow(row.id, "upperPrice", v)}
                      isNumber
                      className={`${textSize} text-right`}
                    />
                  </td>
                  <td className={`border border-gray-300 ${cellPad} text-right font-bold text-blue-800`}>
                    {fmt(uSum)}
                  </td>
                  {!printMode && (
                    <td className={`border border-gray-300 ${cellPad} text-center no-print`}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
                          title="Перетащите строку"
                          onMouseDown={() => {
                            // ensure the next dragstart comes from this row
                            draggingRowIdRef.current = row.id;
                          }}
                          onClick={(e) => e.preventDefault()}
                          type="button"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M7 4a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM7 10a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM7 16a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-bold">
              <td colSpan={printMode ? 4 : 6} className={`border border-gray-300 ${cellPad} text-right text-blue-800`}>
                ИТОГО по работам:
              </td>
              {!printMode && (
                <td className={`border border-gray-300 ${cellPad} text-right text-amber-700`}>
                  {fmt(totals.totalWorkerSum)}
                </td>
              )}
              <td className={`border border-gray-300 ${cellPad} text-right text-blue-900 text-base`}>
                {fmt(totals.totalUpperSum)}
              </td>
              {!printMode && <td className="border border-gray-300 no-print"></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  if (isPreview) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition active:scale-95"
            type="button"
          >
            Печать / PDF
          </button>
          <button
            onClick={() => void downloadJpg()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition active:scale-95"
            type="button"
          >
            Скачать JPG
          </button>
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition active:scale-95"
            type="button"
          >
            Закрыть
          </button>
          <div className="ml-auto text-xs text-gray-500">
            Для PDF: «Печать / PDF» → «Сохранить как PDF»
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto p-4">
          <div ref={printContentRef} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
            {renderPrintDocument()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      <div data-print-root className="print-only">
        {renderPrintDocument()}
      </div>

      {/* ===== SCREEN LAYOUT ===== */}
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 print-container">
        {/* Header bar */}
        <div className="no-print mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                📋 Смета на работы
              </h1>
              <p className="text-gray-500 mt-1">Управление позициями и расчёт стоимости</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openPreview}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Предпросмотр
              </button>
            </div>
          </div>

          {/* Header fields card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Реквизиты документа
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {headerField("documentNumber", "№ документа", "СМ-001")}
              {headerField("date", "Дата", "2024-01-01")}
              {headerField("city", "Город", "Москва")}
              {headerField("address", "Адрес объекта", "ул. Примерная, д. 1")}
              {headerField("customerName", "Заказчик", "Иванов И.И.")}
              {headerField("customerPhone", "Телефон заказчика", "+7 (999) 123-45-67")}
              {headerField("squareMeters", "Площадь (м²)", "135")}
            </div>
          </div>
        </div>

        {/* Main table card (screen) */}
        <div className="no-print bg-white rounded-2xl shadow-md border border-gray-100 p-4 md:p-5 mb-6">
          {renderTable(false)}
          <div className="mt-4 flex justify-end">
            <button
              onClick={addRow}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Добавить позицию
            </button>
          </div>
        </div>

        {/* Bottom cards */}
        <div className="no-print grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Prepayment */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Предоплата
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold w-full focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
                value={prepayment}
                onChange={(e) => setPrepayment(e.target.value)}
              />
              <span className="text-gray-500 font-semibold">₽</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Итого к оплате:</span>
                <span className="font-bold text-green-700 text-lg">{fmt(totals.toPay)} ₽</span>
              </div>
            </div>
          </div>

          {/* Worker expenses */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Расходы на работников
            </h3>
            <div className="space-y-2">
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700">По таблице (сумма работника):</span>
                  <span className="font-extrabold text-amber-800">{fmt(totals.totalWorkerSum)} ₽</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-36 shrink-0">Разнорабочий:</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  value={laborer}
                  onChange={(e) => setLaborer(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-36 shrink-0">Откат:</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  value={otkat}
                  onChange={(e) => setOtkat(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Итого (работники + откат):</span>
                <span className="font-extrabold text-amber-700">{fmt(totals.totalExpenses)} ₽</span>
              </div>
            </div>
          </div>

          {/* My income */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-md p-5 text-white">
            <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Мой доход
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-blue-100 text-sm">
                <span>Общая сумма:</span>
                <span className="font-semibold">{fmt(totals.totalUpperSum)} ₽</span>
              </div>
              <div className="flex justify-between text-blue-100 text-sm">
                <span>Расходы:</span>
                <span className="font-semibold">{fmt(totals.totalExpenses)} ₽</span>
              </div>
              <div className="border-t border-blue-500 pt-2 mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-blue-200">Доход:</span>
                  <span className="text-3xl font-extrabold">{fmt(totals.myIncome)} ₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="no-print text-center text-gray-400 text-xs py-4 mt-4 border-t border-gray-200">
          Двойной клик по ячейке для редактирования · Все данные хранятся в браузере
        </div>
      </div>
    </div>
  );
}

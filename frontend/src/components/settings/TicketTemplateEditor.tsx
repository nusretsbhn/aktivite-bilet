import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

const ELEMENT_LABELS: Record<string, string> = {
  logo: "Logo",
  companyName: "Firma Adı",
  ticketNo: "Bilet No",
  ticketBadge: "Bilet Tipi (Yeni / Revize)",
  customerName: "Müşteri Adı",
  customerPhone: "Telefon",
  tourDate: "Tur Tarihi",
  activities: "Aktivite",
  activityNotes: "Aktivite Notu",
  personCount: "Kişi Sayısı",
  transfer: "Transfer",
  amount: "Tutar",
  paymentStatus: "Ödeme Durumu",
  qr: "QR Kod",
  footer: "Alt Bilgi",
};

const ALL_ELEMENTS = Object.keys(ELEMENT_LABELS);

type Template = {
  id: number;
  name: string;
  layout: {
    elements: string[];
    primaryColor?: string;
    showLogo?: boolean;
  };
  isDefault: boolean;
};

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card px-3"
      {...attributes}
      {...listeners}
    >
      <span className="text-subtle">⋮⋮</span>
      <span className="flex-1 font-medium">{ELEMENT_LABELS[id] ?? id}</span>
    </li>
  );
}

export function TicketTemplateEditor() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [elements, setElements] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [showLogo, setShowLogo] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: templates = [] } = useQuery({
    queryKey: ["ticket-templates"],
    queryFn: () =>
      apiFetch<{ templates: Template[] }>("/ticket-templates").then((r) => r.templates),
  });

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  useEffect(() => {
    if (templates.length && !selectedId) {
      const def = templates.find((t) => t.isDefault) ?? templates[0];
      setSelectedId(def.id);
    }
  }, [templates, selectedId]);

  useEffect(() => {
    if (selected?.layout) {
      setElements(selected.layout.elements ?? []);
      setPrimaryColor(selected.layout.primaryColor ?? "#0f766e");
      setShowLogo(selected.layout.showLogo ?? true);
    }
  }, [selected?.id, selected?.layout]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selected) return Promise.reject();
      return apiFetch(`/ticket-templates/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({
          layout: { elements, primaryColor, showLogo },
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-templates"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function toggleElement(el: string) {
    setElements((prev) =>
      prev.includes(el) ? prev.filter((e) => e !== el) : [...prev, el]
    );
  }

  return (
    <div className="space-y-4">
      {templates.length > 1 && (
        <select
          className="min-h-11 w-full rounded-lg border px-3"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.isDefault ? "(Varsayılan)" : ""}
            </option>
          ))}
        </select>
      )}

      <p className="text-sm text-muted">
        Sürükleyerek sıralayın. Bilet görselinde bu sıra kullanılır.
      </p>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showLogo}
          onChange={(e) => setShowLogo(e.target.checked)}
        />
        Logo göster
      </label>

      <label className="flex items-center gap-2 text-sm">
        Ana renk
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="h-10 w-14"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {ALL_ELEMENTS.map((el) => (
          <button
            key={el}
            type="button"
            onClick={() => toggleElement(el)}
            className={`rounded-full px-3 py-1 text-xs ${
              elements.includes(el)
                ? "bg-teal-700 text-white"
                : "border border-border"
            }`}
          >
            {ELEMENT_LABELS[el]}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elements} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {elements.map((el) => (
              <SortableItem key={el} id={el} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="min-h-11 w-full rounded-lg bg-teal-700 text-white"
      >
        Şablonu Kaydet
      </button>
    </div>
  );
}

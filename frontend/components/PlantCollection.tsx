"use client";

type CollectionItem = {
  species_id: string;
  confidence: number;
  note: string;
};

type Props = {
  items: CollectionItem[];
};

export default function PlantCollection({ items }: Props) {
  return (
    <section className="rounded-2xl border border-green-100 bg-white/80 p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Collection</h2>
      <p className="mt-1 text-sm text-slate-600">Saved detections for this browser session.</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">No plants saved yet.</p>
        ) : (
          items.map((item, idx) => (
            <article key={`${item.species_id}-${idx}`} className="rounded-lg border border-green-100 bg-white p-3">
              <h3 className="font-medium">{item.species_id}</h3>
              <p className="text-sm text-slate-700">Confidence: {Math.round(item.confidence * 100)}%</p>
              <p className="text-sm text-slate-700">{item.note}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

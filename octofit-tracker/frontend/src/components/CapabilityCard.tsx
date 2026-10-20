import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  load: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, load, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) setItems(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {loading && <p role="status">Loading {title.toLowerCase()}...</p>}
    {!loading && error && <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>}
    {!loading && !error && items.length === 0 && <p role="status">{emptyMessage}</p>}
    {!loading && !error && items.length > 0 && <ul className="list-group list-group-flush">
      {items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}
    </ul>}
  </div></section>;
}

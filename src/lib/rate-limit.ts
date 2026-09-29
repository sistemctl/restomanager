const buckets = new Map<string, { count: number; expires: number }>();

// Limite por proceso; en despliegues con varias instancias debe usar un almacen compartido.
export function allowAttempt(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  const bucket = buckets.get(key);
  if (bucket) {
    if (bucket.count >= limit) return false;
    bucket.count++;
  } else {
    if (buckets.size >= 10000) return false;
    buckets.set(key, { count: 1, expires: now + windowMs });
  }
  return true;
}

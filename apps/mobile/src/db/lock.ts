let tail: Promise<unknown> = Promise.resolve();

/**
 * Zápisy do databáze běží po jednom. `withExclusiveTransactionAsync` může otevřít vlastní spojení,
 * a dva souběžné zápisy (synchronizace kroniky a uložení výpravy) by pak mohly skončit chybou „database is locked“.
 */
export function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

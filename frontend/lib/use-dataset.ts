"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDataset, SNAPSHOT, type Dataset } from "./api";

export type Source = "loading" | "live" | "snapshot";

/** Live results from the API, falling back to the bundled snapshot when it is down. */
export function useDataset() {
  const [data, setData] = useState<Dataset>(SNAPSHOT);
  const [source, setSource] = useState<Source>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await loadDataset());
      setSource("live");
      setError(null);
    } catch (e) {
      setSource("snapshot");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    refresh();
  }, [refresh]);

  return { data, source, error, refresh };
}

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("botão de atualização informa progresso e conclusão", () => {
  const page = read("app/dashboard/page.tsx");
  const hook = read("hooks/useStatictics.ts");
  const statistics = read("app/dashboard/components/StatisticsSection.tsx");

  assert.match(page, /disabled=\{isRefreshing\}/);
  assert.match(page, /isRefreshing\s*\?\s*"Atualizando\.\.\."/);
  assert.match(page, /isRefreshing \? "animate-spin" : ""/);
  assert.match(page, /refreshFeedback\s*\?\s*"Atualizado agora"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /setRefreshFeedback\(false\)/);
  assert.match(
    page,
    /const handleRefreshRequest = useCallback\(\(\) => \{\s*setRefreshFeedback\(false\);\s*setRefreshSignal\(/,
  );
  assert.match(hook, /const fetchStatistics = useCallback\(async \(\): Promise<boolean>/);
  assert.match(hook, /setStatistics\(result\);\s*return true;/);
  assert.match(hook, /setError\(err as Error\);[\s\S]*return false;/);
  assert.match(hook, /useRef\(true\)/);
  assert.match(hook, /const requestSequenceRef = useRef\(0\)/);
  assert.match(hook, /const requestSequence = \+\+requestSequenceRef\.current/);
  assert.match(hook, /const isLatestRequest = \(\) =>[\s\S]*requestSequence === requestSequenceRef\.current/);
  assert.match(hook, /if \(!isMountedRef\.current\) return false;/);
  assert.match(hook, /if \(!isLatestRequest\(\)\) return false;[\s\S]*setStatistics\(result\)/);
  assert.match(hook, /if \(isLatestRequest\(\)\) \{[\s\S]*setError\(err as Error\)/);
  assert.match(hook, /if \(isLatestRequest\(\)\) \{[\s\S]*setLoading\(false\)/);
  assert.match(statistics, /onRefreshSuccess\?: \(\) => void/);
  assert.match(
    statistics,
    /const refreshSucceeded = await refetch\(\);[\s\S]*refreshSucceeded[\s\S]*isMountedRef\.current[\s\S]*refreshGeneration === refreshGenerationRef\.current[\s\S]*onRefreshSuccess\?\.\(\);/,
  );
  assert.doesNotMatch(statistics, /await refetch\(\);\s*onRefreshSuccess\?\.\(\);/);
  assert.match(statistics, /useRef<ReturnType<typeof setTimeout> \| null>\(null\)/);
  assert.match(
    statistics,
    /refreshTimerRef\.current !== null[\s\S]*clearTimeout\(refreshTimerRef\.current\)/,
  );
  assert.match(statistics, /isMountedRef\.current = false/);
  assert.match(statistics, /isMountedRef\.current = true/);
  assert.match(statistics, /const refreshGenerationRef = useRef\(0\)/);
  assert.match(statistics, /const refreshGeneration = \+\+refreshGenerationRef\.current/);
  assert.match(
    statistics,
    /refreshGeneration === refreshGenerationRef\.current/,
  );
  assert.match(statistics, /if \(!isMountedRef\.current\) return;/);
});

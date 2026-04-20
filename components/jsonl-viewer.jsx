"use client";

import { useEffect, useMemo, useState } from "react";

const PIPERY_TIMESTAMP_FIELD = "timestamp";

function parseJsonl(content) {
  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, index }) => {
      try {
        const parsed = JSON.parse(line);
        return {
          id: `${index}-${parsed.id ?? parsed.name ?? "entry"}`,
          lineNumber: index + 1,
          data: parsed,
          raw: line
        };
      } catch (error) {
        return {
          id: `${index}-invalid`,
          lineNumber: index + 1,
          data: {
            parseError: error.message,
            raw: line
          },
          raw: line,
          invalid: true
        };
      }
    });
}

function getEntryTimestamp(value) {
  if (!value || typeof value !== "object" || typeof value[PIPERY_TIMESTAMP_FIELD] !== "string") {
    return null;
  }

  const date = new Date(value[PIPERY_TIMESTAMP_FIELD]);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function summarizeEntry(entry) {
  if (entry.invalid) {
    return {
      title: `Invalid JSON at line ${entry.lineNumber}`,
      summary: entry.data.parseError || "Unable to parse this line."
    };
  }

  const title = entry.data.command || entry.data.raw_command || `Entry ${entry.lineNumber}`;
  const mode = entry.data.mode ? `mode: ${entry.data.mode}` : null;
  const duration = entry.data.duration ? `duration: ${entry.data.duration}` : null;
  const exitCode =
    typeof entry.data.exit_code === "number" ? `exit: ${entry.data.exit_code}` : null;
  const summary = [mode, duration, exitCode].filter(Boolean).join(" • ");

  return { title, summary };
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildHistogram(entries) {
  const timestamped = entries
    .map((entry) => {
      const timestamp = getEntryTimestamp(entry.data);

      return timestamp
        ? {
            ...entry,
            timestamp,
            timeValue: new Date(timestamp).getTime()
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.timeValue - right.timeValue);

  if (timestamped.length < 2) {
    return null;
  }

  const min = timestamped[0].timeValue;
  const max = timestamped[timestamped.length - 1].timeValue;
  const range = Math.max(max - min, 1);
  const bucketCount = Math.min(24, Math.max(6, Math.ceil(Math.sqrt(timestamped.length))));
  const bucketSize = range / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = min + index * bucketSize;
    const end = index === bucketCount - 1 ? max : start + bucketSize;

    return {
      start,
      end,
      count: 0
    };
  });

  for (const entry of timestamped) {
    const position = Math.min(
      bucketCount - 1,
      Math.floor((entry.timeValue - min) / Math.max(bucketSize, 1))
    );
    buckets[position].count += 1;
  }

  return {
    min,
    max,
    buckets,
    timestampedCount: timestamped.length
  };
}

function TimelineHistogram({ histogram, selectedRange, onChange }) {
  if (!histogram) {
    return null;
  }

  const maxCount = Math.max(...histogram.buckets.map((bucket) => bucket.count), 1);
  const totalRange = Math.max(histogram.max - histogram.min, 1);

  return (
    <div className="timelinePanel">
      <div className="timelineHeader">
        <div>
          <p className="panelLabel">Time Histogram</p>
          <h3>Filter entries by timestamp</h3>
        </div>
        <div className="statPill">{histogram.timestampedCount} timestamped entries</div>
      </div>

      <svg className="timelineChart" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        {histogram.buckets.map((bucket, index) => {
          const width = 100 / histogram.buckets.length;
          const x = index * width;
          const height = Math.max(2, (bucket.count / maxCount) * 28);
          const y = 34 - height;
          const bucketMid = (bucket.start + bucket.end) / 2;
          const active = bucketMid >= selectedRange.start && bucketMid <= selectedRange.end;

          return (
            <rect
              key={`${bucket.start}-${bucket.end}`}
              x={x + 0.7}
              y={y}
              width={Math.max(width - 1.4, 1)}
              height={height}
              rx="1.4"
              className={active ? "timelineBar timelineBarActive" : "timelineBar"}
            />
          );
        })}
      </svg>

      <div className="timelineLabels">
        <span>{formatDate(selectedRange.start)}</span>
        <span>{formatDate(selectedRange.end)}</span>
      </div>

      <div className="rangeControl">
        <label>
          Start
          <input
            type="range"
            min={histogram.min}
            max={histogram.max}
            step={Math.max(Math.floor(totalRange / 400), 1)}
            value={selectedRange.start}
            onChange={(event) =>
              onChange({
                start: Math.min(Number(event.target.value), selectedRange.end),
                end: selectedRange.end
              })
            }
          />
        </label>
        <label>
          End
          <input
            type="range"
            min={histogram.min}
            max={histogram.max}
            step={Math.max(Math.floor(totalRange / 400), 1)}
            value={selectedRange.end}
            onChange={(event) =>
              onChange({
                start: selectedRange.start,
                end: Math.max(Number(event.target.value), selectedRange.start)
              })
            }
          />
        </label>
      </div>
    </div>
  );
}

export function JsonlViewer({ document, onSelectSaved }) {
  const entries = useMemo(() => parseJsonl(document?.content || ""), [document]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const histogram = useMemo(() => buildHistogram(entries), [entries]);
  const [timeRange, setTimeRange] = useState(null);

  useEffect(() => {
    setSelectedId(entries[0]?.id || "");
  }, [document, entries]);

  useEffect(() => {
    if (!histogram) {
      setTimeRange(null);
      return;
    }

    setTimeRange({
      start: histogram.min,
      end: histogram.max
    });
  }, [histogram, document]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (normalized) {
        const matchesQuery =
          JSON.stringify(entry.data).toLowerCase().includes(normalized) ||
          entry.raw.toLowerCase().includes(normalized);

        if (!matchesQuery) {
          return false;
        }
      }

      if (!timeRange || !histogram) {
        return true;
      }

      const timestamp = getEntryTimestamp(entry.data);

      if (!timestamp) {
        return true;
      }

      const timeValue = new Date(timestamp).getTime();
      return timeValue >= timeRange.start && timeValue <= timeRange.end;
    });
  }, [entries, query, timeRange, histogram]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) || filteredEntries[0] || null;

  return (
    <section className="viewerGrid">
      <div className="panel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Opened JSONL</p>
            <h2>{document?.filePath || "No file opened"}</h2>
          </div>
          <div className="statPill">{entries.length} entries</div>
        </div>

        <div className="searchRow">
          <input
            className="textInput"
            placeholder="Search across the JSONL contents"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {document?.savedAt ? (
            <button className="ghostButton" onClick={onSelectSaved}>
              Reload saved copy
            </button>
          ) : null}
        </div>

        {histogram && timeRange ? (
          <TimelineHistogram
            histogram={histogram}
            selectedRange={timeRange}
            onChange={setTimeRange}
          />
        ) : null}

        <div className="entryList">
          {filteredEntries.map((entry) => {
            const summary = summarizeEntry(entry);
            const timestamp = getEntryTimestamp(entry.data);
            return (
              <button
                key={entry.id}
                className={`entryCard ${selectedEntry?.id === entry.id ? "entryCardActive" : ""}`}
                onClick={() => setSelectedId(entry.id)}
              >
                <div className="entryCardTop">
                  <strong>{summary.title}</strong>
                  <span>Line {entry.lineNumber}</span>
                </div>
                <p>{summary.summary || "Pipery log entry"}</p>
                {timestamp ? <span className="entryTimestamp">{formatDate(timestamp)}</span> : null}
              </button>
            );
          })}

          {filteredEntries.length === 0 ? (
            <div className="emptyState smallEmpty">
              <p>No entries match the current search.</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel detailPanel">
        <div className="panelHeader">
          <div>
            <p className="panelLabel">Entry Details</p>
            <h2>{selectedEntry ? `Line ${selectedEntry.lineNumber}` : "Nothing selected"}</h2>
          </div>
        </div>

        {selectedEntry ? (
          <>
            <dl className="detailGrid">
              {Object.entries(selectedEntry.data).map(([key, value]) => (
                <div className="detailRow" key={key}>
                  <dt>{key}</dt>
                  <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
                </div>
              ))}
            </dl>
            <pre className="codeBlock">{JSON.stringify(selectedEntry.data, null, 2)}</pre>
          </>
        ) : (
          <div className="emptyState smallEmpty">
            <p>Select an entry to inspect its fields.</p>
          </div>
        )}
      </div>
    </section>
  );
}

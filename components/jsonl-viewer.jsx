"use client";

import { useEffect, useMemo, useState } from "react";

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

function summarizeEntry(entry) {
  const keys = Object.keys(entry.data || {});
  const titleKey = ["id", "name", "title", "step", "status", "artifact"].find((key) => key in entry.data);
  const title = titleKey ? String(entry.data[titleKey]) : `Entry ${entry.lineNumber}`;
  const summaryKey = keys.find((key) => ["message", "result", "text", "command"].includes(key));
  const summary = summaryKey ? String(entry.data[summaryKey]) : keys.slice(0, 4).join(", ");

  return { title, summary };
}

export function JsonlViewer({ document, onSelectSaved }) {
  const entries = useMemo(() => parseJsonl(document?.content || ""), [document]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    setSelectedId(entries[0]?.id || "");
  }, [document, entries]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return entries;
    }

    return entries.filter((entry) =>
      JSON.stringify(entry.data).toLowerCase().includes(normalized) ||
      entry.raw.toLowerCase().includes(normalized)
    );
  }, [entries, query]);

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

        <div className="entryList">
          {filteredEntries.map((entry) => {
            const summary = summarizeEntry(entry);
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
                <p>{summary.summary || "No summary fields detected."}</p>
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

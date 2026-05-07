function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return ".".repeat(Math.max(0, maxLength));
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function parseJsonl(content) {
  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim())
    .map(({ line, index }) => {
      try {
        return {
          id: `${index + 1}-${index}`,
          lineNumber: index + 1,
          data: JSON.parse(line),
          raw: line
        };
      } catch (error) {
        return {
          id: `${index + 1}-invalid`,
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

export function getTimestamp(entry) {
  if (!entry?.data?.timestamp) {
    return null;
  }

  const date = new Date(entry.data.timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  return formatDate(value);
}

export function summarizeEntry(entry) {
  if (entry.invalid) {
    return `invalid JSON: ${entry.data.parseError}`;
  }

  const parts = [
    entry.data.command || entry.data.raw_command,
    entry.data.mode ? `mode=${entry.data.mode}` : null,
    entry.data.duration ? `duration=${entry.data.duration}` : null,
    typeof entry.data.exit_code === "number" ? `exit=${entry.data.exit_code}` : null
  ].filter(Boolean);

  return parts.join(" | ");
}

export function buildHistogram(entries) {
  const timestamped = entries
    .map((entry) => {
      const timestamp = getTimestamp(entry);
      return timestamp ? { entry, time: new Date(timestamp).getTime() } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.time - right.time);

  if (timestamped.length < 2) {
    return null;
  }

  const min = timestamped[0].time;
  const max = timestamped[timestamped.length - 1].time;
  const range = Math.max(max - min, 1);
  const bucketCount = Math.min(24, Math.max(6, Math.ceil(Math.sqrt(timestamped.length))));
  const bucketSize = range / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    start: min + index * bucketSize,
    end: index === bucketCount - 1 ? max : min + (index + 1) * bucketSize,
    count: 0
  }));

  for (const item of timestamped) {
    const index = Math.min(bucketCount - 1, Math.floor((item.time - min) / Math.max(bucketSize, 1)));
    buckets[index].count += 1;
  }

  return { min, max, buckets, timestampedCount: timestamped.length };
}

export function renderHistogram(histogram) {
  if (!histogram) {
    return "No timestamp histogram available.\n";
  }

  const maxCount = Math.max(...histogram.buckets.map((bucket) => bucket.count), 1);

  return histogram.buckets
    .map((bucket) => {
      const width = Math.max(1, Math.round((bucket.count / maxCount) * 24));
      return `${formatDate(bucket.start)} | ${"#".repeat(width)} ${bucket.count}`;
    })
    .join("\n");
}

export function renderHistogramSparkline(histogram, width = 24) {
  if (!histogram) {
    return "No timestamp data";
  }

  const glyphs = " ▁▂▃▄▅▆▇█";
  const counts = histogram.buckets.map((bucket) => bucket.count);
  const maxCount = Math.max(...counts, 1);

  if (histogram.buckets.length <= width) {
    return histogram.buckets
      .map((bucket) => glyphs[Math.round((bucket.count / maxCount) * (glyphs.length - 1))])
      .join("");
  }

  const grouped = [];
  const step = histogram.buckets.length / width;

  for (let index = 0; index < width; index += 1) {
    const start = Math.floor(index * step);
    const end = Math.max(start + 1, Math.floor((index + 1) * step));
    const slice = counts.slice(start, end);
    const value = Math.max(...slice, 0);
    grouped.push(glyphs[Math.round((value / maxCount) * (glyphs.length - 1))]);
  }

  return grouped.join("");
}

export function filterEntries(entries, query, start, end) {
  return entries.filter((entry) => {
    if (query) {
      const haystack = JSON.stringify(entry.data).toLowerCase();
      if (!haystack.includes(query.toLowerCase()) && !entry.raw.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
    }

    if (start || end) {
      const timestamp = getTimestamp(entry);
      if (timestamp) {
        const value = new Date(timestamp).getTime();
        if (start && value < new Date(start).getTime()) {
          return false;
        }
        if (end && value > new Date(end).getTime()) {
          return false;
        }
      }
    }

    return true;
  });
}

export function renderEntryDetail(entry) {
  const header = [`Line ${entry.lineNumber}`];
  if (entry.data.timestamp) {
    header.push(`timestamp=${formatDate(entry.data.timestamp)}`);
  }

  return `${header.join(" | ")}\n${JSON.stringify(entry.data, null, 2)}`;
}

export function renderEntryPreview(entry, width = 120) {
  const prefix = `line ${String(entry.lineNumber).padStart(4, " ")} | `;
  const summary = summarizeEntry(entry) || "Pipery log entry";
  return truncate(`${prefix}${summary}`, width);
}

export function renderOverview(entries, filteredEntries) {
  const timestamps = filteredEntries.map(getTimestamp).filter(Boolean).sort();
  const lines = [
    `Entries: ${entries.length}`,
    `Visible after filters: ${filteredEntries.length}`
  ];

  if (timestamps.length) {
    lines.push(`Time range: ${formatDate(timestamps[0])} -> ${formatDate(timestamps[timestamps.length - 1])}`);
  }

  return lines.join("\n");
}

export function getVisibleTimeRange(filteredEntries) {
  const timestamps = filteredEntries.map(getTimestamp).filter(Boolean).sort();
  if (!timestamps.length) {
    return null;
  }

  return {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1]
  };
}

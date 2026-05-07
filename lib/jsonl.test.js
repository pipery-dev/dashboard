import { describe, expect, it } from "vitest";
import {
  buildHistogram,
  filterEntries,
  getTimestamp,
  getVisibleTimeRange,
  parseJsonl,
  renderEntryPreview,
  renderOverview,
  summarizeEntry
} from "./jsonl";

describe("JSONL helpers", () => {
  it("parses non-empty JSONL lines and preserves invalid rows with line numbers", () => {
    const entries = parseJsonl(
      "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"build\"}\r\n\nnot-json\n {\"exit_code\":0} "
    );

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      id: "1-0",
      lineNumber: 1,
      data: { timestamp: "2026-05-01T00:00:00Z", command: "build" },
      raw: "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"build\"}"
    });
    expect(entries[1]).toMatchObject({
      id: "3-invalid",
      lineNumber: 3,
      raw: "not-json",
      invalid: true
    });
    expect(entries[1].data.parseError).toEqual(expect.any(String));
    expect(entries[2]).toMatchObject({
      id: "4-3",
      lineNumber: 4,
      data: { exit_code: 0 }
    });
  });

  it("summarizes commands, modes, durations, exit codes, and parse failures", () => {
    expect(
      summarizeEntry({
        data: {
          raw_command: "pipery run",
          mode: "ci",
          duration: "42s",
          exit_code: 1
        }
      })
    ).toBe("pipery run | mode=ci | duration=42s | exit=1");

    expect(
      summarizeEntry({
        invalid: true,
        data: { parseError: "Unexpected token" }
      })
    ).toBe("invalid JSON: Unexpected token");
  });

  it("normalizes valid timestamps and rejects missing or invalid timestamps", () => {
    expect(getTimestamp({ data: { timestamp: "2026-05-01T00:00:00+02:00" } })).toBe(
      "2026-04-30T22:00:00.000Z"
    );
    expect(getTimestamp({ data: { timestamp: "not-a-date" } })).toBeNull();
    expect(getTimestamp({ data: {} })).toBeNull();
    expect(getTimestamp(null)).toBeNull();
  });

  it("filters by case-insensitive query and inclusive timestamp bounds", () => {
    const entries = parseJsonl(
      [
        "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"Build app\"}",
        "{\"timestamp\":\"2026-05-01T01:00:00Z\",\"command\":\"test app\"}",
        "{\"timestamp\":\"2026-05-01T02:00:00Z\",\"command\":\"deploy api\"}"
      ].join("\n")
    );

    expect(filterEntries(entries, "APP", "2026-05-01T00:30:00Z", "2026-05-01T01:00:00Z")).toEqual([
      entries[1]
    ]);
    expect(filterEntries(entries, "deploy", null, "2026-05-01T02:00:00Z")).toEqual([entries[2]]);
  });

  it("keeps untimestamped entries when date filters are applied", () => {
    const entries = parseJsonl(
      [
        "{\"command\":\"no timestamp\"}",
        "{\"timestamp\":\"2026-05-02T00:00:00Z\",\"command\":\"outside range\"}"
      ].join("\n")
    );

    expect(filterEntries(entries, "", "2026-05-01T00:00:00Z", "2026-05-01T23:59:59Z")).toEqual([
      entries[0]
    ]);
  });

  it("builds null histograms for insufficient timestamp data", () => {
    expect(buildHistogram([])).toBeNull();
    expect(buildHistogram(parseJsonl("{\"timestamp\":\"2026-05-01T00:00:00Z\"}"))).toBeNull();
    expect(buildHistogram(parseJsonl("{\"command\":\"missing timestamp\"}\nnot-json"))).toBeNull();
  });

  it("builds deterministic histogram buckets for timestamped entries", () => {
    const entries = parseJsonl(
      [
        "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"one\"}",
        "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"two\"}",
        "{\"timestamp\":\"2026-05-01T00:05:00Z\",\"command\":\"three\"}",
        "{\"timestamp\":\"2026-05-01T00:10:00Z\",\"command\":\"four\"}"
      ].join("\n")
    );

    const histogram = buildHistogram(entries);

    expect(histogram).toMatchObject({
      min: Date.parse("2026-05-01T00:00:00Z"),
      max: Date.parse("2026-05-01T00:10:00Z"),
      timestampedCount: 4
    });
    expect(histogram.buckets).toHaveLength(6);
    expect(histogram.buckets.map((bucket) => bucket.count)).toEqual([2, 0, 0, 1, 0, 1]);
  });

  it("derives visible time ranges and compact previews", () => {
    const entries = parseJsonl(
      [
        "{\"timestamp\":\"2026-05-01T02:00:00Z\",\"command\":\"late\"}",
        "{\"timestamp\":\"2026-05-01T00:00:00Z\",\"command\":\"early\"}",
        "{\"command\":\"no timestamp\"}"
      ].join("\n")
    );

    expect(getVisibleTimeRange(entries)).toEqual({
      start: "2026-05-01T00:00:00.000Z",
      end: "2026-05-01T02:00:00.000Z"
    });
    expect(getVisibleTimeRange([entries[2]])).toBeNull();
    expect(renderEntryPreview(entries[1], 28)).toBe("line    2 | early");
    expect(renderEntryPreview(entries[2], 18)).toBe("line    3 | no ...");
  });

  it("renders overview counts without a time range when filtered entries lack timestamps", () => {
    const entries = parseJsonl("{\"timestamp\":\"2026-05-01T00:00:00Z\"}\n{\"command\":\"plain\"}");

    expect(renderOverview(entries, [entries[1]])).toBe("Entries: 2\nVisible after filters: 1");
  });
});

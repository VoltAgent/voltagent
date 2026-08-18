import { createParser } from "@openuidev/react-lang";
import { describe, expect, it } from "vitest";
import { library } from "./library";

describe("OpenUI chat library", () => {
  it("parses a chart response with follow-up actions", () => {
    const response = `root = Card([title, chart, followUps])
title = TextContent("2024 residential building permits", "large-heavy")
chart = BarChart(labels, [series], "grouped")
labels = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]
series = Series("Dwelling units", [3125, 6588, 2347, 3240, 326])
followUps = FollowUpBlock([boroughs, vacancy])
boroughs = FollowUpItem("Compare borough permit trends")
vacancy = FollowUpItem("Show borough vacancy rates")`;

    const result = createParser(library.toJSONSchema()).parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
  });

  it("parses a compact housing dashboard without a narrative paragraph", () => {
    const response = `root = Card([header, headline, signals, boroughs, source, followUps])
header = CardHeader("2024 housing snapshot", "Supply, completion, and vacancy signals")
headline = TextCallout("warning", "Tight rental market", "Citywide rental vacancy remained low while new-building completions increased.")
signals = Table([Col("Signal", signalNames), Col("Value / latest", signalValues), Col("Context", signalContext)])
signalNames = ["Permitted units", "Completed units", "Rental vacancy"]
signalValues = ["15,626", "33,974", "1.41%"]
signalContext = ["Down 4.8%", "Up 21.5%", "2023 survey"]
boroughs = HorizontalBarChart(labels, [completedSeries], "grouped", "Dwelling units", "Borough")
labels = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]
completedSeries = Series("Completed units", [6526, 13732, 4841, 8061, 814])
source = TextContent("Source: New York City Rent Guidelines Board, 2025 Housing Supply Report, PDF pages 4 and 24.", "small")
followUps = FollowUpBlock([permits, vacancy])
permits = FollowUpItem("Compare permit changes by borough")
vacancy = FollowUpItem("Show borough vacancy rates")`;

    const result = createParser(library.toJSONSchema()).parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
  });

  it("parses a grounded permit-impact follow-up", () => {
    const response = `root = Card([header, limitation, facts, source, followUps])
header = CardHeader("What permits show", "Reported activity, not a forecast")
limitation = TextCallout("neutral", "What the report establishes", "Permits authorize construction, while completed units are reported separately.")
facts = Table([Col("Measure", measures), Col("Reported value", values), Col("Context", contexts)])
measures = ["Permitted units", "Completed units"]
values = ["15,626", "33,974"]
contexts = ["Down 4.8% from 2023", "Up 21.5% from 2023"]
source = TextContent("Source: New York City Rent Guidelines Board, 2025 Housing Supply Report, PDF page 4.", "small")
followUps = FollowUpBlock([boroughs, vacancy])
boroughs = FollowUpItem("Compare permits by borough")
vacancy = FollowUpItem("Show the latest vacancy signals")`;

    const result = createParser(library.toJSONSchema()).parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
  });
});

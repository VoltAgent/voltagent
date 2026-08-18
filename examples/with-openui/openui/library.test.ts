import { type ElementNode, type ParseResult, createParser } from "@openuidev/react-lang";
import { describe, expect, it } from "vitest";
import { library } from "./library";

function rootChildren(result: ParseResult): ElementNode[] {
  expect(result.root?.typeName).toBe("Card");
  expect(result.root?.props.children).toBeInstanceOf(Array);
  return result.root?.props.children as ElementNode[];
}

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
    const children = rootChildren(result);
    expect(children.map((child) => child.typeName)).toEqual([
      "TextContent",
      "BarChart",
      "FollowUpBlock",
    ]);
    const chartSeries = children[1]?.props.series as ElementNode[];
    expect(chartSeries[0]?.typeName).toBe("Series");
    expect(chartSeries[0]?.props.values).toEqual([3125, 6588, 2347, 3240, 326]);
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
    expect(rootChildren(result).at(-1)?.typeName).toBe("FollowUpBlock");
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
    expect(rootChildren(result).at(-1)?.typeName).toBe("FollowUpBlock");
  });

  it("parses a validated form with a ToAssistant action", () => {
    const response = `root = Card([title, form, followUps])
title = TextContent("Housing analysis", "large-heavy")
form = Form("housingAnalysis", buttons, [focusArea, audience, notes])
focusArea = FormControl("Focus area", Input("focusArea", "Vacancy rates", "text", {required: true}))
audience = FormControl("Audience", Input("audience", "City planners", "text", {required: true}))
notes = FormControl("Notes", TextArea("notes", "Compare borough differences", 3))
buttons = Buttons([analyze])
analyze = Button("Analyze", Action([@ToAssistant("Analyze the submitted housing focus for the specified audience using exact PDF facts and page citations")]), "primary")
followUps = FollowUpBlock([vacancy, permits])
vacancy = FollowUpItem("Show borough vacancy rates")
permits = FollowUpItem("Compare permits by borough")`;

    const result = createParser(library.toJSONSchema()).parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    const children = rootChildren(result);
    expect(children.map((child) => child.typeName)).toEqual([
      "TextContent",
      "Form",
      "FollowUpBlock",
    ]);
    const form = children[1];
    const buttons = form?.props.buttons as ElementNode;
    const button = (buttons.props.buttons as ElementNode[])[0];
    expect(button?.props.action).toEqual({
      args: [
        {
          els: [
            {
              args: [
                {
                  k: "Str",
                  v: "Analyze the submitted housing focus for the specified audience using exact PDF facts and page citations",
                },
              ],
              k: "Comp",
              name: "ToAssistant",
            },
          ],
          k: "Arr",
        },
      ],
      k: "Comp",
      name: "Action",
    });
  });
});

---
title: Trace Counts Over Time
---

# Trace Counts Over Time

This graph offers a timeline of your trace activity over time and allows you to view quite clearly how your system behaves over time. You can watch the movement of successful traces, errors, and work in progress in real-time.

### What You Can See

The graph displays four trace statuses in varying color-coded lines:

- **Success** (Green Line): Shows how many traces were successful at each time point
- **Error** (Red Line): Tracks failed traces over time, allowing you to easily spot trouble periods
- **Working** (Yellow Line): Indicates traces that are in progress, reflecting system load
- **Unknown** (Gray Line): Stores any traces whose status is unknown or undefined

### Time Controls

You can also control the time period you're looking at:

- **Time Range**: Choose specific hours, days, or weeks to examine
- **Granularity**: Define how granular you want the data points (every hour, every 6 hours, daily)

  This flexibility lets you zoom in for a single event or zoom out for trends over time.

### Reading the Chart

The chart is simple to read:

- **Y-axis**: Shows the number of traces at each moment in time
- **X-axis**: Displays the time frame you've selected
- **Line trends**: Increasing lines mean more activity, flat lines mean steady state
- **Line patterns**: Red spikes (errors) are worth investigating

This is perfect when you wish to trace performance issues, understand usage patterns, or observe how trace results are affected by system alterations over time.

## Key Benefits

The Trace Counts chart helps you in several key respects:

- **Easily identify trends**: Notice if your success rates are going up or down over time
- **Identify problem times**: Easily spot when the errors surged and match with system incidents
- **Track system load**: Observe how many traces are executing at once
- **Plan capacity**: Recognize peak times of usage and plan for scaling requirements
- **Monitor improvements**: Observe whether code changes or optimizations are truly effective
- **Drill into incidents**: Drill down to specific time ranges when incidents happened

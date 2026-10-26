# Styling

Every tool follows the same minimal, clean look: lots of whitespace, neutral grays, subtle borders, and a single accent color.

## Theme
- Light by default, dark when the OS prefers dark: define colors as CSS variables on `:root` and override them in `@media (prefers-color-scheme: dark)`.
- Set `color-scheme: light dark;` on `:root` so native controls match.
- Always set an explicit `background` and `color` on `body`.

## Colors
- Neutral grays for backgrounds, surfaces, borders and text.
- One accent color, chosen to fit the tool's purpose. Use it only for primary buttons, focus rings, active states and key highlights.
- The accent must have readable contrast in both light and dark mode (adjust its shade in the dark theme if needed).

## Typography
- Font: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. No web fonts.
- Base size 15–16px, line-height 1.5. Use weight and size for hierarchy, not color.

## Shape and depth
- Border radius: 6px on buttons, inputs and cards.
- Inputs: 1px border. Cards and popovers: subtle shadow (e.g. `0 1px 3px rgb(0 0 0 / 0.08)`), slightly stronger in dark mode only if needed.

## Layout
- Content in a centered column, `max-width: 640px`, with comfortable padding.
- No header or title in the tool itself; the app already shows the name. Start directly with the tool's content.
- The tool must be responsive and work in a small iframe.

## Starting tokens
Use this as the base and adapt values to the tool:

```css
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --surface: #ffffff;
  --text: #18181b;
  --muted: #71717a;
  --border: #e4e4e7;
  --accent: /* chosen per tool */;
  --radius: 6px;
  --shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #09090b;
    --surface: #18181b;
    --text: #fafafa;
    --muted: #a1a1aa;
    --border: #27272a;
  }
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

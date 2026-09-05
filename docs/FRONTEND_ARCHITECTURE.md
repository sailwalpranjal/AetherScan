# Frontend Architecture

## 1. Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18, Tailwind CSS, Shadcn UI / Radix (Headless)
- **Mapping**: MapLibre GL JS, Deck.gl (WebGL acceleration for large layers)

## 2. Information Architecture
- `/`: Overview & Map Explorer
- `/facilities`: Industrial Facility Search & Intelligence
- `/events`: Anomaly & Event Tracking
- `/quantum`: Quantum Lab & Experiments Dashboard
- `/reports`: PDF Generation & Saved Analyses

## 3. Map Experience
- **Deck.gl**: Used for rendering 10,000+ points via `ScatterplotLayer` and `HeatmapLayer`.
- **Clustering**: Supercluster applied to sensor stations to avoid DOM bloat.
- **Layers**: Decoupled layer state management via Zustand or React Context.

## 4. Mobile-First Optimization
- Responsive map controls.
- Bottom-sheet UI for layer toggling on screens < 768px.
- Touch-friendly experiment controls in the Quantum Lab.

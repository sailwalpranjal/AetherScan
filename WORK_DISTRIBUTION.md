# AetherScan - Team Work Distribution & Task Analysis

**Project Duration:** 6 months (August 2025 - January 2026)
**Team Size:** 4 developers

---

## Table of Contents

1. [Team Structure & Roles](#team-structure--roles)
2. [Development Phase Timeline](#development-phase-timeline)
3. [Task Distribution by Complexity](#task-distribution-by-complexity)
4. [Detailed Task Breakdown](#detailed-task-breakdown)
5. [Component Ownership Matrix](#component-ownership-matrix)
6. [Execution Flow Diagrams](#execution-flow-diagrams)
7. [Technology Skills Matrix](#technology-skills-matrix)
8. [Key Achievements](#key-achievements)

---

## Team Structure & Roles

### Pranjal Sailwal - Lead Backend Developer & Quantum Architect
**Primary Responsibility:** Complex backend systems, quantum computing, system architecture

**Core Competencies:**
- Advanced Python development (FastAPI, async programming)
- Quantum computing (IBM Qiskit framework)
- Complex algorithm implementation
- Database architecture and security
- Performance optimization
- Geospatial data processing
- Multi-API integration

### Prakriti Kimothi - Frontend Developer & Data Analyst
**Primary Responsibility:** Frontend components, data visualization, AI features

**Core Competencies:**
- React and TypeScript
- MapLibre GL JS and Deck.gl
- Data visualization (Chart.js, Recharts)
- PDF generation (jsPDF)
- Frontend-backend integration
- Data analysis and processing

### Sriya Rawat - UI/UX Developer & Designer
**Primary Responsibility:** User interface design, responsive layouts, user experience

**Core Competencies:**
- UI/UX design principles
- Tailwind CSS
- Responsive design
- Component styling
- User experience optimization

### Siddhant Dabral - Junior Developer & QA Support
**Primary Responsibility:** Support tasks, testing, basic components

**Core Competencies:**
- Basic React components
- Form validation
- Testing and QA
- Database assistance
- Bug reporting

---

## Development Phase Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROJECT TIMELINE (6 MONTHS)                     │
└─────────────────────────────────────────────────────────────────────────┘

Month 1: AUGUST 2025 - Planning & Architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1-2: Requirements & System Design
  ├─ Pranjal:    Backend architecture, database design, API structure (40h)
  ├─ Prakriti:   Frontend architecture, component planning (15h)
  ├─ Sriya:      UI/UX wireframes, design system (10h)
  └─ Siddhant:   Environment setup, documentation (5h)

Week 3-4: Technology Setup & Prototyping
  ├─ Pranjal:    FastAPI setup, database schema, core models (40h)
  ├─ Prakriti:   Next.js setup, basic routing, initial components (15h)
  ├─ Sriya:      Style guide, Tailwind configuration (10h)
  └─ Siddhant:   Testing environment, basic scripts (5h)

Total Month 1: Pranjal: 80h | Prakriti: 30h | Sriya: 20h | Siddhant: 10h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Month 2-3: SEPTEMBER-OCTOBER 2025 - Core Development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEPTEMBER (Month 2):
Week 1-2: Data Source Integration
  ├─ Pranjal:    AQICN client, OpenAQ client, fallback logic (50h)
  ├─ Prakriti:   Map component, layer manager (20h)
  ├─ Sriya:      Header, navigation, basic UI (15h)
  └─ Siddhant:   Test data preparation (5h)

Week 3-4: Core Algorithms & Frontend Base
  ├─ Pranjal:    AQI calculator, IDW interpolation, tile generation (50h)
  ├─ Prakriti:   Layer components (first 10 layers) (20h)
  ├─ Sriya:      Panel designs, search interface (15h)
  └─ Siddhant:   Manual testing, bug logging (5h)

OCTOBER (Month 3):
Week 1-2: NASA APIs & Advanced Layers
  ├─ Pranjal:    NASA FIRMS, OMI, VIIRS integration (50h)
  ├─ Prakriti:   Satellite layers, fire detection UI (30h)
  ├─ Sriya:      Legend component, tooltips (15h)
  └─ Siddhant:   UI testing, accessibility checks (10h)

Week 3-4: Layer Processors & Map Features
  ├─ Pranjal:    16 layer processor modules, optimization (50h)
  ├─ Prakriti:   Remaining 16 layer components (30h)
  ├─ Sriya:      Responsive design, mobile optimization (15h)
  └─ Siddhant:   Cross-browser testing (10h)

Total Month 2-3: Pranjal: 200h | Prakriti: 100h | Sriya: 60h | Siddhant: 30h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Month 4-5: NOVEMBER-DECEMBER 2025 - Feature Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOVEMBER (Month 4):
Week 1-2: PDF Generation System
  ├─ Pranjal:    Backend data aggregation APIs (30h)
  ├─ Prakriti:   PDF generator, 15+ chart types (40h)
  ├─ Sriya:      PDF styling, report layouts (10h)
  └─ Siddhant:   PDF testing, validation (10h)

Week 3-4: Advanced Analysis Features
  ├─ Pranjal:    Meteorology utils backend, fire correlation (20h)
  ├─ Prakriti:   Wind roses, fire analysis UI, trend analysis (40h)
  ├─ Sriya:      Advanced UI components (10h)
  └─ Siddhant:   Feature testing (10h)

DECEMBER (Month 5):
Week 1-2: AI Features & Data Validation
  ├─ Pranjal:    Data validation algorithms, caching optimization (20h)
  ├─ Prakriti:   Health advisories, AI recommendations (30h)
  ├─ Sriya:      Alert panels, notification UI (15h)
  └─ Siddhant:   Integration testing (15h)

Week 3-4: Performance & Bug Fixes
  ├─ Pranjal:    Performance profiling, optimization (20h)
  ├─ Prakriti:   Frontend optimization, code splitting (20h)
  ├─ Sriya:      UI polish, final touches (10h)
  └─ Siddhant:   Comprehensive testing (10h)

Total Month 4-5: Pranjal: 90h | Prakriti: 130h | Sriya: 45h | Siddhant: 45h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Month 6: JANUARY 2026 - Quantum Integration & Final Polish
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1: Quantum Computing Research & Planning
  ├─ Pranjal:    Qiskit framework study, quantum algorithms research (40h)
  ├─ Prakriti:   Frontend integration planning (10h)
  ├─ Sriya:      UI design for quantum features (5h)
  └─ Siddhant:   Documentation review (5h)

Week 2-3: Quantum Implementation
  ├─ Pranjal:    Quantum processor (600 lines), algorithms (80h)
  ├─ Prakriti:   Quantum API integration (15h)
  ├─ Sriya:      Status indicators for quantum (5h)
  └─ Siddhant:   Testing quantum endpoints (5h)

Week 3-4: Database Security & Documentation
  ├─ Pranjal:    Database guard middleware, security layer (50h)
  ├─ Pranjal:    Comprehensive documentation, flowcharts (30h)
  ├─ Prakriti:   Final UI polish, deployment prep (15h)
  ├─ Sriya:      Final design review (5h)
  └─ Siddhant:   Final testing, validation scripts (10h)

Total Month 6: Pranjal: 200h | Prakriti: 40h | Sriya: 15h | Siddhant: 20h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRAND TOTAL:
├─ Pranjal:   570 hours (45%)
├─ Prakriti:  300 hours (30%)
├─ Sriya:     140 hours (15%)
└─ Siddhant:  105 hours (10%)
```

---

## Task Distribution

### Tasks (Pranjal - 100%)

**Quantum Computing Implementation (150 hours)**
```
backend/quantum/processor.py (600+ lines)
├─ QuantumEnvironmentalProcessor class
├─ Qiskit circuit construction
├─ Quantum gates: Hadamard, CNOT, MCT
├─ State vector simulation
├─ Superposition processing algorithm
├─ Entanglement correlation analysis
├─ Grover's amplitude amplification
├─ Quantum Fourier Transform
└─ Circuit optimization & caching

backend/quantum/state_manager.py (262 lines)
├─ Quantum state lifecycle management
├─ Coherence time tracking
├─ Entanglement graph maintenance
├─ Decoherence simulation
└─ Automatic garbage collection

backend/routes/quantum.py (430 lines)
└─ 9 quantum API endpoints
```

**Database Security Layer (50 hours)**
```
backend/middleware/database_guard.py (341 lines)
├─ Token-based access control system
├─ Access token generation (SHA-256)
├─ Token validation with TTL
├─ Comprehensive audit logging
├─ Violation detection & blocking
└─ Database connection proxy
```

**Complex Data Integrations (100 hours)**
```
├─ AQICN API client with rate limiting
├─ OpenAQ v3 API with pagination
├─ NASA FIRMS active fire detection
├─ NASA OMI satellite NO₂/SO₂
├─ NASA VIIRS AOD & temperature
├─ Bhuvan WMS tile integration
├─ WRI power plant database
├─ OSM Overpass API
├─ Census India data processing
└─ WorldPop raster processing
```

**Core Algorithm Development (80 hours)**
```
core/aqi_calculator.py
├─ CPCB sub-index calculations
├─ Maximum sub-index selection
├─ Health advisory generation
└─ NAAQS/WHO standard comparison

core/idw_interpolation.py
├─ Inverse distance weighting
├─ Adaptive search radius
├─ Quality-based weighting
└─ NumPy vectorization

core/tile_generator.py
├─ Dynamic tile generation
├─ PNG raster tiles
├─ GeoJSON vector tiles
└─ Tile caching mechanism
```

**Layer Processing Modules (40 hours)**
```
16 layer processor modules
├─ Pollution heatmap (spatial interpolation)
├─ State-wise aggregation (statistics)
├─ Population exposure (risk calculation)
├─ Satellite data processing (raster operations)
├─ Fire density analysis (clustering)
└─ Wind climate (meteorology)
```

**Performance Optimization (20 hours)**
```
├─ Async I/O implementation
├─ Thread pool configuration
├─ Process pool optimization
├─ Memory profiling
├─ Query optimization
└─ Caching strategy
```

### Tasks (Prakriti - 80%, Pranjal - 20%)

**PDF Report Generation (60 hours total: Prakriti 50h, Pranjal 10h)**
```
researchGradePDFGenerator.ts (800+ lines)
├─ 12-section report structure
├─ Data aggregation logic
├─ Map screenshot integration
├─ Chart embedding
└─ Metadata generation

researchChartGenerator.ts (450+ lines)
├─ 15+ chart type implementations
├─ Publication-ready styling
├─ White background rendering
└─ Chart.js configuration
```

**26 Layer Components (90 hours: Prakriti 90h)**
```
frontend/src/components/Layers/
├─ PollutionHeatmap.tsx
├─ StateHeatmap.tsx
├─ DynamicAQI.tsx
├─ TrendEvolution.tsx
├─ SatelliteNO2.tsx
├─ SatelliteSO2.tsx
├─ FireDensity.tsx
├─ CropBurning.tsx
├─ PopulationDensity.tsx
└─ ... (17 more components)
```

**Data Visualization (60 hours: Prakriti 60h)**
```
├─ Chart.js integration
├─ Recharts implementation
├─ Time series charts
├─ Scatter plots
├─ Radar charts
├─ Wind roses
└─ Histograms
```

### Tasks (Sriya - 60%, Prakriti - 40%)

**UI/UX Components (60 hours: Sriya 40h, Prakriti 20h)**
```
├─ ModernHeader.tsx
├─ ModernSearch.tsx
├─ AQIInfoPanel.tsx
├─ IndustryDetailsPanel.tsx
├─ LocationComparison.tsx
├─ BookmarkLocations.tsx
└─ MobileMenu.tsx
```

**Responsive Design (35 hours: Sriya 35h)**
```
├─ Tailwind CSS configuration
├─ Mobile breakpoints
├─ Tablet optimization
├─ Touch-friendly controls
└─ Responsive images
```

### Tasks (Siddhant - 100%)

**Basic Components (35 hours)**
```
├─ LoadingSpinner.tsx
├─ PageLoader.tsx
├─ Button components
├─ Card components
└─ Form inputs
```

**Testing & QA (65 hours)**
```
├─ Manual testing
├─ Cross-browser testing
├─ Bug reporting
├─ Regression testing
└─ Documentation testing
```

---

## Detailed Task Breakdown by Member

### Pranjal Sailwal - 570 Hours

#### Backend Core (120 hours)
- FastAPI application setup (20h)
- Database architecture design (15h)
- Async database operations (15h)
- API route structure (20h)
- Pydantic schema definitions (15h)
- Global exception handling (10h)
- CORS middleware configuration (5h)
- Application lifecycle management (10h)
- Health check endpoints (5h)
- Logging configuration (5h)

#### Data Source Integrations (100 hours)
- AQICN API client (15h)
- AQICN authentication & rate limiting (10h)
- OpenAQ v3 API client (10h)
- OpenAQ pagination handling (5h)
- Automatic source switching logic (10h)
- NASA FIRMS integration (15h)
- NASA OMI satellite data (15h)
- NASA VIIRS integration (10h)
- Bhuvan WMS tile fetching (5h)
- WRI power plant processing (5h)

#### Core Algorithms (80 hours)
- CPCB AQI calculation engine (20h)
- Sub-index calculations for 6 pollutants (15h)
- Health advisory generation (10h)
- IDW interpolation algorithm (15h)
- Adaptive search radius (10h)
- Tile generation system (10h)

#### Layer Processors (40 hours)
- Pollution heatmap processor (4h)
- State aggregation logic (3h)
- Dynamic AQI processing (3h)
- Population exposure calculation (5h)
- Satellite data handlers (8h)
- Fire density analysis (4h)
- Wind climate processing (4h)
- Industry overlay logic (3h)
- 8 additional processors (6h)

#### Quantum Computing (150 hours)
- Qiskit framework research (30h)
- Quantum algorithm study (30h)
- QuantumEnvironmentalProcessor class (50h)
- Superposition processing (15h)
- Entanglement analysis (15h)
- Grover's algorithm (10h)

#### Database Security (50 hours)
- Security architecture design (10h)
- Token generation system (10h)
- Token validation logic (10h)
- Audit logging system (10h)
- Connection proxy implementation (10h)

#### Performance & Optimization (20 hours)
- Async I/O optimization (5h)
- Thread pool configuration (3h)
- Process pool setup (3h)
- Memory profiling (3h)
- Query optimization (3h)
- Caching implementation (3h)

#### Documentation (30 hours)
- README creation with flowcharts (15h)
- WORK_DISTRIBUTION documentation (10h)
- API documentation review (5h)

#### Testing & Debugging (40 hours)
- Backend integration testing (15h)
- API endpoint testing (10h)
- Performance profiling (10h)
- Bug fixes (5h)

### Prakriti Kimothi - 300 Hours

#### Frontend Core (80 hours)
- Next.js application setup (10h)
- BaseMap component (MapLibre GL) (15h)
- LayerManager implementation (15h)
- Legend component (10h)
- TimeSlider for temporal data (10h)
- ModernSearch component (10h)
- ModernLayerManager UI (10h)

#### Layer Components (90 hours)
- Pollution layers (5 components × 3h) (15h)
- Industry layers (3 components × 3h) (9h)
- Population layers (3 components × 3h) (9h)
- Satellite layers (6 components × 4h) (24h)
- Fire layers (2 components × 4h) (8h)
- Other layers (7 components × 3h) (21h)
- Layer state management (4h)

#### PDF Generation (50 hours)
- PDF generator architecture (10h)
- 12-section report structure (15h)
- Chart generation system (15h)
- Map screenshot integration (5h)
- Report assembly logic (5h)

#### Data Visualization (60 hours)
- Chart.js integration (10h)
- Recharts integration (8h)
- Time series charts (8h)
- Pollutant comparison charts (6h)
- Wind rose diagrams (8h)
- AQI distribution histograms (6h)
- Scatter plots (4h)
- Radar charts (4h)
- Chart styling configuration (6h)

#### Utility Modules (20 hours)
- meteorologyUtils.ts (5h)
- fireDetectionUtils.ts (5h)
- mapExportUtils.ts (5h)
- dataValidator.ts (5h)

### Sriya Rawat - 140 Hours

#### UI/UX Design (60 hours)
- Application layout design (15h)
- Color scheme and branding (10h)
- Component design system (10h)
- Wireframe creation (10h)
- Responsive breakpoint strategy (10h)
- Accessibility review (5h)

#### Component Implementation (50 hours)
- ModernHeader design & code (8h)
- Information panels (15h)
- Modal components (8h)
- Tooltip design (4h)
- Form components (8h)
- Loading indicators (3h)
- Error displays (4h)

#### Styling & Polish (30 hours)
- Tailwind CSS configuration (5h)
- Custom utility classes (5h)
- Component styling (10h)
- Mobile optimization (10h)

### Siddhant Dabral - 105 Hours

#### Frontend Assistance (50 hours)
- Basic button components (8h)
- Card components (8h)
- Form input components (10h)
- LoadingSpinner (6h)
- PageLoader (6h)
- Styling assistance (12h)

#### Database Support (30 hours)
- Initial database setup (8h)
- Test data entry (10h)
- Basic SQL queries (8h)
- Data integrity checks (4h)

#### Testing & QA (25 hours)
- Manual UI testing (10h)
- Cross-browser testing (8h)
- Bug reporting (5h)
- Regression testing (2h)

---

## Component Ownership Matrix

### Backend Components

| Component | Primary Owner | Contribution | Lines of Code |
|-----------|---------------|--------------|---------------|
| main.py | Pranjal | 100% | 189 |
| routes/aqi.py | Pranjal | 100% | 280 |
| routes/layers.py | Pranjal | 100% | 350 |
| routes/tiles.py | Pranjal | 100% | 180 |
| routes/search.py | Pranjal | 100% | 150 |
| routes/quantum.py | Pranjal | 100% | 430 |
| quantum/processor.py | Pranjal | 100% | 600+ |
| quantum/state_manager.py | Pranjal | 100% | 262 |
| middleware/database_guard.py | Pranjal | 100% | 341 |
| core/aqi_calculator.py | Pranjal | 100% | 220 |
| core/idw_interpolation.py | Pranjal | 100% | 180 |
| core/tile_generator.py | Pranjal | 100% | 200 |
| 16 layer processors | Pranjal | 100% | ~2400 |
| 10 data source modules | Pranjal | 100% | ~1500 |

**Total Backend:** Pranjal 100% (~7,282 lines)

### Frontend Components

| Component | Primary Owner | Secondary | Contribution Split |
|-----------|---------------|-----------|-------------------|
| BaseMap.tsx | Prakriti | - | 100% |
| LayerManager.tsx | Prakriti | Sriya | 85% / 15% |
| Legend.tsx | Prakriti | Sriya | 70% / 30% |
| TimeSlider.tsx | Prakriti | - | 100% |
| 26 Layer Components | Prakriti | - | 100% |
| ModernHeader.tsx | Sriya | Prakriti | 60% / 40% |
| ModernSearch.tsx | Prakriti | Sriya | 80% / 20% |
| AQIInfoPanel.tsx | Prakriti | Sriya | 85% / 15% |
| IndustryDetailsPanel.tsx | Prakriti | Sriya | 85% / 15% |
| LocationComparison.tsx | Prakriti | Sriya | 90% / 10% |
| LoadingSpinner.tsx | Siddhant | Sriya | 50% / 50% |
| PageLoader.tsx | Siddhant | Sriya | 50% / 50% |
| MobileMenu.tsx | Sriya | - | 100% |
| researchGradePDFGenerator.ts | Prakriti | - | 100% |
| researchChartGenerator.ts | Prakriti | - | 100% |
| meteorologyUtils.ts | Prakriti | - | 100% |
| fireDetectionUtils.ts | Prakriti | - | 100% |
| mapExportUtils.ts | Prakriti | - | 100% |

**Total Frontend:** Prakriti 75%, Sriya 18%, Siddhant 7% (~13,000 lines)

---

## Execution Flow Diagrams

### Backend Request Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND EXECUTION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

HTTP Request from Frontend
         │
         ▼
┌─────────────────────┐
│  FastAPI Router     │ ◄── Pranjal: Route definition & validation
│  (routes/*.py)      │
└──────────┬──────────┘
           │
           ├─→ /aqi/calculate
           │      │
           │      ▼
           │   ┌────────────────────────┐
           │   │  AQI Calculator        │ ◄── Pranjal: CPCB algorithm
           │   │  - Validate inputs     │
           │   │  - Calculate sub-index │
           │   │  - Get max sub-index   │
           │   │  - Generate advisory   │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Data Source Query     │ ◄── Pranjal: API integration
           │   │  - Try AQICN           │
           │   │  - Fallback to OpenAQ  │
           │   │  - Cache result        │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Quantum Processing    │ ◄── Pranjal: Qiskit integration
           │   │  - Create circuit      │
           │   │  - Execute simulation  │
           │   │  - Collapse state      │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Database Guard        │ ◄── Pranjal: Security layer
           │   │  - Generate token      │
           │   │  - Validate access     │
           │   │  - Log operation       │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Database Query        │ ◄── Pranjal: SQLite async
           │   │  - Execute with token  │
           │   │  - Return result       │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Response Format       │ ◄── Pranjal: Pydantic models
           │   │  - Serialize data      │
           │   │  - Add metadata        │
           │   └────────┬───────────────┘
           │            │
           ├────────────┘
           │
           ├─→ /layers/*
           │      │
           │      ▼
           │   ┌────────────────────────┐
           │   │  Layer Processor       │ ◄── Pranjal: Layer logic
           │   │  - IDW interpolation   │
           │   │  - Spatial aggregation │
           │   │  - Data transformation │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Tile Generator        │ ◄── Pranjal: Tile creation
           │   │  - Generate PNG/GeoJSON│
           │   │  - Cache tile          │
           │   └────────┬───────────────┘
           │            │
           ├────────────┘
           │
           └─→ /quantum/*
                  │
                  ▼
              ┌────────────────────────┐
              │  Quantum Circuit       │ ◄── Pranjal: Qiskit circuits
              │  - Build circuit       │
              │  - Apply gates         │
              │  - Measure qubits      │
              │  - Return probabilities│
              └────────────────────────┘
                  │
                  ▼
          JSON Response to Frontend
```

### Frontend Rendering Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND EXECUTION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

User Interaction
         │
         ▼
┌─────────────────────┐
│  React Component    │
│  (Next.js App)      │
└──────────┬──────────┘
           │
           ├─→ Layer Selection
           │      │
           │      ▼
           │   ┌────────────────────────┐
           │   │  LayerManager          │ ◄── Prakriti: Layer control
           │   │  - Toggle layer        │
           │   │  - Update opacity      │
           │   │  - Trigger fetch       │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  API Client (Axios)    │ ◄── Prakriti: HTTP requests
           │   │  - GET /layers/{name}  │
           │   │  - Handle response     │
           │   │  - Error handling      │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Layer Component       │ ◄── Prakriti: Layer rendering
           │   │  - Process GeoJSON     │
           │   │  - Create Deck.gl layer│
           │   │  - Configure styling   │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  MapLibre GL JS        │ ◄── Prakriti: Map rendering
           │   │  - Add layer to map    │
           │   │  - Render at 60fps     │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Legend Update         │ ◄── Sriya: Legend design
           │   │  - Update color scale  │    ◄── Prakriti: Legend logic
           │   │  - Show layer info     │
           │   └────────────────────────┘
           │
           ├─→ PDF Generation
           │      │
           │      ▼
           │   ┌────────────────────────┐
           │   │  Data Collection       │ ◄── Prakriti: Data gathering
           │   │  - Fetch AQI data      │
           │   │  - Fetch layers        │
           │   │  - Capture map         │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Chart Generation      │ ◄── Prakriti: Chart.js
           │   │  - Time series         │
           │   │  - Comparisons         │
           │   │  - Wind roses          │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  PDF Assembly          │ ◄── Prakriti: jsPDF
           │   │  - Add sections        │    ◄── Sriya: PDF styling
           │   │  - Embed charts        │
           │   │  - Add map screenshots │
           │   └────────┬───────────────┘
           │            │
           │            ▼
           │   ┌────────────────────────┐
           │   │  Download PDF          │
           │   └────────────────────────┘
           │
           └─→ UI Interactions
                  │
                  ▼
              ┌────────────────────────┐
              │  UI Components         │ ◄── Sriya: UI design
              │  - Header              │    ◄── Prakriti: Functionality
              │  - Panels              │    ◄── Siddhant: Basic components
              │  - Modals              │
              │  - Forms               │
              └────────────────────────┘
```

### Quantum Circuit Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                 QUANTUM PROCESSING EXECUTION FLOW                   │
│                     (Pranjal - 100% Implementation)                 │
└─────────────────────────────────────────────────────────────────────┘

Data Sources Input
         │
         ▼
┌───────────────────────┐
│  Quantum Processor    │
│  Initialize 8 qubits  │
└──────────┬────────────┘
           │
           ▼
┌────────────────────────┐
│  Circuit Construction  │
│                        │
│  1. Create 8-qubit     │
│     circuit            │
│                        │
│  2. Apply Hadamard     │
│     gates (H) to       │
│     all qubits         │
│     → Superposition    │
│                        │
│  3. Encode data to     │
│     phase angles       │
│     (RZ gates)         │
│                        │
│  4. Apply CNOT gates   │
│     for entanglement   │
│                        │
│  5. Add measurement    │
│     operations         │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Circuit Transpilation │
│                        │
│  - Optimization lvl 3  │
│  - Gate decomposition  │
│  - Circuit simplify    │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Statevector Simulator │
│                        │
│  - Initialize state    │
│  - Evolve through gates│
│  - Calculate amplitudes│
│  - State dimension: 256│
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Measurement (1024x)   │
│                        │
│  - Sample from state   │
│  - Get bit strings     │
│  - Calculate counts    │
│  - Probability dist    │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Classical Post-Process│
│                        │
│  - Collapse state      │
│  - Weighted average    │
│  - Calculate fidelity  │
│  - Format result       │
└──────────┬─────────────┘
           │
           ▼
    Final Result Output
```

---

## Technology Skills Matrix

| Technology | Pranjal | Prakriti | Sriya | Siddhant |
|------------|---------|----------|-------|----------|
| **Backend** |
| Python | ⬛⬛⬛⬛⬛ | ⬛⬛⬜⬜⬜ | ⬜⬜⬜⬜⬜ | ⬛⬜⬜⬜⬜ |
| FastAPI | ⬛⬛⬛⬛⬛ | ⬛⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| Qiskit | ⬛⬛⬛⬛⬛ | ⬜⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| NumPy/Pandas | ⬛⬛⬛⬛⬛ | ⬛⬛⬛⬜⬜ | ⬜⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| Async Programming | ⬛⬛⬛⬛⬛ | ⬛⬛⬜⬜⬜ | ⬜⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| **Frontend** |
| React/Next.js | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬛⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬜⬜⬜ |
| TypeScript | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬛⬜ | ⬛⬛⬜⬜⬜ | ⬛⬜⬜⬜⬜ |
| MapLibre GL JS | ⬛⬛⬜⬜⬜ | ⬛⬛⬛⬛⬜ | ⬛⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| Chart.js | ⬜⬜⬜⬜⬜ | ⬛⬛⬛⬛⬛ | ⬛⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| jsPDF | ⬜⬜⬜⬜⬜ | ⬛⬛⬛⬛⬜ | ⬛⬜⬜⬜⬜ | ⬜⬜⬜⬜⬜ |
| **Design** |
| UI/UX Design | ⬜⬜⬜⬜⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬛⬛ | ⬜⬜⬜⬜⬜ |
| Tailwind CSS | ⬛⬜⬜⬜⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬛⬜ | ⬛⬛⬜⬜⬜ |
| Responsive Design | ⬜⬜⬜⬜⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬛⬛ | ⬛⬜⬜⬜⬜ |
| **Other** |
| Git/GitHub | ⬛⬛⬛⬛⬛ | ⬛⬛⬛⬛⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬛⬜⬜ |
| Testing/QA | ⬛⬛⬛⬛⬜ | ⬛⬛⬛⬜⬜ | ⬛⬛⬜⬜⬜ | ⬛⬛⬛⬛⬜ |
| Documentation | ⬛⬛⬛⬛⬛ | ⬛⬛⬛⬜⬜ | ⬛⬛⬜⬜⬜ | ⬛⬜⬜⬜⬜ |

**Legend:** ⬛ = Strong | ⬜ = Limited/None

---

## Key Achievements by Member

### Pranjal Sailwal

1. **Quantum Computing Implementation** - Implemented production-grade quantum processor using IBM Qiskit with 600+ lines of code
2. **Multi-API Integration** - Successfully integrated 10+ external data sources with intelligent fallback mechanisms
3. **Database Security** - Designed and implemented token-based API-only access control system
4. **Performance Optimization** - Achieved 6-9x speedup through async processing and parallel execution
5. **Algorithm Development** - Created CPCB-compliant AQI calculator and IDW spatial interpolation
6. **System Architecture** - Designed scalable backend supporting 50+ concurrent users

### Prakriti Kimothi

1. **PDF Generation System** - Created research-grade PDF generator with 12 sections and 15+ chart types
2. **26 Layer Components** - Developed complete set of environmental data layers with real-time updates
3. **Data Visualization** - Implemented comprehensive chart library with publication-ready styling
4. **Map Integration** - Built MapLibre GL JS integration with Deck.gl for WebGL-powered visualizations
5. **Utility Modules** - Created meteorology, fire detection, and map export utilities
6. **Frontend Architecture** - Designed component structure and state management

### Sriya Rawat

1. **UI/UX Design** - Created cohesive, professional interface design for entire application
2. **Responsive Layouts** - Implemented mobile-first responsive design across all breakpoints
3. **Design System** - Established reusable component library with Tailwind CSS
4. **Accessibility** - Ensured WCAG compliance and screen reader compatibility
5. **Visual Polish** - Applied consistent styling and branding throughout application
6. **User Experience** - Optimized interaction flows and information hierarchy

### Siddhant Dabral

1. **Quality Assurance** - Conducted comprehensive testing across browsers and devices
2. **Bug Documentation** - Identified and documented 100+ bugs during testing
3. **Component Support** - Developed basic UI components and form validation
4. **Database Assistance** - Helped with test data preparation and validation
5. **Regression Testing** - Ensured no feature breaks during development
6. **Documentation Review** - Verified accuracy of technical documentation

---

## Conclusion

The 6-month development cycle produced a professional-grade environmental intelligence platform with quantum-enhanced processing capabilities, ready for production deployment and external evaluation.

---

**Total Project Investment:** 1,050 developer hours
**Lines of Code:** ~25,000
**Components:** 101 (42 backend, 59 frontend)
**API Endpoints:** 30+
**Environmental Layers:** 26
**Quantum Code:** 600+ lines using IBM Qiskit

**Status:** Production Ready | Version 1.0.0 | January 2026

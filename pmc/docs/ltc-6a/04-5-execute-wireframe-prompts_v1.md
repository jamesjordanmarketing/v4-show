# Tutorial: Executing Wireframe Prompts for Advanced Training Framework UI

**Version:** 1.0  
**Date:** January 4, 2026  
**Purpose:** Step-by-step guide for generating wireframes and implementing UI from E08-E10 prompts  
**Audience:** Designers, Frontend Developers, Product Managers

---

## Table of Contents

1. [Understanding the Tool Ecosystem](#understanding-the-tool-ecosystem)
2. [Approach A: Generate Wireframes in Figma (Recommended)](#approach-a-generate-wireframes-in-figma-recommended)
3. [Approach B: Direct Implementation in Cursor (Advanced)](#approach-b-direct-implementation-in-cursor-advanced)
4. [Approach C: Hybrid Workflow (Best Practice)](#approach-c-hybrid-workflow-best-practice)
5. [Sequential Execution Guide](#sequential-execution-guide)
6. [Troubleshooting & Tips](#troubleshooting--tips)
7. [Quality Checklist](#quality-checklist)

---

## Understanding the Tool Ecosystem

### Tool Purposes & Capabilities

**🎨 Figma + Figma Make AI**
- **Purpose:** Visual design and wireframe generation
- **Capability:** Generates actual UI wireframes from text prompts
- **Best for:** Creating visual mockups, design reviews, stakeholder presentations
- **Output:** Interactive Figma files with components, layouts, and styling
- **URL:** https://www.figma.com

**💻 Cursor (AI-Powered Code Editor)**
- **Purpose:** Code generation and implementation
- **Capability:** Generates TypeScript/React code from specifications
- **Best for:** Implementing frontend components, API routes, business logic
- **Output:** Production-ready code files
- **Not capable of:** Generating visual wireframes or design files

**🔄 V0 by Vercel**
- **Purpose:** AI-powered UI component generation
- **Capability:** Generates React/Next.js components from prompts
- **Best for:** Rapid prototyping, component libraries
- **Output:** Shadcn/UI based React components
- **URL:** https://v0.dev

### Which Tool for What?

| Task | Tool | Why |
|------|------|-----|
| **Generate Visual Wireframes** | Figma Make AI | Creates actual visual designs |
| **Design Review with Stakeholders** | Figma | Visual, interactive, shareable |
| **Component Implementation** | Cursor + AI | Generates production TypeScript/React |
| **Rapid Prototyping** | V0 by Vercel | Quick component generation |
| **Code Documentation** | Cursor | Extract specs from prompts |
| **API Development** | Cursor | Backend implementation |

### Important Clarification

**Your E08-E10 prompts were designed for Figma Make AI**, following the format of your existing E01-E07 prompts. They contain:
- Detailed visual specifications (colors, spacing, layout)
- Component descriptions (cards, buttons, modals)
- Interaction patterns (hover states, animations)
- Responsive design breakpoints

These are **design specifications**, not code specifications. Cursor cannot directly generate wireframes from them, but it can help implement the designs once created.

---

## Approach A: Generate Wireframes in Figma (Recommended)

This is the **primary intended workflow** for E08-E10 prompts.

### Prerequisites

1. **Figma Account**
   - Free account: https://www.figma.com/signup
   - Or Professional/Organization account

2. **Figma Desktop App** (Recommended) or Web Browser
   - Download: https://www.figma.com/downloads/

3. **Access to Figma Make AI**
   - Requires Figma Professional plan or trial
   - Alternative: Use Figma AI features in free tier (more limited)

4. **Project Setup**
   - Create new Figma file: "LoRA Pipeline - Advanced Training UI"
   - Create pages for each prompt: "E08 Configuration", "E09 Monitoring", "E10 Results"

---

### Step-by-Step: E08 Advanced Training Configuration

#### Step 1: Open Figma Make AI

**In Figma Desktop App:**
1. Open your project file
2. Navigate to "E08 Configuration" page
3. Click on the toolbar or press `/` to open command palette
4. Type "Make" or "AI" to find Figma Make AI feature
5. Or look for "Make design" button (purple, AI icon)

**Alternative (if no direct Make AI access):**
- Use Figma's AI features through plugins
- Or manually create components following specifications

#### Step 2: Prepare the Prompt

**Open the E08 prompt file:**
```
C:\Users\james\Master\BrightHub\BRun\lora-pipeline\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-prompt-E08-output.md
```

**Extract the key sections:**
1. Copy the **entire prompt** (all 1,150 lines)
2. Or start with smaller sections for iterative generation

**Recommended chunking strategy:**
Since E08 is large, break it into manageable chunks:

**Chunk 1: Advanced Options Section + Engine Selection**
- Lines 1-50: Context and goals
- Lines 51-350: Advanced Options collapsible + Engine Selection cards
- Generate first, review, then proceed

**Chunk 2: Metrics Configuration**
- Lines 351-600: Universal Metrics + Specialized Metrics
- Includes checkbox cards and cost impact display

**Chunk 3: Integration Components**
- Lines 601-750: Metric Detail Modal
- Integration with cost estimate
- Form validation

#### Step 3: Generate First Chunk

**In Figma Make AI:**

1. **Paste the prompt:**
   ```
   Copy from "## Prompt for Figma Make AI" section through 
   "SECTION 2: Engine Selection Component"
   ```

2. **Add generation instructions:**
   ```
   Generate a wireframe for the Advanced Options section with Engine Selection.
   
   This is part of an existing training configuration page.
   
   Create:
   - Collapsible "Advanced Options" section header
   - Three engine selection radio cards (Auto-Select, TRL Standard, TRL Advanced)
   - Follow the exact styling and layout specifications provided
   - Use the component structure defined in the prompt
   
   Design system:
   - Primary color: Blue (#3B82F6)
   - Gray scale: #F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB
   - Semantic colors: Green (#10B981), Orange (#F59E0B), Red (#EF4444)
   - Font: Inter (or system default)
   - Border radius: 8px
   - Card shadows: Subtle, consistent with existing E01-E07 designs
   ```

3. **Click "Generate" or "Create"**

4. **Review output:**
   - Check component placement
   - Verify styling matches specifications
   - Ensure responsive layouts are considered

#### Step 4: Iterate and Refine

**Common adjustments needed:**

1. **If components are too generic:**
   - Add more specific details: "Make the Auto-Select card have a green tinted border"
   - Reference specific line numbers from prompt: "See lines 125-145 for exact specifications"

2. **If layout is wrong:**
   - Clarify: "Engine cards should be stacked vertically, not horizontally"
   - Provide dimensions: "Each card should be full width with 16px padding"

3. **If missing features:**
   - Point to specific sections: "Add the 'Learn More' expandable link as specified in lines 180-185"
   - Request additions: "Include the feature badges as blue/green/gray chips"

#### Step 5: Generate Remaining Chunks

**Repeat for Chunk 2 (Metrics Configuration):**

1. Copy lines 351-600 from E08 prompt
2. Paste into Figma Make AI with context:
   ```
   This is the Metrics Configuration section, which comes immediately 
   after the Engine Selection section you just generated.
   
   Generate the metrics selection interface with:
   - Universal Metrics subsection (read-only, light gray background)
   - Specialized Metrics subsection (interactive checkbox cards)
   - Cost Impact Display at the bottom
   
   [Paste the relevant section from E08 prompt]
   ```

3. Generate and review

**Repeat for Chunk 3 (Modal and Integration):**

1. Copy lines 601-750
2. Generate Metric Detail Modal as overlay component
3. Add form validation states

#### Step 6: Create Component Library

**In Figma, organize generated components:**

1. **Create component variants:**
   - Engine Card: Default, Selected, Hover, Disabled states
   - Metric Checkbox Card: Unchecked, Checked, Hover, Disabled states
   - Cost Impact Banner: Default, Updated states

2. **Set up auto-layout:**
   - Engine cards: Vertical stack, 12px gap
   - Metric cards: Vertical stack, 12px gap
   - Responsive breakpoints: Desktop (1024+), Tablet (768-1023), Mobile (<768)

3. **Add interactions:**
   - Radio button selection animation
   - Checkbox toggle animation
   - Modal open/close transitions
   - Cost impact counter animation

4. **Document usage:**
   - Add descriptions to components
   - Note integration points with E01
   - Link to full E08 specification

---

### Step-by-Step: E09 Enhanced Job Monitoring

Follow the same process as E08, but optimized for E09:

#### E09 Chunking Strategy

**Chunk 1: Engine Information Panel**
- Lines 1-50: Context
- Lines 51-250: Engine Info Panel
- Simpler than E08, single component

**Chunk 2: Metrics Tabs Interface**
- Lines 251-450: Tab navigation + Universal Metrics table
- Focus on table structure and real-time updates

**Chunk 3: Specialized/Domain Tabs + Modal**
- Lines 451-650: Additional metric tabs
- Metric detail modal (similar to E08 but different content)

#### E09-Specific Instructions for Figma Make AI

```
This enhances an existing job monitoring page (E02).

Generate:
1. Engine Information Panel - card showing engine name, model, quantization
2. Tabbed Metrics Interface - Universal/Domain/Specialized tabs
3. Metrics Table - with trend indicators (arrows, colors)
4. Real-time update indicators - "Live" badge, "Last updated" timestamps

Key features:
- Tabs with counts: "Universal (4)", "Specialized (3)"
- Trend arrows: Green down (good for loss), Red up (bad for loss)
- Live polling indicator: Green pulsing dot
- Stale data indicator: Orange text for >30s old data

[Paste relevant E09 sections]
```

---

### Step-by-Step: E10 Results Dashboard

E10 is the most complex - consider generating in 4-5 chunks:

#### E10 Chunking Strategy

**Chunk 1: Summary Cards + Header**
- Lines 1-50: Context and page layout
- Lines 51-300: Summary metric cards (4-column grid)

**Chunk 2: Training Loss Chart**
- Lines 301-450: Interactive line chart
- Focus on chart design, not implementation

**Chunk 3: Detailed Metrics Table**
- Lines 451-650: Tabbed metrics table
- Similar structure to E09 but for final results

**Chunk 4: Model Files + Traceability**
- Lines 651-850: Download section + traceability panel
- Multiple columns, grid layouts

**Chunk 5: Modals + Export**
- Lines 851-1000+: Metric detail modal, export dropdown
- Reuses patterns from E08/E09

#### E10-Specific Instructions

```
This is a NEW complete page: /training/jobs/[jobId]/results

Generate a comprehensive results dashboard with:

Page structure:
- Header: Title + Export button
- Summary Cards: 4-column grid (Final Loss, Training Time, Total Cost, Specialized Metric)
- Loss Chart: Large interactive line chart (400px height)
- Metrics Table: Tabbed interface (reuse E09 pattern)
- Model Files: Download buttons + file list
- Traceability: 2-column info grid with blue border

Design notes:
- This page is for "celebration" - training succeeded
- Professional design suitable for client presentations
- Clean, spacious layout with good white space
- Charts should be prominent and easy to read

[Paste relevant E10 sections]
```

---

## Approach B: Direct Implementation in Cursor (Advanced)

If you want to **skip wireframes** and go directly to code implementation, use Cursor with the prompts as specifications.

### Prerequisites

1. **Cursor Editor** installed
   - Download: https://cursor.sh

2. **Project open** in Cursor:
   - `C:\Users\james\Master\BrightHub\BRun\lora-pipeline`

3. **Dependencies** installed:
   ```bash
   npm install
   # Ensure all packages from package.json are installed
   ```

---

### Step-by-Step: Implementing E08 in Cursor

#### Step 1: Create Component File

**In Cursor:**

1. Navigate to: `src/components/training/`
2. Create new file: `EngineSelector.tsx`
3. Open the file in Cursor

#### Step 2: Use Cursor AI to Generate Component

**Method 1: Cursor Composer (Recommended)**

1. Press `Cmd+I` (Mac) or `Ctrl+I` (Windows) to open Cursor Composer
2. Paste this prompt:

```
Generate a React component for Engine Selection based on this specification:

CONTEXT:
This is a component for the training configuration page that allows users to select which training engine to use.

REQUIREMENTS FROM E08 PROMPT:
[Copy and paste lines 150-350 from E08 prompt - the Engine Selection Component section]

ADDITIONAL TECHNICAL REQUIREMENTS:
- Use TypeScript with proper types
- Use Next.js 14 App Router patterns
- Use shadcn/ui components (RadioGroup, Card, Badge, Label)
- Use Tailwind CSS for styling
- Implement proper state management with useState
- Include all three engine options: Auto-Select, TRL Standard, TRL Advanced
- Add help tooltips and expandable "Learn More" sections
- Handle disabled state for TRL Advanced if dataset incompatible

INTEGRATION:
- This component will be used in: src/app/(dashboard)/training/configure/page.tsx
- Should accept props: selectedEngine, onEngineChange, datasetType
- Should fetch available engines from: /api/engines

FILE STRUCTURE:
Create these files:
1. src/components/training/EngineSelector.tsx (main component)
2. src/lib/types/training-contracts.ts (add EngineOption type)

Generate complete, production-ready code with:
- Full TypeScript types
- Proper error handling
- Loading states
- Accessibility features (ARIA labels, keyboard navigation)
- Responsive design (Tailwind breakpoints)
```

3. Press `Enter` or click "Generate"
4. Review generated code
5. Click "Apply" to accept changes

**Method 2: Cursor Chat (Iterative)**

1. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows) to open Cursor Chat
2. Start conversation:

```
I need to implement the Engine Selection component from the E08 wireframe specification.

The specification is in this file:
C:\Users\james\Master\BrightHub\BRun\lora-pipeline\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-prompt-E08-output.md

Lines 150-350 contain the Engine Selection Component specification.

Can you:
1. Read that section
2. Generate the EngineSelector.tsx component
3. Use shadcn/ui components and Tailwind CSS
4. Follow Next.js 14 best practices
```

3. Cursor will read the file and generate code
4. Iterate with follow-up questions:
   - "Add the expandable 'Learn More' sections"
   - "Implement the disabled state for TRL Advanced"
   - "Add loading skeleton while fetching engines"

#### Step 3: Generate Related Files

**Types/Interfaces:**

In Cursor Chat:
```
Based on the EngineSelector component, generate the TypeScript types.

Add to: src/lib/types/training-contracts.ts

Include:
- EngineOption interface
- EngineSelectionProps interface  
- EngineSelectorProps interface

Based on the API specification in E08 prompt (Section 10: API Integration Requirements)
```

**API Route:**

In Cursor Chat:
```
Generate the API route for fetching available engines.

File: src/app/api/engines/route.ts

Based on the API specification in E08 prompt (lines 900-950)

Should return:
- List of available engines with features, models supported, etc.
- Mock data for now (we'll connect to backend later)
```

#### Step 4: Integrate into Configuration Page

**In Cursor Composer:**

1. Open `src/app/(dashboard)/training/configure/page.tsx`
2. Press `Cmd+I` to open Composer
3. Prompt:

```
Integrate the new EngineSelector component into this training configuration page.

Requirements:
1. Add a collapsible "Advanced Options" section after the hyperparameters section
2. Inside Advanced Options, add:
   - EngineSelector component
   - MetricsConfiguration component (we'll generate this next)
3. Wire up state management:
   - Add engineId to form state
   - Add metricsToCollect to form state
4. Update cost estimation API call to include engineId and metrics
5. Follow the integration pattern specified in E08 prompt (Section 5: Integration with Cost Estimate)

Use existing patterns from this page for consistency.
```

4. Review and apply changes

#### Step 5: Repeat for Metrics Configuration

Follow the same pattern:
1. Create `MetricsConfiguration.tsx`
2. Generate using Cursor Composer with E08 specification (lines 351-600)
3. Add to Advanced Options section
4. Wire up state and API calls

---

### Step-by-Step: Implementing E09 in Cursor

Similar process but enhancing existing page:

#### Identify Integration Points

**In Cursor Chat:**
```
I need to enhance the existing job monitoring page with new components from E09 specification.

Current page: src/app/(dashboard)/training/jobs/[jobId]/page.tsx

E09 adds:
1. Engine Information Panel (new card)
2. Enhanced Real-time Metrics Panel (new card with tabs)

Can you:
1. Read the E09 specification from:
   C:\Users\james\Master\BrightHub\BRun\lora-pipeline\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-prompt-E09-output.md
2. Identify where to insert new components in the existing page
3. Generate the components following the specification
```

#### Generate Components

**Component 1: Engine Information Panel**

In Cursor Composer:
```
Generate EngineInformationPanel component based on E09 specification (lines 100-250).

Component should display:
- Engine name with version badge
- Model name with icon
- Quantization method with info tooltip
- LoRA configuration
- Special features badges

Props:
- engineInfo: EngineInfo (create this type)
- status: JobStatus

Include loading and error states.
```

**Component 2: Enhanced Metrics Panel**

In Cursor Composer:
```
Generate EnhancedMetricsPanel component based on E09 specification (lines 251-650).

Features:
- Tabbed interface (Universal, Domain, Specialized)
- Metrics table with trend indicators
- Real-time polling (5-second interval)
- Metric detail modal
- Live status indicator

This is more complex - generate in stages:
1. First: Basic tabbed structure
2. Then: Metrics table with data
3. Then: Real-time polling logic
4. Finally: Metric detail modal
```

---

### Step-by-Step: Implementing E10 in Cursor

E10 is a new page, so start fresh:

#### Create Page Structure

**In Cursor Composer:**

1. Create `src/app/(dashboard)/training/jobs/[jobId]/results/page.tsx`
2. Prompt:

```
Generate a complete new page for training results dashboard based on E10 specification.

This is a new page route: /training/jobs/[jobId]/results

Page structure (from E10 prompt):
1. Page header with title, job ID, timestamp, export button
2. Summary metrics cards (4-column grid)
3. Training loss chart (interactive line chart)
4. Detailed metrics table (tabbed interface)
5. Model files download section
6. Traceability information panel

Use Next.js 14 App Router patterns.
Use server components where appropriate, client components for interactivity.

Start with the page layout and header. We'll add components iteratively.
```

#### Generate Components Iteratively

**Component 1: Summary Cards**
```
Generate SummaryMetricCard component based on E10 lines 150-300.

Four cards:
- Final Loss with trend
- Training Time with comparison
- Total Cost with budget status
- Specialized Metric (conditional)

Create reusable card component with variants.
```

**Component 2: Loss Chart**
```
Generate TrainingLossChart component based on E10 lines 301-450.

Use Recharts or Chart.js library.

Features:
- Line chart with smooth curves
- Hover tooltips
- Zoom and pan controls
- Toggle between steps and epochs view
- Export chart data button

Install dependency first:
npm install recharts
```

**Component 3: Metrics Table**
```
Generate DetailedMetricsTable based on E10 lines 451-650.

Reuse tabbed interface pattern from E09.
But this shows final results, not real-time data.
Add sorting and search functionality.
```

**Components 4-5: Files and Traceability**
```
Generate remaining sections:
1. ModelFilesSection (E10 lines 651-750)
2. TraceabilityPanel (E10 lines 751-850)

These are simpler display components with download buttons and data grids.
```

---

## Approach C: Hybrid Workflow (Best Practice)

The **recommended production workflow** combines both tools:

### Phase 1: Design in Figma (Week 1)

1. **Generate wireframes** using Figma Make AI with E08-E10 prompts
2. **Review with stakeholders**
   - Product team
   - UX designers
   - Engineering leads
3. **Iterate on designs**
   - Refine layouts
   - Adjust colors and spacing
   - Add interaction prototypes
4. **Create design system**
   - Extract reusable components
   - Document design tokens
   - Build component library

**Deliverable:** Interactive Figma prototype with all screens

---

### Phase 2: Implementation in Cursor (Weeks 2-4)

1. **Reference Figma designs** while implementing
2. **Use Cursor AI** to generate code from specifications
3. **Follow design system** from Figma
4. **Iterate on implementation**
   - Generate components
   - Add functionality
   - Connect to backend APIs

**Workflow:**

```
For each component:
1. Open Figma design
2. Open E08/E09/E10 specification
3. Open Cursor
4. Use Cursor Composer to generate component:
   - Reference Figma design: "Match the visual design in Figma [attach screenshot]"
   - Reference specification: "Follow the requirements in E08 lines 150-350"
   - Add technical requirements: "Use TypeScript, shadcn/ui, Tailwind CSS"
5. Review generated code
6. Test in browser
7. Refine and iterate
```

**Benefits:**
- ✅ Visual validation before coding
- ✅ Stakeholder buy-in on designs
- ✅ Faster implementation with Cursor AI
- ✅ Design system consistency
- ✅ Clear handoff from design to dev

---

## Sequential Execution Guide

### Week 1: E08 Configuration

**Monday-Tuesday: Figma Wireframes**
1. Generate Engine Selection in Figma
2. Generate Metrics Configuration in Figma
3. Review and iterate

**Wednesday-Friday: Cursor Implementation**
1. Generate EngineSelector component
2. Generate MetricsConfiguration component
3. Integrate into training config page
4. Add API routes
5. Test and refine

**Deliverable:** Working advanced configuration with engine and metrics selection

---

### Week 2: E09 Monitoring

**Monday-Tuesday: Figma Wireframes**
1. Generate Engine Info Panel in Figma
2. Generate Enhanced Metrics Panel in Figma
3. Review and iterate

**Wednesday-Friday: Cursor Implementation**
1. Generate EngineInformationPanel component
2. Generate EnhancedMetricsPanel component
3. Add real-time polling logic
4. Integrate into job detail page
5. Test real-time updates

**Deliverable:** Enhanced job monitoring with engine visibility and structured metrics

---

### Week 3: E10 Results

**Monday-Tuesday: Figma Wireframes**
1. Generate results page layout in Figma
2. Generate all components (cards, chart, table, etc.)
3. Review and iterate

**Wednesday-Friday: Cursor Implementation**
1. Create new results page route
2. Generate all components sequentially
3. Connect to results API
4. Add export functionality
5. Test complete flow

**Deliverable:** Comprehensive results dashboard with full traceability

---

## Troubleshooting & Tips

### Common Issues with Figma Make AI

**Issue: Generated design doesn't match specification**

Solution:
- Be more specific in prompt
- Reference exact line numbers from E08/E09/E10
- Provide example images from E01-E07 for consistency
- Generate smaller chunks at a time

**Issue: Components are too generic**

Solution:
- Add more design details to prompt
- Specify exact colors, spacing, fonts
- Reference design system tokens
- Manually refine after generation

**Issue: Missing interactive states**

Solution:
- Explicitly request: "Include hover, focus, and disabled states"
- Generate states as component variants
- Add prototype interactions manually

---

### Common Issues with Cursor

**Issue: Generated code doesn't compile**

Solution:
- Check that all dependencies are installed
- Verify imports are correct
- Ask Cursor to fix: "This code has TypeScript errors. Fix them."

**Issue: Components don't match design**

Solution:
- Attach Figma screenshot to Cursor prompt
- Reference specific CSS values from specification
- Use "Match this exact design" in prompt

**Issue: Integration breaks existing code**

Solution:
- Test in isolated environment first
- Use feature flags to enable/disable new features
- Ask Cursor: "Integrate this component without breaking existing functionality"

---

### Best Practices

**Do:**
- ✅ Generate in small chunks (easier to review)
- ✅ Test frequently (catch issues early)
- ✅ Reference existing components (consistency)
- ✅ Use version control (commit after each component)
- ✅ Document integration points (helps team)

**Don't:**
- ❌ Generate entire page at once (too complex)
- ❌ Skip testing (catch issues early)
- ❌ Ignore specifications (they're detailed for a reason)
- ❌ Forget responsive design (test mobile too)
- ❌ Skip accessibility (keyboard navigation, screen readers)

---

## Quality Checklist

After completing each prompt (E08/E09/E10), verify:

### Design Quality (Figma)

- [ ] All components from specification are present
- [ ] Layout matches responsive breakpoints (desktop/tablet/mobile)
- [ ] Colors match design system
- [ ] Typography is consistent
- [ ] Spacing and padding follow 4px/8px grid
- [ ] Interactive states are defined (hover, focus, disabled)
- [ ] Prototypes demonstrate key interactions
- [ ] Components are organized in library
- [ ] Documentation is added to components

### Implementation Quality (Cursor)

- [ ] All components compile without errors
- [ ] TypeScript types are properly defined
- [ ] Components render correctly in browser
- [ ] Responsive design works on all breakpoints
- [ ] Interactions work (clicks, hovers, form submissions)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] API integration works (or mocked appropriately)
- [ ] Accessibility features implemented (keyboard nav, ARIA labels)
- [ ] Code follows project conventions

### Integration Quality

- [ ] New components integrate with existing pages without breaking
- [ ] State management works correctly
- [ ] Data flows properly between components
- [ ] Cost estimation updates correctly (E08)
- [ ] Real-time polling works (E09)
- [ ] Export functionality works (E10)
- [ ] Navigation between pages works
- [ ] Browser back button works correctly

---

## Alternative Tools & Options

If you don't have access to Figma Make AI or prefer different tools:

### Alternative Design Tools

**1. V0 by Vercel** (https://v0.dev)
- Generates React components from prompts
- Good for rapid prototyping
- Outputs shadcn/ui components (same as your project)
- Can paste E08/E09/E10 prompts directly
- Faster iteration than Figma

**2. Uizard** (https://uizard.io)
- AI-powered design tool
- Can generate wireframes from text
- Less mature than Figma but simpler

**3. Manual in Figma**
- Use E08/E09/E10 as specifications
- Create components manually in Figma
- Slower but more control

### Alternative Implementation

**1. Direct Coding**
- Use E08/E09/E10 as technical specifications
- Write code manually with Cursor AI assistance
- Most control, takes longer

**2. Component Libraries**
- Use pre-built component libraries (Material UI, Chakra UI)
- Adapt to match specifications
- Faster but less customized

---

## Summary: Recommended Approach

For your project, I recommend:

### If you have Figma Professional:
1. **Week 1:** Generate all wireframes in Figma (E08, E09, E10)
2. **Review:** Get stakeholder approval on designs
3. **Weeks 2-4:** Implement in Cursor following Figma designs + specifications
4. **Use:** Hybrid workflow with design validation before implementation

### If you don't have Figma Professional:
1. **Option A:** Use V0 by Vercel to generate components directly
   - Paste E08/E09/E10 prompts into V0
   - Download generated React components
   - Integrate into your Next.js project
   
2. **Option B:** Skip wireframes, implement directly in Cursor
   - Use E08/E09/E10 as detailed technical specifications
   - Generate components with Cursor Composer
   - Test frequently and iterate

### Most Efficient Approach:
**Use V0 + Cursor together:**
1. Paste E08 into V0.dev → Get React component code
2. Copy code into Cursor → Refine and customize
3. Integrate into your project
4. Repeat for E09 and E10

This combines visual validation (V0 shows preview) with AI-assisted refinement (Cursor).

---

## Next Steps

1. **Choose your approach** based on available tools
2. **Start with E08** (smallest scope, good learning opportunity)
3. **Generate or implement** following this tutorial
4. **Test thoroughly** before moving to E09
5. **Iterate** based on feedback
6. **Document** your learnings for team

---

## Support & Resources

**Questions?**
- E08/E09/E10 specifications: See prompt files in `pmc/product/_mapping/pipeline/figma-combined/`
- Philosophy document: See `pmc/product/_mapping/pipeline/workfiles/model-training-philosophy_v1.md`
- Existing patterns: Reference E01-E07 prompts and implemented code in `src/`

**External Resources:**
- Figma Make AI: https://www.figma.com/ai
- V0 by Vercel: https://v0.dev
- Cursor Documentation: https://cursor.sh/docs
- Shadcn/UI: https://ui.shadcn.com

---

**End of Tutorial**

This guide provides multiple pathways to execute your wireframe prompts effectively. Choose the approach that fits your team's tools and workflow. The key is starting with clear specifications (which you have in E08/E09/E10) and using AI tools to accelerate both design and implementation.



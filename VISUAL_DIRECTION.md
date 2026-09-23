# VOID // AGENT LAB — Visual Direction

> **Industrial cybernetic research console.**
>
> The interface should feel like a deterministic AI laboratory built to observe autonomous systems.


## Screen Reference Set

The Simulation concept is the visual north star. The supporting screens use the same panel language, typography, telemetry treatment, and restrained color semantics.

- [Simulation / Agent Blueprint](docs/visuals/simulation-blueprint.svg)
- [Station / Fleet Overview](docs/visuals/station.svg)
- [Agent Configuration](docs/visuals/agent-configuration.svg)
- [Mission Selection](docs/visuals/mission-selection.svg)
- [Mission Report](docs/visuals/mission-report.svg)

Together these references define the visual system across the complete v0.1 loop:

**BUILD → DEPLOY → OBSERVE → OPTIMIZE → EXPAND**

## Visual North Star

The approved visual direction combines:

- dark matte industrial surfaces
- brushed-metal / technical panel treatment
- restrained monochrome typography
- monospaced telemetry and event output
- teal-blue for active information
- amber-orange for attention and decisions
- red reserved for danger and damage
- schematic line-art rather than glossy 3D game UI
- subtle grids, technical markings and instrument-like controls

The intended feeling is **precise, utilitarian, slightly retro-futuristic, and operational**.

It should feel like software used by engineers, not a conventional space-opera HUD.

## The Visual Signature: Agent Blueprint

The most distinctive element is the **Agent Blueprint**.

During simulation, the player's configured behavior becomes a living schematic. The current decision path is highlighted as the agent evaluates conditions and acts.

The visual relationship is:

**CONFIGURATION → DECISION → ACTION → CONSEQUENCE**

Example:

```text
             START
               │
               ▼
        ┌──────────────┐
        │ FUEL < 30% ? │
        └──────┬───────┘
               │ NO
               ▼
        ┌──────────────┐
        │ ANOMALY ?    │
        └──────┬───────┘
               │ YES
               ▼
        ┌──────────────┐
        │  SCAN ONLY   │  ← ACTIVE
        └──────┬───────┘
               │
               ▼
           CONTINUE
```

The Blueprint should not behave like a generic flowchart editor. It is a **visual explanation of autonomous behavior**.

The active path should illuminate as the simulation progresses.

## Simulation Screen

The Simulation screen is the flagship screen and establishes the game's visual identity.

### Primary regions

1. **Mission header**
   - mission name
   - agent name
   - destination
   - progress
   - simulation speed
   - mission status

2. **Agent panel**
   - persistent agent identity
   - Scout / Hauler class
   - schematic representation
   - core statistics
   - hull and fuel state

3. **Mission map**
   - schematic route
   - waypoints
   - destination
   - anomalies
   - hostiles
   - current agent position

4. **Agent Blueprint**
   - current decision path
   - active rule
   - autonomous decision state

5. **Event log**
   - timestamped machine output
   - decision entries
   - sensor events
   - actions
   - results
   - consequences

6. **Telemetry**
   - hull
   - fuel
   - velocity / progress where applicable
   - position / ETA

### Information hierarchy

The player should immediately understand:

**Where is my agent?**

then:

**What is it doing?**

then:

**Why is it doing that?**

then:

**What happened because of it?**

Telemetry supports those questions; it should not compete with them.

## Agent Representation

Agents should have persistent visual identities.

### Scout

Fast, light, efficient.

Its silhouette should communicate:
- compact structure
- high maneuverability
- exploration/sensor role

### Hauler

Heavy, durable, high-capacity.

Its silhouette should communicate:
- mass
- cargo capacity
- structural reinforcement

The visual language should remain schematic and technical rather than photorealistic.

The player should eventually recognize an agent by its identity, not only by its statistics.

## Map Language

The map is a **navigation schematic**, not a traditional galaxy-map spectacle.

Use:

- fine grid
- thin route lines
- waypoint markers
- labelled systems
- restrained orbital/planetary imagery
- clear destination markers
- state-driven anomaly and hostile symbols

The route should remain readable at a glance.

## Event Language

The event log is part of the game mechanic.

Suggested semantic treatment:

- INFO — neutral system activity
- SENSOR — detected information
- DECISION — rule evaluation
- ACTION — autonomous action
- RESULT — outcome
- WARNING — elevated risk
- DAMAGE — hull consequence
- ERROR / CRITICAL — mission-threatening failure

Color should reinforce meaning rather than decorate every line.

## Animation Philosophy

Animation communicates **state change**.

Good animation:

- agent moving along its route
- active Blueprint node changing
- route changing after a decision
- telemetry changing after an event
- hull/fuel responding to actual simulation events
- anomaly/hostile appearing
- mission completion transition

Avoid:

- constant particle effects
- unnecessary camera movement
- decorative holograms
- cinematic explosions
- perpetual pulsing everywhere

The game should feel alive because the **system is doing things**, not because the interface is constantly moving.

## Color System

Base:

- near-black / charcoal
- dark blue-black
- neutral grey
- off-white

Accent:

- **Teal / cyan** — active system information
- **Amber / orange** — attention, selected decisions, important state

Semantic:

- **Green** — success / safe
- **Amber** — warning / attention
- **Red** — danger / damage / hostile

Red should remain relatively rare so that it retains meaning.

## Typography

Use two complementary typographic modes.

### Interface

A clean technical sans-serif or condensed display face.

### Machine output

Monospace.

Telemetry, timestamps, event IDs and simulation output should feel like machine-generated information.

Typography should create hierarchy through:

- weight
- size
- spacing
- casing
- alignment

rather than excessive color.

## Panels and Controls

Panels should resemble engineered equipment:

- thin borders
- small corner details
- section labels
- subtle internal grids
- restrained shadows
- compact controls

Controls may borrow from:

- instrument toggles
- technical switches
- selector buttons
- lab equipment panels

But they must remain unmistakably usable UI.

## Station

The Station should feel like the player's **operations room**.

It answers:

- What agents do I have?
- What condition are they in?
- How much money do I have?
- What can I deploy next?

It should be calmer than the Simulation screen.

The Simulation is where the system is active; the Station is where the engineer prepares the next experiment.

## Agent Configuration

Configuration should feel like **programming behavior without writing code**.

The player should feel:

> "I am specifying how this machine should behave."

Rules should therefore be presented as explicit system controls, with enough contextual explanation to understand their consequences.

The Agent Blueprint can preview the resulting behavior.

## Mission Selection

Mission selection should feel like selecting an experiment:

- destination
- mission type
- risk
- estimated reward
- estimated duration
- requirements
- known environmental conditions

Avoid turning it into a conventional quest board.

## Mission Report

The report closes the experimental loop.

It should answer:

### What happened?

Mission outcome and timeline.

### Why?

Rules and agent characteristics that affected decisions.

### What did it cost?

Revenue, fuel, repairs, maintenance and net result.

### What changed?

Hull, fuel, XP, level and traits.

The report should make it easy to compare:

**What I configured → what the agent did → what happened.**

## Visual Restraint

The game's visual complexity should come from **information relationships**, not visual clutter.

When deciding whether to add an effect, ask:

> Does this help the player understand the autonomous system?

If not, it probably does not belong in v0.1.

## V0.1 Visual Scope

### Essential

- Simulation visual hierarchy
- Agent Blueprint
- schematic mission map
- telemetry
- meaningful event log
- technical panels
- consistent typography
- color semantics
- mission report hierarchy
- Scout / Hauler visual identities

### Later

- richer spacecraft illustrations
- environmental art
- deeper map rendering
- advanced Blueprint visualization
- more elaborate mission transitions
- ambient station animation

### Avoid for now

- 3D gameplay
- cinematic combat
- large asset libraries
- complex particle systems
- procedural visual effects
- decorative holograms
- multiplayer visual systems

## Visual Reference

The approved Simulation concept is the reference for the visual system:

**Simulation → Agent Blueprint → Map → Event Log → Telemetry**

The exact implementation may evolve, but these relationships should remain intact.

---

## Design Rule

> **Make the intelligence visible.**

VOID // AGENT LAB should look different because its interface shows the player what an autonomous system is deciding, not merely where a spaceship is.

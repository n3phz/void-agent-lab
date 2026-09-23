# VOID // AGENT LAB

> **Don’t control the intelligence. Build it.**

VOID // AGENT LAB is a dark sci-fi strategy game about designing autonomous agents, deploying them into a deterministic simulation, and learning from what they do.

**You are not the pilot. You are the engineer.**

---

## The Core Idea

Most games ask the player to **control** the action.

VOID asks the player to **design the behavior that controls itself**.

You create an agent, give it a small set of rules, choose a mission, deploy it, and watch the resulting intelligence make decisions inside a deterministic simulation.

Your job is to understand the system, identify what worked, identify what failed, and change the configuration.

> **BUILD → DEPLOY → OBSERVE → OPTIMIZE → EXPAND**

The interesting moment is not simply whether a mission succeeds.

It is understanding **why** it succeeded.

---

## The Player

The player is an AI engineer operating from a remote station.

They:

- create autonomous agents
- configure behavioral rules
- choose missions
- deploy agents
- observe their decisions
- study mission results
- modify their configurations
- build a more capable roster over time

The player should feel like they are **building intelligence**, not directly commanding a spaceship.

---

## The Core Loop

**BUILD**
Create an agent → configure it

↓

**DEPLOY**
Choose a mission → send the agent out

↓

**OBSERVE**
Watch the agent make decisions

↓

**OPTIMIZE**
Study the result → change the rules

↓

**EXPAND**
Develop better agents → tackle new missions

Every mission should teach the player something.

---

## The Key Differentiator

The game is not primarily about spaceships.

It is about **observable autonomous decision-making**.

The player should be able to see the relationship between:

**Configuration → Decision → Event → Consequence**

For example:

```
Fuel threshold: 30%
Anomaly response: Investigate Low Risk
Hostile reaction: Evade & Scan

            ↓ DEPLOY

Anomaly detected
        ↓
Risk: LOW
        ↓
Rule triggered
        ↓
INVESTIGATE
        ↓
Investigation succeeds
        ↓
+150 CR
```

The simulation log is therefore not decoration.

> **It is the game.**

---

## Deterministic Simulation

The simulation is intentionally deterministic.

The same:

- agent
- mission
- rules
- seed

produce the same result.

This makes experimentation meaningful.

A player can change one variable, run the mission again, and understand what changed.

Randomness exists inside the simulation, but it is controlled by a deterministic seed rather than arbitrary outcomes.

That creates a game where players can learn the system rather than simply hope for a favorable roll.

---

## No-Code Agent Programming

Agents are programmed through behavioral rules rather than traditional code.

The initial rule system focuses on three decisions.

### Fuel Threshold

When should the agent return?

- Conservative
- Balanced
- Aggressive
- Reckless

### Anomaly Response

What should the agent do when it discovers something unexpected?

- Ignore
- Scan Only
- Investigate Low Risk
- Investigate Any Risk

### Hostile Reaction

What should the agent do when threatened?

- Flee Immediately
- Evade & Scan
- Defend
- Bribe

These rules combine with agent statistics and mission conditions to create different behaviors.

---

## Agents

The first agents are deliberately simple.

### Scout

A fast exploration platform.

- High navigation
- Good operations
- Lower hull strength
- Small cargo capacity

### Hauler

A tougher, higher-capacity platform.

- Lower navigation
- Solid operations
- High hull strength
- Larger cargo capacity

Agents gain experience through missions and can eventually develop traits that alter their behavior and capabilities.

---

## Missions

The initial game contains three mission types.

### PROSPECT

Explore a system and investigate anomalies.

**Low risk.**

### SALVAGE

Recover valuable cargo from a derelict structure.

**Medium risk.**

### COURIER

Transport goods between locations.

**Medium risk.**

Missions are short enough to encourage experimentation while producing meaningful consequences.

---

## Consequences Matter

The game should be relaxed, but actions should still matter.

> **No pressure does not mean no stakes.**

VOID deliberately avoids:

- forced timers
- FOMO
- daily rewards
- forced advertisements
- PvP pressure
- artificial urgency

But agents can still:

- consume fuel
- take damage
- lose profitability
- fail missions
- make costly decisions
- potentially be destroyed

The player should experiment because they **want to understand the system**, not because the game is forcing them to return.

---

## The Simulation Experience

A mission should never feel like:

```
DEPLOY
   ↓
...
   ↓
SUCCESS
```

It should feel like watching a system execute.

```
T+05  SCAN
      Anomaly detected

T+06  RULE
      Investigate Low Risk

T+08  RESULT
      Investigation successful
      +150 CR

T+12  SCAN
      Anomaly detected

T+13  RULE
      Ignore

T+18  FUEL
      Threshold reached

T+19  RETURN
      Returning to station

T+24  DOCK
      Mission complete
```

The player should be able to reconstruct what happened and connect it to the rules they configured.

---

## The Mission Report

The report closes the learning loop.

It should answer four questions:

### What happened?

A concise description of the mission.

### Why did it happen?

Which rules and agent characteristics influenced the decisions?

### What did it cost?

Revenue, fuel, repairs, maintenance and net result.

### What changed?

Hull, fuel, XP, levels and traits.

The report should turn a simulation into an experiment the player can learn from.

---

## Visual Identity

VOID // AGENT LAB should feel like a piece of industrial software from a distant future.

The interface is:

- dark
- technical
- restrained
- information-dense
- terminal-inspired
- sci-fi without becoming decorative

The visual language should communicate:

**systems, intelligence, observation, control.**

Not:

**arcade combat, explosions, or conventional space opera.**

---

## Design Philosophy

### 1. The player builds the intelligence

Do not make the player manually pilot everything.

### 2. Decisions should be observable

If the player changes a rule, they should be able to see its consequences.

### 3. Systems create the stories

Emergent mission outcomes should create memorable moments without requiring scripted storytelling for every situation.

### 4. Experimentation is the progression

The player becomes better by understanding the system.

### 5. No pressure

The game should respect the player's time.

### 6. Consequences remain real

Relaxed pacing does not mean meaningless decisions.

### 7. Complexity should be earned

Start with a small rule set that players can understand. Add complexity only when the existing system has become interesting.

---

## Initial Scope

The first playable version intentionally focuses on:

- Station
- Agent creation
- Agent configuration
- Mission selection
- Deterministic simulation
- Mission event log
- Mission report
- Credits
- Hull and fuel
- XP and traits
- Local persistence
- Simulation speed controls

It intentionally excludes:

- multiplayer
- factions
- technology trees
- complex AI
- advanced economy
- cloud saves
- mobile-specific design
- dynamic live events
- social systems
- mandatory monetization

The objective is to prove that the **core autonomous-agent loop is fun** before expanding the game.

---

## The Long-Term Question

The central question behind VOID // AGENT LAB is simple:

> **What happens when the player stops controlling the machine and starts designing the intelligence?**

That is the game.

---

## Status

**Prototype / v0.1**

The current project is focused on validating:

**BUILD → DEPLOY → OBSERVE → OPTIMIZE → EXPAND**

The simulation is deterministic, the first agent and mission systems exist, and the next priority is making the agent's decisions and mission consequences clearly observable to the player.

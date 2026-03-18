# Reconceptualizing Matific's "Fitting Pipes"

**CS4474 / CS99552B - Human-Computer Interaction**  
**Winter 2026**  
**Dr. K. Sedig**

## Team Members
- Travis Braun
- Inderpreet Doad
- Sébastien Moroz
- Salim Terzout
- Dylan Wettlaufer
- Michael Zhao

## Project Overview

This project is a complete redesign of Matific's "Fitting Pipes" game, focusing on improving usability, clarity, and educational effectiveness for elementary school children learning basic arithmetic operations (addition, subtraction, and multiplication).

## Project Goal

The current Matific Pipe Game interface lacks usability and creates unnecessary friction for users. Our goal is to redesign the interface into one that is intuitive, user-friendly, and conducive to an effective learning experience. We aim to eliminate the friction points that detract from the educational aspects of the game.

## Target Users

### Primary Users
Elementary school children learning basic arithmetic expressions (addition, subtraction, and multiplication). This age group has:
- Limited working memory capacity
- Developing abstract thinking skills
- Reliance on visual representations for learning

### Secondary Users
Educators and parents who may assist primary users but are not the primary users of the application.

### Usage Context
The game will be used in educational environments (classrooms or home learning) where users may not receive additional guidance. The application must be self-explanatory in its presentation of possible actions, states, and intentions.

## Current Issues & Planned Redesigns

| Area | Current Issue | Redesign Solution | Sprint Time |
|------|---------------|-------------------|-------------|
| **Instruction Delivery** | Audio and subtitles obscure gameplay and overwhelm users | Replace with progressive, contextual instructions that appear only when needed | 6-7 Days |
| **Pipe Selection** | Available pipes and their orientation are unclear | Improve visual affordance and previews for pipe placement | 5-6 Days |
| **Feedback for Errors** | Incorrect configuration of pipes are not indicated | Add immediate visual and auditory feedback to indicate correctness | 7-8 Days |

## Key Problems Identified

1. **Audio Prompt Issues**: The game starts with an audio prompt and large subtitle that covers part of the screen, causing users to immediately mute the audio
2. **Persistent Subtitles**: Subtitles don't disappear, covering the pipe selection area and making it unclear if more pipes are available
3. **Unclear Pipe Selection**: When selecting a pipe, it's unclear where it should go
4. **Hidden Functionality**: The ability to flip pipes via the arrow on each pipe's corner is not intuitive or discoverable

## Project Scope

This project focuses exclusively on redesigning the user interface and interaction experience. The scope includes:
- Visual layout improvements
- Interaction cues and affordances
- Instructional presentation
- Feedback mechanisms

**Note**: The redesign aims to improve clarity, usability, and learnability **without altering the underlying mathematical logic or game mechanics**.

## Design Methodology

We will follow a **human-centered iterative design approach** that:
- Focuses on understanding user needs, with emphasis on attention span and working memory
- Creates prototypes to explore alternative layouts
- Refines designs based on evaluation and testing

## Project Outcome

The final deliverable will be:
- An interactive, complete redesign of the user interface and interaction flow of Matific's "Fitting Pipes" game
- Preservation of original game logic while improving usability and clarity
- Addition of multiplication operations (in addition to existing addition and subtraction)
- Enhanced support for learning through improved feedback and visual design

## Technology Stack

- React
- Vite
- Modern JavaScript/ES6+

## Development Setup

This project uses Vite for fast development and hot module replacement (HMR).

### Available Plugins
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Status

Currently in development phase - implementing redesigned interface and interaction improvements based on human-computer interaction principles.

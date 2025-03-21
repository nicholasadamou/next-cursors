# [Canvas Cursor Component](canvas-cursor.tsx) and [useCanvasCursor Hook](../../hooks/use-canvas-cursor.ts)

The **Canvas Cursor Component** is a React-based interactive effect that creates a dynamic, animated trailing effect following the user's cursor. It utilizes HTML5 Canvas and a physics-based approach to simulate fluid motion. The component consists of:
- **CanvasCursor Component**: Manages rendering of the canvas.
- **useCanvasCursor Hook**: Handles animation logic.
- **Oscillator & Line Classes**: Control physics-based movement.

![canvas-cursor](../../canvas-cursor.gif)

### Component Structure

```mermaid
flowchart TD
    CanvasCursor -->|Uses| useCanvasCursor
    useCanvasCursor -->|Initializes| Canvas
    useCanvasCursor -->|Controls| LinesArray["Lines Array"]
    useCanvasCursor -->|Handles| EventListeners["Event Listeners"]
    LinesArray -->|Contains| Nodes
    LinesArray -->|Updated by| PhysicsEngine["Physics Engine"]
    PhysicsEngine -->|Uses| Oscillator
```

#### **CanvasCursor Component**

- Determines if the user is on a mobile device and conditionally renders the canvas.
- Uses the `useCanvasCursor` hook to apply animations.

#### **useCanvasCursor Hook**

- Initializes the canvas, sets event listeners, and starts the animation loop.
- Updates the canvas by applying physics rules on multiple **Lines**.

#### **Line Class**

- Represents a flexible, physics-based entity that follows the cursor.
- Uses **Nodes** to create a trailing effect.

#### **Oscillator Class**

- Generates smooth, sine-wave-based variations for stroke color over time.

### Event Flow

The Canvas Cursor effect follows this event flow:

```mermaid
sequenceDiagram
    participant User
    participant CanvasCursor
    participant useCanvasCursor
    participant Canvas
    participant Lines
    participant Nodes

    User ->> CanvasCursor: Loads Component
    CanvasCursor ->> useCanvasCursor: Calls Hook
    useCanvasCursor ->> Canvas: Initializes Canvas
    useCanvasCursor ->> Lines: Creates Lines
    User ->> Canvas: Moves Cursor
    Canvas ->> Lines: Updates Positions
    Lines ->> Nodes: Applies Physics
    Nodes ->> Canvas: Renders Updated Positions

    loop Animation Loop
        useCanvasCursor ->> Canvas: Clears and Redraws
        Canvas ->> Lines: Updates Each Frame
    end
```

## State & Behavior

The Canvas Cursor effect transitions through various states and behaviors:

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Running: Canvas Initialized
    Running --> Updating: Mouse Moves
    Running --> Resizing: Window Resizes
    Updating --> Rendering: Draw Updated Nodes
    Resizing --> Running: Adjust Canvas Size
    Rendering --> Running: Loop Continues
    Running --> [*]: Unmount Cleanup
```

### Key Features

Some key features of the Canvas Cursor effect include:

- **Physics-Based Animation**: Uses a spring-mass system for smooth motion.
- **Dynamic Trail Effect**: Lines update their positions based on cursor movements.
- **Color Oscillation**: Stroke color continuously changes using the `Oscillator` class.
- **Optimized Rendering**: Uses `requestAnimationFrame` to ensure smooth performance.
- **Mobile Detection**: Disables the effect on mobile devices for usability.

# [Fluid Cursor Component](fluid-cursor.tsx) and [useFluidCursor Hook](../../hooks/use-fluid-cursor.ts)

The **Fluid Cursor Component** is a React-based interactive effect that simulates fluid motion following the user's cursor. It leverages WebGL and advanced physics simulations to create a visually stunning, dynamic trailing effect. The component consists of:
-  **FluidCursor Component**: Manages rendering and interaction.
-  **useFluidCursor Hook**: Handles the fluid dynamics and animation logic.

## Component Structure

```mermaid
graph TD;
    A[FluidCursor Component] -->|Uses| B[useFluidCursor Hook];
    B -->|Initializes| C[WebGLContext];
    B -->|Controls| D[FluidSimulation];
    B -->|Handles| E[Event Listeners];
    D -->|Simulates| F[Fluid Dynamics];
```

### **FluidCursor Component**

-  Renders a canvas element for fluid simulation.
-  Utilizes the `useFluidCursor` hook to manage fluid animations and interactions.

### **useFluidCursor Hook**

-  Initializes WebGL context and fluid simulation.
-  Sets up event listeners for mouse and touch interactions.
-  Manages the animation loop for fluid dynamics.

### **FluidSimulation Class**

-  Implements the physics-based fluid simulation.
-  Uses WebGL shaders to render fluid effects.

## Event Flow

```mermaid
sequenceDiagram
    participant User
    participant FluidCursor
    participant useFluidCursor
    participant WebGLContext
    participant FluidSimulation

    User->>FluidCursor: Loads Component
    FluidCursor->>useFluidCursor: Calls Hook
    useFluidCursor->>WebGLContext: Initializes WebGL
    useFluidCursor->>FluidSimulation: Starts Simulation
    User->>FluidCursor: Moves Cursor
    FluidCursor->>FluidSimulation: Updates Fluid Dynamics
    FluidSimulation->>WebGLContext: Renders Fluid
    loop Animation Loop
        useFluidCursor->>FluidSimulation: Updates Each Frame
    end
```

## State & Behavior

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Running : WebGL Initialized
    Running --> Updating : Mouse/Touch Moves
    Running --> Resizing : Window Resizes
    Updating --> Rendering : Draw Updated Fluid
    Resizing --> Running : Adjust Canvas Size
    Rendering --> Running : Loop Continues
    Running --> [*] : Unmount Cleanup
```

## Key Features

-  **Physics-Based Fluid Simulation**: Creates realistic fluid motion using WebGL.
-  **Interactive Trail Effect**: Fluid dynamically responds to cursor movements.
-  **Optimized Rendering**: Utilizes `requestAnimationFrame` for smooth performance.
-  **Mobile Compatibility**: Handles touch interactions seamlessly.

## Conclusion

This component leverages **React Hooks, WebGL, and Physics Simulations** to create an engaging visual effect. Its modular design ensures maintainability while providing a fluid and immersive user experience.

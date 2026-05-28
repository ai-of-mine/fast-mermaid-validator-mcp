# Mermaid Parsing Rules Summary

Complete analysis of parsing rules across all 17 Mermaid diagram types, based on extracted Jison grammar files.

## Overview

Mermaid uses [Jison](https://github.com/zaach/jison) parser generator to create JavaScript parsers from grammar specifications. Each diagram type has its own dedicated grammar file defining:

- **Lexical Rules**: Token recognition patterns
- **Parser Grammar**: Syntax structure rules  
- **Semantic Actions**: AST node generation
- **State Management**: Context-sensitive parsing

## Common Parsing Patterns

### Universal Features (All Diagrams)

1. **Accessibility Support**
   ```
   accTitle: "Title text"
   accDescr: "Description text"
   ```

2. **Directive Processing**
   ```
   %%{init: {"key": "value"}}%%
   ```

3. **Unicode Text Support**
   - All parsers support Unicode identifiers and labels
   - String literals enclosed in quotes
   - Whitespace and newline handling

4. **Comment Processing**
   - Line comments with `%%`
   - Block comment support varies by diagram type

### Lexer State Management

Most grammars use multiple lexer states for context-sensitive parsing:

- `INITIAL`: Default parsing state
- `string`: String literal parsing
- `acc_title`/`acc_descr`: Accessibility metadata
- `directive`: Configuration directive parsing
- Custom states per diagram type (e.g., `class_body`, `rel_mode`)

## Diagram-Specific Parsing Rules

### 1. Block Diagrams (`block.jison`)

**Key Elements:**
- Node shapes: `()`, `[]`, `{}`, `((()))`, `[()]`, `>[]`, etc.
- Connections: `--`, `-->`, `<--`, `<-->` 
- Column layouts: `columns 3`
- Styling: `style nodeId fill:#f9f`

**Syntax Patterns:**
```
A["Label"]
B(Round node)  
A --> B
columns 2
style A fill:#f96
```

### 2. C4 Diagrams (`c4Diagram.jison`)

**Key Elements:**
- Entities: `Person()`, `System()`, `Container()`, `Component()`
- Boundaries: `Enterprise_Boundary()`, `System_Boundary()`
- Relationships: `Rel()`, `BiRel()`, `Rel_Up()`, etc.
- Layout: `UpdateLayoutConfig()`

**Syntax Patterns:**
```
Person(personAlias, "Label", "Description")
System_Boundary(alias, "Label") {
    System(systemAlias, "Label", "Description")
}
Rel(personAlias, systemAlias, "Uses")
```

### 3. Class Diagrams (`classDiagram.jison`)

**Key Elements:**
- Class definitions: `class ClassName`
- Members: `+publicMethod()`, `-privateField`
- Relationships: `-->`, `<|--`, `*--`, `o--`
- Generics: `Class~T~`
- Namespaces: `namespace N { ... }`

**Syntax Patterns:**
```
class Animal {
    +int age
    +String name
    +makeSound()
}
Animal <|-- Dog
Animal : +makeSound()
```

### 4. ER Diagrams (`erDiagram.jison`)

**Key Elements:**
- Entities: `ENTITY_NAME { ... }`
- Attributes: `type name PK "comment"`
- Relationships: `||--o{`, `}o--||`, etc.
- Cardinalities: `||`, `o{`, `}o`, `{`, `}`

**Syntax Patterns:**
```
CUSTOMER {
    string name PK
    string email
}
ORDER {
    int id PK
    string status
}
CUSTOMER ||--o{ ORDER : places
```

### 5. Flowcharts (`flow.jison`)

**Most comprehensive grammar supporting:**
- Node shapes: 15+ different shapes
- Edge types: Solid, dotted, thick lines with various arrow types
- Subgraphs: `subgraph title ... end`
- Interactions: `click`, `href`
- Advanced styling and class definitions

**Syntax Patterns:**
```
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    subgraph "Subprocess"
        C --> E[Step]
    end
```

### 6. Gantt Charts (`gantt.jison`)

**Key Elements:**
- Configuration: `dateFormat`, `axisFormat`, `tickInterval`
- Sections: `section Title`
- Tasks: `Task name : status, id, start, duration`
- Dependencies: Referenced by task IDs

**Syntax Patterns:**
```
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
        Task 1 : done, t1, 2023-01-01, 3d
        Task 2 : active, t2, after t1, 2d
```

### 7. Kanban Boards (`kanban.jison`)

**Key Elements:**
- Nodes with optional shape data: `nodeId(("shape data"))`
- Icons: `nodeId:::icon`
- Classes: `nodeId:::className`
- Flexible nesting and hierarchy

**Syntax Patterns:**
```
kanban
    nodeId["Card Title"]
    nodeId2(("Round Card"))
    nodeId:::urgentClass
```

### 8. Mind Maps (`mindmap.jison`)

**Key Elements:**
- Hierarchical nodes with indentation-based structure
- Node types: Default, cloud, explosion
- Icons and classes: `nodeId[icon:person, class:important]`
- Markdown-style formatting

**Syntax Patterns:**
```
mindmap
  root((mindmap))
    Origins
      Long history
      Popularisation
    Research
      Effectiveness
```

### 9. Quadrant Charts (`quadrant.jison`)

**Key Elements:**
- Axis labels: `x-axis`, `y-axis`
- Quadrant labels: `quadrant-1`, `quadrant-2`, etc.
- Data points: `Label: [x, y]`

**Syntax Patterns:**
```
quadrantChart
    title Reach and influence
    x-axis Low Reach --> High Reach
    y-axis Low Influence --> High Influence
    quadrant-1 We should expand
    Item A: [0.3, 0.6]
    Item B: [0.45, 0.23]
```

### 10. Requirement Diagrams (`requirementDiagram.jison`)

**Key Elements:**
- Requirements: `requirement`, `functionalRequirement`, `performanceRequirement`
- Elements: `element`, `interface`
- Relationships: `contains`, `copies`, `derives`, `satisfies`, `verifies`, `refines`, `traces`
- Risk levels: `low`, `medium`, `high`

**Syntax Patterns:**
```
requirementDiagram
    requirement test_req {
        id: 1
        text: the test text.
        risk: high
        verifymethod: test
    }
    element test_entity {
        type: simulation
    }
    test_entity - satisfies -> test_req
```

### 11. Sankey Diagrams (`sankey.jison`)

**Key Elements:**
- CSV format data parsing
- Source, target, value triplets
- Simple comma-separated structure

**Syntax Patterns:**
```
sankey-beta
    Agricultural 'waste',Bio-conversion,124.729
    Bio-conversion,Liquid,0.597
    Bio-conversion,Losses,26.862
```

### 12. Sequence Diagrams (`sequenceDiagram.jison`)

**Key Elements:**
- Participants: `participant`, `actor`
- Messages: `->`, `-->`, `->>`, `-->>`, `-x`, `--x`
- Activations: `activate`, `deactivate`
- Control structures: `loop`, `alt`, `opt`, `par`, `critical`
- Notes: `note left of`, `note right of`, `note over`

**Syntax Patterns:**
```
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    alt is sick
        B->>A: Not so good :(
    else is well
        B->>A: Feeling fresh like a daisy
    end
```

### 13. State Diagrams (`stateDiagram.jison`)

**Key Elements:**
- States: Simple states, composite states
- Transitions: `state1 --> state2 : event`
- Special states: `[*]` (start/end), `state --> [*]`
- Composite states: `state { ... }`
- Concurrent states: `--`

**Syntax Patterns:**
```
stateDiagram-v2
    [*] --> Still
    Still --> Moving : Go
    Moving --> Still : Stop
    Moving --> Crash : Crash
    Crash --> [*]
```

### 14. Timeline Diagrams (`timeline.jison`)

**Key Elements:**
- Sections: `section Period`
- Events: `Event description`
- Time periods with multiple events

**Syntax Patterns:**
```
timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook : Google
    2005 : Youtube
    2006 : Twitter
```

### 15. User Journey (`journey.jison`)

**Key Elements:**
- Sections: `section Journey Phase`
- Tasks: `Task Name: score: people`
- Scoring system for user satisfaction

**Syntax Patterns:**
```
journey
    title My working day
    section Go to work
        Make tea: 5: Me
        Go upstairs: 3: Me
        Do work: 1: Me, Cat
```

### 16. XY Charts (`xychart.jison`)

**Key Elements:**
- Chart type: `xychart-beta`
- Axes: `x-axis`, `y-axis`
- Data series: `line`, `bar`
- Data arrays: `[value1, value2, ...]`

**Syntax Patterns:**
```
xychart-beta
    title "Sales Revenue"
    x-axis [Jan, Feb, Mar, Apr, May]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500]
    line [5000, 6000, 7500, 8200, 9500]
```

### 17. Example Template (`exampleDiagram.jison`)

**Minimal template structure:**
- Basic lexer with simple token recognition
- Single statement parser rule
- Template for extending Mermaid with custom diagram types

## Advanced Parsing Features

### Error Handling
- All grammars include error recovery mechanisms
- Undefined token handling
- Graceful degradation for malformed input

### Extensibility
- Modular grammar design allows easy extension
- Plugin architecture via example template
- Custom directive support

### Performance Optimizations
- State-based lexing reduces backtracking
- Efficient token recognition patterns
- Minimal lookahead requirements

## Implementation Notes

### Parser Generation Process
1. Jison compiles `.jison` files to JavaScript parsers
2. Generated parsers integrate with Mermaid's rendering pipeline
3. AST nodes trigger diagram-specific rendering logic

### Integration Points
- Each parser exports to `yy` object for semantic actions
- Database modules (`*Db.js`) store parsed diagram state
- Renderer modules consume parsed AST for visualization

### Testing Strategy
- Comprehensive test suites in corresponding `.spec.js` files
- Grammar validation through automated testing
- Edge case coverage for complex syntax scenarios

This comprehensive parsing rule system enables Mermaid to support 16 distinct diagram types with extensible architecture for future diagram additions.
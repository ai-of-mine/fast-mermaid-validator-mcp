# Mermaid Grammar Files Collection

Complete collection of all Jison grammar files for parsing Mermaid diagrams, extracted from the official [Mermaid.js repository](https://github.com/mermaid-js/mermaid).

## Organization

Each diagram type has its own directory containing the corresponding `.jison` grammar file:

```
src/services/grammars/
├── block/              # Block diagrams
├── c4/                 # C4 architecture diagrams  
├── class/              # UML class diagrams
├── er/                 # Entity relationship diagrams
├── examples/diagrams/            # Template for custom diagram types
├── flowchart/          # Flowcharts and graphs
├── gantt/              # Gantt charts
├── kanban/             # Kanban boards
├── mindmap/            # Mind maps
├── quadrant/           # Quadrant charts
├── requirement/        # Requirement diagrams
├── sankey/             # Sankey flow diagrams
├── sequence/           # UML sequence diagrams
├── state/              # UML state diagrams
├── timeline/           # Timeline diagrams
├── user-journey/       # User journey maps
└── xychart/            # XY charts and plots
```

## Grammar Files Details

| Diagram Type | Grammar File | Size (bytes) | Description |
|-------------|--------------|--------------|-------------|
| Block | `block/block.jison` | ~8KB | Block diagrams with various node shapes and connections |
| C4 | `c4/c4Diagram.jison` | ~15KB | C4 architecture diagrams (Context, Container, Component, Code) |
| Class | `class/classDiagram.jison` | ~18KB | UML class diagrams with relationships and annotations |
| ER | `er/erDiagram.jison` | ~10KB | Entity-relationship diagrams with cardinalities |
| Flowchart | `flowchart/flow.jison` | ~27KB | Most comprehensive - flowcharts with multiple node types |
| Gantt | `gantt/gantt.jison` | ~7KB | Project timeline charts with tasks and dependencies |
| Kanban | `kanban/kanban.jison` | ~7KB | Kanban boards with customizable nodes |
| Mindmap | `mindmap/mindmap.jison` | ~5KB | Hierarchical mind maps with icons and styling |
| Quadrant | `quadrant/quadrant.jison` | ~6KB | Four-quadrant charts with data points |
| Requirement | `requirement/requirementDiagram.jison` | ~8KB | Requirements engineering diagrams |
| Sankey | `sankey/sankey.jison` | ~2KB | Flow diagrams showing quantity transfers |
| Sequence | `sequence/sequenceDiagram.jison` | ~16KB | UML sequence diagrams with interactions |
| State | `state/stateDiagram.jison` | ~14KB | UML state diagrams with transitions |
| Timeline | `timeline/timeline.jison` | ~2KB | Chronological event timelines |
| User Journey | `user-journey/journey.jison` | ~2KB | User experience journey maps |
| XY Chart | `xychart/xychart.jison` | ~7KB | Line and bar charts with data series |
| Example | `examples/diagrams/exampleDiagram.jison` | ~1KB | Template for creating custom diagram types |

## Technical Information

- **Parser Generator**: All files use [Jison](https://github.com/zaach/jison) for JavaScript parser generation
- **License**: MIT License (Mermaid.js project)
- **Source**: Official Mermaid repository develop branch
- **Format**: Each `.jison` file contains:
  - Lexical grammar (lexer rules)
  - Parser grammar (syntax rules) 
  - Semantic actions for AST generation
  - Token definitions and precedence rules

## Usage

These grammar files define the complete parsing rules for each Mermaid diagram type. They can be used to:

1. Understand Mermaid's syntax parsing implementation
2. Build custom parsers or extensions
3. Create alternative diagram tools compatible with Mermaid syntax
4. Analyze and validate diagram syntax programmatically

## File Format

Each `.jison` file follows the standard Jison grammar format:

```
/* lexer grammar */
%lex
// Lexical rules for token recognition
/lex

/* parser grammar */  
%start start
%%
// Parser rules for syntax analysis
%%
```

The grammars handle complex parsing scenarios including:
- Unicode text support
- Multiple lexer states
- Error handling
- Whitespace management
- Comment processing
- Interactive elements (clicks, links)
- Styling and configuration

## Extraction Date

Files extracted on: 2025-09-10
Source commit: Latest from develop branch
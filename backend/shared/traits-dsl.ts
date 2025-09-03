import { createLogger } from "./logger";

const logger = createLogger("traits-dsl");

export interface TraitContext {
  userId: string;
  events: EventMetrics;
  profile: Record<string, unknown>;
  firstSeenDaysAgo: number;
  lastSeenMinutesAgo: number;
}

export interface EventMetrics {
  [eventName: string]: EventMetric;
}

export interface EventMetric {
  count_7d: number;
  count_14d: number;
  count_30d: number;
  unique_days_7d: number;
  unique_days_14d: number;
  unique_days_30d: number;
  first_seen_days_ago: number;
  last_seen_days_ago: number;
}

// Token types for the DSL parser
export enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',
  DOT = 'DOT',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS_EQUAL = 'LESS_EQUAL',
  AND = 'AND',
  OR = 'OR',
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COMMA = 'COMMA',
  IN = 'IN',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export class TraitDSLError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'TraitDSLError';
  }
}

export class TraitDSLLexer {
  private position = 0;
  private current_char: string | null = null;

  constructor(private text: string) {
    this.current_char = this.text[this.position] || null;
  }

  private advance(): void {
    this.position++;
    this.current_char = this.position < this.text.length ? this.text[this.position] : null;
  }

  private peek(): string | null {
    const peek_pos = this.position + 1;
    return peek_pos < this.text.length ? this.text[peek_pos] : null;
  }

  private skipWhitespace(): void {
    while (this.current_char !== null && /\s/.test(this.current_char)) {
      this.advance();
    }
  }

  private readNumber(): string {
    let result = '';
    while (this.current_char !== null && /[\d.]/.test(this.current_char)) {
      result += this.current_char;
      this.advance();
    }
    return result;
  }

  private readString(): string {
    let result = '';
    this.advance(); // Skip opening quote
    
    while (this.current_char !== null && this.current_char !== '"') {
      if (this.current_char === '\\') {
        this.advance();
        if (this.current_char === null) break;
      }
      result += this.current_char;
      this.advance();
    }
    
    if (this.current_char === '"') {
      this.advance(); // Skip closing quote
    }
    
    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (this.current_char !== null && /[a-zA-Z0-9_]/.test(this.current_char)) {
      result += this.current_char;
      this.advance();
    }
    return result;
  }

  public getNextToken(): Token {
    while (this.current_char !== null) {
      const startPos = this.position;

      if (/\s/.test(this.current_char)) {
        this.skipWhitespace();
        continue;
      }

      if (/\d/.test(this.current_char)) {
        return {
          type: TokenType.NUMBER,
          value: this.readNumber(),
          position: startPos
        };
      }

      if (this.current_char === '"') {
        return {
          type: TokenType.STRING,
          value: this.readString(),
          position: startPos
        };
      }

      if (/[a-zA-Z_]/.test(this.current_char)) {
        const identifier = this.readIdentifier();
        
        // Check for keywords
        if (identifier === 'true' || identifier === 'false') {
          return {
            type: TokenType.BOOLEAN,
            value: identifier,
            position: startPos
          };
        }
        
        if (identifier === 'in') {
          return {
            type: TokenType.IN,
            value: identifier,
            position: startPos
          };
        }

        return {
          type: TokenType.IDENTIFIER,
          value: identifier,
          position: startPos
        };
      }

      if (this.current_char === '.') {
        this.advance();
        return { type: TokenType.DOT, value: '.', position: startPos };
      }

      if (this.current_char === '=' && this.peek() === '=') {
        this.advance();
        this.advance();
        return { type: TokenType.EQUALS, value: '==', position: startPos };
      }

      if (this.current_char === '!' && this.peek() === '=') {
        this.advance();
        this.advance();
        return { type: TokenType.NOT_EQUALS, value: '!=', position: startPos };
      }

      if (this.current_char === '>' && this.peek() === '=') {
        this.advance();
        this.advance();
        return { type: TokenType.GREATER_EQUAL, value: '>=', position: startPos };
      }

      if (this.current_char === '<' && this.peek() === '=') {
        this.advance();
        this.advance();
        return { type: TokenType.LESS_EQUAL, value: '<=', position: startPos };
      }

      if (this.current_char === '>') {
        this.advance();
        return { type: TokenType.GREATER_THAN, value: '>', position: startPos };
      }

      if (this.current_char === '<') {
        this.advance();
        return { type: TokenType.LESS_THAN, value: '<', position: startPos };
      }

      if (this.current_char === '&' && this.peek() === '&') {
        this.advance();
        this.advance();
        return { type: TokenType.AND, value: '&&', position: startPos };
      }

      if (this.current_char === '|' && this.peek() === '|') {
        this.advance();
        this.advance();
        return { type: TokenType.OR, value: '||', position: startPos };
      }

      if (this.current_char === '(') {
        this.advance();
        return { type: TokenType.LEFT_PAREN, value: '(', position: startPos };
      }

      if (this.current_char === ')') {
        this.advance();
        return { type: TokenType.RIGHT_PAREN, value: ')', position: startPos };
      }

      if (this.current_char === '[') {
        this.advance();
        return { type: TokenType.LEFT_BRACKET, value: '[', position: startPos };
      }

      if (this.current_char === ']') {
        this.advance();
        return { type: TokenType.RIGHT_BRACKET, value: ']', position: startPos };
      }

      if (this.current_char === ',') {
        this.advance();
        return { type: TokenType.COMMA, value: ',', position: startPos };
      }

      throw new TraitDSLError(`Unexpected character '${this.current_char}'`, this.position);
    }

    return { type: TokenType.EOF, value: '', position: this.position };
  }
}

// AST Node types
export interface ASTNode {
  type: string;
}

export interface NumberNode extends ASTNode {
  type: 'number';
  value: number;
}

export interface StringNode extends ASTNode {
  type: 'string';
  value: string;
}

export interface BooleanNode extends ASTNode {
  type: 'boolean';
  value: boolean;
}

export interface IdentifierNode extends ASTNode {
  type: 'identifier';
  value: string;
}

export interface PropertyAccessNode extends ASTNode {
  type: 'property_access';
  object: ASTNode;
  property: string;
}

export interface BinaryOpNode extends ASTNode {
  type: 'binary_op';
  left: ASTNode;
  operator: string;
  right: ASTNode;
}

export interface ArrayNode extends ASTNode {
  type: 'array';
  elements: ASTNode[];
}

export class TraitDSLParser {
  private current_token!: Token;

  constructor(private lexer: TraitDSLLexer) {
    this.current_token = this.lexer.getNextToken();
  }

  private error(message?: string): never {
    const pos = this.current_token.position;
    throw new TraitDSLError(
      message || `Unexpected token '${this.current_token.value}' at position ${pos}`,
      pos
    );
  }

  private eat(token_type: TokenType): void {
    if (this.current_token.type === token_type) {
      this.current_token = this.lexer.getNextToken();
    } else {
      this.error(`Expected ${token_type}, got ${this.current_token.type}`);
    }
  }

  private factor(): ASTNode {
    const token = this.current_token;

    if (token.type === TokenType.NUMBER) {
      this.eat(TokenType.NUMBER);
      return {
        type: 'number',
        value: parseFloat(token.value)
      } as NumberNode;
    }

    if (token.type === TokenType.STRING) {
      this.eat(TokenType.STRING);
      return {
        type: 'string',
        value: token.value
      } as StringNode;
    }

    if (token.type === TokenType.BOOLEAN) {
      this.eat(TokenType.BOOLEAN);
      return {
        type: 'boolean',
        value: token.value === 'true'
      } as BooleanNode;
    }

    if (token.type === TokenType.IDENTIFIER) {
      let node: ASTNode = {
        type: 'identifier',
        value: token.value
      } as IdentifierNode;
      
      this.eat(TokenType.IDENTIFIER);

      // Handle property access (e.g., events.purchase.count_30d)
      while (this.current_token.type === TokenType.DOT) {
        this.eat(TokenType.DOT);
        if (this.current_token.type !== TokenType.IDENTIFIER) {
          this.error('Expected identifier after dot');
        }
        
        node = {
          type: 'property_access',
          object: node,
          property: this.current_token.value
        } as PropertyAccessNode;
        
        this.eat(TokenType.IDENTIFIER);
      }

      return node;
    }

    if (token.type === TokenType.LEFT_PAREN) {
      this.eat(TokenType.LEFT_PAREN);
      const node = this.or_expr();
      this.eat(TokenType.RIGHT_PAREN);
      return node;
    }

    if (token.type === TokenType.LEFT_BRACKET) {
      this.eat(TokenType.LEFT_BRACKET);
      const elements: ASTNode[] = [];
      
      if (this.current_token.type !== TokenType.RIGHT_BRACKET) {
        elements.push(this.or_expr());
        
        while (this.current_token.type === TokenType.COMMA) {
          this.eat(TokenType.COMMA);
          elements.push(this.or_expr());
        }
      }
      
      this.eat(TokenType.RIGHT_BRACKET);
      return {
        type: 'array',
        elements
      } as ArrayNode;
    }

    this.error();
  }

  private comparison(): ASTNode {
    let node = this.factor();

    while (this.current_token.type === TokenType.IN) {
      const op = this.current_token.value;
      this.eat(TokenType.IN);
      const right = this.factor();
      
      node = {
        type: 'binary_op',
        left: node,
        operator: op,
        right
      } as BinaryOpNode;
    }

    while ([
      TokenType.EQUALS,
      TokenType.NOT_EQUALS,
      TokenType.GREATER_THAN,
      TokenType.LESS_THAN,
      TokenType.GREATER_EQUAL,
      TokenType.LESS_EQUAL
    ].includes(this.current_token.type)) {
      const op = this.current_token.value;
      this.eat(this.current_token.type);
      const right = this.factor();
      
      node = {
        type: 'binary_op',
        left: node,
        operator: op,
        right
      } as BinaryOpNode;
    }

    return node;
  }

  private and_expr(): ASTNode {
    let node = this.comparison();

    while (this.current_token.type === TokenType.AND) {
      const op = this.current_token.value;
      this.eat(TokenType.AND);
      const right = this.comparison();
      
      node = {
        type: 'binary_op',
        left: node,
        operator: op,
        right
      } as BinaryOpNode;
    }

    return node;
  }

  private or_expr(): ASTNode {
    let node = this.and_expr();

    while (this.current_token.type === TokenType.OR) {
      const op = this.current_token.value;
      this.eat(TokenType.OR);
      const right = this.and_expr();
      
      node = {
        type: 'binary_op',
        left: node,
        operator: op,
        right
      } as BinaryOpNode;
    }

    return node;
  }

  public parse(): ASTNode {
    const node = this.or_expr();
    if (this.current_token.type !== TokenType.EOF) {
      this.error('Expected end of input');
    }
    return node;
  }
}

export class TraitDSLEvaluator {
  constructor(private context: TraitContext) {}

  private evaluateNode(node: ASTNode): any {
    switch (node.type) {
      case 'number':
        return (node as NumberNode).value;
      
      case 'string':
        return (node as StringNode).value;
      
      case 'boolean':
        return (node as BooleanNode).value;
      
      case 'identifier':
        return this.evaluateIdentifier((node as IdentifierNode).value);
      
      case 'property_access':
        return this.evaluatePropertyAccess(node as PropertyAccessNode);
      
      case 'binary_op':
        return this.evaluateBinaryOp(node as BinaryOpNode);
      
      case 'array':
        return (node as ArrayNode).elements.map(element => this.evaluateNode(element));
      
      default:
        throw new TraitDSLError(`Unknown node type: ${node.type}`);
    }
  }

  private evaluateIdentifier(name: string): any {
    switch (name) {
      case 'events':
        return this.context.events;
      case 'profile':
        return this.context.profile;
      case 'first_seen_days_ago':
        return this.context.firstSeenDaysAgo;
      case 'last_seen_minutes_ago':
        return this.context.lastSeenMinutesAgo;
      default:
        throw new TraitDSLError(`Unknown identifier: ${name}`);
    }
  }

  private evaluatePropertyAccess(node: PropertyAccessNode): any {
    const object = this.evaluateNode(node.object);
    
    if (object == null) {
      return null;
    }
    
    if (typeof object !== 'object') {
      throw new TraitDSLError(`Cannot access property '${node.property}' on non-object`);
    }
    
    return object[node.property];
  }

  private evaluateBinaryOp(node: BinaryOpNode): any {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);

    switch (node.operator) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return Number(left) > Number(right);
      case '<':
        return Number(left) < Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<=':
        return Number(left) <= Number(right);
      case '&&':
        return Boolean(left) && Boolean(right);
      case '||':
        return Boolean(left) || Boolean(right);
      case 'in':
        if (!Array.isArray(right)) {
          throw new TraitDSLError('Right operand of "in" must be an array');
        }
        return right.includes(left);
      default:
        throw new TraitDSLError(`Unknown operator: ${node.operator}`);
    }
  }

  public evaluate(ast: ASTNode): any {
    try {
      return this.evaluateNode(ast);
    } catch (error) {
      if (error instanceof TraitDSLError) {
        throw error;
      }
      throw new TraitDSLError(`Evaluation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function parseTraitExpression(expression: string): ASTNode {
  logger.debug("Parsing trait expression", { expression });
  
  try {
    const lexer = new TraitDSLLexer(expression);
    const parser = new TraitDSLParser(lexer);
    const ast = parser.parse();
    
    logger.debug("Successfully parsed trait expression", { 
      expression,
      astType: ast.type 
    });
    
    return ast;
  } catch (error) {
    logger.error("Failed to parse trait expression", error instanceof Error ? error : new Error(String(error)), {
      expression
    });
    throw error;
  }
}

export function evaluateTraitExpression(expression: string, context: TraitContext): any {
  logger.debug("Evaluating trait expression", { 
    expression,
    userId: context.userId 
  });
  
  try {
    const ast = parseTraitExpression(expression);
    const evaluator = new TraitDSLEvaluator(context);
    const result = evaluator.evaluate(ast);
    
    logger.debug("Successfully evaluated trait expression", {
      expression,
      userId: context.userId,
      result
    });
    
    return result;
  } catch (error) {
    logger.error("Failed to evaluate trait expression", error instanceof Error ? error : new Error(String(error)), {
      expression,
      userId: context.userId
    });
    throw error;
  }
}

export function validateTraitExpression(expression: string): { valid: boolean; error?: string } {
  try {
    parseTraitExpression(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

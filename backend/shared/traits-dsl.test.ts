import { describe, it, expect } from 'vitest';
import { 
  TraitDSLLexer, 
  TraitDSLParser, 
  TraitDSLEvaluator,
  TokenType,
  parseTraitExpression,
  evaluateTraitExpression,
  validateTraitExpression,
  type TraitContext 
} from './traits-dsl';

describe('TraitDSLLexer', () => {
  it('should tokenize numbers', () => {
    const lexer = new TraitDSLLexer('42 3.14');
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.NUMBER,
      value: '42',
      position: 0
    });
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.NUMBER,
      value: '3.14',
      position: 3
    });
  });

  it('should tokenize identifiers and keywords', () => {
    const lexer = new TraitDSLLexer('events true false');
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.IDENTIFIER,
      value: 'events',
      position: 0
    });
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.BOOLEAN,
      value: 'true',
      position: 7
    });
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.BOOLEAN,
      value: 'false',
      position: 12
    });
  });

  it('should tokenize operators', () => {
    const lexer = new TraitDSLLexer('== != >= <= > < && ||');
    
    expect(lexer.getNextToken().type).toBe(TokenType.EQUALS);
    expect(lexer.getNextToken().type).toBe(TokenType.NOT_EQUALS);
    expect(lexer.getNextToken().type).toBe(TokenType.GREATER_EQUAL);
    expect(lexer.getNextToken().type).toBe(TokenType.LESS_EQUAL);
    expect(lexer.getNextToken().type).toBe(TokenType.GREATER_THAN);
    expect(lexer.getNextToken().type).toBe(TokenType.LESS_THAN);
    expect(lexer.getNextToken().type).toBe(TokenType.AND);
    expect(lexer.getNextToken().type).toBe(TokenType.OR);
  });

  it('should tokenize strings', () => {
    const lexer = new TraitDSLLexer('"hello world" "test"');
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.STRING,
      value: 'hello world',
      position: 0
    });
    
    expect(lexer.getNextToken()).toEqual({
      type: TokenType.STRING,
      value: 'test',
      position: 14
    });
  });
});

describe('TraitDSLParser', () => {
  it('should parse simple expressions', () => {
    const ast = parseTraitExpression('42');
    expect(ast).toEqual({
      type: 'number',
      value: 42
    });
  });

  it('should parse property access', () => {
    const ast = parseTraitExpression('events.purchase.count_30d');
    expect(ast).toEqual({
      type: 'property_access',
      object: {
        type: 'property_access',
        object: {
          type: 'identifier',
          value: 'events'
        },
        property: 'purchase'
      },
      property: 'count_30d'
    });
  });

  it('should parse comparison expressions', () => {
    const ast = parseTraitExpression('events.purchase.count_30d >= 5');
    expect(ast.type).toBe('binary_op');
    expect((ast as any).operator).toBe('>=');
  });

  it('should parse logical expressions', () => {
    const ast = parseTraitExpression('events.purchase.count_30d >= 1 && last_seen_minutes_ago < 1440');
    expect(ast.type).toBe('binary_op');
    expect((ast as any).operator).toBe('&&');
  });

  it('should parse in expressions', () => {
    const ast = parseTraitExpression('profile.plan in ["premium", "enterprise"]');
    expect(ast.type).toBe('binary_op');
    expect((ast as any).operator).toBe('in');
  });
});

describe('TraitDSLEvaluator', () => {
  const mockContext: TraitContext = {
    userId: 'test-user',
    events: {
      purchase: {
        count_7d: 2,
        count_14d: 5,
        count_30d: 8,
        unique_days_7d: 2,
        unique_days_14d: 4,
        unique_days_30d: 6,
        first_seen_days_ago: 45,
        last_seen_days_ago: 1
      },
      app_open: {
        count_7d: 15,
        count_14d: 28,
        count_30d: 50,
        unique_days_7d: 7,
        unique_days_14d: 12,
        unique_days_30d: 20,
        first_seen_days_ago: 45,
        last_seen_days_ago: 0
      }
    },
    profile: {
      plan: 'premium',
      country: 'US'
    },
    firstSeenDaysAgo: 45,
    lastSeenMinutesAgo: 30
  };

  it('should evaluate simple expressions', () => {
    expect(evaluateTraitExpression('42', mockContext)).toBe(42);
    expect(evaluateTraitExpression('true', mockContext)).toBe(true);
    expect(evaluateTraitExpression('"test"', mockContext)).toBe('test');
  });

  it('should evaluate property access', () => {
    expect(evaluateTraitExpression('events.purchase.count_30d', mockContext)).toBe(8);
    expect(evaluateTraitExpression('profile.plan', mockContext)).toBe('premium');
    expect(evaluateTraitExpression('last_seen_minutes_ago', mockContext)).toBe(30);
  });

  it('should evaluate comparison expressions', () => {
    expect(evaluateTraitExpression('events.purchase.count_30d >= 5', mockContext)).toBe(true);
    expect(evaluateTraitExpression('events.purchase.count_30d >= 10', mockContext)).toBe(false);
    expect(evaluateTraitExpression('profile.plan == "premium"', mockContext)).toBe(true);
  });

  it('should evaluate logical expressions', () => {
    expect(evaluateTraitExpression('events.purchase.count_30d >= 1 && last_seen_minutes_ago < 60', mockContext)).toBe(true);
    expect(evaluateTraitExpression('events.purchase.count_30d >= 1 || events.app_open.count_7d >= 20', mockContext)).toBe(true);
    expect(evaluateTraitExpression('events.purchase.count_30d >= 20 && last_seen_minutes_ago < 60', mockContext)).toBe(false);
  });

  it('should evaluate in expressions', () => {
    expect(evaluateTraitExpression('profile.plan in ["premium", "enterprise"]', mockContext)).toBe(true);
    expect(evaluateTraitExpression('profile.plan in ["basic", "standard"]', mockContext)).toBe(false);
  });

  it('should handle complex expressions', () => {
    const expression = 'events.app_open.unique_days_14d >= 5 && (events.purchase.count_30d >= 1 || profile.plan == "premium")';
    expect(evaluateTraitExpression(expression, mockContext)).toBe(true);
  });
});

describe('validateTraitExpression', () => {
  it('should validate correct expressions', () => {
    expect(validateTraitExpression('events.purchase.count_30d >= 1')).toEqual({ valid: true });
    expect(validateTraitExpression('profile.plan in ["premium", "basic"]')).toEqual({ valid: true });
    expect(validateTraitExpression('events.app_open.unique_days_14d >= 5 && last_seen_minutes_ago < 1440')).toEqual({ valid: true });
  });

  it('should reject invalid expressions', () => {
    const result = validateTraitExpression('events.purchase.');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject expressions with syntax errors', () => {
    const result = validateTraitExpression('events.purchase.count_30d >=');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

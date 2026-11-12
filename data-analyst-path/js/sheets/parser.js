(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // Excel formula AST parser
  // Supports: literals, cell refs (A1, $A$1, Sheet1!A1:B10, Table[Col], Spill A1#), function calls, unary & binary operators.

  var TOK = {
    NUM: 'NUM', STR: 'STR', BOOL: 'BOOL', ERR: 'ERR', REF: 'REF', ID: 'ID',
    OP: 'OP', COMMA: 'COMMA', SEMI: 'SEMI', COLON: 'COLON',
    LPAREN: '(', RPAREN: ')', LBRACKET: '[', RBRACKET: ']', LBRACE: '{', RBRACE: '}'
  };

  function tokenize(str, argSep) {
    argSep = argSep || ',';
    var tokens = [];
    var i = 0, len = str.length;

    while (i < len) {
      var ch = str.charAt(i);

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // String literal
      if (ch === '"') {
        var s = '';
        i++;
        while (i < len) {
          if (str.charAt(i) === '"') {
            if (str.charAt(i + 1) === '"') {
              s += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            s += str.charAt(i++);
          }
        }
        tokens.push({ type: TOK.STR, val: s });
        continue;
      }

      // Error values #...
      if (ch === '#') {
        var errMatch = S.ERR_RE.exec(str.slice(i));
        if (errMatch) {
          tokens.push({ type: TOK.ERR, val: S.errFromCode(errMatch[0]) || S.E.VALUE });
          i += errMatch[0].length;
          continue;
        }
      }

      // Numbers
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(str.charAt(i + 1)))) {
        var numStr = '';
        while (i < len && /[\d.]/.test(str.charAt(i))) {
          numStr += str.charAt(i++);
        }
        if (i < len && /[eE]/.test(str.charAt(i))) {
          numStr += str.charAt(i++);
          if (i < len && /[+-]/.test(str.charAt(i))) numStr += str.charAt(i++);
          while (i < len && /\d/.test(str.charAt(i))) numStr += str.charAt(i++);
        }
        tokens.push({ type: TOK.NUM, val: +numStr });
        continue;
      }

      // Operators: <=, >=, <>, =, <, >, +, -, *, /, ^, &, %
      if (ch === '<') {
        if (str.charAt(i + 1) === '=') { tokens.push({ type: TOK.OP, val: '<=' }); i += 2; continue; }
        if (str.charAt(i + 1) === '>') { tokens.push({ type: TOK.OP, val: '<>' }); i += 2; continue; }
        tokens.push({ type: TOK.OP, val: '<' }); i++; continue;
      }
      if (ch === '>') {
        if (str.charAt(i + 1) === '=') { tokens.push({ type: TOK.OP, val: '>=' }); i += 2; continue; }
        tokens.push({ type: TOK.OP, val: '>' }); i++; continue;
      }
      if ('=+-*/^&%'.indexOf(ch) >= 0) {
        tokens.push({ type: TOK.OP, val: ch });
        i++;
        continue;
      }

      // Separators
      if (ch === argSep) {
        tokens.push({ type: TOK.COMMA, val: argSep });
        i++;
        continue;
      }
      if (ch === ':') { tokens.push({ type: TOK.COLON, val: ':' }); i++; continue; }
      if (ch === ';') { tokens.push({ type: TOK.SEMI, val: ';' }); i++; continue; }
      if (ch === '(') { tokens.push({ type: TOK.LPAREN, val: '(' }); i++; continue; }
      if (ch === ')') { tokens.push({ type: TOK.RPAREN, val: ')' }); i++; continue; }
      if (ch === '[') { tokens.push({ type: TOK.LBRACKET, val: '[' }); i++; continue; }
      if (ch === ']') { tokens.push({ type: TOK.RBRACKET, val: ']' }); i++; continue; }
      if (ch === '{') { tokens.push({ type: TOK.LBRACE, val: '{' }); i++; continue; }
      if (ch === '}') { tokens.push({ type: TOK.RBRACE, val: '}' }); i++; continue; }

      // Sheet-qualified reference e.g. 'My Sheet'!A1 or Sheet1!A1
      var sheetPrefix = null;
      if (ch === "'") {
        var shName = '';
        i++;
        while (i < len) {
          if (str.charAt(i) === "'") {
            if (str.charAt(i + 1) === "'") { shName += "'"; i += 2; }
            else { i++; break; }
          } else { shName += str.charAt(i++); }
        }
        if (str.charAt(i) === '!') {
          i++; // skip '!'
          sheetPrefix = shName;
        }
      }

      // Identifiers / Reference tokens / Function names
      var idStr = '';
      while (i < len && /[A-Za-z0-9_.$#]/.test(str.charAt(i))) {
        idStr += str.charAt(i++);
      }

      if (!sheetPrefix && str.charAt(i) === '!') {
        sheetPrefix = idStr;
        i++; // skip '!'
        idStr = '';
        while (i < len && /[A-Za-z0-9_.$#]/.test(str.charAt(i))) {
          idStr += str.charAt(i++);
        }
      }

      if (idStr) {
        var u = idStr.toUpperCase();
        if (!sheetPrefix && (u === 'TRUE' || u === 'VERDADERO')) {
          tokens.push({ type: TOK.BOOL, val: true });
        } else if (!sheetPrefix && (u === 'FALSE' || u === 'FALSO')) {
          tokens.push({ type: TOK.BOOL, val: false });
        } else {
          // Check if followed by '(' -> Function call
          var peek = i;
          while (peek < len && /\s/.test(str.charAt(peek))) peek++;
          if (str.charAt(peek) === '(' && !sheetPrefix) {
            tokens.push({ type: TOK.ID, val: idStr });
          } else {
            tokens.push({ type: TOK.REF, val: idStr, sheet: sheetPrefix });
          }
        }
        continue;
      }

      i++; // fallback skip unknown
    }

    return tokens;
  }

  // Parser: builds an AST tree
  function Parser(tokens, defaultSheet) {
    this.tokens = tokens;
    this.pos = 0;
    this.defaultSheet = defaultSheet || 'Sheet1';
  }

  Parser.prototype.peek = function () {
    return this.tokens[this.pos] || null;
  };

  Parser.prototype.next = function () {
    return this.tokens[this.pos++] || null;
  };

  Parser.prototype.parse = function () {
    if (!this.tokens.length) return null;
    var node = this.parseExpr();
    return node;
  };

  Parser.prototype.parseExpr = function () {
    return this.parseBinary(0);
  };

  var PRECEDENCE = {
    ':': 9,
    '^': 8,
    '*': 7, '/': 7,
    '+': 6, '-': 6,
    '&': 5,
    '=': 4, '<>': 4, '<': 4, '<=': 4, '>': 4, '>=': 4
  };

  Parser.prototype.parseBinary = function (minPrec) {
    var left = this.parseUnary();

    while (this.peek()) {
      var tok = this.peek();
      var op = tok.val;
      var prec = (tok.type === TOK.OP || tok.type === TOK.COLON) ? PRECEDENCE[op] : undefined;
      if (prec === undefined || prec < minPrec) break;

      this.next(); // consume op
      var nextPrec = (op === '^') ? prec : prec + 1; // right-associative for power
      var right = this.parseBinary(nextPrec);

      if (op === ':') {
        left = { type: 'RANGE_OP', left: left, right: right };
      } else {
        left = { type: 'BINARY', op: op, left: left, right: right };
      }
    }

    return left;
  };

  Parser.prototype.parseUnary = function () {
    var tok = this.peek();
    if (tok && tok.type === TOK.OP && (tok.val === '+' || tok.val === '-')) {
      this.next();
      return { type: 'UNARY', op: tok.val, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  };

  Parser.prototype.parsePrimary = function () {
    var tok = this.next();
    if (!tok) return { type: 'ERR', val: S.E.VALUE };

    if (tok.type === TOK.NUM) return { type: 'NUM', val: tok.val };
    if (tok.type === TOK.STR) return { type: 'STR', val: tok.val };
    if (tok.type === TOK.BOOL) return { type: 'BOOL', val: tok.val };
    if (tok.type === TOK.ERR) return { type: 'ERR', val: tok.val };

    if (tok.type === TOK.LPAREN) {
      var expr = this.parseExpr();
      if (this.peek() && this.peek().type === TOK.RPAREN) this.next();
      return expr;
    }

    // Function call: ID ( arg1 , arg2 ... )
    if (tok.type === TOK.ID) {
      var fnName = tok.val.toUpperCase();
      // Translate Spanish names to English internal names
      if (S.ES_TO_EN[fnName]) fnName = S.ES_TO_EN[fnName];

      if (this.peek() && this.peek().type === TOK.LPAREN) {
        this.next(); // eat (
        var args = [];
        if (!this.peek() || this.peek().type !== TOK.RPAREN) {
          while (true) {
            args.push(this.parseExpr());
            if (this.peek() && this.peek().type === TOK.COMMA) {
              this.next();
              continue;
            }
            break;
          }
        }
        if (this.peek() && this.peek().type === TOK.RPAREN) this.next();
        return { type: 'CALL', fn: fnName, args: args };
      }
    }

    // Reference token
    if (tok.type === TOK.REF) {
      var sheet = tok.sheet || this.defaultSheet;
      var refStr = tok.val;
      var isSpill = refStr.endsWith('#');
      if (isSpill) refStr = refStr.slice(0, -1);

      // Check if structured table reference e.g. Table1[Column]
      if (this.peek() && this.peek().type === TOK.LBRACKET) {
        this.next(); // eat [
        var colToken = this.next();
        var colName = colToken ? colToken.val : '';
        if (this.peek() && this.peek().type === TOK.RBRACKET) this.next();
        return { type: 'TABLE_REF', table: refStr, col: colName };
      }

      var parsed = S.parseRange(refStr);
      if (parsed) {
        return {
          type: 'REF',
          ref: new S.Ref(sheet, parsed.r1, parsed.c1, parsed.r2, parsed.c2),
          spill: isSpill
        };
      }

      // Could be a defined Named Range
      return { type: 'NAME', name: refStr, sheet: tok.sheet };
    }

    return { type: 'ERR', val: S.E.NAME };
  };

  S.parseFormula = function (formulaText, defaultSheet, argSep) {
    if (!formulaText || !formulaText.startsWith('=')) return null;
    var raw = formulaText.slice(1).trim();
    var tokens = tokenize(raw, argSep || ',');
    var p = new Parser(tokens, defaultSheet);
    return p.parse();
  };

  // F4 reference toggler (relative -> absolute -> row abs -> col abs -> relative)
  S.toggleF4 = function (refText) {
    var m = /^([A-Za-z]+)?(!)?(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})$/.exec(refText);
    if (!m) return refText;
    var sheet = m[1] ? m[1] + '!' : '';
    var cAbs = m[3] === '$';
    var col = m[4];
    var rAbs = m[5] === '$';
    var row = m[6];

    if (!cAbs && !rAbs) {
      return sheet + '$' + col + '$' + row;
    } else if (cAbs && rAbs) {
      return sheet + col + '$' + row;
    } else if (!cAbs && rAbs) {
      return sheet + '$' + col + row;
    } else {
      return sheet + col + row;
    }
  };
})();

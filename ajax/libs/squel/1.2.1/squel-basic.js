/*
Copyright (c) Ramesh Nair (hiddentao.com)

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/


(function() {
  var cls, getValueHandler, registerValueHandler, squel, _extend, _ref, _ref1, _ref2,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  cls = {};

  _extend = function() {
    var dst, k, sources, src, v, _i, _len;
    dst = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (sources) {
      for (_i = 0, _len = sources.length; _i < _len; _i++) {
        src = sources[_i];
        if (src) {
          for (k in src) {
            if (!__hasProp.call(src, k)) continue;
            v = src[k];
            dst[k] = v;
          }
        }
      }
    }
    return dst;
  };

  cls.DefaultQueryBuilderOptions = {
    autoQuoteTableNames: false,
    autoQuoteFieldNames: false,
    autoQuoteAliasNames: true,
    nameQuoteCharacter: '`',
    tableAliasQuoteCharacter: '`',
    fieldAliasQuoteCharacter: '"',
    usingValuePlaceholders: false,
    valueHandlers: []
  };

  cls.globalValueHandlers = [];

  registerValueHandler = function(handlers, type, handler) {
    var typeHandler, _i, _len;
    if ('function' !== typeof type) {
      throw new Error("type must be a class constructor");
    }
    if ('function' !== typeof handler) {
      throw new Error("handler must be a function");
    }
    for (_i = 0, _len = handlers.length; _i < _len; _i++) {
      typeHandler = handlers[_i];
      if (typeHandler.type === type) {
        typeHandler.handler = handler;
        return;
      }
    }
    return handlers.push({
      type: type,
      handler: handler
    });
  };

  getValueHandler = function() {
    var handlerLists, handlers, typeHandler, value, _i, _j, _len, _len1;
    value = arguments[0], handlerLists = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = handlerLists.length; _i < _len; _i++) {
      handlers = handlerLists[_i];
      for (_j = 0, _len1 = handlers.length; _j < _len1; _j++) {
        typeHandler = handlers[_j];
        if (value instanceof typeHandler.type) {
          return typeHandler.handler;
        }
      }
    }
    return void 0;
  };

  cls.registerValueHandler = function(type, handler) {
    return registerValueHandler(cls.globalValueHandlers, type, handler);
  };

  cls.Cloneable = (function() {
    function Cloneable() {}

    Cloneable.prototype.clone = function() {
      var newInstance;
      newInstance = new this.constructor;
      return _extend(newInstance, JSON.parse(JSON.stringify(this)));
    };

    return Cloneable;

  })();

  cls.BaseBuilder = (function(_super) {
    __extends(BaseBuilder, _super);

    function BaseBuilder(options) {
      var defaults;
      defaults = JSON.parse(JSON.stringify(cls.DefaultQueryBuilderOptions));
      this.options = _extend({}, defaults, options);
    }

    BaseBuilder.prototype.registerValueHandler = function(type, handler) {
      registerValueHandler(this.options.valueHandlers, type, handler);
      return this;
    };

    BaseBuilder.prototype._getObjectClassName = function(obj) {
      var arr;
      if (obj && obj.constructor && obj.constructor.toString) {
        arr = obj.constructor.toString().match(/function\s*(\w+)/);
        if (arr && arr.length === 2) {
          return arr[1];
        }
      }
      return void 0;
    };

    BaseBuilder.prototype._sanitizeCondition = function(condition) {
      if (condition instanceof cls.Expression) {
        condition = condition.toString();
      }
      if ("string" !== typeof condition) {
        throw new Error("condition must be a string or Expression instance");
      }
      return condition;
    };

    BaseBuilder.prototype._sanitizeName = function(value, type) {
      if ("string" !== typeof value) {
        throw new Error("" + type + " must be a string");
      }
      return value;
    };

    BaseBuilder.prototype._sanitizeField = function(item) {
      var sanitized;
      sanitized = this._sanitizeName(item, "field name");
      if (this.options.autoQuoteFieldNames) {
        return "" + this.options.nameQuoteCharacter + sanitized + this.options.nameQuoteCharacter;
      } else {
        return sanitized;
      }
    };

    BaseBuilder.prototype._sanitizeTable = function(item, allowNested) {
      var sanitized;
      if (allowNested == null) {
        allowNested = false;
      }
      if (allowNested) {
        if ("string" === typeof item) {
          sanitized = item;
        } else if (item instanceof cls.QueryBuilder && item.isNestable()) {
          return item;
        } else {
          throw new Error("table name must be a string or a nestable query instance");
        }
      } else {
        sanitized = this._sanitizeName(item, 'table name');
      }
      if (this.options.autoQuoteTableNames) {
        return "" + this.options.nameQuoteCharacter + sanitized + this.options.nameQuoteCharacter;
      } else {
        return sanitized;
      }
    };

    BaseBuilder.prototype._sanitizeTableAlias = function(item) {
      var sanitized;
      sanitized = this._sanitizeName(item, "table alias");
      if (this.options.autoQuoteAliasNames) {
        return "" + this.options.tableAliasQuoteCharacter + sanitized + this.options.tableAliasQuoteCharacter;
      } else {
        return sanitized;
      }
    };

    BaseBuilder.prototype._sanitizeFieldAlias = function(item) {
      var sanitized;
      sanitized = this._sanitizeName(item, "field alias");
      if (this.options.autoQuoteAliasNames) {
        return "" + this.options.fieldAliasQuoteCharacter + sanitized + this.options.fieldAliasQuoteCharacter;
      } else {
        return sanitized;
      }
    };

    BaseBuilder.prototype._sanitizeLimitOffset = function(value) {
      value = parseInt(value);
      if (0 > value || isNaN(value)) {
        throw new Error("limit/offset must be >= 0");
      }
      return value;
    };

    BaseBuilder.prototype._sanitizeValue = function(item) {
      var itemType, typeIsValid;
      itemType = typeof item;
      if (null === item) {

      } else if ("string" === itemType || "number" === itemType || "boolean" === itemType) {

      } else {
        typeIsValid = void 0 !== getValueHandler(item, this.options.valueHandlers, cls.globalValueHandlers);
        if (!typeIsValid) {
          throw new Error("field value must be a string, number, boolean, null or one of the registered custom value types");
        }
      }
      return item;
    };

    BaseBuilder.prototype._escapeValue = function(str) {
      return str;
    };

    BaseBuilder.prototype._formatValue = function(value) {
      var customHandler;
      customHandler = getValueHandler(value, this.options.valueHandlers, cls.globalValueHandlers);
      if (customHandler) {
        value = customHandler(value);
      }
      if (null === value) {
        value = "NULL";
      } else if ("boolean" === typeof value) {
        value = value ? "TRUE" : "FALSE";
      } else if ("number" !== typeof value) {
        if (false === this.options.usingValuePlaceholders) {
          value = this._escapeValue(value);
          value = "'" + value + "'";
        }
      }
      return value;
    };

    return BaseBuilder;

  })(cls.Cloneable);

  cls.Expression = (function(_super) {
    var _toString;

    __extends(Expression, _super);

    Expression.prototype.tree = null;

    Expression.prototype.current = null;

    function Expression() {
      var _this = this;
      this.tree = {
        parent: null,
        nodes: []
      };
      this.current = this.tree;
      this._begin = function(op) {
        var new_tree;
        new_tree = {
          type: op,
          parent: _this.current,
          nodes: []
        };
        _this.current.nodes.push(new_tree);
        _this.current = _this.current.nodes[_this.current.nodes.length - 1];
        return _this;
      };
    }

    Expression.prototype.and_begin = function() {
      return this._begin('AND');
    };

    Expression.prototype.or_begin = function() {
      return this._begin('OR');
    };

    Expression.prototype.end = function() {
      if (!this.current.parent) {
        throw new Error("begin() needs to be called");
      }
      this.current = this.current.parent;
      return this;
    };

    Expression.prototype.and = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'AND',
        expr: expr
      });
      return this;
    };

    Expression.prototype.or = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'OR',
        expr: expr
      });
      return this;
    };

    Expression.prototype.toString = function() {
      if (null !== this.current.parent) {
        throw new Error("end() needs to be called");
      }
      return _toString(this.tree);
    };

    _toString = function(node) {
      var child, nodeStr, str, _i, _len, _ref;
      str = "";
      _ref = node.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        if (child.expr != null) {
          nodeStr = child.expr;
        } else {
          nodeStr = _toString(child);
          if ("" !== nodeStr) {
            nodeStr = "(" + nodeStr + ")";
          }
        }
        if ("" !== nodeStr) {
          if ("" !== str) {
            str += " " + child.type + " ";
          }
          str += nodeStr;
        }
      }
      return str;
    };

    /*
    Clone this expression.
    
    Note that the algorithm contained within this method is probably non-optimal, so please avoid cloning large
    expression trees.
    */


    Expression.prototype.clone = function() {
      var newInstance, _cloneTree;
      newInstance = new this.constructor;
      (_cloneTree = function(node) {
        var child, _i, _len, _ref, _results;
        _ref = node.nodes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          if (child.expr != null) {
            _results.push(newInstance.current.nodes.push(JSON.parse(JSON.stringify(child))));
          } else {
            newInstance._begin(child.type);
            _cloneTree(child);
            if (!this.current === child) {
              _results.push(newInstance.end());
            } else {
              _results.push(void 0);
            }
          }
        }
        return _results;
      })(this.tree);
      return newInstance;
    };

    return Expression;

  })(cls.Cloneable);

  cls.Block = (function(_super) {
    __extends(Block, _super);

    function Block() {
      _ref = Block.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Block.prototype.exposedMethods = function() {
      var attr, ret, value;
      ret = {};
      for (attr in this) {
        value = this[attr];
        if (typeof value === "function" && attr.charAt(0) !== '_' && !cls.Block.prototype[attr]) {
          ret[attr] = value;
        }
      }
      return ret;
    };

    Block.prototype.buildStr = function(queryBuilder) {
      return '';
    };

    return Block;

  })(cls.BaseBuilder);

  cls.StringBlock = (function(_super) {
    __extends(StringBlock, _super);

    function StringBlock(options, str) {
      StringBlock.__super__.constructor.call(this, options);
      this.str = str;
    }

    StringBlock.prototype.buildStr = function(queryBuilder) {
      return this.str;
    };

    return StringBlock;

  })(cls.Block);

  cls.AbstractTableBlock = (function(_super) {
    __extends(AbstractTableBlock, _super);

    function AbstractTableBlock(options) {
      AbstractTableBlock.__super__.constructor.call(this, options);
      this.tables = [];
    }

    AbstractTableBlock.prototype._table = function(table, alias) {
      if (alias == null) {
        alias = null;
      }
      if (alias) {
        alias = this._sanitizeTableAlias(alias);
      }
      table = this._sanitizeTable(table, this.options.allowNested || false);
      if (this.options.singleTable) {
        this.tables = [];
      }
      return this.tables.push({
        table: table,
        alias: alias
      });
    };

    AbstractTableBlock.prototype.buildStr = function(queryBuilder) {
      var table, tables, _i, _len, _ref1;
      if (0 >= this.tables.length) {
        throw new Error("_table() needs to be called");
      }
      tables = "";
      _ref1 = this.tables;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        table = _ref1[_i];
        if ("" !== tables) {
          tables += ", ";
        }
        if ("string" === typeof table.table) {
          tables += table.table;
        } else {
          tables += "(" + table.table + ")";
        }
        if (table.alias) {
          tables += " " + table.alias;
        }
      }
      return tables;
    };

    return AbstractTableBlock;

  })(cls.Block);

  cls.UpdateTableBlock = (function(_super) {
    __extends(UpdateTableBlock, _super);

    function UpdateTableBlock() {
      _ref1 = UpdateTableBlock.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    UpdateTableBlock.prototype.table = function(table, alias) {
      if (alias == null) {
        alias = null;
      }
      return this._table(table, alias);
    };

    return UpdateTableBlock;

  })(cls.AbstractTableBlock);

  cls.FromTableBlock = (function(_super) {
    __extends(FromTableBlock, _super);

    function FromTableBlock() {
      _ref2 = FromTableBlock.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    FromTableBlock.prototype.from = function(table, alias) {
      if (alias == null) {
        alias = null;
      }
      return this._table(table, alias);
    };

    FromTableBlock.prototype.buildStr = function(queryBuilder) {
      var tables;
      if (0 >= this.tables.length) {
        throw new Error("from() needs to be called");
      }
      tables = FromTableBlock.__super__.buildStr.call(this, queryBuilder);
      return "FROM " + tables;
    };

    return FromTableBlock;

  })(cls.AbstractTableBlock);

  cls.IntoTableBlock = (function(_super) {
    __extends(IntoTableBlock, _super);

    function IntoTableBlock(options) {
      IntoTableBlock.__super__.constructor.call(this, options);
      this.table = null;
    }

    IntoTableBlock.prototype.into = function(table) {
      return this.table = this._sanitizeTable(table, false);
    };

    IntoTableBlock.prototype.buildStr = function(queryBuilder) {
      if (!this.table) {
        throw new Error("into() needs to be called");
      }
      return "INTO " + this.table;
    };

    return IntoTableBlock;

  })(cls.Block);

  cls.GetFieldBlock = (function(_super) {
    __extends(GetFieldBlock, _super);

    function GetFieldBlock(options) {
      GetFieldBlock.__super__.constructor.call(this, options);
      this._fields = [];
    }

    GetFieldBlock.prototype.fields = function(_fields) {
      var alias, field, _results;
      _results = [];
      for (field in _fields) {
        alias = _fields[field];
        _results.push(this.field(field, alias));
      }
      return _results;
    };

    GetFieldBlock.prototype.field = function(field, alias) {
      if (alias == null) {
        alias = null;
      }
      field = this._sanitizeField(field);
      if (alias) {
        alias = this._sanitizeFieldAlias(alias);
      }
      return this._fields.push({
        name: field,
        alias: alias
      });
    };

    GetFieldBlock.prototype.buildStr = function(queryBuilder) {
      var field, fields, _i, _len, _ref3;
      fields = "";
      _ref3 = this._fields;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        field = _ref3[_i];
        if ("" !== fields) {
          fields += ", ";
        }
        fields += field.name;
        if (field.alias) {
          fields += " AS " + field.alias;
        }
      }
      if ("" === fields) {
        return "*";
      } else {
        return fields;
      }
    };

    return GetFieldBlock;

  })(cls.Block);

  cls.SetFieldBlock = (function(_super) {
    __extends(SetFieldBlock, _super);

    function SetFieldBlock(options) {
      SetFieldBlock.__super__.constructor.call(this, options);
      this.fields = {};
    }

    SetFieldBlock.prototype.set = function(field, value) {
      field = this._sanitizeField(field);
      value = this._sanitizeValue(value);
      this.fields[field] = value;
      return this;
    };

    SetFieldBlock.prototype.buildStr = function(queryBuilder) {
      var field, fieldNames, fields, _i, _len;
      fieldNames = (function() {
        var _ref3, _results;
        _ref3 = this.fields;
        _results = [];
        for (field in _ref3) {
          if (!__hasProp.call(_ref3, field)) continue;
          _results.push(field);
        }
        return _results;
      }).call(this);
      if (0 >= fieldNames.length) {
        throw new Error("set() needs to be called");
      }
      fields = "";
      for (_i = 0, _len = fieldNames.length; _i < _len; _i++) {
        field = fieldNames[_i];
        if ("" !== fields) {
          fields += ", ";
        }
        fields += "" + field + " = " + (this._formatValue(this.fields[field]));
      }
      return "SET " + fields;
    };

    return SetFieldBlock;

  })(cls.Block);

  cls.InsertFieldValueBlock = (function(_super) {
    __extends(InsertFieldValueBlock, _super);

    function InsertFieldValueBlock(options) {
      InsertFieldValueBlock.__super__.constructor.call(this, options);
      this.fields = {};
    }

    InsertFieldValueBlock.prototype.buildStr = function(queryBuilder) {
      var field, fieldNames, fields, name, values, _i, _len;
      fieldNames = (function() {
        var _ref3, _results;
        _ref3 = this.fields;
        _results = [];
        for (name in _ref3) {
          if (!__hasProp.call(_ref3, name)) continue;
          _results.push(name);
        }
        return _results;
      }).call(this);
      if (0 >= fieldNames.length) {
        throw new Error("set() needs to be called");
      }
      fields = "";
      values = "";
      for (_i = 0, _len = fieldNames.length; _i < _len; _i++) {
        field = fieldNames[_i];
        if ("" !== fields) {
          fields += ", ";
        }
        fields += field;
        if ("" !== values) {
          values += ", ";
        }
        values += this._formatValue(this.fields[field]);
      }
      return "(" + fields + ") VALUES (" + values + ")";
    };

    return InsertFieldValueBlock;

  })(cls.SetFieldBlock);

  cls.DistinctBlock = (function(_super) {
    __extends(DistinctBlock, _super);

    function DistinctBlock(options) {
      DistinctBlock.__super__.constructor.call(this, options);
      this.useDistinct = false;
    }

    DistinctBlock.prototype.distinct = function() {
      return this.useDistinct = true;
    };

    DistinctBlock.prototype.buildStr = function(queryBuilder) {
      if (this.useDistinct) {
        return "DISTINCT";
      } else {
        return "";
      }
    };

    return DistinctBlock;

  })(cls.Block);

  cls.GroupByBlock = (function(_super) {
    __extends(GroupByBlock, _super);

    function GroupByBlock(options) {
      GroupByBlock.__super__.constructor.call(this, options);
      this.groups = [];
    }

    GroupByBlock.prototype.group = function(field) {
      field = this._sanitizeField(field);
      return this.groups.push(field);
    };

    GroupByBlock.prototype.buildStr = function(queryBuilder) {
      var f, groups, _i, _len, _ref3;
      groups = "";
      if (0 < this.groups.length) {
        _ref3 = this.groups;
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          f = _ref3[_i];
          if ("" !== groups) {
            groups += ", ";
          }
          groups += f;
        }
        groups = "GROUP BY " + groups;
      }
      return groups;
    };

    return GroupByBlock;

  })(cls.Block);

  cls.OffsetBlock = (function(_super) {
    __extends(OffsetBlock, _super);

    function OffsetBlock(options) {
      OffsetBlock.__super__.constructor.call(this, options);
      this.offsets = null;
    }

    OffsetBlock.prototype.offset = function(start) {
      start = this._sanitizeLimitOffset(start);
      return this.offsets = start;
    };

    OffsetBlock.prototype.buildStr = function(queryBuilder) {
      if (this.offsets) {
        return "OFFSET " + this.offsets;
      } else {
        return "";
      }
    };

    return OffsetBlock;

  })(cls.Block);

  cls.WhereBlock = (function(_super) {
    __extends(WhereBlock, _super);

    function WhereBlock(options) {
      WhereBlock.__super__.constructor.call(this, options);
      this.wheres = [];
    }

    WhereBlock.prototype.where = function() {
      var condition, inValues, item, value, values, _i, _j, _len, _len1;
      condition = arguments[0], values = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      condition = this._sanitizeCondition(condition);
      for (_i = 0, _len = values.length; _i < _len; _i++) {
        value = values[_i];
        if (Array.isArray(value)) {
          inValues = [];
          for (_j = 0, _len1 = value.length; _j < _len1; _j++) {
            item = value[_j];
            inValues.push(this._formatValue(this._sanitizeValue(item)));
          }
          value = "(" + (inValues.join(', ')) + ")";
        } else {
          value = this._formatValue(this._sanitizeValue(value));
        }
        condition = condition.replace('?', value);
      }
      if ("" !== condition) {
        return this.wheres.push(condition);
      }
    };

    WhereBlock.prototype.buildStr = function(queryBuilder) {
      if (0 < this.wheres.length) {
        return "WHERE (" + this.wheres.join(") AND (") + ")";
      } else {
        return "";
      }
    };

    return WhereBlock;

  })(cls.Block);

  cls.OrderByBlock = (function(_super) {
    __extends(OrderByBlock, _super);

    function OrderByBlock(options) {
      OrderByBlock.__super__.constructor.call(this, options);
      this.orders = [];
    }

    OrderByBlock.prototype.order = function(field, asc) {
      if (asc == null) {
        asc = true;
      }
      field = this._sanitizeField(field);
      return this.orders.push({
        field: field,
        dir: asc ? true : false
      });
    };

    OrderByBlock.prototype.buildStr = function(queryBuilder) {
      var o, orders, _i, _len, _ref3;
      if (0 < this.orders.length) {
        orders = "";
        _ref3 = this.orders;
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          o = _ref3[_i];
          if ("" !== orders) {
            orders += ", ";
          }
          orders += "" + o.field + " " + (o.dir ? 'ASC' : 'DESC');
        }
        return "ORDER BY " + orders;
      } else {
        return "";
      }
    };

    return OrderByBlock;

  })(cls.Block);

  cls.LimitBlock = (function(_super) {
    __extends(LimitBlock, _super);

    function LimitBlock(options) {
      LimitBlock.__super__.constructor.call(this, options);
      this.limits = null;
    }

    LimitBlock.prototype.limit = function(max) {
      max = this._sanitizeLimitOffset(max);
      return this.limits = max;
    };

    LimitBlock.prototype.buildStr = function(queryBuilder) {
      if (this.limits) {
        return "LIMIT " + this.limits;
      } else {
        return "";
      }
    };

    return LimitBlock;

  })(cls.Block);

  cls.JoinBlock = (function(_super) {
    __extends(JoinBlock, _super);

    function JoinBlock(options) {
      JoinBlock.__super__.constructor.call(this, options);
      this.joins = [];
    }

    JoinBlock.prototype.join = function(table, alias, condition, type) {
      if (alias == null) {
        alias = null;
      }
      if (condition == null) {
        condition = null;
      }
      if (type == null) {
        type = 'INNER';
      }
      table = this._sanitizeTable(table, true);
      if (alias) {
        alias = this._sanitizeTableAlias(alias);
      }
      if (condition) {
        condition = this._sanitizeCondition(condition);
      }
      this.joins.push({
        type: type,
        table: table,
        alias: alias,
        condition: condition
      });
      return this;
    };

    JoinBlock.prototype.left_join = function(table, alias, condition) {
      if (alias == null) {
        alias = null;
      }
      if (condition == null) {
        condition = null;
      }
      return this.join(table, alias, condition, 'LEFT');
    };

    JoinBlock.prototype.right_join = function(table, alias, condition) {
      if (alias == null) {
        alias = null;
      }
      if (condition == null) {
        condition = null;
      }
      return this.join(table, alias, condition, 'RIGHT');
    };

    JoinBlock.prototype.outer_join = function(table, alias, condition) {
      if (alias == null) {
        alias = null;
      }
      if (condition == null) {
        condition = null;
      }
      return this.join(table, alias, condition, 'OUTER');
    };

    JoinBlock.prototype.buildStr = function(queryBuilder) {
      var j, joins, _i, _len, _ref3;
      joins = "";
      _ref3 = this.joins || [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        j = _ref3[_i];
        if (joins !== "") {
          joins += " ";
        }
        joins += "" + j.type + " JOIN ";
        if ("string" === typeof j.table) {
          joins += j.table;
        } else {
          joins += "(" + j.table + ")";
        }
        if (j.alias) {
          joins += " " + j.alias;
        }
        if (j.condition) {
          joins += " ON (" + j.condition + ")";
        }
      }
      return joins;
    };

    return JoinBlock;

  })(cls.Block);

  cls.QueryBuilder = (function(_super) {
    __extends(QueryBuilder, _super);

    function QueryBuilder(options, blocks) {
      var block, methodBody, methodName, _fn, _i, _len, _ref3, _ref4,
        _this = this;
      QueryBuilder.__super__.constructor.call(this, options);
      this.blocks = blocks || [];
      _ref3 = this.blocks;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        block = _ref3[_i];
        _ref4 = block.exposedMethods();
        _fn = function(block, name, body) {
          return _this[name] = function() {
            body.apply(block, arguments);
            return _this;
          };
        };
        for (methodName in _ref4) {
          methodBody = _ref4[methodName];
          if (this[methodName] != null) {
            throw new Error("" + (this._getObjectClassName(this)) + " already has a builder method called: " + methodName);
          }
          _fn(block, methodName, methodBody);
        }
      }
    }

    QueryBuilder.prototype.registerValueHandler = function(type, handler) {
      var block, _i, _len, _ref3;
      _ref3 = this.blocks;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        block = _ref3[_i];
        block.registerValueHandler(type, handler);
      }
      QueryBuilder.__super__.registerValueHandler.call(this, type, handler);
      return this;
    };

    QueryBuilder.prototype.updateOptions = function(options) {
      var block, _i, _len, _ref3, _results;
      this.options = _extend({}, this.options, options);
      _ref3 = this.blocks;
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        block = _ref3[_i];
        _results.push(block.options = _extend({}, block.options, options));
      }
      return _results;
    };

    QueryBuilder.prototype.toString = function() {
      var block;
      return ((function() {
        var _i, _len, _ref3, _results;
        _ref3 = this.blocks;
        _results = [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          block = _ref3[_i];
          _results.push(block.buildStr(this));
        }
        return _results;
      }).call(this)).filter(function(v) {
        return 0 < v.length;
      }).join(' ');
    };

    QueryBuilder.prototype.clone = function() {
      var block;
      return new this.constructor(this.options, (function() {
        var _i, _len, _ref3, _results;
        _ref3 = this.blocks;
        _results = [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          block = _ref3[_i];
          _results.push(block.clone());
        }
        return _results;
      }).call(this));
    };

    QueryBuilder.prototype.isNestable = function() {
      return false;
    };

    return QueryBuilder;

  })(cls.BaseBuilder);

  cls.Select = (function(_super) {
    __extends(Select, _super);

    function Select(options, blocks) {
      if (blocks == null) {
        blocks = null;
      }
      blocks || (blocks = [
        new cls.StringBlock(options, 'SELECT'), new cls.DistinctBlock(options), new cls.GetFieldBlock(options), new cls.FromTableBlock(_extend({}, options, {
          allowNested: true
        })), new cls.JoinBlock(_extend({}, options, {
          allowNested: true
        })), new cls.WhereBlock(options), new cls.GroupByBlock(options), new cls.OrderByBlock(options), new cls.LimitBlock(options), new cls.OffsetBlock(options)
      ]);
      Select.__super__.constructor.call(this, options, blocks);
    }

    Select.prototype.isNestable = function() {
      return true;
    };

    return Select;

  })(cls.QueryBuilder);

  cls.Update = (function(_super) {
    __extends(Update, _super);

    function Update(options, blocks) {
      if (blocks == null) {
        blocks = null;
      }
      blocks || (blocks = [new cls.StringBlock(options, 'UPDATE'), new cls.UpdateTableBlock(options), new cls.SetFieldBlock(options), new cls.WhereBlock(options), new cls.OrderByBlock(options), new cls.LimitBlock(options)]);
      Update.__super__.constructor.call(this, options, blocks);
    }

    return Update;

  })(cls.QueryBuilder);

  cls.Delete = (function(_super) {
    __extends(Delete, _super);

    function Delete(options, blocks) {
      if (blocks == null) {
        blocks = null;
      }
      blocks || (blocks = [
        new cls.StringBlock(options, 'DELETE'), new cls.FromTableBlock(_extend({}, options, {
          singleTable: true
        })), new cls.JoinBlock(options), new cls.WhereBlock(options), new cls.OrderByBlock(options), new cls.LimitBlock(options)
      ]);
      Delete.__super__.constructor.call(this, options, blocks);
    }

    return Delete;

  })(cls.QueryBuilder);

  cls.Insert = (function(_super) {
    __extends(Insert, _super);

    function Insert(options, blocks) {
      if (blocks == null) {
        blocks = null;
      }
      blocks || (blocks = [new cls.StringBlock(options, 'INSERT'), new cls.IntoTableBlock(options), new cls.InsertFieldValueBlock(options)]);
      Insert.__super__.constructor.call(this, options, blocks);
    }

    return Insert;

  })(cls.QueryBuilder);

  squel = {
    expr: function() {
      return new cls.Expression;
    },
    select: function(options, blocks) {
      return new cls.Select(options, blocks);
    },
    update: function(options, blocks) {
      return new cls.Update(options, blocks);
    },
    insert: function(options, blocks) {
      return new cls.Insert(options, blocks);
    },
    "delete": function(options, blocks) {
      return new cls.Delete(options, blocks);
    },
    registerValueHandler: cls.registerValueHandler
  };

  squel.remove = squel["delete"];

  squel.cls = cls;

  if (typeof define !== "undefined" && define !== null ? define.amd : void 0) {
    define(function() {
      return squel;
    });
  } else if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = squel;
  } else {
    if (typeof window !== "undefined" && window !== null) {
      window.squel = squel;
    }
  }

  squel.flavours = {};

  squel.useFlavour = function(flavour) {
    if (squel.flavours[flavour] instanceof Function) {
      squel.flavours[flavour].call(null, squel);
    } else {
      throw new Error("Flavour not available: " + flavour);
    }
    return squel;
  };

}).call(this);

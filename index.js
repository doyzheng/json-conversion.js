(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.jsonConvert = factory());
}(this, (function () { 'use strict';

    /**
     * 支持的类型
     * @type {string[]}
     */
    var supportType = [
        'string',
        'number',
        'boolean',
        'null',
        'object',
        'array',
    ];

    /**
     * 获取给定值数据类型
     * @param {*} value
     * @return {String}
     */
    var getType = function(value) {
        if (value === null) {
            return null;
        }
        if (supportType.indexOf(typeof value) !== -1) {
            return typeof value;
        }

        return 'string';
    };

    /**
     * 是否为Schema格式
     * @param {Object} obj
     * @returns {boolean}
     */
    var isSchema = function(obj) {
        return isObject(obj) && supportType.indexOf(obj.type) !== -1;
    };

    /**
     * 检查值是否为对象
     * @param {*} obj
     * @returns {Boolean}
     */
    var isObject = function(obj) {
        return obj !== null && !isArray(obj) && typeof obj === 'object';
    };

    /**
     * 检查变量是否为函数
     * @param {Function} fun
     * @returns {boolean}
     */
    var isFunction = function(fun) {
        return typeof fun === 'function';
    };

    /**
     * 检查值是否数组类型
     * @param {*} arr
     * @return {Boolean}
     */
    var isArray = function(arr) {
        return Array.isArray(arr);
    };

    /**
     * 是否为空数组
     * @param {Array} arr
     * @returns {boolean}
     */
    var isEmptyArray = function(arr) {
        return isArray(arr) && arr.length === 0;
    };

    /**
     * 是否为空对象
     * @param {Object} obj
     * @returns {boolean}
     */
    var isEmptyObject = function(obj) {
        return isObject(obj) && isEmptyArray(Object.keys(obj));
    };

    /**
     * 检查是否在数组中
     * @param {Array} arr
     * @param {*} val
     * @return {boolean}
     */
    var includes = function(arr, val) {
        for (var k in arr) {
            if (arr[k] === val) {
                return true;
            }
        }
        return false;
    };

    /**
     * 检查对象是否存在指定属性
     * @param {Object} obj
     * @param {String} key
     * @returns {boolean}
     */
    var hasOwnProperty = function(obj, key) {
        return isObject(obj) && obj.hasOwnProperty(key);
    };

    /**
     * 是否为对象结构
     * @param {Object} schema
     * @returns {boolean}
     */
    var isObjectSchema = function(schema) {
        return !!(isObject(schema) && isObject(schema.properties) && schema.type === 'object');
    };

    /**
     * 是否为数组结构
     * @param {Object} schema
     * @returns {boolean}
     */
    var isArraySchema = function(schema) {
        return !!(isObject(schema) && isObject(schema.items) && schema.type === 'array');
    };

    /**
     * 合并对象
     * @returns {*}
     */
    var merge = function() {
        var length = arguments.length;
        if (length === 0) {
            return {};
        }
        if (length === 1) {
            return arguments[0];
        }
        var target = arguments[0] || {};
        for (var i = 1; i < length; i++) {
            var source = arguments[i];
            if (isObject(source)){
                for (var key in source) {
                    target[key] = source[key];
                }
            }
        }

        return target;
    };

    /**
     * 兼容低版本IE
     */
    if (typeof Object.assign !== 'function') {
        Object.assign = merge;
    }

    /**
     * 解析json，转换成可描述对象
     * @param {Object} jsonTemplate         json模板
     * @param {Object} options              全局默认配置项
     * @param {Object} options.title        标题
     * @param {Object} options.description  描述
     * @param {Object} options.requiredSign 标记必须存在的属性标识
     * @param {Object} options.aliasSign    标记别名属性标识
     * @param {Object} options.allRequired  默认全部属性必须存在
     * @return {Object}
     */
    function Schema(jsonTemplate, options) {

        // 合并配置
        options = merge({}, Schema.config, options);

        /**
         * 解析json格式为json-schema
         * @param {Object} json
         * @param {Object} schema
         * @return {Object}
         */
        var parse = function(json, schema) {
            if (json === undefined) {
                return;
            }
            schema = schema || {};
            // 解析数组
            if (isArray(json)) {
                parseArray(json, schema);
            }
            // 解析对象
            else if (isObject(json)) {
                parseObject(json, schema);
            }
            else {
                schema.type = getType(json);
            }
            return schema;
        };

        /**
         * 处理结构
         * @param {Object} json
         * @param {Object} schema
         */
        var handleSchema = function(json, schema) {
            merge(schema, json);
            if (schema.type === 'object') {
                delete schema.properties;
                if (json.properties) {
                    parse(json.properties, schema);
                }
            }
            if (schema.type === 'array') {
                delete schema.items;
                schema.items = {};
                if (json.items) {
                    parse(json.items, schema.items);
                }
            }
        };

        /**
         * 处理数组
         * @param {Array} arr
         * @param {Object} schema
         */
        var parseArray = function(arr, schema) {
            schema.type = 'array';
            var props = schema.items = {};
            if (arr.length) {
                parse(arr[0], props);
            }
        };

        /**
         * 处理对象类型
         * @param {Object} json
         * @param {Object} schema
         */
        var parseObject = function(json, schema) {
            if (isSchema(json)) {
                return handleSchema(json, schema);
            }

            schema.type = 'object';
            schema.required = [];
            schema.properties = {};

            for (var key in json) {
                if (!json.hasOwnProperty(key)) {
                    continue;
                }

                var newKey = key,
                    value = json[newKey],
                    curSchema = schema.properties[newKey] = {},
                    aliasSign = options.aliasSign,
                    requiredSign = options.requiredSign,
                    allRequired = options.allRequired;

                /** 使用约定符号指定别名例如：*user_id@uid **/
                var alias = '';
                var aliasIndex = newKey.indexOf(aliasSign);
                if (aliasIndex !== -1) {
                    delete schema.properties[newKey];// 删除原属性结构信息
                    // 标识符号左边为原名右边为别名
                    alias = newKey.substr(aliasIndex + aliasSign.length);
                    newKey = newKey.substr(0, aliasIndex);
                    curSchema = schema.properties[newKey] = {};
                }

                /** 使用约定符号标记必须项例如：*user_id **/
                var existRequiredSign = newKey[0] === requiredSign;
                if (existRequiredSign) {
                    delete schema.properties[newKey];// 删除原属性结构信息
                    newKey = newKey.substr(1);// 去掉前面的标记符号
                    curSchema = schema.properties[newKey] = {};// 清空上级属性列表
                    schema.required.push(newKey);// 必须项放入上级schema.required中
                }
                // 如果配置了全部属性为必须项
                if (allRequired) {
                    // 避免重复添加
                    if (!existRequiredSign) {
                        schema.required.push(newKey);
                    }
                }

                // 如果存在别名，在当前schema.alias属性记录
                if (alias) {
                    curSchema.alias = alias;
                }

                // 记录当前节点对应的key
                curSchema.name = newKey;

                normAttribute(curSchema);

                parse(value, curSchema);
            }
        };

        /**
         * 标准化属性名
         * @param schema
         * @returns {*}
         */
        var normAttribute = function(schema) {
            for (var name in schema) {
                if (!schema.hasOwnProperty(name)) {
                    continue;
                }

                if (!includes(schema.attributes, name)) {
                    schema['@' + name] = schema[name];
                    delete schema[name];
                }
            }
            return schema;
        };

        var jsonSchema = Object.assign({
            'title': options.title,
            'description': options.description,
        }, Schema.baseSchema);

        return Object.assign(jsonSchema, parse(jsonTemplate));
    }

    // 标准结构
    Schema.baseSchema = {
        'id': 'http://json-schema.org/draft-04/schema#',
        '$schema': 'http://json-schema.org/draft-04/schema#',
        'title': '',
        'description': '',
    };

    /**
     * 设置schema结构属性值，如果属性名不属于标准schema，则添加@作为属性名前缀
     * @param {Object} schema
     * @param {String} name
     * @param {*} value
     * @returns {*}
     */
    Schema.setAttribute = function(schema, name, value) {
        if (includes(this.attributes, name)) {
            schema[name] = value;
        }
        else {
            schema['@' + name] = value;
        }

        return schema;
    };

    /**
     * 获取schema结构属性值，如果属性名不属于标准schema，则添加@作为属性名前缀
     * @param {Object} schema
     * @param {String} name
     * @returns {*}
     */
    Schema.getAttribute = function(schema, name) {
        if (includes(this.attributes, name)) {
            return schema[name];
        }

        return schema['@' + name];
    };

    /**
     * jsonSchema标准结构属性名
     * @type {string[]}
     */
    Schema.attributes = [
        // 参考来源 https://www.jianshu.com/p/1711f2f24dcf?utm_campaign=hugo
        '$schema',//The $schema 关键字状态，这种模式被写入草案V4规范。
        'title',// 将使用此架构提供一个标题，title一般用来进行简单的描述，可以省略
        'description',// 架构的一点描述，description一般是进行详细的描述信息，可以省略
        'type',//	用于约束校验的JSON元素的数据类型，是JSON数据类型关键字定义的第一个约束条件：它必须是一个JSON对象
        'properties',//	定义属性：定义各个键和它们的值类型，最小和最大值中要使用JSON文件
        'required',//	必需属性，这个关键字是数组，数组中的元素必须是字符串
        'minimum',//	这是约束的值，并代表可接受的最小值
        'exclusiveMinimum',//	如果“exclusiveMinimum”的存在，并且具有布尔值true的实例是有效的，如果它是严格的最低限度的值
        'maximum',//这是约束的值被提上表示可接受的最大值
        'exclusiveMaximum',//	如果“exclusiveMaximum”的存在，并且具有布尔值true的实例是有效的，如果它是严格的值小于“最大”。
        'multipleOf',//	数值实例有效反对“multipleOf”分工的实例此关键字的值，如果结果是一个整数。
        'maxLength',//	字符串实例的长度被定义为字符的最大数目
        'minLength',//	字符串实例的长度被定义为字符的最小数目
        'pattern',//	String实例被认为是有效的，如果正则表达式匹配成功实例

        'maxProperties',//	最大属性个数
        'minProperties',//	最小属性个数
        'additionalProperties',//	如果待校验JSON对象中存在，既没有在properties中被定义，又没有在patternProperties中被定义，那么这些一级key必须通过additionalProperties的校验。true or false or object 参考

        'items',//	array 每个元素的类型
        'minItems',//	约束属性，数组最小的元素个数
        'maxItem',//s	约束属性，数组最大的元素个数
        'uniqueItems',//	约束属性，每个元素都不相同
        'additionalProperties',//	约束items的类型，不建议使用 示例
        'Dependencies',//	属性依赖 用法
        'patternProperties',//

        'maxLength',//		定义字符串的最大长度，>=0
        'minLength',//		定义字符串的最小长度，>=0
        'pattern',//		用正则表达式约束字符串，只有待校验JSON元素符合该关键字指定的正则表达式，才算通过校验
        'format',//		字符串的格式

        'minimum',//		最小值
        'exclusiveMinimum',//		如果存在 "exclusiveMinimum" 并且具有布尔值 true，如果它严格意义上大于 "minimum" 的值则实例有效。
        'maximum',//		约束属性，最大值
        'exclusiveMaximum',//		如果存在 "exclusiveMinimum" 并且具有布尔值 true，如果它严格意义上小于 "maximum" 的值则实例有效。
        'multipleOf',//		是某数的倍数，必须大于0的整数

        '$ref',// 用来引用其他的schema
        'definitions',// 当一个schema写的很大的时候，可能需要创建内部结构体，再使用$ref进行引用
        'allOf', // 该关键字的值是一个非空数组，数组里面的每个元素都必须是一个有效的JSON Schema。 只有待校验JSON元素通过数组中所有的JSON Schema校验，才算真正通过校验。意思是展示全部属性，建议用requires替代，不建议使用
        'anyOf',// 该关键字的值是一个非空数组，数组里面的每个元素都必须是一个有效的JSON Schema。如果待校验JSON元素能够通过数组中的任何一个JSON Schema校验，就算通过校验。意思是展示任意属性，建议用requires替代和minProperties替代
        'oneOf', // 该关键字的值是一个非空数组，数组里面的每个元素都必须是一个有效的JSON Schema。如果待校验JSON元素能且只能通过数组中的某一个JSON Schema校验，才算真正通过校验。不能通过任何一个校验和能通过两个及以上的校验，都不算真正通过校验。
        'not',// 该关键字的值是一个JSON Schema。只有待校验JSON元素不能通过该关键字指定的JSON Schema校验的时候，待校验元素才算通过校验。
        'default',
    ];

    /**
     * 全局配置
     */
    Schema.config = {
        title: '',          // 结构标题
        description: '',    // 结构描述
        requiredSign: '*',  // 标记必须存在的属性标识
        aliasSign: '@',     // 标记别名属性标识
        allRequired: false, // 默认全部属性必须存在
    };

    /**
     * 把给定JSON数据，转换成描述对象一致的结构
     * @param {Object} input                        待过滤数据
     * @param {Object} jsonSchema                       描述对象
     * @param {Object} options                      可选配置项
     * @param {Object} options.redundancy           是否保留冗余属性，默认false
     * @param {Object} options.defaults             基本数据类型默认定义
     * @param {*} options.defaults.string           字符串类型默认值，默认''
     * @param {*} options.defaults.number           数字类型默认值，默认0
     * @param {*} options.defaults.boolean          布尔类型默认值，默认false
     * @param {*} options.defaults.null             null类型默认值，默认null
     * @param {Object} options.filters              数据过滤方法
     * @param {Function} options.filters.string     字符串类型转换方法，，默认内部处理
     * @param {Function} options.filters.number     数字类型转换方法，，默认内部处理
     * @param {Function} options.filters.boolean    布尔类型转换方法，，默认内部处理
     * @param {Function} options.filters.null       null类型转换方法，，默认内部处理
     * @param {Function} options.filters.array      数组类型转换方法，，默认内部处理
     * @param {Function} options.filters.object     对象类型转换方法，默认内部处理
     * @return {Array|Object}
     */
    function Convert(input, jsonSchema, options) {
        if (!jsonSchema) {
            return input;
        }
        if (!(this instanceof Convert)) {
            return new Convert(input, jsonSchema, options);
        }

        // 合并配置项
        this.options = merge({}, Convert.config, options);

        //  上下文执行环境，方便在过滤器中使用convert,Schema方法
        this.context = new Context;

        return this.parse(input, jsonSchema);
    }

    /**
     * 全局默认配置
     */
    Convert.config = Object.create(null);

    /**
     * 默认返回值
     * @type {{number: number, boolean: boolean, string: string, null: null}}
     */
    Convert.config.defaults = {
        string: '',
        number: 0,
        boolean: false,
        null: null,
    };

    /**
     * 默认过滤器
     */
    Convert.config.filters = {
        string: function(val) {
            return includes([undefined, null], val) ? '' : String(val);
        },
        number: function(val) {
            return includes([undefined, null, ''], val) ? 0 : Number(val);
        },
        boolean: function(val) {
            return Boolean(val);
        },
        null: function(val) {
            return val === null ? val : null;
        },
        array: function(val) {
            return isArray(val) ? val : [];
        },
        object: function(val) {
            return isObject(val) ? val : {};
        },
    };

    /**
     * 是否冗余字段
     * @type {boolean}
     */
    Convert.config.redundancy = false;

    /**
     * 解析入口
     * @param input
     * @param schema
     * @returns {Array|Object}
     */
    Convert.prototype.parse = function(input, schema) {

        if (isEmptyObject(schema)) {
            return input;
        }

        if (!isSchema(schema)) {
            schema = new Schema(schema);
        }

        // 处理对象类型
        if (isObjectSchema(schema)) {
            return this.parseObject(input, schema);
        }

        // 处理数组类型
        if (isArraySchema(schema)) {
            return this.parseArray(input, schema);
        }
    };

    /**
     * 根据描述对象获取用于取出输入数据的字段名
     * @param {Object} schema
     * @returns {String}
     */
    Convert.prototype.getInputKey = function(schema) {
        return Schema.getAttribute(schema, 'alias') || Schema.getAttribute(schema, 'name');
    };

    /**
     * 根据描述对象获取输入值
     * @param {Object|Array} input
     * @param {Object} schema
     * @return {*}
     */
    Convert.prototype.getValue = function(input, schema) {
        var key = this.getInputKey(schema);

        // 只有属性存在时才能获取属性值
        if (hasOwnProperty(input, key)) {
            // 处理过滤器
            this.handleFilter(input, schema);

            // 处理枚举值
            this.handleEnums(input, schema);

            return input[key];
        }

        // 未定义
        return this.getDefault(schema);
    };

    /**
     * 处理枚举值
     * @param input
     * @param schema
     */
    Convert.prototype.handleEnums = function(input, schema) {
        var enums = Schema.getAttribute(schema, 'enums');
        //  验证是否含义枚举值
        if (isEmptyArray()) {
            return;
        }
        var key = this.getInputKey(schema);

        for (var i in enums) {
            var item = enums[i];

            // 根据枚举值定义类型，转换正确枚举值
            var inputFilter = this.options.filters[item.input_type];
            var outputFilter = this.options.filters[item.output_type];
            if (isFunction(inputFilter)) {
                item.input_value = inputFilter(item.input_value);
            }
            if (isFunction(outputFilter)) {
                item.output_value = outputFilter(item.output_value);
            }

            if (input[key] === item.input_value) {
                input[key] = item.output_value;
                return;
            }
        }
    };

    /**
     * 处理过滤器
     * @param input
     * @param schema
     */
    Convert.prototype.handleFilter = function(input, schema) {
        var key = this.getInputKey(schema);
        var value = input[key];

        // 使用自定义过滤器返回数据
        var filter = Schema.getAttribute(schema, 'filter') || this.options.filters[schema.type];
        if (isFunction(filter)) {
            input[key] = filter.call(this.context, value, input, schema);
        }
    };

    /**
     * 根据描述结构获取默认值
     * @param {Object} schema
     * @returns {*}
     */
    Convert.prototype.getDefault = function(schema) {
        if (hasOwnProperty(schema, 'default')) {
            return schema.default;
        }

        //  基本数据类型默认值定义
        var defaults = this.options.defaults;
        if (defaults.hasOwnProperty(schema.type)) {
            return defaults[schema.type];
        }

        // 数组类型默认返回[]
        if (isArraySchema(schema)) {
            return [];
        }

        // 如果是对象，遍历对象的每一个属性，根据定义类型返回每一个默认属性值
        if (isObjectSchema(schema)) {

            if (isEmptyObject(schema.properties)) {
                return {};
            }

            // 递归遍历每个属性
            var res = {};
            this.forEach(schema.properties, function(prop, key) {
                res[key] = this.getDefault(prop);
            });
            return res;
        }
    };

    /**
     * 解析对象
     * @param {Object|Array} input
     * @param {Object} schema
     * @returns {Object|Array}
     */
    Convert.prototype.parseObject = function(input, schema) {
        input = isObject(input) ? input : {};

        if (!isObjectSchema(schema)) {
            return input;
        }

        // 如果描述对象中不包含任何属性直接返回输入数据
        if (isEmptyObject(schema.properties)) {
            return input;
        }

        // 待输出数据
        var output = {};

        // 遍历属性
        this.forEach(schema.properties, function(prop, key) {
            var inputKey = this.getInputKey(prop);

            // 如果输出字段存在输出字段中
            if (hasOwnProperty(input, inputKey)) {
                var value = this.getValue(input, prop);

                // 对象结构再次解析
                if (isObjectSchema(prop)) {
                    output[key] = this.parseObject(value, prop);
                }
                else if (isArraySchema(prop)) {
                    output[key] = this.parseArray(value, prop);
                }
                else {
                    // 基本类型直接赋值
                    output[key] = value;
                }
            }
            // 如果字段必须存在的，取默认值
            else if (includes(schema.required, key)) {
                output[key] = this.getDefault(prop);
            }
        });

        // 处理冗余数据
        if (this.options.redundancy) {
            var redundancy = JSON.parse(JSON.stringify(input));
            // 遍历属性
            this.forEach(schema.properties, function(prop) {
                var inputKey = this.getInputKey(prop);
                // 如果输出字段存在输出字段中
                if (hasOwnProperty(input, inputKey)) {
                    // 删除匹配到的字段，剩余的都是冗余字段
                    delete redundancy[inputKey];
                }
            });
            merge(output, redundancy);
        }

        return output;
    };

    /**
     * 解析数组
     * @param {Array} input
     * @param {Object} schema
     * @returns {Array}
     */
    Convert.prototype.parseArray = function(input, schema) {
        input = isArray(input) ? input : [];

        if (!isArraySchema(schema)) {
            return input;
        }

        var output = [];

        // 如果输入数据是空数组，没有必要继续遍历，直接返回空数组
        if (isEmptyArray(input)) {
            return output;
        }

        // 如果是数组对象
        if (isObjectSchema(schema.items)) {
            return input.map.call(this, function(item) {
                return this.parseObject(item, schema.items);
            });
        }

        return input;
    };

    Convert.prototype.forEach = function(obj, callback) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                callback.call(this, obj[key], key, obj);
            }
        }
    };

    /**
     * 把给定JSON数据，转换成描述对象一致的结构
     * @param {Object} input                        待过滤数据
     * @param {Object} schema                       描述对象
     * @param {Object} options                      可选配置项
     * @param {Object} options.redundancy           是否保留冗余属性，默认false
     * @param {Object} options.defaults             基本数据类型默认定义
     * @param {*} options.defaults.string           字符串类型默认值，默认''
     * @param {*} options.defaults.number           数字类型默认值，默认0
     * @param {*} options.defaults.boolean          布尔类型默认值，默认false
     * @param {*} options.defaults.null             null类型默认值，默认null
     * @param {Object} options.filters              数据过滤方法
     * @param {Function} options.filters.string     字符串类型转换方法，，默认内部处理
     * @param {Function} options.filters.number     数字类型转换方法，，默认内部处理
     * @param {Function} options.filters.boolean    布尔类型转换方法，，默认内部处理
     * @param {Function} options.filters.null       null类型转换方法，，默认内部处理
     * @param {Function} options.filters.array      数组类型转换方法，，默认内部处理
     * @param {Function} options.filters.object     对象类型转换方法，默认内部处理
     * @return {Array|Object}
     */
    function Context(input, schema, options) {
        return Convert(input, schema, options);
    }

    /**
     * 静态调用
     * @type {string}
     */
    Context.version = '1.1.0';// 版本号
    Context.schema = Schema;
    Context.convert = Convert;

    /**
     * 扩展原型链
     * @type {string}
     */
    Context.prototype.version = Context.version;
    Context.prototype.schema = Context.schema;
    Context.prototype.convert = Context.convert;

    return Context;

})));

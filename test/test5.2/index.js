var input = require('./input');
var output = require('./output');
var template = require('./template');
var schema = require('./schema');
var convert = require('../../index');
var jsonSchema = convert.schema;
var filterJson = convert.convert;
var util = require('../utils');

describe('5.2使用过滤器，转换特定的字段', () => {

    it('输出的模板描述对象是否正确', () => {
       /* util.deepEqualSchema(jsonSchema(template, {
            aliasSign: '|',
        }), schema, __dirname);*/
    });

    it('输出的过滤数据是否正确', () => {
        util.deepEqualOutput(convert(input, template), output, __dirname);
    });

});

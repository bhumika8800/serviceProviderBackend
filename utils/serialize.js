const toCamel = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const mapKey = (key) => {
  if (key === '_id') return 'id';
  if (key === 'img_url') return 'avatar';
  return toCamel(key);
};

const convertValue = (value) => {
  if (value == null) return value;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value._bsontype === 'ObjectId') return value.toString();
  if (typeof value === 'object' && value._bsontype === 'Decimal128') return parseFloat(value.toString());
  if (Array.isArray(value)) return value.map(convertValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[mapKey(key)] = convertValue(val);
    }
    return out;
  }
  return value;
};

const serialize = (doc) => {
  if (doc == null) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : doc;
  return convertValue(obj);
};

const serializeList = (docs) => (docs || []).map(serialize);

module.exports = { serialize, serializeList };

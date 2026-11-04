const mongoose = require('mongoose');
const { serialize, serializeList } = require('../utils/serialize');

describe('serialize utility', () => {
  describe('serialize', () => {
    it('should return null for null input', () => {
      expect(serialize(null)).toBeNull();
      expect(serialize(undefined)).toBeNull();
    });

    it('should convert _id to id', () => {
      const doc = { _id: new mongoose.Types.ObjectId(), name: 'Test' };
      const result = serialize(doc);
      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('_id');
      expect(result.id).toBe(doc._id.toString());
    });

    it('should convert img_url to avatar', () => {
      const doc = { img_url: 'https://example.com/photo.jpg' };
      const result = serialize(doc);
      expect(result.avatar).toBe('https://example.com/photo.jpg');
      expect(result).not.toHaveProperty('img_url');
    });

    it('should convert snake_case keys to camelCase', () => {
      const doc = {
        first_name: 'John',
        last_name: 'Doe',
        is_active: true,
        profile_complete: false,
        created_at: new Date(),
      };
      const result = serialize(doc);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.isActive).toBe(true);
      expect(result.profileComplete).toBe(false);
      expect(result).not.toHaveProperty('first_name');
    });

    it('should convert Decimal128 to number', () => {
      const doc = {
        price: mongoose.Types.Decimal128.fromString('999.99'),
      };
      const result = serialize(doc);
      expect(typeof result.price).toBe('number');
      expect(result.price).toBeCloseTo(999.99);
    });

    it('should convert ObjectId to string', () => {
      const id = new mongoose.Types.ObjectId();
      const doc = { service_id: id };
      const result = serialize(doc);
      expect(typeof result.serviceId).toBe('string');
      expect(result.serviceId).toBe(id.toString());
    });

    it('should handle nested objects', () => {
      const doc = {
        service_snapshot: {
          service_id: new mongoose.Types.ObjectId(),
          name: 'Test Service',
          price: mongoose.Types.Decimal128.fromString('500'),
        },
      };
      const result = serialize(doc);
      expect(result.serviceSnapshot).toHaveProperty('serviceId');
      expect(result.serviceSnapshot.name).toBe('Test Service');
      expect(typeof result.serviceSnapshot.price).toBe('number');
    });

    it('should handle arrays', () => {
      const doc = {
        items: [
          { _id: new mongoose.Types.ObjectId(), name: 'Item 1' },
          { _id: new mongoose.Types.ObjectId(), name: 'Item 2' },
        ],
      };
      const result = serialize(doc);
      expect(result.items.length).toBe(2);
      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0].name).toBe('Item 1');
    });

    it('should preserve Date objects', () => {
      const now = new Date();
      const doc = { created_at: now };
      const result = serialize(doc);
      expect(result.createdAt).toBe(now);
    });

    it('should handle Mongoose documents with toObject', () => {
      const schema = new mongoose.Schema({ name: String });
      const Model = mongoose.model('SerializeTest', schema);
      const doc = new Model({ name: 'Test' });

      const result = serialize(doc);
      expect(result.name).toBe('Test');
      expect(result).not.toHaveProperty('_id');
    });

    it('should handle empty object', () => {
      expect(serialize({})).toEqual({});
    });
  });

  describe('serializeList', () => {
    it('should return empty array for null/undefined', () => {
      expect(serializeList(null)).toEqual([]);
      expect(serializeList(undefined)).toEqual([]);
    });

    it('should serialize array of documents', () => {
      const docs = [
        { _id: new mongoose.Types.ObjectId(), first_name: 'John' },
        { _id: new mongoose.Types.ObjectId(), first_name: 'Jane' },
      ];
      const result = serializeList(docs);
      expect(result.length).toBe(2);
      expect(result[0].firstName).toBe('John');
      expect(result[1].firstName).toBe('Jane');
    });

    it('should handle empty array', () => {
      expect(serializeList([])).toEqual([]);
    });
  });
});

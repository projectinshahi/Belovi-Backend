// Run: npx ts-node src/controllers/productController.test.ts
import assert from 'assert';
import { mergeImageOrder } from './productController';

const NEW = '__new__';

// A new upload promoted to primary keeps position 0.
assert.deepStrictEqual(
  mergeImageOrder([NEW, 'a.jpg', 'b.jpg'], ['fresh.jpg']),
  ['fresh.jpg', 'a.jpg', 'b.jpg']
);

// Several uploads claim tokens in the order they were sent.
assert.deepStrictEqual(
  mergeImageOrder(['a.jpg', NEW, NEW], ['one.jpg', 'two.jpg']),
  ['a.jpg', 'one.jpg', 'two.jpg']
);

// No tokens: uploads append, matching the pre-token clients.
assert.deepStrictEqual(
  mergeImageOrder(['a.jpg'], ['one.jpg']),
  ['a.jpg', 'one.jpg']
);

// More uploads than tokens: the surplus still lands, never silently dropped.
assert.deepStrictEqual(
  mergeImageOrder([NEW], ['one.jpg', 'two.jpg']),
  ['one.jpg', 'two.jpg']
);

// A token with no upload behind it (a failed pick) leaves no empty slot.
assert.deepStrictEqual(mergeImageOrder(['a.jpg', NEW], []), ['a.jpg']);

// Every image removed in the form means every image removed on the product.
assert.deepStrictEqual(mergeImageOrder([], []), []);

console.log('mergeImageOrder: all assertions passed');

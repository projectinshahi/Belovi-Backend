"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Run: npx ts-node src/controllers/productController.test.ts
const assert_1 = __importDefault(require("assert"));
const productController_1 = require("./productController");
const NEW = '__new__';
// A new upload promoted to primary keeps position 0.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)([NEW, 'a.jpg', 'b.jpg'], ['fresh.jpg']), ['fresh.jpg', 'a.jpg', 'b.jpg']);
// Several uploads claim tokens in the order they were sent.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)(['a.jpg', NEW, NEW], ['one.jpg', 'two.jpg']), ['a.jpg', 'one.jpg', 'two.jpg']);
// No tokens: uploads append, matching the pre-token clients.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)(['a.jpg'], ['one.jpg']), ['a.jpg', 'one.jpg']);
// More uploads than tokens: the surplus still lands, never silently dropped.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)([NEW], ['one.jpg', 'two.jpg']), ['one.jpg', 'two.jpg']);
// A token with no upload behind it (a failed pick) leaves no empty slot.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)(['a.jpg', NEW], []), ['a.jpg']);
// Every image removed in the form means every image removed on the product.
assert_1.default.deepStrictEqual((0, productController_1.mergeImageOrder)([], []), []);
console.log('mergeImageOrder: all assertions passed');
//# sourceMappingURL=productController.test.js.map
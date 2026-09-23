import mongoose from 'mongoose';
import { Product } from './src/models/Product';
import { ENV } from './src/config/env';

const COLLECTION = 'Foundations';
const SEASON = 'Core 2026';

const PIECES = [
  {
    name: 'The Eros Chaise',
    garmentType: 'Luxury Furniture',
    price: 185000,
    lifeMode: 'Intimacy',
    description: 'A masterclass in ergonomic support and elegant design. The Eros Chaise is sculpted to support natural body contours during intimate moments, crafted from premium vegan leather and high-density foam that will not lose its shape.',
  },
  {
    name: 'The Kama Wedge',
    garmentType: 'Positioning',
    price: 24000,
    lifeMode: 'Connection',
    description: 'Precision engineering meets uncompromising comfort. The Kama Wedge provides the exact lift and support required for deeper connection, wrapped in a velvet-soft, easily washable cover.',
  },
  {
    name: 'The Zen Meditation Cushion set',
    garmentType: 'Wellness',
    price: 16800,
    lifeMode: 'Mindfulness',
    description: 'Designed for two. This premium meditation cushion set is filled with organic buckwheat hulls that conform to your shape, encouraging shared mindfulness and grounded connection.',
  },
  {
    name: 'Silk Sensory Bind',
    garmentType: 'Accessories',
    price: 4500,
    lifeMode: 'Exploration',
    description: 'Pure, heavy-weight mulberry silk crafted for sensory exploration. Soft against the skin, unyielding in its strength. The details that deepen the experience.',
  },
];

const run = async () => {
  try {
    const MONGO_URI = ENV.MONGODB_URI;
    if (!MONGO_URI) throw new Error('MongoDB URI is not defined');

    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database');

    for (const piece of PIECES) {
      const doc = {
        name: piece.name,
        category: piece.garmentType,
        garmentType: piece.garmentType,
        description: piece.description,
        collectionName: COLLECTION,
        season: SEASON,
        lifeMode: piece.lifeMode,
        offerText: 'Core Collection',
        showOnLandingPage: true,
        status: 'In Stock',
        images: [] as string[],
        variants: [
          {
            volume: 'Standard',
            price: piece.price,
            images: [] as string[],
          },
        ],
      };

      const existing = await Product.findOne({ name: piece.name });
      if (existing) {
        existing.set({
          category: doc.category,
          garmentType: doc.garmentType,
          collectionName: doc.collectionName,
          season: doc.season,
          lifeMode: doc.lifeMode,
          description: doc.description,
          showOnLandingPage: true,
        });
        if (!existing.variants?.length) existing.set('variants', doc.variants);
        await existing.save();
        console.log(`Updated: ${piece.name}`);
      } else {
        await Product.create(doc);
        console.log(`Created: ${piece.name} — ₹${piece.price.toLocaleString('en-IN')}`);
      }
    }

    console.log('BELOVI products seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
////////
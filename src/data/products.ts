export type Collection = 'Table' | 'Tea & coffee' | 'Serve' | 'Homeware';

export type ProductOption = {
  name: string;
  values: string[];
};

export type Product = {
  slug: string;
  name: string;
  price: number;
  collection: Collection;
  colour: string;
  swatch: string;
  tagline: string;
  description: string;
  details: string[];
  options: ProductOption[];
  image: string;
  detailImage: string;
  badge?: string;
  featured?: boolean;
};

export const collections: Collection[] = ['Table', 'Tea & coffee', 'Serve', 'Homeware'];

export const CARE =
  'Dishwasher safe on a gentle cycle. For the longest life, wash by hand and avoid sudden changes in temperature.';

export const SHIPPING =
  'Ships within 2–3 working days from the studio. Free shipping on orders over $120. Unused pieces can be returned within 30 days.';

export const products: Product[] = [
  {
    slug: 'round-bellied-teapot',
    name: 'Round-Bellied Teapot',
    price: 78,
    collection: 'Tea & coffee',
    colour: 'Olive',
    swatch: '#5D6244',
    tagline: 'Olive stoneware · 650 ml',
    description:
      'A generous round body, a handle that sits well in the hand, and a spout that pours without dribbling. Thrown in olive stoneware and finished in a soft matte glaze that deepens with use.',
    details: [
      'Hand-thrown stoneware',
      'Food-safe matte glaze',
      'Fitted lift-off lid',
      'Holds 650 ml or 1 litre',
    ],
    options: [{ name: 'Capacity', values: ['650 ml', '1 litre'] }],
    image: '/products/round-bellied-teapot.webp',
    detailImage: '/products/round-bellied-teapot-detail.webp',
    badge: 'Bestseller',
    featured: true,
  },
  {
    slug: 'rounded-stoneware-mug',
    name: 'Rounded Stoneware Mug',
    price: 28,
    collection: 'Tea & coffee',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 280 ml',
    description:
      'A mug with a little belly and a handle made for two fingers. The rim is rolled thin enough to drink from comfortably, and the base is weighted so it sits still on the table.',
    details: [
      'Hand-thrown stoneware',
      'Rolled drinking rim',
      'Glazed inside and out',
      'Holds 280 ml or 380 ml',
    ],
    options: [{ name: 'Capacity', values: ['280 ml', '380 ml'] }],
    image: '/products/rounded-stoneware-mug.webp',
    detailImage: '/products/rounded-stoneware-mug-detail.webp',
    badge: 'Bestseller',
    featured: true,
  },
  {
    slug: 'teacup-and-saucer-set',
    name: 'Teacup and Saucer',
    price: 36,
    collection: 'Tea & coffee',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 180 ml',
    description:
      'A thin rim and a wide saucer, for tea taken slowly. The saucer has a shallow recess that steadies the cup, and the handle leaves room for a whole finger, not just a fingertip.',
    details: [
      'Cup and saucer, sold as a pair',
      'Recessed saucer centre',
      'Comfortable loop handle',
      'Holds 180 ml or 240 ml',
    ],
    options: [{ name: 'Cup capacity', values: ['180 ml', '240 ml'] }],
    image: '/products/teacup-and-saucer-set.webp',
    detailImage: '/products/teacup-and-saucer-set-detail.webp',
  },
  {
    slug: 'small-pouring-creamer',
    name: 'Small Pouring Creamer',
    price: 26,
    collection: 'Tea & coffee',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 200 ml',
    description:
      'Small enough to bring to the table, shaped for a clean pour. The pinched lip stops drips, and the low base keeps it steady while you talk with your hands.',
    details: ['Hand-thrown stoneware', 'Pinched pouring lip', 'Holds 200 ml', 'Glazed inside and out'],
    options: [],
    image: '/products/small-pouring-creamer.webp',
    detailImage: '/products/small-pouring-creamer-detail.webp',
  },
  {
    slug: 'fitted-lid-sugar-pot',
    name: 'Fitted-Lid Sugar Pot',
    price: 32,
    collection: 'Tea & coffee',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 250 ml',
    description:
      'A fitted lid, a notch for the spoon, a place for everything. The pot is broad at the base and narrow at the neck so a spoon can reach the corners without the whole thing tipping.',
    details: ['Hand-thrown stoneware', 'Lid stays put while serving', 'Spoon notch', 'Holds 250 ml'],
    options: [],
    image: '/products/fitted-lid-sugar-pot.webp',
    detailImage: '/products/fitted-lid-sugar-pot-detail.webp',
  },
  {
    slug: 'soft-rim-dinner-plate',
    name: 'Soft-Rim Dinner Plate',
    price: 30,
    collection: 'Table',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 26 cm',
    description:
      'A low, generous rim that keeps the food where it belongs. The surface is wide enough for a proper dinner and quiet enough to let the food do the talking.',
    details: ['Hand-thrown stoneware', 'Low raised rim', 'Sold singly or as a set of four', '26 cm or 28 cm across'],
    options: [{ name: 'Diameter', values: ['26 cm', '28 cm'] }],
    image: '/products/soft-rim-dinner-plate.webp',
    detailImage: '/products/soft-rim-dinner-plate-detail.webp',
    featured: true,
  },
  {
    slug: 'small-side-plate',
    name: 'Small Side Plate',
    price: 22,
    collection: 'Table',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 18 cm',
    description:
      'For toast, fruit, and the last piece of cake. Its rim echoes the dinner plate, so a mixed table still looks like it belongs together.',
    details: ['Hand-thrown stoneware', 'Low raised rim', '18 cm or 21 cm across', 'Sold singly or as a set of four'],
    options: [{ name: 'Diameter', values: ['18 cm', '21 cm'] }],
    image: '/products/small-side-plate.webp',
    detailImage: '/products/small-side-plate-detail.webp',
  },
  {
    slug: 'wide-pasta-bowl',
    name: 'Wide Pasta Bowl',
    price: 32,
    collection: 'Table',
    colour: 'Olive',
    swatch: '#5D6244',
    tagline: 'Olive stoneware · 22 cm',
    description:
      'Wide and shallow, with room to toss and a foot to hold it. Deep enough for a generous serving of pasta, flat enough to eat from without chasing the sauce.',
    details: ['Hand-thrown stoneware', 'Broad centre, sloping sides', '22 cm or 25 cm across', 'Sold singly or as a pair'],
    options: [{ name: 'Diameter', values: ['22 cm', '25 cm'] }],
    image: '/products/wide-pasta-bowl.webp',
    detailImage: '/products/wide-pasta-bowl-detail.webp',
    featured: true,
  },
  {
    slug: 'everyday-cereal-bowl',
    name: 'Everyday Cereal Bowl',
    price: 26,
    collection: 'Table',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 500 ml',
    description:
      'The bowl you reach for without thinking. A rolled rim, a steady foot, and enough depth for cereal, soup or a late-night serving of ice cream.',
    details: ['Hand-thrown stoneware', 'Rolled rim', 'Holds 500 ml or 700 ml', 'Stacks neatly'],
    options: [{ name: 'Capacity', values: ['500 ml', '700 ml'] }],
    image: '/products/everyday-cereal-bowl.webp',
    detailImage: '/products/everyday-cereal-bowl-detail.webp',
  },
  {
    slug: 'deep-serving-bowl',
    name: 'Deep Serving Bowl',
    price: 58,
    collection: 'Serve',
    colour: 'Rust',
    swatch: '#8B4E31',
    tagline: 'Rust stoneware · 1.5 L',
    description:
      'Deep enough for a salad for six, handsome enough to leave out. The rust glaze breaks lighter over the throwing lines, so no two bowls catch the light the same way.',
    details: ['Hand-thrown stoneware', 'Rust reactive glaze', 'Holds 1.5 or 2.5 litres', 'Broad carrying rim'],
    options: [{ name: 'Capacity', values: ['1.5 L', '2.5 L'] }],
    image: '/products/deep-serving-bowl.webp',
    detailImage: '/products/deep-serving-bowl-detail.webp',
    featured: true,
  },
  {
    slug: 'oval-serving-platter',
    name: 'Oval Serving Platter',
    price: 64,
    collection: 'Serve',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 32 cm',
    description:
      'An oval for shared things: bread, tomatoes, a whole fish. The raised edge contains smaller pieces, and the broad underside sits level on the table.',
    details: ['Hand-thrown stoneware', 'Low raised edge', '32 cm or 40 cm long', 'Sits level without a cloth'],
    options: [{ name: 'Length', values: ['32 cm', '40 cm'] }],
    image: '/products/oval-serving-platter.webp',
    detailImage: '/products/oval-serving-platter-detail.webp',
  },
  {
    slug: 'arched-handle-pitcher',
    name: 'Arched-Handle Pitcher',
    price: 62,
    collection: 'Serve',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 750 ml',
    description:
      'A confident handle and a lip that pours cleanly. Made for water, but just as good holding a few stems from the garden.',
    details: ['Hand-thrown stoneware', 'Defined pouring lip', 'Holds 750 ml or 1.25 litres', 'Wide, stable base'],
    options: [{ name: 'Capacity', values: ['750 ml', '1.25 litres'] }],
    image: '/products/arched-handle-pitcher.webp',
    detailImage: '/products/arched-handle-pitcher-detail.webp',
  },
  {
    slug: 'narrow-neck-vase',
    name: 'Narrow-Neck Vase',
    price: 44,
    collection: 'Homeware',
    colour: 'Honey',
    swatch: '#B98A47',
    tagline: 'Honey stoneware · 16 cm',
    description:
      'A narrow neck for a few stems, a rounded body that holds the light. The honey glaze pools darker at the base and thins to a warm amber at the shoulder.',
    details: ['Hand-thrown stoneware', 'Honey gloss glaze', '16 cm or 24 cm tall', 'Watertight interior'],
    options: [{ name: 'Height', values: ['16 cm', '24 cm'] }],
    image: '/products/narrow-neck-vase.webp',
    detailImage: '/products/narrow-neck-vase-detail.webp',
    badge: 'New',
    featured: true,
  },
  {
    slug: 'planter-with-saucer',
    name: 'Planter with Saucer',
    price: 32,
    collection: 'Homeware',
    colour: 'Olive',
    swatch: '#5D6244',
    tagline: 'Olive stoneware · 14 cm',
    description:
      'A quiet home for something green, with a saucer to catch the water. The taper is gentle, so roots have room and the pot stays easy to lift.',
    details: ['Hand-thrown stoneware', 'Drainage hole', 'Matching saucer included', '10, 14 or 18 cm opening'],
    options: [{ name: 'Opening', values: ['10 cm', '14 cm', '18 cm'] }],
    image: '/products/planter-with-saucer.webp',
    detailImage: '/products/planter-with-saucer-detail.webp',
  },
  {
    slug: 'low-taper-candleholder',
    name: 'Low Taper Candleholder',
    price: 24,
    collection: 'Homeware',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 9 cm',
    description:
      'Low, steady, and a little uneven in the best way. A shallow dish around the socket catches wax, and the wide foot keeps the whole thing grounded.',
    details: ['Hand-thrown stoneware', 'Fits 22 mm taper candles', 'Shallow wax dish', '9 cm tall, 10 cm base'],
    options: [],
    image: '/products/low-taper-candleholder.webp',
    detailImage: '/products/low-taper-candleholder-detail.webp',
  },
  {
    slug: 'fitted-lid-storage-jar',
    name: 'Fitted-Lid Storage Jar',
    price: 46,
    collection: 'Homeware',
    colour: 'Ivory',
    swatch: '#E4D9C4',
    tagline: 'Ivory stoneware · 1 L',
    description:
      'For flour, oats, tea. The lid sits down with a soft thunk, and the straight sides mean the jar can live on an open shelf without asking for attention.',
    details: ['Hand-thrown stoneware', 'Easy-grip fitted lid', '600 ml, 1 L or 1.5 L', 'Wide opening for a scoop'],
    options: [{ name: 'Capacity', values: ['600 ml', '1 L', '1.5 L'] }],
    image: '/products/fitted-lid-storage-jar.webp',
    detailImage: '/products/fitted-lid-storage-jar-detail.webp',
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

export const defaultOptions = (product: Product): Record<string, string> =>
  Object.fromEntries(product.options.map((o) => [o.name, o.values[0]]));

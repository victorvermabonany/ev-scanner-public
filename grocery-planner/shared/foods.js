// What the app knows about food.
//
// One record per ingredient, and everything downstream reads from it:
// normalisation (what "1 medium yellow onion" is), consolidation (how half an
// onion and one onion add up), allergens (a hard constraint, so it lives in
// data rather than in a prompt), diet flags, grocery-list department, and the
// package sizes the pricing engine has to buy in.
//
// Prices here are a snapshot, not a live feed. catalog.js is the seam where a
// real retailer pricing API replaces them; nothing outside that file reads
// these numbers directly, and the UI labels any plan priced from the snapshot
// as an estimate. See PRICING.md for why that line matters.
//
// Pack format is a tuple to keep the table scannable:
//
//     [size, unit, price, label]
//
// The first pack is the everyday store-brand option. Later packs are the
// alternatives the budget optimiser gets to reach for — a bigger bag with a
// better unit price, or a name brand it can trade back down from.

export const CATEGORIES = [
  'Produce',
  'Meat and seafood',
  'Dairy and eggs',
  'Bakery',
  'Pantry',
  'Canned goods',
  'Frozen',
  'Spices and seasonings',
  'Other',
];

// The allergens the questionnaire offers. Kept to the US "big nine" plus
// sesame, because that's what product labelling actually covers.
export const ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soy',
  'sesame',
];

const PRODUCE = 'Produce';
const MEAT = 'Meat and seafood';
const DAIRY = 'Dairy and eggs';
const BAKERY = 'Bakery';
const PANTRY = 'Pantry';
const CANNED = 'Canned goods';
const FROZEN = 'Frozen';
const SPICE = 'Spices and seasonings';

// Raw table. Fields beyond key/name/category/packs are all optional:
//
//   alias       other names a recipe might use for the same thing
//   each        grams in one of them — the bridge between "2 onions" and "500 g"
//   ml          millilitres in one of them, for things counted but measured by volume
//   allergens   hard-constraint tags; absence means "none known"
//   veg/vegan   overrides for the category default
//   swap        a cheaper stand-in the budget optimiser may propose
//   staple      offered as a suggested pantry item in the questionnaire
//   protein     marks a main protein, used for variety checks
const TABLE = [
  // ------------------------------------------------------------- produce
  // Loose first, so the food's canonical measure is "onions" rather than
  // grams — "about 2 needed" is what belongs on a shopping list. The bag is
  // still offered, and converts to a count through `each`.
  { key: 'yellow_onion', name: 'Yellow onions', category: PRODUCE, each: 150,
    alias: ['onion', 'onions', 'medium onion', 'yellow onion', 'diced onion', 'white onion'],
    packs: [[1, 'each', 0.99, 'Loose, each'], [3, 'lb', 3.49, 'Store brand bag']] },
  { key: 'red_onion', name: 'Red onions', category: PRODUCE, each: 150,
    alias: ['red onion'], packs: [[1, 'each', 1.29, 'Loose, each']] },
  { key: 'green_onion', name: 'Green onions', category: PRODUCE, each: 15,
    alias: ['scallion', 'scallions', 'spring onion'], packs: [[1, 'bunch', 1.19, 'Bunch']] },
  { key: 'garlic', name: 'Garlic', category: PRODUCE, each: 5,
    alias: ['garlic clove', 'cloves garlic', 'garlic cloves', 'minced garlic'],
    packs: [[3, 'each', 1.29, 'Head, 3-pack'], [1, 'each', 0.69, 'Single head']], staple: true },
  { key: 'ginger', name: 'Fresh ginger', category: PRODUCE, each: 30,
    alias: ['ginger root', 'fresh ginger'], packs: [[4, 'oz', 1.49, 'Loose']] },
  { key: 'bell_pepper', name: 'Bell peppers', category: PRODUCE, each: 165,
    alias: ['red bell pepper', 'green bell pepper', 'yellow bell pepper', 'peppers', 'bell peppers'],
    packs: [[3, 'each', 3.99, 'Tri-colour 3-pack'], [1, 'each', 1.69, 'Loose, each']] },
  { key: 'jalapeno', name: 'Jalapeños', category: PRODUCE, each: 20,
    alias: ['jalapeno pepper', 'chili pepper'], packs: [[4, 'oz', 0.89, 'Loose']] },
  { key: 'roma_tomato', name: 'Roma tomatoes', category: PRODUCE, each: 100,
    alias: ['tomato', 'tomatoes', 'plum tomato', 'fresh tomato'],
    packs: [[1, 'lb', 2.29, 'Loose']] },
  { key: 'cherry_tomato', name: 'Cherry tomatoes', category: PRODUCE,
    alias: ['grape tomatoes', 'cherry tomato'], packs: [[10, 'oz', 3.29, 'Pint container']] },
  { key: 'romaine', name: 'Romaine lettuce', category: PRODUCE, each: 300,
    alias: ['lettuce', 'romaine hearts'], packs: [[1, 'each', 2.49, 'Head']] },
  { key: 'baby_spinach', name: 'Baby spinach', category: PRODUCE,
    alias: ['spinach', 'fresh spinach'], packs: [[5, 'oz', 2.99, 'Clamshell'], [10, 'oz', 4.79, 'Family size']] },
  { key: 'kale', name: 'Kale', category: PRODUCE, packs: [[1, 'bunch', 2.49, 'Bunch']] },
  { key: 'broccoli', name: 'Broccoli', category: PRODUCE, each: 350,
    alias: ['broccoli florets', 'broccoli crown'], packs: [[1, 'lb', 2.49, 'Crowns']] },
  { key: 'carrot', name: 'Carrots', category: PRODUCE, each: 60,
    alias: ['carrots', 'baby carrots', 'shredded carrot'],
    packs: [[2, 'lb', 2.29, 'Bag'], [1, 'lb', 1.49, 'Loose']] },
  { key: 'celery', name: 'Celery', category: PRODUCE, each: 40,
    alias: ['celery stalk', 'celery stalks'], packs: [[1, 'each', 2.29, 'Bunch']] },
  { key: 'zucchini', name: 'Zucchini', category: PRODUCE, each: 200,
    alias: ['courgette', 'summer squash'], packs: [[1, 'lb', 1.99, 'Loose']] },
  { key: 'cucumber', name: 'Cucumber', category: PRODUCE, each: 300,
    packs: [[1, 'each', 0.99, 'Loose']] },
  { key: 'mushroom', name: 'White mushrooms', category: PRODUCE,
    alias: ['mushrooms', 'button mushrooms', 'cremini'], packs: [[8, 'oz', 2.49, 'Package']] },
  { key: 'sweet_potato', name: 'Sweet potatoes', category: PRODUCE, each: 200,
    packs: [[1, 'lb', 1.49, 'Loose']] },
  { key: 'russet_potato', name: 'Russet potatoes', category: PRODUCE, each: 200,
    alias: ['potato', 'potatoes', 'baking potato'], packs: [[5, 'lb', 4.29, 'Bag'], [1, 'lb', 1.29, 'Loose']] },
  { key: 'green_beans', name: 'Green beans', category: PRODUCE,
    alias: ['string beans'], packs: [[1, 'lb', 2.99, 'Loose']] },
  { key: 'cabbage', name: 'Green cabbage', category: PRODUCE, each: 900,
    alias: ['cabbage', 'shredded cabbage', 'coleslaw mix'], packs: [[1, 'each', 2.79, 'Head']] },
  { key: 'avocado', name: 'Avocados', category: PRODUCE, each: 170,
    packs: [[1, 'each', 1.29, 'Loose']] },
  { key: 'lime', name: 'Limes', category: PRODUCE, each: 65, ml: 30,
    alias: ['lime juice', 'fresh lime juice'], packs: [[1, 'each', 0.49, 'Loose']] },
  { key: 'lemon', name: 'Lemons', category: PRODUCE, each: 90, ml: 45,
    alias: ['lemon juice', 'fresh lemon juice'], packs: [[1, 'each', 0.79, 'Loose']] },
  { key: 'cilantro', name: 'Cilantro', category: PRODUCE, each: 60,
    alias: ['fresh cilantro', 'coriander leaves'], packs: [[1, 'bunch', 0.99, 'Bunch']] },
  { key: 'parsley', name: 'Flat-leaf parsley', category: PRODUCE, each: 60,
    alias: ['fresh parsley', 'parsley'], packs: [[1, 'bunch', 1.19, 'Bunch']] },
  { key: 'basil', name: 'Fresh basil', category: PRODUCE, each: 25,
    packs: [[0.75, 'oz', 2.99, 'Clamshell']] },
  { key: 'tofu', name: 'Extra-firm tofu', category: PRODUCE, each: 396, allergens: ['soy'],
    alias: ['tofu', 'firm tofu'], protein: true, packs: [[14, 'oz', 2.49, 'Block']] },

  // ------------------------------------------------------ meat & seafood
  { key: 'chicken_breast', name: 'Boneless chicken breast', category: MEAT, protein: true,
    alias: ['chicken', 'boneless skinless chicken breast', 'chicken breasts', 'chicken cutlets'],
    swap: 'chicken_thigh',
    packs: [[1.5, 'lb', 7.49, 'Store brand tray'], [3, 'lb', 13.49, 'Value pack'],
            [1.5, 'lb', 10.99, 'Air-chilled, name brand']] },
  { key: 'chicken_thigh', name: 'Boneless chicken thighs', category: MEAT, protein: true,
    alias: ['chicken thighs', 'boneless skinless chicken thighs'],
    packs: [[1.5, 'lb', 5.99, 'Store brand tray'], [3, 'lb', 10.99, 'Value pack']] },
  { key: 'ground_beef', name: 'Ground beef (85/15)', category: MEAT, protein: true,
    alias: ['ground beef', 'lean ground beef', 'hamburger'], swap: 'ground_turkey',
    packs: [[1, 'lb', 6.49, 'Store brand'], [3, 'lb', 17.99, 'Family pack']] },
  { key: 'ground_turkey', name: 'Ground turkey (93/7)', category: MEAT, protein: true,
    alias: ['ground turkey', 'lean ground turkey'],
    packs: [[1, 'lb', 4.99, 'Store brand'], [3, 'lb', 13.49, 'Family pack']] },
  { key: 'pork_loin', name: 'Pork loin', category: MEAT, protein: true,
    alias: ['pork tenderloin', 'pork chops', 'boneless pork chops'],
    packs: [[1.5, 'lb', 6.49, 'Store brand']] },
  { key: 'italian_sausage', name: 'Italian sausage', category: MEAT, protein: true,
    alias: ['sausage', 'pork sausage', 'chicken sausage'],
    packs: [[1, 'lb', 5.49, 'Store brand']] },
  { key: 'bacon', name: 'Bacon', category: MEAT, each: 25,
    packs: [[12, 'oz', 5.99, 'Store brand']] },
  { key: 'salmon', name: 'Salmon fillets', category: MEAT, protein: true, allergens: ['fish'],
    alias: ['salmon', 'salmon fillet'], swap: 'tilapia', each: 170,
    packs: [[1, 'lb', 13.99, 'Fresh Atlantic'], [1, 'lb', 10.99, 'Frozen fillets']] },
  { key: 'tilapia', name: 'Tilapia fillets', category: MEAT, protein: true, allergens: ['fish'],
    alias: ['tilapia', 'white fish', 'cod'], each: 140,
    packs: [[1, 'lb', 7.49, 'Frozen fillets']] },
  { key: 'shrimp', name: 'Shrimp', category: MEAT, protein: true, allergens: ['shellfish'],
    alias: ['raw shrimp', 'peeled shrimp', 'prawns'], swap: 'chicken_thigh',
    packs: [[1, 'lb', 10.99, 'Frozen, peeled']] },

  // -------------------------------------------------------- dairy & eggs
  { key: 'eggs', name: 'Large eggs', category: DAIRY, allergens: ['eggs'], each: 50, protein: true,
    alias: ['egg', 'large egg', 'eggs'], staple: true,
    packs: [[12, 'each', 3.79, 'Store brand dozen'], [18, 'each', 5.29, '18-count']] },
  { key: 'milk', name: 'Milk', category: DAIRY, allergens: ['milk'],
    alias: ['whole milk', '2% milk', 'dairy milk'], staple: true,
    packs: [[1, 'gallon', 4.19, 'Store brand'], [0.5, 'gallon', 2.79, 'Half gallon']] },
  { key: 'greek_yogurt', name: 'Plain Greek yogurt', category: DAIRY, allergens: ['milk'],
    alias: ['greek yogurt', 'yogurt'], protein: true,
    packs: [[32, 'oz', 5.49, 'Store brand tub'], [16, 'oz', 3.49, 'Small tub']] },
  { key: 'cheddar', name: 'Shredded cheddar', category: DAIRY, allergens: ['milk'],
    alias: ['cheddar cheese', 'shredded cheese', 'mexican blend cheese', 'cheese'],
    packs: [[8, 'oz', 3.29, 'Store brand'], [16, 'oz', 5.79, 'Family size'],
            [8, 'oz', 4.99, 'Name brand']] },
  { key: 'mozzarella', name: 'Shredded mozzarella', category: DAIRY, allergens: ['milk'],
    alias: ['mozzarella cheese', 'mozzarella'],
    packs: [[8, 'oz', 3.19, 'Store brand'], [16, 'oz', 5.49, 'Family size']] },
  { key: 'parmesan', name: 'Grated parmesan', category: DAIRY, allergens: ['milk'],
    alias: ['parmesan cheese', 'parmigiano'], packs: [[6, 'oz', 3.99, 'Store brand']] },
  { key: 'feta', name: 'Crumbled feta', category: DAIRY, allergens: ['milk'],
    alias: ['feta cheese'], packs: [[6, 'oz', 3.49, 'Store brand']] },
  { key: 'cream_cheese', name: 'Cream cheese', category: DAIRY, allergens: ['milk'],
    packs: [[8, 'oz', 2.49, 'Store brand brick']] },
  { key: 'sour_cream', name: 'Sour cream', category: DAIRY, allergens: ['milk'],
    packs: [[16, 'oz', 2.49, 'Store brand']] },
  { key: 'butter', name: 'Butter', category: DAIRY, allergens: ['milk'], each: 113,
    alias: ['unsalted butter', 'salted butter', 'butter stick'], staple: true,
    packs: [[16, 'oz', 4.79, 'Store brand, 4 sticks']] },
  { key: 'heavy_cream', name: 'Heavy cream', category: DAIRY, allergens: ['milk'],
    alias: ['heavy whipping cream', 'cream'], packs: [[16, 'fl oz', 3.99, 'Store brand']] },

  // -------------------------------------------------------------- bakery
  { key: 'flour_tortilla', name: 'Flour tortillas', category: BAKERY, allergens: ['wheat'],
    alias: ['tortillas', 'burrito tortillas', 'large flour tortillas'], each: 45,
    packs: [[10, 'each', 2.99, 'Store brand, 10-count'], [8, 'each', 3.99, 'Name brand, 8-count']] },
  { key: 'corn_tortilla', name: 'Corn tortillas', category: BAKERY, each: 25,
    alias: ['street taco tortillas', 'corn tortilla'],
    packs: [[30, 'each', 2.49, 'Store brand, 30-count']] },
  { key: 'sandwich_bread', name: 'Sandwich bread', category: BAKERY, allergens: ['wheat'], each: 28,
    alias: ['bread', 'whole wheat bread', 'sliced bread'], staple: true,
    packs: [[20, 'oz', 2.99, 'Store brand loaf']] },
  { key: 'burger_bun', name: 'Burger buns', category: BAKERY, allergens: ['wheat', 'sesame'], each: 60,
    alias: ['hamburger buns', 'buns'], packs: [[8, 'each', 2.79, 'Store brand 8-pack']] },
  { key: 'naan', name: 'Naan', category: BAKERY, allergens: ['wheat', 'milk'], each: 90,
    alias: ['flatbread', 'pita bread', 'pita'], packs: [[4, 'each', 3.49, '4-pack']] },

  // -------------------------------------------------------------- pantry
  { key: 'white_rice', name: 'Long-grain white rice', category: PANTRY,
    alias: ['rice', 'jasmine rice', 'cooked rice', 'basmati rice'], staple: true,
    packs: [[2, 'lb', 2.99, 'Store brand bag'], [5, 'lb', 5.99, 'Value bag']] },
  { key: 'brown_rice', name: 'Brown rice', category: PANTRY, staple: true,
    packs: [[2, 'lb', 3.29, 'Store brand bag']] },
  { key: 'quinoa', name: 'Quinoa', category: PANTRY, protein: true,
    packs: [[16, 'oz', 4.79, 'Store brand bag']] },
  { key: 'spaghetti', name: 'Spaghetti', category: PANTRY, allergens: ['wheat'],
    alias: ['pasta', 'linguine', 'angel hair'], staple: true,
    packs: [[16, 'oz', 1.49, 'Store brand box'], [16, 'oz', 2.49, 'Name brand box']] },
  { key: 'penne', name: 'Penne pasta', category: PANTRY, allergens: ['wheat'],
    alias: ['penne', 'rigatoni', 'ziti', 'rotini', 'short pasta', 'macaroni'], staple: true,
    packs: [[16, 'oz', 1.49, 'Store brand box']] },
  { key: 'couscous', name: 'Couscous', category: PANTRY, allergens: ['wheat'],
    packs: [[10, 'oz', 2.49, 'Store brand box']] },
  { key: 'rolled_oats', name: 'Rolled oats', category: PANTRY, staple: true,
    alias: ['oats', 'oatmeal'], packs: [[18, 'oz', 3.29, 'Store brand canister']] },
  { key: 'flour', name: 'All-purpose flour', category: PANTRY, allergens: ['wheat'], staple: true,
    packs: [[5, 'lb', 3.99, 'Store brand bag']] },
  { key: 'cornstarch', name: 'Cornstarch', category: PANTRY, staple: true,
    packs: [[16, 'oz', 2.29, 'Store brand box']] },
  { key: 'breadcrumbs', name: 'Panko breadcrumbs', category: PANTRY, allergens: ['wheat'],
    alias: ['panko', 'bread crumbs'], packs: [[8, 'oz', 2.49, 'Store brand']] },
  { key: 'olive_oil', name: 'Olive oil', category: PANTRY, staple: true,
    alias: ['extra virgin olive oil', 'oil'],
    packs: [[16.9, 'fl oz', 7.49, 'Store brand'], [33.8, 'fl oz', 12.99, 'Large bottle']] },
  { key: 'vegetable_oil', name: 'Vegetable oil', category: PANTRY, staple: true,
    alias: ['canola oil', 'neutral oil', 'cooking oil'],
    packs: [[48, 'fl oz', 4.79, 'Store brand']] },
  { key: 'sesame_oil', name: 'Toasted sesame oil', category: PANTRY, allergens: ['sesame'],
    packs: [[5, 'fl oz', 3.99, 'Store brand']] },
  { key: 'soy_sauce', name: 'Soy sauce', category: PANTRY, allergens: ['soy', 'wheat'],
    alias: ['low sodium soy sauce', 'tamari'], staple: true,
    packs: [[15, 'fl oz', 3.29, 'Store brand'], [10, 'fl oz', 3.99, 'Name brand']] },
  { key: 'rice_vinegar', name: 'Rice vinegar', category: PANTRY, staple: true,
    alias: ['seasoned rice vinegar'], packs: [[12, 'fl oz', 2.79, 'Store brand']] },
  { key: 'red_wine_vinegar', name: 'Red wine vinegar', category: PANTRY, staple: true,
    alias: ['vinegar', 'white vinegar', 'apple cider vinegar', 'balsamic vinegar'],
    packs: [[16, 'fl oz', 2.49, 'Store brand']] },
  { key: 'honey', name: 'Honey', category: PANTRY, staple: true,
    packs: [[12, 'oz', 4.49, 'Store brand bear']] },
  { key: 'brown_sugar', name: 'Brown sugar', category: PANTRY, staple: true,
    alias: ['sugar', 'granulated sugar'], packs: [[16, 'oz', 2.19, 'Store brand bag']] },
  { key: 'peanut_butter', name: 'Peanut butter', category: PANTRY, allergens: ['peanuts'],
    protein: true, packs: [[16, 'oz', 3.49, 'Store brand jar']] },
  { key: 'dijon', name: 'Dijon mustard', category: PANTRY, staple: true,
    alias: ['mustard', 'yellow mustard'], packs: [[8, 'oz', 2.49, 'Store brand']] },
  { key: 'mayo', name: 'Mayonnaise', category: PANTRY, allergens: ['eggs'], staple: true,
    alias: ['mayonnaise'], packs: [[30, 'fl oz', 4.99, 'Store brand jar']] },
  { key: 'ketchup', name: 'Ketchup', category: PANTRY, staple: true,
    packs: [[20, 'oz', 2.79, 'Store brand']] },
  { key: 'sriracha', name: 'Sriracha', category: PANTRY, staple: true,
    alias: ['hot sauce', 'chili garlic sauce', 'chili sauce'],
    packs: [[17, 'fl oz', 4.29, 'Store brand']] },
  { key: 'salsa', name: 'Salsa', category: PANTRY, alias: ['jarred salsa', 'pico de gallo'],
    packs: [[16, 'oz', 2.99, 'Store brand jar']] },
  { key: 'tortilla_chips', name: 'Tortilla chips', category: PANTRY,
    packs: [[11, 'oz', 3.49, 'Store brand bag']] },
  { key: 'chicken_broth', name: 'Chicken broth', category: PANTRY,
    alias: ['chicken stock', 'broth', 'stock'], staple: true,
    packs: [[32, 'fl oz', 2.49, 'Store brand carton']] },
  { key: 'vegetable_broth', name: 'Vegetable broth', category: PANTRY,
    alias: ['vegetable stock'], staple: true,
    packs: [[32, 'fl oz', 2.49, 'Store brand carton']] },
  { key: 'lentils', name: 'Dry lentils', category: PANTRY, protein: true,
    alias: ['red lentils', 'green lentils'], packs: [[16, 'oz', 2.29, 'Store brand bag']] },

  // --------------------------------------------------------- canned goods
  { key: 'black_beans', name: 'Black beans', category: CANNED, protein: true, each: 425,
    alias: ['canned black beans', 'can of black beans'], staple: true,
    packs: [[15, 'oz', 1.19, 'Store brand can'], [15, 'oz', 1.79, 'Name brand can']] },
  { key: 'chickpeas', name: 'Chickpeas', category: CANNED, protein: true, each: 425,
    alias: ['garbanzo beans', 'canned chickpeas'], staple: true,
    packs: [[15, 'oz', 1.29, 'Store brand can']] },
  { key: 'kidney_beans', name: 'Kidney beans', category: CANNED, protein: true, each: 425,
    alias: ['canned kidney beans', 'pinto beans', 'refried beans'], staple: true,
    packs: [[15, 'oz', 1.19, 'Store brand can']] },
  { key: 'white_beans', name: 'Cannellini beans', category: CANNED, protein: true, each: 425,
    alias: ['white beans', 'great northern beans'], packs: [[15, 'oz', 1.39, 'Store brand can']] },
  { key: 'diced_tomatoes', name: 'Diced tomatoes', category: CANNED, each: 411,
    alias: ['canned diced tomatoes', 'canned tomatoes', 'fire roasted tomatoes'], staple: true,
    packs: [[14.5, 'oz', 1.29, 'Store brand can']] },
  { key: 'crushed_tomatoes', name: 'Crushed tomatoes', category: CANNED, each: 794,
    alias: ['tomato puree', 'canned crushed tomatoes', 'marinara sauce', 'pasta sauce', 'tomato sauce'],
    packs: [[28, 'oz', 2.29, 'Store brand can']] },
  { key: 'tomato_paste', name: 'Tomato paste', category: CANNED, each: 170, staple: true,
    packs: [[6, 'oz', 0.99, 'Store brand can']] },
  // Measured in millilitres, not grams: the can is sold by fluid ounces, so
  // "1 can" has to bridge into volume rather than weight.
  { key: 'coconut_milk', name: 'Coconut milk', category: CANNED, ml: 400,
    alias: ['canned coconut milk', 'full fat coconut milk'],
    packs: [[13.5, 'fl oz', 2.19, 'Store brand can']] },
  { key: 'canned_tuna', name: 'Canned tuna', category: CANNED, allergens: ['fish'], protein: true,
    each: 142, packs: [[5, 'oz', 1.49, 'Store brand can']] },
  { key: 'green_chiles', name: 'Diced green chiles', category: CANNED, each: 113,
    packs: [[4, 'oz', 1.09, 'Store brand can']] },
  { key: 'chipotle_adobo', name: 'Chipotles in adobo', category: CANNED, each: 198,
    packs: [[7, 'oz', 1.79, 'Store brand can']] },

  // -------------------------------------------------------------- frozen
  { key: 'frozen_corn', name: 'Frozen corn', category: FROZEN,
    alias: ['corn', 'sweet corn', 'corn kernels'], staple: true,
    packs: [[16, 'oz', 1.79, 'Store brand bag']] },
  { key: 'frozen_peas', name: 'Frozen peas', category: FROZEN, alias: ['peas'], staple: true,
    packs: [[16, 'oz', 1.69, 'Store brand bag']] },
  { key: 'frozen_broccoli', name: 'Frozen broccoli', category: FROZEN,
    packs: [[12, 'oz', 1.99, 'Store brand bag']] },
  { key: 'frozen_stirfry_veg', name: 'Frozen stir-fry vegetables', category: FROZEN,
    alias: ['frozen mixed vegetables', 'mixed vegetables', 'stir fry vegetables'],
    packs: [[16, 'oz', 3.29, 'Store brand bag']] },
  { key: 'frozen_edamame', name: 'Frozen shelled edamame', category: FROZEN, allergens: ['soy'],
    protein: true, alias: ['edamame'], packs: [[12, 'oz', 2.79, 'Store brand bag']] },
  { key: 'frozen_spinach', name: 'Frozen chopped spinach', category: FROZEN,
    packs: [[10, 'oz', 1.59, 'Store brand box']] },

  // ------------------------------------------------------------- spices
  { key: 'salt', name: 'Kosher salt', category: SPICE, staple: true, alias: ['salt', 'sea salt'],
    packs: [[3, 'lb', 3.29, 'Box']] },
  { key: 'black_pepper', name: 'Black pepper', category: SPICE, staple: true,
    alias: ['pepper', 'ground black pepper'], packs: [[3, 'oz', 3.49, 'Grinder']] },
  { key: 'cumin', name: 'Ground cumin', category: SPICE, staple: true, alias: ['cumin'],
    packs: [[2, 'oz', 2.49, 'Store brand jar']] },
  { key: 'chili_powder', name: 'Chili powder', category: SPICE, staple: true,
    packs: [[2.5, 'oz', 2.29, 'Store brand jar']] },
  { key: 'smoked_paprika', name: 'Smoked paprika', category: SPICE, staple: true,
    alias: ['paprika'], packs: [[2, 'oz', 2.99, 'Store brand jar']] },
  { key: 'oregano', name: 'Dried oregano', category: SPICE, staple: true,
    packs: [[0.75, 'oz', 2.19, 'Store brand jar']] },
  { key: 'italian_seasoning', name: 'Italian seasoning', category: SPICE, staple: true,
    alias: ['dried basil', 'dried thyme', 'herbes de provence'],
    packs: [[0.75, 'oz', 2.29, 'Store brand jar']] },
  { key: 'garlic_powder', name: 'Garlic powder', category: SPICE, staple: true,
    alias: ['onion powder', 'granulated garlic'], packs: [[3, 'oz', 2.49, 'Store brand jar']] },
  { key: 'curry_powder', name: 'Curry powder', category: SPICE,
    alias: ['garam masala', 'madras curry powder'], packs: [[1.9, 'oz', 3.29, 'Store brand jar']] },
  { key: 'cinnamon', name: 'Ground cinnamon', category: SPICE, staple: true,
    packs: [[2.4, 'oz', 2.79, 'Store brand jar']] },
  { key: 'red_pepper_flakes', name: 'Crushed red pepper', category: SPICE, staple: true,
    alias: ['red pepper flakes', 'chili flakes'], packs: [[1.5, 'oz', 2.29, 'Store brand jar']] },
  { key: 'taco_seasoning', name: 'Taco seasoning', category: SPICE,
    packs: [[1, 'oz', 0.89, 'Store brand packet']] },
  { key: 'turmeric', name: 'Ground turmeric', category: SPICE,
    alias: ['coriander', 'ground coriander'], packs: [[1.9, 'oz', 3.19, 'Store brand jar']] },
  { key: 'bay_leaves', name: 'Bay leaves', category: SPICE, staple: true, each: 0.2,
    packs: [[0.15, 'oz', 2.49, 'Store brand jar']] },
];

// Category defaults for the diet flags, overridable per record.
const VEGETARIAN_BY_CATEGORY = { [MEAT]: false };
const VEGAN_BY_CATEGORY = { [MEAT]: false, [DAIRY]: false };

function expand(row) {
  const allergens = row.allergens ?? [];
  const vegetarian = row.veg ?? VEGETARIAN_BY_CATEGORY[row.category] ?? true;
  const vegan =
    row.vegan ??
    (vegetarian &&
      (VEGAN_BY_CATEGORY[row.category] ?? true) &&
      !allergens.includes('milk') &&
      !allergens.includes('eggs'));

  return {
    key: row.key,
    name: row.name,
    category: row.category,
    aliases: row.alias ?? [],
    allergens,
    gramsPerEach: row.each ?? null,
    mlPerEach: row.ml ?? null,
    isStaple: Boolean(row.staple),
    isProtein: Boolean(row.protein),
    cheaperSwap: row.swap ?? null,
    diet: {
      vegetarian,
      vegan,
      // Derived rather than declared, so a food can never claim to be
      // gluten-free while carrying a wheat allergen tag.
      glutenFree: !allergens.includes('wheat'),
      dairyFree: !allergens.includes('milk'),
      eggFree: !allergens.includes('eggs'),
    },
    packs: (row.packs ?? []).map(([size, unit, price, label], index) => ({
      size,
      unit,
      price,
      label,
      // The first pack is the default the planner prices against; the rest
      // are what the optimiser may swap in.
      isDefault: index === 0,
    })),
  };
}

export const FOODS = TABLE.map(expand);

export const FOOD_BY_KEY = new Map(FOODS.map((food) => [food.key, food]));

/** Every name that resolves to a food, longest first so "green onion" beats "onion". */
const LOOKUP = (() => {
  const entries = [];
  for (const food of FOODS) {
    entries.push([food.name.toLowerCase(), food.key]);
    entries.push([food.key.replace(/_/g, ' '), food.key]);
    for (const alias of food.aliases) entries.push([alias.toLowerCase(), food.key]);
  }
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries;
})();

export const getFood = (key) => FOOD_BY_KEY.get(key) ?? null;

/** The keys an AI plan is allowed to build recipes from. */
export const FOOD_KEYS = FOODS.map((food) => food.key);

/** Pantry staples worth offering as tick-boxes in the questionnaire. */
export const STAPLES = FOODS.filter((food) => food.isStaple);

export { LOOKUP as FOOD_LOOKUP };

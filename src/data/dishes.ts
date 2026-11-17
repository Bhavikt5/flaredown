// Common Indian dishes broken into their main ingredients.
// Typical home-style recipes; users can add their own dishes in the app.
// Format: [id, English name, Hindi / common name, category, ingredients, fried?]

import { ingredientInfo, Tag } from './ingredients';

export type Category =
  | 'Breakfast'
  | 'Roti and rice'
  | 'Dal and curry'
  | 'Sabzi'
  | 'Non-veg'
  | 'South Indian'
  | 'Street food and snacks'
  | 'Sweets'
  | 'Drinks'
  | 'Fruit'
  | 'Packaged and fast food'
  | 'Sides'
  | 'Custom';

export type Dish = {
  id: string;
  name: string;
  alt: string;
  category: Category;
  ingredients: string[];
  fried: boolean;
  custom?: boolean;
};

type Row = [string, string, string, Category, string[], boolean?];

const ROWS: Row[] = [
  // Breakfast
  ['poha', 'Poha', 'Kanda poha', 'Breakfast', ['poha', 'onion', 'peanuts', 'green_chilli', 'lemon', 'oil']],
  ['upma', 'Upma', 'Rava upma', 'Breakfast', ['sooji', 'onion', 'green_chilli', 'oil', 'urad_dal']],
  ['aloo_paratha', 'Aloo paratha', 'Aloo ka paratha', 'Breakfast', ['wheat', 'potato', 'green_chilli', 'ghee']],
  ['gobi_paratha', 'Gobi paratha', 'Gobhi paratha', 'Breakfast', ['wheat', 'cauliflower', 'green_chilli', 'ghee']],
  ['paneer_paratha', 'Paneer paratha', '', 'Breakfast', ['wheat', 'paneer', 'green_chilli', 'ghee']],
  ['methi_thepla', 'Methi thepla', 'Thepla', 'Breakfast', ['wheat', 'besan', 'methi', 'curd', 'oil']],
  ['besan_chilla', 'Besan chilla', 'Cheela', 'Breakfast', ['besan', 'onion', 'tomato', 'green_chilli', 'oil']],
  ['moong_chilla', 'Moong dal chilla', 'Pesarattu', 'Breakfast', ['moong_dal', 'onion', 'green_chilli', 'oil']],
  ['bread_omelette', 'Bread omelette', 'Anda bread', 'Breakfast', ['bread', 'egg', 'onion', 'green_chilli', 'butter']],
  ['boiled_eggs', 'Boiled eggs', 'Ubla anda', 'Breakfast', ['egg']],
  ['omelette', 'Omelette', 'Anda omelette', 'Breakfast', ['egg', 'onion', 'tomato', 'green_chilli', 'oil']],
  ['bread_butter', 'Bread and butter', 'Toast', 'Breakfast', ['bread', 'butter']],
  ['oats_porridge', 'Oats porridge', 'Oats', 'Breakfast', ['oats', 'milk', 'sugar']],
  ['masala_oats', 'Masala oats', '', 'Breakfast', ['oats', 'onion', 'tomato', 'peas', 'carrot']],
  ['cornflakes', 'Cornflakes with milk', '', 'Breakfast', ['corn', 'milk', 'sugar', 'processed_cereal_placeholder']],
  ['sabudana_khichdi', 'Sabudana khichdi', '', 'Breakfast', ['sabudana', 'peanuts', 'potato', 'green_chilli', 'ghee']],
  ['dhokla', 'Dhokla', 'Khaman', 'Breakfast', ['besan', 'curd', 'sugar', 'green_chilli', 'oil']],
  ['puri_bhaji', 'Puri bhaji', 'Puri aloo', 'Breakfast', ['wheat', 'potato', 'tomato', 'oil'], true],
  ['chole_bhature', 'Chole bhature', '', 'Breakfast', ['maida', 'chana', 'tomato', 'onion', 'red_chilli', 'oil'], true],

  // Roti and rice
  ['roti', 'Roti / chapati', 'Phulka', 'Roti and rice', ['wheat']],
  ['ghee_roti', 'Roti with ghee', '', 'Roti and rice', ['wheat', 'ghee']],
  ['plain_paratha', 'Plain paratha', '', 'Roti and rice', ['wheat', 'ghee']],
  ['naan', 'Naan', 'Butter naan', 'Roti and rice', ['maida', 'curd', 'butter']],
  ['bajra_roti', 'Bajra roti', 'Bhakri', 'Roti and rice', ['millet']],
  ['jowar_roti', 'Jowar roti', 'Jowar bhakri', 'Roti and rice', ['millet']],
  ['ragi_roti', 'Ragi roti', 'Nachni', 'Roti and rice', ['millet']],
  ['makki_roti', 'Makki ki roti', '', 'Roti and rice', ['corn', 'ghee']],
  ['plain_rice', 'Steamed rice', 'Chawal', 'Roti and rice', ['rice']],
  ['jeera_rice', 'Jeera rice', '', 'Roti and rice', ['rice', 'ghee']],
  ['veg_pulao', 'Veg pulao', '', 'Roti and rice', ['rice', 'peas', 'carrot', 'beans', 'onion', 'ghee', 'garam_masala']],
  ['veg_biryani', 'Veg biryani', '', 'Roti and rice', ['rice', 'potato', 'carrot', 'peas', 'curd', 'onion', 'garam_masala', 'ghee']],
  ['khichdi', 'Khichdi', 'Dal khichdi', 'Roti and rice', ['rice', 'moong_dal', 'ghee']],
  ['curd_rice', 'Curd rice', 'Dahi chawal', 'Roti and rice', ['rice', 'curd', 'green_chilli']],
  ['lemon_rice', 'Lemon rice', '', 'Roti and rice', ['rice', 'lemon', 'peanuts', 'green_chilli', 'oil']],
  ['fried_rice', 'Veg fried rice', '', 'Roti and rice', ['rice', 'cabbage', 'carrot', 'capsicum', 'sauce', 'oil']],

  // Dal and curry
  ['dal_tadka', 'Dal tadka', 'Toor dal', 'Dal and curry', ['toor_dal', 'tomato', 'onion', 'garlic', 'red_chilli', 'ghee']],
  ['dal_fry', 'Dal fry', '', 'Dal and curry', ['toor_dal', 'tomato', 'onion', 'green_chilli', 'oil']],
  ['moong_dal', 'Moong dal', 'Peeli dal', 'Dal and curry', ['moong_dal', 'tomato', 'ghee']],
  ['masoor_dal', 'Masoor dal', 'Lal dal', 'Dal and curry', ['masoor_dal', 'tomato', 'onion', 'oil']],
  ['dal_makhani', 'Dal makhani', '', 'Dal and curry', ['urad_dal', 'rajma', 'tomato', 'butter', 'cream']],
  ['gujarati_dal', 'Gujarati dal', 'Khatti meethi dal', 'Dal and curry', ['toor_dal', 'tomato', 'jaggery', 'tamarind', 'peanuts']],
  ['sambar', 'Sambar', '', 'Dal and curry', ['toor_dal', 'tamarind', 'tomato', 'brinjal', 'gourd', 'red_chilli']],
  ['rasam', 'Rasam', '', 'Dal and curry', ['tamarind', 'tomato', 'toor_dal', 'garlic', 'red_chilli']],
  ['rajma', 'Rajma', 'Rajma masala', 'Dal and curry', ['rajma', 'tomato', 'onion', 'red_chilli', 'oil']],
  ['chole', 'Chole', 'Chana masala', 'Dal and curry', ['chana', 'tomato', 'onion', 'red_chilli', 'oil']],
  ['kadhi', 'Kadhi', 'Kadhi pakora', 'Dal and curry', ['curd', 'besan', 'oil'], true],
  ['paneer_butter_masala', 'Paneer butter masala', '', 'Dal and curry', ['paneer', 'tomato', 'butter', 'cream', 'cashew']],
  ['palak_paneer', 'Palak paneer', '', 'Dal and curry', ['spinach', 'paneer', 'onion', 'tomato', 'cream']],
  ['shahi_paneer', 'Shahi paneer', '', 'Dal and curry', ['paneer', 'cream', 'cashew', 'tomato']],
  ['kadai_paneer', 'Kadai paneer', '', 'Dal and curry', ['paneer', 'capsicum', 'tomato', 'onion', 'red_chilli']],
  ['matar_paneer', 'Matar paneer', '', 'Dal and curry', ['paneer', 'peas', 'tomato', 'onion']],
  ['malai_kofta', 'Malai kofta', '', 'Dal and curry', ['paneer', 'potato', 'cream', 'cashew', 'tomato'], true],
  ['sarson_saag', 'Sarson ka saag', '', 'Dal and curry', ['sarson', 'spinach', 'ghee', 'garlic']],
  ['soya_curry', 'Soya chunks curry', '', 'Dal and curry', ['soy', 'tomato', 'onion', 'oil']],
  ['sprouts_usal', 'Sprouts usal', 'Misal', 'Dal and curry', ['sprouts', 'onion', 'tomato', 'red_chilli']],

  // Sabzi
  ['aloo_gobi', 'Aloo gobi', '', 'Sabzi', ['potato', 'cauliflower', 'tomato', 'oil']],
  ['jeera_aloo', 'Jeera aloo', '', 'Sabzi', ['potato', 'oil', 'green_chilli']],
  ['aloo_matar', 'Aloo matar', '', 'Sabzi', ['potato', 'peas', 'tomato', 'oil']],
  ['bhindi', 'Bhindi sabzi', 'Bhindi masala', 'Sabzi', ['okra', 'onion', 'oil']],
  ['baingan_bharta', 'Baingan bharta', '', 'Sabzi', ['brinjal', 'tomato', 'onion', 'oil']],
  ['lauki', 'Lauki sabzi', 'Ghiya', 'Sabzi', ['gourd', 'tomato', 'oil']],
  ['karela', 'Karela sabzi', '', 'Sabzi', ['bitter_gourd', 'onion', 'oil']],
  ['cabbage_sabzi', 'Cabbage sabzi', 'Patta gobhi', 'Sabzi', ['cabbage', 'peas', 'oil']],
  ['beans_sabzi', 'Beans sabzi', '', 'Sabzi', ['beans', 'coconut', 'oil']],
  ['mix_veg', 'Mixed veg', '', 'Sabzi', ['carrot', 'beans', 'peas', 'cauliflower', 'potato', 'tomato', 'oil']],
  ['palak_sabzi', 'Palak sabzi', 'Aloo palak', 'Sabzi', ['spinach', 'potato', 'oil']],
  ['methi_aloo', 'Aloo methi', '', 'Sabzi', ['methi', 'potato', 'oil']],
  ['mushroom_masala', 'Mushroom masala', '', 'Sabzi', ['mushroom', 'tomato', 'onion', 'oil']],
  ['dum_aloo', 'Dum aloo', '', 'Sabzi', ['potato', 'curd', 'tomato', 'red_chilli', 'oil'], true],
  ['tinda', 'Tinda / turai sabzi', '', 'Sabzi', ['gourd', 'tomato', 'oil']],
  ['carrot_peas', 'Gajar matar', '', 'Sabzi', ['carrot', 'peas', 'oil']],
  ['avial', 'Avial', '', 'Sabzi', ['carrot', 'beans', 'gourd', 'coconut', 'curd']],

  // Non-veg
  ['chicken_curry', 'Chicken curry', '', 'Non-veg', ['chicken', 'tomato', 'onion', 'red_chilli', 'oil']],
  ['butter_chicken', 'Butter chicken', '', 'Non-veg', ['chicken', 'tomato', 'butter', 'cream', 'cashew']],
  ['tandoori_chicken', 'Tandoori chicken', '', 'Non-veg', ['chicken', 'curd', 'red_chilli', 'lemon']],
  ['chicken_biryani', 'Chicken biryani', '', 'Non-veg', ['rice', 'chicken', 'curd', 'onion', 'ghee', 'garam_masala']],
  ['mutton_curry', 'Mutton curry', '', 'Non-veg', ['mutton', 'tomato', 'onion', 'red_chilli', 'oil']],
  ['mutton_biryani', 'Mutton biryani', '', 'Non-veg', ['rice', 'mutton', 'curd', 'onion', 'ghee', 'garam_masala']],
  ['keema', 'Keema', 'Keema matar', 'Non-veg', ['mutton', 'peas', 'tomato', 'onion', 'oil']],
  ['fish_curry', 'Fish curry', '', 'Non-veg', ['fish', 'tomato', 'coconut', 'tamarind', 'red_chilli']],
  ['fish_fry', 'Fish fry', '', 'Non-veg', ['fish', 'red_chilli', 'besan', 'oil'], true],
  ['grilled_fish', 'Grilled fish', '', 'Non-veg', ['fish', 'lemon', 'mustard_oil']],
  ['prawn_curry', 'Prawn curry', '', 'Non-veg', ['prawns', 'coconut', 'tomato', 'red_chilli']],
  ['egg_curry', 'Egg curry', 'Anda curry', 'Non-veg', ['egg', 'tomato', 'onion', 'oil']],
  ['egg_bhurji', 'Egg bhurji', 'Anda bhurji', 'Non-veg', ['egg', 'onion', 'tomato', 'green_chilli', 'oil']],
  ['chicken_tikka', 'Chicken tikka', '', 'Non-veg', ['chicken', 'curd', 'red_chilli', 'capsicum']],
  ['chicken_65', 'Chicken 65', '', 'Non-veg', ['chicken', 'maida', 'red_chilli', 'oil'], true],

  // South Indian
  ['idli', 'Idli', '', 'South Indian', ['rice', 'urad_dal']],
  ['plain_dosa', 'Plain dosa', '', 'South Indian', ['rice', 'urad_dal', 'oil']],
  ['masala_dosa', 'Masala dosa', '', 'South Indian', ['rice', 'urad_dal', 'potato', 'onion', 'oil']],
  ['uttapam', 'Uttapam', '', 'South Indian', ['rice', 'urad_dal', 'onion', 'tomato', 'oil']],
  ['medu_vada', 'Medu vada', '', 'South Indian', ['urad_dal', 'oil'], true],
  ['pongal', 'Ven pongal', '', 'South Indian', ['rice', 'moong_dal', 'ghee', 'cashew']],
  ['appam', 'Appam with stew', '', 'South Indian', ['rice', 'coconut', 'potato', 'carrot']],
  ['coconut_chutney', 'Coconut chutney', '', 'South Indian', ['coconut', 'green_chilli', 'urad_dal']],
  ['tomato_chutney', 'Tomato chutney', '', 'South Indian', ['tomato', 'red_chilli', 'oil']],

  // Street food and snacks
  ['samosa', 'Samosa', '', 'Street food and snacks', ['maida', 'potato', 'peas', 'green_chilli', 'oil'], true],
  ['kachori', 'Kachori', '', 'Street food and snacks', ['maida', 'moong_dal', 'red_chilli', 'oil'], true],
  ['pakora', 'Pakora', 'Bhajiya', 'Street food and snacks', ['besan', 'onion', 'potato', 'green_chilli', 'oil'], true],
  ['vada_pav', 'Vada pav', '', 'Street food and snacks', ['bread', 'potato', 'besan', 'green_chilli', 'oil'], true],
  ['pav_bhaji', 'Pav bhaji', '', 'Street food and snacks', ['bread', 'potato', 'tomato', 'capsicum', 'peas', 'butter']],
  ['pani_puri', 'Pani puri', 'Golgappa', 'Street food and snacks', ['sooji', 'potato', 'chana', 'tamarind', 'mint'], true],
  ['bhel_puri', 'Bhel puri', '', 'Street food and snacks', ['rice', 'onion', 'tomato', 'tamarind', 'peanuts']],
  ['sev_puri', 'Sev puri / dahi puri', '', 'Street food and snacks', ['maida', 'besan', 'potato', 'curd', 'tamarind'], true],
  ['aloo_tikki', 'Aloo tikki chaat', '', 'Street food and snacks', ['potato', 'curd', 'tamarind', 'chana', 'oil'], true],
  ['momos', 'Momos', '', 'Street food and snacks', ['maida', 'cabbage', 'onion', 'sauce']],
  ['chowmein', 'Chowmein', 'Hakka noodles', 'Street food and snacks', ['noodles', 'cabbage', 'capsicum', 'sauce', 'oil']],
  ['maggi', 'Instant noodles', 'Maggi', 'Street food and snacks', ['noodles']],
  ['dabeli', 'Dabeli', '', 'Street food and snacks', ['bread', 'potato', 'peanuts', 'tamarind', 'butter']],
  ['namkeen', 'Namkeen / bhujia', '', 'Street food and snacks', ['besan', 'oil', 'peanuts'], true],
  ['makhana', 'Roasted makhana', '', 'Street food and snacks', ['nuts_placeholder']],
  ['roasted_chana', 'Roasted chana', '', 'Street food and snacks', ['chana']],
  ['khakhra', 'Khakhra', '', 'Street food and snacks', ['wheat', 'oil']],
  ['sandwich', 'Veg sandwich', '', 'Street food and snacks', ['bread', 'cucumber', 'tomato', 'potato', 'butter']],
  ['grilled_cheese_sandwich', 'Cheese sandwich', '', 'Street food and snacks', ['bread', 'cheese', 'butter']],

  // Maharashtrian
  ['misal_pav', 'Misal pav', 'Misal', 'Street food and snacks', ['sprouts', 'besan', 'onion', 'tomato', 'red_chilli', 'bread', 'lemon', 'oil'], true],
  ['batata_vada', 'Batata vada', 'Aloo bonda', 'Street food and snacks', ['potato', 'besan', 'green_chilli', 'oil'], true],
  ['kanda_bhaji', 'Kanda bhaji', 'Onion pakoda', 'Street food and snacks', ['onion', 'besan', 'green_chilli', 'oil'], true],
  ['sabudana_vada', 'Sabudana vada', '', 'Street food and snacks', ['sabudana', 'potato', 'peanuts', 'green_chilli', 'oil'], true],
  ['kothimbir_vadi', 'Kothimbir vadi', '', 'Street food and snacks', ['besan', 'coriander', 'oil'], true],
  ['thalipeeth', 'Thalipeeth', '', 'Breakfast', ['millet', 'besan', 'wheat', 'onion', 'oil']],
  ['pithla_bhakri', 'Pithla bhakri', 'Zunka bhakar', 'Dal and curry', ['besan', 'onion', 'green_chilli', 'millet', 'oil']],
  ['amti', 'Amti', 'Maharashtrian dal', 'Dal and curry', ['toor_dal', 'tamarind', 'jaggery', 'oil']],
  ['bharli_vangi', 'Bharli vangi', 'Stuffed brinjal', 'Sabzi', ['brinjal', 'peanuts', 'coconut', 'sesame', 'oil']],
  ['puran_poli', 'Puran poli', '', 'Sweets', ['wheat', 'chana', 'jaggery', 'ghee']],
  ['modak', 'Modak', 'Ukadiche modak', 'Sweets', ['rice', 'coconut', 'jaggery', 'ghee']],
  ['shrikhand', 'Shrikhand', '', 'Sweets', ['curd', 'sugar']],

  // Sweets
  ['gulab_jamun', 'Gulab jamun', '', 'Sweets', ['khoya', 'maida', 'sugar', 'ghee'], true],
  ['jalebi', 'Jalebi', '', 'Sweets', ['maida', 'sugar', 'ghee'], true],
  ['rasgulla', 'Rasgulla', '', 'Sweets', ['milk', 'sugar']],
  ['kheer', 'Kheer', 'Payasam', 'Sweets', ['rice', 'milk', 'sugar', 'cashew']],
  ['halwa', 'Sooji halwa', 'Sheera', 'Sweets', ['sooji', 'ghee', 'sugar', 'cashew']],
  ['gajar_halwa', 'Gajar halwa', '', 'Sweets', ['carrot', 'milk', 'sugar', 'ghee', 'khoya']],
  ['ladoo', 'Ladoo', 'Besan / motichoor', 'Sweets', ['besan', 'ghee', 'sugar']],
  ['barfi', 'Barfi / peda', '', 'Sweets', ['khoya', 'sugar']],
  ['chikki', 'Chikki', '', 'Sweets', ['peanuts', 'jaggery']],
  ['ice_cream', 'Ice cream', 'Kulfi', 'Sweets', ['milk', 'cream', 'sugar']],
  ['chocolate', 'Chocolate', '', 'Sweets', ['chocolate']],
  ['cake', 'Cake / pastry', '', 'Sweets', ['maida', 'sugar', 'butter', 'egg', 'cream']],
  ['biscuits', 'Biscuits', 'Cookies', 'Sweets', ['maida', 'sugar', 'butter_placeholder']],

  // Drinks
  ['chai', 'Chai with sugar', 'Tea', 'Drinks', ['tea', 'milk', 'sugar']],
  ['black_tea', 'Black / green tea', '', 'Drinks', ['tea']],
  ['coffee', 'Coffee with milk', '', 'Drinks', ['coffee', 'milk', 'sugar']],
  ['black_coffee', 'Black coffee', '', 'Drinks', ['coffee']],
  ['milk_glass', 'Glass of milk', 'Doodh', 'Drinks', ['milk']],
  ['haldi_milk', 'Haldi doodh', 'Turmeric milk', 'Drinks', ['milk']],
  ['lassi', 'Sweet lassi', '', 'Drinks', ['curd', 'sugar']],
  ['chaas', 'Chaas / buttermilk', 'Mattha', 'Drinks', ['curd']],
  ['nimbu_pani', 'Nimbu pani', 'Lemonade', 'Drinks', ['lemon', 'sugar']],
  ['coconut_water', 'Coconut water', 'Nariyal pani', 'Drinks', ['coconut']],
  ['soft_drink', 'Soft drink / cola', '', 'Drinks', ['soft_drink']],
  ['packaged_juice', 'Packaged juice', '', 'Drinks', ['packaged_juice']],
  ['fresh_juice', 'Fresh fruit juice', '', 'Drinks', ['orange', 'sugar']],

  // Fruit
  ['banana', 'Banana', 'Kela', 'Fruit', ['banana']],
  ['apple', 'Apple', 'Seb', 'Fruit', ['apple']],
  ['mango', 'Mango', 'Aam', 'Fruit', ['mango']],
  ['orange', 'Orange / mosambi', 'Santra', 'Fruit', ['orange']],
  ['papaya', 'Papaya', 'Papita', 'Fruit', ['papaya']],
  ['guava', 'Guava', 'Amrood', 'Fruit', ['guava']],
  ['grapes', 'Grapes', 'Angoor', 'Fruit', ['grapes']],
  ['watermelon', 'Watermelon', 'Tarbooz', 'Fruit', ['watermelon']],
  ['pomegranate', 'Pomegranate', 'Anar', 'Fruit', ['pomegranate']],
  ['dry_fruits', 'Dry fruits / nuts', 'Badam, kaju', 'Fruit', ['cashew']],
  ['seeds', 'Flax / chia / sesame seeds', '', 'Fruit', ['sesame']],

  // Packaged and fast food
  ['pizza', 'Pizza', '', 'Packaged and fast food', ['maida', 'cheese', 'tomato', 'capsicum', 'sauce']],
  ['burger', 'Burger', '', 'Packaged and fast food', ['bread', 'potato', 'cheese', 'mayonnaise', 'sauce'], true],
  ['french_fries', 'French fries', '', 'Packaged and fast food', ['potato', 'oil'], true],
  ['chips', 'Potato chips', 'Wafers', 'Packaged and fast food', ['potato', 'oil', 'processed_snack_placeholder'], true],
  ['pasta', 'Pasta (white sauce / red sauce)', '', 'Packaged and fast food', ['maida', 'cheese', 'tomato', 'cream']],
  ['frankie', 'Frankie / kathi roll', '', 'Packaged and fast food', ['maida', 'potato', 'onion', 'sauce', 'oil']],
  ['sausage', 'Sausage / salami', '', 'Packaged and fast food', ['processed_meat']],

  // Sides
  ['salad', 'Green salad', 'Kachumber', 'Sides', ['cucumber', 'onion', 'tomato', 'lemon']],
  ['raita', 'Raita', '', 'Sides', ['curd', 'cucumber']],
  ['plain_curd', 'Plain curd', 'Dahi', 'Sides', ['curd']],
  ['papad', 'Papad', '', 'Sides', ['urad_dal'], true],
  ['achar', 'Achar (pickle)', '', 'Sides', ['pickle', 'mustard_oil']],
  ['green_chutney', 'Green chutney', '', 'Sides', ['coriander', 'mint', 'green_chilli', 'lemon']],
  ['sweet_chutney', 'Sweet tamarind chutney', '', 'Sides', ['tamarind', 'jaggery']],
];

// A few rows above use placeholder ids where no single ingredient fits;
// map them to real ingredients here so data stays valid.
const PLACEHOLDERS: Record<string, string[]> = {
  processed_cereal_placeholder: [],
  nuts_placeholder: ['cashew'],
  butter_placeholder: ['butter'],
  processed_snack_placeholder: [],
};

export const BUILT_IN_DISHES: Dish[] = ROWS.map(([id, name, alt, category, ings, fried]) => ({
  id,
  name,
  alt,
  category,
  ingredients: ings.flatMap((i) => (i in PLACEHOLDERS ? PLACEHOLDERS[i] : [i])),
  fried: !!fried,
}));

// Dishes counted as ultra-processed even though no single ingredient says so.
const PROCESSED_DISHES = new Set(['cornflakes', 'chips', 'biscuits', 'maggi', 'namkeen']);

/** All tags a dish carries: its ingredients' tags plus cooking-method tags. */
export function dishTags(dish: Dish): Tag[] {
  const tags = new Set<Tag>();
  for (const ing of dish.ingredients) {
    for (const t of ingredientInfo(ing)?.tags ?? []) tags.add(t);
  }
  if (dish.fried) tags.add('fried');
  if (PROCESSED_DISHES.has(dish.id)) tags.add('processed');
  return [...tags];
}

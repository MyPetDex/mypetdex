// ─────────────────────────────────────────────────────────────────────────────
// seed-products.js — Upload full affiliate product catalog to Firestore
//
// Run from the MyPetDex project root:
//   node scripts/seed-products.js
//
// Requires service-account.json in the project root (never commit that file).
// ─────────────────────────────────────────────────────────────────────────────

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore }        = require("firebase-admin/firestore");
const path = require("path");
const sa   = require(path.join(__dirname, "../../service-account.json"));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const AMZ_TAG = "mypetdex20-20";
const CHEWY_ID = "7270969";
const CHEWY_CAM = "2846786";
const CHEWY_PUB = "32975";

function amz(search) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(search)}&tag=${AMZ_TAG}`;
}
function chewy(search) {
  const dest = encodeURIComponent(`https://www.chewy.com/s?query=${encodeURIComponent(search)}`);
  return `https://chewy.sjv.io/c/${CHEWY_ID}/${CHEWY_CAM}/${CHEWY_PUB}?u=${dest}`;
}

// ─── PRODUCT CATALOG ──────────────────────────────────────────────────────────
// Each entry: { title, description, category, species, store, url }

const PRODUCTS = [

  // ════════════════════════════════════════════════════════════
  // AMAZON — DOG
  // ════════════════════════════════════════════════════════════

  // Food
  { title: "Royal Canin Medium Adult Dry Dog Food", description: "Precisely balanced nutrition for medium breed adult dogs", category: "Food", species: "dog", store: "Amazon", url: amz("Royal Canin Medium Adult Dry Dog Food 30lb") },
  { title: "Hill's Science Diet Adult Dry Dog Food", description: "Clinically proven antioxidants for a healthy immune system", category: "Food", species: "dog", store: "Amazon", url: amz("Hills Science Diet Adult Dry Dog Food Chicken") },
  { title: "Purina Pro Plan Adult Dry Dog Food", description: "High-protein formula with real chicken as the #1 ingredient", category: "Food", species: "dog", store: "Amazon", url: amz("Purina Pro Plan Adult Dry Dog Food Shredded Blend") },
  { title: "Blue Buffalo Life Protection Formula", description: "Natural adult dry dog food with LifeSource Bits", category: "Food", species: "dog", store: "Amazon", url: amz("Blue Buffalo Life Protection Formula Adult Dog Food") },
  { title: "Taste of the Wild Pacific Stream", description: "Grain free recipe with smoked salmon for dogs", category: "Food", species: "dog", store: "Amazon", url: amz("Taste of the Wild Pacific Stream Grain Free Dog Food") },
  { title: "Wellness CORE Natural Grain Free Dry Dog Food", description: "Protein-rich, grain free recipe for optimal health", category: "Food", species: "dog", store: "Amazon", url: amz("Wellness CORE Natural Grain Free Dry Dog Food") },
  { title: "Merrick Grain Free Texas Beef & Sweet Potato", description: "Real beef first ingredient with whole grain free recipe", category: "Food", species: "dog", store: "Amazon", url: amz("Merrick Grain Free Texas Beef Sweet Potato Dog Food") },
  { title: "Victor Classic Hi-Pro Plus Formula Dog Food", description: "High-protein formula ideal for active and sporting dogs", category: "Food", species: "dog", store: "Amazon", url: amz("Victor Classic Hi-Pro Plus Formula Dry Dog Food") },
  { title: "Iams Adult Minichunks Small Kibble Dog Food", description: "High-quality protein from farm-raised chicken", category: "Food", species: "dog", store: "Amazon", url: amz("Iams Adult Minichunks Small Kibble High Protein Dog Food") },
  { title: "Nutro Ultra Adult Dry Dog Food", description: "Trio of proteins from chicken, lamb, and salmon", category: "Food", species: "dog", store: "Amazon", url: amz("Nutro Ultra Adult Dry Dog Food") },

  // Treats
  { title: "Milk-Bone Original Dog Biscuits", description: "Classic crunchy biscuits with 12 vitamins & minerals", category: "Treats", species: "dog", store: "Amazon", url: amz("Milk-Bone Original Dog Biscuits Large") },
  { title: "Zuke's Mini Naturals Training Dog Treats", description: "Soft, small training treats with real chicken", category: "Treats", species: "dog", store: "Amazon", url: amz("Zukes Mini Naturals Training Dog Treats Chicken") },
  { title: "Greenies Original Dental Dog Treats", description: "Clinically proven to clean teeth and fight bad breath", category: "Treats", species: "dog", store: "Amazon", url: amz("Greenies Original Dental Dog Treats Regular") },
  { title: "Blue Buffalo Blue Bits Soft Training Treats", description: "Tender bits with real chicken and wholesome ingredients", category: "Treats", species: "dog", store: "Amazon", url: amz("Blue Buffalo Blue Bits Soft Moist Training Dog Treats") },
  { title: "Wellness Soft WellBites Natural Dog Treats", description: "Grain free soft bites with real meat as the first ingredient", category: "Treats", species: "dog", store: "Amazon", url: amz("Wellness Soft WellBites Natural Grain Free Dog Treats") },
  { title: "Old Mother Hubbard Classic P-Nuttier Biscuits", description: "Oven-baked biscuits with all-natural ingredients", category: "Treats", species: "dog", store: "Amazon", url: amz("Old Mother Hubbard Classic Pnuttier Dog Biscuits") },
  { title: "Rachael Ray Nutrish Soup Bones Dog Treats", description: "Real chicken & veggies in a long-lasting chew", category: "Treats", species: "dog", store: "Amazon", url: amz("Rachael Ray Nutrish Soup Bones Dog Treats Chicken Veggies") },
  { title: "Purina Beggin' Strips Dog Training Treats", description: "Bacon-flavored soft strips dogs go crazy for", category: "Treats", species: "dog", store: "Amazon", url: amz("Purina Beggin Strips Dog Training Treats Bacon") },
  { title: "Natural Balance L.I.T. Limited Ingredient Treats", description: "Simple ingredient list for dogs with food sensitivities", category: "Treats", species: "dog", store: "Amazon", url: amz("Natural Balance LIT Limited Ingredient Dog Treats") },
  { title: "Barkworthies Odor Free Bully Sticks", description: "All-natural, high protein, long-lasting chews", category: "Treats", species: "dog", store: "Amazon", url: amz("Barkworthies Odor Free Bully Sticks Dogs") },

  // Toys
  { title: "KONG Classic Dog Toy", description: "Durable rubber chew toy for stuffing with treats", category: "Toys", species: "dog", store: "Amazon", url: amz("KONG Classic Dog Toy Large") },
  { title: "Chuckit! Sport Ball Launcher", description: "Hands-free fetch launcher for standard tennis balls", category: "Toys", species: "dog", store: "Amazon", url: amz("Chuckit Sport Ball Launcher Dog Toy") },
  { title: "Outward Hound Hide A Squirrel Plush Puzzle Toy", description: "Interactive puzzle toy with squeaky squirrels", category: "Toys", species: "dog", store: "Amazon", url: amz("Outward Hound Hide A Squirrel Plush Puzzle Dog Toy") },
  { title: "Nylabone Dura Chew Textured Ring", description: "Long-lasting chew toy for powerful chewers", category: "Toys", species: "dog", store: "Amazon", url: amz("Nylabone Dura Chew Textured Ring Dog Chew Toy") },
  { title: "West Paw Zogoflex Tux Dog Toy", description: "Dishwasher safe, treat-stuffable tough chew toy", category: "Toys", species: "dog", store: "Amazon", url: amz("West Paw Zogoflex Tux Dog Toy") },
  { title: "ZippyPaws Skinny Peltz Squeaky Plush Dog Toy", description: "No stuffing squeaky plush dog toy set of 3", category: "Toys", species: "dog", store: "Amazon", url: amz("ZippyPaws Skinny Peltz No Stuffing Squeaky Plush Dog Toy") },
  { title: "Frisco Fetch Squeaking Tennis Ball Dog Toy", description: "Bright, bouncy tennis balls with a squeaker inside", category: "Toys", species: "dog", store: "Amazon", url: amz("Frisco Fetch Squeaking Tennis Ball Dog Toy") },
  { title: "Multipet Loofa Squeaky Dog Toy", description: "Classic squeaky loofa in fun colors", category: "Toys", species: "dog", store: "Amazon", url: amz("Multipet Loofa Squeaky Dog Toy") },
  { title: "Snuffle Mat for Dogs Nosework Feeding Mat", description: "Mental stimulation foraging mat to slow down eating", category: "Toys", species: "dog", store: "Amazon", url: amz("Snuffle Mat for Dogs Nosework Feeding Mat Mental Stimulation") },
  { title: "PetSafe Busy Buddy Twist 'n Treat Dog Toy", description: "Adjustable treat-dispensing toy for hours of fun", category: "Toys", species: "dog", store: "Amazon", url: amz("PetSafe Busy Buddy Twist n Treat Dog Toy") },

  // Health
  { title: "Zesty Paws Multivitamin Bites for Dogs", description: "8-in-1 chewable supplement for whole-body health", category: "Health", species: "dog", store: "Amazon", url: amz("Zesty Paws Multivitamin Bites for Dogs 8 in 1") },
  { title: "Nutramax Cosequin DS Hip & Joint Supplement", description: "Veterinarian recommended joint health supplement", category: "Health", species: "dog", store: "Amazon", url: amz("Nutramax Cosequin DS Plus MSM Dog Joint Supplement") },
  { title: "Frontline Plus Flea & Tick Treatment for Dogs", description: "Monthly flea & tick protection, kills all life stages", category: "Health", species: "dog", store: "Amazon", url: amz("Frontline Plus Flea and Tick Treatment for Dogs") },
  { title: "TropiClean Fresh Breath Water Additive for Dogs", description: "No brushing needed — just add to water bowl", category: "Health", species: "dog", store: "Amazon", url: amz("TropiClean Fresh Breath Water Additive for Dogs") },
  { title: "Omega-3 Fish Oil Supplement for Dogs", description: "Supports skin, coat, heart, and joint health", category: "Health", species: "dog", store: "Amazon", url: amz("Omega 3 Fish Oil Supplement for Dogs Skin Coat") },
  { title: "Virbac C.E.T. Enzymatic Dog Toothpaste", description: "Veterinarian recommended enzymatic toothpaste", category: "Health", species: "dog", store: "Amazon", url: amz("Virbac CET Enzymatic Dog Toothpaste Poultry Flavor") },
  { title: "NaturVet Allergy Aid Soft Chews for Dogs", description: "Supports seasonal, environmental & skin allergies", category: "Health", species: "dog", store: "Amazon", url: amz("NaturVet Allergy Aid Soft Chews for Dogs") },
  { title: "Vetri-Science Vetri-Probiotic for Dogs", description: "Digestive support with 6 strains of live probiotics", category: "Health", species: "dog", store: "Amazon", url: amz("VetriScience Vetri Probiotic Dog Supplement") },

  // Grooming
  { title: "FURminator Undercoat Deshedding Tool for Dogs", description: "Reduces shedding up to 90% — vet recommended", category: "Grooming", species: "dog", store: "Amazon", url: amz("FURminator Undercoat Deshedding Tool for Dogs Large Short Hair") },
  { title: "Hertzko Self Cleaning Slicker Brush for Dogs", description: "Removes loose fur, detangles, and massages skin", category: "Grooming", species: "dog", store: "Amazon", url: amz("Hertzko Self Cleaning Slicker Brush for Dogs Cats") },
  { title: "Wahl Clipper Pet-Pro Dog Grooming Kit", description: "Professional-grade heavy duty dog clipper kit", category: "Grooming", species: "dog", store: "Amazon", url: amz("Wahl Clipper Pet Pro Dog Grooming Kit Heavy Duty") },
  { title: "Earthbath Oatmeal & Aloe Pet Shampoo", description: "Soap-free, tearless formula for sensitive skin", category: "Grooming", species: "dog", store: "Amazon", url: amz("Earthbath All Natural Oatmeal Aloe Pet Shampoo Dog") },
  { title: "Safari Professional Nail Trimmer for Dogs", description: "Stainless steel blades with safety stop", category: "Grooming", species: "dog", store: "Amazon", url: amz("Safari Professional Nail Trimmer for Dogs") },
  { title: "Pet MD Dog Ear Cleaner Wipes", description: "Gently cleans and deodorizes dog ears", category: "Grooming", species: "dog", store: "Amazon", url: amz("Pet MD Dog Ear Cleaner Wipes Otic Cleanser") },
  { title: "TropiClean Waterless Dog Shampoo Spray", description: "Clean and deodorize between baths", category: "Grooming", species: "dog", store: "Amazon", url: amz("TropiClean Waterless Dog Shampoo Spray No Rinse") },
  { title: "Andis EasyClip Detect Smart Grooming Clippers", description: "Smart rechargeable dog grooming clipper kit", category: "Grooming", species: "dog", store: "Amazon", url: amz("Andis EasyClip Detect Smart Dog Grooming Clipper Kit") },

  // Accessories
  { title: "Ruffwear Front Range Dog Harness", description: "Everyday harness with padded chest and belly panels", category: "Accessories", species: "dog", store: "Amazon", url: amz("Ruffwear Front Range Dog Harness") },
  { title: "BAAPET Strong Dog Leash with Padded Handle", description: "Heavy duty 5ft leash with comfortable padded handle", category: "Accessories", species: "dog", store: "Amazon", url: amz("BAAPET Strong Dog Leash with Comfortable Padded Handle") },
  { title: "PetSafe Easy Walk Dog Harness", description: "Front-clip harness that discourages pulling", category: "Accessories", species: "dog", store: "Amazon", url: amz("PetSafe Easy Walk Dog Harness No Pull") },
  { title: "Rabbitgoo Dog Harness No-Pull", description: "Adjustable reflective harness with dual leash clips", category: "Accessories", species: "dog", store: "Amazon", url: amz("Rabbitgoo Dog Harness No Pull Adjustable Reflective") },
  { title: "Kurgo Dog Car Safety Harness", description: "Crash-tested, DOT-rated car harness for dogs", category: "Accessories", species: "dog", store: "Amazon", url: amz("Kurgo Tru Fit Enhanced Strength Dog Car Safety Harness") },
  { title: "Frisco Solid Nylon Dog Collar", description: "Durable nylon collar with quick-snap buckle", category: "Accessories", species: "dog", store: "Amazon", url: amz("Frisco Solid Nylon Dog Collar Adjustable") },
  { title: "PetSafe Retractable Dog Leash", description: "Retractable cord leash with one-hand control", category: "Accessories", species: "dog", store: "Amazon", url: amz("PetSafe Retractable Dog Leash Nylon Cord") },
  { title: "Mighty Paw Sports Dog Leash", description: "Lightweight 6ft training leash with traffic handle", category: "Accessories", species: "dog", store: "Amazon", url: amz("Mighty Paw Sports Dog Leash Reflective Traffic Handle") },

  // Beds
  { title: "K&H Pet Products Orthopedic Dog Bed", description: "Veterinarian-approved memory foam dog bed", category: "Beds", species: "dog", store: "Amazon", url: amz("KH Pet Products Orthopedic Lounger Dog Bed") },
  { title: "Furhaven Orthopedic Dog Sofa Bed", description: "Egg crate foam base with plush bolster sides", category: "Beds", species: "dog", store: "Amazon", url: amz("Furhaven Pet Dog Bed Orthopedic Sofa Style Couch") },
  { title: "PetFusion Ultimate Memory Foam Dog Bed", description: "4-inch memory foam base with water-resistant liner", category: "Beds", species: "dog", store: "Amazon", url: amz("PetFusion Ultimate Dog Bed Orthopedic Memory Foam") },
  { title: "Best Friends by Sheri Donut Dog Bed", description: "Luxury shag fur calming donut cuddler bed", category: "Beds", species: "dog", store: "Amazon", url: amz("Best Friends by Sheri Luxury Shag Fur Donut Dog Bed") },
  { title: "Bedsure Large Dog Bed Washable", description: "Machine washable dog bed with removable cover", category: "Beds", species: "dog", store: "Amazon", url: amz("Bedsure Large Dog Bed Washable Non-Slip Waterproof") },
  { title: "MidWest Homes for Pets Deluxe Pet Bed", description: "Soft, washable micro fleece pet bed", category: "Beds", species: "dog", store: "Amazon", url: amz("MidWest Homes for Pets Deluxe Super Plush Pet Bed") },
  { title: "Milliard Premium Orthopedic Dog Bed", description: "Therapeutic memory foam with non-skid bottom", category: "Beds", species: "dog", store: "Amazon", url: amz("Milliard Premium Orthopedic Memory Foam Dog Bed") },

  // ════════════════════════════════════════════════════════════
  // AMAZON — CAT
  // ════════════════════════════════════════════════════════════

  // Food
  { title: "Royal Canin Indoor Adult Dry Cat Food", description: "Tailored nutrition for indoor adult cats", category: "Food", species: "cat", store: "Amazon", url: amz("Royal Canin Indoor Adult Dry Cat Food") },
  { title: "Hill's Science Diet Indoor Dry Cat Food", description: "Supports healthy weight and digestion for indoor cats", category: "Food", species: "cat", store: "Amazon", url: amz("Hills Science Diet Adult Indoor Dry Cat Food Chicken") },
  { title: "Purina Pro Plan Adult Dry Cat Food", description: "High-protein formula with real chicken", category: "Food", species: "cat", store: "Amazon", url: amz("Purina Pro Plan Adult Dry Cat Food Chicken Rice Formula") },
  { title: "Blue Buffalo Indoor Adult Cat Food", description: "Natural dry cat food with LifeSource Bits", category: "Food", species: "cat", store: "Amazon", url: amz("Blue Buffalo Indoor Adult Natural Dry Cat Food Chicken") },
  { title: "Wellness Complete Health Natural Dry Cat Food", description: "Complete and balanced natural cat nutrition", category: "Food", species: "cat", store: "Amazon", url: amz("Wellness Complete Health Natural Dry Cat Food Adult Deboned Chicken") },
  { title: "Taste of the Wild Rocky Mountain Cat Food", description: "Grain free cat food with real roasted venison", category: "Food", species: "cat", store: "Amazon", url: amz("Taste of the Wild Rocky Mountain Grain Free Dry Cat Food") },
  { title: "Iams Adult Indoor Weight & Hairball Care", description: "Helps control weight and reduce hairballs", category: "Food", species: "cat", store: "Amazon", url: amz("Iams Adult Indoor Weight Hairball Care Dry Cat Food") },
  { title: "Purina ONE Indoor Advantage Adult Cat Food", description: "Helps reduce hairballs and maintain ideal weight", category: "Food", species: "cat", store: "Amazon", url: amz("Purina ONE Indoor Advantage Adult Cat Food Hairball") },
  { title: "Natural Balance L.I.D. Dry Cat Food", description: "Limited ingredient diet for cats with sensitivities", category: "Food", species: "cat", store: "Amazon", url: amz("Natural Balance LID Limited Ingredient Adult Dry Cat Food") },
  { title: "Merrick Purrfect Bistro Grain Free Cat Food", description: "Real deboned chicken as the first ingredient", category: "Food", species: "cat", store: "Amazon", url: amz("Merrick Purrfect Bistro Grain Free Real Chicken Dry Cat Food") },

  // Treats
  { title: "Temptations Classic Crunchy Cat Treats", description: "Crunchy outside, soft inside — irresistible for cats", category: "Treats", species: "cat", store: "Amazon", url: amz("Temptations Classic Crunchy and Soft Cat Treats Tempting Tuna Flavor") },
  { title: "Greenies Feline Dental Cat Treats", description: "Fights tartar buildup and freshens breath", category: "Treats", species: "cat", store: "Amazon", url: amz("Greenies Feline Dental Cat Treats Oven Roasted Chicken") },
  { title: "Wellness Kittles Grain Free Cat Treats", description: "Crunchy treats with real salmon and cranberries", category: "Treats", species: "cat", store: "Amazon", url: amz("Wellness Kittles Grain Free Natural Crunchy Cat Treats Salmon") },
  { title: "Inaba Churu Lickable Cat Treats", description: "Grain-free squeezable purée cats absolutely love", category: "Treats", species: "cat", store: "Amazon", url: amz("Inaba Churu Cat Treats Grain Free Lickable Squeezable Creamy Puree") },
  { title: "PureBites Freeze Dried Cat Treats", description: "Single ingredient freeze-dried chicken breast", category: "Treats", species: "cat", store: "Amazon", url: amz("PureBites Chicken Breast Freeze Dried Raw Cat Treats") },
  { title: "Purina Fancy Feast Savory Cravings Treats", description: "Tender morsels made with real tuna", category: "Treats", species: "cat", store: "Amazon", url: amz("Purina Fancy Feast Savory Cravings Limited Ingredient Cat Treats Tuna") },
  { title: "Blue Wilderness High Protein Cat Treats", description: "Grain free crunchy treats with real salmon", category: "Treats", species: "cat", store: "Amazon", url: amz("Blue Wilderness High Protein Grain Free Natural Adult Dry Cat Treats") },
  { title: "Halo Liv-A-Littles Grain Free Cat Treats", description: "100% non-GMO freeze-dried chicken treats", category: "Treats", species: "cat", store: "Amazon", url: amz("Halo Liv A Littles Grain Free Natural Cat Treats Chicken") },

  // Toys
  { title: "KONG Cat Naturals Crinkle Fish", description: "Crinkle fish filled with catnip for natural play", category: "Toys", species: "cat", store: "Amazon", url: amz("KONG Cat Naturals Crinkle Fish Cat Toy Catnip") },
  { title: "Petstages Tower of Tracks Cat Toy", description: "3-level interactive track toy with spinning balls", category: "Toys", species: "cat", store: "Amazon", url: amz("Petstages Tower of Tracks Interactive Cat Toy") },
  { title: "SmartyKat Hot Pursuit Cat Toy", description: "Electronic concealed motion toy simulates hidden prey", category: "Toys", species: "cat", store: "Amazon", url: amz("SmartyKat Hot Pursuit Electronic Concealed Motion Cat Toy") },
  { title: "PetFusion 3-Sided Cat Scratcher Lounge", description: "Reversible scratch surface with premium cardboard", category: "Toys", species: "cat", store: "Amazon", url: amz("PetFusion 3 Sided Vertical Cat Scratcher Lounge") },
  { title: "Cat Dancer Rainbow Cat Teaser Wand Toy", description: "Best-selling interactive wand toy for cats", category: "Toys", species: "cat", store: "Amazon", url: amz("Cat Dancer Rainbow Cat Charmer Teaser Wand Toy") },
  { title: "Bergan Turbo Scratcher Cat Toy", description: "Corrugated cardboard scratcher with spinning ball track", category: "Toys", species: "cat", store: "Amazon", url: amz("Bergan Turbo Scratcher Cat Toy") },
  { title: "Jackson Galaxy Air Prey Wand Cat Toy", description: "Designed by cat behaviorist Jackson Galaxy", category: "Toys", species: "cat", store: "Amazon", url: amz("Jackson Galaxy Air Prey Wand Cat Toy") },
  { title: "Frisco Butterfly Cat Toy", description: "Electronic spinning butterfly attracts curious cats", category: "Toys", species: "cat", store: "Amazon", url: amz("Frisco Butterfly Spinning Cat Toy Electronic Interactive") },

  // Health
  { title: "Purina FortiFlora Cat Probiotic Supplement", description: "Veterinarian recommended probiotic for digestive health", category: "Health", species: "cat", store: "Amazon", url: amz("Purina FortiFlora Cat Probiotic Supplement") },
  { title: "Frontline Plus Flea & Tick Treatment for Cats", description: "Monthly flea & tick protection for cats 1.5 lbs+", category: "Health", species: "cat", store: "Amazon", url: amz("Frontline Plus Flea and Tick Treatment for Cats") },
  { title: "Nutri-Vet Cat Hairball Support Paw-Gel", description: "Lubricating gel to help cats pass hairballs naturally", category: "Health", species: "cat", store: "Amazon", url: amz("Nutri-Vet Hairball Support Paw-Gel for Cats") },
  { title: "Zesty Paws Multivitamin for Cats", description: "8-in-1 cat chewable multivitamin with omega fatty acids", category: "Health", species: "cat", store: "Amazon", url: amz("Zesty Paws Multivitamin for Cats 8 in 1 Cat Supplement") },
  { title: "TropiClean Fresh Breath Water Additive for Cats", description: "Fights plaque and tartar — just add to water bowl", category: "Health", species: "cat", store: "Amazon", url: amz("TropiClean Fresh Breath Water Additive for Cats") },
  { title: "Virbac C.E.T. Enzymatic Cat Toothpaste", description: "Enzymatic toothpaste in a flavor cats love", category: "Health", species: "cat", store: "Amazon", url: amz("Virbac CET Enzymatic Toothpaste for Cats Malt Flavor") },
  { title: "Vet's Best Flea & Tick Spray for Cats", description: "Plant-based formula safe for cats 12 weeks+", category: "Health", species: "cat", store: "Amazon", url: amz("Vets Best Flea and Tick Spray for Cats Natural") },

  // Grooming
  { title: "FURminator Short Hair Cat Deshedding Tool", description: "Reduces shedding by up to 90% with regular use", category: "Grooming", species: "cat", store: "Amazon", url: amz("FURminator Short Hair Cat Deshedding Tool Large") },
  { title: "Hertzko Self Cleaning Slicker Brush for Cats", description: "Removes loose fur and tangles painlessly", category: "Grooming", species: "cat", store: "Amazon", url: amz("Hertzko Self Cleaning Slicker Brush for Cats Dogs") },
  { title: "Burt's Bees Hypoallergenic Cat Shampoo", description: "Gentle formula with shea butter and honey", category: "Grooming", species: "cat", store: "Amazon", url: amz("Burts Bees Hypoallergenic Shampoo for Cats") },
  { title: "Earthbath All Natural Cat Shampoo", description: "Soap-free, tearless formula safe for cats", category: "Grooming", species: "cat", store: "Amazon", url: amz("Earthbath All Natural Cat Shampoo Gentle Conditioner") },
  { title: "Pet MD Cat Ear Cleaner Wipes", description: "Pre-soaked pads for gentle ear cleaning", category: "Grooming", species: "cat", store: "Amazon", url: amz("Pet MD Cat Ear Cleaner Wipes Otic Cleanser") },
  { title: "Safari Self-Cleaning Slicker Cat Brush", description: "Retractable pins for easy fur removal", category: "Grooming", species: "cat", store: "Amazon", url: amz("Safari Self Cleaning Slicker Brush for Cats") },

  // Accessories
  { title: "Catit Flower Cat Water Fountain", description: "Triple-action filter, 3-liter capacity fountain", category: "Accessories", species: "cat", store: "Amazon", url: amz("Catit Flower Plastic Cat Water Fountain") },
  { title: "PetSafe ScoopFree Self-Cleaning Litter Box", description: "Automatic litter box with disposable trays", category: "Accessories", species: "cat", store: "Amazon", url: amz("PetSafe ScoopFree Automatic Self-Cleaning Cat Litter Box") },
  { title: "AmazonBasics No-Spill Cat Food & Water Bowl", description: "Stainless steel non-spill pet bowl set", category: "Accessories", species: "cat", store: "Amazon", url: amz("AmazonBasics Stainless Steel Non Spill Pet Bowl Cat") },
  { title: "Kitty Cot World's Best Cat Window Perch", description: "Suction cup window seat holds up to 50 lbs", category: "Accessories", species: "cat", store: "Amazon", url: amz("Kitty Cot Worlds Best Cat Perch Window Mounted") },
  { title: "Petmate Arm & Hammer Large Litter Pan", description: "Baking soda crystals built into the pan for odor control", category: "Accessories", species: "cat", store: "Amazon", url: amz("Petmate Arm Hammer Large Litter Pan Antimicrobial") },
  { title: "AmazonBasics Cat Activity Tree Tower", description: "Multi-tier cat condo with scratching posts", category: "Accessories", species: "cat", store: "Amazon", url: amz("AmazonBasics Cat Activity Tree Tower Condo") },
  { title: "Frisco Wooden Cat Litter Box Enclosure", description: "Stylish hidden litter box furniture cabinet", category: "Accessories", species: "cat", store: "Amazon", url: amz("Frisco Wooden Cat Litter Box Enclosure Cabinet") },

  // Beds
  { title: "K&H Pet Products Heated Indoor Cat Bed", description: "Thermostatically controlled heated cat bed", category: "Beds", species: "cat", store: "Amazon", url: amz("KH Pet Products Thermo Kitty Heated Indoor Cat Bed") },
  { title: "Furhaven Cat Bed Plush Orthopedic", description: "Ultra plush orthopedic foam cat sofa bed", category: "Beds", species: "cat", store: "Amazon", url: amz("Furhaven Pet Cat Bed Plush Orthopedic Sofa Style Couch") },
  { title: "Bedsure Cat Bed for Indoor Cats", description: "Machine washable round cat cushion with anti-slip bottom", category: "Beds", species: "cat", store: "Amazon", url: amz("Bedsure Cat Bed for Indoor Cats Washable Round") },
  { title: "Best Friends by Sheri Donut Cat Bed", description: "Self-warming luxury shag donut cuddler for cats", category: "Beds", species: "cat", store: "Amazon", url: amz("Best Friends by Sheri Luxury Shag Donut Cat Bed Calming") },
  { title: "PETPET Cat Hammock Bed Window Mounted", description: "Suction cup hammock bed with washable fleece pad", category: "Beds", species: "cat", store: "Amazon", url: amz("PETPET Cat Hammock Bed Window Mounted Suction Cup") },
  { title: "Aspen Pet Round Cuddler Cat Bed", description: "Soft round bolster bed for cats", category: "Beds", species: "cat", store: "Amazon", url: amz("Aspen Pet Round Cuddler Pet Bed Cat") },

  // ════════════════════════════════════════════════════════════
  // CHEWY — DOG
  // ════════════════════════════════════════════════════════════

  // Food
  { title: "Orijen Original Dry Dog Food", description: "Biologically appropriate, 85% quality animal ingredients", category: "Food", species: "dog", store: "Chewy", url: chewy("Orijen Original Dry Dog Food") },
  { title: "Acana Regionals Wild Atlantic Dry Dog Food", description: "Grain free recipe with wild-caught Atlantic fish", category: "Food", species: "dog", store: "Chewy", url: chewy("Acana Regionals Wild Atlantic Dry Dog Food") },
  { title: "Canidae Pure Real Salmon & Sweet Potato", description: "Limited ingredient diet with 7 wholesome ingredients", category: "Food", species: "dog", store: "Chewy", url: chewy("Canidae Pure Real Salmon Sweet Potato Dry Dog Food") },
  { title: "Solid Gold Wolf King Dry Dog Food", description: "Bison & brown rice recipe for large breed dogs", category: "Food", species: "dog", store: "Chewy", url: chewy("Solid Gold Wolf King Bison Brown Rice Dry Dog Food") },
  { title: "Rachael Ray Nutrish Zero Grain Natural Dog Food", description: "Grain free recipe with U.S. farm-raised chicken", category: "Food", species: "dog", store: "Chewy", url: chewy("Rachael Ray Nutrish Zero Grain Natural Dry Dog Food Chicken") },
  { title: "Nature's Recipe Easy to Digest Dry Dog Food", description: "Rice & barley recipe that's gentle on the stomach", category: "Food", species: "dog", store: "Chewy", url: chewy("Natures Recipe Easy to Digest Dry Dog Food Chicken Rice") },
  { title: "Purina Pro Plan Sport 30/20 Dry Dog Food", description: "High performance formula for active adult dogs", category: "Food", species: "dog", store: "Chewy", url: chewy("Purina Pro Plan Sport 30 20 High Protein Dry Dog Food") },
  { title: "Hill's Science Diet Large Breed Dog Food", description: "Clinically proven benefits for large breed adults", category: "Food", species: "dog", store: "Chewy", url: chewy("Hills Science Diet Adult Large Breed Dry Dog Food Chicken Barley") },
  { title: "Blue Buffalo Wilderness High Protein Dry Dog Food", description: "Grain free, high protein Rocky Mountain recipe", category: "Food", species: "dog", store: "Chewy", url: chewy("Blue Buffalo Wilderness High Protein Grain Free Natural Adult Dry Dog Food") },
  { title: "Royal Canin Breed Health Labrador Dry Dog Food", description: "Precisely formulated for Labrador Retrievers", category: "Food", species: "dog", store: "Chewy", url: chewy("Royal Canin Breed Health Nutrition Labrador Retriever Adult Dry Dog Food") },

  // Treats
  { title: "Zuke's Mini Naturals Hip & Joint Dog Treats", description: "Soft training treats with glucosamine and chondroitin", category: "Treats", species: "dog", store: "Chewy", url: chewy("Zukes Mini Naturals Hip Joint Dog Treats") },
  { title: "Merrick Power Bites Real Beef Recipe Treats", description: "Soft, chewy treats with real deboned beef", category: "Treats", species: "dog", store: "Chewy", url: chewy("Merrick Power Bites Real Texas Beef Recipe Soft Chewy Dog Treats") },
  { title: "Redbarn Naturals Bully Springs Dog Chews", description: "Long-lasting all-natural bully stick chews", category: "Treats", species: "dog", store: "Chewy", url: chewy("Redbarn Naturals Bully Springs Dog Chews") },
  { title: "SmartBones SmartChips Chews for Dogs", description: "Rawhide-free dental chews with real chicken", category: "Treats", species: "dog", store: "Chewy", url: chewy("SmartBones SmartChips Chews for Dogs Chicken") },
  { title: "Dogswell Hip & Joint Dog Treats", description: "Soft jerky treats with glucosamine and chondroitin", category: "Treats", species: "dog", store: "Chewy", url: chewy("Dogswell Hip Joint Dog Treats Chicken Breast") },
  { title: "Cloud Star Buddy Biscuits Dog Treats", description: "Oven baked treats with peanut butter & banana", category: "Treats", species: "dog", store: "Chewy", url: chewy("Cloud Star Buddy Biscuits Soft Chewy Dog Treats Peanut Butter Banana") },
  { title: "Wellness Soft WellBites Chewy Dog Treats", description: "Grain free soft bites with real lamb", category: "Treats", species: "dog", store: "Chewy", url: chewy("Wellness Soft WellBites Grain Free Natural Chewy Dog Treats Lamb") },
  { title: "Blue Buffalo Blue Bits Training Treats", description: "Tender training bites with real chicken", category: "Treats", species: "dog", store: "Chewy", url: chewy("Blue Buffalo Blue Bits Soft Moist Training Dog Treats Chicken") },

  // Toys
  { title: "KONG Extreme Dog Toy", description: "Ultra-durable black rubber for the toughest chewers", category: "Toys", species: "dog", store: "Chewy", url: chewy("KONG Extreme Dog Toy") },
  { title: "Chuckit! Ultra Ball Dog Toy", description: "High-bounce natural rubber ball for fetch", category: "Toys", species: "dog", store: "Chewy", url: chewy("Chuckit Ultra Ball Dog Toy") },
  { title: "Nylabone Dura Chew Power Chew Dog Toy", description: "Bacon-flavored tough chew for power chewers", category: "Toys", species: "dog", store: "Chewy", url: chewy("Nylabone Dura Chew Power Chew Dog Toy Bacon") },
  { title: "West Paw Zogoflex Zisc Flying Disc Dog Toy", description: "Floatable flying disc that's safe for fetch", category: "Toys", species: "dog", store: "Chewy", url: chewy("West Paw Zogoflex Zisc Flying Disc Dog Toy") },
  { title: "Ruffwear Hydro Plane Floating Disc", description: "Soft floating disc for water-loving dogs", category: "Toys", species: "dog", store: "Chewy", url: chewy("Ruffwear Hydro Plane Floating Disc Dog Toy") },
  { title: "Frisco Plush Squeaking Ring Dog Toy", description: "Colorful squeaky ring plush toy", category: "Toys", species: "dog", store: "Chewy", url: chewy("Frisco Plush Squeaking Multicolor Ring Dog Toy") },
  { title: "Mammoth Flossy Chews Rope Tug Dog Toy", description: "Cotton blend rope toy for tug-of-war and fetching", category: "Toys", species: "dog", store: "Chewy", url: chewy("Mammoth Flossy Chews Cottonblend Rope Tug Dog Toy") },
  { title: "Outward Hound Nina Ottosson Dog Puzzle", description: "Interactive treat puzzle to stimulate mental activity", category: "Toys", species: "dog", store: "Chewy", url: chewy("Outward Hound Nina Ottosson Dog Puzzle Interactive") },

  // Health
  { title: "Nutramax Cosequin Maximum Strength Joint Supplement", description: "The #1 vet-recommended joint health supplement brand", category: "Health", species: "dog", store: "Chewy", url: chewy("Nutramax Cosequin Maximum Strength Joint Supplement Dog") },
  { title: "VetriScience Canine Plus Multivitamin", description: "Complete daily multivitamin for dogs of all ages", category: "Health", species: "dog", store: "Chewy", url: chewy("VetriScience Canine Plus Multivitamin Dog Supplement") },
  { title: "Zesty Paws Omega Bites for Dogs", description: "Omega-3 6 9 support for skin, coat and joints", category: "Health", species: "dog", store: "Chewy", url: chewy("Zesty Paws Omega Bites for Dogs Skin Coat") },
  { title: "TropiClean Dental Health Solution for Dogs", description: "No brush dental care — just add to water", category: "Health", species: "dog", store: "Chewy", url: chewy("TropiClean Dental Health Solution for Dogs Water Additive") },
  { title: "Vetri-Lysine Plus Immune Support for Dogs", description: "L-Lysine immune support supplement in tasty chews", category: "Health", species: "dog", store: "Chewy", url: chewy("VetriScience Vetri Lysine Plus Immune Support Dog Supplement") },
  { title: "Virbac CET Oral Hygiene Chews for Dogs", description: "Dual enzyme system cleans teeth between brushings", category: "Health", species: "dog", store: "Chewy", url: chewy("Virbac CET Oral Hygiene Chews for Dogs") },
  { title: "PetArmor Plus Flea & Tick Prevention Dogs", description: "Fast-acting waterproof flea & tick protection", category: "Health", species: "dog", store: "Chewy", url: chewy("PetArmor Plus Flea Tick Prevention for Dogs") },
  { title: "Bravecto Chews for Dogs Flea & Tick", description: "12-week flea & tick protection in one chewable", category: "Health", species: "dog", store: "Chewy", url: chewy("Bravecto Chews for Dogs Flea Tick") },

  // Grooming
  { title: "FURminator Long Hair Dog Deshedding Tool", description: "Reaches through topcoat to remove undercoat shed", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Furminator Long Hair Dog Deshedding Tool") },
  { title: "Andis Excel 5-Speed Detachable Blade Clipper", description: "Professional-grade rotary motor clipper for dogs", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Andis Excel 5 Speed Detachable Blade Clipper Dog") },
  { title: "Wahl Professional Animal Bravura Lithium Clipper", description: "Cordless rechargeable clipper for all coat types", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Wahl Professional Animal Bravura Lithium Ion Clipper Dog") },
  { title: "Bio-Groom Super White Dog Shampoo", description: "Brightening shampoo for white and light-coated dogs", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Bio Groom Super White Dog Shampoo") },
  { title: "TropiClean Luxury 2 in 1 Dog Shampoo", description: "Gentle papaya & coconut shampoo and conditioner", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Tropiclean Luxury 2 in 1 Papaya Coconut Dog Shampoo") },
  { title: "Pet Silk Pacific Mist Dog Grooming Spray", description: "Detangling, conditioning and dematting spray", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Pet Silk Pacific Mist Dog Grooming Spray Detangler") },
  { title: "Oster Professional Turbo A5 2-Speed Clipper", description: "Quiet, powerful 2-speed professional dog clipper", category: "Grooming", species: "dog", store: "Chewy", url: chewy("Oster Professional Turbo A5 2 Speed Animal Clipper Dog") },

  // Accessories
  { title: "Ruffwear Approach Dog Pack", description: "Lightweight hiking pack with saddlebag design", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Ruffwear Approach Dog Pack Backpack") },
  { title: "EzyDog Quick Fit Dog Harness", description: "Reflective, easy-clip chest harness for daily walks", category: "Accessories", species: "dog", store: "Chewy", url: chewy("EzyDog Quick Fit Dog Harness Reflective") },
  { title: "Frisco Steel Double Door Dog Crate", description: "Heavy gauge steel crate with two doors", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Frisco Steel Double Door Collapsible Wire Dog Crate") },
  { title: "Solvit PupSTEP Plus Pet Stairs", description: "Foldable pet stairs for bed and couch access", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Solvit PupSTEP Plus Pet Stairs") },
  { title: "PetSafe Deluxe Telescoping Pet Gate", description: "Extra tall walk-through gate for large openings", category: "Accessories", species: "dog", store: "Chewy", url: chewy("PetSafe Deluxe Telescoping Dog Gate Walk Through") },
  { title: "Petmate Sky Kennel Airline Dog Crate", description: "Airline approved travel crate with metal hardware", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Petmate Sky Kennel Airline Approved Dog Travel Crate") },
  { title: "Carlson Extra Tall Walk Through Pet Gate", description: "One-touch safety gate with pet door", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Carlson Extra Tall Walk Through Pet Gate with Door Dog") },
  { title: "Kurgo Dog Backpack for Hiking", description: "Reflective dog hiking pack with multiple pockets", category: "Accessories", species: "dog", store: "Chewy", url: chewy("Kurgo Dog Backpack Hiking Pack Reflective") },

  // Beds
  { title: "Orvis Toughchew Bolster Dog Bed", description: "Durable canvas cover with polyfill bolsters", category: "Beds", species: "dog", store: "Chewy", url: chewy("Orvis Toughchew Bolster Dog Bed") },
  { title: "FurHaven Plush & Suede Orthopedic Dog Sofa Bed", description: "Plush suede sofa-style orthopedic foam bed", category: "Beds", species: "dog", store: "Chewy", url: chewy("Furhaven Plush Suede Orthopedic Dog Sofa Bed") },
  { title: "Casper Dog Bed", description: "Memory foam dog bed engineered for sleep", category: "Beds", species: "dog", store: "Chewy", url: chewy("Casper Dog Bed Memory Foam") },
  { title: "Serta Perfect Sleeper Dog Bed", description: "Premium orthopedic dog bed with quilted cover", category: "Beds", species: "dog", store: "Chewy", url: chewy("Serta Perfect Sleeper Premium Orthopedic Dog Bed") },
  { title: "Molly Mutt Dog Bed Duvet Cover", description: "Stuff-it-yourself dog bed cover — fill with old clothes", category: "Beds", species: "dog", store: "Chewy", url: chewy("Molly Mutt Dog Bed Duvet Cover") },
  { title: "P.L.A.Y. Snuggle Bed for Dogs", description: "Reversible eco-friendly snuggle nest dog bed", category: "Beds", species: "dog", store: "Chewy", url: chewy("PLAY Snuggle Bed for Dogs Reversible") },
  { title: "Frisco Eyelash Plush Orthopedic Dog Bed", description: "Plush orthopedic dog bed with removable cover", category: "Beds", species: "dog", store: "Chewy", url: chewy("Frisco Eyelash Plush Orthopedic Dog Bed") },

  // ════════════════════════════════════════════════════════════
  // CHEWY — CAT
  // ════════════════════════════════════════════════════════════

  // Food
  { title: "Orijen Cat & Kitten Grain Free Dry Cat Food", description: "85% quality animal ingredients in every bag", category: "Food", species: "cat", store: "Chewy", url: chewy("Orijen Cat Kitten Grain Free Dry Cat Food") },
  { title: "Acana Regionals Meadowland Dry Cat Food", description: "Grain free recipe with regionally sourced poultry", category: "Food", species: "cat", store: "Chewy", url: chewy("Acana Regionals Meadowland Dry Cat Food") },
  { title: "Canidae Pure Real Salmon Cat Food", description: "Limited ingredient diet with wild-caught salmon", category: "Food", species: "cat", store: "Chewy", url: chewy("Canidae Pure Real Salmon Limited Ingredient Dry Cat Food") },
  { title: "Ziwi Peak Air Dried Cat Food", description: "Air-dried raw nutrition — ethical, natural ingredients", category: "Food", species: "cat", store: "Chewy", url: chewy("Ziwi Peak Air Dried Cat Food") },
  { title: "Blue Buffalo Tastefuls Natural Adult Cat Food", description: "Natural dry cat food with garden vegetables", category: "Food", species: "cat", store: "Chewy", url: chewy("Blue Buffalo Tastefuls Natural Adult Dry Cat Food Chicken") },
  { title: "Hill's Science Diet Urinary Hairball Control", description: "Reduces hairballs and supports urinary health", category: "Food", species: "cat", store: "Chewy", url: chewy("Hills Science Diet Adult Urinary Hairball Control Dry Cat Food") },
  { title: "Royal Canin Indoor Adult Cat Food Chewy", description: "Tailored nutrition to support indoor cat health", category: "Food", species: "cat", store: "Chewy", url: chewy("Royal Canin Indoor Adult Dry Cat Food") },
  { title: "Purina Pro Plan Savor Adult Cat Food", description: "Shredded blend with real chicken and rice", category: "Food", species: "cat", store: "Chewy", url: chewy("Purina Pro Plan Savor Adult Dry Cat Food Chicken Rice") },
  { title: "Wellness Complete Health Adult Cat Food", description: "Balanced natural nutrition with deboned turkey", category: "Food", species: "cat", store: "Chewy", url: chewy("Wellness Complete Health Natural Adult Dry Cat Food Turkey") },
  { title: "Merrick Purrfect Bistro Grain Free Cat Food", description: "Deboned chicken first ingredient, grain free", category: "Food", species: "cat", store: "Chewy", url: chewy("Merrick Purrfect Bistro Grain Free Dry Cat Food Chicken") },

  // Treats
  { title: "Temptations MixUps Crunchy Cat Treats", description: "A mix of flavors cats can't resist", category: "Treats", species: "cat", store: "Chewy", url: chewy("Temptations MixUps Crunchy Cat Treats Catnip Fever") },
  { title: "Inaba Churu Squeeze-Up Cat Treats", description: "Creamy lickable treats in a squeezable tube", category: "Treats", species: "cat", store: "Chewy", url: chewy("Inaba Churu Squeeze Up Cat Treats Tuna Chicken") },
  { title: "Fancy Feast Savory Cravings Cat Treats", description: "Tender morsels in real tuna and chicken flavors", category: "Treats", species: "cat", store: "Chewy", url: chewy("Purina Fancy Feast Savory Cravings Cat Treats") },
  { title: "Greenies Feline Dental Cat Treats Chewy", description: "Crunchy dental treats for daily teeth cleaning", category: "Treats", species: "cat", store: "Chewy", url: chewy("Greenies Feline Dental Cat Treats Oven Roasted Chicken") },
  { title: "Blue Wilderness High Protein Cat Treats Chewy", description: "Grain free treats with real wild-caught salmon", category: "Treats", species: "cat", store: "Chewy", url: chewy("Blue Buffalo Wilderness High Protein Grain Free Cat Treats Salmon") },
  { title: "PureBites Freeze Dried Cat Treats Chewy", description: "100% pure chicken breast — nothing else added", category: "Treats", species: "cat", store: "Chewy", url: chewy("PureBites Freeze Dried Raw Cat Treats Chicken Breast") },
  { title: "Wellness Kittles Natural Cat Treats Chewy", description: "Grain free crunchy treats with real tuna", category: "Treats", species: "cat", store: "Chewy", url: chewy("Wellness Kittles Natural Grain Free Cat Treats Tuna Cranberry") },
  { title: "Friskies Party Mix Original Cat Treats", description: "Crunchy, colorful treats with a variety of flavors", category: "Treats", species: "cat", store: "Chewy", url: chewy("Friskies Party Mix Original Crunch Cat Treats") },

  // Toys
  { title: "KONG Cat Active Feather Teaser Toy", description: "Enticing feather toy for interactive cat play", category: "Toys", species: "cat", store: "Chewy", url: chewy("KONG Cat Active Feather Teaser Cat Toy") },
  { title: "Frisco Colorful Springs Cat Toy", description: "Pack of colorful coil springs cats love to bat", category: "Toys", species: "cat", store: "Chewy", url: chewy("Frisco Colorful Springs Cat Toy") },
  { title: "PetSafe SlimCat Interactive Feeder Ball", description: "Treat-dispensing ball that makes cats work for food", category: "Toys", species: "cat", store: "Chewy", url: chewy("PetSafe SlimCat Interactive Feeder Cat Toy Ball") },
  { title: "SmartyKat Skitter Critters Catnip Cat Toy", description: "Realistic furry mice filled with catnip", category: "Toys", species: "cat", store: "Chewy", url: chewy("SmartyKat Skitter Critters Catnip Cat Toy Mice") },
  { title: "Frisco 48-in Cat Tree & Condo", description: "Multi-level cat tree with hammock and scratching posts", category: "Toys", species: "cat", store: "Chewy", url: chewy("Frisco 48 in Cat Tree Condo Scratcher Post") },
  { title: "GoCat Da Bee Feather Wand Cat Toy", description: "Handcrafted wand toy with feather bee attachment", category: "Toys", species: "cat", store: "Chewy", url: chewy("GoCat Da Bee Feather Wand Cat Toy") },
  { title: "Petstages Tower of Tracks Cat Toy Chewy", description: "3-level interactive ball track toy", category: "Toys", species: "cat", store: "Chewy", url: chewy("Petstages Tower of Tracks Interactive Cat Toy") },
  { title: "Bergan Turbo Scratcher Cat Toy Chewy", description: "Spinning ball track with corrugated cardboard scratcher", category: "Toys", species: "cat", store: "Chewy", url: chewy("Bergan Turbo Scratcher Cat Toy Spinning Ball") },

  // Health
  { title: "Purina FortiFlora Cat Probiotic Chewy", description: "Probiotic supplement for intestinal health", category: "Health", species: "cat", store: "Chewy", url: chewy("Purina Pro Plan Veterinary Supplements FortiFlora Cat Probiotic") },
  { title: "Vetri-Science Nu-Cat Senior Multivitamin", description: "Complete multivitamin for senior cats", category: "Health", species: "cat", store: "Chewy", url: chewy("VetriScience Nu Cat Senior Multivitamin for Cats") },
  { title: "Frontline Plus Flea & Tick for Cats Chewy", description: "Kills fleas and ticks fast — 30-day protection", category: "Health", species: "cat", store: "Chewy", url: chewy("Frontline Plus Flea Tick Treatment for Cats") },
  { title: "TropiClean Fresh Breath Dental Cat Chewy", description: "Water additive for cat dental health", category: "Health", species: "cat", store: "Chewy", url: chewy("TropiClean Fresh Breath Dental Health Solution for Cats") },
  { title: "Zesty Paws Hairball Support Bites for Cats", description: "Digestive enzymes to help cats pass hairballs", category: "Health", species: "cat", store: "Chewy", url: chewy("Zesty Paws Hairball Support Bites for Cats") },
  { title: "Vetri-Lysine Plus Immune Support for Cats", description: "L-Lysine support for feline respiratory health", category: "Health", species: "cat", store: "Chewy", url: chewy("VetriScience Vetri Lysine Plus Immune Support Cat Supplement") },
  { title: "Revolution Topical Flea & Tick for Cats", description: "Monthly topical prevention for fleas, ticks and heartworm", category: "Health", species: "cat", store: "Chewy", url: chewy("Revolution Topical Solution for Cats Flea Tick Heartworm") },

  // Grooming
  { title: "FURminator Long Hair Cat Deshedding Tool Chewy", description: "Reduces cat shedding up to 90% with regular use", category: "Grooming", species: "cat", store: "Chewy", url: chewy("Furminator Long Hair Cat Deshedding Tool") },
  { title: "Wahl Professional Lithium Clipper for Cats", description: "Cordless rechargeable cat grooming clipper", category: "Grooming", species: "cat", store: "Chewy", url: chewy("Wahl Professional Animal Lithium Ion Clipper Cat") },
  { title: "TropiClean Shed Control Cat Shampoo", description: "Reduces shedding with omega-3 enriched formula", category: "Grooming", species: "cat", store: "Chewy", url: chewy("TropiClean Luxury Shed Control Cat Shampoo") },
  { title: "Vet's Best Waterless Dry Cat Shampoo", description: "No rinse dry shampoo spray for cats", category: "Grooming", species: "cat", store: "Chewy", url: chewy("Vets Best Waterless No Rinse Dry Shampoo for Cats") },
  { title: "Safari Self-Cleaning Slicker Cat Brush Chewy", description: "Easy-clean retractable pin slicker brush", category: "Grooming", species: "cat", store: "Chewy", url: chewy("Safari Self Cleaning Slicker Brush for Cats") },
  { title: "Pet MD Cat Ear Cleaner Wipes Chewy", description: "Pre-soaked aloe vera ear cleaning pads", category: "Grooming", species: "cat", store: "Chewy", url: chewy("Pet MD Cat Ear Cleaner Wipes Otic Cleanser") },

  // Accessories
  { title: "PetSafe ScoopFree Self-Cleaning Litter Box Chewy", description: "Automatic litter box with crystal litter trays", category: "Accessories", species: "cat", store: "Chewy", url: chewy("PetSafe ScoopFree Automatic Self Cleaning Cat Litter Box") },
  { title: "Catit Pixi Smart Feeder for Cats", description: "Wi-Fi enabled automatic cat food dispenser", category: "Accessories", species: "cat", store: "Chewy", url: chewy("Catit Pixi Smart Feeder for Cats WiFi") },
  { title: "Frisco 72-in Cat Tree Tower Condo", description: "Tall cat tree with multiple condos and hammock", category: "Accessories", species: "cat", store: "Chewy", url: chewy("Frisco 72 in Cat Tree Tower Condo Hammock") },
  { title: "PetSafe Simply Clean Self-Cleaning Litter Box", description: "Continuous cleaning conveyor litter box", category: "Accessories", species: "cat", store: "Chewy", url: chewy("PetSafe Simply Clean Self Cleaning Cat Litter Box") },
  { title: "Frisco Cat Tunnel Toy", description: "Crinkle tunnel with dangling ball toy for cats", category: "Accessories", species: "cat", store: "Chewy", url: chewy("Frisco Collapsible Crinkle Cat Tunnel Toy") },
  { title: "Cat Mate C500 Automatic Pet Feeder", description: "5-meal automatic feeder with ice pack compartment", category: "Accessories", species: "cat", store: "Chewy", url: chewy("Cat Mate C500 Automatic Pet Feeder for Cats") },
  { title: "Trixie Pet Products Cat Scratching Post Chewy", description: "Sisal scratching post with base for stability", category: "Accessories", species: "cat", store: "Chewy", url: chewy("Trixie Pet Products Scratching Post for Cats Sisal") },

  // Beds
  { title: "FurHaven Velvet Waves Cat Sofa Bed", description: "Soft velvet waves sofa-style cat bed", category: "Beds", species: "cat", store: "Chewy", url: chewy("Furhaven Velvet Waves Cat Sofa Bed") },
  { title: "K&H Pet Products Thermo-Kitty Heated Cat Bed", description: "Self-warming heated cat bed with removable heater", category: "Beds", species: "cat", store: "Chewy", url: chewy("KH Pet Products Thermo Kitty Heated Indoor Cat Bed") },
  { title: "Frisco Eyelash Fur Bolster Cat Bed Chewy", description: "Eyelash fur cat bed with removable bolster", category: "Beds", species: "cat", store: "Chewy", url: chewy("Frisco Eyelash Fur Bolster Cat Bed") },
  { title: "Best Friends by Sheri Donut Cat Bed Chewy", description: "Luxury calming donut shag cat bed", category: "Beds", species: "cat", store: "Chewy", url: chewy("Best Friends by Sheri Luxury Shag Donut Cat Bed") },
  { title: "MidWest Homes for Pets Cat Bed Chewy", description: "Machine washable micro fleece pet bed", category: "Beds", species: "cat", store: "Chewy", url: chewy("MidWest Homes for Pets Deluxe Super Plush Cat Bed") },
  { title: "PetFusion Cat Scratcher Lounge Chewy", description: "Reversible scratch surface lounge with catnip", category: "Beds", species: "cat", store: "Chewy", url: chewy("PetFusion Cat Scratcher Lounge Reversible Cardboard Catnip") },

];

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

async function seed() {
  const col = db.collection("featured_products");

  // Delete all existing products first (clean slate)
  console.log("🗑  Deleting existing featured_products...");
  const existing = await col.get();
  const deleteChunks = [];
  for (let i = 0; i < existing.docs.length; i += 400) {
    deleteChunks.push(existing.docs.slice(i, i + 400));
  }
  for (const chunk of deleteChunks) {
    const batch = db.batch();
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`   Deleted ${existing.size} existing products.`);

  // Upload new products in batches of 400
  console.log(`📦  Uploading ${PRODUCTS.length} products...`);
  const chunks = [];
  for (let i = 0; i < PRODUCTS.length; i += 400) {
    chunks.push(PRODUCTS.slice(i, i + 400));
  }
  let total = 0;
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(p => {
      const ref = col.doc();
      batch.set(ref, p);
    });
    await batch.commit();
    total += chunk.length;
    console.log(`   ✔ ${total}/${PRODUCTS.length} uploaded`);
  }

  console.log(`\n✅ Done! ${PRODUCTS.length} products in Firestore featured_products.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });

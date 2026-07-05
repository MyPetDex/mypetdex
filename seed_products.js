const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./service-account.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TAG = "mypetdex20-20";
// Direct product links with affiliate tags
const amz  = (asin) => `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
const amzImg = (asin) => `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SX300_SY300_.jpg`;
const chw  = (slug, id) => `https://chewy.sjv.io/c/7270969/2846786/32975?u=https%3A%2F%2Fwww.chewy.com%2F${encodeURIComponent(slug)}%2Fdp%2F${id}`;
const chwImg = (id) => `https://image.chewy.com/is/image/catalog/${id}_MAIN._AC_SL450_.jpg`;

const products = [
  // ── AMAZON ──────────────────────────────────────────────

  // Food
  { store:"Amazon", category:"Food",
    title:"Blue Buffalo Life Protection Adult Dog Food - Chicken & Brown Rice",
    url:amz("B001VLZZTA"), imageUrl:amzImg("B001VLZZTA"),
    description:"Natural ingredients with LifeSource Bits for immune health" },
  { store:"Amazon", category:"Food",
    title:"Hill's Science Diet Adult Dog Food - Chicken & Barley",
    url:amz("B004YQBDXC"), imageUrl:amzImg("B004YQBDXC"),
    description:"Vet recommended, precise nutrition for adult dogs" },
  { store:"Amazon", category:"Food",
    title:"Purina Pro Plan Adult Dog Food - Chicken & Rice",
    url:amz("B00MGK0IM6"), imageUrl:amzImg("B00MGK0IM6"),
    description:"High protein formula with real chicken as #1 ingredient" },
  { store:"Amazon", category:"Food",
    title:"IAMS Adult Minichunks Small Kibble Dry Dog Food",
    url:amz("B000084ETO"), imageUrl:amzImg("B000084ETO"),
    description:"Wholesome chicken & whole grains, 30lb bag" },

  // Toys
  { store:"Amazon", category:"Toys",
    title:"KONG Classic Dog Toy - Durable Rubber Chew Toy",
    url:amz("B0002AR0II"), imageUrl:amzImg("B0002AR0II"),
    description:"Stuff with treats for hours of enrichment play" },
  { store:"Amazon", category:"Toys",
    title:"Chuckit! Ultra Ball Dog Toy - High Bounce Fetch Ball",
    url:amz("B000F4PJLK"), imageUrl:amzImg("B000F4PJLK"),
    description:"Durable rubber ball for fetch, floats in water" },
  { store:"Amazon", category:"Toys",
    title:"Outward Hound Hide A Squirrel Plush Dog Puzzle Toy",
    url:amz("B0006G3MUS"), imageUrl:amzImg("B0006G3MUS"),
    description:"Interactive squeaky puzzle toy for mental stimulation" },
  { store:"Amazon", category:"Toys",
    title:"KONG Squeakair Birthday Balls Dog Toy - Pack of 3",
    url:amz("B000CQMHKM"), imageUrl:amzImg("B000CQMHKM"),
    description:"Combines tennis ball and squeaker for double the fun" },

  // Health
  { store:"Amazon", category:"Health",
    title:"Zesty Paws Multivitamin Chews for Dogs",
    url:amz("B071QPRJ3F"), imageUrl:amzImg("B071QPRJ3F"),
    description:"All-in-one bites with vitamins, probiotics & antioxidants" },
  { store:"Amazon", category:"Health",
    title:"PetHonesty Senior Hemp Mobility - Hip & Joint Supplement",
    url:amz("B07STXWHR6"), imageUrl:amzImg("B07STXWHR6"),
    description:"Glucosamine, MSM & hemp oil for joint health" },
  { store:"Amazon", category:"Health",
    title:"Vetericyn Plus Wound & Skin Care Spray",
    url:amz("B00YXMBJP8"), imageUrl:amzImg("B00YXMBJP8"),
    description:"Antimicrobial spray for cuts, scrapes & hot spots" },
  { store:"Amazon", category:"Health",
    title:"Arm & Hammer Dog Dental Care Toothpaste & Brush Kit",
    url:amz("B00C6GRPK6"), imageUrl:amzImg("B00C6GRPK6"),
    description:"Baking soda formula for fresher breath and cleaner teeth" },

  // Accessories
  { store:"Amazon", category:"Accessories",
    title:"MidWest Homes iCrate Double Door Folding Dog Crate 36\"",
    url:amz("B000QLQK1W"), imageUrl:amzImg("B000QLQK1W"),
    description:"Folds flat for travel, divider panel included" },
  { store:"Amazon", category:"Accessories",
    title:"Petmate Sky Kennel Airline Approved Dog Carrier",
    url:amz("B0006G4C8Q"), imageUrl:amzImg("B0006G4C8Q"),
    description:"Airline approved travel crate with live animal stickers" },
  { store:"Amazon", category:"Accessories",
    title:"Furhaven Orthopedic Dog Bed - Memory Foam Sofa Style",
    url:amz("B07M6X3L8R"), imageUrl:amzImg("B07M6X3L8R"),
    description:"Egg crate foam base for joint pain relief, washable cover" },
  { store:"Amazon", category:"Accessories",
    title:"Bedsure Calming Dog Bed - Anti-Anxiety Donut Cuddler",
    url:amz("B09BVNZKNF"), imageUrl:amzImg("B09BVNZKNF"),
    description:"Round fluffy nest bed for anxiety relief and better sleep" },

  // Grooming
  { store:"Amazon", category:"Grooming",
    title:"Burt's Bees Hypoallergenic Dog Shampoo - Shea Butter & Honey",
    url:amz("B00SKJPYOW"), imageUrl:amzImg("B00SKJPYOW"),
    description:"Tearless, sulfate-free, pH balanced for sensitive skin" },
  { store:"Amazon", category:"Grooming",
    title:"FURminator Undercoat Deshedding Tool for Dogs",
    url:amz("B000BHZN8W"), imageUrl:amzImg("B000BHZN8W"),
    description:"Reduces shedding up to 90%, stainless steel edge" },
  { store:"Amazon", category:"Grooming",
    title:"Hertzko Self-Cleaning Slicker Brush for Dogs & Cats",
    url:amz("B00ZGPI3OY"), imageUrl:amzImg("B00ZGPI3OY"),
    description:"Gentle wire bristles remove loose hair and mats easily" },
  { store:"Amazon", category:"Grooming",
    title:"Wahl Professional Cordless Dog Clipper Kit",
    url:amz("B00KTFWW5U"), imageUrl:amzImg("B00KTFWW5U"),
    description:"Self-sharpening blades, quiet motor, full grooming kit" },

  // ── CHEWY ──────────────────────────────────────────────

  // Food
  { store:"Chewy", category:"Food",
    title:"Royal Canin Medium Adult Dry Dog Food",
    url:chw("royal-canin-size-health-nutrition-medium-adult-dry-dog-food","36073"), imageUrl:chwImg("36073"),
    description:"Precise nutrition for medium breeds 11-25 lbs" },
  { store:"Chewy", category:"Food",
    title:"Wellness CORE Grain-Free Original Deboned Chicken Dry Dog Food",
    url:chw("wellness-core-grain-free-original-deboned-chicken-turkey-dry-dog-food","104913"), imageUrl:chwImg("104913"),
    description:"High protein, grain-free formula for active dogs" },
  { store:"Chewy", category:"Food",
    title:"Taste of the Wild High Prairie Grain-Free Dry Dog Food",
    url:chw("taste-of-the-wild-high-prairie-grain-free-dry-dog-food","104917"), imageUrl:chwImg("104917"),
    description:"Real roasted bison & venison with superfoods" },
  { store:"Chewy", category:"Food",
    title:"Merrick Backcountry Raw Infused Large Breed Dry Dog Food",
    url:chw("merrick-backcountry-raw-infused-large-breed-adult-dry-dog-food","183488"), imageUrl:chwImg("183488"),
    description:"Freeze-dried raw pieces mixed with kibble" },

  // Toys
  { store:"Chewy", category:"Toys",
    title:"Nylabone Power Chew Flavored Durable Dog Chew Toy",
    url:chw("nylabone-power-chew-flavored-durable-chew-dog-toy","33862"), imageUrl:chwImg("33862"),
    description:"Long-lasting nylon chew for aggressive chewers" },
  { store:"Chewy", category:"Toys",
    title:"Frisco Plush Squeaking Fox Dog Toy",
    url:chw("frisco-plush-squeaking-fox-dog-toy","141647"), imageUrl:chwImg("141647"),
    description:"Soft plush with 3 built-in squeakers for active play" },
  { store:"Chewy", category:"Toys",
    title:"West Paw Zogoflex Tux Treat Dispensing Dog Toy",
    url:chw("west-paw-zogoflex-tux-interactive-treat-dispensing-dog-toy","149908"), imageUrl:chwImg("149908"),
    description:"Stuff with treats, dishwasher safe, guaranteed tough" },
  { store:"Chewy", category:"Toys",
    title:"Chuckit! Indoor Ball Dog Toy",
    url:chw("chuckit-indoor-ball-dog-toy","36400"), imageUrl:chwImg("36400"),
    description:"Safe soft foam ball for indoor fetch games" },

  // Health
  { store:"Chewy", category:"Health",
    title:"Simparica Trio Chewable Tablets for Dogs 44.1-88 lbs",
    url:chw("simparica-trio-chewable-tablets-for-dogs","614148"), imageUrl:chwImg("614148"),
    description:"Monthly flea, tick, heartworm & worm prevention" },
  { store:"Chewy", category:"Health",
    title:"NexGard PLUS Chewables for Dogs 33.1-66 lbs",
    url:chw("nexgard-plus-chewables-for-dogs","802372"), imageUrl:chwImg("802372"),
    description:"Kills fleas & ticks, prevents heartworm disease" },
  { store:"Chewy", category:"Health",
    title:"Nutramax Cosequin Maximum Strength Joint Supplement",
    url:chw("nutramax-cosequin-maximum-strength-plus-msm-chewable-tablets-joint-health-dog-supplement","32905"), imageUrl:chwImg("32905"),
    description:"#1 vet recommended joint health supplement" },
  { store:"Chewy", category:"Health",
    title:"Zymox Otic Enzymatic Solution for Dog Ear Infections",
    url:chw("zymox-otic-enzymatic-solution-dog-ear-infection-treatment","33198"), imageUrl:chwImg("33198"),
    description:"No pre-cleaning needed, treats bacterial & yeast infections" },

  // Accessories
  { store:"Chewy", category:"Accessories",
    title:"Petmate Vari Dog & Cat Kennel 32-in, 30-50 lbs",
    url:chw("petmate-vari-dog-cat-kennel","47138"), imageUrl:chwImg("47138"),
    description:"Airline approved, ventilated plastic travel kennel" },
  { store:"Chewy", category:"Accessories",
    title:"MidWest iCrate Fold & Carry Dog Crate 36-inch",
    url:chw("midwest-icrate-fold-carry-single-door-collapsible-wire-dog-crate","46408"), imageUrl:chwImg("46408"),
    description:"Folds flat in seconds, includes divider panel" },
  { store:"Chewy", category:"Accessories",
    title:"Frisco Plush Orthopedic Sofa Dog Bed",
    url:chw("frisco-plush-orthopedic-sofa-dog-bed","189474"), imageUrl:chwImg("189474"),
    description:"Memory foam base, removable washable cover" },
  { store:"Chewy", category:"Accessories",
    title:"Best Friends by Sheri Calming Donut Cuddler Dog Bed",
    url:chw("best-friends-by-sheri-the-original-calming-shag-fur-donut-cuddler-dog-bed","163088"), imageUrl:chwImg("163088"),
    description:"Vegan fur donut shape reduces anxiety and improves sleep" },

  // Grooming
  { store:"Chewy", category:"Grooming",
    title:"TropiClean Perfect Fur Dog Shampoo & Conditioner Bundle",
    url:chw("tropiclean-perfect-fur-dog-shampoo-conditioner-bundle","514154"), imageUrl:chwImg("514154"),
    description:"Breed-specific formulas for smooth, curly or long coats" },
  { store:"Chewy", category:"Grooming",
    title:"Wahl 4-in-1 Calming Pet Shampoo - Lavender Chamomile",
    url:chw("wahl-4-in-1-calming-pet-shampoo","131688"), imageUrl:chwImg("131688"),
    description:"Cleans, conditions, detangles and moisturizes in one wash" },
  { store:"Chewy", category:"Grooming",
    title:"Chris Christensen Big G Slicker Brush for Dogs",
    url:chw("chris-christensen-big-g-slicker-brush-for-dogs","30006"), imageUrl:chwImg("30006"),
    description:"Professional grade, curved pins for easy detangling" },
  { store:"Chewy", category:"Grooming",
    title:"Oster Professional Pet Clipper Kit",
    url:chw("oster-professional-pet-clipper-kit-with-detachable-blades","31313"), imageUrl:chwImg("31313"),
    description:"Quiet, powerful motor for at-home professional grooming" },
];

async function seed() {
  const col = db.collection("featured_products");
  const existing = await col.get();
  await Promise.all(existing.docs.map(d => d.ref.delete()));
  console.log(`🗑  Cleared ${existing.size} existing products`);

  for (const p of products) {
    await col.add({ ...p, createdAt: FieldValue.serverTimestamp() });
    console.log(`✓  [${p.store}/${p.category}] ${p.title.substring(0, 55)}`);
  }

  console.log(`\n✅  Done! Added ${products.length} products.`);
  process.exit(0);
}

seed().catch(e => { console.error("❌", e.message); process.exit(1); });

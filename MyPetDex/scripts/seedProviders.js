/**
 * MyPetDex — Seed Providers Script
 * Uploads pet service providers for all 50 US states to Firestore seedProviders collection.
 * Run: node scripts/seedProviders.js
 */


// ── Provider Data ────────────────────────────────────────────────────────────
const SERVICES = ["Grooming", "Dog Walking", "Veterinary", "Boarding", "Training", "Daycare"];

const PROVIDERS_BY_STATE = {
  AL: { cities: ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"] },
  AK: { cities: ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan"] },
  AZ: { cities: ["Phoenix", "Tucson", "Scottsdale", "Tempe", "Mesa", "Chandler", "Gilbert"] },
  AR: { cities: ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro"] },
  CA: { cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Oakland", "Irvine", "Santa Monica", "Long Beach", "Pasadena"] },
  CO: { cities: ["Denver", "Colorado Springs", "Aurora", "Boulder", "Fort Collins", "Lakewood", "Arvada"] },
  CT: { cities: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Greenwich"] },
  DE: { cities: ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna"] },
  FL: { cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "Boca Raton", "Sarasota", "Naples", "Gainesville", "Tallahassee"] },
  GA: { cities: ["Atlanta", "Savannah", "Augusta", "Columbus", "Macon", "Sandy Springs", "Alpharetta", "Marietta"] },
  HI: { cities: ["Honolulu", "Hilo", "Kailua", "Kahului", "Kona"] },
  ID: { cities: ["Boise", "Nampa", "Meridian", "Idaho Falls", "Pocatello"] },
  IL: { cities: ["Chicago", "Aurora", "Naperville", "Rockford", "Joliet", "Springfield", "Peoria", "Evanston"] },
  IN: { cities: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Bloomington"] },
  IA: { cities: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City"] },
  KS: { cities: ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe"] },
  KY: { cities: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"] },
  LA: { cities: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Metairie"] },
  ME: { cities: ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn"] },
  MD: { cities: ["Baltimore", "Bethesda", "Rockville", "Gaithersburg", "Annapolis", "Silver Spring", "Frederick"] },
  MA: { cities: ["Boston", "Worcester", "Cambridge", "Springfield", "Lowell", "Quincy", "Newton", "Brookline"] },
  MI: { cities: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Flint", "Sterling Heights", "Troy", "Royal Oak"] },
  MN: { cities: ["Minneapolis", "Saint Paul", "Rochester", "Bloomington", "Duluth", "Eden Prairie", "Plymouth"] },
  MS: { cities: ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi"] },
  MO: { cities: ["Kansas City", "Saint Louis", "Springfield", "Columbia", "Independence", "Lee's Summit"] },
  MT: { cities: ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte"] },
  NE: { cities: ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney"] },
  NV: { cities: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City"] },
  NH: { cities: ["Manchester", "Nashua", "Concord", "Derry", "Dover", "Portsmouth"] },
  NJ: { cities: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Trenton", "Woodbridge", "Hamilton", "East Brunswick", "Cherry Hill", "Hoboken", "Princeton", "Morristown", "Toms River"] },
  NM: { cities: ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell"] },
  NY: { cities: ["New York City", "Brooklyn", "Queens", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "White Plains", "Astoria", "Hoboken"] },
  NC: { cities: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Asheville"] },
  ND: { cities: ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo"] },
  OH: { cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton"] },
  OK: { cities: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond"] },
  OR: { cities: ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Beaverton", "Bend"] },
  PA: { cities: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg"] },
  RI: { cities: ["Providence", "Cranston", "Warwick", "Pawtucket", "East Providence"] },
  SC: { cities: ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville"] },
  SD: { cities: ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown"] },
  TN: { cities: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin"] },
  TX: { cities: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Plano", "Frisco", "Irving", "Lubbock", "Laredo", "Garland"] },
  UT: { cities: ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden"] },
  VT: { cities: ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier"] },
  VA: { cities: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Arlington", "Alexandria", "McLean", "Reston", "Herndon"] },
  WA: { cities: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kirkland", "Redmond", "Bothell", "Olympia"] },
  WV: { cities: ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling"] },
  WI: { cities: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha"] },
  WY: { cities: ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs"] },
};

const BUSINESS_NAMES = {
  Grooming: ["Pawfect Grooming", "Fluffy Paws Salon", "Top Dog Grooming", "The Grooming Spot", "Happy Tails Grooming", "Snip & Clip Pet Salon", "Pampered Pets Grooming", "The Dog Wash", "Suds & Scissors", "Furever Clean"],
  "Dog Walking": ["Happy Paws Dog Walking", "Waggy Tails Walkers", "Urban Dog Walking", "Leash & Go", "PawWalkers", "Tail Chasers", "City Paws Walking", "Bark & Walk", "Step by Paw", "The Daily Walk"],
  Veterinary: ["City Animal Hospital", "Westside Veterinary Clinic", "Caring Paws Vet", "Family Pet Clinic", "Companion Animal Hospital", "Animal Wellness Center", "PetCare Veterinary", "Sunrise Animal Clinic", "The Pet Doctor", "All Creatures Vet"],
  Boarding: ["Paws & Play Pet Resort", "Happy Hound Hotel", "The Pet Inn", "Luxury Pet Lodge", "Doggie Den Boarding", "Sweet Dreams Pet Hotel", "Camp Canine", "Wagging Tails Resort", "Four Paws Boarding", "Pets Paradise"],
  Training: ["Sit Stay Play Training", "Good Dog Academy", "Paw-sitive Training", "Top Paw Training", "Canine Coach", "Alpha Dog Training", "Behavior Balance", "Smart Paws Academy", "The Dog Trainer", "Unleashed Potential"],
  Daycare: ["Doggie Daycare Den", "Pawsome Daycare", "Happy Hounds Daycare", "Play All Day Pet Care", "Tail Waggers Daycare", "Furry Friends Daycare", "The Dog House Daycare", "Pup Paradise Daycare", "All Day Play", "Sunshine Pet Daycare"],
};

const PHONE_PREFIXES = {
  AL: "205", AK: "907", AZ: "602", AR: "501", CA: "310", CO: "720", CT: "203",
  DE: "302", FL: "305", GA: "404", HI: "808", ID: "208", IL: "312", IN: "317",
  IA: "515", KS: "316", KY: "502", LA: "504", ME: "207", MD: "410", MA: "617",
  MI: "313", MN: "612", MS: "601", MO: "314", MT: "406", NE: "402", NV: "702",
  NH: "603", NJ: "732", NM: "505", NY: "212", NC: "704", ND: "701", OH: "614",
  OK: "405", OR: "503", PA: "215", RI: "401", SC: "843", SD: "605", TN: "615",
  TX: "713", UT: "801", VT: "802", VA: "703", WA: "206", WV: "304", WI: "414", WY: "307",
};

function randomRating() {
  return Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
}

function randomReviews() {
  return Math.floor(20 + Math.random() * 480);
}

function randomPhone(state) {
  const prefix = PHONE_PREFIXES[state] || "800";
  const mid = Math.floor(100 + Math.random() * 900);
  const end = Math.floor(1000 + Math.random() * 9000);
  return `(${prefix}) ${mid}-${end}`;
}

function randomAddress(city, state) {
  const num = Math.floor(100 + Math.random() * 9900);
  const streets = ["Main St", "Oak Ave", "Park Blvd", "Elm St", "Cedar Rd", "Pine Ave", "Maple Dr", "Washington Blvd", "Lake Rd", "River Dr", "Pet Plaza", "Animal Way"];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const zip = Math.floor(10000 + Math.random() * 90000);
  return `${num} ${street}, ${city}, ${state} ${zip}, USA`;
}

function buildProviders() {
  const providers = [];
  for (const [state, { cities }] of Object.entries(PROVIDERS_BY_STATE)) {
    for (const city of cities) {
      for (const service of SERVICES) {
        const names = BUSINESS_NAMES[service];
        // 2 providers per city per service
        const count = 2;
        for (let i = 0; i < count; i++) {
          const name = names[(providers.length + i) % names.length];
          const rating = randomRating();
          const reviewCount = randomReviews();
          const address = randomAddress(city, state);
          providers.push({
            businessName: `${name} - ${city}`,
            city,
            state,
            service,
            address,
            phone: randomPhone(state),
            googleRating: rating,
            googleReviewCount: reviewCount,
            googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(name + " " + city + " " + state)}`,
            role: "provider",
            verified: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }
  return providers;
}

async function main() {
  const { initializeApp } = require("firebase/app");
  const { getFirestore, collection, addDoc, getDocs, deleteDoc } = require("firebase/firestore");
  const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

  const firebaseConfig = {
    apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
    authDomain: "auth.mypetdex.app",
    projectId: "mypetdex-c4315",
    storageBucket: "mypetdex-c4315.firebasestorage.app",
    messagingSenderId: "209772699227",
    appId: "1:209772699227:web:68d547574d8d068f6da97e",
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Sign in as admin
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await new Promise(resolve => rl.question("🔑 Enter admin password for mypetdexapp@gmail.com: ", resolve));
  rl.close();

  try {
    await signInWithEmailAndPassword(auth, "mypetdexapp@gmail.com", password);
    console.log("✅ Signed in as admin\n");
  } catch (e) {
    console.error("❌ Auth failed:", e.message);
    process.exit(1);
  }

  const providers = buildProviders();
  console.log(`\n📊 Generated ${providers.length} providers across all 50 states\n`);

  // Clear existing seed providers
  console.log("🗑️  Clearing existing seedProviders...");
  const existing = await getDocs(collection(db, "seedProviders"));
  const deletePromises = existing.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  console.log(`   Deleted ${existing.docs.length} existing entries\n`);

  // Upload in batches of 50
  const BATCH_SIZE = 50;
  let uploaded = 0;
  for (let i = 0; i < providers.length; i += BATCH_SIZE) {
    const batch = providers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(p => addDoc(collection(db, "seedProviders"), p)));
    uploaded += batch.length;
    process.stdout.write(`\r⬆️  Uploading... ${uploaded}/${providers.length}`);
  }

  console.log(`\n\n✅ Done! ${providers.length} providers uploaded to Firestore seedProviders collection.`);
  console.log(`   States covered: ${Object.keys(PROVIDERS_BY_STATE).length}`);
  console.log(`   Services: ${SERVICES.join(", ")}`);
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});

/**
 * seedProviders.js
 * Deletes all existing seedProviders and uploads 3,000 AI-generated ones.
 *
 * Setup:
 *   1. Place your Firebase service account JSON at: MyPetDex/../service-account.json
 *      (or set SERVICE_ACCOUNT env var to the path)
 *   2. cd mypetdex
 *   3. npm install firebase-admin   (one-time)
 *   4. node scripts/seedProviders.js
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

// ── Service account ──────────────────────────────────────────────────────────
const saPath =
  process.env.SERVICE_ACCOUNT ||
  path.join(__dirname, "..", "service-account.json");

if (!fs.existsSync(saPath)) {
  console.error(`❌  Service account not found at: ${saPath}`);
  console.error(
    "    Download it from Firebase Console → Project Settings → Service Accounts"
  );
  process.exit(1);
}

initializeApp({
  credential: cert(require(saPath)),
});

const db = getFirestore();

// ── City / zip data per state ─────────────────────────────────────────────────
// Each state has 10 cities with real zip codes → 10 cities × 6 services = 60/state
// 50 states × 60 = 3,000 providers
const STATE_CITIES = {
  AL: [
    { city: "Birmingham", zip: "35203" },
    { city: "Montgomery", zip: "36104" },
    { city: "Huntsville", zip: "35801" },
    { city: "Mobile", zip: "36602" },
    { city: "Tuscaloosa", zip: "35401" },
    { city: "Hoover", zip: "35226" },
    { city: "Dothan", zip: "36301" },
    { city: "Auburn", zip: "36830" },
    { city: "Decatur", zip: "35601" },
    { city: "Madison", zip: "35758" },
  ],
  AK: [
    { city: "Anchorage", zip: "99501" },
    { city: "Fairbanks", zip: "99701" },
    { city: "Juneau", zip: "99801" },
    { city: "Sitka", zip: "99835" },
    { city: "Ketchikan", zip: "99901" },
    { city: "Wasilla", zip: "99654" },
    { city: "Kenai", zip: "99611" },
    { city: "Kodiak", zip: "99615" },
    { city: "Bethel", zip: "99559" },
    { city: "Palmer", zip: "99645" },
  ],
  AZ: [
    { city: "Phoenix", zip: "85001" },
    { city: "Tucson", zip: "85701" },
    { city: "Mesa", zip: "85201" },
    { city: "Chandler", zip: "85224" },
    { city: "Scottsdale", zip: "85251" },
    { city: "Glendale", zip: "85301" },
    { city: "Gilbert", zip: "85234" },
    { city: "Tempe", zip: "85281" },
    { city: "Peoria", zip: "85345" },
    { city: "Surprise", zip: "85374" },
  ],
  AR: [
    { city: "Little Rock", zip: "72201" },
    { city: "Fort Smith", zip: "72901" },
    { city: "Fayetteville", zip: "72701" },
    { city: "Springdale", zip: "72764" },
    { city: "Jonesboro", zip: "72401" },
    { city: "Conway", zip: "72032" },
    { city: "Rogers", zip: "72756" },
    { city: "Pine Bluff", zip: "71601" },
    { city: "Bentonville", zip: "72712" },
    { city: "Hot Springs", zip: "71901" },
  ],
  CA: [
    { city: "Los Angeles", zip: "90001" },
    { city: "San Francisco", zip: "94102" },
    { city: "San Diego", zip: "92101" },
    { city: "San Jose", zip: "95101" },
    { city: "Sacramento", zip: "95814" },
    { city: "Fresno", zip: "93701" },
    { city: "Long Beach", zip: "90802" },
    { city: "Oakland", zip: "94601" },
    { city: "Bakersfield", zip: "93301" },
    { city: "Anaheim", zip: "92801" },
  ],
  CO: [
    { city: "Denver", zip: "80201" },
    { city: "Colorado Springs", zip: "80901" },
    { city: "Aurora", zip: "80010" },
    { city: "Fort Collins", zip: "80521" },
    { city: "Lakewood", zip: "80226" },
    { city: "Thornton", zip: "80229" },
    { city: "Arvada", zip: "80002" },
    { city: "Westminster", zip: "80030" },
    { city: "Pueblo", zip: "81001" },
    { city: "Boulder", zip: "80302" },
  ],
  CT: [
    { city: "Hartford", zip: "06101" },
    { city: "New Haven", zip: "06511" },
    { city: "Stamford", zip: "06901" },
    { city: "Bridgeport", zip: "06601" },
    { city: "Waterbury", zip: "06701" },
    { city: "Norwalk", zip: "06850" },
    { city: "Danbury", zip: "06810" },
    { city: "New Britain", zip: "06051" },
    { city: "Bristol", zip: "06010" },
    { city: "Meriden", zip: "06450" },
  ],
  DE: [
    { city: "Wilmington", zip: "19801" },
    { city: "Dover", zip: "19901" },
    { city: "Newark", zip: "19711" },
    { city: "Middletown", zip: "19709" },
    { city: "Bear", zip: "19701" },
    { city: "Hockessin", zip: "19707" },
    { city: "Milford", zip: "19963" },
    { city: "Seaford", zip: "19973" },
    { city: "Georgetown", zip: "19947" },
    { city: "Smyrna", zip: "19977" },
  ],
  FL: [
    { city: "Miami", zip: "33101" },
    { city: "Orlando", zip: "32801" },
    { city: "Tampa", zip: "33601" },
    { city: "Jacksonville", zip: "32202" },
    { city: "Fort Lauderdale", zip: "33301" },
    { city: "Tallahassee", zip: "32301" },
    { city: "St Petersburg", zip: "33701" },
    { city: "Hialeah", zip: "33010" },
    { city: "Port St Lucie", zip: "34952" },
    { city: "Cape Coral", zip: "33990" },
  ],
  GA: [
    { city: "Atlanta", zip: "30301" },
    { city: "Augusta", zip: "30901" },
    { city: "Columbus", zip: "31901" },
    { city: "Macon", zip: "31201" },
    { city: "Savannah", zip: "31401" },
    { city: "Athens", zip: "30601" },
    { city: "Sandy Springs", zip: "30328" },
    { city: "Roswell", zip: "30075" },
    { city: "Johns Creek", zip: "30097" },
    { city: "Albany", zip: "31701" },
  ],
  HI: [
    { city: "Honolulu", zip: "96813" },
    { city: "Pearl City", zip: "96782" },
    { city: "Hilo", zip: "96720" },
    { city: "Kailua", zip: "96734" },
    { city: "Waipahu", zip: "96797" },
    { city: "Kaneohe", zip: "96744" },
    { city: "Mililani", zip: "96789" },
    { city: "Kahului", zip: "96732" },
    { city: "Ewa Beach", zip: "96706" },
    { city: "Kihei", zip: "96753" },
  ],
  ID: [
    { city: "Boise", zip: "83701" },
    { city: "Meridian", zip: "83642" },
    { city: "Nampa", zip: "83651" },
    { city: "Idaho Falls", zip: "83401" },
    { city: "Pocatello", zip: "83201" },
    { city: "Caldwell", zip: "83605" },
    { city: "Coeur d'Alene", zip: "83814" },
    { city: "Twin Falls", zip: "83301" },
    { city: "Lewiston", zip: "83501" },
    { city: "Rexburg", zip: "83440" },
  ],
  IL: [
    { city: "Chicago", zip: "60601" },
    { city: "Aurora", zip: "60505" },
    { city: "Rockford", zip: "61101" },
    { city: "Joliet", zip: "60431" },
    { city: "Naperville", zip: "60540" },
    { city: "Springfield", zip: "62701" },
    { city: "Peoria", zip: "61602" },
    { city: "Elgin", zip: "60120" },
    { city: "Waukegan", zip: "60085" },
    { city: "Champaign", zip: "61820" },
  ],
  IN: [
    { city: "Indianapolis", zip: "46201" },
    { city: "Fort Wayne", zip: "46801" },
    { city: "Evansville", zip: "47701" },
    { city: "South Bend", zip: "46601" },
    { city: "Carmel", zip: "46032" },
    { city: "Fishers", zip: "46038" },
    { city: "Bloomington", zip: "47401" },
    { city: "Hammond", zip: "46320" },
    { city: "Gary", zip: "46401" },
    { city: "Lafayette", zip: "47901" },
  ],
  IA: [
    { city: "Des Moines", zip: "50301" },
    { city: "Cedar Rapids", zip: "52401" },
    { city: "Davenport", zip: "52801" },
    { city: "Sioux City", zip: "51101" },
    { city: "Iowa City", zip: "52240" },
    { city: "Waterloo", zip: "50701" },
    { city: "Council Bluffs", zip: "51501" },
    { city: "Dubuque", zip: "52001" },
    { city: "Ames", zip: "50010" },
    { city: "West Des Moines", zip: "50265" },
  ],
  KS: [
    { city: "Wichita", zip: "67201" },
    { city: "Overland Park", zip: "66204" },
    { city: "Kansas City", zip: "66101" },
    { city: "Topeka", zip: "66601" },
    { city: "Olathe", zip: "66061" },
    { city: "Lawrence", zip: "66044" },
    { city: "Shawnee", zip: "66203" },
    { city: "Manhattan", zip: "66502" },
    { city: "Lenexa", zip: "66215" },
    { city: "Salina", zip: "67401" },
  ],
  KY: [
    { city: "Louisville", zip: "40201" },
    { city: "Lexington", zip: "40502" },
    { city: "Bowling Green", zip: "42101" },
    { city: "Owensboro", zip: "42301" },
    { city: "Covington", zip: "41011" },
    { city: "Richmond", zip: "40475" },
    { city: "Georgetown", zip: "40324" },
    { city: "Florence", zip: "41042" },
    { city: "Elizabethtown", zip: "42701" },
    { city: "Hopkinsville", zip: "42240" },
  ],
  LA: [
    { city: "New Orleans", zip: "70112" },
    { city: "Baton Rouge", zip: "70801" },
    { city: "Shreveport", zip: "71101" },
    { city: "Metairie", zip: "70001" },
    { city: "Lafayette", zip: "70501" },
    { city: "Lake Charles", zip: "70601" },
    { city: "Kenner", zip: "70062" },
    { city: "Bossier City", zip: "71111" },
    { city: "Monroe", zip: "71201" },
    { city: "Alexandria", zip: "71301" },
  ],
  ME: [
    { city: "Portland", zip: "04101" },
    { city: "Lewiston", zip: "04240" },
    { city: "Bangor", zip: "04401" },
    { city: "South Portland", zip: "04106" },
    { city: "Auburn", zip: "04210" },
    { city: "Biddeford", zip: "04005" },
    { city: "Sanford", zip: "04073" },
    { city: "Saco", zip: "04072" },
    { city: "Augusta", zip: "04330" },
    { city: "Westbrook", zip: "04092" },
  ],
  MD: [
    { city: "Baltimore", zip: "21201" },
    { city: "Frederick", zip: "21701" },
    { city: "Rockville", zip: "20850" },
    { city: "Gaithersburg", zip: "20877" },
    { city: "Bowie", zip: "20715" },
    { city: "Hagerstown", zip: "21740" },
    { city: "Annapolis", zip: "21401" },
    { city: "College Park", zip: "20740" },
    { city: "Salisbury", zip: "21801" },
    { city: "Laurel", zip: "20707" },
  ],
  MA: [
    { city: "Boston", zip: "02101" },
    { city: "Worcester", zip: "01601" },
    { city: "Springfield", zip: "01101" },
    { city: "Cambridge", zip: "02139" },
    { city: "Lowell", zip: "01851" },
    { city: "Brockton", zip: "02301" },
    { city: "New Bedford", zip: "02740" },
    { city: "Fall River", zip: "02720" },
    { city: "Lynn", zip: "01901" },
    { city: "Quincy", zip: "02169" },
  ],
  MI: [
    { city: "Detroit", zip: "48201" },
    { city: "Grand Rapids", zip: "49501" },
    { city: "Warren", zip: "48089" },
    { city: "Sterling Heights", zip: "48310" },
    { city: "Ann Arbor", zip: "48104" },
    { city: "Lansing", zip: "48901" },
    { city: "Flint", zip: "48501" },
    { city: "Dearborn", zip: "48120" },
    { city: "Livonia", zip: "48150" },
    { city: "Westland", zip: "48185" },
  ],
  MN: [
    { city: "Minneapolis", zip: "55401" },
    { city: "St Paul", zip: "55101" },
    { city: "Rochester", zip: "55901" },
    { city: "Duluth", zip: "55801" },
    { city: "Brooklyn Park", zip: "55428" },
    { city: "Plymouth", zip: "55441" },
    { city: "Maple Grove", zip: "55311" },
    { city: "Woodbury", zip: "55125" },
    { city: "St Cloud", zip: "56301" },
    { city: "Eagan", zip: "55121" },
  ],
  MS: [
    { city: "Jackson", zip: "39201" },
    { city: "Gulfport", zip: "39501" },
    { city: "Southaven", zip: "38671" },
    { city: "Hattiesburg", zip: "39401" },
    { city: "Biloxi", zip: "39530" },
    { city: "Meridian", zip: "39301" },
    { city: "Tupelo", zip: "38801" },
    { city: "Olive Branch", zip: "38654" },
    { city: "Greenville", zip: "38701" },
    { city: "Horn Lake", zip: "38637" },
  ],
  MO: [
    { city: "Kansas City", zip: "64101" },
    { city: "St Louis", zip: "63101" },
    { city: "Springfield", zip: "65801" },
    { city: "Columbia", zip: "65201" },
    { city: "Independence", zip: "64050" },
    { city: "Lee's Summit", zip: "64063" },
    { city: "O'Fallon", zip: "63366" },
    { city: "St Joseph", zip: "64501" },
    { city: "St Charles", zip: "63301" },
    { city: "Blue Springs", zip: "64014" },
  ],
  MT: [
    { city: "Billings", zip: "59101" },
    { city: "Missoula", zip: "59801" },
    { city: "Great Falls", zip: "59401" },
    { city: "Bozeman", zip: "59715" },
    { city: "Butte", zip: "59701" },
    { city: "Helena", zip: "59601" },
    { city: "Kalispell", zip: "59901" },
    { city: "Havre", zip: "59501" },
    { city: "Anaconda", zip: "59711" },
    { city: "Miles City", zip: "59301" },
  ],
  NE: [
    { city: "Omaha", zip: "68101" },
    { city: "Lincoln", zip: "68501" },
    { city: "Bellevue", zip: "68005" },
    { city: "Grand Island", zip: "68801" },
    { city: "Kearney", zip: "68847" },
    { city: "Fremont", zip: "68025" },
    { city: "Hastings", zip: "68901" },
    { city: "Norfolk", zip: "68701" },
    { city: "Columbus", zip: "68601" },
    { city: "Papillion", zip: "68046" },
  ],
  NV: [
    { city: "Las Vegas", zip: "89101" },
    { city: "Henderson", zip: "89002" },
    { city: "Reno", zip: "89501" },
    { city: "North Las Vegas", zip: "89030" },
    { city: "Sparks", zip: "89431" },
    { city: "Carson City", zip: "89701" },
    { city: "Fernley", zip: "89408" },
    { city: "Elko", zip: "89801" },
    { city: "Mesquite", zip: "89027" },
    { city: "Boulder City", zip: "89005" },
  ],
  NH: [
    { city: "Manchester", zip: "03101" },
    { city: "Nashua", zip: "03060" },
    { city: "Concord", zip: "03301" },
    { city: "Derry", zip: "03038" },
    { city: "Dover", zip: "03820" },
    { city: "Rochester", zip: "03867" },
    { city: "Salem", zip: "03079" },
    { city: "Merrimack", zip: "03054" },
    { city: "Keene", zip: "03431" },
    { city: "Portsmouth", zip: "03801" },
  ],
  // NJ gets extra coverage — includes 08816 (East Brunswick) as required
  NJ: [
    { city: "Newark", zip: "07101" },
    { city: "Jersey City", zip: "07302" },
    { city: "Paterson", zip: "07501" },
    { city: "Elizabeth", zip: "07201" },
    { city: "East Brunswick", zip: "08816" },
    { city: "Hoboken", zip: "07030" },
    { city: "Cherry Hill", zip: "08002" },
    { city: "Toms River", zip: "08753" },
    { city: "Trenton", zip: "08601" },
    { city: "Clifton", zip: "07011" },
  ],
  NM: [
    { city: "Albuquerque", zip: "87101" },
    { city: "Las Cruces", zip: "88001" },
    { city: "Rio Rancho", zip: "87124" },
    { city: "Santa Fe", zip: "87501" },
    { city: "Roswell", zip: "88201" },
    { city: "Farmington", zip: "87401" },
    { city: "Clovis", zip: "88101" },
    { city: "Hobbs", zip: "88240" },
    { city: "Alamogordo", zip: "88310" },
    { city: "Carlsbad", zip: "88220" },
  ],
  NY: [
    { city: "New York", zip: "10001" },
    { city: "Buffalo", zip: "14201" },
    { city: "Rochester", zip: "14601" },
    { city: "Yonkers", zip: "10701" },
    { city: "Syracuse", zip: "13201" },
    { city: "Albany", zip: "12201" },
    { city: "New Rochelle", zip: "10801" },
    { city: "Mount Vernon", zip: "10550" },
    { city: "Schenectady", zip: "12301" },
    { city: "Utica", zip: "13501" },
  ],
  NC: [
    { city: "Charlotte", zip: "28201" },
    { city: "Raleigh", zip: "27601" },
    { city: "Greensboro", zip: "27401" },
    { city: "Durham", zip: "27701" },
    { city: "Winston-Salem", zip: "27101" },
    { city: "Fayetteville", zip: "28301" },
    { city: "Cary", zip: "27511" },
    { city: "Wilmington", zip: "28401" },
    { city: "High Point", zip: "27260" },
    { city: "Concord", zip: "28025" },
  ],
  ND: [
    { city: "Fargo", zip: "58102" },
    { city: "Bismarck", zip: "58501" },
    { city: "Grand Forks", zip: "58201" },
    { city: "Minot", zip: "58701" },
    { city: "West Fargo", zip: "58078" },
    { city: "Williston", zip: "58801" },
    { city: "Dickinson", zip: "58601" },
    { city: "Mandan", zip: "58554" },
    { city: "Jamestown", zip: "58401" },
    { city: "Wahpeton", zip: "58075" },
  ],
  OH: [
    { city: "Columbus", zip: "43201" },
    { city: "Cleveland", zip: "44101" },
    { city: "Cincinnati", zip: "45201" },
    { city: "Toledo", zip: "43601" },
    { city: "Akron", zip: "44301" },
    { city: "Dayton", zip: "45401" },
    { city: "Parma", zip: "44129" },
    { city: "Canton", zip: "44701" },
    { city: "Youngstown", zip: "44501" },
    { city: "Lorain", zip: "44052" },
  ],
  OK: [
    { city: "Oklahoma City", zip: "73101" },
    { city: "Tulsa", zip: "74101" },
    { city: "Norman", zip: "73069" },
    { city: "Broken Arrow", zip: "74011" },
    { city: "Lawton", zip: "73501" },
    { city: "Edmond", zip: "73003" },
    { city: "Moore", zip: "73160" },
    { city: "Midwest City", zip: "73110" },
    { city: "Enid", zip: "73701" },
    { city: "Stillwater", zip: "74074" },
  ],
  OR: [
    { city: "Portland", zip: "97201" },
    { city: "Eugene", zip: "97401" },
    { city: "Salem", zip: "97301" },
    { city: "Gresham", zip: "97030" },
    { city: "Hillsboro", zip: "97123" },
    { city: "Beaverton", zip: "97005" },
    { city: "Bend", zip: "97701" },
    { city: "Medford", zip: "97501" },
    { city: "Springfield", zip: "97477" },
    { city: "Corvallis", zip: "97330" },
  ],
  PA: [
    { city: "Philadelphia", zip: "19101" },
    { city: "Pittsburgh", zip: "15201" },
    { city: "Allentown", zip: "18101" },
    { city: "Erie", zip: "16501" },
    { city: "Reading", zip: "19601" },
    { city: "Scranton", zip: "18501" },
    { city: "Bethlehem", zip: "18015" },
    { city: "Lancaster", zip: "17601" },
    { city: "Harrisburg", zip: "17101" },
    { city: "York", zip: "17401" },
  ],
  RI: [
    { city: "Providence", zip: "02901" },
    { city: "Cranston", zip: "02910" },
    { city: "Warwick", zip: "02886" },
    { city: "Pawtucket", zip: "02860" },
    { city: "East Providence", zip: "02914" },
    { city: "Woonsocket", zip: "02895" },
    { city: "Coventry", zip: "02816" },
    { city: "Cumberland", zip: "02864" },
    { city: "North Providence", zip: "02911" },
    { city: "West Warwick", zip: "02893" },
  ],
  SC: [
    { city: "Columbia", zip: "29201" },
    { city: "Charleston", zip: "29401" },
    { city: "North Charleston", zip: "29405" },
    { city: "Mount Pleasant", zip: "29464" },
    { city: "Rock Hill", zip: "29730" },
    { city: "Greenville", zip: "29601" },
    { city: "Summerville", zip: "29483" },
    { city: "Sumter", zip: "29150" },
    { city: "Goose Creek", zip: "29445" },
    { city: "Hilton Head Island", zip: "29928" },
  ],
  SD: [
    { city: "Sioux Falls", zip: "57101" },
    { city: "Rapid City", zip: "57701" },
    { city: "Aberdeen", zip: "57401" },
    { city: "Brookings", zip: "57006" },
    { city: "Watertown", zip: "57201" },
    { city: "Mitchell", zip: "57301" },
    { city: "Yankton", zip: "57078" },
    { city: "Pierre", zip: "57501" },
    { city: "Huron", zip: "57350" },
    { city: "Vermillion", zip: "57069" },
  ],
  TN: [
    { city: "Nashville", zip: "37201" },
    { city: "Memphis", zip: "38101" },
    { city: "Knoxville", zip: "37901" },
    { city: "Chattanooga", zip: "37401" },
    { city: "Clarksville", zip: "37040" },
    { city: "Murfreesboro", zip: "37129" },
    { city: "Franklin", zip: "37064" },
    { city: "Jackson", zip: "38301" },
    { city: "Johnson City", zip: "37601" },
    { city: "Bartlett", zip: "38133" },
  ],
  TX: [
    { city: "Houston", zip: "77001" },
    { city: "San Antonio", zip: "78201" },
    { city: "Dallas", zip: "75201" },
    { city: "Austin", zip: "78701" },
    { city: "Fort Worth", zip: "76101" },
    { city: "El Paso", zip: "79901" },
    { city: "Arlington", zip: "76010" },
    { city: "Corpus Christi", zip: "78401" },
    { city: "Plano", zip: "75023" },
    { city: "Lubbock", zip: "79401" },
  ],
  UT: [
    { city: "Salt Lake City", zip: "84101" },
    { city: "West Valley City", zip: "84119" },
    { city: "Provo", zip: "84601" },
    { city: "West Jordan", zip: "84084" },
    { city: "Orem", zip: "84057" },
    { city: "Sandy", zip: "84070" },
    { city: "Ogden", zip: "84401" },
    { city: "St George", zip: "84770" },
    { city: "Layton", zip: "84040" },
    { city: "Millcreek", zip: "84106" },
  ],
  VT: [
    { city: "Burlington", zip: "05401" },
    { city: "South Burlington", zip: "05403" },
    { city: "Rutland", zip: "05701" },
    { city: "Barre", zip: "05641" },
    { city: "Montpelier", zip: "05601" },
    { city: "Winooski", zip: "05404" },
    { city: "St Albans", zip: "05478" },
    { city: "Newport", zip: "05855" },
    { city: "Vergennes", zip: "05491" },
    { city: "Middlebury", zip: "05753" },
  ],
  VA: [
    { city: "Virginia Beach", zip: "23451" },
    { city: "Norfolk", zip: "23501" },
    { city: "Chesapeake", zip: "23320" },
    { city: "Richmond", zip: "23219" },
    { city: "Newport News", zip: "23601" },
    { city: "Alexandria", zip: "22301" },
    { city: "Hampton", zip: "23661" },
    { city: "Roanoke", zip: "24011" },
    { city: "Portsmouth", zip: "23701" },
    { city: "Suffolk", zip: "23434" },
  ],
  WA: [
    { city: "Seattle", zip: "98101" },
    { city: "Spokane", zip: "99201" },
    { city: "Tacoma", zip: "98401" },
    { city: "Vancouver", zip: "98660" },
    { city: "Bellevue", zip: "98004" },
    { city: "Kent", zip: "98031" },
    { city: "Everett", zip: "98201" },
    { city: "Renton", zip: "98055" },
    { city: "Spokane Valley", zip: "99206" },
    { city: "Federal Way", zip: "98003" },
  ],
  WV: [
    { city: "Charleston", zip: "25301" },
    { city: "Huntington", zip: "25701" },
    { city: "Morgantown", zip: "26501" },
    { city: "Parkersburg", zip: "26101" },
    { city: "Wheeling", zip: "26003" },
    { city: "Weirton", zip: "26062" },
    { city: "Fairmont", zip: "26554" },
    { city: "Martinsburg", zip: "25401" },
    { city: "Beckley", zip: "25801" },
    { city: "Clarksburg", zip: "26301" },
  ],
  WI: [
    { city: "Milwaukee", zip: "53201" },
    { city: "Madison", zip: "53701" },
    { city: "Green Bay", zip: "54301" },
    { city: "Kenosha", zip: "53140" },
    { city: "Racine", zip: "53401" },
    { city: "Appleton", zip: "54911" },
    { city: "Waukesha", zip: "53186" },
    { city: "Oshkosh", zip: "54901" },
    { city: "Eau Claire", zip: "54701" },
    { city: "Janesville", zip: "53545" },
  ],
  WY: [
    { city: "Cheyenne", zip: "82001" },
    { city: "Casper", zip: "82601" },
    { city: "Laramie", zip: "82070" },
    { city: "Gillette", zip: "82716" },
    { city: "Rock Springs", zip: "82901" },
    { city: "Sheridan", zip: "82801" },
    { city: "Green River", zip: "82935" },
    { city: "Evanston", zip: "82930" },
    { city: "Riverton", zip: "82501" },
    { city: "Cody", zip: "82414" },
  ],
};

// ── Service data ──────────────────────────────────────────────────────────────
// 4 name variants per service → 4 providers per service per city
const SERVICES = [
  {
    service: "Grooming",
    names: [
      "Paw Spa",
      "The Groom Room",
      "Snip & Shine Pet Salon",
      "Fur & Fabulous Grooming",
      "Pawfect Cuts",
      "Fluffy's Grooming Studio",
      "Happy Paws Grooming",
      "Top Coat Pet Salon",
      "The Barking Barber",
      "Suds & Scissors",
      "Glamour Paws Salon",
      "Clip & Cuddle Grooming",
    ],
  },
  {
    service: "Veterinary",
    names: [
      "Animal Hospital",
      "Veterinary Clinic",
      "Pet Health Center",
      "Animal Wellness Center",
      "Family Vet Care",
      "Paws & Claws Veterinary",
      "Companion Animal Clinic",
      "All Creatures Vet Center",
      "Advanced Pet Care",
      "Caring Hands Animal Hospital",
      "Sunrise Veterinary Clinic",
      "Parkside Animal Hospital",
    ],
  },
  {
    service: "Dog Walking",
    names: [
      "Happy Tails Walking",
      "Leash & Leisure",
      "Wag It Walking Co",
      "Strut & Sniff Walkers",
      "Pawsome Dog Walkers",
      "Dog About Town",
      "On The Leash Co",
      "Tail Chasers Walking",
      "Barkside Walks",
      "Urban Paws Walking",
      "The Daily Dog Walk",
      "Wagging Around",
    ],
  },
  {
    service: "Boarding",
    names: [
      "Pet Hotel & Suites",
      "Bark Inn",
      "Pampered Paws Resort",
      "The Pet Retreat",
      "Cozy Paws Boarding",
      "Tail Waggers Lodge",
      "Snooze & Wag Boarding",
      "Paws Away Pet Hotel",
      "Home Away From Home Boarding",
      "Dreamland Pet Lodge",
      "Overnight Oasis Pet Stay",
      "Rest & Wag Boarding",
    ],
  },
  {
    service: "Training",
    names: [
      "K9 Academy",
      "Pawsitive Behavior",
      "Top Dog Obedience",
      "Canine Coach",
      "Good Dog Training",
      "Sit & Stay Training",
      "Brain & Paws Training",
      "Alpha Dog School",
      "Off Leash Training Co",
      "Rewarding Paws Training",
      "The Obedience Studio",
      "Smart Pup Academy",
    ],
  },
  {
    service: "Daycare",
    names: [
      "Happy Paws Daycare",
      "Barking Buddies Daycare",
      "The Doggy Den",
      "Sunny Tails Daycare",
      "Playful Paws Center",
      "Doggy Daycare & Play",
      "Fetch & Friends Daycare",
      "Wag & Play Daycare",
      "Paw Pals Daycare",
      "Tail Waggers Daycare",
      "The Pawsome Playhouse",
      "Park & Bark Daycare",
    ],
  },
];

// ── Phone generator ───────────────────────────────────────────────────────────
// Area codes by state (approximate)
const STATE_AREA_CODES = {
  AL: ["205", "251", "256", "334"],
  AK: ["907"],
  AZ: ["480", "520", "602", "623", "928"],
  AR: ["479", "501", "870"],
  CA: ["209", "213", "310", "408", "415", "510", "619", "714", "818", "949"],
  CO: ["303", "719", "720", "970"],
  CT: ["203", "475", "860", "959"],
  DE: ["302"],
  FL: ["239", "305", "321", "352", "386", "407", "561", "727", "754", "786", "813", "850", "863", "904", "941", "954"],
  GA: ["229", "404", "470", "478", "678", "706", "762", "770", "912"],
  HI: ["808"],
  ID: ["208", "986"],
  IL: ["217", "224", "309", "312", "331", "618", "630", "708", "773", "815", "847"],
  IN: ["219", "260", "317", "463", "574", "765", "812", "930"],
  IA: ["319", "515", "563", "641", "712"],
  KS: ["316", "620", "785", "913"],
  KY: ["270", "364", "502", "606", "859"],
  LA: ["225", "318", "337", "504", "985"],
  ME: ["207"],
  MD: ["240", "301", "410", "443", "667"],
  MA: ["339", "351", "413", "508", "617", "774", "781", "857", "978"],
  MI: ["231", "248", "269", "313", "517", "586", "616", "734", "810", "906", "947", "989"],
  MN: ["218", "320", "507", "612", "651", "763", "952"],
  MS: ["228", "601", "662", "769"],
  MO: ["314", "417", "573", "636", "660", "816"],
  MT: ["406"],
  NE: ["308", "402", "531"],
  NV: ["702", "725", "775"],
  NH: ["603"],
  NJ: ["201", "551", "609", "732", "848", "856", "862", "908", "973"],
  NM: ["505", "575"],
  NY: ["212", "315", "347", "516", "518", "585", "607", "631", "646", "716", "718", "845", "914", "917", "929"],
  NC: ["252", "336", "704", "743", "828", "910", "919", "980", "984"],
  ND: ["701"],
  OH: ["216", "234", "330", "380", "419", "440", "513", "567", "614", "740", "937"],
  OK: ["405", "539", "580", "918"],
  OR: ["458", "503", "541", "971"],
  PA: ["215", "267", "272", "412", "484", "570", "610", "717", "724", "814", "878"],
  RI: ["401"],
  SC: ["803", "839", "843", "854", "864"],
  SD: ["605"],
  TN: ["423", "615", "629", "731", "865", "901", "931"],
  TX: ["210", "214", "254", "281", "325", "346", "361", "409", "432", "469", "512", "682", "713", "726", "737", "806", "817", "830", "832", "903", "915", "936", "940", "956", "972", "979"],
  UT: ["385", "435", "801"],
  VT: ["802"],
  VA: ["276", "434", "540", "571", "703", "757", "804"],
  WA: ["206", "253", "360", "425", "509", "564"],
  WV: ["304", "681"],
  WI: ["262", "414", "534", "608", "715", "920"],
  WY: ["307"],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n, len) {
  return String(n).padStart(len, "0");
}

function generatePhone(state) {
  const codes = STATE_AREA_CODES[state] || ["555"];
  const area = codes[randInt(0, codes.length - 1)];
  return `(${area}) ${pad(randInt(200, 999), 3)}-${pad(randInt(1000, 9999), 4)}`;
}

function generateRating() {
  // Skewed toward 4.0–5.0 (verified providers should look good)
  return parseFloat((Math.random() * 1.0 + 4.0).toFixed(1));
}

// ── Build provider list ───────────────────────────────────────────────────────
const VARIANTS_PER_SERVICE = 4; // 4 providers per service type per city

function buildProviders() {
  const providers = [];

  for (const [state, cities] of Object.entries(STATE_CITIES)) {
    cities.forEach(({ city, zip }, cityIdx) => {
      SERVICES.forEach(({ service, names }) => {
        for (let v = 0; v < VARIANTS_PER_SERVICE; v++) {
          const nameIdx = (cityIdx * VARIANTS_PER_SERVICE + v) % names.length;
          const nameTemplate = names[nameIdx];
          // Alternate between "[City] [Name]" and "[Name] of [City]"
          const businessName =
            v % 2 === 0
              ? `${city} ${nameTemplate}`
              : `${nameTemplate} of ${city}`;

          providers.push({
            businessName,
            service,
            city,
            state,
            zip,
            phone: generatePhone(state),
            rating: generateRating(),
            verified: true,
            role: "provider",
          });
        }
      });
    });
  }

  return providers;
}

// ── Firestore batch upload ────────────────────────────────────────────────────
async function deleteAllSeedProviders() {
  console.log("🗑️  Deleting existing seedProviders...");
  const col = db.collection("seedProviders");
  let total = 0;

  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.docs.length;
    process.stdout.write(`   deleted ${total}...\r`);
  }

  console.log(`   ✅  Deleted ${total} old docs`);
}

async function uploadProviders(providers) {
  console.log(`\n📤  Uploading ${providers.length} providers...`);
  const col = db.collection("seedProviders");
  const BATCH_SIZE = 450; // Firestore max is 500
  let uploaded = 0;

  for (let i = 0; i < providers.length; i += BATCH_SIZE) {
    const chunk = providers.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach((p) => {
      const ref = col.doc(); // auto-ID
      batch.set(ref, p);
    });
    await batch.commit();
    uploaded += chunk.length;
    process.stdout.write(`   uploaded ${uploaded}/${providers.length}...\r`);
  }

  console.log(`   ✅  Uploaded ${uploaded} providers`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const providers = buildProviders();
    console.log(`\n🐾  MyPetDex Seed Provider Generator`);
    console.log(`   Built ${providers.length} providers across ${Object.keys(STATE_CITIES).length} states (${VARIANTS_PER_SERVICE} per service per city)\n`);

    // Verify NJ coverage
    const njProviders = providers.filter((p) => p.state === "NJ");
    const njZips = [...new Set(njProviders.map((p) => p.zip))];
    console.log(`   NJ providers: ${njProviders.length} across zips: ${njZips.join(", ")}\n`);

    await deleteAllSeedProviders();
    await uploadProviders(providers);

    console.log("\n🎉  Done! seedProviders collection is ready.");
    console.log("    Run: eas update --channel development --message \"New seed providers\"\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌  Error:", err.message || err);
    process.exit(1);
  }
})();

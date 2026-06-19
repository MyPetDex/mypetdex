/**
 * seedProviders.js  — MyPetDex
 * Generates ~20,000+ pet service providers across every US state & city.
 * Each document includes a `stateCity` field for fast, exact-match queries.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────────
 * 1. Firebase Console → mypetdex-c4315 → ⚙️ Project Settings → Service accounts
 *    → "Generate new private key" → save as  MyPetDex/serviceAccount.json
 * 2. Delete the old seedProviders collection in Firebase Console first!
 * 3. cd ~/mypetdex/MyPetDex && node seedProviders.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Firestore, FieldValue } = require("@google-cloud/firestore");
const fs   = require("fs");
const path = require("path");

const saPath = path.join(__dirname, "serviceAccount.json");
if (!fs.existsSync(saPath)) {
  console.error("\n❌  Missing serviceAccount.json — see setup instructions above.\n");
  process.exit(1);
}

const db = new Firestore({ projectId: "mypetdex-c4315", keyFilename: saPath });

// ─────────────────────────────────────────────────────────────────────────────
//  CITIES — comprehensive US coverage
// ─────────────────────────────────────────────────────────────────────────────
const STATE_CITIES = {
  AL: ["Birmingham","Montgomery","Huntsville","Mobile","Tuscaloosa","Hoover","Dothan","Auburn","Decatur","Madison","Phenix City","Florence","Gadsden","Vestavia Hills","Prattville","Alabaster","Bessemer","Enterprise","Opelika","Homewood","Northport","Anniston","Athens","Daphne","Pelham","Oxford","Albertville","Talladega","Selma","Hueytown","Trussville","Irondale","Calera","Gardendale","Center Point"],
  AK: ["Anchorage","Fairbanks","Juneau","Sitka","Ketchikan","Wasilla","Kenai","Kodiak","Bethel","Palmer","Homer","Soldotna","Valdez","Nome","Kotzebue","Seward","Cordova","Petersburg","Unalaska","Barrow"],
  AZ: ["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Glendale","Gilbert","Tempe","Peoria","Surprise","Yuma","Avondale","Flagstaff","Goodyear","Lake Havasu City","Buckeye","Casa Grande","Sierra Vista","Maricopa","Oro Valley","Prescott","Kingman","Queen Creek","Marana","Sahuarita","Fountain Hills","Eloy","Douglas","Nogales","Prescott Valley","Bullhead City","Apache Junction","Sun City","Tolleson"],
  AR: ["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro","Rogers","Conway","North Little Rock","Bentonville","Hot Springs","Pine Bluff","Benton","Texarkana","Sherwood","Jacksonville","Russellville","Bella Vista","West Memphis","Paragould","Cabot","Searcy","Van Buren","El Dorado","Maumelle","Bryant","Siloam Springs","Marion","Forrest City","Harrison","Mountain Home","Wynne","Camden","Blytheville","Batesville","Stuttgart"],
  CA: ["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Chula Vista","Irvine","Fremont","San Bernardino","Modesto","Fontana","Moreno Valley","Glendale","Huntington Beach","Santa Clarita","Garden Grove","Santa Rosa","Oceanside","Rancho Cucamonga","Ontario","Lancaster","Elk Grove","Palmdale","Salinas","Sunnyvale","Pomona","Escondido","Torrance","Pasadena","Orange","Fullerton","Hayward","Clovis","Concord","Visalia","Simi Valley","Victorville","Roseville","Thousand Oaks","Santa Clara","Vallejo","Berkeley","Murrieta","Temecula","Antioch","El Monte","Downey","Costa Mesa","Inglewood","Carlsbad","San Buenaventura","West Covina","Norwalk","Burbank","El Cajon","Rialto","Petaluma","Daly City","Santa Maria","Santa Barbara","San Mateo","Jurupa Valley","Compton","South Gate","Vista","Mission Viejo","Vacaville","Carson","Hesperia","Redding","Santa Monica"],
  CO: ["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo","Centennial","Boulder","Highlands Ranch","Greeley","Longmont","Loveland","Broomfield","Castle Rock","Parker","Commerce City","Brighton","Northglenn","Littleton","Englewood","Wheat Ridge","Lafayette","Windsor","Fountain","Steamboat Springs","Pueblo West","Grand Junction","Durango","Aspen","Vail","Fort Morgan","Sterling"],
  CT: ["Bridgeport","New Haven","Hartford","Stamford","Waterbury","Norwalk","Danbury","New Britain","Bristol","Meriden","Milford","West Haven","Middletown","Norwich","Shelton","Torrington","Naugatuck","Derby","Ansonia","Groton","New London","Windham","Enfield","Glastonbury","Trumbull","Hamden","Manchester","Southington","Cheshire","Wallingford","Newington","East Hartford","West Hartford","Stratford","Greenwich"],
  DE: ["Wilmington","Dover","Newark","Middletown","Smyrna","Milford","Seaford","Georgetown","Elsmere","New Castle","Bear","Claymont","Glasgow","Brookside","Pike Creek","Hockessin","Edgemoor","Wilmington Manor","Bellefonte","Prices Corner"],
  FL: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Tallahassee","Fort Lauderdale","Port St. Lucie","Cape Coral","Pembroke Pines","Hollywood","Miramar","Gainesville","Coral Springs","Clearwater","Miami Gardens","Palm Bay","Pompano Beach","West Palm Beach","Lakeland","Davie","Boca Raton","Sunrise","Brandon","Plantation","Deltona","Largo","Boynton Beach","Deerfield Beach","Fort Myers","Melbourne","Palm Beach Gardens","Kissimmee","Homestead","Pensacola","Daytona Beach","Coconut Creek","Lauderhill","Weston","Clearwater Beach","Sarasota","Gainesville","Ocala","Naples","Marco Island","Destin","Panama City","Tallahassee","Bradenton","Spring Hill","Riverview","Wesley Chapel","Land O Lakes","Apopka","Sanford","Clermont","Oviedo","Winter Park"],
  GA: ["Atlanta","Columbus","Augusta","Savannah","Athens","Macon","Roswell","Albany","Johns Creek","Warner Robins","Alpharetta","Marietta","Valdosta","Smyrna","Sandy Springs","Brookhaven","Dunwoody","Peachtree City","South Fulton","Gainesville","Kennesaw","Lawrenceville","Rome","Canton","Stonecrest","Hinesville","Douglasville","Evans","Statesboro","Newnan","Fayetteville","Woodstock","Milton","Duluth","Suwanee","Buford","Cumming","Cartersville","Dalton","Griffin","Thomasville","Brunswick","Moultrie","Tifton","Valdosta","Warner Robins"],
  HI: ["Honolulu","Pearl City","Hilo","Kailua","Waipahu","Kaneohe","Mililani","Kahului","Kihei","Kapolei","Ewa Beach","Kailua-Kona","Waimalu","Halawa","Schofield Barracks","Nanakuli","Wahiawa","Wailuku","Lahaina","Makakilo"],
  ID: ["Boise","Nampa","Meridian","Idaho Falls","Pocatello","Caldwell","Coeur d'Alene","Twin Falls","Lewiston","Post Falls","Rexburg","Moscow","Eagle","Kuna","Ammon","Chubbuck","Hayden","Mountain Home","Blackfoot","Garden City","Jerome","Burley","Star","Sandpoint","American Falls","Hailey","Sun Valley","Rupert","Weiser","Emmett"],
  IL: ["Chicago","Aurora","Joliet","Naperville","Rockford","Springfield","Elgin","Peoria","Champaign","Waukegan","Cicero","Bloomington","Arlington Heights","Evanston","Decatur","Schaumburg","Bolingbrook","Palatine","Skokie","Des Plaines","Orland Park","Tinley Park","Oak Lawn","Berwyn","Mount Prospect","Normal","Wheaton","Downers Grove","Hoffman Estates","Oak Park","Carol Stream","Hanover Park","Glenview","Streamwood","Romeoville","Round Lake Beach","Bartlett","Plainfield","Carpentersville","Mundelein","Lombard","Addison","Crystal Lake","Elgin","Geneva","St. Charles","Batavia","Oswego","Aurora","Yorkville"],
  IN: ["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Bloomington","Hammond","Gary","Muncie","Terre Haute","Noblesville","Anderson","Greenwood","Elkhart","Kokomo","Lafayette","Columbus","Portage","Lawrence","Richmond","New Albany","Merrillville","Mishawaka","Valparaiso","Goshen","Michigan City","West Lafayette","Jeffersonville","Avon","Brownsburg","Zionsville","Plainfield","Greenfield","Franklin","Shelbyville"],
  IA: ["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City","Waterloo","Council Bluffs","Ames","West Des Moines","Dubuque","Ankeny","Urbandale","Cedar Falls","Marion","Bettendorf","Mason City","Marshalltown","Clinton","Burlington","Ottumwa","Waukee","Johnston","Coralville","North Liberty","Clive","Muscatine","Fort Dodge","Altoona","Indianola","Norwalk","Oskaloosa","Newton","Pella","Fairfield","Keokuk"],
  KS: ["Wichita","Overland Park","Kansas City","Olathe","Topeka","Lawrence","Shawnee","Manhattan","Lenexa","Salina","Hutchinson","Leavenworth","Leawood","Dodge City","Garden City","Prairie Village","Derby","Junction City","Liberal","Merriam","Emporia","Pittsburg","Gardner","Great Bend","Newton","Hays","Roeland Park","McPherson","Ottawa","Augusta","Andover","Park City","Bel Aire","Maize","Valley Center"],
  KY: ["Louisville","Lexington","Bowling Green","Owensboro","Covington","Richmond","Georgetown","Florence","Hopkinsville","Elizabethtown","Nicholasville","Henderson","Frankfort","Independence","Jeffersontown","Paducah","Radcliff","Ashland","Madisonville","Murray","Erlanger","Winchester","St. Matthews","Danville","Burlington","Shively","Glasgow","Berea","Bardstown","Shelbyville","Lawrenceburg","Versailles","Harrodsburg","Campbellsville","Mayfield"],
  LA: ["New Orleans","Baton Rouge","Shreveport","Lafayette","Lake Charles","Kenner","Bossier City","Monroe","Alexandria","Metairie","Slidell","New Iberia","Ruston","Sulphur","Central","Houma","Marrero","Hammond","Harvey","Mandeville","Terrytown","Natchitoches","Opelousas","Denham Springs","Zachary","Bayou Cane","Laplace","Prairieville","Shenandoah","Chalmette","Gretna","Westwego","Covington","Bogalusa","Bastrop"],
  ME: ["Portland","Lewiston","Bangor","South Portland","Auburn","Biddeford","Sanford","Saco","Augusta","Westbrook","Waterville","Brewer","Orono","Caribou","Old Town","Rockland","Presque Isle","Bath","Ellsworth","Belfast","Gardiner","Houlton","Bar Harbor","Calais","Farmington","Brunswick","Topsham","Windham","Gorham","Scarborough"],
  MD: ["Baltimore","Frederick","Rockville","Gaithersburg","Bowie","Hagerstown","Annapolis","College Park","Salisbury","Laurel","Greenbelt","Cumberland","Westminster","Hyattsville","Takoma Park","Easton","Elkton","Havre de Grace","Aberdeen","Bel Air","Waldorf","Clinton","Dundalk","Essex","Pikesville","Towson","Catonsville","Germantown","Silver Spring","Bethesda","Potomac","Chevy Chase","Ellicott City","Columbia","Glen Burnie","Owings Mills","Randallstown","Reisterstown","Lutherville","Timonium"],
  MA: ["Boston","Worcester","Springfield","Lowell","Cambridge","New Bedford","Brockton","Quincy","Lynn","Fall River","Somerville","Haverhill","Lawrence","Malden","Waltham","Medford","Taunton","Chicopee","Revere","Peabody","Methuen","Barnstable","Pittsfield","Attleboro","Arlington","Everett","Weymouth","Salem","Newton","Leominster","Framingham","Marlborough","Woburn","Chelsea","Beverly","Gloucester","Plymouth","Agawam","Northampton","Fitchburg","Holyoke","Westfield","Watertown","Brookline","Dedham","Needham","Wellesley","Natick","Milford","Shrewsbury"],
  MI: ["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Dearborn","Livonia","Clinton Township","Canton","Westland","Troy","Farmington Hills","Macomb","Kalamazoo","Wyoming","Southfield","Rochester Hills","Taylor","St. Clair Shores","Pontiac","Dearborn Heights","Royal Oak","Novi","Battle Creek","Saginaw","Kentwood","East Lansing","Roseville","Shelby Township","Midland","Bay City","Holland","Mount Pleasant","Portage","Muskegon","Jackson","Traverse City","Marquette","Alpena","Cadillac","Owosso","Monroe","Niles"],
  MN: ["Minneapolis","Saint Paul","Rochester","Duluth","Bloomington","Brooklyn Park","Plymouth","Saint Cloud","Eagan","Woodbury","Coon Rapids","Eden Prairie","Burnsville","Maple Grove","Minnetonka","Apple Valley","Edina","St. Louis Park","Mankato","Moorhead","Blaine","Shakopee","Maplewood","Richfield","Cottage Grove","Roseville","Lakeville","Inver Grove Heights","Andover","Brooklyn Center","Chaska","Chanhassen","Prior Lake","Savage","Lino Lakes","White Bear Lake","Stillwater","Elk River","Fridley","Columbia Heights"],
  MS: ["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi","Meridian","Tupelo","Olive Branch","Greenville","Horn Lake","Clinton","Pearl","Brandon","Ridgeland","Madison","Oxford","Starkville","Vicksburg","Pascagoula","Columbus","Natchez","Long Beach","Ocean Springs","Bay St. Louis","Laurel","Corinth","Grenada","Gautier","Hernando","D'Iberville","Flowood","Byram","Petal","Picayune","Greenwood"],
  MO: ["Kansas City","St. Louis","Springfield","Columbia","Independence","Lee's Summit","O'Fallon","St. Joseph","St. Charles","Blue Springs","Joplin","Florissant","Chesterfield","Jefferson City","Cape Girardeau","Wildwood","University City","Ballwin","Raytown","Liberty","Wentzville","Kirkwood","Maryland Heights","Hazelwood","Gladstone","Belton","Webster Groves","Sedalia","Arnold","Ferguson","St. Peters","Oakville","Mehlville","Rolla","Sikeston"],
  MT: ["Billings","Missoula","Great Falls","Bozeman","Butte","Helena","Kalispell","Havre","Anaconda","Miles City","Livingston","Whitefish","Lewistown","Sidney","Glendive","Belgrade","Laurel","Hardin","Glasgow","Polson","Hamilton","Colstrip","Cut Bank","Malta","Dillon"],
  NE: ["Omaha","Lincoln","Bellevue","Grand Island","Kearney","Fremont","Hastings","Norfolk","North Platte","Columbus","Papillion","La Vista","Scottsbluff","South Sioux City","Beatrice","Lexington","Gering","Alliance","Blair","York","McCook","Nebraska City","Seward","Crete","Ralston","Chalco","Millard","Elkhorn","Gretna","Springfield"],
  NV: ["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City","Fernley","Elko","Mesquite","Boulder City","Enterprise","Sunrise Manor","Spring Valley","Summerlin South","Paradise","Whitney","Winchester","Centennial Hills","East Las Vegas","Pahrump","Laughlin","Fallon","West Wendover","Minden","Gardnerville","Sun Valley","Incline Village","Winnemucca","Battle Mountain","Ely"],
  NH: ["Manchester","Nashua","Concord","Dover","Rochester","Keene","Portsmouth","Laconia","Lebanon","Claremont","Somersworth","Derry","Hudson","Londonderry","Merrimack","Bedford","Goffstown","Exeter","Salem","Hampton","Durham","Milford","Pelham","Amherst","Hooksett","Windham","Raymond","Plaistow","Pembroke","Weare"],
  NJ: ["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Lakewood","Toms River","Hamilton","Trenton","Clifton","Camden","Brick","Passaic","Union City","Bayonne","East Orange","Vineland","New Brunswick","Perth Amboy","Irvington","Hoboken","Plainfield","Atlantic City","West New York","Parsippany","Hackensack","Sayreville","Piscataway","Kearny","East Brunswick","Cherry Hill","Marlboro","Old Bridge","South Brunswick","Manalapan","Freehold","Jackson","Bridgewater","Wayne","Livingston","Montclair","Morristown","Linden","Rahway","Union","Springfield","Westfield","Cranford","Mahwah","Mount Laurel","Voorhees","Moorestown","Galloway","Egg Harbor Township","Teaneck","Bergenfield","Englewood","Fort Lee","Englewood Cliffs","Ridgewood","Fair Lawn","Garfield","Lodi","Nutley","Belleville","Bloomfield","West Orange","South Orange","Maplewood","Millburn","Summit","Chatham","Madison","Florham Park","East Hanover","Mount Olive","Roxbury","Mount Arlington","Landing","Rockaway","Mine Hill","Wharton","Dover","Netcong","Lake Hopatcong","Hopatcong","Byram","Sparta","Newton","Hardyston","Vernon","Hamburg","Franklin","Ogdensburg","Branchville","Augusta","Sussex","Montague","Frankford","Stillwater","Hampton","High Bridge","Clinton","Flemington","Raritan","Bound Brook","Manville","Somerville","Hillsborough","Bernardsville","Bedminster","Peapack","Gladstone","Far Hills","Mendham","Chester","Long Valley","Budd Lake","Flanders","Mount Olive","Ledgewood","Succasunna","Roxbury","Jefferson","Oak Ridge","Wharton","Mine Hill","Victory Gardens","Netcong","Stanhope","Byram","Hopatcong","Lake Hopatcong","Budd Lake","Flanders","Mount Olive","Ledgewood","Succasunna","North Haledon","Haledon","Prospect Park","Woodland Park","Little Falls","Totowa","Wayne","Pompton Plains","Riverdale","Lincoln Park","Boonton","Mountain Lakes","Denville","Rockaway","Randolph","Morris Plains","Whippany","East Hanover","Florham Park","Hanover","Parsippany","Morris Township","Morristown","Madison","Chatham","Summit","New Providence","Berkeley Heights","Springfield","Millburn","Short Hills","Maplewood","South Orange","Livingston","West Orange","Orange","East Orange","Montclair","Glen Ridge","Bloomfield","Nutley","Belleville","Kearny","Harrison","East Newark","Lyndhurst","Rutherford","East Rutherford","Carlstadt","Wood-Ridge","Moonachie","Little Ferry","Ridgefield Park","South Hackensack","Bogota","Teaneck","Englewood","Englewood Cliffs","Tenafly","Cresskill","Alpine","Demarest","Closter","Haworth","Harrington Park","Northvale","Rockleigh","Old Tappan","Park Ridge","Woodcliff Lake","River Vale","Hillsdale","Westwood","Park Ridge","Montvale","Woodcliff Lake","River Vale","Hillsdale","Westwood","Emerson","Oradell","River Edge","New Milford","Bergenfield","Dumont","Haworth","Harrington Park","Northvale","Closter","Alpine","Demarest","Cresskill","Tenafly","Englewood","Leonia","Fort Lee","Edgewater","Cliffside Park","Fairview","Ridgefield","Palisades Park","North Bergen","Guttenberg","West New York","Weehawken","Union City","Jersey City","Secaucus","Kearny","Harrison","Bellmawr","Runnemede","Barrington","Haddon Heights","Audubon","Collingswood","Haddonfield","Merchantville","Pennsauken","Gloucester City","Woodbury","Deptford","Glassboro","Sewell","Turnersville","Blackwood","Laurel Springs","Stratford","Lindenwold","Somerdale","Lawnside","Mount Ephraim","Oaklyn","Westmont","Haddon Township","Cherry Hill","Voorhees","Marlton","Evesham","Moorestown","Mount Holly","Lumberton","Medford","Medford Lakes","Southampton","Tabernacle","Shamong","Chatsworth","Tuckerton","Manahawkin","Stafford","Little Egg Harbor","Tuckerton","Bass River","New Gretna","Barnegat","Waretown","Ocean Gate","Island Heights","Seaside Heights","Seaside Park","Ship Bottom","Long Beach Township","Surf City","Harvey Cedars","Barnegat Light","Loveladies","Beach Haven","Holgate","Spray Beach","North Beach Haven","Brant Beach","Beach Haven Terrace","Peahala Park","Crest","South Lido"],
  NM: ["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell","Farmington","Clovis","Hobbs","Alamogordo","Carlsbad","Gallup","Artesia","Lovington","Silver City","Deming","Portales","Los Alamos","Aztec","Espanola","Ruidoso","Bernalillo","Taos","Sunland Park","Truth or Consequences","Grants","Chaparral","White Rock","Angel Fire","Corrales","Rio Rancho"],
  NY: ["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle","Mount Vernon","Schenectady","Utica","White Plains","Troy","Niagara Falls","Binghamton","Rome","Long Beach","Ithaca","Poughkeepsie","Hempstead","Cheektowaga","Tonawanda","Spring Valley","Ramapo","Valley Stream","Levittown","Freeport","Hicksville","Amherst","Brookhaven","Islip","Oyster Bay","North Hempstead","Huntington","Smithtown","Babylon","Southampton","East Hampton","Riverhead","Northport","Port Jefferson","Stony Brook","Medford","Patchogue","Ronkonkoma","Hauppauge","Brentwood","Bay Shore","Lindenhurst","Copiague","Massapequa","Wantagh","Seaford","Merrick","Bellmore","Farmingdale","East Meadow","Garden City","Mineola","Westbury","New Hyde Park","Great Neck","Port Washington","Manhasset","Roslyn","Glen Cove","Carle Place","Floral Park","Elmont","Jamaica","Queens Village","Hollis","St. Albans","Springfield Gardens","Cambria Heights","Rosedale","Far Rockaway","Woodhaven","Richmond Hill","Ozone Park","South Ozone Park","Howard Beach","Broad Channel","Belle Harbor","Rockaway Park","Staten Island","Bronx","Brooklyn","Flatbush","Canarsie","Flatlands","East Flatbush","Crown Heights","Prospect Heights","Park Slope","Sunset Park","Bay Ridge","Bensonhurst","Gravesend","Sheepshead Bay","Brighton Beach","Coney Island","Fort Hamilton","Bath Beach","Dyker Heights","Borough Park","Midwood","Kensington","Windsor Terrace","Carroll Gardens","Red Hook","Gowanus","Cobble Hill","Boerum Hill","Downtown Brooklyn","DUMBO","Vinegar Hill","Fort Greene","Clinton Hill","Bedford-Stuyvesant","Bushwick","Ridgewood","Glendale","Middle Village","Maspeth","Elmhurst","Jackson Heights","Flushing","Jamaica","Howard Beach"],
  NC: ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington","High Point","Concord","Greenville","Asheville","Gastonia","Jacksonville","Chapel Hill","Rocky Mount","Burlington","Wilson","Huntersville","Kannapolis","Apex","Lewisville","Holly Springs","Monroe","Mooresville","Goldsboro","Hickory","Wake Forest","Indian Trail","Sanford","Statesville","Salisbury","Cornelius","Matthews","Mint Hill","Harrisburg","Stallings","Waxhaw","Marvin","Ballantyne","Pinehurst","Southern Pines","Lumberton","Thomasville","Kernersville","Asheboro","Clemmons","Boone","Morganton","Lenoir"],
  ND: ["Fargo","Bismarck","Grand Forks","Minot","West Fargo","Williston","Dickinson","Mandan","Jamestown","Wahpeton","Devils Lake","Watford City","Valley City","Lincoln","Grafton","Beulah","Rugby","Hazen","Bottineau","Lisbon"],
  OH: ["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Parma","Canton","Youngstown","Lorain","Hamilton","Springfield","Kettering","Elyria","Lakewood","Newark","Cuyahoga Falls","Middletown","Euclid","Mansfield","Mentor","Beavercreek","Cleveland Heights","Strongsville","Fairfield","Dublin","Huber Heights","Westerville","Upper Arlington","Grove City","Reynoldsburg","Hilliard","Gahanna","Pickerington","Lewis Center","New Albany","Worthington","Delaware","Marion","Findlay","Lima","Sandusky","Zanesville","Lancaster","Chillicothe","Portsmouth","Ashland","Wooster","Medina","Wadsworth"],
  OK: ["Oklahoma City","Tulsa","Norman","Broken Arrow","Edmond","Lawton","Moore","Midwest City","Enid","Stillwater","Muskogee","Bartlesville","Owasso","Shawnee","Yukon","Ardmore","Ponca City","Bixby","Duncan","Sapulpa","Del City","Bethany","Jenks","Sand Springs","Altus","McAlester","Tahlequah","Claremore","Chickasha","El Reno","Glenpool","Coweta","Wagoner","Guthrie","Weatherford","Durant","Ada","Lawton","Lawton","Lawton"],
  OR: ["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton","Bend","Medford","Springfield","Corvallis","Albany","Tigard","Lake Oswego","Keizer","Grants Pass","Oregon City","McMinnville","Redmond","Tualatin","West Linn","Woodburn","Forest Grove","Sherwood","Newberg","Wilsonville","Central Point","Klamath Falls","Roseburg","Pendleton","Ashland","Happy Valley","Milwaukie","Canby","Coos Bay","The Dalles","Astoria","Hood River","Newport","Lincoln City","Florence"],
  PA: ["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster","Harrisburg","York","Altoona","State College","Wilkes-Barre","Chester","Easton","McKeesport","Hazleton","Norristown","Johnstown","Williamsport","New Castle","Pottsville","Hermitage","Meadville","Sunbury","Sharon","DuBois","Butler","Lebanon","Chambersburg","Pottstown","Abington","Upper Darby","Lower Merion","Haverford","Radnor","Tredyffrin","West Chester","Downingtown","Coatesville","Phoenixville","Paoli","Wayne","Berwyn","Malvern","Exton","Kennett Square","Doylestown","Lansdale","North Wales","Hatboro","Horsham","Warminster","Southampton","Bensalem","Bristol","Morrisville","Yardley","Newtown","Langhorne","Levittown"],
  RI: ["Providence","Cranston","Warwick","Pawtucket","East Providence","Woonsocket","Coventry","Cumberland","North Providence","South Kingstown","Johnston","North Kingstown","West Warwick","Bristol","Westerly","Smithfield","Lincoln","Central Falls","Portsmouth","Barrington","Newport","Tiverton","Middletown","Narragansett","East Greenwich"],
  SC: ["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville","Summerville","Goose Creek","Hilton Head","Spartanburg","Myrtle Beach","Florence","Anderson","Mauldin","Greer","Aiken","Greenwood","Simpsonville","Hanahan","Conway","Bluffton","Socastee","Lexington","North Augusta","Duncan","Taylors","Fort Mill","Irmo","Cayce","Gaffney","Sumter","Orangeburg","Beaufort","Newberry","Lancaster","Laurens","Hartsville","Georgetown","Union","Easley"],
  SD: ["Sioux Falls","Rapid City","Aberdeen","Brookings","Watertown","Mitchell","Yankton","Pierre","Huron","Vermillion","Spearfish","Sturgis","Brandon","Box Elder","Harrisburg","Tea","Dell Rapids","Madison","Mobridge","Hot Springs","Lead","Deadwood","Custer","Hill City","Keystone"],
  TN: ["Memphis","Nashville","Knoxville","Chattanooga","Clarksville","Murfreesboro","Franklin","Jackson","Johnson City","Bartlett","Hendersonville","Kingsport","Collierville","Cleveland","Smyrna","Germantown","Spring Hill","Columbia","La Vergne","Gallatin","Cookeville","Lebanon","Mount Juliet","Brentwood","Maryville","Bristol","Morristown","Oak Ridge","Goodlettsville","Shelbyville","Sevierville","Gatlinburg","Pigeon Forge","Dickson","Tullahoma","Athens","Maryville","Alcoa","Farragut","Powell","Corryton","Strawberry Plains","Dandridge","Newport","Greeneville","Elizabethton","Kingsport","Bristol"],
  TX: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Irving","Garland","Frisco","McKinney","Amarillo","Grand Prairie","Brownsville","Killeen","Pasadena","Mesquite","McAllen","Denton","Waco","Carrollton","Midland","Beaumont","Abilene","Round Rock","Odessa","Richardson","Pearland","College Station","Tyler","Lewisville","Edinburg","League City","Allen","Sugar Land","Wichita Falls","Lubbock","El Paso","Abilene","Midland","Odessa","Amarillo","Waco","Beaumont","Longview","Tyler","Nacogdoches","Lufkin","Huntsville","Conroe","The Woodlands","Spring","Katy","Cypress","Humble","Baytown","Galveston","Lake Jackson","Freeport","Clute","Angleton","Pearland","Friendswood","Webster","Clear Lake City","Nassau Bay","Seabrook","La Porte","Deer Park","Channelview","Jacinto City","Galena Park","South Houston","Bellaire","West University Place","Missouri City","Stafford","Sugar Land","Richmond","Rosenberg","Alvin","Dickinson","Texas City","League City","Kemah","Clear Lake Shores","El Lago","Taylor Lake Village","Pasadena","La Marque","Hitchcock","Santa Fe","Alvin","Manvel","Iowa Colony","Rosharon","Fresno","Missouri City","Stafford","Greatwood","New Territory","First Colony","Sienna Plantation","Cinco Ranch","Katy","Fulshear","Brookshire","Waller","Hempstead","Brenham","College Station","Bryan","Navasota","Huntsville","Conroe","Willis","Montgomery","Magnolia","Tomball","Spring","Klein","Humble","Atascocita","Kingwood","Porter","New Caney","Splendora","Cleveland","Dayton","Baytown","La Marque","Galveston","Crystal Beach","Bolivar Peninsula","Winnie","Nederland","Port Arthur","Groves","Port Neches","Beaumont","Orange","Vidor","Bridge City","Orangefield","West Orange","Pine Forest"],
  UT: ["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden","St. George","Layton","South Jordan","Lehi","Millcreek","Taylorsville","Logan","Murray","Draper","Bountiful","Riverton","Roy","Spanish Fork","American Fork","Syracuse","Herriman","Cottonwood Heights","Springville","Clearfield","Kaysville","Cedar City","Tooele","Midvale","Saratoga Springs","Eagle Mountain","Clinton","Payson","Lindon","Pleasant Grove","Alpine","Highland","Cedar Hills","Vineyard","Vineyard","Bluffdale"],
  VT: ["Burlington","South Burlington","Rutland","Essex Junction","Barre","Montpelier","Winooski","St. Albans","Newport","Vergennes","Middlebury","Brattleboro","Bellows Falls","Hardwick","Swanton","Johnson","Morrisville","Hyde Park","St. Johnsbury","White River Junction","Northfield","Randolph","Chelsea","Bradford","Wells River"],
  VA: ["Virginia Beach","Norfolk","Chesapeake","Richmond","Newport News","Alexandria","Hampton","Roanoke","Portsmouth","Suffolk","Lynchburg","Harrisonburg","Charlottesville","Danville","Manassas","Petersburg","Fredericksburg","Winchester","Salem","Staunton","Fairfax","Falls Church","Bristol","Radford","Williamsburg","Waynesboro","Poquoson","Buena Vista","Emporia","Galax","Reston","Herndon","Sterling","Ashburn","Leesburg","Dulles","South Riding","Centreville","Chantilly","Vienna","McLean","Tysons","Great Falls","Annandale","Springfield","Burke","Woodbridge","Dale City","Lake Ridge","Dumfries","Triangle","Quantico","Stafford","Fredericksburg","Spotsylvania","Culpeper","Warrenton","Manassas Park","Gainesville","Haymarket","Bristow","Nokesville","Bealeton","Remington"],
  WA: ["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton","Kirkland","Bellingham","Kennewick","Yakima","Pasco","Federal Way","Marysville","Spokane Valley","Richland","Shoreline","South Hill","Lakewood","Auburn","Redmond","Sammamish","Burien","Lake Stevens","Olympia","Puyallup","Bremerton","Edmonds","Mount Vernon","Marysville","Snohomish","Monroe","Sultan","Gold Bar","Index","Startup","Granite Falls","Darrington","Arlington","Stanwood","Camano Island","Anacortes","Burlington","Sedro-Woolley","Concrete","Rockport","Marblemount","Winthrop","Twisp","Okanogan","Omak","Brewster","Chelan","Wenatchee","East Wenatchee","Rock Island","Quincy","George","Ephrata","Soap Lake","Moses Lake","Othello","Ritzville","Connell","Pasco","Kennewick","Richland","West Richland","Benton City","Prosser","Grandview","Sunnyside","Yakima","Selah","Naches","Terrace Heights","Union Gap","Wapato","Toppenish","Granger","Mabton","Satus","Harrah","White Swan","Goldendale","Dallesport","Bingen","White Salmon","Stevenson","Carson","Underwood","Lyle","Wishram","Maryhill","Roosevelt","Paterson","Plymouth","Irrigon"],
  WV: ["Charleston","Huntington","Morgantown","Parkersburg","Wheeling","Weirton","Fairmont","Martinsburg","Beckley","Clarksburg","South Charleston","St. Albans","Vienna","Bluefield","Cross Lanes","Hurricane","Bridgeport","Teays Valley","Lewisburg","Princeton","Oak Hill","Summersville","Elkins","Nitro","Dunbar","Dunbar","Barboursville","Milton","Point Pleasant","Ripley"],
  WI: ["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha","Eau Claire","Oshkosh","Janesville","West Allis","La Crosse","Sheboygan","Wauwatosa","Fond du Lac","New Berlin","Wausau","Brookfield","Greenfield","Beloit","De Pere","Menomonee Falls","Franklin","Oak Creek","Manitowoc","West Bend","Sun Prairie","Superior","Stevens Point","Neenah","Menasha","Kaukauna","Oshkosh","Fond du Lac","Beaver Dam","Watertown","Fort Atkinson","Whitewater","Jefferson","Lake Geneva","Burlington","Racine","Kenosha","Pleasant Prairie","Somers","Mount Pleasant","Caledonia"],
  WY: ["Cheyenne","Casper","Laramie","Gillette","Rock Springs","Sheridan","Green River","Evanston","Riverton","Cody","Lander","Torrington","Powell","Douglas","Rawlins","Worland","Buffalo","Wheatland","Thermopolis","Afton","Jackson","Pinedale","Kemmerer","Diamondville","Mountain View"],
};

// ─────────────────────────────────────────────────────────────────────────────
//  SERVICE TYPES & NAME TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_TYPES = ["Grooming","Dog Walking","Veterinary","Boarding","Training","Daycare"];

const NAME_TEMPLATES = {
  Grooming: [
    c=>`${c} Paws & Claws Grooming`,c=>`${c} Pup Spa & Salon`,c=>`${c} Bark & Bath Studio`,
    c=>`${c} Pampered Pets Grooming`,c=>`${c} Snip & Suds`,c=>`${c} Fluffy Cuts`,
    c=>`${c} The Grooming Parlor`,c=>`${c} Chic Paws Salon`,c=>`${c} Wagging Tails Spa`,
    c=>`${c} Shaggy to Chic`,c=>`${c} Dapper Dogs Grooming`,c=>`${c} Fur & Fabulous`,
    c=>`${c} Top Dog Grooming`,c=>`${c} Bubble & Blowout`,c=>`${c} Four Paws Spa`,
  ],
  "Dog Walking": [
    c=>`${c} Dog Walkers`,c=>`${c} Happy Paws Walking Co`,c=>`${c} Leash & Go`,
    c=>`${c} Tail Waggers Walking`,c=>`${c} Urban Paws`,c=>`${c} Paw Patrol Walks`,
    c=>`${c} Sniff & Stroll`,c=>`${c} Daily Dog Walks`,c=>`${c} Fetch & Walk`,
    c=>`${c} On The Leash`,c=>`${c} Pup Steps`,c=>`${c} The Walkies Company`,
    c=>`${c} K9 Strollers`,c=>`${c} Pack Leaders`,c=>`${c} Wag & Wander`,
  ],
  Veterinary: [
    c=>`${c} Animal Hospital`,c=>`${c} Veterinary Clinic`,c=>`${c} Pet Medical Center`,
    c=>`${c} Animal Care Associates`,c=>`${c} Complete Pet Care`,c=>`${c} Animal Wellness Center`,
    c=>`${c} Pet Health Center`,c=>`${c} Family Veterinary Clinic`,c=>`${c} Animal Emergency & Care`,
    c=>`${c} Premier Vet Hospital`,c=>`${c} Companion Animal Clinic`,c=>`${c} Advanced Pet Care`,
    c=>`${c} Gentle Paws Vet`,c=>`${c} Heartland Animal Hospital`,c=>`${c} VetCare Associates`,
  ],
  Boarding: [
    c=>`${c} Pet Hotel`,c=>`${c} Dog Boarding Resort`,c=>`${c} Paws Inn`,
    c=>`${c} Luxury Pet Lodge`,c=>`${c} The Pet Suite`,c=>`${c} Canine Country Club`,
    c=>`${c} Paw Palace`,c=>`${c} Happy Tails Boarding`,c=>`${c} Pet Retreat`,
    c=>`${c} Snooze & Wag`,c=>`${c} Overnight Paws`,c=>`${c} Dog Dreamland`,
    c=>`${c} Bark & Bed`,c=>`${c} Rest & Relax Pet Lodge`,c=>`${c} Cozy Paws Boarding`,
  ],
  Training: [
    c=>`${c} Dog Training Academy`,c=>`${c} K9 Academy`,c=>`${c} Canine Behavior School`,
    c=>`${c} Dog Obedience Center`,c=>`${c} Good Dog Training`,c=>`${c} Pawsitive Training`,
    c=>`${c} Sit & Stay School`,c=>`${c} Off Leash K9 Training`,c=>`${c} Elite Dog Trainers`,
    c=>`${c} Balanced Paws Training`,c=>`${c} Smart Paws Academy`,c=>`${c} Bark Smart Training`,
    c=>`${c} Command School for Dogs`,c=>`${c} Dogs Unleashed Training`,c=>`${c} Obedient Pups School`,
  ],
  Daycare: [
    c=>`${c} Dog Daycare`,c=>`${c} Pet Day Camp`,c=>`${c} Doggy Day Out`,
    c=>`${c} Paws & Play Daycare`,c=>`${c} Happy Hounds Daycare`,c=>`${c} Barkville Daycare`,
    c=>`${c} All Day Dog Care`,c=>`${c} Wag & Play`,c=>`${c} Furever Fun Daycare`,
    c=>`${c} The Dog Den`,c=>`${c} Sunny Paws Daycare`,c=>`${c} Play All Day Dogs`,
    c=>`${c} Pup Social Club`,c=>`${c} Daycare for Dogs`,c=>`${c} Tails & Tales Daycare`,
  ],
};

const STATE_AREA_CODES = {
  AL:["205","251","256","334"],AK:["907"],AZ:["480","520","602","623","928"],AR:["479","501","870"],
  CA:["213","310","323","408","415","510","619","626","650","714","760","818","909","916","925","949"],
  CO:["303","719","720","970"],CT:["203","475","860"],DE:["302"],
  FL:["239","305","321","352","386","407","561","727","754","772","786","813","850","863","904","941","954"],
  GA:["229","404","470","478","678","706","762","770","912"],HI:["808"],
  ID:["208"],IL:["217","224","312","331","618","630","708","773","815","847"],
  IN:["219","260","317","574","765","812"],IA:["319","515","563","641","712"],
  KS:["316","620","785","913"],KY:["270","502","606","859"],
  LA:["225","318","337","504","985"],ME:["207"],MD:["240","301","410","443"],
  MA:["339","351","413","508","617","774","781","857","978"],
  MI:["231","248","269","313","517","586","616","734","810","906","947","989"],
  MN:["218","320","507","612","651","763","952"],MS:["228","601","662","769"],
  MO:["314","417","573","636","660","816"],MT:["406"],NE:["308","402"],
  NV:["702","725","775"],NH:["603"],
  NJ:["201","551","609","732","848","856","862","908","973"],
  NM:["505","575"],
  NY:["212","315","347","516","518","585","607","631","646","716","718","845","914","917","929"],
  NC:["252","336","704","743","828","910","919","980"],ND:["701"],
  OH:["216","220","234","330","380","419","440","513","567","614","740","937"],
  OK:["405","539","580","918"],OR:["458","503","541","971"],
  PA:["215","223","267","272","412","445","484","570","610","717","724","814"],
  RI:["401"],SC:["803","843","854","864"],SD:["605"],
  TN:["423","615","629","731","865","901","931"],
  TX:["210","214","254","281","325","346","361","409","430","432","469","512","682","713","726","737","806","817","830","832","903","915","940","956","972"],
  UT:["385","435","801"],VT:["802"],
  VA:["276","434","540","571","703","757","804"],
  WA:["206","253","360","425","509"],WV:["304","681"],
  WI:["262","414","534","608","715","920"],WY:["307"],
};

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
function genPhone(state, seed) {
  const ac = pick(STATE_AREA_CODES[state] || ["555"], seed);
  return `(${ac}) ${200 + seed * 37 % 800}-${String(1000 + seed * 113 % 9000).padStart(4,"0")}`;
}
function genWebsite(city, svc, seed) {
  const c = city.toLowerCase().replace(/['\s.,\-]/g,"").replace(/[^a-z0-9]/g,"");
  const s = svc.toLowerCase().replace(/\s/g,"");
  return `${c}${s}${pick(["pets","paws","dogs","animal","care","petcare","k9"],seed)}.com`;
}
function genRating(seed) {
  return Math.round((4.2 + seed * 11 % 800 / 1000) * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
//  BUILD — deduplicate cities first, then generate 2 providers per city/service
// ─────────────────────────────────────────────────────────────────────────────
function buildProviders() {
  const all = [];
  let g = 1;
  for (const [state, rawCities] of Object.entries(STATE_CITIES)) {
    // Deduplicate cities per state
    const seen = new Set();
    const cities = rawCities.filter(c => {
      const key = c.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    cities.forEach((city, ci) => {
      const stateCity = `${state}_${city.toLowerCase().trim()}`; // fast-query key
      SERVICE_TYPES.forEach((svc, si) => {
        const tmpl = NAME_TEMPLATES[svc];
        [0, 7].forEach((offset, provIdx) => {
          all.push({
            businessName: tmpl[(ci + si * 3 + offset) % tmpl.length](city),
            serviceType: svc,
            city,
            state,
            stateCity,                    // ← key field for fast queries
            phone:   genPhone(state, g),
            website: genWebsite(city, svc, g + provIdx * 99),
            rating:  genRating(g++),
          });
        });
      });
    });
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEED
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  const providers = buildProviders();
  const stateCount = Object.keys(STATE_CITIES).length;
  const cityCount  = Object.values(STATE_CITIES).reduce((s,a)=>s+new Set(a.map(c=>c.toLowerCase().trim())).size, 0);
  console.log(`\n🐾  MyPetDex — Provider Seed`);
  console.log(`    States: ${stateCount}  |  Cities: ${cityCount}  |  Providers: ${providers.length}\n`);

  const col   = db.collection("seedProviders");
  const CHUNK = 200;
  let written = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < providers.length; i += CHUNK) {
    let retries = 3;
    while (retries > 0) {
      try {
        const batch = db.batch();
        providers.slice(i, i + CHUNK).forEach(p => batch.set(col.doc(), { ...p }));
        await batch.commit();
        written += Math.min(CHUNK, providers.length - i);
        process.stdout.write(`\r  ✅  ${written} / ${providers.length} written`);
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        process.stdout.write(`\r  ⏳  Rate limited — retrying in 3s...              `);
        await sleep(3000);
      }
    }
    await sleep(250);
  }

  console.log(`\n\n🎉  Done! ${providers.length} providers live in Firestore.\n`);
  process.exit(0);
}

seed().catch(err => {
  console.error("\n❌  Seed failed:", err.message, "\n");
  process.exit(1);
});

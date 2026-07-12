// Fun facts for the auto-generated categories, merged into each
// shape's `info.funFact` by scripts/build-shapes.mjs.
//   continentFacts: keyed by Natural-Earth CONTINENT
//   countryFacts:   keyed by Natural-Earth ADM0_A3 (3-letter code)
//   usStateFacts:   keyed by Natural-Earth admin-1 `postal` (2-letter code)

/** @typedef {{ en: string, de: string }} Fact */

/** @type {Record<string, Fact>} */
export const continentFacts = {
	Africa: {
		en: 'The second-largest continent and home to the Sahara, the largest hot desert on Earth.',
		de: 'Der zweitgrößte Kontinent und Heimat der Sahara, der größten Heißwüste der Erde.'
	},
	Asia: {
		en: 'The largest and most populous continent, with both the highest (Everest) and lowest (Dead Sea) points on land.',
		de: 'Der größte und bevölkerungsreichste Kontinent — mit dem höchsten (Everest) und tiefsten (Totes Meer) Punkt an Land.'
	},
	Europe: {
		en: 'The second-smallest continent, yet home to around 50 countries.',
		de: 'Der zweitkleinste Kontinent — und trotzdem Heimat von rund 50 Ländern.'
	},
	'North America': {
		en: 'Stretches from Arctic Canada to tropical Panama and includes the Great Lakes, the largest group of freshwater lakes on Earth.',
		de: 'Reicht von der kanadischen Arktis bis ins tropische Panama und umfasst die Großen Seen, die größte Süßwasserseen-Gruppe der Erde.'
	},
	'South America': {
		en: 'Home to the Amazon rainforest and the Andes, the longest mountain range in the world.',
		de: 'Heimat des Amazonas-Regenwaldes und der Anden, dem längsten Gebirge der Welt.'
	},
	Oceania: {
		en: 'The smallest continent by land area, dominated by Australia and thousands of Pacific islands.',
		de: 'Der flächenmäßig kleinste Kontinent, geprägt von Australien und tausenden Pazifikinseln.'
	},
	Antarctica: {
		en: 'The coldest, windiest and driest continent — about 98% of it is covered by ice.',
		de: 'Der kälteste, windigste und trockenste Kontinent — etwa 98 % sind von Eis bedeckt.'
	}
};

/**
 * Continent stats for the info panel
 * @type {Record<string, { countries: number, population?: number }>}
 */
export const continentStats = {
	Africa: { countries: 54, population: 1_520_000_000 },
	Asia: { countries: 48, population: 4_800_000_000 },
	Europe: { countries: 44, population: 745_000_000 },
	'North America': { countries: 23, population: 604_000_000 },
	'South America': { countries: 12, population: 439_000_000 },
	Oceania: { countries: 14, population: 46_000_000 },
	Antarctica: { countries: 0 }
};

/** @type {Record<string, Fact>} */
export const countryFacts = {
	ALB: {
		en: 'Albanians call their country "Shqipëria", meaning "land of the eagles".',
		de: 'Albaner nennen ihr Land „Shqipëria“ — „Land der Adler“.'
	},
	AUT: {
		en: 'Vienna has topped global "most liveable city" rankings many times.',
		de: 'Wien führte mehrfach die weltweiten Rankings der lebenswertesten Städte an.'
	},
	BEL: {
		en: 'Belgium produces over 200,000 tonnes of chocolate a year.',
		de: 'Belgien produziert jährlich über 200.000 Tonnen Schokolade.'
	},
	BGR: {
		en: 'Bulgaria is one of the world’s biggest producers of rose oil for perfume.',
		de: 'Bulgarien ist einer der weltgrößten Produzenten von Rosenöl für Parfüm.'
	},
	BIH: {
		en: 'Mostar’s Stari Most bridge is famous for traditional 24-metre dives into the river below.',
		de: 'Von der Brücke Stari Most in Mostar springen Mutige traditionell 24 Meter tief in den Fluss.'
	},
	BLR: {
		en: 'Around 40% of Belarus is covered by forest.',
		de: 'Rund 40 % von Belarus sind von Wald bedeckt.'
	},
	CHE: {
		en: 'Switzerland has four national languages: German, French, Italian and Romansh.',
		de: 'Die Schweiz hat vier Landessprachen: Deutsch, Französisch, Italienisch und Rätoromanisch.'
	},
	CZE: {
		en: 'Czechs drink more beer per person than any other nation on Earth.',
		de: 'Tschechen trinken pro Kopf mehr Bier als jede andere Nation der Welt.'
	},
	DEU: {
		en: 'Germany has no general speed limit on much of its Autobahn network.',
		de: 'Auf weiten Teilen der deutschen Autobahn gibt es kein generelles Tempolimit.'
	},
	DNK: {
		en: 'Denmark is often ranked among the happiest countries in the world.',
		de: 'Dänemark zählt regelmäßig zu den glücklichsten Ländern der Welt.'
	},
	ESP: {
		en: 'Spain has the second-highest number of UNESCO World Heritage Sites after Italy.',
		de: 'Spanien hat nach Italien die zweitmeisten UNESCO-Welterbestätten.'
	},
	EST: {
		en: 'Estonia was the first country to offer e-residency and online voting.',
		de: 'Estland bot als erstes Land E-Residency und Online-Wahlen an.'
	},
	FIN: {
		en: 'Finland has around 188,000 lakes — more per capita than any other country.',
		de: 'Finnland hat rund 188.000 Seen — pro Kopf mehr als jedes andere Land.'
	},
	FRA: {
		en: 'France is the most visited country in the world.',
		de: 'Frankreich ist das meistbesuchte Land der Welt.'
	},
	GBR: {
		en: 'The UK is made up of four nations: England, Scotland, Wales and Northern Ireland.',
		de: 'Das Vereinigte Königreich besteht aus vier Nationen: England, Schottland, Wales und Nordirland.'
	},
	GRC: {
		en: 'Greece has thousands of islands, but only about 230 are inhabited.',
		de: 'Griechenland hat tausende Inseln, aber nur etwa 230 sind bewohnt.'
	},
	HRV: {
		en: 'The necktie originated in Croatia — "cravat" comes from "Croat".',
		de: 'Die Krawatte stammt aus Kroatien — „Cravate“ kommt von „Kroate“.'
	},
	HUN: {
		en: 'Budapest sits on over 100 thermal springs and is famous for its bath houses.',
		de: 'Budapest liegt über 100 Thermalquellen und ist für seine Badehäuser berühmt.'
	},
	IRL: {
		en: 'Ireland is nicknamed the Emerald Isle for its lush green landscape.',
		de: 'Irland trägt wegen seiner grünen Landschaft den Beinamen „Smaragdinsel“.'
	},
	ISL: {
		en: 'Iceland runs almost entirely on renewable geothermal and hydro power.',
		de: 'Island deckt seinen Strom fast vollständig aus Geothermie und Wasserkraft.'
	},
	ITA: {
		en: 'Italy is home to the tiny independent states of Vatican City and San Marino.',
		de: 'In Italien liegen die winzigen unabhängigen Staaten Vatikanstadt und San Marino.'
	},
	KOS: {
		en: 'Kosovo, which declared independence in 2008, is one of Europe’s youngest countries.',
		de: 'Der Kosovo erklärte 2008 seine Unabhängigkeit und ist eines der jüngsten Länder Europas.'
	},
	LTU: {
		en: 'A geographic centre of Europe has been calculated to lie just north of Vilnius.',
		de: 'Ein geografischer Mittelpunkt Europas wurde nördlich von Vilnius berechnet.'
	},
	LUX: {
		en: 'Luxembourg was the first country to make all public transport free.',
		de: 'Luxemburg machte als erstes Land den gesamten öffentlichen Nahverkehr kostenlos.'
	},
	LVA: {
		en: 'Latvia is one of the greenest countries in the world, more than half covered by forest.',
		de: 'Lettland ist eines der grünsten Länder der Welt — mehr als die Hälfte ist bewaldet.'
	},
	MDA: {
		en: 'Moldova’s Mileștii Mici holds the world’s largest wine collection.',
		de: 'Moldaus Weinkeller Mileștii Mici beherbergt die größte Weinsammlung der Welt.'
	},
	MKD: {
		en: 'Lake Ohrid is one of the oldest and deepest lakes in Europe.',
		de: 'Der Ohridsee ist einer der ältesten und tiefsten Seen Europas.'
	},
	MLT: {
		en: 'Malta is one of the world’s smallest and most densely populated countries.',
		de: 'Malta ist eines der kleinsten und am dichtesten besiedelten Länder der Welt.'
	},
	MNE: {
		en: 'Montenegro means "black mountain", named after its dark, forested peaks.',
		de: 'Montenegro bedeutet „schwarzer Berg“ — benannt nach seinen dunklen, bewaldeten Gipfeln.'
	},
	NLD: {
		en: 'About a third of the Netherlands lies below sea level.',
		de: 'Etwa ein Drittel der Niederlande liegt unter dem Meeresspiegel.'
	},
	NOR: {
		en: 'Norway’s coastline is so deeply cut by fjords it would stretch around the Earth many times.',
		de: 'Norwegens fjordzerklüftete Küste würde ausgerollt die Erde mehrfach umrunden.'
	},
	POL: {
		en: 'Poland is home to Europe’s last primeval forest, Białowieża, where wild bison roam.',
		de: 'In Polen liegt mit Białowieża Europas letzter Urwald, in dem wilde Wisente leben.'
	},
	PRT: {
		en: 'Portugal produces about half of the world’s cork.',
		de: 'Portugal produziert etwa die Hälfte des weltweiten Korks.'
	},
	ROU: {
		en: "Transylvania's Bran Castle inspired the legend of Dracula.",
		de: 'Schloss Bran in Transsilvanien inspirierte die Dracula-Legende.'
	},
	RUS: {
		en: 'Russia is the largest country on Earth and spans eleven time zones.',
		de: 'Russland ist das größte Land der Erde und erstreckt sich über elf Zeitzonen.'
	},
	SRB: {
		en: 'Serbia’s Belgrade is one of the oldest continuously inhabited cities in Europe.',
		de: 'Serbiens Hauptstadt Belgrad zählt zu den ältesten durchgehend bewohnten Städten Europas.'
	},
	SVK: {
		en: 'Slovakia has more castles and chateaux per capita than any other country.',
		de: 'Die Slowakei hat pro Kopf mehr Burgen und Schlösser als jedes andere Land.'
	},
	SVN: {
		en: 'Over half of Slovenia is covered by forest.',
		de: 'Mehr als die Hälfte Sloweniens ist von Wald bedeckt.'
	},
	SWE: {
		en: 'Sweden recycles so efficiently it sometimes imports rubbish to fuel power plants.',
		de: 'Schweden recycelt so effizient, dass es manchmal Müll importiert, um Kraftwerke zu befeuern.'
	},
	UKR: {
		en: 'Ukraine is the largest country located entirely within Europe.',
		de: 'Die Ukraine ist das größte Land, das vollständig in Europa liegt.'
	},

	// ── Africa ──────────────────────────────────────────────────────────────────
	AGO: { en: 'Angola is one of Africa’s largest oil producers and its official language is Portuguese.', de: 'Angola ist einer der größten Ölproduzenten Afrikas — Amtssprache ist Portugiesisch.' },
	BDI: { en: 'Burundi’s royal drummers are recognised by UNESCO as cultural heritage.', de: 'Burundis königliche Trommler zählen zum UNESCO-Kulturerbe.' },
	BEN: { en: 'Benin is the birthplace of the Vodun (voodoo) religion.', de: 'Benin ist der Ursprung der Vodun-Religion (Voodoo).' },
	BFA: { en: 'The name Burkina Faso means "land of honest people".', de: 'Der Name Burkina Faso bedeutet „Land der aufrichtigen Menschen“.' },
	BWA: { en: 'Botswana is home to the world’s largest population of African elephants.', de: 'Botswana beherbergt die größte Population afrikanischer Elefanten der Welt.' },
	CAF: { en: 'The Central African Republic sits in the heart of the continent and is rich in diamonds.', de: 'Die Zentralafrikanische Republik liegt im Herzen des Kontinents und ist reich an Diamanten.' },
	CIV: { en: 'Ivory Coast is the world’s largest producer of cocoa beans.', de: 'Die Elfenbeinküste ist der weltgrößte Produzent von Kakaobohnen.' },
	CMR: { en: 'Cameroon is nicknamed "Africa in miniature" for its geographic and cultural diversity.', de: 'Kamerun gilt wegen seiner geografischen und kulturellen Vielfalt als „Afrika im Kleinen“.' },
	COD: { en: 'The DR Congo holds most of the world’s second-largest rainforest.', de: 'Die DR Kongo beherbergt den größten Teil des zweitgrößten Regenwaldes der Erde.' },
	COG: { en: 'Two-thirds of the Republic of the Congo is tropical rainforest.', de: 'Zwei Drittel der Republik Kongo sind tropischer Regenwald.' },
	DJI: { en: 'Djibouti’s Lake Assal is the lowest point in Africa.', de: 'Djiboutis Assalsee ist der tiefste Punkt Afrikas.' },
	DZA: { en: 'Algeria is the largest country in Africa by area.', de: 'Algerien ist flächenmäßig das größte Land Afrikas.' },
	EGY: { en: 'The Great Pyramid of Giza in Egypt is the only surviving ancient wonder of the world.', de: 'Die Cheops-Pyramide von Gizeh ist das einzige erhaltene der antiken Weltwunder.' },
	ERI: { en: 'Eritrea’s capital Asmara is a UNESCO-listed city of 1930s Art Deco architecture.', de: 'Eritreas Hauptstadt Asmara ist als Art-déco-Stadt der 1930er UNESCO-Welterbe.' },
	ETH: { en: 'Ethiopia uses its own calendar and was never colonised.', de: 'Äthiopien nutzt einen eigenen Kalender und wurde nie kolonisiert.' },
	GAB: { en: 'Almost 90% of Gabon is covered by rainforest.', de: 'Fast 90 % Gabuns sind von Regenwald bedeckt.' },
	GHA: { en: 'Ghana was the first sub-Saharan African country to gain independence, in 1957.', de: 'Ghana war 1957 das erste Land Subsahara-Afrikas, das unabhängig wurde.' },
	GIN: { en: 'Guinea holds some of the world’s largest bauxite reserves.', de: 'Guinea besitzt einige der größten Bauxitvorkommen der Welt.' },
	GMB: { en: 'The Gambia is mainland Africa’s smallest country, stretching along a single river.', de: 'Gambia ist das kleinste Land des afrikanischen Festlands und erstreckt sich entlang eines einzigen Flusses.' },
	GNB: { en: 'Guinea-Bissau’s Bijagós islands are a UNESCO biosphere reserve.', de: 'Die Bijagós-Inseln Guinea-Bissaus sind ein UNESCO-Biosphärenreservat.' },
	GNQ: { en: 'Equatorial Guinea is the only African country with Spanish as an official language.', de: 'Äquatorialguinea ist das einzige afrikanische Land mit Spanisch als Amtssprache.' },
	KEN: { en: 'Kenya’s Rift Valley highlands have produced many of the world’s greatest distance runners.', de: 'Kenias Hochland im Rift Valley brachte viele der besten Langstreckenläufer der Welt hervor.' },
	LBR: { en: 'Liberia was founded in the 1800s by freed slaves from the United States.', de: 'Liberia wurde im 19. Jahrhundert von befreiten Sklaven aus den USA gegründet.' },
	LBY: { en: 'More than 90% of Libya is desert.', de: 'Mehr als 90 % Libyens sind Wüste.' },
	LSO: { en: 'Lesotho is the only country whose entire territory lies above 1,000 m in elevation.', de: 'Lesotho ist das einzige Land, dessen gesamtes Gebiet über 1.000 m Höhe liegt.' },
	MAR: { en: 'The University of al-Qarawiyyin in Morocco is the world’s oldest continually operating university.', de: 'Die Universität al-Qarawiyyin in Marokko ist die älteste durchgehend betriebene Universität der Welt.' },
	MDG: { en: 'About 90% of Madagascar’s wildlife exists nowhere else on Earth.', de: 'Rund 90 % der Tierwelt Madagaskars gibt es nirgendwo sonst auf der Erde.' },
	MLI: { en: 'Timbuktu in Mali was a great centre of learning and trade in the Middle Ages.', de: 'Timbuktu in Mali war im Mittelalter ein bedeutendes Zentrum für Bildung und Handel.' },
	MOZ: { en: 'Mozambique’s flag is the only national flag to feature a modern rifle.', de: 'Mosambiks Flagge ist die einzige Nationalflagge mit einem modernen Gewehr.' },
	MRT: { en: 'Mauritania’s Richat Structure, the "Eye of the Sahara", is clearly visible from space.', de: 'Die Richat-Struktur Mauretaniens, das „Auge der Sahara“, ist deutlich aus dem All sichtbar.' },
	MWI: { en: 'Lake Malawi has more fish species than any other lake on Earth.', de: 'Der Malawisee beherbergt mehr Fischarten als jeder andere See der Erde.' },
	NAM: { en: 'Namibia was the first country to write environmental protection into its constitution.', de: 'Namibia war das erste Land, das Umweltschutz in seiner Verfassung verankerte.' },
	NER: { en: 'Niger has one of the world’s youngest populations, with a median age under 15.', de: 'Niger hat eine der jüngsten Bevölkerungen der Welt — das Medianalter liegt unter 15 Jahren.' },
	NGA: { en: 'Nigeria is Africa’s most populous country and home to the Nollywood film industry.', de: 'Nigeria ist das bevölkerungsreichste Land Afrikas und Heimat der Filmindustrie Nollywood.' },
	RWA: { en: 'Rwanda, the "land of a thousand hills", banned single-use plastic bags back in 2008.', de: 'Ruanda, das „Land der tausend Hügel“, verbot bereits 2008 Einweg-Plastiktüten.' },
	SDN: { en: 'Sudan has more ancient pyramids than Egypt.', de: 'Der Sudan hat mehr antike Pyramiden als Ägypten.' },
	SDS: { en: 'South Sudan became the world’s newest country in 2011.', de: 'Der Südsudan wurde 2011 zum jüngsten Land der Welt.' },
	SEN: { en: 'Senegal’s Lac Rose is naturally pink from salt-loving algae.', de: 'Senegals Lac Rose ist durch salzliebende Algen von Natur aus rosa.' },
	SLE: { en: 'Sierra Leone means "lion mountains" in Portuguese.', de: 'Sierra Leone bedeutet auf Portugiesisch „Löwenberge“.' },
	SOM: { en: 'Somalia has the longest coastline of mainland Africa.', de: 'Somalia hat die längste Küstenlinie des afrikanischen Festlands.' },
	SWZ: { en: 'Eswatini, renamed from Swaziland in 2018, is one of the world’s last absolute monarchies.', de: 'Eswatini, 2018 von Swasiland umbenannt, ist eine der letzten absoluten Monarchien der Welt.' },
	TCD: { en: 'Chad is named after Lake Chad, once one of Africa’s largest lakes.', de: 'Der Tschad ist nach dem Tschadsee benannt, einst einer der größten Seen Afrikas.' },
	TGO: { en: 'Togo is a narrow strip of land with just 56 km of coastline.', de: 'Togo ist ein schmaler Landstreifen mit nur 56 km Küste.' },
	TUN: { en: 'Parts of Star Wars were filmed in Tunisia’s Sahara — the town of Tataouine inspired "Tatooine".', de: 'Teile von Star Wars wurden in Tunesiens Sahara gedreht — die Stadt Tataouine inspirierte „Tatooine“.' },
	TZA: { en: 'Tanzania is home to Mount Kilimanjaro, Africa’s highest peak.', de: 'In Tansania liegt der Kilimandscharo, der höchste Berg Afrikas.' },
	UGA: { en: 'Uganda is where the White Nile begins its journey, at Lake Victoria.', de: 'In Uganda beginnt der Weiße Nil am Victoriasee seine Reise.' },
	ZAF: { en: 'South Africa has three capital cities: Pretoria, Cape Town and Bloemfontein.', de: 'Südafrika hat drei Hauptstädte: Pretoria, Kapstadt und Bloemfontein.' },
	ZMB: { en: 'Zambia shares Victoria Falls, one of the world’s largest waterfalls, with Zimbabwe.', de: 'Sambia teilt sich mit Simbabwe die Victoriafälle, einen der größten Wasserfälle der Welt.' },
	ZWE: { en: 'Zimbabwe is named after the medieval stone city of Great Zimbabwe.', de: 'Simbabwe ist nach der mittelalterlichen Steinstadt Great Zimbabwe benannt.' },

	// ── Asia ────────────────────────────────────────────────────────────────────
	AFG: { en: 'Afghanistan sat on the ancient Silk Road linking Europe and Asia.', de: 'Afghanistan lag an der antiken Seidenstraße zwischen Europa und Asien.' },
	ARE: { en: 'The UAE is home to the Burj Khalifa, the world’s tallest building.', de: 'Die Vereinigten Arabischen Emirate beherbergen das Burj Khalifa, das höchste Gebäude der Welt.' },
	ARM: { en: 'Armenia was the first country to adopt Christianity as its state religion, in 301 AD.', de: 'Armenien nahm 301 n. Chr. als erstes Land das Christentum zur Staatsreligion an.' },
	AZE: { en: 'Azerbaijan is known as the "Land of Fire" for its naturally burning gas vents.', de: 'Aserbaidschan gilt als „Land des Feuers“ wegen seiner natürlich brennenden Gasquellen.' },
	BGD: { en: 'Bangladesh is one of the world’s most densely populated countries, crossed by hundreds of rivers.', de: 'Bangladesch ist eines der am dichtesten besiedelten Länder der Welt und wird von hunderten Flüssen durchzogen.' },
	BRN: { en: 'Brunei is ruled by one of the world’s longest-reigning monarchs and is rich in oil.', de: 'Brunei wird von einem der am längsten regierenden Monarchen der Welt regiert und ist reich an Öl.' },
	BTN: { en: 'Bhutan measures Gross National Happiness and is one of the few carbon-negative countries.', de: 'Bhutan misst das Bruttonationalglück und ist eines der wenigen CO₂-negativen Länder.' },
	CHN: { en: 'The Great Wall of China stretches over 21,000 km.', de: 'Die Chinesische Mauer erstreckt sich über mehr als 21.000 km.' },
	CYP: { en: 'Greek myth says the goddess Aphrodite was born from the sea off Cyprus.', de: 'Der griechischen Mythologie zufolge wurde die Göttin Aphrodite vor Zypern aus dem Meer geboren.' },
	GEO: { en: 'Georgia is thought to be the birthplace of wine, made there for 8,000 years.', de: 'Georgien gilt als Wiege des Weins — dort wird seit 8.000 Jahren Wein gekeltert.' },
	IDN: { en: 'Indonesia is made up of more than 17,000 islands.', de: 'Indonesien besteht aus mehr als 17.000 Inseln.' },
	IND: { en: 'India is the world’s most populous country and has 22 officially recognised languages.', de: 'Indien ist das bevölkerungsreichste Land der Welt und hat 22 amtlich anerkannte Sprachen.' },
	IRN: { en: 'Iran, historically Persia, is one of the world’s oldest continuous civilisations.', de: 'Iran, historisch Persien, zählt zu den ältesten fortbestehenden Zivilisationen der Welt.' },
	IRQ: { en: 'Iraq covers ancient Mesopotamia, often called the cradle of civilisation.', de: 'Der Irak umfasst das antike Mesopotamien, oft „Wiege der Zivilisation“ genannt.' },
	ISR: { en: 'The shore of the Dead Sea in Israel is the lowest point on dry land.', de: 'Das Ufer des Toten Meeres in Israel ist der tiefste Punkt an Land.' },
	JOR: { en: 'Jordan’s rock-carved city of Petra is over 2,000 years old.', de: 'Die in Fels gehauene Stadt Petra in Jordanien ist über 2.000 Jahre alt.' },
	JPN: { en: 'Japan is made up of over 6,800 islands and has one of the world’s longest life expectancies.', de: 'Japan besteht aus über 6.800 Inseln und hat eine der höchsten Lebenserwartungen der Welt.' },
	KAZ: { en: 'Kazakhstan is the world’s largest landlocked country.', de: 'Kasachstan ist das größte Binnenland der Welt.' },
	KGZ: { en: 'Over 90% of Kyrgyzstan is mountainous.', de: 'Über 90 % Kirgisistans sind gebirgig.' },
	KHM: { en: 'Cambodia’s Angkor Wat is the largest religious monument in the world.', de: 'Kambodschas Angkor Wat ist das größte religiöse Bauwerk der Welt.' },
	KOR: { en: 'South Korea has some of the world’s fastest internet speeds.', de: 'Südkorea hat einige der schnellsten Internetgeschwindigkeiten der Welt.' },
	KWT: { en: 'Kuwait has some of the world’s largest oil reserves relative to its size.', de: 'Kuwait besitzt gemessen an seiner Größe einige der größten Ölreserven der Welt.' },
	LAO: { en: 'Laos is the only landlocked country in Southeast Asia.', de: 'Laos ist das einzige Binnenland Südostasiens.' },
	LBN: { en: 'Lebanon’s flag features the cedar tree, a symbol dating back thousands of years.', de: 'Die Flagge des Libanon zeigt die Zeder, ein jahrtausendealtes Symbol.' },
	LKA: { en: 'Sri Lanka is one of the world’s biggest exporters of tea.', de: 'Sri Lanka ist einer der größten Teeexporteure der Welt.' },
	MMR: { en: 'Myanmar’s plain of Bagan holds thousands of ancient Buddhist temples.', de: 'Die Ebene von Bagan in Myanmar beherbergt tausende alte buddhistische Tempel.' },
	MNG: { en: 'Mongolia is the world’s most sparsely populated sovereign country.', de: 'Die Mongolei ist der am dünnsten besiedelte souveräne Staat der Welt.' },
	MYS: { en: 'Malaysia is split into two regions separated by the South China Sea.', de: 'Malaysia besteht aus zwei durch das Südchinesische Meer getrennten Landesteilen.' },
	NPL: { en: 'Nepal has the world’s only non-rectangular national flag and is home to Mount Everest.', de: 'Nepal hat die einzige nicht rechteckige Nationalflagge der Welt und beherbergt den Mount Everest.' },
	OMN: { en: 'Oman was a historic centre of the frankincense trade.', de: 'Oman war ein historisches Zentrum des Weihrauchhandels.' },
	PAK: { en: 'Pakistan is home to K2, the world’s second-highest mountain.', de: 'In Pakistan liegt der K2, der zweithöchste Berg der Welt.' },
	PHL: { en: 'The Philippines is made up of 7,641 islands.', de: 'Die Philippinen bestehen aus 7.641 Inseln.' },
	PRK: { en: 'North Korea is one of the world’s most isolated countries.', de: 'Nordkorea zählt zu den am stärksten abgeschotteten Ländern der Welt.' },
	QAT: { en: 'Qatar is among the world’s wealthiest countries per person, thanks to natural gas.', de: 'Katar zählt dank Erdgas zu den reichsten Ländern der Welt pro Kopf.' },
	SAU: { en: 'Saudi Arabia is the largest country in the world with no rivers.', de: 'Saudi-Arabien ist das größte Land der Welt ohne Flüsse.' },
	SYR: { en: 'Damascus in Syria is among the world’s oldest continuously inhabited cities.', de: 'Damaskus in Syrien zählt zu den ältesten durchgehend bewohnten Städten der Welt.' },
	THA: { en: 'Thailand is the only Southeast Asian country never colonised by a European power.', de: 'Thailand ist das einzige Land Südostasiens, das nie von einer europäischen Macht kolonisiert wurde.' },
	TJK: { en: 'More than half of Tajikistan lies above 3,000 m in elevation.', de: 'Mehr als die Hälfte Tadschikistans liegt über 3.000 m Höhe.' },
	TKM: { en: 'Turkmenistan’s Darvaza gas crater has been burning since 1971.', de: 'Turkmenistans Gaskrater von Darvaza brennt seit 1971.' },
	TLS: { en: 'East Timor gained independence in 2002, one of the youngest nations in Asia.', de: 'Osttimor wurde 2002 unabhängig und ist eine der jüngsten Nationen Asiens.' },
	TUR: { en: 'Turkey’s city of Istanbul straddles two continents, Europe and Asia.', de: 'Die türkische Stadt Istanbul liegt auf zwei Kontinenten, Europa und Asien.' },
	TWN: { en: 'Taiwan produces most of the world’s most advanced computer chips.', de: 'Taiwan produziert den Großteil der modernsten Computerchips der Welt.' },
	UZB: { en: 'Uzbekistan is one of only two "doubly landlocked" countries on Earth.', de: 'Usbekistan ist eines von nur zwei „doppelt eingeschlossenen“ Binnenländern der Erde.' },
	VNM: { en: 'Vietnam is the world’s second-largest exporter of coffee.', de: 'Vietnam ist der zweitgrößte Kaffeeexporteur der Welt.' },
	YEM: { en: 'Yemen’s Socotra island has bizarre plants found nowhere else on Earth.', de: 'Die jemenitische Insel Sokotra beherbergt bizarre Pflanzen, die es nirgendwo sonst gibt.' },

	// ── North America ───────────────────────────────────────────────────────────
	BHS: { en: 'The Bahamas is made up of around 700 islands and cays.', de: 'Die Bahamas bestehen aus rund 700 Inseln und Cays.' },
	BLZ: { en: 'Belize is the only country in Central America with English as its official language.', de: 'Belize ist das einzige Land Mittelamerikas mit Englisch als Amtssprache.' },
	CAN: { en: 'Canada has the longest coastline of any country in the world.', de: 'Kanada hat die längste Küstenlinie aller Länder der Welt.' },
	CRI: { en: 'Costa Rica abolished its army in 1948 and runs on mostly renewable electricity.', de: 'Costa Rica schaffte 1948 seine Armee ab und deckt seinen Strom fast vollständig aus erneuerbaren Quellen.' },
	CUB: { en: 'Cuba is the largest island in the Caribbean.', de: 'Kuba ist die größte Insel der Karibik.' },
	DOM: { en: 'The Dominican Republic shares the island of Hispaniola with Haiti.', de: 'Die Dominikanische Republik teilt sich die Insel Hispaniola mit Haiti.' },
	GTM: { en: 'Guatemala was the heartland of the ancient Maya civilisation.', de: 'Guatemala war das Kernland der antiken Maya-Zivilisation.' },
	HND: { en: 'The term "banana republic" was first coined about Honduras.', de: 'Der Begriff „Bananenrepublik“ wurde ursprünglich über Honduras geprägt.' },
	HTI: { en: 'Haiti became the world’s first independent Black republic in 1804.', de: 'Haiti wurde 1804 die erste unabhängige schwarze Republik der Welt.' },
	JAM: { en: 'Jamaica is the birthplace of reggae music.', de: 'Jamaika ist die Geburtsstätte der Reggae-Musik.' },
	MEX: { en: 'Mexico gave the world chocolate, chillies and tomatoes.', de: 'Mexiko schenkte der Welt Schokolade, Chili und Tomaten.' },
	NIC: { en: 'Nicaragua is the largest country in Central America.', de: 'Nicaragua ist das größte Land Mittelamerikas.' },
	PAN: { en: 'The Panama Canal lets ships pass between the Atlantic and Pacific oceans.', de: 'Der Panamakanal verbindet den Atlantik mit dem Pazifik für die Schifffahrt.' },
	SLV: { en: 'El Salvador was the first country to make Bitcoin legal tender.', de: 'El Salvador war das erste Land, das Bitcoin als gesetzliches Zahlungsmittel einführte.' },
	TTO: { en: 'Trinidad and Tobago is the birthplace of the steelpan drum.', de: 'Trinidad und Tobago ist die Geburtsstätte der Steeldrum.' },
	USA: { en: 'The United States is made up of 50 states spanning the continent.', de: 'Die Vereinigten Staaten bestehen aus 50 Bundesstaaten quer über den Kontinent.' },

	// ── South America ───────────────────────────────────────────────────────────
	ARG: { en: 'Argentina is home to Aconcagua, the highest mountain outside Asia.', de: 'In Argentinien liegt der Aconcagua, der höchste Berg außerhalb Asiens.' },
	BOL: { en: 'Bolivia’s Salar de Uyuni is the world’s largest salt flat.', de: 'Boliviens Salar de Uyuni ist die größte Salzwüste der Welt.' },
	BRA: { en: 'Brazil is the largest country in South America and holds most of the Amazon.', de: 'Brasilien ist das größte Land Südamerikas und beherbergt den Großteil des Amazonas.' },
	CHL: { en: 'Chile’s Atacama Desert is the driest place on Earth.', de: 'Chiles Atacama-Wüste ist der trockenste Ort der Erde.' },
	COL: { en: 'Colombia is the only South American country with coastlines on both the Pacific and the Caribbean.', de: 'Kolumbien ist das einzige Land Südamerikas mit Küsten am Pazifik und an der Karibik.' },
	ECU: { en: 'Ecuador is named after the equator, which runs right through it.', de: 'Ecuador ist nach dem Äquator benannt, der mitten durch das Land verläuft.' },
	GUY: { en: 'Guyana is the only South American country with English as its official language.', de: 'Guyana ist das einzige Land Südamerikas mit Englisch als Amtssprache.' },
	PER: { en: 'Peru is home to Machu Picchu, the famous Inca citadel high in the Andes.', de: 'In Peru liegt Machu Picchu, die berühmte Inka-Stadt hoch in den Anden.' },
	PRY: { en: 'Paraguay is one of only two landlocked countries in South America.', de: 'Paraguay ist eines von nur zwei Binnenländern Südamerikas.' },
	SUR: { en: 'Suriname is the smallest country in South America and over 90% forest.', de: 'Suriname ist das kleinste Land Südamerikas und zu über 90 % bewaldet.' },
	URY: { en: 'Uruguay hosted and won the very first football World Cup, in 1930.', de: 'Uruguay war Gastgeber und Sieger der allerersten Fußball-Weltmeisterschaft 1930.' },
	VEN: { en: 'Venezuela’s Angel Falls is the world’s tallest waterfall.', de: 'Venezuelas Angel-Wasserfall (Salto Ángel) ist der höchste Wasserfall der Welt.' },

	// ── Oceania ─────────────────────────────────────────────────────────────────
	AUS: { en: 'Australia is the only country that is also a whole continent.', de: 'Australien ist das einzige Land, das zugleich ein ganzer Kontinent ist.' },
	NZL: { en: 'New Zealand was the first country to give women the right to vote, in 1893.', de: 'Neuseeland gab 1893 als erstes Land Frauen das Wahlrecht.' },
	PNG: { en: 'Papua New Guinea has over 800 languages — more than any other country.', de: 'Papua-Neuguinea hat über 800 Sprachen — mehr als jedes andere Land.' }
};

/** @type {Record<string, Fact>} */
export const usStateFacts = {
	AL: { en: 'Alabama was where Rosa Parks sparked the Montgomery Bus Boycott in 1955.', de: 'In Alabama löste Rosa Parks 1955 den Busboykott von Montgomery aus.' },
	AK: { en: 'Alaska is the largest US state — bigger than Texas, California and Montana combined.', de: 'Alaska ist der größte US-Bundesstaat — größer als Texas, Kalifornien und Montana zusammen.' },
	AZ: { en: 'Arizona’s Grand Canyon is up to 1.8 km deep.', de: 'Der Grand Canyon in Arizona ist bis zu 1,8 km tief.' },
	AR: { en: 'Arkansas is the only US state that still mines diamonds.', de: 'Arkansas ist der einzige US-Staat, in dem noch Diamanten gefördert werden.' },
	CA: { en: 'California alone has one of the largest economies in the world.', de: 'Kalifornien allein hätte eine der größten Volkswirtschaften der Welt.' },
	CO: { en: 'Colorado has the highest average elevation of any US state.', de: 'Colorado hat die höchste Durchschnittshöhe aller US-Staaten.' },
	CT: { en: 'Connecticut is home to the oldest US newspaper still in print.', de: 'In Connecticut erscheint die älteste noch gedruckte Zeitung der USA.' },
	DE: { en: 'Delaware was the first state to ratify the US Constitution, in 1787.', de: 'Delaware ratifizierte 1787 als erster Staat die US-Verfassung.' },
	FL: { en: 'Florida has more than 1,300 km of coastline and no point higher than 105 m.', de: 'Florida hat über 1.300 km Küste und keinen Punkt höher als 105 m.' },
	GA: { en: 'Georgia produces more peanuts than any other US state.', de: 'Georgia produziert mehr Erdnüsse als jeder andere US-Staat.' },
	HI: { en: 'Hawaii is the only US state made up entirely of islands.', de: 'Hawaii ist der einzige US-Staat, der vollständig aus Inseln besteht.' },
	ID: { en: 'Idaho grows about a third of all potatoes in the United States.', de: 'Idaho erntet etwa ein Drittel aller Kartoffeln der USA.' },
	IL: { en: 'Chicago, Illinois, built the world’s first modern skyscraper in 1885.', de: 'In Chicago, Illinois, entstand 1885 der erste moderne Wolkenkratzer der Welt.' },
	IN: { en: 'Indiana hosts the Indianapolis 500, one of the world’s oldest car races.', de: 'In Indiana findet das Indianapolis 500 statt, eines der ältesten Autorennen der Welt.' },
	IA: { en: 'Iowa leads the US in corn production.', de: 'Iowa ist der führende Maisproduzent der USA.' },
	KS: { en: 'Kansas is one of the flattest and windiest US states.', de: 'Kansas ist einer der flachsten und windigsten US-Staaten.' },
	KY: { en: 'Kentucky produces around 95% of the world’s bourbon.', de: 'Kentucky produziert rund 95 % des weltweiten Bourbons.' },
	LA: { en: 'Louisiana is famous for New Orleans jazz and Mardi Gras.', de: 'Louisiana ist berühmt für den Jazz von New Orleans und den Mardi Gras.' },
	ME: { en: 'Maine supplies most of the lobster caught in the United States.', de: 'Maine liefert den Großteil des in den USA gefangenen Hummers.' },
	MD: { en: 'Maryland is nicknamed "America in Miniature" for its varied landscapes.', de: 'Maryland heißt wegen seiner vielfältigen Landschaft „America in Miniature“.' },
	MA: { en: 'Massachusetts is home to Harvard, the oldest university in the US.', de: 'In Massachusetts steht Harvard, die älteste Universität der USA.' },
	MI: { en: 'Michigan touches four of the five Great Lakes.', de: 'Michigan grenzt an vier der fünf Großen Seen.' },
	MN: { en: 'Minnesota is known as the "Land of 10,000 Lakes" — it actually has more.', de: 'Minnesota heißt „Land der 10.000 Seen“ — und hat sogar noch mehr.' },
	MS: { en: 'The Mississippi River, which names the state, is North America’s longest.', de: 'Der Mississippi, der dem Staat den Namen gibt, ist der längste Fluss Nordamerikas.' },
	MO: { en: 'Missouri’s Gateway Arch is the tallest man-made monument in the US.', de: 'Der Gateway Arch in Missouri ist das höchste von Menschen gebaute Monument der USA.' },
	MT: { en: 'Montana is nicknamed "Big Sky Country" for its vast open landscapes.', de: 'Montana trägt wegen seiner weiten Landschaften den Beinamen „Big Sky Country“.' },
	NE: { en: 'Nebraska has the largest underground aquifer system in the US beneath it.', de: 'Unter Nebraska liegt das größte unterirdische Grundwassersystem der USA.' },
	NV: { en: 'Nevada is the driest US state and home to Las Vegas.', de: 'Nevada ist der trockenste US-Staat und Heimat von Las Vegas.' },
	NH: { en: 'New Hampshire holds the first primary in US presidential elections.', de: 'New Hampshire hält die erste Vorwahl der US-Präsidentschaftswahlen ab.' },
	NJ: { en: 'New Jersey is the most densely populated US state.', de: 'New Jersey ist der am dichtesten besiedelte US-Staat.' },
	NM: { en: 'New Mexico’s Roswell is famous for its 1947 UFO legend.', de: 'Roswell in New Mexico ist für seine UFO-Legende von 1947 berühmt.' },
	NY: { en: 'New York City was the first capital of the United States.', de: 'New York City war die erste Hauptstadt der Vereinigten Staaten.' },
	NC: { en: 'The Wright brothers made the first powered flight in North Carolina in 1903.', de: 'Die Gebrüder Wright gelang 1903 in North Carolina der erste Motorflug.' },
	ND: { en: 'North Dakota is one of the least visited US states.', de: 'North Dakota ist einer der am wenigsten besuchten US-Staaten.' },
	OH: { en: 'Ohio has produced eight US presidents — more than almost any other state.', de: 'Aus Ohio stammen acht US-Präsidenten — mehr als aus fast jedem anderen Staat.' },
	OK: { en: 'Oklahoma lies in the heart of "Tornado Alley".', de: 'Oklahoma liegt im Herzen der „Tornado Alley“.' },
	OR: { en: 'Oregon’s Crater Lake is the deepest lake in the United States.', de: 'Der Crater Lake in Oregon ist der tiefste See der USA.' },
	PA: { en: 'The US Declaration of Independence was signed in Philadelphia, Pennsylvania.', de: 'Die US-Unabhängigkeitserklärung wurde in Philadelphia, Pennsylvania, unterzeichnet.' },
	RI: { en: 'Rhode Island is the smallest US state by area.', de: 'Rhode Island ist der flächenmäßig kleinste US-Staat.' },
	SC: { en: 'South Carolina fired the first shots of the American Civil War at Fort Sumter.', de: 'In South Carolina fielen am Fort Sumter die ersten Schüsse des US-Bürgerkriegs.' },
	SD: { en: 'South Dakota’s Mount Rushmore carries four giant presidential faces.', de: 'Am Mount Rushmore in South Dakota prangen vier riesige Präsidentenköpfe.' },
	TN: { en: 'Nashville, Tennessee, is known as the home of country music.', de: 'Nashville in Tennessee gilt als Heimat der Countrymusik.' },
	TX: { en: 'Texas was an independent republic for nearly a decade before joining the US.', de: 'Texas war fast ein Jahrzehnt lang eine unabhängige Republik, bevor es den USA beitrat.' },
	UT: { en: 'Utah’s Great Salt Lake is far saltier than the ocean.', de: 'Der Große Salzsee in Utah ist weit salziger als das Meer.' },
	VT: { en: 'Vermont produces more maple syrup than any other US state.', de: 'Vermont produziert mehr Ahornsirup als jeder andere US-Staat.' },
	VA: { en: 'Virginia is the birthplace of eight US presidents.', de: 'Virginia ist der Geburtsstaat von acht US-Präsidenten.' },
	WA: { en: 'Washington State grows the majority of America’s apples.', de: 'Der Bundesstaat Washington erntet den Großteil der US-Äpfel.' },
	WV: { en: 'West Virginia is one of the most mountainous states east of the Mississippi.', de: 'West Virginia ist einer der bergigsten Staaten östlich des Mississippi.' },
	WI: { en: 'Wisconsin is nicknamed "America’s Dairyland" for its cheese.', de: 'Wisconsin trägt wegen seines Käses den Beinamen „America’s Dairyland“.' },
	WY: { en: 'Wyoming is home to Yellowstone, the world’s first national park.', de: 'In Wyoming liegt Yellowstone, der erste Nationalpark der Welt.' }
};

/** @typedef {{ capital: string, population: number, areaKm2: number, funFact: Fact }} StateInfo */
/** @type {Record<string, StateInfo>} */
export const germanStateInfo = {
	NW: { capital: 'Düsseldorf', population: 17930000, areaKm2: 34113, funFact: { en: "Home to the Ruhr area, Germany's largest urban region.", de: 'Heimat des Ruhrgebiets, Deutschlands größtem Ballungsraum.' } },
	NI: { capital: 'Hannover', population: 8140000, areaKm2: 47710, funFact: { en: "Germany's second-largest state by area; the VW headquarters sit in Wolfsburg.", de: 'Flächenmäßig zweitgrößtes Bundesland; die VW-Zentrale steht in Wolfsburg.' } },
	HB: { capital: 'Bremen', population: 680000, areaKm2: 419, funFact: { en: "Germany's smallest state — two cities: Bremen and Bremerhaven.", de: 'Kleinstes Bundesland — besteht aus zwei Städten: Bremen und Bremerhaven.' } },
	HH: { capital: 'Hamburg', population: 1890000, areaKm2: 755, funFact: { en: "A city-state with one of Europe's biggest ports.", de: 'Stadtstaat mit einem der größten Häfen Europas.' } },
	SH: { capital: 'Kiel', population: 2950000, areaKm2: 15804, funFact: { en: 'The only state bordering two seas — the North Sea and the Baltic Sea.', de: 'Einziges Land an zwei Meeren — Nord- und Ostsee.' } },
	MV: { capital: 'Schwerin', population: 1610000, areaKm2: 23295, funFact: { en: 'Famous for the Baltic coast and over 2,000 lakes.', de: 'Bekannt für die Ostseeküste und über 2.000 Seen.' } },
	BB: { capital: 'Potsdam', population: 2570000, areaKm2: 29654, funFact: { en: 'Completely surrounds the capital, Berlin.', de: 'Umschließt die Hauptstadt Berlin vollständig.' } },
	SN: { capital: 'Dresden', population: 4090000, areaKm2: 18450, funFact: { en: "Known for Dresden's baroque architecture and the Ore Mountains.", de: 'Bekannt für Dresdens Barock und das Erzgebirge.' } },
	ST: { capital: 'Magdeburg', population: 2190000, areaKm2: 20452, funFact: { en: 'Home to several UNESCO sites, including the Bauhaus in Dessau.', de: 'Mehrere UNESCO-Welterbestätten, u. a. das Bauhaus in Dessau.' } },
	BE: { capital: 'Berlin', population: 3760000, areaKm2: 891, funFact: { en: 'The capital and largest city of Germany — itself a federal state.', de: 'Hauptstadt und größte Stadt Deutschlands — selbst ein Bundesland.' } },
	BW: { capital: 'Stuttgart', population: 11280000, areaKm2: 35748, funFact: { en: 'Birthplace of the automobile — Mercedes-Benz and Porsche are based here.', de: 'Wiege des Automobils — Mercedes-Benz und Porsche sitzen hier.' } },
	BY: { capital: 'München', population: 13370000, areaKm2: 70542, funFact: { en: "Germany's largest state by area; home of Oktoberfest and Neuschwanstein.", de: 'Größtes Bundesland; Heimat von Oktoberfest und Schloss Neuschwanstein.' } },
	HE: { capital: 'Wiesbaden', population: 6290000, areaKm2: 21115, funFact: { en: "Frankfurt, its biggest city, is Germany's financial capital.", de: 'Frankfurt, die größte Stadt, ist Deutschlands Finanzzentrum.' } },
	RP: { capital: 'Mainz', population: 4160000, areaKm2: 19858, funFact: { en: 'One of the most famous wine regions in the world, along the Rhine and Mosel.', de: 'Eine der berühmtesten Weinregionen der Welt an Rhein und Mosel.' } },
	SL: { capital: 'Saarbrücken', population: 990000, areaKm2: 2571, funFact: { en: "Germany's smallest state by area (not counting the city-states).", de: 'Flächenmäßig kleinstes Flächenland Deutschlands.' } },
	TH: { capital: 'Erfurt', population: 2130000, areaKm2: 16202, funFact: { en: "Nicknamed 'the green heart of Germany' for its forests.", de: "Wird wegen seiner Wälder 'grünes Herz Deutschlands' genannt." } }
};

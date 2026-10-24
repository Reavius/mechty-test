/* Меню для гостей (главная страница) и английский для всей гостевой части: меню, карта состава, подписи.
   Позиции и цены — как в меню бара (PDF), цены без валюты. «Бартендерам» — только по-русски.
   Позиция: n — название, e — по-английски (если отличается), d — описание (по-английски: de, а для вин —
   само по словарю WORDS), v — объём, u: "pcs" — штуки, p — цена, c — id в карте «Состав и аллергены»
   (тогда описание и фото берутся из карты, а у позиции — ссылка на состав и аллергены). */
const MENU = [
 {k: "cocktails", ru: "Коктейли", en: "Cocktails", secs: [
  {ru: "Коктейли мечты", en: "Signature cocktails", tiles: 1, items: [
   {c: "pantera", v: 200, p: 630},
   {c: "pornstar", v: 190, p: 670},
   {c: "chili", v: 200, p: 670},
   {c: "c-bosford", v: 150, p: 600},
   {c: "c-fiero", v: 160, p: 630},
   {c: "summer", v: 200, p: 630},
   {c: "tropiki", v: 200, p: 650},
   {c: "c-collins", v: 200, p: 670},
   {c: "c-watermelon", v: 200, p: 650},
   {c: "hugo", v: 200, p: 630},
   {c: "grusha", v: 200, p: 600},
   {c: "negroni", v: 90, p: 600},
   {c: "bluecolada", v: 200, p: 630},
   {c: "maitai", v: 200, p: 670}]},
  {ru: "Аперитивные коктейли", en: "Aperitif cocktails", tiles: 1, items: [
   {c: "c-aperol", v: 200, p: 650},
   {c: "c-campari", v: 200, p: 650},
   {c: "c-sarti", v: 200, p: 650},
   {n: "Сет из трёх аперитивных коктейлей", e: "Set of three aperitif cocktails", d: "подробности у официанта", de: "ask your waiter for details", p: 1600}]},
  {ru: "Beluga Cocktails", en: "Beluga Cocktails", items: [
   {n: "Beluga 1900", d: "водка Beluga Noble, порто, сахар, кислота", de: "Beluga Noble vodka, port, sugar, acid", v: 100, p: 550},
   {n: "Beluga Noble Espresso", d: "водка Beluga Noble, кофе, вино", de: "Beluga Noble vodka, coffee, wine", v: 100, p: 550},
   {n: "Hunting Cola", d: "Hunting Herbal Bitter, кола", de: "Hunting Herbal Bitter, cola", v: 200, p: 550},
   {n: "Hunting Tonic", d: "Hunting Berry Bitter, тоник", de: "Hunting Berry Bitter, tonic", v: 200, p: 550},
   {n: "Beluga Botanicals Cucumber and Mint Tonic", d: "Beluga Botanicals Cucumber and Mint, тоник", de: "Beluga Botanicals Cucumber and Mint, tonic", v: 200, p: 550},
   {n: "Beluga Botanicals Rose and Lime Tonic", d: "Beluga Botanicals Rose and Lime, тоник", de: "Beluga Botanicals Rose and Lime, tonic", v: 200, p: 550}]},
  {ru: "Шоты", en: "Shots", items: [
   {n: "Малина / Лайм / Мята", e: "Raspberry / Lime / Mint", c: "malina", v: 3, u: "pcs", p: 650},
   {n: "Лимончелло", e: "Limoncello", c: "limoncello", v: 3, u: "pcs", p: 650},
   {n: "Маракуйя / Пломбир", e: "Passion fruit / Ice cream", c: "maracuya", v: 3, u: "pcs", p: 650},
   {n: "Вишня", e: "Cherry", c: "vishnya", v: 3, u: "pcs", p: 650}]}]},

 {k: "wine", ru: "Вино", en: "Wine", secs: [
  {ru: "Белое вино по бокалам", en: "White wine by the glass", items: [
   {n: "Совиньон Блан, Селлар Селекшн", e: "Sauvignon Blanc, Cellar Selection", d: "сухое, Чили", v: 125, p: 550},
   {n: "Шардоне, Коно Сур, Токорнал", e: "Chardonnay, Cono Sur, Tocornal", d: "полусухое, Чили", v: 125, p: 520}]},
  {ru: "Красное вино по бокалам", en: "Red wine by the glass", items: [
   {n: "Карменер, Селлар Селекшн", e: "Carmenère, Cellar Selection", d: "полусухое, Чили", v: 125, p: 520}]},
  {ru: "Розовое вино по бокалам", en: "Rosé wine by the glass", items: [
   {n: "Коно Сур, Токорнал Розе", e: "Cono Sur, Tocornal Rosé", d: "полусухое, Чили", v: 125, p: 520}]},
  {ru: "Игристое вино по бокалам", en: "Sparkling wine by the glass", items: [
   {n: "Тет де Шеваль Брют", e: "Tête de Cheval Brut", d: "сухое, Россия", v: 125, p: 620},
   {n: "Мартини Брют", e: "Martini Brut", d: "сухое, Италия", v: 125, p: 620}]},
  {ru: "Белое вино", en: "White wine", items: [
   {n: "Верментино, ВиллаСолаис, Сантади", e: "Vermentino, Villa Solais, Santadi", d: "сухое, Италия", v: 750, p: 6570},
   {n: "Гави Иль Валентино, Ла Сколька", e: "Gavi Il Valentino, La Scolca", d: "сухое, Италия", v: 750, p: 5980},
   {n: "Пфефферер, Кольтеренцио", e: "Pfefferer, Colterenzio", d: "полусухое, Италия", v: 750, p: 6220},
   {n: "Виньо Верде, Маре & Гриль", e: "Vinho Verde, Mare & Grill", d: "полусухое, Португалия", v: 750, p: 3500},
   {n: "Рислинг, Урбан", e: "Riesling, Urban", d: "полусухое, Германия", v: 750, p: 4520},
   {n: "Гевюрцтраминер, Ханс Баер", e: "Gewürztraminer, Hans Baer", d: "полусладкое, Германия", v: 750, p: 3970},
   {n: "Шабли, Домен Эрве Азо", e: "Chablis, Domaine Hervé Azo", d: "сухое, Франция", v: 750, p: 9870},
   {n: "Совиньон Блан, Мисти Клифф", e: "Sauvignon Blanc, Misty Cliff", d: "полусухое, Новая Зеландия", v: 750, p: 4420},
   {n: "Шенен Блан, Кейп Ориджинал", e: "Chenin Blanc, Cape Original", d: "сухое, ЮАР", v: 750, p: 3190},
   {n: "Парельяда, Торрес, Сан Валентин", e: "Parellada, Torres, San Valentín", d: "полусухое, Испания", v: 750, p: 3200}]},
  {ru: "Красное вино", en: "Red wine", items: [
   {n: "Пино Нуар, Ле Гран Нуар", e: "Pinot Noir, Le Grand Noir", d: "полусухое, Франция", v: 750, p: 3570},
   {n: "Ле Бордо де Ситран", e: "Le Bordeaux de Citran", d: "сухое, Франция", v: 750, p: 5320},
   {n: "Мерло, Каза Дефра", e: "Merlot, Casa Defrà", d: "полусухое, Италия", v: 750, p: 3730},
   {n: "Санджовезе, Альма Романа", e: "Sangiovese, Alma Romana", d: "полусухое, Италия", v: 750, p: 3220},
   {n: "Зинфандель, Краб энд Мо", e: "Zinfandel, Crab & Mo", d: "полусухое, США", v: 750, p: 3990},
   {n: "Матсу Эль Пикаро", e: "Matsu El Picaro", d: "сухое, Испания", v: 750, p: 4220},
   {n: "Каберне Совиньон, Поместье Голубицкое", e: "Cabernet Sauvignon, Golubitskoye Estate", d: "сухое, Россия", v: 750, p: 3200}]},
  {ru: "Розовое вино", en: "Rosé wine", items: [
   {n: "Виньо Верде Розе, Маре & Гриль", e: "Vinho Verde Rosé, Mare & Grill", d: "полусухое, Португалия", v: 750, p: 3500}]},
  {ru: "Шампанское и игристое", en: "Champagne & sparkling wine", items: [
   {n: "Martini Prosecco DOC", d: "Италия", v: 750, p: 4400},
   {n: "Martini Prosecco Rose DOC", d: "Италия", v: 750, p: 4400},
   {n: "Martini Asti DOCG", d: "Италия", v: 750, p: 4400},
   {n: "Бруни Просекко", e: "Bruni Prosecco", d: "Италия", v: 750, p: 4300},
   {n: "Вдова Клико", e: "Veuve Clicquot", d: "Франция", v: 750, p: 17200}]}]},

 {k: "spirits", ru: "Крепкое", en: "Spirits", secs: [
  {ru: "Вермуты", en: "Vermouth", items: [
   {n: "Martini Fiero", v: 80, p: 350}, {n: "Martini Bianco", v: 80, p: 350},
   {n: "Martini Rosso", v: 80, p: 350}, {n: "Martini Extra Dry", v: 80, p: 350}]},
  {ru: "Водка", en: "Vodka", items: [
   {n: "Beluga Noble", v: 40, p: 300}, {n: "Beluga Gold Line", v: 40, p: 490}, {n: "Orthodox", v: 40, p: 290},
   {n: "Grey Goose", v: 40, p: 420}, {n: "Онегин", e: "Onegin", v: 40, p: 370}, {n: "Арктика", e: "Arktika", v: 40, p: 290}]},
  {ru: "Джин", en: "Gin", items: [
   {n: "Bosford", v: 40, p: 430}, {n: "Bombay Sapphire", v: 40, p: 550}, {n: "Hendrick’s", v: 40, p: 720},
   {n: "Hoppers Original Dry", v: 40, p: 430}, {n: "Hoppers Mandarin & Rosemary", v: 40, p: 430},
   {n: "Hoppers Lavender & Thyme", v: 40, p: 430}, {n: "Antidote Rose", v: 40, p: 450}]},
  {ru: "Виски", en: "Whisky", items: [
   {n: "Dewar’s White Label", v: 40, p: 450}, {n: "Dewar’s 8 Y.O.", v: 40, p: 530}, {n: "Chivas Regal 12", v: 40, p: 780},
   {n: "Tullamore Dew", v: 40, p: 530}, {n: "Jameson", v: 40, p: 650}]},
  {ru: "Виски солодовый", en: "Malt whisky", items: [
   {n: "Monkey Shoulder", v: 40, p: 780}, {n: "Glenfiddich 12", v: 40, p: 890},
   {n: "Teeling Single Malt", v: 40, p: 890}, {n: "Aberfeldy 12", v: 40, p: 990}]},
  {ru: "Текила", en: "Tequila", items: [
   {n: "Jose Cuervo Especial Silver", v: 40, p: 520}, {n: "Jose Cuervo Especial Reposado", v: 40, p: 550}]},
  {ru: "Коньяк и бренди", en: "Cognac & brandy", items: [
   {n: "Camus VS", v: 40, p: 750}, {n: "Camus VSOP", v: 40, p: 930}, {n: "Ной Араспел 5*", e: "Noy Araspel 5*", v: 40, p: 420}]},
  {ru: "Ром", en: "Rum", items: [
   {n: "OAKHEART Original Spiced Gold", v: 40, p: 450}, {n: "Matusalem Platino", v: 40, p: 490},
   {n: "Matusalem Solera 7", v: 40, p: 520}, {n: "Angostura Tamboo", v: 40, p: 590}]},
  {ru: "Ликёры и настойки", en: "Liqueurs & bitters", items: [
   {n: "Jägermeister", v: 40, p: 500}, {n: "Fernet-Branca", v: 40, p: 500}, {n: "Branca Menta", v: 40, p: 500},
   {n: "Beluga Hunting Herbal", v: 40, p: 350}, {n: "Beluga Hunting Berry", v: 40, p: 350},
   {n: "Beluga Noble Botanicals Cucumber and Mint", v: 40, p: 350}, {n: "Beluga Noble Botanicals Rose and Lime", v: 40, p: 350}]}]},

 {k: "beer", ru: "Пиво", en: "Beer", secs: [
  {ru: "Пиво разливное", en: "Draught beer", items: [
   {n: "Krusovice Svetle", v: "250/500", p: "300/490"}, {n: "Maison Arne Biere Blanche", v: "250/500", p: "350/590"}]},
  {ru: "Пиво бутылочное", en: "Bottled beer", items: [
   {n: "Corona Extra", v: 330, p: 520}, {n: "La Costa Fresca", v: 330, p: 390}, {n: "Augustiner", v: 500, p: 820},
   {n: "Blue Moon", v: 330, p: 450}, {n: "Bakalar Dark", v: 500, p: 690}, {n: "Mort Subite", v: 250, p: 550},
   {n: "Сидр №2", e: "Cider No. 2", v: 500, p: 550},
   {n: "Krusovice Svetle безалкогольное", e: "Krusovice Svetle alcohol-free", v: 330, p: 300}]}]},

 {k: "soft", ru: "Без алкоголя", en: "Alcohol-free", secs: [
  {ru: "Безалкогольные коктейли", en: "Alcohol-free cocktails", items: [
   {n: "Эспрессо тоник", e: "Espresso tonic", v: 250, p: 350},
   {n: "Колд брю вишня", e: "Cherry cold brew", c: "coldbrew", v: 200, p: 350},
   {n: "Щавелевый лимонад", e: "Sorrel lemonade", c: "shchavel", v: "250/1000", p: "350/890"},
   {n: "Цитрус Тархун", e: "Citrus tarragon", c: "tarhun", v: "250/1000", p: "350/890"},
   {n: "Лимонад Грейпфрут", e: "Grapefruit lemonade", c: "grapefruit", v: "250/1000", p: "350/890"}]},
  {ru: "Свежевыжатые соки", en: "Freshly squeezed juice", items: [
   {n: "Апельсин", e: "Orange", v: 250, p: 400}, {n: "Яблоко", e: "Apple", v: 250, p: 400}]},
  {ru: "Безалкогольные напитки", en: "Soft drinks", items: [
   {n: "Кола, тоник", e: "Cola, tonic", v: 330, p: 240}, {n: "Baikal 430", v: 450, p: 250},
   {n: "BAIKAL PEARL", v: 250, p: 250}, {n: "BAIKAL RESERVE", v: 250, p: 250},
   {n: "San Benedetto", v: 750, p: 690}, {n: "Сок в ассортименте", e: "Juice, assorted", v: 250, p: 160}]},
  {ru: "Энергетические напитки", en: "Energy drinks", items: [
   {n: "Red Bull", v: 250, p: 350}, {n: "Red Bull Sugarfree", v: 250, p: 350}, {n: "Red Bull The Red Edition", v: 250, p: 350}]}]},

 {k: "hot", ru: "Кофе и чай", en: "Coffee & tea", secs: [
  {ru: "Кофе", en: "Coffee", items: [
   {n: "Эспрессо", e: "Espresso", v: 40, p: 170}, {n: "Американо", e: "Americano", v: 150, p: 170},
   {n: "Капучино", e: "Cappuccino", v: 150, p: 320}, {n: "Латте", e: "Latte", v: 200, p: 350},
   {n: "Раф", e: "Raf coffee", v: 150, p: 320}, {n: "Флэт уайт", e: "Flat white", v: 200, p: 350},
   {n: "Какао", e: "Cocoa", v: 200, p: 350}, {n: "Матча", e: "Matcha", v: 200, p: 350}]},
  {ru: "Чай", en: "Tea", items: [
   {n: "Ассам", e: "Assam", v: 550, p: 360}, {n: "Пуэр", e: "Pu-erh", v: 550, p: 360},
   {n: "Тегуаньинь", e: "Tieguanyin", v: 550, p: 360}, {n: "Молочный улун", e: "Milk oolong", v: 550, p: 360},
   {n: "Татарский", e: "Tatar tea", v: 550, p: 360}, {n: "Башкирский травяной", e: "Bashkir herbal tea", v: 550, p: 360},
   {n: "Таёжный", e: "Taiga tea", v: 550, p: 360}, {n: "Сладкий поцелуй", e: "Sweet Kiss", v: 550, p: 360},
   {n: "Гречишный", e: "Buckwheat tea", v: 550, p: 360}]},
  {ru: "Горячие напитки", en: "Hot drinks", items: [
   {n: "Облепиха", e: "Sea buckthorn", c: "oblepiha", v: 500, p: 450},
   {n: "Черника-маракуйя", e: "Blueberry & passion fruit", v: 500, p: 450},
   {n: "Вишня", e: "Cherry", v: 500, p: 450}]}]}
];

/* описания вин — по словам */
const WORDS = {"сухое": "dry", "полусухое": "off-dry", "полусладкое": "medium sweet", "Чили": "Chile", "Италия": "Italy",
  "Россия": "Russia", "Португалия": "Portugal", "Германия": "Germany", "Франция": "France", "Новая Зеландия": "New Zealand",
  "ЮАР": "South Africa", "Испания": "Spain", "США": "USA"};

/* карта «Состав и аллергены» по-английски: id → [название, состав]. Новая позиция без перевода — по-русски. */
const CARD_EN = {
  pantera: ["Pink Panther", "pear, Sarti, soda"],
  pornstar: ["Pornstar", "vodka, vanilla, passion fruit, sparkling wine"],
  tropiki: ["Tropics", "OAKHEART Original Spiced Gold rum, passion fruit, pineapple, Sarti, Aperol"],
  maitai: ["Mai Tai", "OAKHEART Original Spiced Gold rum, amaretto, peach, pineapple, orange, lime"],
  negroni: ["Negroni", "Campari, Martini Rosso vermouth, gin, orange"],
  hugo: ["Cucumber Hugo", "Hoppers gin, cucumber cordial, elderflower, lime, sparkling wine, soda"],
  bluecolada: ["Blue Colada", "OAKHEART Original Spiced Gold rum, coconut water, cordial, pineapple juice, ice-cream foam"],
  summer: ["Summer Spritz", "Martini Fiero vermouth, strawberry cordial, sparkling wine"],
  chili: ["Chili Barberry", "lemon-zest gin, Sauvignon Blanc wine, chili-barberry cordial"],
  longisland: ["Long Island", "vodka, gin, rum, tequila, triple sec, cola"],
  grusha: ["Pear Jasmine", "pear vodka, peach-jasmine cordial, ice-cream foam"],
  pinklady: ["Pink Lady", "Sarti, gin, lime, sugar syrup"],
  bramble: ["Bramble", "berry vodka, blackberry-lavender cordial, lime"],
  "c-fiero": ["Martini Fiero Tonic", "Martini Fiero vermouth, tonic"],
  "c-bosford": ["Bosford Tonic", "Bosford gin, tonic"],
  "c-watermelon": ["Watermelon Gin", "Red Bull The Red Edition, Hoppers gin"],
  "c-collins": ["Sorrel Collins", "Hoppers gin, sorrel, soda"],
  "c-aperol": ["Aperol Spritz", "Aperol, sparkling wine, soda, orange"],
  "c-campari": ["Campari Spritz", "Campari, sparkling wine, soda, orange"],
  "c-sarti": ["Sarti Spritz", "Sarti, sparkling wine, soda, lime"],
  vishnya: ["Cherry", "whisky, cherry, sugar, cinnamon"],
  malina: ["Raspberry, lime, mint", "vodka, raspberry, lime, sugar, mint"],
  limoncello: ["Limoncello", "vodka, fresh lemon juice, sugar syrup, lemon zest, fresh orange juice"],
  maracuya: ["Passion fruit & ice cream", "rum, ice-cream foam, passion fruit, lactic acid, water"],
  klubnika: ["Strawberry, hibiscus", "vodka, strawberry, sugar, lime, hibiscus tea"],
  shchavel: ["Sorrel cordial", "water, sugar, sorrel, citric acid"],
  tarhun: ["Citrus tarragon", "citrus cordial, tarragon-lime cordial"],
  barbaris: ["Chili-barberry cordial", "water, sugar, barberry candies, lactic acid, chili pepper"],
  coldbrew: ["Cold brew", "cherry juice, water, coffee"],
  oblepiha: ["Sea buckthorn purée", "sea buckthorn, water, sugar"],
  plombir: ["Ice-cream foam", "vanilla syrup, ice cream, milk, cream, water"],
  koritsa: ["Cinnamon-basil cordial", "basil syrup, cinnamon"],
  grapefruit: ["Grapefruit lemonade", "cinnamon-basil cordial, alcohol-free beer, lime"],
  sirop: ["Sugar syrup", "water, sugar"],
  igristoe: ["Sparkling wine foam", "sparkling wine, egg white"]
};
const GROUP_EN = {
  premix: ["Premixes", "Premixes", "Shelf life 14 days from the date of production"],
  bar: ["Cocktails", "Cocktails", "Made to order, not stored"],
  nastoyki: ["Shots", "Shots", "Shelf life 14 days from the date of production"],
  pf: ["House-made bases", "Bases", "Alcohol-free · shelf life 7 days from the date of production"]
};
const AL_EN = [["не выявлены", "none identified"], ["яйца (белок)", "eggs (egg white)"], ["диоксид серы и сульфиты", "sulphur dioxide and sulphites"],
  ["молоко", "milk"], ["глютен (ячменный солод)", "gluten (barley malt)"], ["глютен", "gluten"], ["орехи", "nuts"], ["арахис", "peanuts"]];

const UI = {
  ru: {title: "Бар «Мечты» — меню", bar: "Бар «Мечты»", lang: "Язык", tabs: "Раздел", pmenu: "Меню", pcard: "Состав и аллергены",
    h1menu: "Меню", ledeMenu: "Коктейли, вино, крепкое, пиво, безалкогольные напитки, кофе и чай. У коктейлей — ссылка на состав и аллергены.",
    h1card: "Состав<br>и аллергены", ledeCard: "Коктейли, премиксы, шоты и полуфабрикаты собственного производства: состав, аллергены и срок годности.",
    mq: "Поиск по меню", q: "Поиск по названию или ингредиенту", chips: "Фильтр по разделам", all: "Все", of: "из",
    batch: "Даты партии", batchDd: "Указаны на ярлыке каждой ёмкости",
    footMenu: "Не является публичной офертой и носит рекламный характер.", footCard: "Технологические карты хранятся на производстве",
    empty: "Ничего не найдено — проверьте написание или сбросьте фильтр.", link: "Состав и аллергены",
    ml: "мл", pcs: "шт", serve: "Подача", serveDd: "мл, сразу после приготовления", srok: "Годность", al: "Аллергены", more: "Узнать больше"},
  en: {title: "Mechty Bar — menu", bar: "Mechty Bar", lang: "Language", tabs: "Section", pmenu: "Menu", pcard: "Ingredients & allergens",
    h1menu: "Menu", ledeMenu: "Cocktails, wine, spirits, beer, soft drinks, coffee and tea. Each cocktail links to its ingredients and allergens.",
    h1card: "Ingredients<br>&amp; allergens", ledeCard: "Our cocktails, premixes, shots and house-made bases: ingredients, allergens and shelf life.",
    mq: "Search the menu", q: "Search by name or ingredient", chips: "Filter by section", all: "All", of: "of",
    batch: "Batch dates", batchDd: "Shown on the label of each container",
    footMenu: "This menu is not a public offer and is for information only.", footCard: "Recipe cards are kept on site",
    empty: "Nothing found — check the spelling or reset the filter.", link: "Ingredients & allergens",
    ml: "ml", pcs: "shots", serve: "Serving", serveDd: "ml, served freshly made", srok: "Shelf life", al: "Allergens", more: "Learn more"}
};

/* язык: выбор гостя → ?lang=en|ru → язык телефона (не русский/казахский и т. п. — английский) */
let LANG = (function () {
  let l = "";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "ru") localStorage.setItem("mechty-lang", q);
    l = localStorage.getItem("mechty-lang") || "";
  } catch (e) {}
  if (l === "en" || l === "ru") return l;
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "ru"];
  return langs.some(x => /^(ru|kk|uk|be|uz|ky|tg|az|hy|ka)\b/i.test(x)) ? "ru" : "en";
})();
const EN = () => LANG === "en";
const t = k => UI[LANG][k];
const enWords = d => { const w = d.split(/,\s*/).map(x => WORDS[x]); return w.every(Boolean) ? w.join(", ") : ""; };
const alEn = s => { let r = String(s).toLowerCase(); for (const [a, b] of AL_EN) r = r.split(a).join(b); return /[а-яё]/i.test(r) ? s : r.charAt(0).toUpperCase() + r.slice(1); };
const srokEn = s => String(s).replace(/(\d+)\s*сут\S*/, "$1 days");
const cardItem = id => { for (const g of data) for (const it of g.items) if (it.id === id && !it.lo) return it; return null; };

/* название и описание позиции меню на текущем языке */
function mName(x, lang){
  const ci = x.c && !x.n ? cardItem(x.c) : null, en = (lang || LANG) === "en";
  if (ci) return en && CARD_EN[x.c] && CARD_EN[x.c][0] || ci.n;          // пустое «Название EN» — русское
  return en ? x.e || x.n : x.n;
}
function mDesc(x, lang){
  const en = (lang || LANG) === "en";
  if (x.d) return en ? x.de || enWords(x.d) || x.d : x.d;
  const ci = x.c ? cardItem(x.c) : null;
  if (!ci) return "";
  return en && CARD_EN[x.c] && CARD_EN[x.c][1] || ci.m || "";
}
const mVol = x => x.v ? x.v + " " + t(x.u === "pcs" ? "pcs" : "ml") : "";

let mActive = "all", gPane = "menu", mScroll = null;

function mTile(x){
  const ci = x.c ? cardItem(x.c) : null, n = mName(x), d = mDesc(x);
  return '<article class="mtile">' +
    '<div class="chead"><h3>' + esc(n) + '</h3></div>' +
    '<div class="cbody">' + (ci && ci.img ? '<div class="mtx"><p class="mdesc">' + esc(d) + '</p><button type="button" class="mmore" data-more="' + esc(x.c) + '">' + t("more") + '<span aria-hidden="true">→</span></button></div>' +
      '<img class="cph" src="' + esc(ci.img) + '" alt="' + esc(n) + '"' + phwh(ci.img) + ' loading="lazy" decoding="async" data-more="' + esc(x.c) + '">' : '<p class="mdesc">' + esc(d) + '</p>') + '</div>' +
    '<div class="mfoot">' + (ci ? '<a class="mlink" href="#sostav-' + esc(x.c) + '">' + t("link") + ' →</a>' : '<span></span>') +
    '<span class="mvp">' + (x.v ? '<small>' + esc(mVol(x)) + '</small>' : '') + '<b>' + esc(x.p) + '</b></span></div></article>';
}
function mRow(x){
  const ci = x.c ? cardItem(x.c) : null, d = mDesc(x);
  return '<li class="mrow"><div class="mn"><span class="mname">' + esc(mName(x)) + '</span>' +
    (d ? '<small>' + esc(d) + '</small>' : '') +
    (ci ? '<a class="mlink" href="#sostav-' + esc(x.c) + '">' + t("link") + ' →</a>' : '') + '</div>' +
    '<span class="mv">' + esc(mVol(x)) + '</span><b class="mp">' + esc(x.p) + '</b></li>';
}
const mOk = x => x.n || cardItem(x.c);                         // позиция из карты, которой там уже нет, — не показывать
const mHit = (x, f) => !f || [mName(x, "ru"), mName(x, "en"), mDesc(x, "ru"), mDesc(x, "en")].some(s => s.toLowerCase().includes(f));

function drawMenu(){
  const f = $("gq").value.trim().toLowerCase(), ch = f ? "all" : mActive;
  let html = "";
  for (const c of MENU){
    if (ch !== "all" && ch !== c.k) continue;
    for (const s of c.secs){
      const items = s.items.filter(x => mOk(x) && mHit(x, f));
      if (!items.length) continue;
      html += '<section class="msec"><div class="sechead"><h2>' + esc(s[LANG]) + '</h2></div>' +
        (s.tiles ? '<div class="grid mgrid">' + items.map(mTile).join("") + '</div>' : '<ul class="mlist">' + items.map(mRow).join("") + '</ul>') +
        '</section>';
    }
  }
  $("mout").innerHTML = html || '<p class="empty">' + t("empty") + '</p>';
  document.querySelectorAll("#mchips button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.key === ch)));
}
function drawMenuChips(){
  const n = c => c.secs.reduce((a, s) => a + s.items.filter(mOk).length, 0);
  $("mchips").innerHTML = [{k: "all", ru: UI.ru.all, en: UI.en.all, n: MENU.reduce((a, c) => a + n(c), 0)}]
    .concat(MENU.map(c => ({k: c.k, ru: c.ru, en: c.en, n: n(c)})))
    .map(d => '<button type="button" data-key="' + esc(d.k) + '" aria-pressed="false">' + esc(d[LANG]) + '<b>' + d.n + '</b></button>').join("");
}

/* вкладки «Меню» / «Состав и аллергены» */
function gPanel(p){
  gPane = p === "card" ? "card" : "menu";
  $("pMenu").hidden = gPane !== "menu";
  $("pCard").hidden = gPane !== "card";
  document.querySelectorAll("#gTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === gPane)));
  const h1 = t(gPane === "card" ? "h1card" : "h1menu");
  if ($("gTitle").dataset.h !== h1){ $("gTitle").innerHTML = h1; $("gTitle").dataset.h = h1; }   // не сбивать анимацию заголовка
  $("gLede").textContent = t(gPane === "card" ? "ledeCard" : "ledeMenu");
  $("gFoot").textContent = t(gPane === "card" ? "footCard" : "footMenu");
}
/* адрес без #: меню; если пришли из меню по ссылке на состав — вернуться на то же место */
function gBack(){
  const y = gPane === "card" ? mScroll : null;
  mScroll = null;
  gPanel("menu");
  if (y != null) requestAnimationFrame(() => window.scrollTo(0, y));
}

function applyLang(){
  document.documentElement.lang = LANG;
  document.title = t("title");
  $("tabBar").textContent = t("bar");
  $("gMark").textContent = t("bar");
  $("lang").setAttribute("aria-label", t("lang"));
  $("gTabs").setAttribute("aria-label", t("tabs"));
  document.querySelectorAll("#gTabs button").forEach(b => { b.textContent = t(b.dataset.p === "card" ? "pcard" : "pmenu"); });
  document.querySelectorAll("#lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === LANG)));
  for (const [id, k] of [["gq", "mq"], ["q", "q"]]){ $(id).placeholder = t(k); $(id).setAttribute("aria-label", t(k)); }
  $("mchips").setAttribute("aria-label", t("chips"));
  $("chips").setAttribute("aria-label", t("chips"));
  $("gBatch").textContent = t("batch");
  $("gBatchDd").textContent = t("batchDd");
  gPanel(gPane);
  drawMenuChips(); drawMenu();
  if (typeof drawCard === "function"){ drawChips(); drawCard(); }
  if (typeof storyRefresh === "function") storyRefresh();
}

$("lang").addEventListener("click", e => {
  const b = e.target.closest("button[data-l]");
  if (!b || b.dataset.l === LANG) return;
  LANG = b.dataset.l;
  try { localStorage.setItem("mechty-lang", LANG); } catch (err) {}
  buzz(8);
  applyLang();
});
$("gTabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-p]");
  if (!b || b.dataset.p === gPane) return;
  mScroll = null;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);   // ссылка на состав снова сработает
  gPanel(b.dataset.p);
});
$("mchips").addEventListener("click", e => {
  const b = e.target.closest("button[data-key]");
  if (!b) return;
  mActive = b.dataset.key;
  if ($("gq").value) $("gq").value = "";
  drawMenu();
});
$("gq").addEventListener("input", drawMenu);
/* ссылка «Состав и аллергены»: запомнить место в меню; та же ссылка второй раз — без смены адреса */
$("mout").addEventListener("click", e => {
  const a = e.target.closest("a.mlink");
  if (!a) return;
  mScroll = window.scrollY;
  if (location.hash === a.getAttribute("href")){ e.preventDefault(); jumpTo(a.getAttribute("href").slice(1).replace(/^sostav-/, "")); }
});

/* ── меню и состав из таблицы («Менеджер» → «Гостям») ──
   Пока листов нет — показывается то, что в файлах сайта (выше). Есть — сайт берёт их из таблицы без пароля,
   копию хранит на телефоне (открывается сразу и без интернета), свежую подтягивает при каждом открытии. */
const PUBK = "mechty-pub", pubYes = v => /^(да|1|true|x|\+)$/i.test(String(v).trim());
const PUB0 = {menu: JSON.parse(JSON.stringify(MENU)), data: JSON.parse(JSON.stringify(data)),
  en: JSON.parse(JSON.stringify(CARD_EN)), gen: JSON.parse(JSON.stringify(GROUP_EN))};
let pubV = "", pubFrom = "files";
const pubSet = (to, from) => { to.length = 0; from.forEach(x => to.push(x)); };
const pubObj = (to, from) => { Object.keys(to).forEach(k => delete to[k]); Object.assign(to, from); };
/* строки таблицы → MENU и data (как в файлах сайта) */
function pubApply(d){
  if (!d || !d.ok || !Array.isArray(d.menu) || !Array.isArray(d.items) || !Array.isArray(d.groups)) return false;
  const menu = [];
  let ch = null, sec = null;
  for (const r of d.menu){
    if (!ch || ch.ru !== r[0]){ ch = {k: String(r[0]), ru: String(r[0]), en: String(r[1] || r[0]), secs: []}; menu.push(ch); sec = null; }
    if (!sec || sec.ru !== r[2]){ sec = {ru: String(r[2]), en: String(r[3] || r[2]), tiles: pubYes(r[4]), items: []}; ch.secs.push(sec); }
    const x = {p: r[11]};
    if (r[5]) x.n = String(r[5]); if (r[6]) x.e = String(r[6]); if (r[7]) x.d = String(r[7]); if (r[8]) x.de = String(r[8]);
    if (r[9] !== "" && r[9] != null) x.v = r[9]; if (/^шт/i.test(r[10])) x.u = "pcs"; if (r[12]) x.c = String(r[12]);
    sec.items.push(x);
  }
  const en = {}, gen = {}, by = {}, groups = d.groups.map(g => {
    const o = {key: String(g[0]), cat: String(g[1]), short: String(g[2] || g[1]), rule: String(g[3] || ""), srok: String(g[4] || ""), store: String(g[5] || ""),
      items: []};
    if (pubYes(g[6])) o.serve = true;
    if (pubYes(g[7])) o.nolabel = true;
    if (g[8] || g[9] || g[10]) gen[o.key] = [String(g[8] || ""), String(g[9] || g[8] || ""), String(g[10] || "")];
    by[o.key] = o;
    return o;
  });
  for (const r of d.items){
    const g = by[r[0]];
    if (!g) continue;
    const al = String(r[7] || "Не выявлены"), it = {id: String(r[1]), n: String(r[2]), c: String(r[6] || r[4] || "").split(/\s*;\s*/).filter(Boolean), al, m: String(r[4] || "")};
    if (!/не выявлен/i.test(al)) it.flag = true;
    if (r[8]) it.alEn = String(r[8]);
    if (r[9] !== "" && r[9] != null) it.vol = r[9];
    if (r[10]) it.img = String(r[10]);
    if (r[11]) it.icon = String(r[11]);
    if (r[12]) it.ln = String(r[12]);
    if (pubYes(r[13])) it.lo = true;
    /* «Узнать больше»: История, EN, Вкус, EN, О составе, EN, Цвет (пусто — текст сайта) */
    const st = {}; ["h", "he", "t", "te", "a", "ae", "col"].forEach((k, j) => { if (r[15 + j]) st[k] = String(r[15 + j]); });
    if (Object.keys(st).length) it.st = st;
    if (r[3] || r[5]) en[it.id] = [String(r[3] || ""), String(r[5] || "")];
    g.items.push(it);
  }
  if (!menu.length || !groups.some(g => g.items.length)) return false;   // пустая таблица — не затирать меню
  pubSet(MENU, menu);
  pubSet(data, groups.filter(g => g.items.length));
  pubObj(CARD_EN, en); pubObj(GROUP_EN, gen);
  pubV = d.v || ""; pubFrom = "table";
  if (!MENU.some(c => c.k === mActive)) mActive = "all";
  return true;
}
/* вернуть то, что в файлах сайта (листы удалили) */
function pubReset(){
  pubSet(MENU, JSON.parse(JSON.stringify(PUB0.menu)));
  pubSet(data, JSON.parse(JSON.stringify(PUB0.data)));
  pubObj(CARD_EN, JSON.parse(JSON.stringify(PUB0.en))); pubObj(GROUP_EN, JSON.parse(JSON.stringify(PUB0.gen)));
  pubV = ""; pubFrom = "files"; mActive = "all";
}
function pubRedraw(){
  drawMenuChips(); drawMenu();
  if (typeof drawCard === "function"){
    if (typeof active !== "undefined" && active !== "all" && !data.some(g => g.key === active)) active = "all";
    drawChips(); drawCard();
  }
  if (typeof labRefresh === "function") labRefresh();
  if (typeof storyRefresh === "function") storyRefresh();               // карточка «Узнать больше» — тексты из таблицы
  /* QR на позицию, которой не было в старой копии: коктейль с фото — карточку открыл storyRefresh, остальное — в «Состав» */
  const h = decodeURIComponent(location.hash.slice(1)), id = h.replace(/^sostav-/, "");
  if (id && h !== "bartenders" && h !== "card" && !(typeof storyFor === "function" && storyFor(h)) && cardItem(id) && typeof jumpTo === "function" && !$("viewBar").hidden){
    const el = document.getElementById(id);
    if (gPane !== "card" || !el || !el.classList.contains("hit")) jumpTo(id);
  }
}
function pubFetch(){
  if (typeof ENDPOINT !== "string") return;
  const cb = "mechtyPub" + Date.now(), el = document.createElement("script");
  const end = () => { try { delete window[cb]; } catch (e) { window[cb] = undefined; } el.remove(); };
  window[cb] = d => {
    end();
    if (d && d.ok && d.none){
      try { localStorage.removeItem(PUBK); } catch (e) {}
      if (pubFrom === "table"){ pubReset(); pubRedraw(); }
      return;
    }
    if (!d || !d.ok || (d.v && d.v === pubV)) return;
    if (pubApply(d)){
      try { localStorage.setItem(PUBK, JSON.stringify(d)); } catch (e) {}
      pubRedraw();
    }
  };
  el.onerror = end;
  el.src = ENDPOINT + "?pub=1&callback=" + cb;
  document.head.appendChild(el);
}
try { const c = JSON.parse(localStorage.getItem(PUBK) || "null"); if (c) pubApply(c); } catch (e) {}
document.addEventListener("DOMContentLoaded", pubFetch);

applyLang();

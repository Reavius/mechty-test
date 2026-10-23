/* ═════════ «Узнать больше» — карточка коктейля с фото поверх меню ═════════
   Кнопка на плитке меню (и ссылка или QR …/#story-id) открывает карточку: фото и две страницы — «История» и «Вкус»,
   затем «О составе», состав, крепость, объём, аллергены. Снизу — Telegram, Instagram и QR этой карточки (скачать картинкой).
   Тексты и цвет — из листа «Карта» (столбцы «История», «Вкус», «О составе», их EN и «Цвет»); пустая ячейка — текст ниже,
   «—» — раздел не показывать. Ниже — тексты по умолчанию (история проверена по источникам; рецептуры не раскрываются),
   менеджер переносит их в таблицу кнопкой в «Меню для гостей» → «Состав и аллергены». col — цвет коктейля на фото. */
const STORY = {
 "negroni": {"h":"По самой известной версии, Негрони родился во Флоренции около 1919 года: граф Камилло Негрони попросил бармена сделать его «Американо» крепче — джин вместо содовой. Долька апельсина вместо лимона отметила новый коктейль.","he":"According to the best-known story, the Negroni was born in Florence around 1919, when Count Camillo Negroni asked his bartender to strengthen his Americano with gin instead of soda water. An orange slice instead of lemon marked the new drink.","t":"Глубокий, бархатный, с благородной горчинкой. Сначала — апельсиновая цедра и травы, затем пряная сладость вермута, а долгое послевкусие уходит в можжевельник.","te":"Deep, velvety and nobly bitter. Orange peel and herbs come first, then the spiced sweetness of vermouth, and the long finish fades into juniper.","a":"Классическая троица: рубиновый Campari с горьким цитрусом, пряный вермут Martini Rosso и сухой джин, который держит всю конструкцию.","ae":"The classic trio: ruby Campari with its bitter citrus, spiced Martini Rosso vermouth and a dry gin that holds it all together.","col":"#f07b55"},
 "maitai": {"h":"Самую известную версию Май Тай придумал Виктор Бёрджерон, «Трейдер Вик», в Окленде в 1944 году. Подруга с Таити, попробовав, воскликнула: «Maita'i roa ae!» — «лучше не бывает!». У нас миндальную ноту дарит амаретто.","he":"The best-known Mai Tai was created by Victor Bergeron, “Trader Vic”, in Oakland in 1944. A friend from Tahiti tasted it and exclaimed “Maita'i roa ae!” — “out of this world, the best!”. In ours, amaretto brings the almond note.","t":"Солнечный и сочный: ананас и апельсин на первом глотке, бархатный персик в середине, а пряный ром и миндаль амаретто оставляют тёплое, чуть карамельное послевкусие.","te":"Sunny and juicy: pineapple and orange on the first sip, velvety peach in the middle, while spiced rum and almond amaretto leave a warm, slightly caramel finish.","a":"Пряный ром OAKHEART с нотами ванили и карамели, миндальный амаретто и спелые фрукты — персик, ананас, апельсин и лайм для свежести.","ae":"OAKHEART spiced rum with notes of vanilla and caramel, almond amaretto and ripe fruit — peach, pineapple, orange and a touch of lime for freshness.","col":"#e2be45"},
 "c-aperol": {"h":"Слово «спритц» — от немецкого spritzen, «брызгать»: по легенде, в XIX веке австрийские солдаты в Венето разбавляли местное вино водой. Апероль братья Барбьери создали в Падуе в 1919 году, а со временем Aperol Spritz стал одним из самых популярных аперитивов Италии.","he":"“Spritz” comes from the German spritzen, “to splash”: legend has it that 19th-century Austrian soldiers in the Veneto diluted the local wine with water. The Barbieri brothers created Aperol in Padua in 1919, and in time the Aperol Spritz became one of Italy's best-loved aperitivi.","t":"Яркий и лёгкий, как вечер на венецианской террасе: сладкий апельсин и мягкая горчинка трав, игривые пузырьки и освежающий, чуть горьковатый финал.","te":"Bright and light, like an evening on a Venetian terrace: sweet orange and a gentle herbal bitterness, playful bubbles and a refreshing, slightly bitter finish.","a":"Апероль — итальянский аперитив с нотами горького апельсина и ревеня; с игристым и содовой он становится лёгким и искристым.","ae":"Aperol is an Italian aperitivo with notes of bitter orange and rhubarb; sparkling wine and soda make it light and effervescent.","col":"#f68e3f"},
 "c-campari": {"h":"Биттер Campari создал Гаспаре Кампари в 1860 году в Новаре, а прославился он в Милане. Спритц с ним — более горькая и взрослая версия итальянского аперитива: тот же ритуал, но с характером.","he":"Gaspare Campari created his bitter in Novara in 1860, and it found fame in Milan. A Campari spritz is the more bitter, grown-up take on the Italian aperitivo: the same ritual, with more character.","t":"Смелый и освежающий: горький апельсин и пряные травы на первом глотке, живые пузырьки игристого и сухое, бодрящее послевкусие с приятной горчинкой.","te":"Bold and refreshing: bitter orange and spiced herbs on the first sip, lively sparkling bubbles and a dry, invigorating finish with a pleasant bitterness.","a":"Рубиновый Campari с горьким цитрусом и травами, сухое игристое и содовая — коктейль для тех, кто любит выразительную горечь.","ae":"Ruby Campari with bitter citrus and herbs, dry sparkling wine and soda — a drink for those who love an expressive bitterness.","col":"#f4887f"},
 "pornstar": {"h":"Коктейль придумал лондонский бармен Дуглас Анкра в начале 2000-х: роскошный на вид и лёгкий в питье, с маракуйей, ванилью и игристым. Сегодня это один из самых популярных коктейлей Британии.","he":"London bartender Douglas Ankrah created it in the early 2000s: luxurious to look at and easy to drink, with passion fruit, vanilla and sparkling wine. Today it is one of Britain's most popular cocktails.","t":"Тропический и нежный: сочная кисло-сладкая маракуйя, сливочная ваниль и шелковистая текстура, а игристое добавляет праздничной свежести.","te":"Tropical and tender: juicy sweet-and-sour passion fruit, creamy vanilla and a silky texture, while the sparkling wine adds a festive freshness.","a":"Чистая водка оставляет место фруктам: яркая маракуйя, бархатная ваниль и бокал игристого для праздника.","ae":"Clean vodka leaves room for the fruit: vivid passion fruit, velvety vanilla and a glass of sparkling wine for the celebration.","col":"#fbc950"},
 "hugo": {"h":"Хьюго появился в 2005 году в Южном Тироле: бармен Роланд Грубер придумал его как свежую, менее горькую альтернативу спритцу. Сегодня классика — бузина, мята, игристое и содовая; наш вариант — с огуречным кордиалом и джином.","he":"Hugo was born in 2005 in South Tyrol, where bartender Roland Gruber created it as a fresher, less bitter alternative to the spritz. Today's classic is elderflower, mint, sparkling wine and soda; ours adds cucumber cordial and gin.","t":"Свежий, как утро в саду: хрусткий огурец и цветочная бузина, лёгкая кислинка лайма и шёпот можжевельника, а пузырьки делают его почти невесомым.","te":"Fresh as a morning in the garden: crisp cucumber and floral elderflower, a light lime tang and a whisper of juniper, with bubbles that make it almost weightless.","a":"Джин Hoppers, прохладный огуречный кордиал и цветы бузины, лайм, игристое и содовая — лёгкий коктейль для жаркого дня.","ae":"Hoppers gin, cool cucumber cordial and elderflower, lime, sparkling wine and soda — a light drink for a hot day.","col":"#afcf7a"},
 "bluecolada": {"h":"Пина колада — национальный напиток Пуэрто-Рико: по самой известной версии, её придумали в отеле Caribe Hilton в 1954 году. Наша Блю Колада — небесно-голубая, с кокосовой водой и пеной пломбира.","he":"The Piña Colada is the national drink of Puerto Rico; by the best-known account, it was created at the Caribe Hilton in 1954. Our Blue Colada is sky-blue, with coconut water and ice-cream foam.","t":"Как отпуск на берегу: сладкий ананас и кокосовая свежесть, пряный ром в глубине и облако сливочной пены сверху — мягкий, нежный и очень летний.","te":"Like a holiday by the sea: sweet pineapple and coconut freshness, spiced rum underneath and a cloud of creamy foam on top — soft, gentle and very summery.","a":"Пряный ром OAKHEART, кокосовая вода, ананасовый сок и голубой кордиал, а сверху — пена пломбира вместо сливок.","ae":"OAKHEART spiced rum, coconut water, pineapple juice and a blue cordial, crowned with ice-cream foam instead of cream.","col":"#14b071"},
 "c-collins": {"h":"Коллинз — семейство высоких освежающих коктейлей: крепкий алкоголь (классически джин), кислинка, сладость и содовая. Том Коллинз встречается уже в книге Джерри Томаса 1876 года. Мы заменили лимон щавелем.","he":"The Collins is a family of tall, refreshing drinks: a spirit (classically gin), something sour, something sweet and soda. The Tom Collins already appears in Jerry Thomas's 1876 guide. We replaced the lemon with sorrel.","t":"Зелёный и звонкий: травяная кислинка щавеля, прохлада можжевельника и бодрые пузырьки содовой — освежает, как первый весенний день.","te":"Green and crisp: the herbal tang of sorrel, the coolness of juniper and lively soda bubbles — as refreshing as the first day of spring.","a":"Сухой джин Hoppers, щавелевый кордиал вместо лимона и содовая — классическая схема коллинза с травяным характером.","ae":"Dry Hoppers gin, sorrel cordial in place of lemon, and soda — the classic Collins formula with an herbal character.","col":"#e4d56d"},
 "c-sarti": {"h":"Спритц — венецианская традиция аперитива: яркий горьковатый ликёр, игристое и содовая. В нашей версии место апероля занимает «Сарти Роза» — фруктовый итальянский аперитив.","he":"The spritz is a Venetian aperitivo tradition: a bright, bittersweet liqueur, sparkling wine and soda. In our version, Sarti Rosa — a fruity Italian aperitivo — takes the place of Aperol.","t":"Сочный и праздничный: красный апельсин, грейпфрут и тропические фрукты, лёгкая горчинка, пузырьки игристого и свежий акцент лайма в финале.","te":"Juicy and festive: blood orange, grapefruit and tropical fruit, a light bitterness, sparkling bubbles and a fresh hint of lime at the finish.","a":"«Сарти Роза» — итальянский аперитив с фруктовым характером; с игристым, содовой и лаймом он становится лёгким и искристым.","ae":"Sarti Rosa is an Italian aperitivo with a fruity character; sparkling wine, soda and lime make it light and effervescent.","col":"#f5bac1"},
 "pantera": {"h":"Авторский коктейль бара «Мечты»: розовый, грациозный и чуть хищный — нежный на вид, с уверенной силой внутри.","he":"A signature cocktail of Mechty Bar: pink, graceful and a little predatory — delicate to look at, with confident strength inside.","t":"Сочная груша с айвой на первом глотке, фруктовая яркость «Сарти Роза» и свежая кислинка лайма; финал — сухой, долгий и уверенный.","te":"Juicy pear and quince on the first sip, the fruity brightness of Sarti Rosa and a fresh lime tang; the finish is dry, long and confident.","a":"Грушевая водка с айвой, итальянский аперитив «Сарти Роза» и лайм — крепкий, но удивительно мягкий коктейль.","ae":"Pear-and-quince vodka, Sarti Rosa Italian aperitivo and lime — a strong yet surprisingly smooth cocktail.","col":"#f6bccd"},
 "tropiki": {"h":"Авторский коктейль бара «Мечты» — отпуск в бокале: пряный ром и тропические фрукты, а итальянские аперитивы добавляют взрослую горчинку.","he":"A signature cocktail of Mechty Bar — a holiday in a glass: spiced rum and tropical fruit, with Italian aperitivi adding a grown-up bitterness.","t":"Сочный ананас и маракуйя, ваниль и пряности рома, а затем — лёгкая апельсиновая горчинка и ароматный финал с нотами биттера.","te":"Juicy pineapple and passion fruit, vanilla and spiced rum, then a light orange bitterness and an aromatic finish with a hint of bitters.","a":"Ром OAKHEART, маракуйя и ананас встречаются с Aperol и «Сарти Роза»; капля биттера «Ангостура» собирает вкус воедино.","ae":"OAKHEART rum, passion fruit and pineapple meet Aperol and Sarti Rosa; a dash of Angostura bitters ties the flavours together.","col":"#f69b50"},
 "summer": {"h":"Авторский летний спритц бара «Мечты»: клубника с ванилью и ярко-красный Martini Fiero — коктейль для долгих тёплых вечеров.","he":"A signature summer spritz of Mechty Bar: strawberry with vanilla and bright red Martini Fiero — a drink for long, warm evenings.","t":"Спелая клубника и сливочная ваниль, сочный апельсин вермута и лёгкие пузырьки игристого — нежный, ягодный и совсем не приторный.","te":"Ripe strawberry and creamy vanilla, the juicy orange of the vermouth and light sparkling bubbles — tender, berry-led and never cloying.","a":"Вермут Martini Fiero с яркими нотами апельсина, клубнично-ванильный кордиал и игристое — лёгкий спритц с ягодным характером.","ae":"Martini Fiero vermouth with bright orange notes, strawberry-vanilla cordial and sparkling wine — a light spritz with a berry character.","col":"#f0764a"},
 "chili": {"h":"Авторский коктейль бара «Мечты» — вкус из детства с перчинкой: барбарис, знакомый по леденцам, встречается с острым чили и свежим совиньон блан.","he":"A signature cocktail of Mechty Bar — a childhood flavour with a kick: barberry, familiar from Russian candies, meets hot chili and fresh Sauvignon Blanc.","t":"Ягодная кислинка барбариса и цитрусовая свежесть, сухое белое вино в середине и тёплое, нарастающее тепло чили в финале.","te":"The berry tartness of barberry and citrus freshness, dry white wine in the middle and a warm, building chili heat on the finish.","a":"Джин на лимонной цедре, сухой совиньон блан и кордиал из барбариса с чили — яркое сочетание кислого, свежего и пряного.","ae":"Lemon-zest gin, dry Sauvignon Blanc and a barberry-chili cordial — a vivid balance of tart, fresh and spicy.","col":"#e2d3be"},
 "grusha": {"h":"Авторский коктейль бара «Мечты»: сочная груша, персик и тонкий жасмин под облаком пены пломбира — десерт, который притворяется коктейлем.","he":"A signature cocktail of Mechty Bar: juicy pear, peach and delicate jasmine under a cloud of ice-cream foam — a dessert pretending to be a cocktail.","t":"Нежная сливочная пена на первом глотке, затем спелая груша и персик, цветочный жасмин и мягкое, чистое послевкусие.","te":"Soft creamy foam on the first sip, then ripe pear and peach, floral jasmine and a smooth, clean finish.","a":"Грушевая водка с айвой, кордиал из персика и жасмина и пена пломбира — крепкий коктейль с характером десерта.","ae":"Pear-and-quince vodka, peach-jasmine cordial and ice-cream foam — a strong drink with the soul of a dessert.","col":"#d9d6b2"},
 "c-fiero": {"h":"Martini — туринский дом вермутов, основанный в 1863 году; Fiero — его яркий апельсиновый вермут. С тоником он становится лёгким аперитивом.","he":"Martini is a Turin vermouth house founded in 1863; Fiero is its bright, orange-led vermouth. With tonic it becomes a light aperitivo.","t":"Сочный красный апельсин и пряные травы, мягкая сладость и бодрая горчинка хинного тоника — освежающий и очень лёгкий.","te":"Juicy blood orange and spiced herbs, a soft sweetness and the brisk bitterness of quinine tonic — refreshing and very light.","a":"Всего два ингредиента: вермут Martini Fiero с нотами апельсина и тоник — простой и честный аперитив.","ae":"Just two ingredients: Martini Fiero vermouth with its orange notes, and tonic — a simple, honest aperitivo.","col":"#da493b"},
 "c-bosford": {"h":"Джин-тоник родился в британской Индии в XIX веке: по популярной версии, горький хинный тоник от малярии смягчали джином. Наш — на джине Bosford.","he":"The gin and tonic was born in 19th-century British India; the popular story says the bitter quinine tonic taken against malaria was softened with gin. Ours is made with Bosford gin.","t":"Прохладный и кристально чистый: можжевельник и цитрусовые ноты джина, тонкая горчинка хинина и бодрые пузырьки — классика, которая не надоедает.","te":"Cool and crystal clear: juniper and the citrus notes of the gin, a fine quinine bitterness and lively bubbles — a classic that never gets old.","a":"Джин Bosford с ярким можжевельником и цитрусом и тоник — ничего лишнего.","ae":"Bosford gin with bright juniper and citrus, and tonic — nothing more is needed.","col":"#d9e2e9"},
 "c-watermelon": {"h":"Авторский микс бара «Мечты» для тех, кто не хочет выбирать между бодростью и вечеринкой: сухой джин и арбузный Red Bull.","he":"A signature mix of Mechty Bar for those who don't want to choose between energy and a party: dry gin and watermelon Red Bull.","t":"Сочный летний арбуз и сладость энергетика, свежий можжевельник джина и бодрящие пузырьки — лёгкий, яркий, с настроением на всю ночь.","te":"Juicy summer watermelon and the sweetness of the energy drink, fresh juniper from the gin and lively bubbles — light, bright and ready for the whole night.","a":"Сухой джин Hoppers и Red Bull The Red Edition со вкусом арбуза — простое сочетание, которое заряжает.","ae":"Dry Hoppers gin and Red Bull The Red Edition with watermelon flavour — a simple pairing that charges you up.","col":"#b4332b"}
};
const SOC = {tg: "https://t.me/clubmechti", ig: "https://www.instagram.com/clubmechti"};
const SUI = {
  ru: {back: "Назад", story: "История", taste: "Вкус", about: "О составе", comp: "Состав", abv: "Крепость", vol: "Объём", al: "Аллергены",
    next: "Состав и детали", prev: "История и вкус", qr: "QR-код", qrTitle: "QR-код коктейля", qrHint: "Наведите камеру — откроется эта карточка",
    dl: "Скачать", close: "Закрыть", tg: "Telegram бара", ig: "Instagram бара", page: "Страница"},
  en: {back: "Back", story: "Story", taste: "Taste", about: "Composition", comp: "Ingredients", abv: "Strength", vol: "Volume", al: "Allergens",
    next: "Ingredients & details", prev: "Story & taste", qr: "QR code", qrTitle: "Cocktail QR code", qrHint: "Point your camera — this card will open",
    dl: "Download", close: "Close", tg: "Bar on Telegram", ig: "Bar on Instagram", page: "Page"}
};
const su = k => SUI[LANG][k];
const ST_ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 4.2 2.9 11.4c-1.3.5-1.2 1.3-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5zM9.4 14.2l9-5.7c.4-.3.8-.1.5.2l-7.4 6.7-.3 3.1-1.8-4.3z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/></svg>',
  qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h4v2h-2v2h-2v-4zm-4 4h2v2h2v2h-4v-4zm6 0h2v4h-2v-4z"/></svg>'
};

/* тексты позиции: из таблицы (it.st), пустое — по умолчанию из STORY, «—» — раздел не показывать */
function storyOf(it){
  const d = STORY[it.id] || {}, o = it.st || {};
  const g = k => { const v = String(o[k] || "").trim() || d[k] || ""; return /^[—–-]$/.test(v) ? "" : v; };
  const col = String(o.col || "").trim();
  return {h: g("h"), he: g("he"), t: g("t"), te: g("te"), a: g("a"), ae: g("ae"), col: /^#[0-9a-f]{6}$/i.test(col) ? col : d.col || "#c9a24b"};
}
const storyHas = it => !!(it && it.img && !it.lo);
const storyUrl = id => location.origin + location.pathname.replace(/index\.html$/, "") + "#story-" + encodeURIComponent(id);
/* где позиция в меню: раздел, объём, цена */
function storyMenu(id){
  for (const c of MENU) for (const s of c.secs) for (const x of s.items) if (x.c === id) return {sec: s[LANG] || s.ru, x};
  return null;
}
/* цвет карточки: тон и насыщенность — из цвета коктейля; фон панели тёмный, акцент светлый */
function stTone(hex){
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d){ s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return {h: Math.round(h), s: Math.round(Math.max(28, Math.min(72, s * 100)))};
}

let stEl = null, stId = "", stPushed = false, stFrom = null, stBack = null, stQrEl = null;
const stReduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ── живая сцена за фото: волны и пузырьки в цвете коктейля, плавающие ингредиенты — петля 3 с, как гифка ──
   Всё движется по кругу с периодом ровно 3 с (синусы и подъём пузырьков кратны периоду), поэтому шва нет.
   Внутри бокала — свои пузырьки и блик (маска по фото). Анимация идёт, только пока карточка открыта и видна;
   «уменьшить движение» в настройках телефона — один неподвижный кадр. */
const ST_LOOP = 3000;
const STFX = {
  pantera: {it: ["pear", "lime", "spark"], fizz: 8, glass: 5},
  pornstar: {it: ["passion", "flower", "spark"], fizz: 10, glass: 10},
  tropiki: {it: ["pineapple", "passion", "orange"], fizz: 5, glass: 4},
  maitai: {it: ["pineapple", "orange", "lime", "leaf"], fizz: 4, glass: 4},
  negroni: {it: ["orange", "ice"], fizz: 3, glass: 0},
  hugo: {it: ["cucumber", "lime", "flower", "leaf"], fizz: 14, glass: 14},
  bluecolada: {it: ["pineapple", "coconut"], fizz: 6, glass: 4, sea: 1},
  summer: {it: ["strawberry", "orange"], fizz: 12, glass: 12},
  chili: {it: ["chili", "berry", "lemon"], fizz: 4, glass: 3},
  grusha: {it: ["pear", "peach", "flower"], fizz: 4, glass: 0},
  "c-fiero": {it: ["orange", "ice"], fizz: 14, glass: 14},
  "c-bosford": {it: ["lime", "ice", "juniper"], fizz: 16, glass: 16},
  "c-watermelon": {it: ["watermelon", "ice"], fizz: 14, glass: 14},
  "c-collins": {it: ["leaf", "ice", "lemon"], fizz: 14, glass: 14},
  "c-aperol": {it: ["orange", "ice"], fizz: 14, glass: 14},
  "c-campari": {it: ["orange", "ice"], fizz: 14, glass: 14},
  "c-sarti": {it: ["grapefruit", "lime"], fizz: 14, glass: 14}
};
const TAU = Math.PI * 2;
/* повторяемые «случайные» числа от id — сцена у коктейля всегда одна и та же */
function stRand(seed){ let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/* ингредиенты: рисуются в точке (0,0), размер r */
const ST_DRAW = {
  citrus(x, r, rind, pith, flesh){
    x.fillStyle = rind; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.fillStyle = pith; x.beginPath(); x.arc(0, 0, r * .86, 0, TAU); x.fill();
    x.fillStyle = flesh; x.beginPath(); x.arc(0, 0, r * .78, 0, TAU); x.fill();
    x.strokeStyle = pith; x.lineWidth = r * .07;
    for (let k = 0; k < 8; k++){ const a = k * TAU / 8; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * r * .78, Math.sin(a) * r * .78); x.stroke(); }
    x.fillStyle = pith; x.beginPath(); x.arc(0, 0, r * .1, 0, TAU); x.fill();
  },
  orange(x, r){ ST_DRAW.citrus(x, r, "#f08a1c", "#fff1d6", "#ffab3d"); },
  lime(x, r){ ST_DRAW.citrus(x, r, "#4e9d34", "#effbd8", "#a9d86a"); },
  lemon(x, r){ ST_DRAW.citrus(x, r, "#f0cf24", "#fffbe0", "#ffe96b"); },
  grapefruit(x, r){ ST_DRAW.citrus(x, r, "#ee8a52", "#fff0e6", "#ff8f86"); },
  cucumber(x, r){
    x.fillStyle = "#2f6b2d"; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.fillStyle = "#cfe9a3"; x.beginPath(); x.arc(0, 0, r * .86, 0, TAU); x.fill();
    x.fillStyle = "#e8f6cf";
    for (let k = 0; k < 6; k++){ const a = k * TAU / 6; x.beginPath(); x.ellipse(Math.cos(a) * r * .38, Math.sin(a) * r * .38, r * .12, r * .06, a, 0, TAU); x.fill(); }
  },
  leaf(x, r){
    x.fillStyle = "#3e9a4a"; x.beginPath(); x.moveTo(-r, 0); x.quadraticCurveTo(0, -r * .75, r, 0); x.quadraticCurveTo(0, r * .75, -r, 0); x.fill();
    x.strokeStyle = "#9fd88f"; x.lineWidth = r * .07; x.beginPath(); x.moveTo(-r * .85, 0); x.lineTo(r * .85, 0); x.stroke();
  },
  flower(x, r){
    x.fillStyle = "#fffaf0";
    for (let k = 0; k < 5; k++){ const a = k * TAU / 5; x.beginPath(); x.ellipse(Math.cos(a) * r * .5, Math.sin(a) * r * .5, r * .48, r * .3, a, 0, TAU); x.fill(); }
    x.fillStyle = "#f5c842"; x.beginPath(); x.arc(0, 0, r * .26, 0, TAU); x.fill();
  },
  strawberry(x, r){
    x.fillStyle = "#e2394a"; x.beginPath(); x.moveTo(0, r); x.bezierCurveTo(-r * 1.1, r * .1, -r * .8, -r * .8, 0, -r * .6); x.bezierCurveTo(r * .8, -r * .8, r * 1.1, r * .1, 0, r); x.fill();
    x.fillStyle = "#ffe08a";
    for (const [a, b] of [[-.35, -.2], [.3, -.25], [0, .1], [-.3, .3], [.3, .3], [0, .6]]){ x.beginPath(); x.arc(a * r, b * r, r * .05, 0, TAU); x.fill(); }
    x.fillStyle = "#3e9a4a"; x.beginPath(); x.ellipse(0, -r * .65, r * .45, r * .14, 0, 0, TAU); x.fill();
  },
  berry(x, r){ x.fillStyle = "#c8243a"; x.beginPath(); x.arc(0, 0, r * .6, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.arc(-r * .2, -r * .2, r * .15, 0, TAU); x.fill(); },
  juniper(x, r){ x.fillStyle = "#3d4d8f"; x.beginPath(); x.arc(0, 0, r * .55, 0, TAU); x.fill(); x.fillStyle = "rgba(220,230,255,.5)"; x.beginPath(); x.arc(-r * .18, -r * .18, r * .14, 0, TAU); x.fill(); },
  chili(x, r){
    x.fillStyle = "#d8262c"; x.beginPath(); x.moveTo(-r * .9, -r * .2); x.quadraticCurveTo(r * .2, -r * .5, r, r * .6); x.quadraticCurveTo(r * .1, r * .1, -r * .8, r * .25); x.closePath(); x.fill();
    x.fillStyle = "#3e8a3a"; x.beginPath(); x.ellipse(-r * .9, 0, r * .2, r * .26, 0, 0, TAU); x.fill();
  },
  pear(x, r){
    x.fillStyle = "#c7d455"; x.beginPath(); x.arc(0, r * .3, r * .62, 0, TAU); x.arc(0, -r * .3, r * .4, 0, TAU); x.fill();
    x.strokeStyle = "#7a5a2e"; x.lineWidth = r * .1; x.beginPath(); x.moveTo(0, -r * .65); x.lineTo(r * .12, -r * .95); x.stroke();
  },
  peach(x, r){ x.fillStyle = "#ffab7d"; x.beginPath(); x.arc(0, 0, r * .75, 0, TAU); x.fill(); x.fillStyle = "#ff8a6a"; x.beginPath(); x.arc(r * .25, r * .2, r * .45, 0, TAU); x.fill();
    x.strokeStyle = "rgba(170,70,50,.45)"; x.lineWidth = r * .06; x.beginPath(); x.moveTo(0, -r * .7); x.quadraticCurveTo(-r * .25, 0, 0, r * .7); x.stroke(); },
  passion(x, r){
    x.fillStyle = "#6b2a5a"; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.fillStyle = "#f6c531"; x.beginPath(); x.arc(0, 0, r * .82, 0, TAU); x.fill();
    x.fillStyle = "#3a2a14";
    for (let k = 0; k < 9; k++){ const a = k * 2.4, d = r * .5 * Math.sqrt((k + .5) / 9); x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, r * .08, 0, TAU); x.fill(); }
  },
  pineapple(x, r){
    x.fillStyle = "#f6c945"; x.beginPath(); x.moveTo(-r, r * .6); x.lineTo(0, -r); x.lineTo(r, r * .6); x.closePath(); x.fill();
    x.strokeStyle = "rgba(190,130,20,.6)"; x.lineWidth = r * .06;
    for (let k = -2; k <= 2; k++){ x.beginPath(); x.moveTo(k * r * .35 - r * .5, r * .6); x.lineTo(k * r * .35 + r * .5, -r * .2); x.stroke(); }
    x.fillStyle = "#c88a2a"; x.fillRect(-r, r * .45, r * 2, r * .18);
  },
  coconut(x, r){ x.fillStyle = "#6b4a32"; x.beginPath(); x.arc(0, 0, r, 0, Math.PI); x.fill(); x.fillStyle = "#fdfaf3"; x.beginPath(); x.arc(0, 0, r * .82, 0, Math.PI); x.fill(); x.fillStyle = "#6b4a32"; x.fillRect(-r, -r * .06, r * 2, r * .12); },
  watermelon(x, r){
    x.fillStyle = "#3d8a3a"; x.beginPath(); x.moveTo(-r, -r * .5); x.lineTo(r, -r * .5); x.lineTo(0, r); x.closePath(); x.fill();
    x.fillStyle = "#ec4a5a"; x.beginPath(); x.moveTo(-r * .8, -r * .35); x.lineTo(r * .8, -r * .35); x.lineTo(0, r * .78); x.closePath(); x.fill();
    x.fillStyle = "#2a1a1a"; for (const [a, b] of [[-.3, -.1], [.3, -.1], [0, .25]]){ x.beginPath(); x.ellipse(a * r, b * r, r * .06, r * .1, 0, 0, TAU); x.fill(); }
  },
  ice(x, r){
    x.fillStyle = "rgba(255,255,255,.28)"; x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = r * .07;
    x.beginPath(); if (x.roundRect) x.roundRect(-r * .8, -r * .8, r * 1.6, r * 1.6, r * .3); else x.rect(-r * .8, -r * .8, r * 1.6, r * 1.6); x.fill(); x.stroke();
    x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.ellipse(-r * .35, -r * .4, r * .25, r * .1, -.6, 0, TAU); x.fill();
  },
  spark(x, r){ x.fillStyle = "rgba(255,255,255,.9)"; x.beginPath(); for (let k = 0; k < 8; k++){ const a = k * TAU / 8, d = k % 2 ? r * .2 : r * .7; x.lineTo(Math.cos(a) * d, Math.sin(a) * d); } x.closePath(); x.fill(); }
};
let stFx = null;
/* сцена коктейля: фон, волны, ингредиенты, пузырьки (за бокалом) и пузырьки в бокале */
function stFxMake(id, tone){
  const cfg = STFX[id] || {it: ["spark"], fizz: 6, glass: 0}, R = stRand(id), its = [];
  cfg.it.forEach((type, i) => { for (let k = 0; k < 2; k++) its.push({type, x: (i * 2 + k + .5) / (cfg.it.length * 2) + (R() - .5) * .1, y: .14 + R() * .62,
    r: .055 + R() * .035, ph: R(), ax: .015 + R() * .02, ay: .02 + R() * .03, rot: R() * TAU, sw: .25 + R() * .35, back: R() < .45}); });
  const bub = n => Array.from({length: n}, () => ({x: R(), y: R(), r: .006 + R() * .012, k: R() < .5 ? 1 : 2, ph: R()}));
  return {id, cfg, tone, its, fizz: bub(cfg.fizz), glass: bub(cfg.glass), raf: 0};
}
function stFxSize(c){ const d = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)){ c.width = Math.round(w * d); c.height = Math.round(h * d); } return {w, h, d}; }
function stFxFrame(p){
  const f = stFx, c = $("stBg"), g = $("stFizz");
  if (!f || !c) return;
  const {w, h, d} = stFxSize(c), x = c.getContext("2d"), H = f.tone.h, Sa = f.tone.s, m = Math.min(w, h);
  x.setTransform(d, 0, 0, d, 0, 0);
  /* фон: светлый центр в тон коктейля, мягкое «дыхание» света */
  const glow = .5 + .5 * Math.sin(TAU * p);
  const bg = x.createRadialGradient(w / 2, h * .55, m * .1, w / 2, h * .55, Math.max(w, h) * .75);
  bg.addColorStop(0, "hsl(" + H + " " + Sa * .5 + "% " + (93 - glow * 2) + "%)");
  bg.addColorStop(.6, "hsl(" + H + " " + Sa * .8 + "% 80%)");
  bg.addColorStop(1, "hsl(" + H + " " + Sa + "% 66%)");
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  /* лучи света сверху, медленно качаются */
  x.save(); x.globalAlpha = .18; x.fillStyle = "#fff";
  for (let k = 0; k < 3; k++){ const a = -.35 + k * .35 + .05 * Math.sin(TAU * (p + k / 3)); x.beginPath(); x.moveTo(w * (.35 + k * .15), -10); x.lineTo(w * (.35 + k * .15) + Math.tan(a) * h + 40, h); x.lineTo(w * (.35 + k * .15) + Math.tan(a) * h - 10, h); x.closePath(); x.fill(); }
  x.restore();
  const items = back => f.its.filter(o => o.back === back).forEach(o => {
    const r = o.r * m * (o.back ? .8 : 1);
    x.save();
    x.translate(o.x * w + Math.sin(TAU * (p + o.ph)) * o.ax * w, o.y * h + Math.cos(TAU * (p + o.ph)) * o.ay * h);
    x.rotate(o.rot + Math.sin(TAU * (p + o.ph)) * o.sw);
    x.globalAlpha = o.back ? .45 : .92;
    ST_DRAW[o.type](x, r);
    x.restore();
  });
  items(true);
  /* волны «жидкости» внизу — три слоя, бегут по кругу */
  const amp = f.cfg.sea ? m * .035 : m * .018;
  for (let k = 0; k < 3; k++){
    const base = h * ((f.cfg.sea ? .62 : .74) + k * .08);
    x.fillStyle = "hsla(" + H + " " + Sa + "% " + (62 - k * 8) + "% / " + (.32 + k * .14) + ")";
    x.beginPath(); x.moveTo(0, h);
    for (let X = 0; X <= w + 8; X += 8) x.lineTo(X, base + Math.sin(TAU * (X / w * (1.2 + k * .4) - p * (k % 2 ? -1 : 1)) + k) * amp);
    x.lineTo(w, h); x.closePath(); x.fill();
  }
  /* пузырьки за бокалом: поднимаются 1–2 раза за петлю */
  x.strokeStyle = "rgba(255,255,255,.7)"; x.fillStyle = "rgba(255,255,255,.22)"; x.lineWidth = 1;
  f.fizz.forEach(b => {
    const y = h + 10 - (((b.y + p * b.k) % 1) * (h + 20)), X = b.x * w + Math.sin(TAU * (p * 2 + b.ph)) * 5, r = Math.max(1.5, b.r * m);
    x.beginPath(); x.arc(X, y, r, 0, TAU); x.fill(); x.stroke();
  });
  items(false);
  /* пузырьки в бокале — холст с маской по фото */
  if (g){
    const s = stFxSize(g), y = g.getContext("2d");
    y.setTransform(s.d, 0, 0, s.d, 0, 0); y.clearRect(0, 0, s.w, s.h);
    if (f.glass.length){
      y.fillStyle = "rgba(255,255,255,.75)";
      f.glass.forEach(b => {
        const yy = s.h * .95 - (((b.y + p * b.k) % 1) * s.h * .6), X = s.w * (.3 + b.x * .4) + Math.sin(TAU * (p * 2 + b.ph)) * 2;
        y.beginPath(); y.arc(X, yy, Math.max(1, b.r * s.w * .6), 0, TAU); y.fill();
      });
    }
  }
}
function stFxLoop(t){
  if (!stFx || !stId || document.hidden) return (stFx && (stFx.raf = 0));
  stFxFrame((t % ST_LOOP) / ST_LOOP);
  stFx.raf = requestAnimationFrame(stFxLoop);
}
function stFxStart(id, tone){
  stFxStop();
  stFx = stFxMake(id, tone);
  if (stReduce()) return void requestAnimationFrame(() => stFxFrame(.25));   // один неподвижный кадр
  stFx.raf = requestAnimationFrame(stFxLoop);
}
function stFxStop(){ if (stFx && stFx.raf) cancelAnimationFrame(stFx.raf); if (stFx) stFx.raf = 0; }
document.addEventListener("visibilitychange", () => { if (!document.hidden && stFx && stId && !stFx.raf && !stReduce()) stFx.raf = requestAnimationFrame(stFxLoop); });

function stBuild(){
  stEl = document.createElement("div");
  stEl.className = "story"; stEl.id = "story"; stEl.hidden = true;
  stEl.setAttribute("role", "dialog"); stEl.setAttribute("aria-modal", "true"); stEl.setAttribute("aria-labelledby", "stName");
  stEl.innerHTML = '<div class="stph"><canvas class="stbg" id="stBg" aria-hidden="true"></canvas><div class="stglass" id="stGlass"><img id="stImg" alt="" decoding="async">' +
    '<canvas class="stfizz" id="stFizz" aria-hidden="true"></canvas><span class="stshine" aria-hidden="true"></span></div></div>' +
    '<div class="stpanel"><button type="button" class="stback" id="stBack">' + ST_ICON.back + '<span></span></button>' +
    '<p class="stkick" id="stKick"></p><h2 id="stName"></h2>' +
    '<div class="stpages" id="stPages"></div>' +
    '<div class="stnav" id="stNav"><span class="stdots" id="stDots"></span><button type="button" class="stnext" id="stNext"></button></div>' +
    '<div class="stsoc"><a class="stbtn" id="stTg" href="' + SOC.tg + '" target="_blank" rel="noopener">' + ST_ICON.tg + '</a>' +
    '<a class="stbtn" id="stIg" href="' + SOC.ig + '" target="_blank" rel="noopener">' + ST_ICON.ig + '</a>' +
    '<button type="button" class="stbtn" id="stQr">' + ST_ICON.qr + '</button></div></div>';
  document.body.appendChild(stEl);
  $("stBack").addEventListener("click", storyBack);
  $("stQr").addEventListener("click", stQr);
  $("stNext").addEventListener("click", () => stGo(stPage() ? 0 : 1));
  $("stDots").addEventListener("click", e => { const b = e.target.closest("button[data-pg]"); if (b) stGo(+b.dataset.pg); });
  $("stPages").addEventListener("scroll", () => { cancelAnimationFrame(stBuild.raf); stBuild.raf = requestAnimationFrame(stNavDraw); }, {passive: true});
  stEl.addEventListener("keydown", e => {
    if (e.key === "Escape"){ e.preventDefault(); storyBack(); }
    if (e.key === "Tab"){                                            // фокус не уходит под карточку
      const f = [...stEl.querySelectorAll("button, a[href]")].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener("resize", () => { if (stId){ stFit(); if (stReduce()) stFxFrame(.25); } });
}
const stPage = () => { const p = $("stPages"); return p && p.clientWidth ? Math.round(p.scrollLeft / p.clientWidth) : 0; };
function stGo(i){ const p = $("stPages"); buzz(8); p.scrollTo({left: i * p.clientWidth, behavior: stReduce() ? "auto" : "smooth"}); }
function stNavDraw(){
  const n = $("stPages").children.length, i = Math.min(stPage(), n - 1);
  $("stNav").hidden = n < 2;
  $("stDots").innerHTML = n < 2 ? "" : [...Array(n)].map((_, k) => '<button type="button" data-pg="' + k + '" aria-label="' + su("page") + " " + (k + 1) + '"' + (k === i ? ' aria-current="true"' : "") + '></button>').join("");
  $("stNext").innerHTML = i ? "← " + su("prev") : su("next") + " →";
  [...$("stPages").children].forEach((pg, k) => { pg.setAttribute("aria-hidden", String(k !== i)); pg.inert = k !== i; });
}
/* текст — без прокрутки: шрифт уменьшается, пока страница не влезет */
function stFit(){
  const ps = $("stPages");
  let fs = 16;
  ps.style.setProperty("--stfs", fs + "px");
  const over = () => [...ps.children].some(pg => pg.scrollHeight > pg.clientHeight + 1);
  while (over() && fs > 12.5){ fs -= .5; ps.style.setProperty("--stfs", fs + "px"); }
}
function stDraw(it){
  const s = storyOf(it), en = EN(), m = storyMenu(it.id), tone = stTone(s.col);
  const tx = (ru, eng) => en ? eng || ru : ru;
  stEl.style.setProperty("--st-h", tone.h); stEl.style.setProperty("--st-s", tone.s + "%");
  const img = $("stImg"), pw = PHW[String(it.img).replace(/^.*\/|\.webp$/g, "")];
  if (img.getAttribute("src") !== it.img) img.src = it.img;
  $("stGlass").style.aspectRatio = pw ? pw + " / 360" : "";                // рамка ровно по фото — маска пузырьков и блика совпадает
  $("stGlass").style.setProperty("--stimg", 'url("' + it.img + '")');
  if (!stFx || stFx.id !== it.id) stFxStart(it.id, tone); else stFx.tone = tone;
  img.alt = cname(it);
  $("stBack").querySelector("span").textContent = su("back");
  $("stKick").textContent = m ? m.sec : "";
  $("stName").textContent = cname(it);
  const sec = (h, p) => p ? '<h3>' + esc(h) + '</h3><p>' + esc(p) + '</p>' : "";
  const p1 = sec(su("story"), tx(s.h, s.he)) + sec(su("taste"), tx(s.t, s.te));
  const vol = m && m.x.v ? m.x.v : it.vol, al = en && it.alEn ? it.alEn : en ? alEn(it.al) : it.al;
  const dl = [[su("comp"), comp(it)], [su("abv"), it.abv ? "≈ " + it.abv + "%" : ""], [su("vol"), vol ? vol + " " + t("ml") : ""], [su("al"), al || ""]]
    .filter(r => r[1]).map(r => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join("");
  const p2 = sec(su("about"), tx(s.a, s.ae)) + (dl ? '<dl class="stdl">' + dl + '</dl>' : "");
  $("stPages").innerHTML = [p1, p2].filter(Boolean).map(h => '<section class="stpage">' + h + '</section>').join("");
  $("stTg").setAttribute("aria-label", su("tg")); $("stIg").setAttribute("aria-label", su("ig")); $("stQr").setAttribute("aria-label", su("qr"));
  $("stTg").title = su("tg"); $("stIg").title = su("ig"); $("stQr").title = su("qr");
  stNavDraw();
}
/* открыть карточку: from — плитка меню (карточка «раскрывается» из неё) */
function storyOpen(id, from){
  const it = cardItem(id);
  if (!storyHas(it)) return false;
  if (!stEl) stBuild();
  const was = !!stId;
  stId = id; stFrom = from || null;
  stDraw(it);
  if (!was) stBack = document.activeElement;
  stEl.hidden = false;
  document.documentElement.classList.add("stopen");
  $("stPages").scrollLeft = 0; stNavDraw();
  stFit();
  if (!was && !stReduce() && stEl.animate){
    const r = from && from.getBoundingClientRect();
    const a = r && r.bottom > 0 && r.top < innerHeight ? "inset(" + Math.max(0, r.top) + "px " + Math.max(0, innerWidth - r.right) + "px " + Math.max(0, innerHeight - r.bottom) + "px " + Math.max(0, r.left) + "px round 18px)" : "inset(8% 8% 8% 8% round 26px)";
    stEl.animate([{clipPath: a, opacity: r ? 1 : 0}, {clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1}], {duration: 420, easing: "cubic-bezier(.2,.8,.2,1)"});
  }
  $("stBack").focus({preventScroll: true});
  return true;
}
function storyClose(){
  if (!stId || !stEl) return;
  const from = stFrom, done = () => { stEl.hidden = true; document.documentElement.classList.remove("stopen"); stFxStop(); stFx = null; };
  stId = ""; stFrom = null; stPushed = false;
  if (stQrEl) stQrEl.hidden = true;
  const r = from && from.isConnected && from.getBoundingClientRect();
  if (!stReduce() && stEl.animate){
    const a = r && r.bottom > 0 && r.top < innerHeight ? "inset(" + Math.max(0, r.top) + "px " + Math.max(0, innerWidth - r.right) + "px " + Math.max(0, innerHeight - r.bottom) + "px " + Math.max(0, r.left) + "px round 18px)" : "inset(8% 8% 8% 8% round 26px)";
    stEl.animate([{clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1}, {clipPath: a, opacity: r ? 1 : 0}], {duration: 300, easing: "cubic-bezier(.4,0,.2,1)"}).onfinish = done;
  } else done();
  if (stBack && stBack.isConnected) try { stBack.focus({preventScroll: true}); } catch (e) {}
  stBack = null;
}
/* «Назад»: открыли с плитки — назад по истории (как кнопка телефона); пришли по ссылке или QR — просто закрыть */
function storyBack(){
  if (stPushed) return history.back();
  history.replaceState(null, "", location.pathname + location.search);
  storyClose();
}
/* плитка меню → карточка; адрес …/#story-id — кнопка «назад» телефона закроет её */
function storyGo(id, from){
  if (!storyOpen(id, from)) return;
  history.pushState(null, "", "#story-" + encodeURIComponent(id));
  stPushed = true;
}
/* из route(): адрес #story-id (QR, ссылка, «вперёд») */
function storyRoute(id){
  if (stId === id) return;
  if (!storyOpen(id)) return;                                      // позиции ещё нет (меню из таблицы грузится) — откроет storyRefresh
  stPushed = false;
}
/* адрес больше не на карточке (кнопка «назад» телефона) */
function storyShut(){ if (stId) storyClose(); }
/* меню перерисовалось (таблица, язык): карточка — заново; пришли по QR, а позиция появилась только сейчас — открыть */
function storyRefresh(){
  const h = decodeURIComponent(location.hash.slice(1));
  if (stId){ const it = cardItem(stId); if (storyHas(it)){ stDraw(it); stFit(); } else storyClose(); return; }
  if (h.indexOf("story-") === 0 && !$("viewBar").hidden) storyRoute(h.slice(6));
}

/* QR этой карточки: показать и скачать картинкой (с названием) */
function stQrCanvas(id, name){
  const q = qrcode(0, "M");
  q.addData(storyUrl(id)); q.make();
  const n = q.getModuleCount(), cell = 12, pad = 4 * cell, w = n * cell + pad * 2, foot = 76;
  const c = document.createElement("canvas");
  c.width = w; c.height = w + foot;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#0E1014";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(pad + k * cell, pad + r * cell, cell, cell);
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "700 30px Manrope, -apple-system, sans-serif";
  x.fillText(name, w / 2, w + 16, w - 40);
  x.font = "500 20px Manrope, -apple-system, sans-serif"; x.fillStyle = "#6b6f76";
  x.fillText(t("bar"), w / 2, w + 50, w - 40);
  return c;
}
function stQr(){
  const it = cardItem(stId);
  if (!it || !window.qrcode) return;
  buzz(8);
  if (!stQrEl){
    stQrEl = document.createElement("div");
    stQrEl.className = "stqr"; stQrEl.hidden = true;
    stQrEl.setAttribute("role", "dialog"); stQrEl.setAttribute("aria-modal", "true"); stQrEl.setAttribute("aria-labelledby", "stQrT");
    stQrEl.innerHTML = '<div class="stqrbox"><h3 id="stQrT"></h3><div id="stQrImg"></div><p class="stqrhint" id="stQrHint"></p>' +
      '<div class="stqrbtns"><button type="button" class="stqrdl" id="stQrDl"></button><button type="button" class="stqrx" id="stQrX"></button></div></div>';
    stEl.appendChild(stQrEl);
    stQrEl.addEventListener("click", e => { if (e.target === stQrEl || e.target.id === "stQrX"){ stQrEl.hidden = true; $("stQr").focus(); } });
    stQrEl.addEventListener("keydown", e => { if (e.key === "Escape"){ e.stopPropagation(); stQrEl.hidden = true; $("stQr").focus(); } });
    $("stQrDl").addEventListener("click", () => {
      const it2 = cardItem(stId);
      if (!it2) return;
      stQrCanvas(stId, cname(it2)).toBlob(b => {
        if (!b) return;
        const a = document.createElement("a"), u = URL.createObjectURL(b);
        a.href = u; a.download = "QR-mechty-" + stId.replace(/[^\w-]/g, "") + ".png";   // латиницей — кириллицу в имени файла теряют некоторые браузеры
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
      }, "image/png");
    });
  }
  $("stQrT").textContent = su("qrTitle") + " · " + cname(it);
  $("stQrHint").textContent = su("qrHint");
  $("stQrDl").textContent = su("dl"); $("stQrX").textContent = su("close");
  const c = stQrCanvas(stId, cname(it));
  c.setAttribute("role", "img"); c.setAttribute("aria-label", su("qrTitle") + " — " + cname(it));
  $("stQrImg").replaceChildren(c);
  stQrEl.hidden = false;
  $("stQrDl").focus();
}

/* плитки меню: «Узнать больше» и фото */
$("mout").addEventListener("click", e => {
  const b = e.target.closest("[data-more]");
  if (!b) return;
  e.preventDefault(); buzz(8);
  storyGo(b.dataset.more, b.closest(".mtile") || b);
});

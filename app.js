// Cantoral de Torá - Main Application Logic
// Orchestrates Hebcal and Sefaria APIs, Aliyot filtering, Hebrew phonetics generation,
// Aliyah blessings practice, and the interactive trope chanting player.

const App = {
    // Current application state
    state: {
        activeMode: 'list', // 'list' or 'date'
        currentParasha: null,
        currentAliyah: '1',
        fontSizeHebrew: 26, // default font size in pixels
        isPlaying: false,
        playQueue: [],
        playIndex: 0,
        playTimeout: null,
        playbackSpeed: 1.0,
        isLooping: false,
        fetchedData: null, // stores dynamic API downloads
        practiceProgress: {},
        currentPracticeKey: null,
        currentVerseCount: 0,
        blessingTimeouts: [],
        viewMode: 'parallel', // 'parallel' or 'verse'
        activeVerseIndex: 0,
        activeHebrewList: [],
        activePhoneticsList: [],
        activeTranslationList: [],
        audioMode: 'hebrew' // 'trope', 'hebrew' or 'spanish'
    },

    // 54 Parashot catalog indexed by book
    parashotCatalog: {
        bereshit: [
            { id: 'Bereshit', name: 'Bereshít', hebrew: 'בְּרֵאשִׁית', ref: 'Genesis.1.1-6.8', desc: 'La creación del universo, Adán y Eva, Caín y Abel, y el diluvio.' },
            { id: 'Noach', name: 'Nóaj', hebrew: 'נֹחַ', ref: 'Genesis.6.9-11.32', desc: 'El Arca de Noé, el diluvio, el arcoíris y la Torre de Babel.' },
            { id: 'Lech-Lecha', name: 'Lej Lejá', hebrew: 'לֶךְ-לְכָא', ref: 'Genesis.12.1-17.27', desc: 'El llamado a Abraham, su viaje a Canaán y el pacto de la circuncisión.' },
            { id: 'Vayera', name: 'Vayerá', hebrew: 'וַיֵּרָא', ref: 'Genesis.18.1-22.24', desc: 'La destrucción de Sodoma, el nacimiento de Isaac y la atadura de Isaac.' },
            { id: 'Chayei Sara', name: 'Jayéi Sará', hebrew: 'חַיֵּי שָׂרָה', ref: 'Genesis.23.1-25.18', desc: 'La muerte de Sara, la búsqueda de Rebeca y el matrimonio de Isaac.' },
            { id: 'Toldot', name: 'Toldót', hebrew: 'תּוֹלְדֹת', ref: 'Genesis.25.19-28.9', desc: 'El nacimiento de Jacob y Esaú, y la venta de la primogenitura.' },
            { id: 'Vayetzei', name: 'Vayetzéi', hebrew: 'וַיֵּצֵא', ref: 'Genesis.28.10-32.3', desc: 'El sueño de la escalera de Jacob, sus bodas con Lea y Raquel.' },
            { id: 'Vayishlach', name: 'Vayishláj', hebrew: 'וַיִּשְׁלַח', ref: 'Genesis.32.4-36.43', desc: 'El reencuentro de Jacob con Esaú, la lucha con el ángel y el cambio a Israel.' },
            { id: 'Vayeshev', name: 'Vayéshev', hebrew: 'וַיֵּשֶׁב', ref: 'Genesis.37.1-40.23', desc: 'José y su túnica de colores, su venta a Egipto e interpretación de sueños.' },
            { id: 'Miketz', name: 'Mikétz', hebrew: 'מִקֵּץ', ref: 'Genesis.41.1-44.17', desc: 'José interpreta el sueño del Faraón y es nombrado gobernador de Egipto.' },
            { id: 'Vayigash', name: 'Vayigásh', hebrew: 'וַיִּגַּשׁ', ref: 'Genesis.44.18-47.27', desc: 'José se revela a sus hermanos y la migración de Jacob a Egipto.' },
            { id: 'Vayechi', name: 'Vayejí', hebrew: 'וַיְחִי', ref: 'Genesis.47.28-50.26', desc: 'Las bendiciones finales de Jacob a sus hijos y el fallecimiento de José.' }
        ],
        shemot: [
            { id: 'Shemot', name: 'Shemót', hebrew: 'שְׁמוֹת', ref: 'Exodus.1.1-6.1', desc: 'La esclavitud en Egipto, el nacimiento de Moisés y la zarza ardiente.' },
            { id: 'Vaera', name: 'Vaerá', hebrew: 'וָאֵרָא', ref: 'Exodus.6.2-9.35', desc: 'Las primeras siete plagas de Egipto y el endurecimiento del Faraón.' },
            { id: 'Bo', name: 'Bo', hebrew: 'בֹּא', ref: 'Exodus.10.1-13.16', desc: 'Las últimas tres plagas, la cena de Pésaj y la salida de Egipto.' },
            { id: 'Beshalach', name: 'Beshaláj', hebrew: 'בְּשַׁלַּח', ref: 'Exodus.13.17-17.16', desc: 'La partición del Mar Rojo, el canto del mar, el Maná y la lucha con Amalec.' },
            { id: 'Yitro', name: 'Yitró', hebrew: 'יִתְרוֹ', ref: 'Exodus.18.1-20.23', desc: 'El consejo de Jetró sobre el sistema judicial y la entrega de los Diez Mandamientos.' },
            { id: 'Mishpatim', name: 'Mishpatím', hebrew: 'מִשְׁפָּטִים', ref: 'Exodus.21.1-24.18', desc: 'Leyes civiles, sociales y rituales detalladas del pueblo de Israel.' },
            { id: 'Terumah', name: 'Terumá', hebrew: 'תְּרוּמָה', ref: 'Exodus.25.1-27.19', desc: 'Instrucciones detalladas para la construcción del Tabernáculo (Mishkán).' },
            { id: 'Tetzaveh', name: 'Tetzavé', hebrew: 'תְּצַוֶּה', ref: 'Exodus.27.20-30.10', desc: 'Las vestiduras sacerdotales y la consagración de Aarón y sus hijos.' },
            { id: 'Ki Tisa', name: 'Ki Tisá', hebrew: 'כִּי תִשָּׂא', ref: 'Exodus.30.11-34.35', desc: 'El Censo, el Becerro de Oro, las segundas tablas y el rostro radiante de Moisés.' },
            { id: 'Vayakhel', name: 'Vayajél', hebrew: 'וַיַּקְהֵל', ref: 'Exodus.35.1-38.20', desc: 'El Shabat, la recolección de ofrendas y el inicio de la construcción del Mishkán.' },
            { id: 'Pekudei', name: 'Pekudéi', hebrew: 'פְקוּדֵי', ref: 'Exodus.38.21-40.38', desc: 'El inventario de materiales, el ensamblaje y la gloria de Dios llena el Mishkán.' }
        ],
        vayikra: [
            { id: 'Vayikra', name: 'Vayikrá', hebrew: 'וַיִּקְרָא', ref: 'Leviticus.1.1-5.26', desc: 'Leyes y procedimientos rituales para los diferentes tipos de sacrificios.' },
            { id: 'Tzav', name: 'Tzav', hebrew: 'צַו', ref: 'Leviticus.6.1-8.36', desc: 'Instrucciones para los sacerdotes y la unción formal de Aarón.' },
            { id: 'Shemini', name: 'Sheminí', hebrew: 'שְׁמִינִי', ref: 'Leviticus.9.1-11.47', desc: 'La inauguración del servicio, la tragedia de Nadab y Abihú y las leyes de Kashrut.' },
            { id: 'Tazria', name: 'Tazría', hebrew: 'תַזְרִיעַ', ref: 'Leviticus.12.1-13.59', desc: 'Leyes sobre impureza ritual tras el parto y diagnóstico de afecciones físicas.' },
            { id: 'Metzora', name: 'Metzorá', hebrew: 'מְצֹרָע', ref: 'Leviticus.14.1-15.33', desc: 'El proceso de purificación y leyes sobre flujos corporales.' },
            { id: 'Acharei Mot', name: 'Ajarei Mót', hebrew: 'אַחֲרֵי מוֹת', ref: 'Leviticus.16.1-18.30', desc: 'El servicio de Yom Kipur, la santidad de la sangre y leyes de relaciones.' },
            { id: 'Kedoshim', name: 'Kedoshím', hebrew: 'קְדֹשִׁים', ref: 'Leviticus.19.1-20.27', desc: 'El código de Santidad: "Amarás a tu prójimo como a ti mismo" y leyes morales.' },
            { id: 'Emor', name: 'Emór', hebrew: 'אֱמֹר', ref: 'Leviticus.21.1-24.23', desc: 'Reglas para sacerdotes, el calendario de las festividades y el candelabro.' },
            { id: 'Behar', name: 'Behár', hebrew: 'בְּהַר', ref: 'Leviticus.25.1-26.2', desc: 'Leyes del año sabático (Shemitá), el Jubileo y redención de tierras.' },
            { id: 'Bechukotai', name: 'Bejukotái', hebrew: 'בְּחֻקֹּתַי', ref: 'Leviticus.26.3-27.34', desc: 'Las bendiciones por la obediencia, advertencias por desobediencia y diezmos.' }
        ],
        bamidbar: [
            { id: 'Bamidbar', name: 'Bamidbár', hebrew: 'בְּמִדְבַּר', ref: 'Numbers.1.1-4.20', desc: 'El censo de las tribus de Israel en el desierto del Sinaí.' },
            { id: 'Nasso', name: 'Nassó', hebrew: 'נָשֹׂא', ref: 'Numbers.4.21-7.89', desc: 'Leyes del Nazareo, la bendición sacerdotal y ofrendas de los príncipes.' },
            { id: 'Beha\'alotcha', name: 'Beha\'alotjá', hebrew: 'בְּהַעֲלֹתְךָ', ref: 'Numbers.8.1-12.16', desc: 'El encendido de la Menorá, la queja de las codornices y la lepra de Miriam.' },
            { id: 'Sh\'lach', name: 'Sheláj', hebrew: 'שְׁלַח-לְךָ', ref: 'Numbers.13.1-15.41', desc: 'El envío de los doce espías a Canaán, el reporte negativo y el castigo de 40 años.' },
            { id: 'Korach', name: 'Kóraj', hebrew: 'קֹרַח', ref: 'Numbers.16.1-18.32', desc: 'La rebelión de Coré contra Moisés y Aarón y la vara floreciente.' },
            { id: 'Chukat', name: 'Jukat', hebrew: 'חֻקַּת', ref: 'Numbers.19.1-22.1', desc: 'El ritual de la vaca roja, la muerte de Miriam y Aarón y Moisés golpeando la roca.' },
            { id: 'Balak', name: 'Balák', hebrew: 'בָּלָק', ref: 'Numbers.22.2-25.9', desc: 'El rey Balac contrata al profeta Balaam para maldecir a Israel; el asna que habla.' },
            { id: 'Pinchas', name: 'Pinjás', hebrew: 'פִּנְחָס', ref: 'Numbers.25.10-30.1', desc: 'El celo de Pinjás, el nuevo censo y las leyes de herencia (hijas de Zelofejad).' },
            { id: 'Matot', name: 'Matót', hebrew: 'מַטּוֹת', ref: 'Numbers.30.2-32.42', desc: 'Leyes sobre promesas y votos, la campaña contra Madián y asignación transjordana.' },
            { id: 'Masei', name: 'Maseí', hebrew: 'מַסְעֵי', ref: 'Numbers.33.1-36.13', desc: 'El itinerario de las jornadas del desierto, fronteras de Canaán y ciudades de refugio.' }
        ],
        devarim: [
            { id: 'Devarim', name: 'Devarím', hebrew: 'דְּבָרִים', ref: 'Deuteronomy.1.1-3.22', desc: 'El primer discurso de Moisés repasando el viaje y las lecciones aprendidas.' },
            { id: 'Va\'etchanan', name: 'Vaetjanán', hebrew: 'וָאֶתְחַנַּן', ref: 'Deuteronomy.3.23-7.11', desc: 'El ruego de Moisés, repetición de los Diez Mandamientos y primer párrafo del Shemá.' },
            { id: 'Eikev', name: 'Eikév', hebrew: 'עֵקֶב', ref: 'Deuteronomy.7.12-11.25', desc: 'La recompensa por guardar los pactos, el recuerdo del maná y el segundo párrafo del Shemá.' },
            { id: 'Re\'eh', name: 'Reé', hebrew: 'רְאֵה', ref: 'Deuteronomy.11.26-16.17', desc: 'La bendición y la maldición, centralización del culto y las leyes de Kashrut.' },
            { id: 'Shoftim', name: 'Shoftím', hebrew: 'שֹׁפְטִים', ref: 'Deuteronomy.16.18-21.9', desc: 'Leyes sobre el establecimiento de jueces, reyes, sacerdotes y reglas de guerra.' },
            { id: 'Ki Teitzei', name: 'Ki Teitzéi', hebrew: 'כִּי-תֵצֵא', ref: 'Deuteronomy.21.10-25.19', desc: 'Leyes sociales y familiares diversas y el mandato de recordar a Amalec.' },
            { id: 'Ki Tavo', name: 'Ki Tavó', hebrew: 'כִּי-תָבוֹא', ref: 'Deuteronomy.26.1-29.8', desc: 'La ofrenda de primicias, las bendiciones del monte Gerizim y maldiciones del monte Ebal.' },
            { id: 'Nitzavim', name: 'Nitzavím', hebrew: 'נִצָּבִים', ref: 'Deuteronomy.29.9-30.20', desc: 'El pacto solemne, el arrepentimiento y la libre elección: "He puesto ante ti la vida y la muerte".' },
            { id: 'Vayeilech', name: 'Vayélej', hebrew: 'וַיֵּלֶךְ', ref: 'Deuteronomy.31.1-31.30', desc: 'Moisés nombra a Josué como sucesor y escribe el libro de la Ley.' },
            { id: 'Ha\'azinu', name: 'Haazínu', hebrew: 'הַאֲזִינוּ', ref: 'Deuteronomy.32.1-32.52', desc: 'El cántico poético profético de Moisés llamando a los cielos y tierra como testigos.' },
            { id: 'V\'Zot HaBerachah', name: 'Vezót Haberajá', hebrew: 'וְזֹאת הַבְּרָכָה', ref: 'Deuteronomy.33.1-34.12', desc: 'Las bendiciones finales de Moisés a las tribus, su fallecimiento en el Monte Nebo y duelo.' }
        ]
    },

    // Static database of aliyot boundaries for all 54 portions
    leyningDatabase: {
  "Bereshit": {
    "1": "Genesis 1:1-2:3",
    "2": "Genesis 2:4-2:19",
    "3": "Genesis 2:20-3:21",
    "4": "Genesis 3:22-4:18",
    "5": "Genesis 4:19-4:22",
    "6": "Genesis 4:23-5:24",
    "7": "Genesis 5:25-6:8",
    "M": "Genesis 6:5-6:8"
  },
  "Noach": {
    "1": "Genesis 6:9-6:22",
    "2": "Genesis 7:1-7:16",
    "3": "Genesis 7:17-8:14",
    "4": "Genesis 8:15-9:7",
    "5": "Genesis 9:8-9:17",
    "6": "Genesis 9:18-10:32",
    "7": "Genesis 11:1-11:32",
    "M": "Genesis 11:29-11:32"
  },
  "Lech-Lecha": {
    "1": "Genesis 12:1-12:13",
    "2": "Genesis 12:14-13:4",
    "3": "Genesis 13:5-13:18",
    "4": "Genesis 14:1-14:20",
    "5": "Genesis 14:21-15:6",
    "6": "Genesis 15:7-17:6",
    "7": "Genesis 17:7-17:27",
    "M": "Genesis 17:24-17:27"
  },
  "Vayera": {
    "1": "Genesis 18:1-18:14",
    "2": "Genesis 18:15-18:33",
    "3": "Genesis 19:1-19:20",
    "4": "Genesis 19:21-21:4",
    "5": "Genesis 21:5-21:21",
    "6": "Genesis 21:22-21:34",
    "7": "Genesis 22:1-22:24",
    "M": "Genesis 22:20-22:24"
  },
  "Chayei Sara": {
    "1": "Genesis 23:1-23:16",
    "2": "Genesis 23:17-24:9",
    "3": "Genesis 24:10-24:26",
    "4": "Genesis 24:27-24:52",
    "5": "Genesis 24:53-24:67",
    "6": "Genesis 25:1-25:11",
    "7": "Genesis 25:12-25:18",
    "M": "Genesis 25:16-25:18"
  },
  "Toldot": {
    "1": "Genesis 25:19-26:5",
    "2": "Genesis 26:6-26:12",
    "3": "Genesis 26:13-26:22",
    "4": "Genesis 26:23-26:29",
    "5": "Genesis 26:30-27:27",
    "6": "Genesis 27:28-28:4",
    "7": "Genesis 28:5-28:9",
    "M": "Genesis 28:7-28:9"
  },
  "Vayetzei": {
    "1": "Genesis 28:10-28:22",
    "2": "Genesis 29:1-29:17",
    "3": "Genesis 29:18-30:13",
    "4": "Genesis 30:14-30:27",
    "5": "Genesis 30:28-31:16",
    "6": "Genesis 31:17-31:42",
    "7": "Genesis 31:43-32:3",
    "M": "Genesis 32:1-32:3"
  },
  "Vayishlach": {
    "1": "Genesis 32:4-32:13",
    "2": "Genesis 32:14-32:30",
    "3": "Genesis 32:31-33:5",
    "4": "Genesis 33:6-33:20",
    "5": "Genesis 34:1-35:11",
    "6": "Genesis 35:12-36:19",
    "7": "Genesis 36:20-36:43",
    "M": "Genesis 36:40-36:43"
  },
  "Vayeshev": {
    "1": "Genesis 37:1-37:11",
    "2": "Genesis 37:12-37:22",
    "3": "Genesis 37:23-37:36",
    "4": "Genesis 38:1-38:30",
    "5": "Genesis 39:1-39:6",
    "6": "Genesis 39:7-39:23",
    "7": "Genesis 40:1-40:23",
    "M": "Genesis 40:20-40:23"
  },
  "Miketz": {
    "1": "Genesis 41:1-41:14",
    "2": "Genesis 41:15-41:38",
    "3": "Genesis 41:39-41:52",
    "4": "Genesis 41:53-42:18",
    "5": "Genesis 42:19-43:15",
    "6": "Genesis 43:16-43:29",
    "7": "Genesis 43:30-44:17",
    "M": "Genesis 44:14-44:17"
  },
  "Vayigash": {
    "1": "Genesis 44:18-44:30",
    "2": "Genesis 44:31-45:7",
    "3": "Genesis 45:8-45:18",
    "4": "Genesis 45:19-45:27",
    "5": "Genesis 45:28-46:27",
    "6": "Genesis 46:28-47:10",
    "7": "Genesis 47:11-47:27",
    "M": "Genesis 47:25-47:27"
  },
  "Vayechi": {
    "1": "Genesis 47:28-48:9",
    "2": "Genesis 48:10-48:16",
    "3": "Genesis 48:17-48:22",
    "4": "Genesis 49:1-49:18",
    "5": "Genesis 49:19-49:26",
    "6": "Genesis 49:27-50:20",
    "7": "Genesis 50:21-50:26",
    "M": "Genesis 50:23-50:26"
  },
  "Shemot": {
    "1": "Exodus 1:1-1:17",
    "2": "Exodus 1:18-2:10",
    "3": "Exodus 2:11-2:25",
    "4": "Exodus 3:1-3:15",
    "5": "Exodus 3:16-4:17",
    "6": "Exodus 4:18-4:31",
    "7": "Exodus 5:1-6:1",
    "M": "Exodus 5:22-6:1"
  },
  "Vaera": {
    "1": "Exodus 6:2-6:13",
    "2": "Exodus 6:14-6:28",
    "3": "Exodus 6:29-7:7",
    "4": "Exodus 7:8-8:6",
    "5": "Exodus 8:7-8:18",
    "6": "Exodus 8:19-9:16",
    "7": "Exodus 9:17-9:35",
    "M": "Exodus 9:33-9:35"
  },
  "Bo": {
    "1": "Exodus 10:1-10:11",
    "2": "Exodus 10:12-10:23",
    "3": "Exodus 10:24-11:3",
    "4": "Exodus 11:4-12:20",
    "5": "Exodus 12:21-12:28",
    "6": "Exodus 12:29-12:51",
    "7": "Exodus 13:1-13:16",
    "M": "Exodus 13:14-13:16"
  },
  "Beshalach": {
    "1": "Exodus 13:17-14:8",
    "2": "Exodus 14:9-14:14",
    "3": "Exodus 14:15-14:25",
    "4": "Exodus 14:26-15:26",
    "5": "Exodus 15:27-16:10",
    "6": "Exodus 16:11-16:36",
    "7": "Exodus 17:1-17:16",
    "M": "Exodus 17:14-17:16"
  },
  "Yitro": {
    "1": "Exodus 18:1-18:12",
    "2": "Exodus 18:13-18:23",
    "3": "Exodus 18:24-18:27",
    "4": "Exodus 19:1-19:6",
    "5": "Exodus 19:7-19:19",
    "6": "Exodus 19:20-20:14",
    "7": "Exodus 20:15-20:23",
    "M": "Exodus 20:19-20:23"
  },
  "Mishpatim": {
    "1": "Exodus 21:1-21:19",
    "2": "Exodus 21:20-22:3",
    "3": "Exodus 22:4-22:26",
    "4": "Exodus 22:27-23:5",
    "5": "Exodus 23:6-23:19",
    "6": "Exodus 23:20-23:25",
    "7": "Exodus 23:26-24:18",
    "M": "Exodus 24:15-24:18"
  },
  "Terumah": {
    "1": "Exodus 25:1-25:16",
    "2": "Exodus 25:17-25:40",
    "3": "Exodus 26:1-26:14",
    "4": "Exodus 26:15-26:30",
    "5": "Exodus 26:31-26:37",
    "6": "Exodus 27:1-27:8",
    "7": "Exodus 27:9-27:19",
    "M": "Exodus 27:17-27:19"
  },
  "Tetzaveh": {
    "1": "Exodus 27:20-28:12",
    "2": "Exodus 28:13-28:30",
    "3": "Exodus 28:31-28:43",
    "4": "Exodus 29:1-29:18",
    "5": "Exodus 29:19-29:37",
    "6": "Exodus 29:38-29:46",
    "7": "Exodus 30:1-30:10",
    "M": "Exodus 30:8-30:10"
  },
  "Ki Tisa": {
    "1": "Exodus 30:11-31:17",
    "2": "Exodus 31:18-33:11",
    "3": "Exodus 33:12-33:16",
    "4": "Exodus 33:17-33:23",
    "5": "Exodus 34:1-34:9",
    "6": "Exodus 34:10-34:26",
    "7": "Exodus 34:27-34:35",
    "M": "Exodus 34:33-34:35"
  },
  "Vayakhel": {
    "1": "Exodus 35:1-35:20",
    "2": "Exodus 35:21-35:29",
    "3": "Exodus 35:30-36:7",
    "4": "Exodus 36:8-36:19",
    "5": "Exodus 36:20-37:16",
    "6": "Exodus 37:17-37:29",
    "7": "Exodus 38:1-38:20",
    "M": "Exodus 38:18-38:20"
  },
  "Pekudei": {
    "1": "Exodus 38:21-39:1",
    "2": "Exodus 39:2-39:21",
    "3": "Exodus 39:22-39:32",
    "4": "Exodus 39:33-39:43",
    "5": "Exodus 40:1-40:16",
    "6": "Exodus 40:17-40:27",
    "7": "Exodus 40:28-40:38",
    "M": "Exodus 40:34-40:38"
  },
  "Vayikra": {
    "1": "Leviticus 1:1-1:13",
    "2": "Leviticus 1:14-2:6",
    "3": "Leviticus 2:7-2:16",
    "4": "Leviticus 3:1-3:17",
    "5": "Leviticus 4:1-4:26",
    "6": "Leviticus 4:27-5:10",
    "7": "Leviticus 5:11-5:26",
    "M": "Leviticus 5:24-5:26"
  },
  "Tzav": {
    "1": "Leviticus 6:1-6:11",
    "2": "Leviticus 6:12-7:10",
    "3": "Leviticus 7:11-7:38",
    "4": "Leviticus 8:1-8:13",
    "5": "Leviticus 8:14-8:21",
    "6": "Leviticus 8:22-8:29",
    "7": "Leviticus 8:30-8:36",
    "M": "Leviticus 8:33-8:36"
  },
  "Shemini": {
    "1": "Leviticus 9:1-9:16",
    "2": "Leviticus 9:17-9:23",
    "3": "Leviticus 9:24-10:11",
    "4": "Leviticus 10:12-10:15",
    "5": "Leviticus 10:16-10:20",
    "6": "Leviticus 11:1-11:32",
    "7": "Leviticus 11:33-11:47",
    "M": "Leviticus 11:45-11:47"
  },
  "Tazria": {
    "1": "Leviticus 12:1-13:5",
    "2": "Leviticus 13:6-13:17",
    "3": "Leviticus 13:18-13:23",
    "4": "Leviticus 13:24-13:28",
    "5": "Leviticus 13:29-13:39",
    "6": "Leviticus 13:40-13:54",
    "7": "Leviticus 13:55-13:59",
    "M": "Leviticus 13:57-13:59"
  },
  "Metzora": {
    "1": "Leviticus 14:1-14:12",
    "2": "Leviticus 14:13-14:20",
    "3": "Leviticus 14:21-14:32",
    "4": "Leviticus 14:33-14:53",
    "5": "Leviticus 14:54-15:15",
    "6": "Leviticus 15:16-15:28",
    "7": "Leviticus 15:29-15:33",
    "M": "Leviticus 15:31-15:33"
  },
  "Acharei Mot": {
    "1": "Leviticus 16:1-16:17",
    "2": "Leviticus 16:18-16:24",
    "3": "Leviticus 16:25-16:34",
    "4": "Leviticus 17:1-17:7",
    "5": "Leviticus 17:8-18:5",
    "6": "Leviticus 18:6-18:21",
    "7": "Leviticus 18:22-18:30",
    "M": "Leviticus 18:28-18:30"
  },
  "Kedoshim": {
    "1": "Leviticus 19:1-19:14",
    "2": "Leviticus 19:15-19:22",
    "3": "Leviticus 19:23-19:32",
    "4": "Leviticus 19:33-19:37",
    "5": "Leviticus 20:1-20:7",
    "6": "Leviticus 20:8-20:22",
    "7": "Leviticus 20:23-20:27",
    "M": "Leviticus 20:25-20:27"
  },
  "Emor": {
    "1": "Leviticus 21:1-21:15",
    "2": "Leviticus 21:16-22:16",
    "3": "Leviticus 22:17-22:33",
    "4": "Leviticus 23:1-23:22",
    "5": "Leviticus 23:23-23:32",
    "6": "Leviticus 23:33-23:44",
    "7": "Leviticus 24:1-24:23",
    "M": "Leviticus 24:21-24:23"
  },
  "Behar": {
    "1": "Leviticus 25:1-25:13",
    "2": "Leviticus 25:14-25:18",
    "3": "Leviticus 25:19-25:24",
    "4": "Leviticus 25:25-25:28",
    "5": "Leviticus 25:29-25:38",
    "6": "Leviticus 25:39-25:46",
    "7": "Leviticus 25:47-26:2",
    "M": "Leviticus 25:55-26:2"
  },
  "Bechukotai": {
    "1": "Leviticus 26:3-26:5",
    "2": "Leviticus 26:6-26:9",
    "3": "Leviticus 26:10-26:46",
    "4": "Leviticus 27:1-27:15",
    "5": "Leviticus 27:16-27:21",
    "6": "Leviticus 27:22-27:28",
    "7": "Leviticus 27:29-27:34",
    "M": "Leviticus 27:32-27:34"
  },
  "Bamidbar": {
    "1": "Numbers 1:1-1:19",
    "2": "Numbers 1:20-1:54",
    "3": "Numbers 2:1-2:34",
    "4": "Numbers 3:1-3:13",
    "5": "Numbers 3:14-3:39",
    "6": "Numbers 3:40-3:51",
    "7": "Numbers 4:1-4:20",
    "M": "Numbers 4:17-4:20"
  },
  "Nasso": {
    "1": "Numbers 4:21-4:37",
    "2": "Numbers 4:38-4:49",
    "3": "Numbers 5:1-5:10",
    "4": "Numbers 5:11-6:27",
    "5": "Numbers 7:1-7:41",
    "6": "Numbers 7:42-7:71",
    "7": "Numbers 7:72-7:89",
    "M": "Numbers 7:87-7:89"
  },
  "Beha'alotcha": {
    "1": "Numbers 8:1-8:14",
    "2": "Numbers 8:15-8:26",
    "3": "Numbers 9:1-9:14",
    "4": "Numbers 9:15-10:10",
    "5": "Numbers 10:11-10:34",
    "6": "Numbers 10:35-11:29",
    "7": "Numbers 11:30-12:16",
    "M": "Numbers 12:14-12:16"
  },
  "Sh'lach": {
    "1": "Numbers 13:1-13:20",
    "2": "Numbers 13:21-14:7",
    "3": "Numbers 14:8-14:25",
    "4": "Numbers 14:26-15:7",
    "5": "Numbers 15:8-15:16",
    "6": "Numbers 15:17-15:26",
    "7": "Numbers 15:27-15:41",
    "M": "Numbers 15:37-15:41"
  },
  "Korach": {
    "1": "Numbers 16:1-16:13",
    "2": "Numbers 16:14-16:19",
    "3": "Numbers 16:20-17:8",
    "4": "Numbers 17:9-17:15",
    "5": "Numbers 17:16-17:24",
    "6": "Numbers 17:25-18:20",
    "7": "Numbers 18:21-18:32",
    "M": "Numbers 18:30-18:32"
  },
  "Chukat": {
    "1": "Numbers 19:1-19:17",
    "2": "Numbers 19:18-20:6",
    "3": "Numbers 20:7-20:13",
    "4": "Numbers 20:14-20:21",
    "5": "Numbers 20:22-21:9",
    "6": "Numbers 21:10-21:20",
    "7": "Numbers 21:21-22:1",
    "M": "Numbers 21:34-22:1"
  },
  "Balak": {
    "1": "Numbers 22:2-22:12",
    "2": "Numbers 22:13-22:20",
    "3": "Numbers 22:21-22:38",
    "4": "Numbers 22:39-23:12",
    "5": "Numbers 23:13-23:26",
    "6": "Numbers 23:27-24:13",
    "7": "Numbers 24:14-25:9",
    "M": "Numbers 25:7-25:9"
  },
  "Pinchas": {
    "1": "Numbers 25:10-26:4",
    "2": "Numbers 26:5-26:51",
    "3": "Numbers 26:52-27:5",
    "4": "Numbers 27:6-27:23",
    "5": "Numbers 28:1-28:15",
    "6": "Numbers 28:16-29:11",
    "7": "Numbers 29:12-30:1",
    "M": "Numbers 29:35-30:1"
  },
  "Matot": {
    "1": "Numbers 30:2-30:17",
    "2": "Numbers 31:1-31:12",
    "3": "Numbers 31:13-31:24",
    "4": "Numbers 31:25-31:41",
    "5": "Numbers 31:42-31:54",
    "6": "Numbers 32:1-32:19",
    "7": "Numbers 32:20-32:42",
    "M": "Numbers 32:39-32:42"
  },
  "Masei": {
    "1": "Numbers 33:1-33:10",
    "2": "Numbers 33:11-33:49",
    "3": "Numbers 33:50-34:15",
    "4": "Numbers 34:16-34:29",
    "5": "Numbers 35:1-35:8",
    "6": "Numbers 35:9-35:34",
    "7": "Numbers 36:1-36:13",
    "M": "Numbers 36:11-36:13"
  },
  "Devarim": {
    "1": "Deuteronomy 1:1-1:10",
    "2": "Deuteronomy 1:11-1:21",
    "3": "Deuteronomy 1:22-1:38",
    "4": "Deuteronomy 1:39-2:1",
    "5": "Deuteronomy 2:2-2:30",
    "6": "Deuteronomy 2:31-3:14",
    "7": "Deuteronomy 3:15-3:22",
    "M": "Deuteronomy 3:20-3:22"
  },
  "Va'etchanan": {
    "1": "Deuteronomy 3:23-4:4",
    "2": "Deuteronomy 4:5-4:40",
    "3": "Deuteronomy 4:41-4:49",
    "4": "Deuteronomy 5:1-5:18",
    "5": "Deuteronomy 5:19-6:3",
    "6": "Deuteronomy 6:4-6:25",
    "7": "Deuteronomy 7:1-7:11",
    "M": "Deuteronomy 7:9-7:11"
  },
  "Eikev": {
    "1": "Deuteronomy 7:12-8:10",
    "2": "Deuteronomy 8:11-9:3",
    "3": "Deuteronomy 9:4-9:29",
    "4": "Deuteronomy 10:1-10:11",
    "5": "Deuteronomy 10:12-11:9",
    "6": "Deuteronomy 11:10-11:21",
    "7": "Deuteronomy 11:22-11:25",
    "M": "Deuteronomy 11:22-11:25"
  },
  "Re'eh": {
    "1": "Deuteronomy 11:26-12:10",
    "2": "Deuteronomy 12:11-12:28",
    "3": "Deuteronomy 12:29-13:19",
    "4": "Deuteronomy 14:1-14:21",
    "5": "Deuteronomy 14:22-14:29",
    "6": "Deuteronomy 15:1-15:18",
    "7": "Deuteronomy 15:19-16:17",
    "M": "Deuteronomy 16:13-16:17"
  },
  "Shoftim": {
    "1": "Deuteronomy 16:18-17:13",
    "2": "Deuteronomy 17:14-17:20",
    "3": "Deuteronomy 18:1-18:5",
    "4": "Deuteronomy 18:6-18:13",
    "5": "Deuteronomy 18:14-19:13",
    "6": "Deuteronomy 19:14-20:9",
    "7": "Deuteronomy 20:10-21:9",
    "M": "Deuteronomy 21:7-21:9"
  },
  "Ki Teitzei": {
    "1": "Deuteronomy 21:10-21:21",
    "2": "Deuteronomy 21:22-22:7",
    "3": "Deuteronomy 22:8-23:7",
    "4": "Deuteronomy 23:8-23:24",
    "5": "Deuteronomy 23:25-24:4",
    "6": "Deuteronomy 24:5-24:13",
    "7": "Deuteronomy 24:14-25:19",
    "M": "Deuteronomy 25:17-25:19"
  },
  "Ki Tavo": {
    "1": "Deuteronomy 26:1-26:11",
    "2": "Deuteronomy 26:12-26:15",
    "3": "Deuteronomy 26:16-26:19",
    "4": "Deuteronomy 27:1-27:10",
    "5": "Deuteronomy 27:11-28:6",
    "6": "Deuteronomy 28:7-28:69",
    "7": "Deuteronomy 29:1-29:8",
    "M": "Deuteronomy 29:6-29:8"
  },
  "Nitzavim": {
    "1": "Deuteronomy 29:9-29:11",
    "2": "Deuteronomy 29:12-29:14",
    "3": "Deuteronomy 29:15-29:28",
    "4": "Deuteronomy 30:1-30:6",
    "5": "Deuteronomy 30:7-30:10",
    "6": "Deuteronomy 30:11-30:14",
    "7": "Deuteronomy 30:15-30:20",
    "M": "Deuteronomy 30:15-30:20"
  },
  "Vayeilech": {
    "1": "Deuteronomy 31:1-31:3",
    "2": "Deuteronomy 31:4-31:6",
    "3": "Deuteronomy 31:7-31:9",
    "4": "Deuteronomy 31:10-31:13",
    "5": "Deuteronomy 31:14-31:19",
    "6": "Deuteronomy 31:20-31:24",
    "7": "Deuteronomy 31:25-31:30",
    "M": "Deuteronomy 31:28-31:30"
  },
  "Ha'azinu": {
    "1": "Deuteronomy 32:1-32:6",
    "2": "Deuteronomy 32:7-32:12",
    "3": "Deuteronomy 32:13-32:18",
    "4": "Deuteronomy 32:19-32:28",
    "5": "Deuteronomy 32:29-32:39",
    "6": "Deuteronomy 32:40-32:43",
    "7": "Deuteronomy 32:44-32:52",
    "M": "Deuteronomy 32:48-32:52"
  },
  "V'Zot HaBerachah": {
    "1": "Deuteronomy 33:1-33:7",
    "2": "Deuteronomy 33:8-33:12",
    "3": "Deuteronomy 33:13-33:17",
    "4": "Deuteronomy 33:18-33:21",
    "5": "Deuteronomy 33:22-33:26",
    "6": "Deuteronomy 33:27-33:29",
    "7": "Deuteronomy 34:1-34:12"
  }
},

    // Hybrid Offline Database - pre-populated high-fidelity, hand-polished portion: Bereshit (1st Aliyah, Creation)
    localDatabase: {
        'Bereshit': {
            '1': { // 1st Aliyah (Genesis 1:1 - 1:8)
                hebrew: [
                    "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃",
                    "וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְה֑וֹם וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃",
                    "וַיֹּ֥אמֶר אֱלֹהִ֖ים יְהִ֣י א֑וֹר וַֽיְהִי־אֽוֹר׃",
                    "וַיַּרְא אֱלֹהִ֥ים אֶת־הָא֖וֹר כִּי־ט֑וֹב וַיַּבְדֵּ֣ל אֱלֹהִ֔ים בֵּ֥ין הָא֖וֹר וּבֵ֥ין הַחֹֽשֶׁךְ׃",
                    "וַיִּקְרָ֨א אֱלֹהִ֤ים ׀ לָאוֹר֙ י֔וֹם וְלַחֹ֖שֶׁךְ קָ֣רָא לָ֑יְלָה וַֽיְהִי־עֶ֥רֶב וַֽיְהִי־בֹ֖קֶר י֥וֹם אֶחָֽד׃ פ",
                    "וַיֹּ֣אמֶר אֱלֹהִ֔ים יְהִ֥י רָקִ֖יעַ בְּת֣וֹךְ הַמָּ֑יִם וִיהִ֣י מַבְדִּ֔יל בֵּ֥ין מַ֖יִם לָמָּֽיִם׃",
                    "וַיַּ֣עַשׂ אֱלֹהִים֮ אֶת־הָרָקִיעַ֒ וַיַּבְדֵּ֗ל בֵּ֤ין הַמַּ֙יִם֙ אֲשֶׁר֙ מִתַּ֣חַת לָרָקִ֔יעַ וּבֵ֣ין הַמַּ֔יִם אֲשֶׁ֖ר מֵעַ֣ל לָרָקִ֑יעַ וַֽיְהִי־כֵֽן׃",
                    "וַיִּקְרָ֨א אֱלֹהִ֥ים לָרָקִ֖יעַ שָׁמָ֑יִם וַֽיְהִי־עֶ֥רֶב וַֽיְהִי־בֹ֖קֶר י֥וֹם שֵׁנִֽי׃ פ"
                ],
                phonetics: [
                    "Bereshít bará Elohím et hashamáyim ve'ét ha'áretz.",
                    "Veha'áretz hayetá tóhu vavóhu vejóshej al-penéi tehóm verúaj Elohím merajéfet al-penéi hamáyim.",
                    "Vayómer Elohím yehí-or vayehí-or.",
                    "Vayar Elohím et-ha'ór ki-tov vayavdél Elohím bein ha'ór uveín hajóshej.",
                    "Vayikrá Elohím la'ór yom velajóshej kará láyla vayehí-érev vayehí-vóker yom ejád.",
                    "Vayómer Elohím yehí rakía betój hamáyim vihí mavdíl bein máyim lamáyim.",
                    "Vayá'as Elohím et-harakía vayavdél bein hamáyim ashér mitájat larakía uveín hamáyim ashér me'ál larakía vayehí-jén.",
                    "Vayikrá Elohím larakía shamáyim vayehí-érev vayehí-vóker yom shení."
                ],
                translation: [
                    "En el principio creó Dios los cielos y la tierra.",
                    "Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo, y el Espíritu de Dios se movía sobre la faz de las aguas.",
                    "Y dijo Dios: Sea la luz; y fue la luz.",
                    "Y vio Dios que la luz era buena; y separó Dios la luz de las tinieblas.",
                    "Y llamó Dios a la luz Día, y a las tinieblas llamó Noche. Y fue la tarde y la mañana un día.",
                    "Y dijo Dios: Haya un firmamento en medio de las aguas, y separe las aguas de las aguas.",
                    "E hizo Dios el firmamento, y separó las aguas que estaban debajo del firmamento de las aguas que estaban sobre del firmamento. Y fue así.",
                    "Y llamó Dios al firmamento Cielos. Y fue la tarde y la mañana el segundo día."
                ]
            }
        }
    },

    // Initialization routine
    init() {
        this.loadPracticeProgress();
        this.populateDropdown();
        this.setupEventListeners();
        this.renderTropeGlossary();
        this.handleHashChange(); // Enrutar hash inicial si existe
        
        // Preload speech synthesis voices (fixes Chrome lazy loading)
        if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    },

    // Populate drop down with 54 parashot categories
    populateDropdown() {
        const groups = {
            bereshit: document.getElementById('groupBereshit'),
            shemot: document.getElementById('groupShemot'),
            vayikra: document.getElementById('groupVayikra'),
            bamidbar: document.getElementById('groupBamidbar'),
            devarim: document.getElementById('groupDevarim')
        };

        for (const [book, parashot] of Object.entries(this.parashotCatalog)) {
            const groupEl = groups[book];
            if (!groupEl) continue;
            
            parashot.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerHTML = `${p.name} (${p.hebrew})`;
                groupEl.appendChild(opt);
            });
        }
    },

    // Bind UI actions
    setupEventListeners() {
        // Tab switching logic
        document.getElementById('tabModeList').addEventListener('click', () => this.switchSearchMode('list'));
        document.getElementById('tabModeDate').addEventListener('click', () => this.switchSearchMode('date'));

        // View Mode Tab switching
        document.getElementById('viewTabParallel').addEventListener('click', () => this.switchViewMode('parallel'));
        document.getElementById('viewTabVerse').addEventListener('click', () => this.switchViewMode('verse'));

        // Flashcard controls
        document.getElementById('flashcardBtnPrev').addEventListener('click', () => this.goToPrevVerse());
        document.getElementById('flashcardBtnNext').addEventListener('click', () => this.goToNextVerse());
        document.getElementById('flashcardBtnPlay').addEventListener('click', () => this.toggleFlashcardPlayback());
        document.getElementById('flashcardBtnMark').addEventListener('click', () => this.toggleFlashcardMark());

        // Hotkeys & Gestures
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        this.setupSwipeGestures();

        // Hash change routing
        window.addEventListener('hashchange', () => this.handleHashChange());

        // Share button trigger
        document.getElementById('btnShareApp').addEventListener('click', () => this.shareActiveAliyah());

        // Parashah Dropdown selection trigger
        document.getElementById('selectParasha').addEventListener('change', (e) => {
            const parashaId = e.target.value;
            location.hash = `#${parashaId}/1`;
        });

        // Date search trigger
        document.getElementById('btnSearchByDate').addEventListener('click', () => this.searchParashaByDate());

        // Font scaling
        document.getElementById('btnFontIncrease').addEventListener('click', () => this.adjustFontSize(2));
        document.getElementById('btnFontDecrease').addEventListener('click', () => this.adjustFontSize(-2));

        // Glossary click toggle
        document.getElementById('btnToggleGlossary').addEventListener('click', () => {
            const el = document.getElementById('sectionTropeGlossary');
            el.classList.toggle('hidden');
            el.scrollIntoView({ behavior: 'smooth' });
        });

        // Blessings Accordion Toggle
        document.getElementById('blessingsToggle').addEventListener('click', () => {
            const body = document.getElementById('blessingsBody');
            const chevron = document.getElementById('blessingsChevron');
            if (body.style.display === 'block') {
                body.style.display = 'none';
                chevron.textContent = '+';
            } else {
                body.style.display = 'block';
                chevron.textContent = '−';
            }
        });

        // Aliyot Selector Chips
        const chips = document.getElementById('aliyahSelectorChips').children;
        Array.from(chips).forEach(chip => {
            chip.addEventListener('click', (e) => {
                const selected = e.target.closest('.aliyah-chip');
                if (!selected) return;

                const aliyah = selected.dataset.aliyah;
                if (this.state.currentParasha) {
                    location.hash = `#${this.state.currentParasha.id}/${aliyah}`;
                }
            });
        });

        // Custom player buttons
        document.getElementById('playerPlayPauseBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('playerSpeedBtn').addEventListener('click', () => this.changePlaybackSpeed());
        document.getElementById('playerLoopBtn').addEventListener('click', () => this.toggleLoop());
        document.getElementById('playerAudioModeSelect').addEventListener('change', (e) => {
            const mode = e.target.value;
            this.state.audioMode = mode;
            
            // Check voice compatibility for Hebrew
            if (mode === 'hebrew' && window.speechSynthesis) {
                const voices = window.speechSynthesis.getVoices();
                const heVoice = voices.find(v => v.lang.startsWith('he') || v.name.toLowerCase().includes('hebrew'));
                if (!heVoice && voices.length > 0) {
                    this.showNotification("Sin voz hebrea. Usando fonética en español...");
                    this.state.audioMode = 'spanish';
                    e.target.value = 'spanish';
                }
            } else if (mode === 'spanish' && window.speechSynthesis) {
                const voices = window.speechSynthesis.getVoices();
                const esVoice = voices.find(v => v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish'));
                if (!esVoice && voices.length > 0) {
                    this.showNotification("Sin voz en español. Reproduciendo solo tropos.");
                    this.state.audioMode = 'trope';
                    e.target.value = 'trope';
                }
            }
        });
        
        // Progress bar click scrubbing
        document.getElementById('playerProgressBar').addEventListener('click', (e) => this.scrubPlayer(e));

        document.getElementById('btnPracticePlay').addEventListener('click', () => this.playFirstPendingVerse());
        document.getElementById('btnPracticeMark').addEventListener('click', () => this.markCurrentVerseComplete());
        document.getElementById('btnPracticeReset').addEventListener('click', () => this.resetCurrentProgress());

        this.enhanceKeyboardAccess();
    },

    enhanceKeyboardAccess() {
        const activateOnKeyboard = (el, callback) => {
            el.setAttribute('tabindex', '0');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    callback(e);
                }
            });
        };

        Array.from(document.getElementById('aliyahSelectorChips').children).forEach(chip => {
            chip.setAttribute('role', 'tab');
            chip.setAttribute('aria-selected', chip.classList.contains('active') ? 'true' : 'false');
            activateOnKeyboard(chip, () => chip.click());
        });

        const speedBtn = document.getElementById('playerSpeedBtn');
        speedBtn.setAttribute('role', 'button');
        speedBtn.setAttribute('tabindex', '0');
        speedBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.changePlaybackSpeed();
            }
        });
    },

    loadPracticeProgress() {
        try {
            const raw = localStorage.getItem('cantoralPracticeProgress');
            this.state.practiceProgress = raw ? JSON.parse(raw) : {};
        } catch (err) {
            this.state.practiceProgress = {};
        }
    },

    savePracticeProgress() {
        try {
            localStorage.setItem('cantoralPracticeProgress', JSON.stringify(this.state.practiceProgress));
        } catch (err) {
            console.warn('Practice progress could not be saved:', err);
        }
    },

    getPracticeKey() {
        if (!this.state.currentParasha) return null;
        return `${this.state.currentParasha.id}:${this.state.currentAliyah}`;
    },

    getCompletedSet() {
        const key = this.state.currentPracticeKey;
        return new Set(key && this.state.practiceProgress[key] ? this.state.practiceProgress[key] : []);
    },

    updatePracticePanel() {
        const key = this.state.currentPracticeKey;
        const total = this.state.currentVerseCount;
        const completed = this.getCompletedSet();
        const done = Math.min(completed.size, total);
        const pct = total ? Math.round((done / total) * 100) : 0;
        const parasha = this.state.currentParasha;
        const aliyah = this.state.currentAliyah === 'maftir' ? 'Maftir' : `Aliya ${this.state.currentAliyah}`;

        document.getElementById('practiceProgressText').textContent = `${done} de ${total} versiculos marcados`;
        document.getElementById('practiceMeterFill').style.width = `${pct}%`;
        document.getElementById('practiceTitle').textContent = parasha
            ? `${parasha.name} - ${aliyah}: ${pct}% listo`
            : 'Elige una lectura para empezar';

        document.querySelectorAll('.verse-row').forEach(row => {
            const idx = Number(row.dataset.verseIndex);
            row.classList.toggle('completed', completed.has(idx));
        });

        document.querySelectorAll('.verse-complete-btn').forEach(btn => {
            const idx = Number(btn.dataset.verseIndex);
            const isDone = completed.has(idx);
            btn.textContent = isDone ? 'Marcado' : 'Marcar';
            btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
        });
    },

    toggleVerseComplete(index) {
        const key = this.state.currentPracticeKey;
        if (!key) return;

        const completed = this.getCompletedSet();
        if (completed.has(index)) {
            completed.delete(index);
        } else {
            completed.add(index);
        }

        this.state.practiceProgress[key] = Array.from(completed).sort((a, b) => a - b);
        this.savePracticeProgress();
        this.updatePracticePanel();
    },

    markCurrentVerseComplete() {
        if (!this.state.currentPracticeKey || this.state.currentVerseCount === 0) return;
        const index = Math.min(this.state.playIndex, this.state.currentVerseCount - 1);
        const completed = this.getCompletedSet();
        if (!completed.has(index)) {
            this.toggleVerseComplete(index);
        }
    },

    playFirstPendingVerse() {
        const total = this.state.currentVerseCount;
        if (!total) return;

        const completed = this.getCompletedSet();
        let firstPending = 0;
        for (let i = 0; i < total; i++) {
            if (!completed.has(i)) {
                firstPending = i;
                break;
            }
        }
        this.playFromVerse(firstPending);
    },

    resetCurrentProgress() {
        const key = this.state.currentPracticeKey;
        if (!key) return;
        delete this.state.practiceProgress[key];
        this.savePracticeProgress();
        this.updatePracticePanel();
    },

    // Swapping between list and birthdate mode
    switchSearchMode(mode) {
        this.state.activeMode = mode;
        
        const listBtn = document.getElementById('tabModeList');
        const dateBtn = document.getElementById('tabModeDate');
        const listDiv = document.getElementById('searchModeList');
        const dateDiv = document.getElementById('searchModeDate');

        if (mode === 'list') {
            listBtn.classList.add('active');
            dateBtn.classList.remove('active');
            listDiv.classList.remove('hidden');
            dateDiv.classList.add('hidden');
        } else {
            listBtn.classList.remove('active');
            dateBtn.classList.add('active');
            listDiv.classList.add('hidden');
            dateDiv.classList.remove('hidden');
        }
    },

    // Adjust font size dynamically
    adjustFontSize(delta) {
        this.state.fontSizeHebrew = Math.max(16, Math.min(50, this.state.fontSizeHebrew + delta));
        
        const rows = document.querySelectorAll('.column-hebrew');
        rows.forEach(r => {
            r.style.fontSize = `${this.state.fontSizeHebrew}px`;
            r.style.lineHeight = `${this.state.fontSizeHebrew * 1.7}px`;
        });
    },

    // Lookup date using Hebcal API
    async searchParashaByDate() {
        const inputDate = document.getElementById('inputBarMitzvahDate').value;
        if (!inputDate) {
            alert('Por favor, selecciona una fecha válida del calendario.');
            return;
        }

        // Calculate the Shabbat (Saturday) for that week
        const shabbatDate = this.getUpcomingSaturday(inputDate);
        
        // Show loader state
        document.getElementById('parashaBannerEmpty').classList.add('hidden');
        document.getElementById('parashaBannerContent').innerHTML = '<div class="loader"></div><p style="text-align:center;font-size:12px;color:var(--accent-gold);">Buscando el Shabat correspondiente en Hebcal...</p>';
        document.getElementById('parashaBannerContent').classList.remove('hidden');

        try {
            // Hebcal API Call: Fetch Shabbat events for that date
            const response = await fetch(`https://www.hebcal.com/hebcal?cfg=json&v=1&start=${shabbatDate}&end=${shabbatDate}&s=on`);
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                throw new Error('No se encontraron lecturas en la base de datos de Hebcal para esa fecha.');
            }

            // Look for the "parashat" event
            const parashaEvent = data.items.find(item => item.category === 'parashat');
            
            if (!parashaEvent) {
                // If it's a major holiday Shabbat, Hebcal might list it as holiday reading
                const holidayEvent = data.items.find(item => item.category === 'holiday');
                if (holidayEvent) {
                    alert(`El Shabat correspondiente a esa fecha (${shabbatDate}) coincidió con la festividad de: ${holidayEvent.title}. Cargaremos una lectura especial de la Torá.`);
                    this.loadHolidayReading(holidayEvent);
                    return;
                }
                throw new Error('Ese Shabat no coincide con una parashá regular (posiblemente una lectura de festividad especial).');
            }

            // Extract the English/Hebrew name of the Parashah
            // Title is typically "Parashat Bereshit"
            const title = parashaEvent.title;
            const parashaName = title.replace('Parashat ', '').trim();
            
            // Map the name to our internal catalog IDs (case insensitive check)
            let matchedId = null;
            let book = null;
            
            for (const [bKey, list] of Object.entries(this.parashotCatalog)) {
                const match = list.find(p => p.id.toLowerCase() === parashaName.toLowerCase() || p.name.toLowerCase() === parashaName.toLowerCase());
                if (match) {
                    matchedId = match.id;
                    book = bKey;
                    break;
                }
            }

            if (!matchedId) {
                // Sometimes double portions are returned, e.g. "Vayakhel-Pekudei".
                // Let's take the first name as a fallback.
                const firstPart = parashaName.split('-')[0].split(' ')[0];
                for (const [bKey, list] of Object.entries(this.parashotCatalog)) {
                    const match = list.find(p => p.id.toLowerCase().includes(firstPart.toLowerCase()));
                    if (match) {
                        matchedId = match.id;
                        book = bKey;
                        break;
                    }
                }
            }

            if (matchedId) {
                // Load it, preserving the Hebrew date
                this.loadParasha(matchedId, '1', parashaEvent.hebrew);
                
                // Select in dropdown too
                document.getElementById('selectParasha').value = matchedId;
            } else {
                throw new Error(`Parashá "${parashaName}" encontrada en Hebcal, pero no mapeada en el catálogo local.`);
            }

        } catch (error) {
            console.error('Error al buscar fecha:', error);
            document.getElementById('parashaBannerContent').innerHTML = `<p style="color:#ef4444;text-align:center;font-size:14px;">Error: ${error.message}<br>Intenta seleccionar la Parashá manualmente desde el menú desplegable.</p>`;
        }
    },

    // Holiday reading fallback handler
    loadHolidayReading(holidayEvent) {
        // Mock a parashah banner
        document.getElementById('parashaBannerEmpty').classList.add('hidden');
        const container = document.getElementById('parashaBannerContent');
        container.innerHTML = `
            <div class="parasha-title-hebrew">${holidayEvent.hebrew || 'חג'}</div>
            <div class="parasha-title-banner">${holidayEvent.title}</div>
            <div style="font-weight:600;color:var(--accent-gold);">Lectura Especial de Shabat</div>
            <p style="margin-top:10px;font-size:14px;color:var(--color-text-secondary);">
                Este Shabat coincide con una festividad. Haz clic abajo para estudiar la lectura sugerida.
            </p>
            <div class="parasha-meta-details">
                <div class="badge badge-gold">Leyning: ${holidayEvent.memo || 'Torah Portion'}</div>
            </div>
        `;
        container.classList.remove('hidden');
        
        // Hide Aliyot filters for complex holiday structures to avoid crashes, but load a dynamic Sefaria reading if possible
        if (holidayEvent.memo) {
            const cleanedMemo = holidayEvent.memo.split(';')[0].replace('Torah: ', '').trim();
            this.fetchAndDisplayDynamicSefariaText(cleanedMemo, holidayEvent.title);
        }
    },

    // Calculate Saturday date from any given input date string
    getUpcomingSaturday(dateStr) {
        // T12:00:00 avoids timezone jumps when initializing the date object in local browsers
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDay(); // 0 (Sun) - 6 (Sat)
        // If the date is already a Saturday, keep it. Otherwise advance to the next Saturday.
        if (day !== 6) {
            const diff = 6 - day;
            d.setDate(d.getDate() + diff);
        }
        
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    // Loading a chosen Parashah
    async loadParasha(parashaId, targetAliyah = '1', preserveHebrewDate = null) {
        this.stopAudio();
        
        // Find in catalog
        let parasha = null;
        for (const list of Object.values(this.parashotCatalog)) {
            const p = list.find(item => item.id === parashaId);
            if (p) {
                parasha = p;
                break;
            }
        }

        if (!parasha) return;
        this.state.currentParasha = parasha;
        this.state.currentAliyah = targetAliyah;

        // Update active chip state in selector UI
        const chips = document.getElementById('aliyahSelectorChips').children;
        Array.from(chips).forEach(c => {
            if (c.dataset.aliyah === targetAliyah) {
                c.classList.add('active');
                c.setAttribute('aria-selected', 'true');
            } else {
                c.classList.remove('active');
                c.setAttribute('aria-selected', 'false');
            }
        });

        // Reveal panels immediately
        document.getElementById('sectionAliyahSelector').classList.remove('hidden');
        document.getElementById('sectionBlessings').classList.remove('hidden');
        document.getElementById('sectionReadingBoard').classList.remove('hidden');

        // Update banner details instantly (no loader freeze!)
        const hebrewDateStr = preserveHebrewDate || 'Shabat Parashá';
        const bannerContent = document.getElementById('parashaBannerContent');
        document.getElementById('parashaBannerEmpty').classList.add('hidden');
        bannerContent.innerHTML = `
            <div class="parasha-title-hebrew" id="bannerHebrewName">${parasha.hebrew}</div>
            <div class="parasha-title-banner" id="bannerSpanishName">Parashat ${parasha.name}</div>
            <div id="bannerBookAndVerses" style="font-weight:600;color:var(--accent-gold);">${parasha.ref}</div>
            <p id="bannerSummary" style="margin-top:10px;font-size:14px;color:var(--color-text-secondary);">${parasha.desc}</p>
            <div class="parasha-meta-details">
                <div class="badge badge-gold">Tradición: Cantileo Ashkenazi</div>
                <div class="badge" id="bannerHebrewDate">Fecha Hebrea: ${hebrewDateStr}</div>
            </div>
        `;
        bannerContent.classList.remove('hidden');

        // Load the static text immediately using the offline database
        this.state.fetchedData = {
            parashaId: parashaId,
            leyning: this.leyningDatabase[parashaId] || this.generateFallbackLeyning(parasha),
            hebrewDate: hebrewDateStr
        };
        this.loadAliyahText();
    },

    // Background leyning fetch (non-blocking) - no-op, now using offline leyningDatabase
    fetchLeyningInBackground(parashaId) {
    },

    // Generates a smart fallback structure for Aliyot divisions
    generateFallbackLeyning(parasha) {
        const ref = parasha.ref;
        const parts = ref.split('-');
        const startPart = parts[0];
        const startSubparts = startPart.split('.');
        const bookName = startSubparts[0];
        const chapter = startSubparts[1] || '1';
        
        return {
            '1': `${bookName} ${chapter}:1-5`,
            '2': `${bookName} ${chapter}:6-10`,
            '3': `${bookName} ${chapter}:11-15`,
            '4': `${bookName} ${chapter}:16-20`,
            '5': `${bookName} ${chapter}:21-25`,
            '6': `${bookName} ${chapter}:26-30`,
            '7': `${bookName} ${chapter}:31-35`,
            'maftir': `${bookName} ${chapter}:36-40`
        };
    },

    // Loading specific Aliyah readings
    async loadAliyahText() {
        this.stopAudio();
        const parasha = this.state.currentParasha;
        const aliyah = this.state.currentAliyah;

        const boardTitle = document.getElementById('readingBoardTitle');
        boardTitle.innerHTML = `Estudio Paralelo: ${parasha.name} - Aliá ${aliyah === 'maftir' ? 'Maftír' : aliyah}`;

        const container = document.getElementById('verseContainer');
        container.innerHTML = '';
        
        // If it's Bereshit 1st Aliyah, load from our premium high-fidelity local database!
        if (parasha.id === 'Bereshit' && aliyah === '1') {
            document.getElementById('readingLoader').classList.add('hidden');
            const data = this.localDatabase['Bereshit']['1'];
            document.getElementById('translationNotice').classList.add('hidden');
            this.renderVerses(data.hebrew, data.phonetics, data.translation);
            this.setupPlaybackQueue(data.hebrew);
            return;
        }

        // Otherwise, fetch dynamically from Sefaria API!
        let ref = parasha.ref;
        
        // If we have dynamic Hebcal leyning data for aliyot boundaries, use it!
        if (this.state.fetchedData && this.state.fetchedData.leyning) {
            const lookupKey = aliyah === 'maftir' ? 'M' : aliyah;
            const leyningRef = this.state.fetchedData.leyning[lookupKey] || 
                               this.state.fetchedData.leyning[aliyah] || 
                               this.state.fetchedData.leyning['7']; // Fallback if Maftir/7th is missing, e.g. V'Zot HaBerachah
            if (leyningRef) {
                // Clean reference for Sefaria API (remove spaces around hyphens and trim)
                ref = leyningRef.replace(/\s*-\s*/g, '-').trim();
            }
        } else {
            // Fallback: Fetch first chapter of the parashah
            const baseRef = parasha.ref.split('-')[0];
            const parts = baseRef.split('.');
            const bookName = parts[0];
            const chapter = parts[1];
            ref = `${bookName} ${chapter}`;
        }

        await this.fetchAndDisplayDynamicSefariaText(ref);
    },

    // Dynamic Sefaria text API downloader
    async fetchAndDisplayDynamicSefariaText(ref, customTitle = null) {
        document.getElementById('readingLoader').classList.remove('hidden');
        document.getElementById('verseContainer').innerHTML = '';

        try {
            // Build Sefaria API URL with Spanish version if available
            let url = `https://www.sefaria.org/api/texts/${encodeURI(ref)}?context=0`;
            let ven = '';
            if (ref.includes('Genesis')) {
                ven = 'El Pentateuco Con El Comentario de Rabí Shelomó Itzjakí (Rashí) [es]';
            } else if (ref.includes('Exodus')) {
                ven = 'Alfredo cerhy [es]';
            } else if (ref.includes('Deuteronomy')) {
                ven = 'Sefaria Community Translation [es]';
            }
            if (ven) {
                url += `&ven=${encodeURIComponent(ven)}`;
            }

            // Call Sefaria REST API using encodeURI to prevent invalid spaces from crashing browsers
            const response = await fetch(url);
            const data = await response.json();

            document.getElementById('readingLoader').classList.add('hidden');

            if (!data.he || data.he.length === 0) {
                throw new Error('No se pudo encontrar texto en hebreo para esta porción en Sefaria.');
            }

            // Sefaria returns `he` array (Hebrew text) and `text` array (English text by default or requested translation)
            // We support both arrays and raw strings gracefully
            const rawHebrew = Array.isArray(data.he) ? data.he.flat(Infinity) : (typeof data.he === 'string' ? [data.he] : []);
            const rawEnglish = Array.isArray(data.text) ? data.text.flat(Infinity) : (typeof data.text === 'string' ? [data.text] : []);

            // Clean any HTML tags (like <b>) and HTML entities (like &thinsp;) to ensure visual excellence
            const hebrewVerses = rawHebrew.map(v => v.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim());
            const englishVerses = rawEnglish.map(v => v.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim());
            
            // Map the retrieved Sefaria translation to the translation list (Spanish when available, otherwise English fallback)
            const translations = hebrewVerses.map((_, idx) => {
                return englishVerses[idx] || 'Traducción no disponible.';
            });

            // Detect if translation is Spanish (contains [es] or Spanish in the title)
            const isSpanish = data.versionTitle && (
                data.versionTitle.includes('[es]') || 
                data.versionTitle.toLowerCase().includes('spanish')
            );
            
            // Toggle visibility of the translation notice.
            // If it is NOT Spanish (meaning it fell back to English), we show the notice.
            document.getElementById('translationNotice').classList.toggle('hidden', !!isSpanish);

            // Automatically generate Spanish Phonetics using our rule-based Hebrew-to-Spanish generator!
            const phonetics = hebrewVerses.map(v => this.transliterateHebrewToSpanish(v));

            // Render!
            this.renderVerses(hebrewVerses, phonetics, translations);
            this.setupPlaybackQueue(hebrewVerses);

        } catch (error) {
            console.error('Error al descargar de Sefaria:', error);
            document.getElementById('readingLoader').classList.add('hidden');
            document.getElementById('verseContainer').innerHTML = `<p style="color:#ef4444;text-align:center;font-size:14px;padding:20px;">No se pudieron cargar los datos dinámicos: ${error.message}<br>Por favor, revisa tu conexión a internet o intenta de nuevo.</p>`;
        }
    },

    // Spanish-first phonetic generator using character-level analysis.
    transliterateHebrewToSpanish(hebrewText) {
        const stripMarks = text => text
            .replace(/[\u0591-\u05AF]/g, '')
            .replace(/[\u05BD\u05BF\u05C0\u05C3\u05C4\u05C5]/g, '');

        const vowelFromMarks = marks => {
            if (/[\u05B4]/.test(marks)) return 'i';
            if (/[\u05B5\u05B6\u05B1]/.test(marks)) return 'e';
            if (/[\u05B7\u05B8\u05B2]/.test(marks)) return 'a';
            if (/[\u05B9\u05BA\u05B3]/.test(marks)) return 'o';
            if (/[\u05BB]/.test(marks)) return 'u';
            if (/[\u05B0]/.test(marks)) return 'e';
            return '';
        };

        const consonantFromLetter = (letter, marks, atEnd) => {
            const hasDagesh = marks.includes('\u05BC');
            const shinDot = marks.includes('\u05C1');
            const sinDot = marks.includes('\u05C2');

            switch (letter) {
                case 'א':
                case 'ע':
                    return '';
                case 'ב':
                    return hasDagesh ? 'b' : 'v';
                case 'ג':
                    return 'g';
                case 'ד':
                    return 'd';
                case 'ה':
                    return atEnd ? '' : 'h';
                case 'ו':
                    if (/[\u05B9\u05BA]/.test(marks)) return 'o';
                    if (hasDagesh || /[\u05BB]/.test(marks)) return 'u';
                    return 'v';
                case 'ז':
                    return 'z';
                case 'ח':
                    return 'j';
                case 'ט':
                    return 't';
                case 'י':
                    return /[\u05B4\u05B5\u05B6]/.test(marks) ? '' : 'y';
                case 'כ':
                case 'ך':
                    return hasDagesh ? 'k' : 'j';
                case 'ל':
                    return 'l';
                case 'מ':
                case 'ם':
                    return 'm';
                case 'נ':
                case 'ן':
                    return 'n';
                case 'ס':
                    return 's';
                case 'פ':
                case 'ף':
                    return hasDagesh ? 'p' : 'f';
                case 'צ':
                case 'ץ':
                    return 'tz';
                case 'ק':
                    return 'k';
                case 'ר':
                    return 'r';
                case 'ש':
                    return sinDot ? 's' : (shinDot ? 'sh' : 'sh');
                case 'ת':
                    return 't';
                default:
                    return '';
            }
        };

        const transliterateWord = rawWord => {
            const cleanWord = stripMarks(rawWord).replace(/[־׃.,;:!?()[\]{}"“”]/g, '');
            const tokens = [...cleanWord.matchAll(/([\u05D0-\u05EA])([\u05B0-\u05C7]*)/g)];
            if (tokens.length === 0) return '';

            let output = '';
            tokens.forEach((token, idx) => {
                const letter = token[1];
                const marks = token[2] || '';
                const consonant = consonantFromLetter(letter, marks, idx === tokens.length - 1);
                const vowel = vowelFromMarks(marks);

                if (letter === 'ו' && (consonant === 'o' || consonant === 'u')) {
                    output += consonant;
                } else {
                    output += consonant + vowel;
                }
            });

            return output
                .replace(/e([mnrl])/g, '$1')
                .replace(/([aeiou])\1/g, '$1')
                .replace(/yy/g, 'y')
                .replace(/jj/g, 'j')
                .replace(/shsh/g, 'sh')
                .toLowerCase();
        };

        const words = hebrewText
            .split(/\s+/)
            .map(transliterateWord)
            .filter(Boolean);

        if (words.length === 0) return '';
        const sentence = words.join(' ');
        return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
    },

    // Rendering verses on screen
    renderVerses(hebrewList, phoneticsList, translationList) {
        const container = document.getElementById('verseContainer');
        container.innerHTML = '';
        
        // Save lists to state for Modo Verso a Verso
        this.state.activeHebrewList = hebrewList;
        this.state.activePhoneticsList = phoneticsList;
        this.state.activeTranslationList = translationList;
        this.state.activeVerseIndex = 0; // reset active index

        this.state.currentPracticeKey = this.getPracticeKey();
        this.state.currentVerseCount = hebrewList.length;

        for (let i = 0; i < hebrewList.length; i++) {
            const hebText = hebrewList[i];
            const phonText = phoneticsList[i] || '';
            const transText = translationList[i] || '';

            const row = document.createElement('div');
            row.className = 'verse-row animate-fade-in';
            row.id = `verse-row-${i}`;
            row.dataset.verseIndex = String(i);
            row.style.animationDelay = `${i * 0.05}s`;

            // Verse number badge
            const numBadge = document.createElement('div');
            numBadge.className = 'verse-number';
            numBadge.textContent = `Versículo ${i + 1}`;
            row.appendChild(numBadge);

            // Column 1: Hebrew (RTL, word-by-word interactive)
            const colHeb = document.createElement('div');
            colHeb.className = 'column-hebrew';
            colHeb.style.fontSize = `${this.state.fontSizeHebrew}px`;
            colHeb.style.lineHeight = `${this.state.fontSizeHebrew * 1.7}px`;

            // Split into words to wrap and make interactive
            const words = hebText.split(/\s+/);
            words.forEach((word, wIdx) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'heb-word';
                wordSpan.id = `v-${i}-w-${wIdx}`;
                wordSpan.textContent = word + ' ';

                // Detect trope in word
                const tropeKey = this.detectTropeInWord(word);
                if (tropeKey) {
                    const trope = TropeSynthesizer.tropes[tropeKey];
                    wordSpan.setAttribute('data-trope-key', tropeKey);
                    wordSpan.setAttribute('data-trope-name', trope.name);
                    
                    // Click plays the trope
                    wordSpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        TropeSynthesizer.playTrope(tropeKey, this.state.playbackSpeed);
                        this.showTropeDetails(tropeKey);
                    });
                } else {
                    wordSpan.setAttribute('data-trope-name', 'Palabra');
                }

                colHeb.appendChild(wordSpan);
            });
            row.appendChild(colHeb);

            // Column 2: Phonetics
            const colPhon = document.createElement('div');
            colPhon.className = 'column-phonetics';
            colPhon.textContent = phonText;
            row.appendChild(colPhon);

            // Column 3: Translation
            const colTrans = document.createElement('div');
            colTrans.className = 'column-translation';
            colTrans.textContent = transText;
            row.appendChild(colTrans);

            const actions = document.createElement('div');
            actions.className = 'verse-actions';
            const markButton = document.createElement('button');
            markButton.type = 'button';
            markButton.className = 'verse-complete-btn';
            markButton.dataset.verseIndex = String(i);
            markButton.setAttribute('aria-pressed', 'false');
            markButton.textContent = 'Marcar';
            markButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVerseComplete(i);
            });
            actions.appendChild(markButton);
            row.appendChild(actions);

            // Click whole row highlights it in player
            row.addEventListener('click', () => {
                this.playFromVerse(i);
            });

            container.appendChild(row);
        }

        this.updatePracticePanel();
        if (this.state.viewMode === 'verse') {
            this.renderFlashcard();
        }
    },

    // Trope detection using unicode matchers
    detectTropeInWord(word) {
        const unicodeTropeMap = {
            '\u0591': 'etnachta',
            '\u0594': 'zakef_katon',
            '\u0595': 'zakef_gadol',
            '\u0596': 'tipcha',
            '\u0597': 'revia',
            '\u0599': 'pashta',
            '\u059B': 'tevir',
            '\u059C': 'geresh',
            '\u059E': 'gershayim',
            '\u05A0': 'telisha_gedola',
            '\u05A1': 'pazer',
            '\u05A3': 'munach',
            '\u05A4': 'mapach',
            '\u05A5': 'mercha',
            '\u05A7': 'darga',
            '\u05A8': 'kadma',
            '\u05A9': 'telisha_ketana',
            '\u05C3': 'sof_pasuk'
        };

        for (const char in unicodeTropeMap) {
            if (word.includes(char)) {
                return unicodeTropeMap[char];
            }
        }
        return null;
    },

    // Parse Hebrew text to map all word-level tropes in the Aliyah to prepare the audio schedule
    setupPlaybackQueue(hebrewList) {
        this.state.playQueue = [];
        
        hebrewList.forEach((verseText, vIdx) => {
            const words = verseText.split(/\s+/);
            const verseTropes = [];

            words.forEach((word, wIdx) => {
                const tropeKey = this.detectTropeInWord(word);
                if (tropeKey) {
                    verseTropes.push({
                        tropeKey: tropeKey,
                        wordId: `v-${vIdx}-w-${wIdx}`
                    });
                }
            });

            // If a verse has no trope, we inject a short breathing space
            if (verseTropes.length === 0) {
                verseTropes.push({
                    tropeKey: 'munach',
                    wordId: null
                });
            }

            this.state.playQueue.push({
                verseIndex: vIdx,
                items: verseTropes
            });
        });

        // Set duration estimate (approx 2.5 seconds per verse)
        const estSec = hebrewList.length * 2.5;
        const mm = String(Math.floor(estSec / 60)).padStart(2, '0');
        const ss = String(Math.floor(estSec % 60)).padStart(2, '0');
        document.getElementById('playerTotalTime').textContent = `${mm}:${ss}`;
    },

    // Start playing from a specific verse index
    playFromVerse(vIdx) {
        this.stopAudio();
        this.state.playIndex = vIdx;
        this.revealPlayerDock();
        this.startChantingQueue();
    },

    // Reveals docked audio player
    revealPlayerDock() {
        const dock = document.getElementById('audioPlayerDock');
        dock.classList.remove('hidden');
        dock.classList.add('visible-flex');
        
        const parasha = this.state.currentParasha;
        const aliyah = this.state.currentAliyah;
        document.getElementById('playerTrackTitle').textContent = `Cantando: ${parasha.name} - Aliá ${aliyah === 'maftir' ? 'Maftír' : aliyah}`;
    },

    // Handles play / pause action
    togglePlayback() {
        if (this.state.isPlaying) {
            this.pauseAudio();
        } else {
            this.revealPlayerDock();
            this.startChantingQueue();
        }
    },

    // Start chanting loop
    startChantingQueue() {
        this.state.isPlaying = true;
        this.updatePlayerButtons(true);
        this.chantNextTropeGroup();
    },

    // Chant next trope sequence
    async chantNextTropeGroup() {
        if (!this.state.isPlaying) return;

        const queue = this.state.playQueue;
        const idx = this.state.playIndex;

        if (idx >= queue.length) {
            // Reached the end!
            if (this.state.isLooping) {
                this.state.playIndex = 0;
                this.chantNextTropeGroup();
            } else {
                this.stopAudio();
            }
            return;
        }

        // Keep activeVerseIndex in sync for Modo Verso a Verso
        if (this.state.viewMode === 'verse' && this.state.activeVerseIndex !== idx) {
            this.state.activeVerseIndex = idx;
            this.renderFlashcard('left');
        }

        // Highlight active row on screen
        const rows = document.querySelectorAll('.verse-row');
        rows.forEach(r => r.classList.remove('playing'));
        const activeRow = document.getElementById(`verse-row-${idx}`);
        if (activeRow && this.state.viewMode === 'parallel') {
            activeRow.classList.add('playing');
            activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update progress bar
        const pct = (idx / queue.length) * 100;
        document.getElementById('playerProgressBarFill').style.width = `${pct}%`;
        
        // Update current time display (simulate duration)
        const estSec = idx * 2.5;
        const mm = String(Math.floor(estSec / 60)).padStart(2, '0');
        const ss = String(Math.floor(estSec % 60)).padStart(2, '0');
        document.getElementById('playerCurrentTime').textContent = `${mm}:${ss}`;

        const item = queue[idx];
        const playItems = item.items;

        // Chant all tropes for this verse in series
        // Track all timeouts so they can be cancelled on pause/stop
        if (!this.state._chantTimeouts) this.state._chantTimeouts = [];
        let durationSum = 0;
        for (let i = 0; i < playItems.length; i++) {
            const { tropeKey, wordId } = playItems[i];
            const tropeObj = TropeSynthesizer.tropes[tropeKey];
            
            // Play trope tone
            const delay = durationSum / this.state.playbackSpeed;
            
            const tid = setTimeout(() => {
                if (this.state.isPlaying) {
                    TropeSynthesizer.playTrope(tropeKey, this.state.playbackSpeed);
                    
                    // Highlight the specific word active (karaoke style!)
                    if (wordId) {
                        // Remove highlight from any other words first
                        document.querySelectorAll('.heb-word').forEach(w => w.classList.remove('chanting-word'));
                        
                        const elId = this.state.viewMode === 'verse' ? `f-${wordId}` : wordId;
                        const wordEl = document.getElementById(elId);
                        if (wordEl) {
                            wordEl.classList.add('chanting-word');
                            
                            // Speak the word if voice is enabled
                            if (this.state.audioMode !== 'trope') {
                                this.speakWordForElement(wordEl);
                            }
                        }
                    }
                }
            }, delay);
            this.state._chantTimeouts.push(tid);

            // sum durations to offset next trope
            const motifDuration = tropeObj.motif.reduce((sum, n) => sum + n[1], 0);

            // Schedule highlight removal when note stops
            if (wordId) {
                const hid = setTimeout(() => {
                    const elId = this.state.viewMode === 'verse' ? `f-${wordId}` : wordId;
                    const wordEl = document.getElementById(elId);
                    if (wordEl) {
                        wordEl.classList.remove('chanting-word');
                    }
                }, delay + (motifDuration / this.state.playbackSpeed));
                this.state._chantTimeouts.push(hid);
            }

            durationSum += motifDuration;
        }

        // Schedule next verse after all tropes finished playing (+ short breath space)
        const nextVerseDelay = (durationSum + 600) / this.state.playbackSpeed;
        
        const nextTid = setTimeout(() => {
            this.state.playIndex++;
            this.chantNextTropeGroup();
        }, nextVerseDelay);
        this.state._chantTimeouts.push(nextTid);
        this.state.playTimeout = nextTid;
    },

    // Pause audio playback
    pauseAudio() {
        this.state.isPlaying = false;
        this.updatePlayerButtons(false);
        // Clear all chanting timeouts (trope playback, highlights, next-verse scheduling)
        if (this.state._chantTimeouts) {
            this.state._chantTimeouts.forEach(t => clearTimeout(t));
            this.state._chantTimeouts = [];
        }
        if (this.state.playTimeout) {
            clearTimeout(this.state.playTimeout);
        }
        // Clear blessing timeouts if any are active
        if (this.state.blessingTimeouts) {
            this.state.blessingTimeouts.forEach(t => clearTimeout(t));
            this.state.blessingTimeouts = [];
        }
        // Cancel speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        // Clean any active karaoke highlights
        document.querySelectorAll('.heb-word').forEach(w => w.classList.remove('chanting-word'));
    },

    // Fully stops audio and resets trackers
    stopAudio() {
        this.pauseAudio();
        this.state.playIndex = 0;
        document.getElementById('playerProgressBarFill').style.width = '0%';
        document.getElementById('playerCurrentTime').textContent = '00:00';
        
        const rows = document.querySelectorAll('.verse-row');
        rows.forEach(r => r.classList.remove('playing'));
    },

    // UI player button manager
    updatePlayerButtons(playing) {
        const playBtn = document.getElementById('playIconSvg');
        const pauseBtn = document.getElementById('pauseIconSvg');
        
        if (playing) {
            playBtn.classList.add('hidden');
            pauseBtn.classList.remove('hidden');
        } else {
            playBtn.classList.remove('hidden');
            pauseBtn.classList.add('hidden');
        }

        // Synchronize flashcard play button as well
        const flashPlay = document.getElementById('flashcardBtnPlay');
        if (flashPlay) {
            this.updateFlashcardPlayButton(playing);
        }
    },

    // Speed switching (0.75x, 1x, 1.25x, 1.5x)
    changePlaybackSpeed() {
        const speeds = [1.0, 1.25, 1.5, 0.75];
        let nextIdx = speeds.indexOf(this.state.playbackSpeed) + 1;
        if (nextIdx >= speeds.length) nextIdx = 0;

        this.state.playbackSpeed = speeds[nextIdx];
        document.getElementById('playerSpeedBtn').textContent = `${this.state.playbackSpeed}x`;
        
        // If playing, pause and resume to apply the new speed immediately
        if (this.state.isPlaying) {
            this.pauseAudio();
            this.startChantingQueue();
        }
    },

    // Loops toggle
    toggleLoop() {
        this.state.isLooping = !this.state.isLooping;
        const btn = document.getElementById('playerLoopBtn');
        if (this.state.isLooping) {
            btn.style.color = 'var(--accent-gold)';
            btn.style.borderColor = 'var(--accent-gold)';
            btn.style.boxShadow = '0 0 8px rgba(212, 175, 55, 0.3)';
        } else {
            btn.style.color = 'var(--color-text-secondary)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btn.style.boxShadow = 'none';
        }
    },

    // Progress bar scrubbing click
    scrubPlayer(e) {
        if (this.state.playQueue.length === 0) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const pct = clickX / width;

        const nextIndex = Math.floor(pct * this.state.playQueue.length);
        this.playFromVerse(nextIndex);
    },

    // Render interactive Trope soundboard
    renderTropeGlossary() {
        const container = document.getElementById('tropeGlossaryContainer');
        container.innerHTML = '';

        for (const [key, trope] of Object.entries(TropeSynthesizer.tropes)) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'trope-card';
            card.setAttribute('data-trope-key', key);
            card.setAttribute('aria-label', `Escuchar ${trope.name}`);

            card.innerHTML = `
                <div class="trope-card-char">${trope.char}</div>
                <div class="trope-card-name">${trope.name}</div>
                <div class="trope-card-type">${trope.type.split(' ')[0]}</div>
            `;

            card.addEventListener('click', () => {
                TropeSynthesizer.playTrope(key, this.state.playbackSpeed);
                this.showTropeDetails(key);
            });

            container.appendChild(card);
        }
    },

    // Detail popup on soundboard clicks
    showTropeDetails(key) {
        const card = document.getElementById('tropeDetailsCard');
        const name = document.getElementById('tropeDetailsName');
        const type = document.getElementById('tropeDetailsType');
        const desc = document.getElementById('tropeDetailsDesc');

        const trope = TropeSynthesizer.tropes[key];
        if (!trope) return;

        name.textContent = `${trope.name} (${trope.char})`;
        type.textContent = `Categoría: ${trope.type}`;
        desc.textContent = trope.desc;

        card.classList.remove('hidden');
    },

    // Aliyah Blessing Practice audio synthesizer
    playBlessing(type) {
        this.stopAudio();
        
        // Define simple traditional melodies using standard tropes
        const blessingBeforeMotif = [
            'munach', 'kadma', 'mapach', 'pashta', // Bareju et Adonai
            'munach', 'tipcha', 'etnachta',        // Hamevorach
            'munach', 'zakef_katon', 'revia',      // Baruch Adonai
            'kadma', 'mapach', 'pashta', 'tevir',   // Asher bachar banu
            'munach', 'tipcha', 'sof_pasuk'        // Noten hatorah
        ];

        const blessingAfterMotif = [
            'munach', 'kadma', 'mapach', 'pashta', // Baruch ata Adonai
            'munach', 'tipcha', 'etnachta',        // Asher natan lanu
            'munach', 'zakef_katon', 'revia',      // Torat emet
            'kadma', 'mapach', 'pashta', 'tevir',   // Vejayei olam
            'munach', 'tipcha', 'sof_pasuk'        // Noten hatorah
        ];

        const motif = type === 'before' ? blessingBeforeMotif : blessingAfterMotif;
        
        // Play the blessings chanting in series!
        let durationSum = 0;
        motif.forEach(tropeKey => {
            const tropeObj = TropeSynthesizer.tropes[tropeKey];
            const delay = durationSum / this.state.playbackSpeed;

            const t = setTimeout(() => {
                TropeSynthesizer.playTrope(tropeKey, this.state.playbackSpeed);
            }, delay);
            this.state.blessingTimeouts.push(t);

            const duration = tropeObj.motif.reduce((sum, n) => sum + n[1], 0);
            durationSum += duration;
        });
    },

    handleHashChange() {
        const hash = location.hash.replace('#', '');
        if (!hash) return;
        const [parashaId, aliyah] = hash.split('/');
        const targetAliyah = aliyah || '1';
        
        let found = false;
        for (const list of Object.values(this.parashotCatalog)) {
            if (list.some(p => p.id === parashaId)) {
                found = true;
                break;
            }
        }
        
        if (found) {
            if (this.state.currentParasha && this.state.currentParasha.id === parashaId) {
                if (this.state.currentAliyah !== targetAliyah) {
                    this.state.currentAliyah = targetAliyah;
                    
                    const chips = document.getElementById('aliyahSelectorChips').children;
                    Array.from(chips).forEach(c => {
                        if (c.dataset.aliyah === targetAliyah) {
                            c.classList.add('active');
                            c.setAttribute('aria-selected', 'true');
                        } else {
                            c.classList.remove('active');
                            c.setAttribute('aria-selected', 'false');
                        }
                    });
                    
                    this.loadAliyahText();
                }
            } else {
                this.loadParasha(parashaId, targetAliyah);
            }
            
            const selectEl = document.getElementById('selectParasha');
            if (selectEl && selectEl.value !== parashaId) {
                selectEl.value = parashaId;
            }
        }
    },

    shareActiveAliyah() {
        const parasha = this.state.currentParasha;
        const aliyah = this.state.currentAliyah;
        const title = "Cantoral de Torá";
        let url = window.location.origin + window.location.pathname;
        let text = "Practica el cantileo de la Torá con tropos Ashkenazi y fonética en español.";
        
        if (parasha) {
            const aliyahStr = aliyah === 'maftir' ? 'Maftír' : `${aliyah}ª Aliá`;
            text = `Practica la ${aliyahStr} de la Parashá ${parasha.name} (קול תורה) con tropos y fonética en español:`;
            url += `#${parasha.id}/${aliyah}`;
        }
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            }).catch(err => console.log('Error compartiendo:', err));
        } else {
            navigator.clipboard.writeText(`${text} ${url}`).then(() => {
                this.showNotification("¡Enlace de lectura copiado al portapapeles!");
            }).catch(err => {
                console.error('Error al copiar:', err);
            });
        }
    },

    showNotification(msg) {
        const existing = document.getElementById('appNotification');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'appNotification';
        toast.className = 'app-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('visible'), 10);
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    switchViewMode(mode) {
        this.state.viewMode = mode;
        this.stopAudio();

        const btnParallel = document.getElementById('viewTabParallel');
        const btnVerse = document.getElementById('viewTabVerse');
        const divParallel = document.getElementById('verseContainer');
        const divVerse = document.getElementById('verseFlashcardContainer');

        if (mode === 'parallel') {
            btnParallel.classList.add('active');
            btnVerse.classList.remove('active');
            divParallel.classList.remove('hidden');
            divVerse.classList.add('hidden');
        } else {
            btnParallel.classList.remove('active');
            btnVerse.classList.add('active');
            divParallel.classList.add('hidden');
            divVerse.classList.remove('hidden');
            
            // Set active index to first pending verse if possible, else 0
            if (this.state.activeHebrewList && this.state.activeHebrewList.length > 0) {
                const completed = this.getCompletedSet();
                let firstPending = 0;
                for (let i = 0; i < this.state.activeHebrewList.length; i++) {
                    if (!completed.has(i)) {
                        firstPending = i;
                        break;
                    }
                }
                this.state.activeVerseIndex = firstPending;
                this.renderFlashcard();
            }
        }
    },

    renderFlashcard(animationDirection = null) {
        const hebList = this.state.activeHebrewList;
        const phonList = this.state.activePhoneticsList;
        const transList = this.state.activeTranslationList;
        const index = this.state.activeVerseIndex;

        if (!hebList || hebList.length === 0) return;

        const card = document.querySelector('.verse-flashcard');
        if (animationDirection === 'left') {
            card.classList.remove('slide-left', 'slide-right');
            void card.offsetWidth; // trigger reflow
            card.classList.add('slide-left');
        } else if (animationDirection === 'right') {
            card.classList.remove('slide-left', 'slide-right');
            void card.offsetWidth; // trigger reflow
            card.classList.add('slide-right');
        }

        // Update badge
        document.getElementById('flashcardVerseNumber').textContent = `Versículo ${index + 1} de ${hebList.length}`;

        // Update mark status
        const completed = this.getCompletedSet();
        const isDone = completed.has(index);
        const markBtn = document.getElementById('flashcardBtnMark');
        markBtn.classList.toggle('completed', isDone);
        markBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');

        // Render Hebrew (RTL, word-by-word interactive)
        const hebBox = document.getElementById('flashcardHebrew');
        hebBox.innerHTML = '';
        const words = hebList[index].split(/\s+/);
        words.forEach((word, wIdx) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'heb-word';
            wordSpan.id = `f-v-${index}-w-${wIdx}`; // Unique flashcard word ID
            wordSpan.textContent = word + ' ';

            const tropeKey = this.detectTropeInWord(word);
            if (tropeKey) {
                wordSpan.setAttribute('data-trope-key', tropeKey);
                wordSpan.setAttribute('data-trope-name', TropeSynthesizer.tropes[tropeKey].name);
                wordSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    TropeSynthesizer.playTrope(tropeKey, this.state.playbackSpeed);
                    this.showTropeDetails(tropeKey);
                });
            } else {
                wordSpan.setAttribute('data-trope-name', 'Palabra');
            }
            hebBox.appendChild(wordSpan);
        });

        // Update phonetics and translation
        document.getElementById('flashcardPhonetics').textContent = phonList[index] || '';
        document.getElementById('flashcardTranslation').textContent = transList[index] || '';

        // Reset play state buttons in flashcard
        this.updateFlashcardPlayButton(false);
    },

    goToNextVerse() {
        const total = this.state.activeHebrewList ? this.state.activeHebrewList.length : 0;
        if (total === 0) return;

        if (this.state.activeVerseIndex < total - 1) {
            this.state.activeVerseIndex++;
            this.renderFlashcard('left');
        } else {
            this.showNotification("¡Has completado el repaso de esta Aliá!");
        }
    },

    goToPrevVerse() {
        if (this.state.activeVerseIndex > 0) {
            this.state.activeVerseIndex--;
            this.renderFlashcard('right');
        }
    },

    toggleFlashcardPlayback() {
        const index = this.state.activeVerseIndex;
        
        // If already playing this verse, pause it.
        // If not, play it from the beginning.
        if (this.state.isPlaying && this.state.playIndex === index) {
            this.stopAudio();
            this.updateFlashcardPlayButton(false);
        } else {
            this.playFromVerse(index);
            this.updateFlashcardPlayButton(true);
        }
    },

    updateFlashcardPlayButton(playing) {
        const playIcon = document.getElementById('flashcardPlayIcon');
        const pauseIcon = document.getElementById('flashcardPauseIcon');
        const playText = document.getElementById('flashcardPlayText');

        if (playing) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            playText.textContent = 'Pausar';
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            playText.textContent = 'Escuchar';
        }
    },

    toggleFlashcardMark() {
        const index = this.state.activeVerseIndex;
        this.toggleVerseComplete(index);
        
        // Update mark status in UI
        const completed = this.getCompletedSet();
        const isDone = completed.has(index);
        const markBtn = document.getElementById('flashcardBtnMark');
        markBtn.classList.toggle('completed', isDone);
        markBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
    },

    handleGlobalKeydown(e) {
        // Ignore if user is typing in a date picker or search dropdown
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
            return;
        }

        if (this.state.viewMode !== 'verse') return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.goToNextVerse();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.goToPrevVerse();
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            this.toggleFlashcardPlayback();
        } else if (e.key.toLowerCase() === 'm') {
            e.preventDefault();
            this.toggleFlashcardMark();
        }
    },

    setupSwipeGestures() {
        const container = document.getElementById('verseFlashcardContainer');
        if (!container) return;

        let startX = 0;
        let startY = 0;

        container.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].screenX;
            const endY = e.changedTouches[0].screenY;
            
            const diffX = endX - startX;
            const diffY = endY - startY;

            // Simple swipe detection: horizontal change must be significant and vertical minimal
            if (Math.abs(diffX) > 80 && Math.abs(diffY) < 50) {
                if (diffX > 0) {
                    // Swipe right -> Prev verse
                    this.goToPrevVerse();
                } else {
                    // Swipe left -> Next verse
                    this.goToNextVerse();
                }
            }
        }, { passive: true });
    },

    speakWordForElement(wordEl) {
        if (!window.speechSynthesis) return;

        const id = wordEl.id;
        const parts = id.split('-'); // ['v', '0', 'w', '2'] or ['f', 'v', '0', 'w', '2']
        let vIdx, wIdx;
        if (parts[0] === 'f') {
            vIdx = parseInt(parts[2]);
            wIdx = parseInt(parts[4]);
        } else {
            vIdx = parseInt(parts[1]);
            wIdx = parseInt(parts[3]);
        }

        if (isNaN(vIdx) || isNaN(wIdx)) return;

        let wordText = '';
        let lang = 'he-IL';

        if (this.state.audioMode === 'hebrew') {
            const rawWord = this.state.activeHebrewList[vIdx].split(/\s+/)[wIdx] || '';
            // Strip cantillation marks but leave vowels (Niqqud) for accurate Hebrew pronunciation
            wordText = rawWord
                .replace(/[\u0591-\u05AF]/g, '')
                .replace(/[\u05BD\u05BF\u05C0\u05C3\u05C4\u05C5]/g, '')
                .replace(/[־׃.,;:!?()[\]{}"“”]/g, '');
            lang = 'he-IL';
        } else if (this.state.audioMode === 'spanish') {
            const rawWord = this.state.activePhoneticsList[vIdx].split(/\s+/)[wIdx] || '';
            // Strip punctuation marks
            wordText = rawWord.replace(/[.,;:!?()[\]{}"“”]/g, '');
            lang = 'es-ES'; // Spanish voice
        }

        if (!wordText) return;

        this.speakWord(wordText, lang);
    },

    speakWord(text, lang) {
        if (!window.speechSynthesis) return;

        // Cancel previous words to keep sync
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        // Scale speed with playbackSpeed (voice is usually slightly faster than trope notes, so we multiply by 1.05)
        utterance.rate = this.state.playbackSpeed * 1.05;
        utterance.volume = 0.95;

        // Find best match voice (crucial for iOS and desktop Chrome)
        const voices = window.speechSynthesis.getVoices();
        if (lang.startsWith('he')) {
            const heVoice = voices.find(v => v.lang.startsWith('he') || v.name.toLowerCase().includes('hebrew'));
            if (heVoice) utterance.voice = heVoice;
        } else {
            const esVoice = voices.find(v => v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish') || v.name.toLowerCase().includes('castilian'));
            if (esVoice) utterance.voice = esVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
};

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    App.init();
    // Bind to window for global namespace interactions (e.g. Birchat HaTorah button clicks)
    window.App = App;
});

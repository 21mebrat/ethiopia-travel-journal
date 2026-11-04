import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '../payload.config'
import { reconcileArticleMetrics } from '../lib/site/engagement'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../')

// Lexical rich text AST builders
function createLexicalHeading(text: string, tag: 'h1' | 'h2' | 'h3' = 'h2') {
  return {
    type: 'heading',
    tag,
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'text',
        text,
        format: 0,
        detail: 0,
        mode: 'normal',
        style: '',
        version: 1,
      },
    ],
    direction: 'ltr',
  }
}

function createLexicalParagraph(text: string) {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'text',
        text,
        format: 0,
        detail: 0,
        mode: 'normal',
        style: '',
        version: 1,
      },
    ],
    direction: 'ltr',
  }
}

function createLexicalQuote(text: string) {
  return {
    type: 'quote',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'text',
        text,
        format: 0,
        detail: 0,
        mode: 'normal',
        style: '',
        version: 1,
      },
    ],
    direction: 'ltr',
  }
}

function createLexicalDoc(children: any[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: 'ltr',
    },
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.webp':
      return 'image/webp'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

async function runSeed() {
  console.log('--- STARTING PRODUCTION-READY RESET & RESEED ---')

  const payload = await getPayload({ config: await config })
  const db = (payload.db as any).connection?.db

  if (!db) {
    throw new Error('Could not connect to MongoDB database via Payload.')
  }

  const dbName = db.databaseName
  console.log(`Connected to database: ${dbName}`)

  // 1. HARD CRITICAL GUARD: Ensure we never delete the users collection
  const collectionsToClear = [
    '_articles_versions',
    'articles',
    'destinations',
    'categories',
    'titles', // Advertisements collection slug is "title", collection is "titles"
    'comments',
    'article-views',
    'newsletter-broadcasts',
    'newsletter-deliveries',
    'subscribers',
    'media',
  ]

  for (const colName of collectionsToClear) {
    if (colName === 'users') {
      throw new Error('FATAL SECURITY VIOLATION: Attempted to drop users collection!')
    }
    const collectionExists = await db.listCollections({ name: colName }).hasNext()
    if (collectionExists) {
      const deleteResult = await db.collection(colName).deleteMany({})
      console.log(`Cleared collection [${colName}]: deleted ${deleteResult.deletedCount} documents.`)
    }
  }

  // Clear stale preferences referencing old collections/documents
  const prefsExists = await db.listCollections({ name: 'payload-preferences' }).hasNext()
  if (prefsExists) {
    await db.collection('payload-preferences').deleteMany({
      key: { $regex: /^(articles|destinations|categories|titles|comments|media)/ },
    })
    console.log('Cleaned stale administrative preferences.')
  }

  // 2. PRESERVED USERS VERIFICATION
  console.log('\n--- VERIFYING PRESERVED USERS ---')
  const userResults = await payload.find({
    collection: 'users',
    limit: 10,
    overrideAccess: true,
  })
  console.log(`Found ${userResults.totalDocs} preserved users:`)
  for (const u of userResults.docs) {
    console.log(`  - [${u.role || 'user'}] ${u.email} (ID: ${u.id})`)
  }

  const primaryAdmin = userResults.docs.find((u) => u.email === 'maytotmat@gmail.com') || userResults.docs[0]
  if (!primaryAdmin) {
    throw new Error('No admin user found to associate content with!')
  }
  const authorId = primaryAdmin.id
  console.log(`Primary author selected: ${primaryAdmin.email} (ID: ${authorId})`)

  // 3. SEED MEDIA ASSETS
  console.log('\n--- SEEDING CURATED MEDIA ---')
  const mediaSpecs = [
    {
      key: 'lalibela_hero',
      filePath: path.resolve(rootDir, 'public/assets/Lalibela.webp'),
      altEn: 'Rock-Hewn Church of Bete Giyorgis carved into the volcanic red tuff of Lalibela, Ethiopia',
      altAm: 'ከቀይ እሳተ ገሞራ አለት የተቀረጸው የቅዱስ ጊዮርጊስ ውቅር ቤተክርስቲያን በላሊበላ፣ ኢትዮጵያ',
      captionEn: 'Bete Giyorgis (Church of Saint George) at sunset, Lalibela.',
      captionAm: 'የቅዱስ ጊዮርጊስ ቤተክርስቲያን በጀምበር መጥለቂያ ወቅት፣ ላሊበላ።',
    },
    {
      key: 'lalibela_feast',
      filePath: path.resolve(rootDir, 'public/assets/laiblela_feast.jpeg'),
      altEn: 'Traditional Ethiopian dining feast featuring injera flatbread served with rich wats and vegetable stews',
      altAm: 'በእንጀራ ላይ የተዘጋጀ የተሟላ የኢትዮጵያ ባህላዊ ማዕድ ከወጦችና ከአትክልቶች ጋር',
      captionEn: 'Traditional highland Ethiopian dining ceremony.',
      captionAm: 'ባህላዊ የኢትዮጵያ የግብዣ ማዕድ።',
    },
    {
      key: 'simien_landscape',
      filePath: '/home/mebrat/.gemini/antigravity-cli/brain/0eef835f-2478-40a0-b725-e01d6ebc5d93/simien_test_1793622215499.jpg',
      altEn: 'Dramatic sheer escarpments and Afro-alpine ridges of Simien Mountains National Park (Demonstration Photography)',
      altAm: 'የስሜን ተራሮች ብሔራዊ ፓርክ አስደናቂ የተፈጥሮ ገደላገደልና አፍሮ-አልፓይን መልክዓ ምድር',
      captionEn: 'The mist-shrouded peaks of Simien Mountains National Park.',
      captionAm: 'በጭጋግ የተከበቡት የስሜን ተራሮች ጫፎች።',
    },
    {
      key: 'gondar_castle',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/Gemini_Generated_Image_nyyoo1nyyoo1nyyo.png'),
      altEn: 'Historic stone towers and crenellated fortresses of Fasil Ghebbi in Gondar',
      altAm: 'የጎንደር የፋሲል ግቢ ጥንታዊ ግንቦችና ታሪካዊ ቤተ መንግሥታት',
      captionEn: 'Royal enclosure of Fasilides at Gondar.',
      captionAm: 'የዐፄ ፋሲለደስ የፋሲል ግቢ ግንብ በጎንደር።',
    },
    {
      key: 'harar_alleys',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/Photo from 2026-10-05 08-56-38.521280.jpeg'),
      altEn: 'Cobblestone pedestrian alleys inside the ancient walled city of Harar Jugol',
      altAm: 'በጥንታዊቷ የሐረር ጀጎል ግንብ ከተማ ውስጥ የሚገኙ ጠባብ የድንጋይ መንገዶች',
      captionEn: 'Peaceful morning light along the historic lanes of Harar Jugol.',
      captionAm: 'የጠዋት ፀሐይ ብርሃን በጀጎል ግንብ ከተማ መንገዶች ላይ።',
    },
    {
      key: 'bale_wildlife',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/Photo from 2026-10-17 14-53-19.226097.jpeg'),
      altEn: 'Afro-alpine wilderness of the Sanetti Plateau in Bale Mountains National Park',
      altAm: 'የባሌ ተራሮች ብሔራዊ ፓርክ ሳኔቲ አምባ የዱር እንስሳት መገኛና ተፈጥሮ',
      captionEn: 'Sanetti Plateau wilderness in Bale Mountains.',
      captionAm: 'የሳኔቲ አምባ የተፈጥሮ ምድረ በዳ በባሌ ተራሮች።',
    },
    {
      key: 'danakil_dallol',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/dad8a4af71465e193d50e6caf3f03db59fcb0627.png'),
      altEn: 'Vibrant hydrothermal mineral springs and salt formations of Dallol in the Danakil Depression',
      altAm: 'በዳሎል ዳናኪል ሸለቆ የሚገኙ ደማቅ የማዕድን ምንጮችና የጨው ቅርጾች',
      captionEn: 'Geothermal salt terraces at Dallol.',
      captionAm: 'የዳሎል አስደናቂ የተፈጥሮ የጨው እርከኖች።',
    },
    {
      key: 'coffee_culture',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/image-1.png'),
      altEn: 'Traditional Ethiopian Buna coffee ceremony with clay jebena pot and aromatic incense',
      altAm: 'የኢትዮጵያ ባህላዊ የቡና አፈላል ሥርዓት ከሸክላ ጀበናና ዕጣን ጭስ ጋር',
      captionEn: 'The revered ritual of the Ethiopian coffee ceremony.',
      captionAm: 'ክቡሩ የኢትዮጵያ የቡና ማፍላት ሥርዓት።',
    },
    {
      key: 'highlands_scenic',
      filePath: path.resolve(rootDir, 'backups/backup_20261102_152257/media/Gemini_Generated_Image_mmaaatmmaaatmmaa.png'),
      altEn: 'Panoramic view across the rolling green plateau of the Ethiopian highlands',
      altAm: 'አረንጓዴው የኢትዮጵያ ከፍተኛ ደጋማ አምባዎች አስደናቂ ፓኖራማ',
      captionEn: 'Highland vistas across northern Ethiopia.',
      captionAm: 'የሰሜን ኢትዮጵያ ደጋማ መልክዓ ምድር እይታ።',
    },
    {
      key: 'partner_logo',
      filePath: path.resolve(rootDir, 'public/assets/ethiopia-tour-logo.png'),
      altEn: 'Ethiopian Tourism and Cultural Travel Emblem',
      altAm: 'የኢትዮጵያ ቱሪዝምና ባህል ጉዞ ዓርማ',
      captionEn: 'Official travel guide partner logo.',
      captionAm: 'የጉዞ መመሪያ ይፋዊ አጋር ዓርማ።',
    },
  ]

  const mediaMap: Record<string, string> = {}
  for (const m of mediaSpecs) {
    if (!fs.existsSync(m.filePath)) {
      console.warn(`File not found: ${m.filePath}, skipping media entry ${m.key}`)
      continue
    }

    const fileBuffer = fs.readFileSync(m.filePath)
    const createdMedia = await payload.create({
      collection: 'media',
      locale: 'all' as any,
      data: {
        alt: {
          en: m.altEn,
          am: m.altAm,
        },
        caption: {
          en: m.captionEn,
          am: m.captionAm,
        },
      } as any,
      file: {
        data: fileBuffer,
        mimetype: getMimeType(m.filePath),
        name: path.basename(m.filePath),
        size: fileBuffer.length,
      },
      overrideAccess: true,
      context: { isSeed: true },
    })

    mediaMap[m.key] = String(createdMedia.id)
    console.log(`Created media [${m.key}]: ID ${createdMedia.id} (${path.basename(m.filePath)})`)
  }

  const defaultMediaId = mediaMap['lalibela_hero'] || Object.values(mediaMap)[0]

  // 4. SEED CATEGORIES
  console.log('\n--- SEEDING CATEGORIES ---')
  const categoriesData = [
    {
      name: {
        en: 'Culture & Heritage',
        am: 'ባሕል እና ቅርስ',
      },
      slug: 'culture-heritage',
      description: {
        en: 'Centuries of indigenous spiritual traditions, festive holidays, traditional ceremonies, and sacred living heritage.',
        am: 'የብዙ መቶ ዓመታት መንፈሳዊ ወጎች፣ ደማቅ በዓላት፣ ባህላዊ ሥርዓቶችና ሕያው ቅርሶች።',
      },
      color: 'amber',
    },
    {
      name: {
        en: 'Wildlife & Nature',
        am: 'የዱር እንስሳትና ተፈጥሮ',
      },
      slug: 'wildlife-nature',
      description: {
        en: 'Endemic wildlife species, pristine Afro-alpine plateaus, and protected biodiversity sanctuaries across Ethiopia.',
        am: 'በኢትዮጵያ ብቻ የሚገኙ የዱር እንስሳት፣ ንጹሕ የአልፓይን አምባዎችና የተፈጥሮ ፓርኮች።',
      },
      color: 'emerald',
    },
    {
      name: {
        en: 'Historical Treasures',
        am: 'ታሪካዊ ቅርሶች',
      },
      slug: 'historical-treasures',
      description: {
        en: 'Monumental rock-hewn architecture, ancient empires, UNESCO World Heritage fortresses, and archaeological wonders.',
        am: 'አስደናቂ የውቅር አብያተ ክርስቲያናት፣ ጥንታዊ ስልጣኔዎችና የዩኔስኮ የዓለም ቅርሶች።',
      },
      color: 'crimson',
    },
    {
      name: {
        en: 'Hiking & Adventure',
        am: 'የእግር ጉዞ እና ጀብዱ',
      },
      slug: 'hiking-adventure',
      description: {
        en: 'High-altitude mountain trekking, dramatic volcanic escarpments, deep gorges, and thrilling overland journeys.',
        am: 'የተራራ እግር ጉዞዎች፣ አስደናቂ ገደሎች፣ ጥልቅ ሸለቆዎችና አስደሳች የጀብዱ ጉዞዎች።',
      },
      color: 'blue',
    },
    {
      name: {
        en: 'Cuisine & Gastronomy',
        am: 'የኢትዮጵያ ምግቦች እና ቡና',
      },
      slug: 'cuisine-gastronomy',
      description: {
        en: 'The rich flavors of fermented teff injera, fragrant wats, regional spice blends, and the world-renowned coffee ritual.',
        am: 'የጤፍ እንጀራ፣ የተመረጡ ወጦች፣ የቅመም ጣዕሞችና ዝነኛው የኢትዮጵያ የቡና ባህል።',
      },
      color: 'brown',
    },
  ]

  const categoryMap: Record<string, string> = {}
  for (const cat of categoriesData) {
    const createdCat = await payload.create({
      collection: 'categories',
      locale: 'all' as any,
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        color: cat.color as any,
      } as any,
      overrideAccess: true,
      context: { isSeed: true },
    })
    categoryMap[cat.slug] = String(createdCat.id)
    console.log(`Created category [${cat.slug}]: ID ${createdCat.id}`)
  }

  // 5. SEED DESTINATIONS
  console.log('\n--- SEEDING DESTINATIONS ---')
  const destinationsData = [
    {
      key: 'lalibela',
      title: {
        en: 'Lalibela Rock-Hewn Churches',
        am: 'የላሊበላ ውቅር አብያተ ክርስቲያናት',
      },
      slug: 'lalibela',
      region: 'amhara',
      featured: true,
      category: 'historic_sites',
      tags: 'Historic Site, UNESCO Site, Pilgrimage, Archaeology',
      heroImage: mediaMap['lalibela_hero'] || defaultMediaId,
      overview: {
        en: 'Carved straight down into the volcanic red tuff over eight centuries ago, Lalibela is widely celebrated as the New Jerusalem of Africa. Its eleven monolithic and semi-monolithic churches remain active spiritual centers of Ethiopian Orthodox worship.',
        am: 'ከስምንት መቶ ዓመታት በፊት ከቀይ እሳተ ገሞራ አለት ተፈልፍለው የተሰሩት 11ዱ የላሊበላ ውቅር አብያተ ክርስቲያናት የኢትዮጵያ ታላቅ መንፈሳዊ ማዕከልና የዩኔስኮ የዓለም ቅርስ ናቸው።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'October to March (Dry Season, Genna and Timkat Festivals)',
          am: 'ከጥቅምት እስከ መጋቢት (ደረቅ ወቅት፣ የገና እና የጥምቀት በዓላት)',
        },
        altitudeMeters: 2630,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 12.0319,
        longitude: 39.0412,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Bete Giyorgis, Bete Medhane Alem, Bete Maryam, Asheten Maryam Monastery',
          am: 'ቤተ ጊዮርጊስ፣ ቤተ መድኃኔዓለም፣ ቤተ ማርያም፣ አስሸተን ማርያም ገዳም',
        },
        idealFor: {
          en: 'Spiritual Travel, Architecture, Photography, Living History',
          am: 'መንፈሳዊ ጉዞ፣ ጥንታዊ አርክቴክቸር፣ ፎቶግራፊ፣ ታሪክ',
        },
        visitDuration: {
          en: '2 to 3 days',
          am: 'ከ2 እስከ 3 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Bete Giyorgis (Church of Saint George)', am: 'ቤተ ጊዮርጊስ' },
          description: {
            en: 'The most iconic church in Lalibela, carved in the form of a symmetrical Greek cross with drainage trenches.',
            am: 'በመስቀል ቅርጽ ከአንድ አለት የተፈለፈለውና እጅግ የሚታወቀው የላሊበላ ውቅር ቤተክርስቲያን።',
          },
          image: mediaMap['lalibela_hero'] || defaultMediaId,
        },
        {
          name: { en: 'Bete Medhane Alem', am: 'ቤተ መድኃኔዓለም' },
          description: {
            en: 'Believed to be the largest monolithic rock-hewn church in the world, surrounded by external carved columns.',
            am: 'በዓለም ላይ ትልቁ ነጠላ የውቅር ቤተክርስቲያን ተብሎ የሚታመን ታላቅ ህንፃ።',
          },
          image: mediaMap['highlands_scenic'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Lalibela Heritage Lodge',
        rating: 5,
        reviewCount: 142,
        category: 'Heritage Hotel',
        description: {
          en: 'Panoramic cliffside views over the Lasta valley with warm Ethiopian hospitality and traditional dining.',
          am: 'የላስታን ሸለቆ የሚያሳይ ውብ እይታ ያለውና ባህላዊ የኢትዮጵያ መስተንግዶ የሚያቀርብ ሆቴል።',
        },
        image: mediaMap['lalibela_hero'] || defaultMediaId,
        link: 'https://example.com/lalibela-heritage',
      },
      gallery: [
        { image: mediaMap['lalibela_hero'] || defaultMediaId, caption: { en: 'Cross of Bete Giyorgis', am: 'የቤተ ጊዮርጊስ የመስቀል ቅርጽ' } },
        { image: mediaMap['lalibela_feast'] || defaultMediaId, caption: { en: 'Festive traditional dining', am: 'የበዓል ባህላዊ ማዕድ' } },
      ],
    },
    {
      key: 'simien-mountains',
      title: {
        en: 'Simien Mountains National Park',
        am: 'የስሜን ተራሮች ብሔራዊ ፓርክ',
      },
      slug: 'simien-mountains',
      region: 'amhara',
      featured: true,
      category: 'wildlife_parks',
      tags: 'National Park, UNESCO Site, Trekking, Endemic Wildlife',
      heroImage: mediaMap['simien_landscape'] || defaultMediaId,
      overview: {
        en: 'A dramatic alpine wilderness of massive sheer escarpments, jagged peaks, and deep valleys often called the Roof of Africa. Home to rare endemic wildlife including the Walia Ibex and friendly troops of Gelada baboons.',
        am: 'የአፍሪካ ጣሪያ ተብሎ የሚጠራው የስሜን ተራሮች ብሔራዊ ፓርክ እጅግ አስደናቂ ገደሎች፣ የአልፓይን ሳር ምድርና የዋሊያ አይቤክስ መኖሪያ ነው።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'October to April (Post-rain wildflowers and clear sky visibility)',
          am: 'ከጥቅምት እስከ ሚያዝያ (አበባ የሚያብብበትና የጠራ አየር ያለበት)',
        },
        altitudeMeters: 4000,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 13.1833,
        longitude: 38.0667,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Ras Dashen Summit, Jinbar Waterfall, Chennek Camp, Gelada troops',
          am: 'ራስ ዳሸን ተራራ፣ የጅንባር ፏፏቴ፣ ጭነክ ካምፕ፣ ጭላዳ ዝንጀሮዎች',
        },
        idealFor: {
          en: 'High-Altitude Trekking, Wildlife Viewing, Nature Photography',
          am: 'የተራራ እግር ጉዞ፣ የዱር እንስሳት እይታ፣ የተፈጥሮ ፎቶግራፍ',
        },
        visitDuration: {
          en: '3 to 6 days',
          am: 'ከ3 እስከ 6 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Jinbar Waterfall Gorge', am: 'የጅንባር ፏፏቴ ገደል' },
          description: {
            en: 'A breathtaking 500-meter vertical drop of water plunging into an abyssal canyon.',
            am: 'ከ500 ሜትር በላይ ከፍታ ወደ ጥልቅ ገደል የሚወርድ አስደናቂ ፏፏቴ።',
          },
          image: mediaMap['simien_landscape'] || defaultMediaId,
        },
        {
          name: { en: 'Chennek Wildlife Lookout', am: 'የጭነክ የዱር እንስሳት መመልከቻ' },
          description: {
            en: 'Prime habitat for spotting the critically endangered Walia Ibex grazing on steep cliffs.',
            am: 'የዋሊያ አይቤክስ ገደላገደል ላይ ሲመገብ የሚታይበት ዋነኛ ቦታ።',
          },
          image: mediaMap['highlands_scenic'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Simien Mountain Lodge',
        rating: 5,
        reviewCount: 98,
        category: 'Eco Luxury Lodge',
        description: {
          en: 'The highest altitude hotel in Africa at 3,260m, featuring solar power and panoramic cliffside dining.',
          am: 'በአፍሪካ ከፍተኛው ሎጅ (3,260 ሜትር)፣ በፀሐይ ኃይል የሚሰራና አስደናቂ የተራራ እይታ ያለው።',
        },
        image: mediaMap['simien_landscape'] || defaultMediaId,
        link: 'https://example.com/simien-lodge',
      },
      gallery: [
        { image: mediaMap['simien_landscape'] || defaultMediaId, caption: { en: 'Escarpment view', am: 'የተራራው ገደል እይታ' } },
        { image: mediaMap['highlands_scenic'] || defaultMediaId, caption: { en: 'Alpine meadow', am: 'የደጋ ሜዳ' } },
      ],
    },
    {
      key: 'gondar',
      title: {
        en: 'Fasil Ghebbi & The Royal Enclosure, Gondar',
        am: 'የፋሲል ግቢና የጎንደር ቤተ መንግሥታት',
      },
      slug: 'gondar-fasil-ghebbi',
      region: 'amhara',
      featured: true,
      category: 'historic_sites',
      tags: 'Historic Site, UNESCO Site, Medieval Castles, Royal Heritage',
      heroImage: mediaMap['gondar_castle'] || defaultMediaId,
      overview: {
        en: 'Known as the Camelot of Africa, Gondar was Ethiopia’s imperial capital from 1636 until the mid-19th century. Fasil Ghebbi encloses magnificent stone castles, banqueting halls, libraries, and the famed painted ceiling of Debre Berhan Selassie.',
        am: 'የአፍሪካ ካሜሎት በመባል የምትታወቀው ጎንደር ከ17ኛው ክፍለ ዘመን ጀምሮ የነገሥታት መዲና የነበረች ሲሆን የፋሲል ግቢ ታላላቅ የድንጋይ ቤተ መንግሥታት መገኛ ናት።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'September to March (Timkat Festival in January is legendary)',
          am: 'ከመስከረም እስከ መጋቢት (በጥር ወር የሚከበረው የጥምቀት በዓል እጅግ ድንቅ ነው)',
        },
        altitudeMeters: 2133,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 12.6083,
        longitude: 37.4667,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Fasilides Castle, Fasilides Bath, Debre Berhan Selassie Church, Kuskuam Complex',
          am: 'የፋሲል ቤተ መንግሥት፣ የፋሲለደስ መዋኛ፣ ደብረ ብርሃን ሥላሴ፣ ቁስቋም',
        },
        idealFor: {
          en: 'Imperial History, Architecture, Cultural Festivals',
          am: 'የንጉሣውያን ታሪክ፣ አርክቴክቸር፣ ባህላዊ በዓላት',
        },
        visitDuration: {
          en: '1 to 2 days',
          am: 'ከ1 እስከ 2 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Debre Berhan Selassie Church', am: 'ደብረ ብርሃን ሥላሴ ቤተክርስቲያን' },
          description: {
            en: 'Famous for its wooden ceiling decorated with hundreds of hand-painted winged angel faces.',
            am: 'በክንፈ-መልአክ ሥዕሎች የተዋበው ዝነኛው የጣሪያ ላይ ቅብ ሥዕል መገኛ።',
          },
          image: mediaMap['gondar_castle'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Goha Hotel Gondar',
        rating: 4,
        reviewCount: 110,
        category: 'Panoramic Hotel',
        description: {
          en: 'Perched high on a hill overlooking the entire historic town and royal castles.',
          am: 'ጎንደር ከተማንና የፋሲል ግቢን በሙሉ ቁልቁል የሚያይ ኮረብታ ላይ የተሰራ ሆቴል።',
        },
        image: mediaMap['gondar_castle'] || defaultMediaId,
        link: 'https://example.com/goha-hotel',
      },
      gallery: [
        { image: mediaMap['gondar_castle'] || defaultMediaId, caption: { en: 'Fasilides Castle', am: 'የዐፄ ፋሲለደስ ግንብ' } },
      ],
    },
    {
      key: 'harar',
      title: {
        en: 'Harar Jugol: The Historic Fortified City',
        am: 'የሐረር ጀጎል ታሪካዊ ግንብ ከተማ',
      },
      slug: 'harar-jugol',
      region: 'harari',
      featured: true,
      category: 'cultural_experiences',
      tags: 'Historic Site, UNESCO Site, Islamic Heritage, Walled City',
      heroImage: mediaMap['harar_alleys'] || defaultMediaId,
      overview: {
        en: 'Considered the fourth holiest city of Islam, Harar Jugol is a maze of 368 narrow alleyways surrounded by 16th-century defensive stone walls. Known for vibrant cultural markets, traditional Harari houses, and the nighttime hyena feeding ritual.',
        am: 'አራተኛዋ የእስልምና ቅድስት ከተማ ተብላ የምትታወቀው ሐረር በ16ኛው ክፍለ ዘመን በተገነባ የጀጎል ግንብ የተከበበች ታሪካዊ ከተማ ናት።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'October to April (Comfortable mild eastern highland weather)',
          am: 'ከጥቅምት እስከ ሚያዝያ (ተስማሚ የአየር ሁኔታ)',
        },
        altitudeMeters: 1885,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 9.3139,
        longitude: 42.1389,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Jugol Wall Gates, Arthur Rimbaud Cultural Center, Hyena Men of Harar, Spice Market',
          am: 'የጀጎል አምስቱ በሮች፣ የአርተር ራምቦ ሙዚየም፣ የጅብ መጋቢዎች፣ የቅመም ገበያ',
        },
        idealFor: {
          en: 'Cultural Immersion, Street Photography, Culinary Exploration',
          am: 'ባህላዊ ልምድ፣ የጎዳና ፎቶግራፍ፣ የምግብ ቅመሞች ፍለጋ',
        },
        visitDuration: {
          en: '2 to 3 days',
          am: 'ከ2 እስከ 3 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Harari Cultural House (Gegar)', am: 'የሐረሪ ባህላዊ ቤት (ጌጋር)' },
          description: {
            en: 'Distinctive interior design featuring elevated platforms, decorative carpets, and woven baskets.',
            am: 'በውብ ምንጣፎችና ባህላዊ ሰፌዶች ያጌጠ ባህላዊ የሐረሪ ቤት።',
          },
          image: mediaMap['harar_alleys'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Harar Heritage Guesthouse',
        rating: 4,
        reviewCount: 65,
        category: 'Traditional Guesthouse',
        description: {
          en: 'Authentic stay inside the ancient walled city in a restored traditional family compound.',
          am: 'በጀጎል ግንብ ውስጥ የሚገኝ ባህላዊና ምቹ የማረፊያ ቤት።',
        },
        image: mediaMap['harar_alleys'] || defaultMediaId,
        link: 'https://example.com/harar-heritage',
      },
      gallery: [
        { image: mediaMap['harar_alleys'] || defaultMediaId, caption: { en: 'Jugol Alleyways', am: 'የጀጎል መንገዶች' } },
      ],
    },
    {
      key: 'bale-mountains',
      title: {
        en: 'Bale Mountains National Park',
        am: 'የባሌ ተራሮች ብሔራዊ ፓርክ',
      },
      slug: 'bale-mountains',
      region: 'oromia',
      featured: false,
      category: 'wildlife_parks',
      tags: 'National Park, Wildlife, Ethiopian Wolf, Cloud Forest',
      heroImage: mediaMap['bale_wildlife'] || defaultMediaId,
      overview: {
        en: 'Encompassing the highest all-weather road in Africa across the Sanetti Plateau, Bale Mountains safeguards the largest remaining population of the critically endangered Ethiopian wolf, surrounded by the magical Harenna cloud forest.',
        am: 'የሳኔቲ አምባንና አስደናቂውን የሃረና ደን ያካተተው የባሌ ተራሮች ፓርክ በዓለም አደገኛ ሁኔታ ላይ የሚገኘው የቀይ ቀበሮ (Ethiopian Wolf) ዋነኛ መኖሪያ ነው።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'November to April (Dry conditions for wildlife tracking on Sanetti)',
          am: 'ከህዳር እስከ ሚያዝያ (ቀይ ቀበሮዎችን ለመከታተል አመቺ)',
        },
        altitudeMeters: 3100,
        isUnescoSite: false,
      },
      coordinates: {
        latitude: 6.8833,
        longitude: 39.75,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Sanetti Plateau, Harenna Forest, Tullu Dimtu (4,377m), Endemic Birds',
          am: 'የሳኔቲ አምባ፣ የሃረና ደን፣ ቱሉ ዲምቱ ተራራ፣ ብርቅዬ ወፎች',
        },
        idealFor: {
          en: 'Birdwatching, Wildlife Tracking, Wilderness Solitude',
          am: 'የአእዋፋት እይታ፣ የዱር እንስሳት ፍለጋ፣ የተረጋጋ የተፈጥሮ ጉዞ',
        },
        visitDuration: {
          en: '3 to 5 days',
          am: 'ከ3 እስከ 5 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Sanetti Plateau Wolf Trail', am: 'የሳኔቲ አምባ የቀይ ቀበሮ መመልከቻ' },
          description: {
            en: 'High alpine plateau over 4,000m where the rare Ethiopian wolf hunts giant mole rats.',
            am: 'ብርቅዬው የኢትዮጵያ ቀይ ቀበሮ የሚገኝበት ከ4,000 ሜትር በላይ ከፍታ ያለው አምባ።',
          },
          image: mediaMap['bale_wildlife'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Bale Mountain Lodge',
        rating: 5,
        reviewCount: 52,
        category: 'Eco Wilderness Lodge',
        description: {
          en: 'Nestled deep in the mystical Harenna cloud forest beside a rushing mountain stream.',
          am: 'በሃረና ደን ውስጥ ከተፈጥሮ ጋር ተስማምቶ የተገነባ የቅንጦት ሎጅ።',
        },
        image: mediaMap['bale_wildlife'] || defaultMediaId,
        link: 'https://example.com/bale-lodge',
      },
      gallery: [
        { image: mediaMap['bale_wildlife'] || defaultMediaId, caption: { en: 'Sanetti Plateau', am: 'የሳኔቲ አምባ' } },
      ],
    },
    {
      key: 'danakil',
      title: {
        en: 'Danakil Depression & Dallol',
        am: 'የዳናኪል ሸለቆና ዳሎል',
      },
      slug: 'danakil-depression',
      region: 'afar',
      featured: false,
      category: 'natural_wonders',
      tags: 'Extreme Travel, Geothermal, Salt Flats, Volcano',
      heroImage: mediaMap['danakil_dallol'] || defaultMediaId,
      overview: {
        en: 'Lying over 100 meters below sea level, the Danakil Depression is one of the hottest and most geologically active places on Earth. Features surreal neon green sulfur springs at Dallol and the active lava lake of Erta Ale.',
        am: 'ከባህር ጠለል በታች ከ100 ሜትር በላይ ዝቅ ብሎ የሚገኘው የዳናኪል ሸለቆ የዳሎል አስደናቂ የማዕድን ምንጮችና የኤርታሌ ንቁ እሳተ ገሞራ መገኛ ነው።',
      },
      travelInfo: {
        bestTimeToVisit: {
          en: 'November to February (Cooler winter temperatures for expeditions)',
          am: 'ከህዳር እስከ የካቲት (የሙቀቱ መጠን መጠነኛ የሚሆንበት ወቅት)',
        },
        altitudeMeters: -125,
        isUnescoSite: false,
      },
      coordinates: {
        latitude: 14.2417,
        longitude: 40.3,
      },
      quickInfo: {
        mainAttractions: {
          en: 'Dallol Hydrothermal Fields, Lake Karum Salt Crust, Erta Ale Volcano, Camel Salt Caravans',
          am: 'የዳሎል ማዕድናት፣ የቃሩም ጨው ሀይቅ፣ ኤርታሌ እሳተ ገሞራ፣ የጨው ግመሎች ቅፍለት',
        },
        idealFor: {
          en: 'Extreme Adventure, Geology, Rare Landscape Photography',
          am: 'ልዩ ጀብዱ፣ ጂኦሎጂ፣ አስገራሚ የመልክዓ ምድር ፎቶግራፊ',
        },
        visitDuration: {
          en: '3 to 4 days',
          am: 'ከ3 እስከ 4 ቀናት',
        },
      },
      attractions: [
        {
          name: { en: 'Dallol Geothermal Springs', am: 'የዳሎል የፍል ማዕድናት' },
          description: {
            en: 'Brilliant neon-yellow and acidic turquoise pools formed by mineral-laden subterranean water.',
            am: 'በደማቅ ቢጫና አረንጓዴ ቀለም የሚያብረቀርቁ ልዩ የተፈጥሮ የማዕድን ገንዳዎች።',
          },
          image: mediaMap['danakil_dallol'] || defaultMediaId,
        },
      ],
      recommendedAccommodation: {
        name: 'Erta Ale Eco Expedition Camp',
        rating: 3,
        reviewCount: 38,
        category: 'Expedition Camp',
        description: {
          en: 'Supported desert basecamp with experienced local Afar guides, security, and stargazing.',
          am: 'በአፋር አስጎብኚዎች የሚመራና ከዋክብት የሚታዩበት የበረሃ ካምፕ።',
        },
        image: mediaMap['danakil_dallol'] || defaultMediaId,
        link: 'https://example.com/danakil-camp',
      },
      gallery: [
        { image: mediaMap['danakil_dallol'] || defaultMediaId, caption: { en: 'Dallol mineral terraces', am: 'የዳሎል ማዕድናት' } },
      ],
    },
  ]

  const destinationMap: Record<string, string> = {}
  for (const dest of destinationsData) {
    const createdDest = await payload.create({
      collection: 'destinations',
      locale: 'all' as any,
      data: {
        title: dest.title,
        slug: dest.slug,
        region: dest.region as any,
        featured: dest.featured,
        category: dest.category as any,
        tags: dest.tags,
        heroImage: dest.heroImage,
        overview: dest.overview,
        content: {
          en: createLexicalDoc([
            createLexicalHeading(`Discover ${dest.title.en}`, 'h2'),
            createLexicalParagraph(dest.overview.en),
            createLexicalHeading('Cultural Context & Visitor Experience', 'h3'),
            createLexicalParagraph(
              'Exploring this legendary destination offers visitors an extraordinary window into Ethiopia’s living heritage, stunning geological formations, and warm local community hospitality.',
            ),
          ]),
          am: createLexicalDoc([
            createLexicalHeading(`የ${dest.title.am} ጉዞ`, 'h2'),
            createLexicalParagraph(dest.overview.am),
            createLexicalHeading('ባህላዊ እሴትና የጉዞ ልምድ', 'h3'),
            createLexicalParagraph(
              'ይህንን ታሪካዊ መዳረሻ መጎብኘት ስለ ኢትዮጵያ ጥንታዊ ስልጣኔ፣ ልዩ የተፈጥሮ ውበትና ህዝባዊ እንግዳ ተቀባይነት ጥልቅ ግንዛቤ ያስጨብጣል።',
            ),
          ]),
        } as any,
        travelInfo: dest.travelInfo,
        coordinates: dest.coordinates,
        quickInfo: dest.quickInfo,
        attractions: dest.attractions as any,
        recommendedAccommodation: dest.recommendedAccommodation as any,
        gallery: dest.gallery as any,
      } as any,
      overrideAccess: true,
      context: { isSeed: true },
    })
    destinationMap[dest.slug] = String(createdDest.id)
    console.log(`Created destination [${dest.slug}]: ID ${createdDest.id}`)
  }

  // 6. SEED ARTICLES
  console.log('\n--- SEEDING EDITORIAL ARTICLES ---')
  const articlesData = [
    {
      title: {
        en: 'The Living Stones of Lalibela: Journey into the New Jerusalem',
        am: 'ሕያዋኑ የላሊበላ ድንጋዮች፡ ወደ አዲሷ ኢየሩሳሌም የተደረገ ጉዞ',
      },
      slug: 'living-stones-of-lalibela',
      heroImage: mediaMap['lalibela_hero'] || defaultMediaId,
      categories: [categoryMap['historical-treasures'], categoryMap['culture-heritage']],
      destinations: [destinationMap['lalibela']],
      excerpt: {
        en: 'Carved straight down into the volcanic bedrock over 800 years ago, Lalibela stands as a testament to faith, endurance, and extraordinary medieval engineering.',
        am: 'ከ800 ዓመታት በፊት ከቀይ እሳተ ገሞራ አለት ተፈልፍለው የተሰሩት የላሊበላ ውቅር አብያተ ክርስቲያናት የእምነት፣ የጽናትና የመካከለኛው ዘመን አስደናቂ የምህንድስና ጥበብ ማሳያ ናቸው።',
      },
      contentEn: [
        createLexicalHeading('A Sanctuary Carved in Silence', 'h2'),
        createLexicalParagraph(
          'Arriving in Lalibela feels like stepping into a biblical vision carved out of stone. Unlike European cathedrals that rise towards the clouds, the holy churches of King Lalibela plunge deep into the earth, concealed within the mountainous heart of northern Ethiopia.',
        ),
        createLexicalQuote(
          '“These churches were not built; they were sculpted from the very bone of the mountain.”',
        ),
        createLexicalHeading('The Architectural Marvel of Bete Giyorgis', 'h2'),
        createLexicalParagraph(
          'Standing at the rim of the trench enclosing Bete Giyorgis (Saint George), the symmetry is breathtaking. Chiseled into a perfect Greek cross, the roof displays three concentric crosses that guide rainwater down carefully sloped gullies. Down below, deep tunnels carved into the bedrock connect the southern and northern clusters of churches.',
        ),
        createLexicalParagraph(
          'During early morning prayers, priests draped in pristine white cotton robes chant in ancient Ge’ez, their voices reverberating through candlelit rock chambers as incense rises toward ceilings chiseled eight centuries ago.',
        ),
      ],
      contentAm: [
        createLexicalHeading('ከአለት የተፈለፈለው የተቀደሰ ሥፍራ', 'h2'),
        createLexicalParagraph(
          'ወደ ላሊበላ መድረስ ከመሬት ተፈልፍሎ የተሰራ ታላቅ መንፈሳዊ ከተማ ውስጥ እንደመግባት ነው። እንደ አውሮፓ አብያተ ክርስቲያናት ወደ ሰማይ የተገነቡ ሳይሆኑ፣ የንጉሥ ላሊበላ ቤተ መቅደሶች ወደ መሬት ጥልቀት ተቀርጸው የተሰሩ ናቸው።',
        ),
        createLexicalHeading('የቤተ ጊዮርጊስ አስደናቂ አሰራር', 'h2'),
        createLexicalParagraph(
          'በመስቀል ቅርጽ ከአንድ አለት የተፈለፈለው የቅዱስ ጊዮርጊስ ቤተክርስቲያን ከላይ ሲታይ እጅግ ማራኪ ነው። ጥንታውያን ሊቃውንትና ካህናት በግዕዝ ዜማ የሚያቀርቡት የምስጋና ጸሎትና የሚጤሰው ዕጣን ይህንን ሥፍራ ልዩ መንፈሳዊ ድባብ ያጎናጽፈዋል።',
        ),
      ],
      readingTimeMinutes: 6,
      featured: true,
      initialViews: 320,
    },
    {
      title: {
        en: 'Roof of Africa: Trekking the High Simien Escarpment',
        am: 'የአፍሪካ ጣሪያ፡ በስሜን ተራሮች ገደላገደል ላይ የተደረገ የእግር ጉዞ',
      },
      slug: 'trekking-simien-mountains',
      heroImage: mediaMap['simien_landscape'] || defaultMediaId,
      categories: [categoryMap['hiking-adventure'], categoryMap['wildlife-nature']],
      destinations: [destinationMap['simien-mountains']],
      excerpt: {
        en: 'A high-altitude hiking odyssey across dramatic cliffs plunging thousands of meters into misty gorges, surrounded by friendly Gelada baboons and rare Walia Ibex.',
        am: 'በሺዎች የሚቆጠሩ ሜትሮች ወደ ጥልቅ ገደል በሚወርዱ አስደናቂ የስሜን ተራሮች ላይ የተደረገ ከፍተኛ የተራራ እግር ጉዞና ብርቅዬ የዱር እንስሳት እይታ።',
      },
      contentEn: [
        createLexicalHeading('The Grand Alpine Wilderness', 'h2'),
        createLexicalParagraph(
          'Trekking above 3,500 meters in the Simien Mountains National Park is an unforgettable adventure. Massive basalt plateaus drop abruptly into vast river canyons below, where distant eagles ride thermal winds above the morning cloud layer.',
        ),
        createLexicalHeading('Encounter with the Vegetarian Primates', 'h2'),
        createLexicalParagraph(
          'Along the ridge near Sankaber, large troops of Gelada baboons graze peacefully on alpine grasses. They are remarkably relaxed around quiet hikers, chattering with expressive facial cues and displaying their bright red chest patches that earn them the nickname “bleeding heart baboons.”',
        ),
        createLexicalParagraph(
          'Higher up near Chennek, lucky travelers will catch glimpses of the Walia Ibex clinging effortlessly to seemingly vertical rock faces, an emblem of Ethiopian natural resilience.',
        ),
      ],
      contentAm: [
        createLexicalHeading('ድንቅ የተፈጥሮ ምድረ በዳ', 'h2'),
        createLexicalParagraph(
          'ከባህር ጠለል በላይ ከ3,500 ሜትር ከፍታ ባለው የስሜን ተራሮች ብሔራዊ ፓርክ ውስጥ መጓዝ ልዩ ልምድ ነው። ጥልቅ ገደሎችና የተንጣለሉ አምባዎች ለተጓዦች አስደናቂ እይታን ይሰጣሉ።',
        ),
        createLexicalParagraph(
          'በተለይም ጭላዳ ዝንጀሮዎች በሰላም ሳር ሲመገቡና የዋሊያ አይቤክስ ገደል ላይ ሲዘል ማየት በኢትዮጵያ ብቻ የሚገኝ የተፈጥሮ በረከት ነው።',
        ),
      ],
      readingTimeMinutes: 8,
      featured: true,
      initialViews: 245,
    },
    {
      title: {
        en: 'The Royal Splendor of Gondar: Africa’s Medieval Camelot',
        am: 'የጎንደር ንጉሣዊ ክብር፡ የአፍሪካ ካሜሎት ቤተ መንግሥት',
      },
      slug: 'royal-splendor-of-gondar',
      heroImage: mediaMap['gondar_castle'] || defaultMediaId,
      categories: [categoryMap['historical-treasures'], categoryMap['culture-heritage']],
      destinations: [destinationMap['gondar-fasil-ghebbi']],
      excerpt: {
        en: 'Step into the 17th century stone castles of Emperor Fasilides and discover the vibrant winged angels decorating the ceiling of Debre Berhan Selassie.',
        am: 'ወደ 17ኛው ክፍለ ዘመን የዐፄ ፋሲለደስ ግንቦች በመግባት የታሪክን ገጾች ይመርምሩ፤ በደብረ ብርሃን ሥላሴ ጣሪያ ላይ የተሳሉትን የመላእክት ቅብ ሥዕሎች ይመልከቱ።',
      },
      contentEn: [
        createLexicalHeading('A Stone Capital in the Highlands', 'h2'),
        createLexicalParagraph(
          'Founded in 1636 by Emperor Fasilides, Gondar broke centuries of nomadic imperial encampments by establishing a fortified permanent stone metropolis. The royal compound, Fasil Ghebbi, features seven castles blending Portuguese, Moorish, and traditional Aksumite architectural styles.',
        ),
        createLexicalHeading('The Angelic Ceiling of Debre Berhan Selassie', 'h2'),
        createLexicalParagraph(
          'No journey to Gondar is complete without visiting Debre Berhan Selassie. As your eyes adjust to the soft golden light inside, you look upward to see more than a hundred winged angel faces painted on wooden crossbeams, each with large, watchful eyes following you across the nave.',
        ),
      ],
      contentAm: [
        createLexicalHeading('የነገሥታት ቋሚ መዲና', 'h2'),
        createLexicalParagraph(
          'በ1636 በዐፄ ፋሲለደስ የተቆረቆረችው ጎንደር ለረጅም ጊዜ የኢትዮጵያ ቋሚ ዋና ከተማ ሆና አገልግላለች። የፋሲል ግቢ ታላላቅ ግንቦች የጥንት ዘመን ስልጣኔ ምስክሮች ናቸው።',
        ),
      ],
      readingTimeMinutes: 5,
      featured: true,
      initialViews: 190,
    },
    {
      title: {
        en: 'Inside Harar Jugol: 368 Alleys and The Hyena Whisperers',
        am: 'በሐረር ጀጎል ውስጥ፡ 368 ጠባብ መንገዶችና የጅብ መጋቢዎች ወግ',
      },
      slug: 'inside-harar-jugol',
      heroImage: mediaMap['harar_alleys'] || defaultMediaId,
      categories: [categoryMap['culture-heritage']],
      destinations: [destinationMap['harar-jugol']],
      excerpt: {
        en: 'Exploring the fortified Islamic oasis of Harar Jugol, where vibrant coffee markets, ancient mosques, and an extraordinary nighttime ritual with wild hyenas coexist.',
        am: 'በጥንታዊቷ የሐረር ጀጎል ግንብ ውስጥ የሚገኙ ደማቅ የገበያ ሥፍራዎችን፣ ጥንታዊ መስጊዶችንና በምሽት የዱር ጅቦችን የመመገብ ባህልን ያስሱ።',
      },
      contentEn: [
        createLexicalHeading('A Labyrinth of Centuries', 'h2'),
        createLexicalParagraph(
          'Wandering the narrow pedestrian lanes of Harar Jugol is a delight for the senses. Whitewashed walls splashed with bright indigo blue and ochre frame doorways adorned with woven baskets and traditional carpets.',
        ),
        createLexicalHeading('The Nightly Truce with Wild Predators', 'h2'),
        createLexicalParagraph(
          'Just outside the ancient city walls as darkness settles, the famed Hyena Men call out to wild spotted hyenas by name. These powerful apex predators emerge peacefully from the shadows, gently taking scraps of meat from short sticks held between the men’s teeth—a centuries-old peaceful pact between humans and wildlife.',
        ),
      ],
      contentAm: [
        createLexicalHeading('የታሪክና የባህል ከተማ', 'h2'),
        createLexicalParagraph(
          'በጀጎል ግንብ ውስጥ በእግር መዘዋወር እጅግ ማራኪ ነው። ደማቅ ቀለማት የተቀቡ ግድግዳዎች፣ የቅመም መዓዛና ጥንታዊ የንግድ መንገዶች ሐረርን ልዩ ያደርጓታል።',
        ),
      ],
      readingTimeMinutes: 7,
      featured: false,
      initialViews: 175,
    },
    {
      title: {
        en: 'The Ritual of Buna: An Authentic Ethiopian Coffee Ceremony',
        am: 'የቡና ሥርዓት፡ እውነተኛው የኢትዮጵያ የቡና አፈላል ባህል',
      },
      slug: 'ritual-of-ethiopian-buna',
      heroImage: mediaMap['coffee_culture'] || defaultMediaId,
      categories: [categoryMap['cuisine-gastronomy'], categoryMap['culture-heritage']],
      destinations: [destinationMap['lalibela'], destinationMap['harar-jugol']],
      excerpt: {
        en: 'Coffee in Ethiopia is not just a drink—it is a spiritual communal ceremony celebrating kinship, peace, and traditional hospitality from bean to cup.',
        am: 'ቡና በኢትዮጵያ መጠጥ ብቻ ሳይሆን ወንድማማችነትን፣ ሰላምንና እንግዳ ተቀባይነትን የሚያጠናክር ታላቅ የህብረት ባህል ነው።',
      },
      contentEn: [
        createLexicalHeading('The Birthplace of Arabica', 'h2'),
        createLexicalParagraph(
          'According to legend, coffee was first discovered by an Ethiopian goat herder named Kaldi in the lush forests of Kaffa. Today, the traditional Buna ceremony remains the heartbeat of daily Ethiopian social connection.',
        ),
        createLexicalHeading('The Three Rounds of Hospitality', 'h2'),
        createLexicalParagraph(
          'The beans are freshly roasted over glowing embers in an iron pan, released with aromatic incense, and ground by hand before brewing in a black clay Jebena pot. Guests are served three distinct rounds: Abol (the first and strongest), Tona (the second brew), and Baraka (the blessing).',
        ),
      ],
      contentAm: [
        createLexicalHeading('የቡና መገኛ ምድር', 'h2'),
        createLexicalParagraph(
          'ኢትዮጵያ የአረቢካ ቡና መገኛ ናት። የቡና ማፍላት ሥርዓት ከጥብስ ጀምሮ እስከ ማፍላትና መመረቅ ድረስ በሦስት ደረጃዎች (አቦል፣ ቶና፣ በረካ) የሚቀርብ ውብ ባህል ነው።',
        ),
      ],
      readingTimeMinutes: 4,
      featured: false,
      initialViews: 210,
    },
    {
      title: {
        en: 'The Otherworldly Wonders of Danakil and Dallol',
        am: 'የዳናኪልና ዳሎል አስደናቂ የተፈጥሮ ድንቆች',
      },
      slug: 'otherworldly-wonders-of-danakil',
      heroImage: mediaMap['danakil_dallol'] || defaultMediaId,
      categories: [categoryMap['hiking-adventure'], categoryMap['wildlife-nature']],
      destinations: [destinationMap['danakil-depression']],
      excerpt: {
        en: 'Surreal neon yellow mineral springs, boiling hydrothermal salt terraces, and vast desert flats at one of the lowest and hottest places on Earth.',
        am: 'ከባህር ጠለል በታች በሚገኘው የዳናኪል ሸለቆ የሚገኙ ደማቅ የማዕድን ምንጮችና አስደናቂ የተፈጥሮ ገጽታዎች።',
      },
      contentEn: [
        createLexicalHeading('A Landscape From Another Planet', 'h2'),
        createLexicalParagraph(
          'Standing on the mineral crust of Dallol feels like visiting another world. Bright neon yellow, lime green, and copper orange sulfur terraces steam under the desert sky as acidic geysers gurgle beneath the salt crust.',
        ),
        createLexicalHeading('Caravans on the Salt Flats', 'h2'),
        createLexicalParagraph(
          'Across the shimmering expanse of Lake Karum, Afar salt miners still cut uniform salt blocks by hand, loading them onto long camel caravans that walk days across the desert following ancient trade routes.',
        ),
      ],
      contentAm: [
        createLexicalHeading('ልዩ የምድር ገጽታ', 'h2'),
        createLexicalParagraph(
          'ዳሎል የተፈጥሮ የማዕድን ቀለማት የሚፈነጩበትና በዓለም ላይ እጅግ አስገራሚ ከሚባሉ የተፈጥሮ ድንቆች አንዱ ነው።',
        ),
      ],
      readingTimeMinutes: 6,
      featured: false,
      initialViews: 160,
    },
    {
      title: {
        en: 'Sanetti Plateau and The Rare Red Wolf of Bale',
        am: 'የሳኔቲ አምባና ብርቅዬው የባሌ ቀይ ቀበሮ',
      },
      slug: 'sanetti-plateau-ethiopian-wolf',
      heroImage: mediaMap['bale_wildlife'] || defaultMediaId,
      categories: [categoryMap['wildlife-nature'], categoryMap['hiking-adventure']],
      destinations: [destinationMap['bale-mountains']],
      excerpt: {
        en: 'Tracking the rarest canid on Earth across the misty Afro-alpine Sanetti Plateau in Bale Mountains National Park.',
        am: 'በዓለም ላይ እጅግ አነስተኛ ቁጥር ያለውን የኢትዮጵያ ቀይ ቀበሮ በባሌ ተራሮች ሳኔቲ አምባ ላይ የመከታተል ጉዞ።',
      },
      contentEn: [
        createLexicalHeading('Into the Alpine Mist', 'h2'),
        createLexicalParagraph(
          'At over 4,000 meters above sea level, the Sanetti Plateau is dotted with giant lobelias standing like sentinels across the tundra. The crisp mountain air and rolling mist create an atmosphere of tranquil isolation.',
        ),
        createLexicalHeading('The Elusive Ethiopian Wolf', 'h2'),
        createLexicalParagraph(
          'With its reddish-orange coat, white markings, and slender build, the Ethiopian wolf is a master hunter of giant mole rats. Spotting one trotting gracefully across the golden grasses is a prize moment for wildlife lovers.',
        ),
      ],
      contentAm: [
        createLexicalHeading('በደጋው አምባ ላይ', 'h2'),
        createLexicalParagraph(
          'የባሌ ተራሮች ሳኔቲ አምባ ብርቅዬውን የኢትዮጵያ ቀይ ቀበሮና ሌሎች የተፈጥሮ እንስሳትን በቅርበት ለማየት ተመራጭ ሥፍራ ነው።',
        ),
      ],
      readingTimeMinutes: 5,
      featured: false,
      initialViews: 140,
    },
    {
      title: {
        en: 'Highland Hospitality: A Guide to Ethiopian Culinary Traditions',
        am: 'የደጋው እንግዳ ተቀባይነት፡ የኢትዮጵያ ባህላዊ ምግቦች መመሪያ',
      },
      slug: 'highland-hospitality-culinary-traditions',
      heroImage: mediaMap['lalibela_feast'] || defaultMediaId,
      categories: [categoryMap['cuisine-gastronomy']],
      destinations: [destinationMap['lalibela'], destinationMap['gondar-fasil-ghebbi']],
      excerpt: {
        en: 'From slow-simmered Doro Wat to vibrant vegan Beyaynetu platters, discover how communal dining reflects Ethiopia’s spirit of togetherness.',
        am: 'ከጣፋጭ የዶሮ ወጥ እስከ ማራኪ የጾም በያይነቱ ማዕድ ድረስ፣ የኢትዮጵያ የምግብ ባህል የአብሮነትና የፍቅር መገለጫ ነው።',
      },
      contentEn: [
        createLexicalHeading('The Sacred Injera Plate', 'h2'),
        createLexicalParagraph(
          'In Ethiopian culture, food is always eaten communally from a single large round platter (gebeta). Soft, slightly sour sourdough flatbread made from ancient teff grain forms both the plate and the utensil.',
        ),
        createLexicalHeading('Gursha: The Gesture of Love', 'h2'),
        createLexicalParagraph(
          'The custom of Gursha—feeding a mouthful of flavorful food directly into the mouth of a friend or honored guest—is a tender expression of affection, respect, and deep social bonds that every traveler will cherish.',
        ),
      ],
      contentAm: [
        createLexicalHeading('የአብሮነት ማዕድ', 'h2'),
        createLexicalParagraph(
          'የኢትዮጵያ የምግብ ባህል በጋራ በአንድ ማዕድ የመብላት ባህል ነው። ጉርሻ ደግሞ የፍቅር፣ የአክብሮትና የቅርርብ መገለጫ ነው።',
        ),
      ],
      readingTimeMinutes: 4,
      featured: false,
      initialViews: 185,
    },
  ]

  const articleMap: Record<string, string> = {}
  for (const art of articlesData) {
    const createdArticle = await payload.create({
      collection: 'articles',
      locale: 'en',
      data: {
        title: art.title.en,
        slug: art.slug,
        heroImage: art.heroImage,
        author: authorId,
        categories: art.categories as any,
        destinations: art.destinations as any,
        excerpt: art.excerpt.en,
        content: createLexicalDoc(art.contentEn) as any,
        readingTimeMinutes: art.readingTimeMinutes,
        featured: art.featured,
        publishedDate: new Date().toISOString(),
        viewCount: art.initialViews,
        commentCount: 0,
        engagementScore: art.initialViews,
        _status: 'published',
        meta: {
          metaTitle: art.title.en.slice(0, 65),
          metaDescription: art.excerpt.en.slice(0, 150),
          ogImage: art.heroImage,
        },
      },
      overrideAccess: true,
      context: {
        disableNewsletter: true,
        internalCounterUpdate: true,
        isSeed: true,
      },
    })

    // Add Amharic translation
    await payload.update({
      collection: 'articles',
      id: createdArticle.id,
      locale: 'am',
      data: {
        title: art.title.am,
        excerpt: art.excerpt.am,
        content: createLexicalDoc(art.contentAm) as any,
        meta: {
          metaTitle: art.title.am.slice(0, 65),
          metaDescription: art.excerpt.am.slice(0, 150),
        },
      },
      overrideAccess: true,
      context: {
        disableNewsletter: true,
        internalCounterUpdate: true,
        isSeed: true,
      },
    })

    articleMap[art.slug] = String(createdArticle.id)
    console.log(`Created article [${art.slug}]: ID ${createdArticle.id}`)
  }

  // 7. SEED ADVERTISEMENTS (Database-driven travel partner ads)
  console.log('\n--- SEEDING ADVERTISEMENTS ---')
  const adsData = [
    {
      title: {
        en: 'Ethiopian Airlines: Fly to Africa’s Historic Wonders',
        am: 'የኢትዮጵያ አየር መንገድ፡ ወደ ታሪካዊቷ ምድር ይብረሩ',
      },
      slug: 'ethiopian-airlines-partner',
      heroImage: mediaMap['partner_logo'] || defaultMediaId,
      status: 'active',
      placement: 'all',
      variant: 'airline',
      sponsorLabel: {
        en: 'OFFICIAL AIRLINE PARTNER',
        am: 'ይፋዊ የአየር መንገድ አጋር',
      },
      ctaText: {
        en: 'Book Your Flights',
        am: 'በረራዎን ያስይዙ',
      },
      ctaLink: '/destinations?category=historic_sites',
      durationValue: 12,
      durationUnit: 'seconds',
      content: {
        en: createLexicalDoc([
          createLexicalParagraph(
            'Connect seamlessly to Lalibela, Gondar, and Dire Dawa with Africa’s largest and most awarded airline network.',
          ),
        ]),
        am: createLexicalDoc([
          createLexicalParagraph(
            'ከአፍሪካ ትልቁ አየር መንገድ ጋር ወደ ላሊበላ፣ ጎንደርና ድሬዳዋ በምቾት ይብረሩ።',
          ),
        ]),
      },
    },
    {
      title: {
        en: 'Simien Mountain Lodge: Luxury at the Edge of the World',
        am: 'ስሜን ማውንቴን ሎጅ፡ በአፍሪካ ከፍተኛው ሎጅ ያርፉ',
      },
      slug: 'simien-mountain-lodge-stay',
      heroImage: mediaMap['simien_landscape'] || defaultMediaId,
      status: 'active',
      placement: 'destination_detail',
      variant: 'lodge',
      sponsorLabel: {
        en: 'FEATURED HIGHLAND STAY',
        am: 'የተመረጠ የተራራ ማረፊያ',
      },
      ctaText: {
        en: 'View Lodge Suites',
        am: 'የሎጁን ክፍሎች ይመልከቱ',
      },
      ctaLink: '/destinations/simien-mountains',
      durationValue: 15,
      durationUnit: 'seconds',
      content: {
        en: createLexicalDoc([
          createLexicalParagraph(
            'Warm log fires, solar heating, and world-class hospitality atop the dramatic Simien escarpment.',
          ),
        ]),
        am: createLexicalDoc([
          createLexicalParagraph(
            'በስሜን ተራሮች አፋፍ ላይ ሞቅ ያለ የእሳት ዳር መስተንግዶና ምቾት ያግኙ።',
          ),
        ]),
      },
    },
    {
      title: {
        en: 'Kuriftu Resort & Spa: Serenity and Traditional Spa Luxury',
        am: 'ኩሪፍቱ ሪዞርትና ስፓ፡ የተፈጥሮ ውበትና እረፍት',
      },
      slug: 'kuriftu-resort-spa-partner',
      heroImage: mediaMap['highlands_scenic'] || defaultMediaId,
      status: 'active',
      placement: 'destination_listing',
      variant: 'lodge',
      sponsorLabel: {
        en: 'CURATED RESORT PARTNER',
        am: 'የተመረጠ የሪዞርት አጋር',
      },
      ctaText: {
        en: 'Explore Lake Lodges',
        am: 'የሐይቅ ዳር ማረፊያዎችን ያስሱ',
      },
      ctaLink: '/destinations',
      durationValue: 10,
      durationUnit: 'seconds',
      content: {
        en: createLexicalDoc([
          createLexicalParagraph(
            'Unwind in handcrafted luxury stone chalets with organic Ethiopian cuisine and rejuvenating lake views.',
          ),
        ]),
        am: createLexicalDoc([
          createLexicalParagraph(
            'ከተፈጥሮ ጋር በተዋሀዱ የድንጋይ ቪላዎች ውስጥ በማረፍ እውነተኛ እረፍት ያድርጉ።',
          ),
        ]),
      },
    },
  ]

  for (const ad of adsData) {
    const createdAd = await payload.create({
      collection: 'title', // Advertisements slug
      locale: 'en',
      data: {
        title: ad.title.en,
        slug: ad.slug,
        heroImage: ad.heroImage,
        status: ad.status as any,
        placement: ad.placement as any,
        variant: ad.variant as any,
        sponsorLabel: ad.sponsorLabel.en,
        ctaText: ad.ctaText.en,
        ctaLink: ad.ctaLink,
        durationValue: ad.durationValue,
        durationUnit: ad.durationUnit as any,
        content: ad.content.en as any,
      },
      overrideAccess: true,
      context: { isSeed: true },
    })

    // Add Amharic translation
    await payload.update({
      collection: 'title',
      id: createdAd.id,
      locale: 'am',
      data: {
        title: ad.title.am,
        slug: ad.slug,
        sponsorLabel: ad.sponsorLabel.am,
        ctaText: ad.ctaText.am,
        content: ad.content.am as any,
      },
      overrideAccess: true,
      context: { isSeed: true },
    })

    console.log(`Created advertisement [${ad.slug}]: ID ${createdAd.id}`)
  }

  // 8. SEED APPROVED COMMENTS & SYNCHRONIZE METRICS
  console.log('\n--- SEEDING READER COMMENTS ---')
  const commentsData = [
    {
      articleSlug: 'living-stones-of-lalibela',
      fullName: 'Dr. Michael Chen',
      email: 'michael.chen@example.com',
      commentText:
        'Walking down into the trench of Bete Giyorgis at dawn was one of the most profound spiritual and architectural moments of my life. The acoustic chanting in the chambers remains unforgettable.',
    },
    {
      articleSlug: 'living-stones-of-lalibela',
      fullName: 'Hiwot Bekele',
      email: 'hiwot.b@example.com',
      commentText:
        'ይህን ጽሑፍ ሳነብ የትውልድ አገሬ ቅርሶች ምን ያህል ጥልቅ ታሪክ እንዳላቸው በድጋሚ አስታወሰኝ። ዝርዝር መረጃውና ፎቶግራፉ እጅግ ድንቅ ነው።',
    },
    {
      articleSlug: 'trekking-simien-mountains',
      fullName: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      commentText:
        'The Gelada baboons are so peaceful! We sat on the cliff edge for an hour watching the troop groom each other while the afternoon mist rolled in. A must-do trek for any hiker.',
    },
    {
      articleSlug: 'royal-splendor-of-gondar',
      fullName: 'Yonas Tadesse',
      email: 'yonas.t@example.com',
      commentText:
        'Debre Berhan Selassie’s ceiling is even more stunning in person. I recommend visiting with a local guide who can explain the symbolism behind the Ethiopian Orthodox paintings.',
    },
    {
      articleSlug: 'ritual-of-ethiopian-buna',
      fullName: 'Elena Rostova',
      email: 'elena.r@example.com',
      commentText:
        'I had my first traditional Buna ceremony in Addis Ababa last year. The frankincense aroma and the fresh popcorn snack completely transformed how I think about coffee.',
    },
    {
      articleSlug: 'inside-harar-jugol',
      fullName: 'Tariq Mansoor',
      email: 'tariq.m@example.com',
      commentText:
        'Harar has a warmth and soul unlike anywhere else. The narrow colorful alleys and the historic friendship between the city and wildlife is remarkable.',
    },
  ]

  const seededArticlesToReconcile = new Set<string>()

  for (const c of commentsData) {
    const targetArticleId = articleMap[c.articleSlug]
    if (!targetArticleId) continue

    await payload.create({
      collection: 'comments',
      locale: 'en',
      data: {
        article: targetArticleId,
        status: 'approved',
        full_name: c.fullName,
        email: c.email,
        commentText: c.commentText,
        body: createLexicalDoc([createLexicalParagraph(c.commentText)]) as any,
      },
      overrideAccess: true,
      context: {
        isSeed: true,
        internalCounterUpdate: true,
      },
    })
    seededArticlesToReconcile.add(targetArticleId)
    console.log(`Created comment by ${c.fullName} on [${c.articleSlug}]`)
  }

  // Synchronize article metrics (commentCount and engagementScore)
  console.log('\n--- SYNCHRONIZING ARTICLE ENGAGEMENT METRICS ---')
  for (const artId of seededArticlesToReconcile) {
    const updatedMetrics = await reconcileArticleMetrics(payload, artId)
    console.log(
      `Reconciled Article ID ${artId}: views=${updatedMetrics.viewCount}, comments=${updatedMetrics.commentCount}, engagementScore=${updatedMetrics.engagementScore}`,
    )
  }

  // 9. SEED SUBSCRIBERS
  console.log('\n--- SEEDING PRIMARY SUBSCRIBER ---')
  // We explicitly seed maytotmat@gmail.com as requested
  await payload.create({
    collection: 'subscribers',
    data: {
      email: 'maytotmat@gmail.com',
      status: 'subscribed',
      locale: 'en',
      source: 'lead_administrator',
    },
    overrideAccess: true,
    context: { isSeed: true },
  })
  console.log('Registered verified subscriber: maytotmat@gmail.com')

  console.log('\n======================================================')
  console.log('✅ PRODUCTION-READY RESET & RESEED COMPLETED SUCCESSFULLY!')
  console.log('======================================================')
  process.exit(0)
}

runSeed().catch((err) => {
  console.error('\n❌ SEED SCRIPT FAILED:', err)
  process.exit(1)
})

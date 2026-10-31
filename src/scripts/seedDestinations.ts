import config from '../payload.config'
import { getPayload } from 'payload'

async function seedDestinations() {
  const payload = await getPayload({ config: await config })

  // Find an available hero image from media
  const mediaList = await payload.find({
    collection: 'media',
    limit: 10,
    overrideAccess: true,
  })

  const defaultMediaId = mediaList.docs[0]?.id

  if (!defaultMediaId) {
    console.error('No media found to associate with destinations. Please upload media first.')
    process.exit(1)
  }

  const lalibelaMedia = mediaList.docs.find((m) => m.filename?.toLowerCase().includes('lalibela'))?.id || defaultMediaId
  const scenicMedia1 = mediaList.docs.find((m) => m.filename?.toLowerCase().includes('gemini') || m.filename?.toLowerCase().includes('photo'))?.id || defaultMediaId
  const scenicMedia2 = mediaList.docs[1]?.id || defaultMediaId
  const scenicMedia3 = mediaList.docs[2]?.id || defaultMediaId
  const scenicMedia4 = mediaList.docs[3]?.id || defaultMediaId

  const destinationsData = [
    {
      title: 'Lalibela',
      slug: 'lalibela',
      region: 'amhara',
      featured: true,
      category: 'historic_sites',
      tags: 'Historic Site, UNESCO Site',
      heroImage: lalibelaMedia,
      overview:
        'Discover the extraordinary rock-hewn churches, a UNESCO World Heritage Site and a testament to Ethiopia’s rich history.',
      travelInfo: {
        bestTimeToVisit: 'October - March',
        altitudeMeters: 2630,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 12.0319,
        longitude: 39.0412,
      },
      quickInfo: {
        mainAttractions: 'Rock-hewn churches, Monasteries, Local culture',
        idealFor: 'Culture, History, Spiritual Travel',
        visitDuration: '2-3 days',
      },
      attractions: [
        {
          name: 'Bete Giyorgis (St. George)',
          description: 'The most iconic church, carved in the shape of a cross.',
          image: lalibelaMedia,
        },
        {
          name: 'Bete Medhane Alem',
          description: 'One of the largest rock-hewn churches in the world.',
          image: scenicMedia1,
        },
        {
          name: 'Monasteries',
          description: 'Historic monasteries with rich spiritual traditions.',
          image: scenicMedia2,
        },
        {
          name: 'Local Culture',
          description: 'Experience the vibrant local culture and traditions.',
          image: scenicMedia3,
        },
      ],
      recommendedAccommodation: {
        name: 'Lalibela Heritage Hotel',
        rating: 5,
        reviewCount: 128,
        category: 'Accommodation',
        description:
          'Traditional hospitality with modern comfort near the historic churches.',
        image: lalibelaMedia,
        link: 'https://example.com/lalibela-heritage',
      },
      gallery: [
        { image: lalibelaMedia, caption: 'Aerial view of Bete Giyorgis carved into the pink granite.' },
        { image: scenicMedia1, caption: 'Priests during liturgical morning prayers inside Bete Medhane Alem.' },
        { image: scenicMedia2, caption: 'Pilgrims dressed in white shemma gathered for the Genna festival.' },
        { image: scenicMedia3, caption: 'Sunset over the rugged Lasta mountains surrounding Lalibela.' },
        { image: scenicMedia4, caption: 'Ancient Ethiopian cross craftsmanship dating to King Lalibela.' },
      ],
    },
    {
      title: 'Simien Mountains',
      slug: 'simien-mountains',
      region: 'amhara',
      featured: true,
      category: 'wildlife_parks',
      tags: 'National Park, Wildlife, Scenic Views',
      heroImage: scenicMedia1,
      overview:
        'Dramatic peaks, rare wildlife, and breathtaking landscapes in Ethiopia’s iconic national park.',
      travelInfo: {
        bestTimeToVisit: 'October - April',
        altitudeMeters: 4533,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 13.1833,
        longitude: 38.0667,
      },
      quickInfo: {
        mainAttractions: 'Ras Dashen, Gelada baboons, Walia ibex, Escarpment views',
        idealFor: 'Trekking, Wildlife Photography, High Altitude Adventure',
        visitDuration: '3-5 days',
      },
      attractions: [
        {
          name: 'Ras Dashen Summit',
          description: 'The highest peak in Ethiopia standing at 4,550 meters.',
          image: scenicMedia1,
        },
        {
          name: 'Gelada Baboon Troop',
          description: 'Encounter the peaceful grass-eating bleeding-heart baboons.',
          image: scenicMedia2,
        },
        {
          name: 'Jinbar Waterfall',
          description: 'A sheer 500m plunge into the deep Geech Abyss.',
          image: scenicMedia3,
        },
        {
          name: 'Imet Gogo Vista',
          description: 'A 360-degree panoramic vista across the jagged ridges.',
          image: scenicMedia4,
        },
      ],
      recommendedAccommodation: {
        name: 'Limalimo Lodge',
        rating: 5,
        reviewCount: 96,
        category: 'Eco Lodge',
        description: 'Sustainable luxury perched on the edge of the Simien escarpment.',
        image: scenicMedia1,
        link: 'https://example.com/limalimo',
      },
      gallery: [
        { image: scenicMedia1, caption: 'Dramatic jagged peaks of the Simien range at sunrise.' },
        { image: scenicMedia2, caption: 'A family of Gelada baboons grazing peacefully.' },
        { image: scenicMedia3, caption: 'Trekking along the edge of the 1,000-meter drop.' },
      ],
    },
    {
      title: 'Danakil Depression',
      slug: 'danakil-depression',
      region: 'afar',
      featured: true,
      category: 'natural_wonders',
      tags: 'Natural Wonder, Adventure, Geology',
      heroImage: scenicMedia2,
      overview:
        'An otherworldly landscape of volcanoes, salt flats, and vibrant hot springs unlike anywhere on Earth.',
      travelInfo: {
        bestTimeToVisit: 'November - February',
        altitudeMeters: 125, // Actually -125m, storing absolute
        isUnescoSite: false,
      },
      coordinates: {
        latitude: 14.2417,
        longitude: 40.3000,
      },
      quickInfo: {
        mainAttractions: 'Erta Ale active lava lake, Dallol acid springs, Lake Karum',
        idealFor: 'Extreme Adventure, Geotourism, Expeditions',
        visitDuration: '3-4 days',
      },
      attractions: [
        {
          name: 'Dallol Hydrothermal Fields',
          description: 'Psychedelic mineral formations of neon yellow and green sulfur.',
          image: scenicMedia2,
        },
        {
          name: 'Erta Ale Shield Volcano',
          description: 'One of the few persistent bubbling lava lakes on the planet.',
          image: scenicMedia3,
        },
        {
          name: 'Lake Karum Salt Flats',
          description: 'Endless white expanse where Afar miners cut salt slabs.',
          image: scenicMedia4,
        },
        {
          name: 'Camel Caravans',
          description: 'Traditional traders hauling salt bars across the desert.',
          image: scenicMedia1,
        },
      ],
      recommendedAccommodation: {
        name: 'Semera Afar Safari Camp',
        rating: 4,
        reviewCount: 64,
        category: 'Desert Camp',
        description: 'Guided expedition camp equipped with open-air star-bed cots.',
        image: scenicMedia2,
        link: 'https://example.com/danakil-camp',
      },
      gallery: [
        { image: scenicMedia2, caption: 'Vibrant neon green and orange mineral springs of Dallol.' },
        { image: scenicMedia3, caption: 'Bubbling lava lake inside Erta Ale crater at midnight.' },
      ],
    },
    {
      title: 'Blue Nile Falls',
      slug: 'blue-nile-falls',
      region: 'amhara',
      featured: false,
      category: 'natural_wonders',
      tags: 'Natural Wonder, Scenic Views, Waterfalls',
      heroImage: scenicMedia3,
      overview:
        'Witness the spectacular power and beauty of the Blue Nile Falls, one of Ethiopia’s most iconic natural wonders.',
      travelInfo: {
        bestTimeToVisit: 'August - November',
        altitudeMeters: 1780,
        isUnescoSite: false,
      },
      coordinates: {
        latitude: 11.4872,
        longitude: 37.5925,
      },
      quickInfo: {
        mainAttractions: 'Tis Abay waterfall, Historic stone bridge, River gorges',
        idealFor: 'Day Hikes, Nature Lovers, Landscape Photography',
        visitDuration: '1 day',
      },
      attractions: [
        {
          name: 'Tis Abay Main Cataract',
          description: 'Known as the "Smoking Water" when mist rises over 50 meters.',
          image: scenicMedia3,
        },
        {
          name: 'Portuguese Bridge',
          description: 'Historic 17th-century stone arch bridge spanning the gorge.',
          image: scenicMedia1,
        },
      ],
      recommendedAccommodation: {
        name: 'Kuriftu Resort & Spa Bahir Dar',
        rating: 5,
        reviewCount: 210,
        category: 'Lakeside Resort',
        description: 'Serene stone bungalows on the shores of Lake Tana.',
        image: scenicMedia3,
        link: 'https://example.com/kuriftu-bahirdar',
      },
      gallery: [
        { image: scenicMedia3, caption: 'Mighty cascade of Tis Abay crashing into the canyon.' },
      ],
    },
    {
      title: 'Aksum',
      slug: 'aksum',
      region: 'tigray',
      featured: false,
      category: 'historic_sites',
      tags: 'Historic Site, Archaeology, Ancient Civilizations',
      heroImage: scenicMedia4,
      overview:
        'Explore the ancient city of Aksum, a center of civilization with remarkable stelae and historical treasures.',
      travelInfo: {
        bestTimeToVisit: 'October - March',
        altitudeMeters: 2131,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 14.1333,
        longitude: 38.7167,
      },
      quickInfo: {
        mainAttractions: 'Northern Stelae Park, St. Mary of Zion, Queen of Sheba Bath',
        idealFor: 'Archaeology, Ancient Civilizations, Sacred Heritage',
        visitDuration: '2 days',
      },
      attractions: [
        {
          name: 'The Great Obelisk of King Ezana',
          description: 'A 24-meter single carved granite obelisk standing for 1,700 years.',
          image: scenicMedia4,
        },
        {
          name: 'Church of Our Lady Mary of Zion',
          description: 'Traditional resting sanctuary of the Ark of the Covenant.',
          image: scenicMedia1,
        },
      ],
      recommendedAccommodation: {
        name: 'Sabean International Hotel',
        rating: 4,
        reviewCount: 82,
        category: 'Heritage Hotel',
        description: 'Modern comfort minutes away from the royal tombs and obelisk park.',
        image: scenicMedia4,
        link: 'https://example.com/sabean-hotel',
      },
      gallery: [
        { image: scenicMedia4, caption: 'Monolithic carved granite stelae rising against the Tigray sky.' },
      ],
    },
    {
      title: 'Omo Valley',
      slug: 'omo-valley',
      region: 'southern_ethiopia',
      featured: false,
      category: 'cultural_experiences',
      tags: 'Culture, Communities, Living Heritage',
      heroImage: scenicMedia1,
      overview:
        'Experience the rich cultural diversity and unique traditions of Ethiopia’s indigenous communities.',
      travelInfo: {
        bestTimeToVisit: 'June - September, December - March',
        altitudeMeters: 500,
        isUnescoSite: true,
      },
      coordinates: {
        latitude: 5.3000,
        longitude: 36.2000,
      },
      quickInfo: {
        mainAttractions: 'Hamar bull jumping, Mursi body art, Karo riverside villages',
        idealFor: 'Cultural Anthropology, Photography, Community Encounters',
        visitDuration: '4-6 days',
      },
      attractions: [
        {
          name: 'Mursi Highlands Village',
          description: 'Home to the renowned clay lip-plate traditions and body scarification.',
          image: scenicMedia1,
        },
        {
          name: 'Hamar Cattle Leaping Ceremony',
          description: 'An ancient rite of passage celebrating courage and community unity.',
          image: scenicMedia2,
        },
      ],
      recommendedAccommodation: {
        name: 'Buska Lodge Turmi',
        rating: 4,
        reviewCount: 75,
        category: 'Eco Lodge',
        description: 'Charming thatched huts nestled in acacia woodland along the Weyto river.',
        image: scenicMedia1,
        link: 'https://example.com/buska-lodge',
      },
      gallery: [
        { image: scenicMedia1, caption: 'Traditional painted ceremonial adornments of the Omo Valley.' },
      ],
    },
  ]

  for (const item of destinationsData) {
    const existing = await payload.find({
      collection: 'destinations',
      where: { slug: { equals: item.slug } },
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      console.log(`Updating existing destination: ${item.title} (${item.slug})`)
      await payload.update({
        collection: 'destinations',
        id: existing.docs[0].id,
        data: item as any,
        overrideAccess: true,
      })
    } else {
      console.log(`Creating new destination: ${item.title} (${item.slug})`)
      await payload.create({
        collection: 'destinations',
        data: item as any,
        overrideAccess: true,
      })
    }
  }

  console.log('Successfully seeded all 6 destinations!')
  process.exit(0)
}

seedDestinations().catch((err) => {
  console.error('Failed to seed destinations:', err)
  process.exit(1)
})

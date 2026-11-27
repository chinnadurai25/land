import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  type ApprovalStatus,
  type FacingDirection,
  type ListingPurpose,
  type PropertyType,
  type RentPeriod,
} from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error(
    'Refusing to seed demo listings in production. Set ALLOW_DEMO_SEED="true" only if intentional.'
  );
  process.exit(1);
}

interface SeedProperty {
  slug: string;
  title: string;
  locality: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  description: string;
  propertyType: PropertyType;
  listingPurpose: ListingPurpose;
  price: number;
  rentPeriod: RentPeriod | null;
  totalAreaSqFt: number;
  facingDirection: FacingDirection;
  roadWidth: string;
  approvalStatus: ApprovalStatus;
  approvalReference: string;
  landmark: string;
  isFeatured: boolean;
  siteImages: { url: string; alt: string }[];
  layoutImage: { url: string; alt: string };
}

const SEED_PROPERTIES: SeedProperty[] = [
  {
    slug: 'bama-nagar-extension-kadachanendhal',
    title: 'BAMA Nagar Extension',
    locality: 'Kadachanendhal',
    city: 'Madurai',
    postalCode: '625107',
    latitude: 9.9721,
    longitude: 78.1536,
    description:
      'Illustrative demo listing: Level residential plot in a calm, developing pocket of Kadachanendhal with good groundwater availability, clear access roads, and quick connectivity to the Ring Road and Othakadai.',
    propertyType: 'LAND_PLOT',
    listingPurpose: 'SALE',
    price: 750000,
    rentPeriod: null,
    totalAreaSqFt: 1200,
    facingDirection: 'EAST',
    roadWidth: '30 ft blacktop road',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo entry — verify original deeds independently',
    landmark: 'Near Kadachanendhal Bus Stop (800 m)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/plot-bama.svg',
        alt: 'BAMA Nagar Extension residential plot view in Kadachanendhal',
      },
      {
        url: '/images/plot-vaigai.jpg',
        alt: 'BAMA Nagar Extension access avenue and boundary stones',
      },
    ],
    layoutImage: {
      url: '/images/layout-east-1200.svg',
      alt: 'Illustrative plot layout diagram for BAMA Nagar Extension (1,200 sq.ft)',
    },
  },
  {
    slug: 'green-valley-avenue-othakadai',
    title: 'Green Valley Avenue',
    locality: 'Othakadai',
    city: 'Madurai',
    postalCode: '625107',
    latitude: 9.9566,
    longitude: 78.1872,
    description:
      'Illustrative demo listing: Well-proportioned North-facing residential plot along a tree-lined avenue in Othakadai, ideal for building a serene family residence close to schools and the High Court bench corridor.',
    propertyType: 'LAND_PLOT',
    listingPurpose: 'SALE',
    price: 1250000,
    rentPeriod: null,
    totalAreaSqFt: 1800,
    facingDirection: 'NORTH',
    roadWidth: '33 ft avenue road',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo entry — verify original deeds independently',
    landmark: 'Near Madurai Bench of Madras High Court (2.1 km)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/plot-green-valley.svg',
        alt: 'Green Valley Avenue plot in Othakadai with avenue trees',
      },
      {
        url: '/images/plot-vaigai.jpg',
        alt: 'Green Valley Avenue approach road view',
      },
    ],
    layoutImage: {
      url: '/images/layout-north-1800.svg',
      alt: 'Illustrative plot layout diagram for Green Valley Avenue (1,800 sq.ft)',
    },
  },
  {
    slug: 'sri-meenakshi-gardens-alanganallur',
    title: 'Sri Meenakshi Gardens',
    locality: 'Alanganallur',
    city: 'Madurai',
    postalCode: '625501',
    latitude: 10.0628,
    longitude: 78.0914,
    description:
      'Illustrative demo listing: Fertile East-facing agricultural parcel surrounded by mature coconut palms and open countryside breezes in Alanganallur, suitable for weekend orchard cultivation or long-term land holding.',
    propertyType: 'AGRI_LAND',
    listingPurpose: 'SALE',
    price: 950000,
    rentPeriod: null,
    totalAreaSqFt: 1500,
    facingDirection: 'EAST',
    roadWidth: '24 ft rural access road',
    approvalStatus: 'NOT_PROVIDED',
    approvalReference: 'Illustrative demo entry — agricultural patta verification advised',
    landmark: 'Near Alanganallur Main Junction (1.5 km)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/agri-meenakshi.svg',
        alt: 'Sri Meenakshi Gardens coconut palms and green land in Alanganallur',
      },
      {
        url: '/images/hero-madurai.svg',
        alt: 'Surrounding Madurai countryside hills near Alanganallur',
      },
    ],
    layoutImage: {
      url: '/images/layout-east-1200.svg',
      alt: 'Illustrative parcel diagram for Sri Meenakshi Gardens (1,500 sq.ft)',
    },
  },
  {
    slug: 'royal-park-residency-thirumangalam',
    title: 'Royal Park Residency',
    locality: 'Thirumangalam',
    city: 'Madurai',
    postalCode: '625706',
    latitude: 9.8235,
    longitude: 77.9866,
    description:
      'Illustrative demo listing: Spacious 2,400 sq.ft West-facing residential plot situated in a fast-growing corridor of Thirumangalam with wide internal streets and easy NH access.',
    propertyType: 'LAND_PLOT',
    listingPurpose: 'SALE',
    price: 1850000,
    rentPeriod: null,
    totalAreaSqFt: 2400,
    facingDirection: 'WEST',
    roadWidth: '40 ft wide main street',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo entry — verify original deeds independently',
    landmark: 'Near Thirumangalam Bypass Road (1.2 km)',
    isFeatured: false,
    siteImages: [
      {
        url: '/images/plot-royal-park.svg',
        alt: 'Royal Park Residency wide residential plot in Thirumangalam',
      },
      {
        url: '/images/plot-vaigai.jpg',
        alt: 'Royal Park Residency demarcated boundary markers',
      },
    ],
    layoutImage: {
      url: '/images/layout-west-2400.svg',
      alt: 'Illustrative plot layout diagram for Royal Park Residency (2,400 sq.ft)',
    },
  },
  {
    slug: 'vaigai-river-view-sholavandan',
    title: 'Vaigai River View',
    locality: 'Sholavandan',
    city: 'Madurai',
    postalCode: '625214',
    latitude: 10.0228,
    longitude: 77.9614,
    description:
      'Illustrative demo listing: Scenic North-facing plot close to the lush Vaigai agricultural belt in Sholavandan, offering fresh air, rich soil, and tranquil countryside views.',
    propertyType: 'LAND_PLOT',
    listingPurpose: 'SALE',
    price: 1650000,
    rentPeriod: null,
    totalAreaSqFt: 2200,
    facingDirection: 'NORTH',
    roadWidth: '30 ft compacted gravel & tar road',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo entry — verify original deeds independently',
    landmark: 'Near Sholavandan Vaigai Bridge (950 m)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/plot-vaigai.jpg',
        alt: 'Vaigai River View riverside plot in Sholavandan',
      },
      {
        url: '/images/plot-green-valley.svg',
        alt: 'Vaigai River View green surroundings',
      },
    ],
    layoutImage: {
      url: '/images/layout-north-1800.svg',
      alt: 'Illustrative plot layout diagram for Vaigai River View (2,200 sq.ft)',
    },
  },
  {
    slug: 'palm-grove-farmlands-melur',
    title: 'Palm Grove Farmlands',
    locality: 'Melur',
    city: 'Madurai',
    postalCode: '625106',
    latitude: 10.0306,
    longitude: 78.3389,
    description:
      'Illustrative demo listing: Expansive 10-cent (4,356 sq.ft) East-facing farmland block in Melur dotted with young palms and peaceful rural vistas, suited for eco-living or farm retreats.',
    propertyType: 'AGRI_LAND',
    listingPurpose: 'SALE',
    price: 2400000,
    rentPeriod: null,
    totalAreaSqFt: 4356,
    facingDirection: 'EAST',
    roadWidth: '25 ft farm access lane',
    approvalStatus: 'NOT_PROVIDED',
    approvalReference: 'Illustrative demo entry — agricultural records check advised',
    landmark: 'Near Melur Arts College Road (3.0 km)',
    isFeatured: false,
    siteImages: [
      {
        url: '/images/agri-palm-grove.svg',
        alt: 'Palm Grove Farmlands lush green acreage in Melur',
      },
      {
        url: '/images/hero-madurai.svg',
        alt: 'Palm Grove Farmlands rural horizon in Melur',
      },
    ],
    layoutImage: {
      url: '/images/layout-west-2400.svg',
      alt: 'Illustrative farmland layout diagram for Palm Grove Farmlands (4,356 sq.ft)',
    },
  },
  {
    slug: 'lotus-garden-home-othakadai',
    title: 'Lotus Garden Home',
    locality: 'Othakadai',
    city: 'Madurai',
    postalCode: '625107',
    latitude: 9.9585,
    longitude: 78.1835,
    description:
      'Illustrative demo listing: Bright, airy South-facing independent 3-bedroom residence in Othakadai featuring a shaded garden courtyard, covered parking, and quiet neighbourhood streets.',
    propertyType: 'RESIDENTIAL_HOME',
    listingPurpose: 'RENT',
    price: 18000,
    rentPeriod: 'MONTHLY',
    totalAreaSqFt: 1600,
    facingDirection: 'SOUTH',
    roadWidth: '30 ft residential street',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo rental entry',
    landmark: 'Near Othakadai Narasingam Road (600 m)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/home-lotus.svg',
        alt: 'Lotus Garden Home exterior with warm ivory facade and garden',
      },
      {
        url: '/images/plot-green-valley.svg',
        alt: 'Lotus Garden Home quiet green street',
      },
    ],
    layoutImage: {
      url: '/images/layout-north-1800.svg',
      alt: 'Illustrative floor-footprint diagram for Lotus Garden Home (1,600 sq.ft)',
    },
  },
  {
    slug: 'city-centre-workspace-madurai',
    title: 'City Centre Workspace',
    locality: 'Madurai',
    city: 'Madurai',
    postalCode: '625020',
    latitude: 9.9252,
    longitude: 78.1198,
    description:
      'Illustrative demo listing: Well-lit East-facing commercial office floor in central Madurai with glass frontage, dedicated visitor parking, and convenient public transit access for growing teams.',
    propertyType: 'COMMERCIAL_SPACE',
    listingPurpose: 'RENT',
    price: 35000,
    rentPeriod: 'MONTHLY',
    totalAreaSqFt: 1200,
    facingDirection: 'EAST',
    roadWidth: '60 ft arterial commercial road',
    approvalStatus: 'PENDING_VERIFICATION',
    approvalReference: 'Illustrative demo commercial rental entry',
    landmark: 'Near Anna Nagar & Goripalayam Junction (1.0 km)',
    isFeatured: true,
    siteImages: [
      {
        url: '/images/commercial-city.svg',
        alt: 'City Centre Workspace modern commercial facade in Madurai',
      },
      {
        url: '/images/home-lotus.svg',
        alt: 'City Centre Workspace paved approach',
      },
    ],
    layoutImage: {
      url: '/images/layout-east-1200.svg',
      alt: 'Illustrative commercial floor layout diagram (1,200 sq.ft)',
    },
  },
];

async function main() {
  console.log('Seeding Landnest illustrative Madurai listings...');

  // Create a non-privileged demo owner user with a random unguessable password
  const randomPassword = crypto.randomBytes(24).toString('hex');
  const demoOwnerHash = await bcrypt.hash(randomPassword, 10);

  const demoOwner = await prisma.user.upsert({
    where: { email: 'demo-curator@landnest.in' },
    update: {
      accountStatus: 'APPROVED',
    },
    create: {
      fullName: 'Landnest Illustrative Curator',
      email: 'demo-curator@landnest.in',
      phone: '+91 452 253 0100',
      passwordHash: demoOwnerHash,
      role: 'USER',
      accountStatus: 'APPROVED',
    },
  });

  for (const item of SEED_PROPERTIES) {
    const location = await prisma.location.upsert({
      where: {
        locality_city: {
          locality: item.locality,
          city: item.city,
        },
      },
      update: {
        postalCode: item.postalCode,
        latitude: item.latitude,
        longitude: item.longitude,
      },
      create: {
        locality: item.locality,
        city: item.city,
        state: 'Tamil Nadu',
        postalCode: item.postalCode,
        latitude: item.latitude,
        longitude: item.longitude,
      },
    });

    const property = await prisma.property.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        locationId: location.id,
        description: item.description,
        propertyType: item.propertyType,
        listingPurpose: item.listingPurpose,
        price: item.price,
        rentPeriod: item.rentPeriod,
        totalAreaSqFt: item.totalAreaSqFt,
        facingDirection: item.facingDirection,
        roadWidth: item.roadWidth,
        approvalStatus: item.approvalStatus,
        approvalReference: item.approvalReference,
        landmark: item.landmark,
        publicationStatus: 'PUBLISHED',
        isFeatured: item.isFeatured,
        isDemo: true,
        publishedAt: new Date(),
      },
      create: {
        ownerId: demoOwner.id,
        locationId: location.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        propertyType: item.propertyType,
        listingPurpose: item.listingPurpose,
        price: item.price,
        rentPeriod: item.rentPeriod,
        totalAreaSqFt: item.totalAreaSqFt,
        facingDirection: item.facingDirection,
        roadWidth: item.roadWidth,
        approvalStatus: item.approvalStatus,
        approvalReference: item.approvalReference,
        landmark: item.landmark,
        publicationStatus: 'PUBLISHED',
        isFeatured: item.isFeatured,
        isDemo: true,
        publishedAt: new Date(),
      },
    });

    // Replace demo images cleanly so seed is repeatable
    await prisma.propertyImage.deleteMany({
      where: { propertyId: property.id, storageKey: { startsWith: 'demo/' } },
    });

    const imageRows = [
      ...item.siteImages.map((img, idx) => ({
        propertyId: property.id,
        storageKey: `demo/${item.slug}-site-${idx}`,
        imageUrl: img.url,
        thumbnailUrl: img.url,
        altText: img.alt,
        category: 'SITE_PHOTO' as const,
        displayOrder: idx,
        isCover: idx === 0,
      })),
      {
        propertyId: property.id,
        storageKey: `demo/${item.slug}-layout`,
        imageUrl: item.layoutImage.url,
        thumbnailUrl: item.layoutImage.url,
        altText: item.layoutImage.alt,
        category: 'LAYOUT' as const,
        displayOrder: item.siteImages.length,
        isCover: false,
      },
    ];

    await prisma.propertyImage.createMany({ data: imageRows });
  }

  console.log(`Seeded ${SEED_PROPERTIES.length} illustrative properties successfully.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

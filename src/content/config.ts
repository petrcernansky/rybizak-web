import { defineCollection, z } from 'astro:content';

const homepage = defineCollection({
  type: 'data',
  schema: z.object({
    logo: z.string().optional(),
    heroHeadline: z.string(),
    heroSubheadline: z.string().optional(),
    heroImage: z.string().optional(),
    reservationLink: z.string().optional(),
    aboutHeadline: z.string().optional(),
    aboutText: z.string().optional(),
    aboutImage: z.string().optional(),
    cardHeadline: z.string().optional(),
    cardText: z.string().optional(),
    cardImage: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    footerImage: z.string().optional(),
    companyInfo: z.string().optional(),
    openingHours: z.array(z.object({
      day: z.string(),
      time: z.string(),
    })).optional(),
    facebookLink: z.string().optional(),
    instagramLink: z.string().optional(),
  }),
});

const benefits = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(), // Vráceno
    icon: z.string().optional(),
  }),
});

const menus = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    priority: z.number().optional(), // Nové
    images: z.array(z.string()),
  }),
});

const staff = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string().optional(),
  }),
});

const concerts = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    poster: z.string().optional(),
  }),
});

export const collections = {
  homepage,
  benefits,
  menus,
  staff,
  concerts,
};
import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: import.meta.env.PROD
    ? {
        kind: 'cloud',
      }
    : {
        kind: 'local',
      },
  cloud: {
    project: 'rybizak/rybizak-web',
  },
  singletons: {
    homepage: singleton({
      label: 'Nastavení webu & Úvod',
      path: 'src/content/homepage/data',
      schema: {
        // --- ZÁKLADNÍ ---
        // --- INFORMAČNÍ LIŠTA (NOVÉ) ---
        infoBannerText: fields.text({
          label: 'Text informační lišty (nahoře)',
          description: 'Např. "Dnes zavřeno". Pokud je prázdné, lišta zmizí.',
        }),
        infoBannerStart: fields.date({
          label: 'Zobrazovat OD (datum)',
          description: 'Nepovinné. Lišta se začne zobrazovat až od tohoto dne.',
        }),
        infoBannerEnd: fields.date({
          label: 'Zobrazovat DO (datum)',
          description: 'Nepovinné. Po tomto datu lišta sama zmizí.',
        }),
        logo: fields.image({
          label: 'Logo',
          directory: 'public/images/brand',
          publicPath: '/images/brand/'
        }),
        
        // --- HERO ---
        heroHeadline: fields.text({ label: 'Hlavní nadpis', defaultValue: 'Rybízák Frýdek-Místek' }),
        heroSubheadline: fields.text({ label: 'Podnadpis', multiline: true }),
        heroImage: fields.image({
          label: 'Úvodní fotka',
          directory: 'public/images/hero',
          publicPath: '/images/hero/'
        }),
        reservationLink: fields.url({ label: 'Odkaz na rezervaci' }),

        // --- O NÁS ---
        aboutHeadline: fields.text({ label: 'Nadpis O nás', defaultValue: 'O naší vinárně' }),
        aboutText: fields.text({ label: 'Text O nás', multiline: true }),
        aboutImage: fields.image({
          label: 'Fotka k sekci O nás',
          directory: 'public/images/about',
          publicPath: '/images/about/'
        }),

        // --- KARTIČKA ---
        cardHeadline: fields.text({ label: 'Nadpis Kartička', defaultValue: 'Věrnostní program' }),
        // Zde používáme multiline, ale v Astru to nastylojueme, aby to bylo menší a hezké
        cardText: fields.text({ label: 'Text o výhodách', multiline: true, description: 'Používejte odřádkování pro oddělení bodů.' }),
        cardImage: fields.image({
          label: 'Obrázek kartičky',
          directory: 'public/images/card',
          publicPath: '/images/card/'
        }),

        // --- KONTAKTY A PATIČKA ---
        address: fields.text({ label: 'Adresa', defaultValue: 'Farní 16, Frýdek-Místek' }),
        phone: fields.text({ label: 'Telefon' }),
        email: fields.text({ label: 'Email' }),
        footerImage: fields.image({
          label: 'Fotka do patičky',
          directory: 'public/images/footer',
          publicPath: '/images/footer/'
        }),
        companyInfo: fields.text({ label: 'Firemní údaje (IČ atd.)', defaultValue: 'Rybízák s.r.o., IČ: 05887461' }),
        openingHours: fields.array(
          fields.object({
            day: fields.text({ label: 'Den' }),
            time: fields.text({ label: 'Čas' }),
          }),
          { label: 'Otevírací doba', itemLabel: props => `${props.fields.day.value}: ${props.fields.time.value}` }
        ),
        facebookLink: fields.url({ label: 'Facebook' }),
        instagramLink: fields.url({ label: 'Instagram' }),
      },
    }),
  },
  collections: {
    benefits: collection({
      label: 'Výhody / Ikony',
      slugField: 'title',
      path: 'src/content/benefits/*',
      schema: {
        title: fields.slug({ name: { label: 'Název' } }),
        // VRÁCENO DESCRIPTION, ABY TO NEHÁZELO CHYBU
        description: fields.text({ label: 'Popis (nepovinné)' }), 
        icon: fields.image({
          label: 'Ikona',
          directory: 'public/images/icons',
          publicPath: '/images/icons/'
        }),
      },
    }),
    menus: collection({
      label: 'Menu (Lístky)',
      slugField: 'title',
      path: 'src/content/menus/*',
      schema: {
        title: fields.slug({ name: { label: 'Název menu' } }),
        // NOVÉ: Priorita pro řazení
        priority: fields.integer({ label: 'Priorita (1 = nejvyšší, nahoře)', defaultValue: 10 }),
        images: fields.array(
          fields.image({
            label: 'Stránka menu',
            directory: 'public/images/menu',
            publicPath: '/images/menu/'
          }),
          { label: 'Stránky' }
        ),
      },
    }),
    staff: collection({
      label: 'Náš tým',
      slugField: 'name',
      path: 'src/content/staff/*',
      schema: {
        name: fields.slug({ name: { label: 'Jméno' } }),
        role: fields.text({ label: 'Pozice' }),
        photo: fields.image({
          label: 'Fotka',
          directory: 'public/images/staff',
          publicPath: '/images/staff/'
        }),
      },
    }),
    concerts: collection({
      label: 'Plakáty Akcí',
      slugField: 'title',
      path: 'src/content/concerts/*',
      schema: {
        title: fields.slug({ name: { label: 'Název akce' } }),
        poster: fields.image({
          label: 'Plakát akce',
          directory: 'public/images/events',
          publicPath: '/images/events/'
        }),
      },
    }),
  },
});
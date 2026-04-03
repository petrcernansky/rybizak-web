import type { APIRoute } from 'astro';

export const prerender = false;

const REVIEW_LOOKBACK_DAYS = 60;
const REVIEW_DASHBOARD_LIMIT = 200;
const REVIEW_DASHBOARD_URL = `https://web.rybizak.cloud/api/vinarna/review/dashboard?limit=${REVIEW_DASHBOARD_LIMIT}`;
const NC_BASE = 'https://app.rybizak.cloud';
const NC_HEADERS = {
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3NzA1ODkzMTIsImV4cCI6MzMzMjgxODkzMTJ9.29n7mNqn-JZ-mUvYdSSXaPC-xrg3XLH_gfA6UPz7vdA',
  'Content-Type': 'application/json',
};

type HomepageReviewApiItem = {
  comment?: string;
  customerName?: string;
  overallScore?: number;
  createdAt?: string;
  visitStart?: string;
};

type HomepageReviewCard = {
  author: string;
  comment: string;
  starLabel: string;
  starValue: number;
  publishedAt: string;
  sortTimestamp: number;
};

type TeamMember = {
  name: string;
  photo: string;
  email: string;
};

type EmpProfile = {
  name: string;
  pozice: string;
  text: string;
  img: string;
  foto: string;
  vino: { nazev: string; kod: string; obrazek: string; url: string } | null;
};

type ShiftPerson = {
  name: string;
  photo: string;
  pozice: string;
  email: string;
};

const normalizeHomepageReviewComment = (value: unknown) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const formatHomepageReviewAuthor = (value: unknown) => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Host';
  const firstName = parts[0];
  const surname = parts.length > 1 ? parts[parts.length - 1] : '';
  return surname ? `${firstName} ${surname.charAt(0).toUpperCase()}.` : firstName;
};

const mapHomepageReviewStars = (score: number) => {
  if (score >= 4) return { label: '5,0', value: 5 };
  if (score >= 3) return { label: '4,5', value: 4.5 };
  return null;
};

const formatHomepageReviewDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Prague',
  }).format(parsed);
};

const getHomepageReviewTimestamp = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

function shiftMinutes(from: string, to: string): number {
  const [fromHours, fromMinutes] = from.split(':').map(Number);
  const [toHours, toMinutes] = to.split(':').map(Number);
  const start = fromHours * 60 + (fromMinutes || 0);
  let end = toHours * 60 + (toMinutes || 0);
  if (end <= start) end += 24 * 60;
  return end - start;
}

async function getReviews() {
  const latestGuestReviews: HomepageReviewCard[] = [];

  try {
    const reviewRes = await fetch(REVIEW_DASHBOARD_URL);
    if (!reviewRes.ok) return latestGuestReviews;

    const reviewJson = await reviewRes.json();
    const reviews: HomepageReviewApiItem[] = Array.isArray(reviewJson?.reviews) ? reviewJson.reviews : [];
    const reviewCutoff = Date.now() - REVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

    return reviews
      .flatMap((review) => {
        const comment = normalizeHomepageReviewComment(review.comment);
        const stars = mapHomepageReviewStars(Number(review.overallScore || 0) || 0);
        const reviewTimestamp = getHomepageReviewTimestamp(review.createdAt || review.visitStart || '');
        if (!comment || !stars || !reviewTimestamp || reviewTimestamp < reviewCutoff) return [];

        return [{
          author: formatHomepageReviewAuthor(review.customerName),
          comment,
          starLabel: stars.label,
          starValue: stars.value,
          publishedAt: formatHomepageReviewDate(review.createdAt || review.visitStart || ''),
          sortTimestamp: reviewTimestamp,
        }];
      })
      .sort((a, b) => b.sortTimestamp - a.sortTimestamp);
  } catch {
    return latestGuestReviews;
  }
}

async function getTeamAndShifts() {
  const teamMembers: TeamMember[] = [];
  const onShiftNow: ShiftPerson[] = [];
  const employeeByEmail = new Map<string, { jmeno: string; foto: string }>();
  const profileByEmail = new Map<string, EmpProfile>();

  try {
    const ncRes = await fetch(`${NC_BASE}/api/zamestnanci:list?pageSize=500`, { headers: NC_HEADERS });
    if (!ncRes.ok) {
      return { teamMembers, onShiftNow, profiles: Object.fromEntries(profileByEmail) };
    }

    const ncJson = await ncRes.json();
    const all: any[] = Array.isArray(ncJson.data) ? ncJson.data : [];

    for (const row of all) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) continue;

      employeeByEmail.set(email, {
        jmeno: String(row.jmeno || '').trim(),
        foto: String(row.foto || '').trim(),
      });

      const aboutText = String(row.o_nas_text || row['o_nas_text'] || '').trim();
      const aboutPosition = String(row.o_nas_pozice || row['o_nas_pozice'] || '').trim();
      const aboutImage = String(row.o_nas_img || row['o_nas_img'] || '').trim();
      const aboutName = String(row.o_nas_jmeno || row['o_nas_jmeno'] || '').trim();
      const wine = row.oblibene_vino || row['oblibene_vino'] || null;

      if (aboutText || aboutPosition || aboutImage) {
        profileByEmail.set(email, {
          name: aboutName || String(row.jmeno || '').trim(),
          pozice: aboutPosition,
          text: aboutText,
          img: aboutImage,
          foto: String(row.foto || '').trim(),
          vino: wine && (wine.nazev || wine.kod_produktu) ? {
            nazev: wine.nazev || '',
            kod: wine.kod_produktu || '',
            obrazek: wine.url_obrazku || '',
            url: wine.url_produktu || '',
          } : null,
        });
      }
    }

    teamMembers.push(
      ...all
        .filter((row) => {
          const current = row.soucasny === true || row.soucasny === 'true' || row.soucasny === 1;
          const worksAtCellar = row['pracuje-na-vinarne'] === true || row['pracuje_na_vinarne'] === true || row.pracuje_na_vinarne === true;
          const cellar = row.vinarna || {};
          const isTester = !!cellar.tester && cellar.tester !== false;
          return current && worksAtCellar && !isTester;
        })
        .map((row) => ({
          name: String(row.jmeno || '').trim(),
          photo: String(row.foto || '').trim(),
          email: String(row.email || '').trim().toLowerCase(),
        }))
        .filter((row) => row.name),
    );

    const nowInPrague = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' }));
    const year = nowInPrague.getFullYear();
    const month = nowInPrague.getMonth() + 1;
    const day = nowInPrague.getDate();
    const nowMinutes = nowInPrague.getHours() * 60 + nowInPrague.getMinutes();

    const shiftsResponse = await fetch(`${NC_BASE}/api/vinarna-smeny:list?pageSize=1&filter[rok]=${year}&filter[mesic]=${month}`, {
      headers: NC_HEADERS,
    });

    if (!shiftsResponse.ok) {
      return { teamMembers, onShiftNow, profiles: Object.fromEntries(profileByEmail) };
    }

    const shiftsJson = await shiftsResponse.json();
    const list: any[] = shiftsJson.data || [];
    if (!list.length) {
      return { teamMembers, onShiftNow, profiles: Object.fromEntries(profileByEmail) };
    }

    const record = list[0];
    let shiftsRaw: Record<string, any> = {};
    try {
      shiftsRaw = typeof record.smeny === 'string' ? JSON.parse(record.smeny) : record.smeny || {};
    } catch {
      shiftsRaw = {};
    }

    const monthlyMinutes = new Map<string, number>();
    for (const dayValue of Object.values(shiftsRaw)) {
      const shiftDay = dayValue as any;
      if (!shiftDay || shiftDay.zavreno || !Array.isArray(shiftDay.shifts)) continue;

      for (const shift of shiftDay.shifts) {
        if (!shift?.od || !shift?.do) continue;
        const duration = shiftMinutes(shift.od, shift.do);
        for (const person of shift.lide || []) {
          if (!person?.email) continue;
          const email = String(person.email).trim().toLowerCase();
          monthlyMinutes.set(email, (monthlyMinutes.get(email) || 0) + duration);
        }
      }
    }

    teamMembers.sort((a, b) => (monthlyMinutes.get(b.email) || 0) - (monthlyMinutes.get(a.email) || 0));

    const currentDay = shiftsRaw[String(day)];
    if (currentDay && !currentDay.zavreno && Array.isArray(currentDay.shifts)) {
      const seen = new Set<string>();

      for (const shift of currentDay.shifts) {
        if (!shift?.od || !shift?.do) continue;

        const [fromHours, fromMinutes] = shift.od.split(':').map(Number);
        const [toHours, toMinutes] = shift.do.split(':').map(Number);
        const shiftStart = fromHours * 60 + (fromMinutes || 0);
        let shiftEnd = toHours * 60 + (toMinutes || 0);
        if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

        if (nowMinutes < shiftStart || nowMinutes >= shiftEnd) continue;

        for (const person of shift.lide || []) {
          if (!person?.email) continue;
          const email = String(person.email).trim().toLowerCase();
          if (seen.has(email)) continue;
          seen.add(email);

          const employee = employeeByEmail.get(email);
          const fullName = String(employee?.jmeno || person.jmeno || '').trim();
          const firstName = fullName.split(/\s+/)[0] || '';
          if (!firstName) continue;

          onShiftNow.push({
            name: firstName,
            photo: employee?.foto || '',
            pozice: String(person.pozice || '').trim(),
            email,
          });
        }
      }
    }
  } catch {
    return { teamMembers, onShiftNow, profiles: Object.fromEntries(profileByEmail) };
  }

  return { teamMembers, onShiftNow, profiles: Object.fromEntries(profileByEmail) };
}

export const GET: APIRoute = async () => {
  const [reviews, teamData] = await Promise.all([getReviews(), getTeamAndShifts()]);

  return new Response(JSON.stringify({
    reviews,
    teamMembers: teamData.teamMembers,
    onShiftNow: teamData.onShiftNow,
    profiles: teamData.profiles,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
};

import type { APIRoute } from 'astro';

export const prerender = false;

/** Stejný řád jako upload PDF do FM webu. */
const MAX_BYTES = 26 * 1024 * 1024;

const ALLOWED_HOSTS = new Set([
    'rybizak.b-cdn.net',
    'www.rybizak.cz',
    'rybizak.cz',
]);

const MARK = '/vinarna-prezentace/';

function isAllowedVinarnaPrezentacePdf(target: URL): boolean {
    const host = target.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) return false;
    if (target.protocol !== 'https:') return false;
    const p = target.pathname.toLowerCase();
    if (p.indexOf(MARK) === -1) return false;
    return /\.pdf($|[?#])/i.test(target.pathname);
}

export const GET: APIRoute = async ({ url }) => {
    const raw = url.searchParams.get('u');
    if (!raw || raw.length > 4096) {
        return new Response('Bad request', { status: 400 });
    }

    let target: URL;
    try {
        target = new URL(raw);
    } catch {
        return new Response('Invalid URL', { status: 400 });
    }

    if (!isAllowedVinarnaPrezentacePdf(target)) {
        return new Response('Forbidden', { status: 403 });
    }

    const upstream = await fetch(target.href, {
        redirect: 'follow',
        headers: { Accept: 'application/pdf,*/*' },
    });

    if (!upstream.ok) {
        return new Response('Upstream error', { status: 502 });
    }

    const cl = upstream.headers.get('content-length');
    if (cl && Number(cl) > MAX_BYTES) {
        return new Response('Payload too large', { status: 413 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
        return new Response('Payload too large', { status: 413 });
    }

    const prefix = new Uint8Array(buf.slice(0, Math.min(1024, buf.byteLength)));
    let okPdf = false;
    if (prefix.length >= 4) {
        const sig = String.fromCharCode(prefix[0], prefix[1], prefix[2], prefix[3]);
        if (sig === '%PDF') okPdf = true;
    }
    if (!okPdf) {
        const head = new TextDecoder('latin1').decode(prefix);
        if (head.indexOf('%PDF') === -1) {
            return new Response('Not a PDF', { status: 415 });
        }
    }

    return new Response(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=86400',
        },
    });
};

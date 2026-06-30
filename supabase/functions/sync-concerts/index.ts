import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://esm.sh/node-html-parser@6";

const SUPA_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY   = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const SECRET     = Deno.env.get("SYNC_SECRET")!;
const CREATED_BY = "puntoticket_auto";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

const CITY_MAP: Record<string,string> = {
  // Comunas de Santiago
  "santiago":"santiago","santiago centro":"santiago","macul":"santiago",
  "las condes":"santiago","huechuraba":"santiago","nunoa":"santiago",
  "ñuñoa":"santiago","la florida":"santiago","providencia":"santiago",
  "maipu":"santiago","maipú":"santiago","pudahuel":"santiago",
  "vitacura":"santiago","lo barnechea":"santiago","cerro colorado":"santiago",
  "cerrillos":"santiago","el bosque":"santiago","la cisterna":"santiago",
  "san miguel":"santiago","peñalolen":"santiago","penalolen":"santiago",
  "recoleta":"santiago","independencia":"santiago","quinta normal":"santiago",
  // Valparaíso
  "valparaíso":"valparaiso","valparaiso":"valparaiso","playa ancha":"valparaiso",
  "quilpué":"quilpue","quilpue":"quilpue",
  "villa alemana":"villa alemana",
  "limache":"limache",
  "quillota":"quillota",
  "san antonio":"san antonio","cartagena":"san antonio","el quisco":"san antonio",
  "casablanca":"casablanca","concón":"concon","concon":"concon",
  // Viña del Mar
  "viña del mar":"vina del mar","vina del mar":"vina del mar","viña":"vina del mar",
  // Otras regiones
  "concepción":"concepcion","concepcion":"concepcion","talcahuano":"concepcion","hualpen":"concepcion","hualpén":"concepcion","coronel":"concepcion","lota":"concepcion",
  "temuco":"temuco","padre las casas":"temuco","lautaro":"temuco",
  "antofagasta":"antofagasta","calama":"antofagasta",
  "iquique":"iquique","alto hospicio":"iquique",
  "la serena":"la serena","coquimbo":"coquimbo","ovalle":"la serena",
  "rancagua":"rancagua","machalí":"rancagua",
  "talca":"talca","curicó":"talca","curico":"talca",
  "chillán":"chillan","chillan":"chillan","chillán viejo":"chillan",
  "osorno":"osorno",
  "puerto montt":"puerto montt","puerto varas":"puerto montt",
  "castro":"castro","ancud":"castro","chiloe":"castro","chiloé":"castro",
  "valdivia":"valdivia","los ríos":"valdivia",
  "punta arenas":"punta arenas","puerto natales":"punta arenas",
  "arica":"arica","tacna":"arica",
  "copiapó":"copiapo","copiapo":"copiapo",
  "coyhaique":"coyhaique",
};

const VENUE_COORDS: Record<string,[number,number]> = {
  // Santiago
  "movistar arena":[-33.4580,-70.6560],"claro arena":[-33.4580,-70.6560],
  "teatro caupolicán":[-33.4570,-70.6480],"teatro caupolican":[-33.4570,-70.6480],
  "teatro coliseo":[-33.4390,-70.6440],"estadio nacional":[-33.4648,-70.6095],
  "espacio riesco":[-33.3930,-70.7780],"arena monticello":[-33.9830,-70.9330],
  "parque o'higgins":[-33.4610,-70.6680],"parque ohiggins":[-33.4610,-70.6680],
  "ex vertice":[-33.4350,-70.6280],"teatro flores":[-33.4520,-70.6550],
  "estadio monumental":[-33.4970,-70.6148],"club hipico":[-33.4660,-70.6760],
  "estadio santa laura":[-33.4380,-70.6560],"parque araucano":[-33.4060,-70.5780],
  "parque ciudad empresarial":[-33.3600,-70.6550],"teatro municipal":[-33.4420,-70.6520],
  "centro arte alameda":[-33.4580,-70.6430],"teatro nescafe de las artes":[-33.4250,-70.6100],
  // Valparaíso
  "teatro trotamundos":[-33.0490,-71.6180],"trotamundos":[-33.0490,-71.6180],
  "club segundo piso":[-33.0460,-71.6140],"segundo piso":[-33.0460,-71.6140],
  "teatro mauri":[-33.0455,-71.6195],"mauri":[-33.0455,-71.6195],
  "sala rivoli":[-33.0465,-71.6160],"rivoli":[-33.0465,-71.6160],
  "vtp":[-33.0380,-71.6280],"valparaiso teatro del puerto":[-33.0380,-71.6280],
  "teatro municipal de valparaiso":[-33.0472,-71.6127],"teatro valparaiso":[-33.0472,-71.6127],
  "anfiteatro viña":[-33.0153,-71.5500],"anfiteatro de viña":[-33.0153,-71.5500],
  "estadio sausalito":[-33.0310,-71.5500],"enjoy viña":[-33.0240,-71.5530],
  "casino viña":[-33.0240,-71.5530],"teatro municipal viña":[-33.0200,-71.5430],
  // Concepción
  "estadio regional":[-36.8270,-73.0500],"teatro concepcion":[-36.8270,-73.0500],
  "teatro universidad de concepcion":[-36.8270,-73.0500],
  // Temuco
  "teatro regional temuco":[-38.7359,-72.5904],
  // Antofagasta
  "teatro municipal antofagasta":[-23.6500,-70.3980],
};

function norm(s:string):string {
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
}

function venueCoords(v:string):[number,number] {
  const n=norm(v);
  for (const [k,c] of Object.entries(VENUE_COORDS))
    if (n.includes(norm(k))) return c;
  return [-33.4489,-70.6693];
}

function cityFromText(text:string):string {
  const n=norm(text);
  for (const [k,v] of Object.entries(CITY_MAP))
    if (n.includes(norm(k))) return v;
  return "santiago";
}

// Recintos conocidos → ciudad (para detectar ciudad aunque no esté en el texto)
const VENUE_TO_CITY: Record<string,string> = {
  "trotamundos":"valparaiso","teatro trotamundos":"valparaiso",
  "segundo piso":"valparaiso","club segundo piso":"valparaiso",
  "teatro mauri":"valparaiso","mauri":"valparaiso",
  "sala rivoli":"valparaiso","rivoli":"valparaiso",
  "vtp":"valparaiso","valparaiso teatro del puerto":"valparaiso",
  "teatro municipal de valparaiso":"valparaiso",
  "anfiteatro viña":"vina del mar","estadio sausalito":"vina del mar",
  "enjoy viña":"vina del mar","casino viña":"vina del mar",
  "teatro municipal viña":"vina del mar",
  "estadio regional concepcion":"concepcion",
};

// Parsea "Teatro Caupolicán - Santiago Centro / Rock" → {venue:"Teatro Caupolicán", city:"santiago"}
function parseVenue(raw:string):{venue:string, city:string} {
  const dashIdx = raw.indexOf(" - ");
  const venueName = dashIdx !== -1 ? raw.slice(0, dashIdx).trim() : raw.trim();

  // Buscar en mapa de recintos conocidos primero
  const vn = norm(venueName);
  for (const [k,c] of Object.entries(VENUE_TO_CITY))
    if (vn.includes(norm(k))) return { venue:venueName, city:c };

  if (dashIdx === -1) return { venue:venueName, city:cityFromText(raw) };
  const rest = raw.slice(dashIdx+3);
  const slashIdx = rest.indexOf(" / ");
  const location = slashIdx !== -1 ? rest.slice(0, slashIdx).trim() : rest.trim();
  const city = cityFromText(location) || cityFromText(venueName);
  return { venue:venueName, city };
}

function parseDate(s:string):string|null {
  if (!s) return null;
  const months:Record<string,string>={
    "ene":"01","feb":"02","mar":"03","abr":"04","may":"05","jun":"06",
    "jul":"07","ago":"08","sep":"09","oct":"10","nov":"11","dic":"12",
    "enero":"01","febrero":"02","marzo":"03","abril":"04","mayo":"05","junio":"06",
    "julio":"07","agosto":"08","septiembre":"09","octubre":"10","noviembre":"11","diciembre":"12",
  };
  const n=norm(s);
  const m=n.match(/(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})(?:[^0-9](\d{2}:\d{2}))?/);
  if (m) {
    const day=m[1].padStart(2,"0");
    const mon=months[m[2].slice(0,3).replace(/[^a-z]/g,"")]??"01";
    const year=m[3], time=m[4]??"20:00";
    return `${year}-${mon}-${day}T${time}:00`;
  }
  // Intenta formato "dd/mm/yyyy"
  const m2=n.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}T20:00:00`;
  return null;
}

interface Concert {
  name:string; venue:string; city:string; address:string|null;
  lat:number; lng:number; starts_at:string; ends_at:string;
  ticket_url:string; price_note:string|null; poster_url:string|null; created_by:string;
}

async function fetchPage(url:string):Promise<string|null> {
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) { console.log(`HTTP ${r.status} para ${url}`); return null; }
    return await r.text();
  } catch(e) { console.error(`Fetch error ${url}:`,e); return null; }
}

async function scrapePuntoTicket():Promise<Concert[]> {
  const concerts:Concert[] = [];
  // PuntoTicket usa la raíz y subcategorías
  const urls = [
    "https://www.puntoticket.com",
    "https://www.puntoticket.com/categoria/musica",
    "https://www.puntoticket.com/categoria/conciertos",
    "https://www.puntoticket.com/categoria/festivales",
    "https://www.puntoticket.com/categoria/teatro",
    "https://www.puntoticket.com/categoria/humor",
    "https://www.puntoticket.com/categoria/infantil",
  ];

  for (const url of urls) {
    const html = await fetchPage(url);
    if (!html) continue;
    console.log(`HTML recibido de ${url}: ${html.length} chars`);

    const doc = parse(html);

    // Estrategia 1: buscar <a> que contengan <h3> (estructura real de PuntoTicket)
    const allLinks = doc.querySelectorAll("a");
    const eventLinks = Array.from(allLinks).filter(a => {
      const h = a.querySelector("h3");
      const img = a.querySelector("img");
      return h && img;
    });

    console.log(`  → ${eventLinks.length} tarjetas de evento encontradas`);

    for (const link of eventLinks.slice(0,60)) {
      const href = link.getAttribute("href")||"";
      if (!href || href==="#" || href.startsWith("javascript")) continue;
      const ticketUrl = href.startsWith("http") ? href : `https://www.puntoticket.com${href}`;

      // Título
      const name = (link.querySelector("h3")?.text||"").trim();
      if (!name || name.length < 3) continue;

      // Imagen (preferir la que viene de ptocdn.net o similar)
      const imgs = link.querySelectorAll("img");
      let posterUrl:string|null = null;
      for (const img of imgs) {
        const src = img.getAttribute("src")||img.getAttribute("data-src")||"";
        if (src.includes("eventos")||src.includes("banner")||src.includes("caluga")) {
          posterUrl = src.startsWith("http") ? src : null;
          break;
        }
      }
      if (!posterUrl) {
        const firstImg = imgs[0];
        const src = firstImg?.getAttribute("src")||"";
        posterUrl = src.startsWith("http") ? src : null;
      }

      // Párrafos: venue y fecha
      const paras = link.querySelectorAll("p");
      const paraTexts = Array.from(paras).map(p=>p.text.trim()).filter(t=>t.length>1);

      let rawVenue = "Por confirmar";
      let dateStr = "";

      if (paraTexts.length >= 2) { rawVenue = paraTexts[0]; dateStr = paraTexts[1]; }
      else if (paraTexts.length === 1) {
        if (/\d/.test(paraTexts[0])) dateStr = paraTexts[0];
        else rawVenue = paraTexts[0];
      }

      // Extrae ciudad del formato "Venue - Ciudad / Categoría"
      const { venue: venueName, city } = parseVenue(rawVenue);
      const [lat,lng] = venueCoords(venueName);

      const startsAt = parseDate(dateStr) || new Date(Date.now()+30*86400000).toISOString();
      const endsAt = new Date(new Date(startsAt).getTime()+3*3600000).toISOString();

      concerts.push({
        name, venue:venueName, city, address:null, lat, lng,
        starts_at:startsAt, ends_at:endsAt, ticket_url:ticketUrl,
        price_note:null, poster_url:posterUrl, created_by:CREATED_BY,
      });
    }

    // Estrategia 2: buscar imágenes de eventos por URL de imagen
    if (eventLinks.length === 0) {
      console.log("  → Estrategia 2: buscar por img src con 'eventos'");
      const eventImgs = Array.from(doc.querySelectorAll("img")).filter(img => {
        const src = img.getAttribute("src")||"";
        return src.includes("eventos")||src.includes("ptocdn");
      });
      console.log(`  → ${eventImgs.length} imágenes de evento`);
      for (const img of eventImgs.slice(0,40)) {
        const parent = img.parentNode as any;
        if (!parent) continue;
        const name = (parent.querySelector?.("h3")?.text || parent.querySelector?.("h2")?.text || "").trim();
        if (!name || name.length < 3) continue;
        const src = img.getAttribute("src")||"";
        concerts.push({
          name, venue:"Por confirmar", city:"santiago", address:null,
          lat:-33.4489, lng:-70.6693,
          starts_at:new Date(Date.now()+30*86400000).toISOString(),
          ends_at:new Date(Date.now()+33*86400000).toISOString(),
          ticket_url:"https://www.puntoticket.com",
          price_note:null,
          poster_url:src.startsWith("http")?src:null,
          created_by:CREATED_BY,
        });
      }
    }
  }

  // Deduplicar y filtrar pasados
  const now = new Date();
  const seen = new Set<string>();
  return concerts.filter(c => {
    const key = `${norm(c.name)}||${c.starts_at.slice(0,10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return new Date(c.starts_at) > now;
  });
}

Deno.serve(async (req:Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== SECRET)
    return new Response("Unauthorized", {status:401});

  const supa = createClient(SUPA_URL, SUPA_KEY);
  const log:string[] = [];

  try {
    // Borrar TODOS los conciertos auto-generados de cualquier fuente anterior
    const AUTO_SOURCES = ["puntoticket_auto","predicthq_auto","ticketmaster_auto","bandsintown_auto"];
    for (const src of AUTO_SOURCES) {
      await supa.from("concerts").delete().eq("created_by", src);
    }
    log.push("✓ Limpieza completa (todas las fuentes auto)");

    log.push("Scraping PuntoTicket...");
    const concerts = await scrapePuntoTicket();
    log.push(`✓ ${concerts.length} conciertos encontrados`);

    if (concerts.length === 0) {
      log.push("⚠️ Sin resultados — revisando logs para diagnóstico");
      return new Response(JSON.stringify({ok:false,log}),{headers:{"Content-Type":"application/json"}});
    }

    let inserted = 0;
    for (let i=0; i<concerts.length; i+=50) {
      const {error:insErr} = await supa.from("concerts").insert(concerts.slice(i,i+50));
      if (insErr) { log.push(`Error lote: ${insErr.message}`); break; }
      inserted += Math.min(50, concerts.length-i);
    }

    log.push(`✅ ${inserted} conciertos insertados`);
    return new Response(JSON.stringify({ok:true,log}),{headers:{"Content-Type":"application/json"}});

  } catch(err) {
    return new Response(JSON.stringify({ok:false,error:String(err),log}),{
      status:500,headers:{"Content-Type":"application/json"},
    });
  }
});

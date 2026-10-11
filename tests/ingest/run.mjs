// Prüft Regionen-Zuordnung, Feed-Auswertung und Aufräumen der Funktion ingest.
// Vorbereitung: node tests/ingest/prepare.mjs  (holt die reinen Funktionen aus supabase/functions/ingest/index.ts)
import { tagRegions, tagItem, relevant, stripHtml, detectLanguage, cleanUrl, parseRss } from "./t.mjs";
const src = (o = {}) => ({ id: "x", name: "x", feed_url: "", kind: "rss", source_type: "international", language: "en", default_regions: [], region_filter: true, strict: false, ...o });
let fails = 0;
const eq = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { fails++; console.log("FAIL", name, "got", g, "want", w); } else console.log("ok  ", name); };
const has = (name, arr, r, yes = true) => eq(name, arr.includes(r), yes);
has("Erebti afar", tagItem("Ethiopia says rebels captured the Afar town of Erebti", null, src()), "afar");
has("Afar and Amhara", tagItem("Offensive pushes into the neighbouring states of Afar and Amhara", null, src()), "afar");
has("Amharic Afar", tagItem("የአፋር ክልል መግለጫ አፋር", null, src()), "afar");
has("Afar’s curly", tagItem("Afar’s governor speaks", null, src()), "afar");
has("from afar", tagItem("Watching the race from afar", null, src()), "afar", false);
has("From Afar title case", tagItem("Love From Afar: A Diaspora Story", null, src()), "afar", false);
has("Bure Amhara not afar", tagItem("Fano fighters near Bure in West Gojjam", null, src()), "afar", false);
has("Houthi airports", tagItem("Yemen's Houthis claim drone attacks on two Saudi airports", null, src()), "red_sea", false);
has("Houthi ship", tagItem("Houthis claim attack on a ship off Yemen", null, src()), "red_sea");
has("Houthi tanker", tagItem("Tanker hit after Houthi threat", null, src()), "red_sea");
has("Bab al-Mandeb", tagItem("Traffic through Bab al-Mandeb falls", null, src()), "red_sea");
has("South Sudan", tagItem("South Sudan votes", null, src()), "horn", false);
has("South-Sudan", tagItem("South-Sudan votes", null, src()), "horn", false);
has("Sudan", tagItem("Sudan army retakes town", null, src()), "horn");
has("Shire River", tagItem("Shire River floods in Malawi", null, src()), "tigray", false);
has("Shire town", tagItem("Displaced families arrive in Shire", null, src()), "tigray");
eq("bulletin", tagItem("Africa joins the data centre backlash", "In tonight’s edition: Eritrea and Ethiopia trade accusations, Sudan...", src()), []);
eq("horn not from snippet", tagItem("Russia, AI and the Central African Republic", "Wagner, Sudan, Mali and more.", src()), []);
has("snippet adds tigray", tagItem("Talks stall", "Mekelle residents say the TPLF left.", src()), "tigray");
eq("wp footer", tagItem("Something else", "Text here. The post Something else appeared first on Eritrea Hub.", src()), []);
eq("epaper", relevant("Haddas Ertra 9 October 2026", "", ["eritrea"], src()), false);
eq("normal relevant", relevant("Eritrea marks anniversary", "", ["eritrea"], src()), true);
eq("strict cabinet", relevant("Prime minister names new cabinet", "", ["ethiopia"], src({ strict: true })), true);
eq("strip escaped html", stripHtml("&lt;span&gt;Hello&lt;/span&gt; world &amp; more &#8217;s"), "Hello world & more ’s");
eq("strip cdata", stripHtml("<![CDATA[<p>Hello <b>there</b></p>]]>"), "Hello there");
eq("lang hashtag", detectLanguage("#ትሰማ Unmasks a Power Struggle Over Culture in Ethiopia", src({ source_type: "ethiopian_independent" })), "en");
eq("lang geez", detectLanguage("ሓበሬታ ፈተነ ኣርእስቲ", src({ source_type: "government_er", language: "mixed" })), "ti");
eq("lang amharic", detectLanguage("የኢትዮጵያ መንግሥት መግለጫ", src({ source_type: "ethiopian_independent", language: "mixed" })), "am");
eq("lang arabic", detectLanguage("عنوان تجريبي", src({ language: "mixed" })), "ar");
eq("lang mixed latin", detectLanguage("Plain English", src({ language: "mixed" })), "en");
eq("clean traffic_source", cleanUrl("https://www.aljazeera.com/news/2026/10/9/x?traffic_source=rss"), "https://www.aljazeera.com/news/2026/10/9/x");
eq("clean maca", cleanUrl("https://www.dw.com/en/x/a-1?maca=en-rss-en-africa-2088-xml-mrss"), "https://www.dw.com/en/x/a-1");
eq("clean keep id", cleanUrl("https://e.com/a?id=5&utm_source=x"), "https://e.com/a?id=5");
const rss = `<?xml version="1.0"?><rss><channel><title>T</title>
<item><title>Eritrea &amp; Ethiopia talk</title><link>https://e.com/1</link><description><p>Mekelle <b>news</b></p></description><pubDate>Thu, 09 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title><![CDATA[Asmara <em>update</em>]]></title><link>https://e.com/2</link><description><![CDATA[<p>About Asmara</p>]]></description></item>
</channel></rss>`;
const r = parseRss(rss, src());
eq("rss count", r.length, 2);
eq("rss title entity", r[0]?.title, "Eritrea & Ethiopia talk");
eq("rss snippet html", r[0]?.snippet, "Mekelle news");
eq("rss regions", r[0]?.regions.sort(), ["eritrea", "ethiopia", "tigray"]);
eq("rss cdata title", r[1]?.title, "Asmara update");
const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
<entry><title type="html">Eritrea news</title><link rel="replies" href="https://e.com/c#comments"/><link rel="alternate" href="https://e.com/a"/><updated>2026-10-09T10:00:00Z</updated><summary>Short</summary></entry>
<entry><title>Asmara note</title><link rel="edit" href="https://e.com/edit/9"/><link href="https://e.com/b"/></entry></feed>`;
const a = parseRss(atom, src());
eq("atom alternate", a[0]?.url, "https://e.com/a");
eq("atom title attr", a[0]?.title, "Eritrea news");
eq("atom no-rel", a[1]?.url, "https://e.com/b");
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
const extra = () => {
  let f = 0; const chk = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { f++; console.log("FAIL", n, JSON.stringify(g)); } else console.log("ok  ", n); };
  chk("withdraw from Afar", tagItem("Ethiopian troops withdraw from Afar", null, src()).includes("afar"), true);
  chk("families from Afar", tagItem("Displaced families from Afar arrive in Mekelle", null, src()).includes("afar"), true);
  chk("Love From Afar", tagItem("Love From Afar: A Diaspora Story", null, src()).includes("afar"), false);
  chk("the Horn", tagItem("War in the Horn: America's dilemma", null, src()).includes("horn"), true);
  chk("car horn", tagItem("Drivers sound the horn in protest", null, src()).includes("horn"), false);
  for (const v of ["Bab el Mandab", "Bab-el-Mandab", "Bab al Mandab", "Bab el-Mandeb", "bab al-mandab"]) chk("bab " + v, tagItem(`Ships avoid ${v}`, null, src()).includes("red_sea"), true);
  chk("Houthi destroyer", tagItem("Houthis target US destroyer", null, src()).includes("red_sea"), true);
  const r = parseRss(`<rss><channel><item><title>Eritrea note</title><link>https://e.com/a?x=1&amp;utm_source=y</link></item></channel></rss>`, src());
  chk("link entities", r[0]?.url, "https://e.com/a?x=1");
  console.log(f ? `${f} EXTRA FAILED` : "EXTRA PASSED");
};
extra();

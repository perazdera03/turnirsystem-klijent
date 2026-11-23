import { ref } from "vue";

//kljuc pod kojim se pismo pamti u browseru
const KLJUC = "pismo";

//cita sacuvano pismo u local storage. ako ne radi local storage (ili ako nema nista sacuvano), try and catch vraca latinicu, a inace je u cirilicu
const procitaj = () => {
  try {
    return localStorage.getItem(KLJUC) === "cir" ? "cir" : "lat";
  } catch {
    return "lat";
  }
};

//dinamicka vrednost. koje je trenutno pismo (cirilica ili latinica)
export const pismo = ref(procitaj());

//tabela slova. ovako prebacujemo slova iz latinice na cirilicu
const MAPA = {
  a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ", e: "е", f: "ф", g: "г",
  h: "х", i: "и", j: "ј", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", r: "р",
  s: "с", š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
};
//slova sa dva znaka se pretvaraju u jedno slovo iz cirilice
const DIGRAFI = { lj: "љ", nj: "њ", dž: "џ" };

//izuzeci reci koje funkcija ne prevodi odmah, vec rucno menjamo kako se pise, pa tek onda se menja
const IZUZECI = [[/system/gi, (m) => (m[0] === "S" ? "Sistem" : "sistem")]];

//funkcija koja prevodi iz latinice u cirilicu. svako slovo se prevodi, veliko ili malo
export const latUCir = (tekst) => {
  for (const [obrazac, zamena] of IZUZECI) tekst = tekst.replace(obrazac, zamena);
  let rez = "";
  for (let i = 0; i < tekst.length; i++) {
    const znak = tekst[i];
    const dva = (znak + (tekst[i + 1] || "")).toLowerCase();

    if (DIGRAFI[dva]) {
      const slovo = DIGRAFI[dva];
      rez += znak !== znak.toLowerCase() ? slovo.toUpperCase() : slovo;
      i++;
      continue;
    }

    const mala = znak.toLowerCase();
    if (MAPA[mala]) {
      rez += znak !== mala ? MAPA[mala].toUpperCase() : MAPA[mala];
    } else {
      rez += znak;
    }
  }
  return rez;
};

//elementi koji se tekst ne dira jer bi puko program
const ZABRANJENI = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE"]);
//atributi koji se takodje prebacuju
const ATRIBUTI = ["placeholder", "title", "aria-label"];
const SELEKTOR = ATRIBUTI.map((a) => `[${a}]`).join(",");

//pamti se originalni tekst u latinici kako bi mogli bez problema da se vratimo nazad
const origTekst = new WeakMap();
const origAtribut = new WeakMap();
let posmatrac = null;
let origNaslov = "";

//funkcija koja proverava da li sme da se element prevede. ako ima element data-bez-pisma, preskace se
const dozvoljen = (cvor) => {
  const element = cvor.nodeType === 3 ? cvor.parentElement : cvor;
  if (!element) return false;
  if (ZABRANJENI.has(element.tagName)) return false;
  return !element.closest("[data-bez-pisma]");
};

//prebacuje tekst iz nekog cvora u drugo pismo
const tekstCvor = (cvor, prepisi) => {
  if (!dozvoljen(cvor)) return;
  const tekst = cvor.nodeValue;
  if (!tekst || !tekst.trim()) return;
  if (prepisi || !origTekst.has(cvor)) origTekst.set(cvor, tekst);
  const nov = latUCir(origTekst.get(cvor));
  if (nov !== cvor.nodeValue) cvor.nodeValue = nov;
};

//prebacuje atribute (kao sto su placeholder, title, aria-label) stranice nekog elementa u drugo pismo
const atributiElementa = (element, prepisi, samo) => {
  if (!dozvoljen(element)) return;
  let mapa = origAtribut.get(element);
  if (!mapa) {
    mapa = new Map();
    origAtribut.set(element, mapa);
  }
  for (const atribut of ATRIBUTI) {
    if (samo && atribut !== samo) continue;
    if (!element.hasAttribute(atribut)) continue;
    const vrednost = element.getAttribute(atribut);
    if (prepisi || !mapa.has(atribut)) mapa.set(atribut, vrednost);
    const nov = latUCir(mapa.get(atribut));
    if (nov !== vrednost) element.setAttribute(atribut, nov);
  }
};

//proverava sve elemente ispod korena i prebacuje ih u drugo pismo
const konvertujSve = (koren, prepisi = false) => {
  if (koren.nodeType === 3) {
    tekstCvor(koren, prepisi);
    return;
  }
  if (koren.nodeType !== 1) return;

  const setac = document.createTreeWalker(koren, NodeFilter.SHOW_TEXT);
  let cvor;
  while ((cvor = setac.nextNode())) tekstCvor(cvor, prepisi);

  if (koren.matches && koren.matches(SELEKTOR)) atributiElementa(koren, prepisi);
  koren.querySelectorAll(SELEKTOR).forEach((el) => atributiElementa(el, prepisi));
};

//funkcija da se vrati na latinicu
const vratiSve = (koren) => {
  const setac = document.createTreeWalker(koren, NodeFilter.SHOW_TEXT);
  let cvor;
  while ((cvor = setac.nextNode())) {
    if (origTekst.has(cvor)) {
      cvor.nodeValue = origTekst.get(cvor);
      origTekst.delete(cvor);
    }
  }
  koren.querySelectorAll(SELEKTOR).forEach((el) => {
    const mapa = origAtribut.get(el);
    if (!mapa) return;
    for (const [atribut, vrednost] of mapa) el.setAttribute(atribut, vrednost);
    origAtribut.delete(el);
  });
};

//funkcija kad se izvrsi promena u nekoj stranici, pa se odmah prebacuje u drugo pismo
const naPromeni = (zapisi) => {
  if (pismo.value !== "cir") return;
  for (const zapis of zapisi) {
    if (zapis.type === "characterData") {
      tekstCvor(zapis.target, true);
    } else if (zapis.type === "attributes") {
      atributiElementa(zapis.target, true, zapis.attributeName);
    } else {
      zapis.addedNodes.forEach((novi) => konvertujSve(novi, false));
    }
  }
  posmatrac.takeRecords();
};

//funkcija koja prevodi celu stranicu izabranim pismom
const primeni = () => {
  const cir = pismo.value === "cir";
  document.documentElement.lang = cir ? "sr-Cyrl" : "sr-Latn";
  if (cir) konvertujSve(document.body, false);
  else vratiSve(document.body);
  document.title = cir ? latUCir(origNaslov) : origNaslov;
  if (posmatrac) posmatrac.takeRecords();
};

//funkcija koja posmatra promene u stranici, a ukljucuje se samo jednom iz main.js 
export const inicijalizujPismo = () => {
  origNaslov = document.title;
  posmatrac = new MutationObserver(naPromeni);
  posmatrac.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATRIBUTI,
  });
  primeni();
};

//funkcija prebacenja izmedju cirilice i latinice. pamti se izbor
export const promeniPismo = () => {
  pismo.value = pismo.value === "cir" ? "lat" : "cir";
  try {
    localStorage.setItem(KLJUC, pismo.value);
  } catch {
  }
  primeni();
};

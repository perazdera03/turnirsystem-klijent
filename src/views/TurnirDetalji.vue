<script setup>
// stranica jednog turnira: prijava ekipa, grupe i tabele, mecevi, eliminacioni kostur i prozori za rezultat i termin
// alati koje stranica koristi: ref (pamti vrednost), computed (sama racuna vrednost iz drugih), onmounted (radi kad se stranica otvori)
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
// axios salje zahteve serveru (pozive na /api/...)
import axios from "axios";
// toast prikazuje malu poruku u uglu (uspeh ili greska)
import { toast } from "vue3-toastify";
import { useRoute } from "vue-router";
import { porukaGreske } from "@/utils/greske.js";
// prijavljen je true ako je admin prijavljen, a false ako je posetilac
import { prijavljen } from "@/utils/auth.js";

const route = useRoute();
// id turnira iz adrese stranice (npr. /turniri/5)
const id = route.params.id;

// podaci koje stranica prikazuje. ucitavaju se sa servera, a prazni su dok se ne ucitaju
const turnir = ref(null);
const ekipe = ref([]);
const grupe = ref([]);
const mecevi = ref([]);
const tabele = ref({});
const eliminacija = ref([]);
const kosturPotvrdjen = ref(false);
const plasman = ref({ zavrsen: false });
// sve ekipe u bazi (da admin moze da bira koje prijavljuje)
const dostupneEkipe = ref([]);

// kompaktan prikaz kostura; sam se ukljuci za velike kosture (5 ili vise kola)
const kompaktno = ref(false);
let kompaktnoPostavljeno = false;

// ucitava sve podatke turnira sa servera odjednom (turnir, ekipe, grupe, mecevi, kostur). tiho = ne prikazuje gresku, koristi se kod automatskog osvezavanja
const fetchAll = async (tiho = false) => {
  try {
    const [turnirRes, ekipeRes, grupeRes, meceviRes, eliminacijaRes, statusRes, plasmanRes, sveEkipeRes] = await Promise.all([
      axios.get(`/api/Turniri/${id}`),
      axios.get(`/api/TurnirEkipe/${id}`),
      axios.get(`/api/Grupe/${id}`),
      axios.get(`/api/Mecevi/${id}`),
      axios.get(`/api/Eliminacija/${id}`),
      axios.get(`/api/Eliminacija/${id}/status`),
      axios.get(`/api/Eliminacija/${id}/plasman`),
      axios.get("/api/Ekipe"),
    ]);
    turnir.value = turnirRes.data;
    ekipe.value = ekipeRes.data;
    grupe.value = grupeRes.data;
    mecevi.value = meceviRes.data;
    eliminacija.value = eliminacijaRes.data;
    kosturPotvrdjen.value = statusRes.data.potvrdjen;
    plasman.value = plasmanRes.data;
    dostupneEkipe.value = sveEkipeRes.data;

    if (!kompaktnoPostavljeno && eliminacija.value.length > 0) {
      const kolaBroj = new Set(eliminacija.value.filter(k => k.brojKola > 0).map(k => k.brojKola)).size;
      kompaktno.value = kolaBroj >= 5;
      kompaktnoPostavljeno = true;
    }

    // za svaku grupu ucitava i njenu tabelu
    for (const grupa of grupeRes.data) {
      const tabelaRes = await axios.get(`/api/Tabela/${grupa.grupaId}`);
      tabele.value[grupa.grupaId] = tabelaRes.data;
    }
  } catch (error) {
    if (!tiho) toast.error(porukaGreske(error, "Greška pri učitavanju podataka."));
  }
};

// automatsko osvezavanje (fz-16): ne dira stranicu dok je otvoren prozor ili forma
let osvezavanje = null;
// osvezavanje se preskace ako je tab skriven ili je otvoren prozor ili forma, da se ne prekine unos
const mozeDaSeOsvezi = () =>
  !document.hidden &&
  !rezModal.value &&
  !terminModal.value &&
  !rucnoOtvoreno.value &&
  urediGrupaId.value === null &&
  odabraneEkipe.value.length === 0;

// maksimalan broj ekipa za ovaj turnir
// computed = vrednost koja se sama preracuna kad se promene podaci od kojih zavisi
const maxEkipa = computed(() => {
  if (!turnir.value) return 0;
  return turnir.value.brojGrupa * turnir.value.brojEkipaPoGrupi;
});

// najmanje ekipa potrebno za grupe: svaka grupa bar 2 ekipe i bar onoliko koliko prolazi dalje
const minPoGrupi = computed(() => {
  if (!turnir.value) return 2;
  return Math.max(2, turnir.value.brojKvalifikovanih);
});

const minEkipa = computed(() => {
  if (!turnir.value) return 0;
  return turnir.value.brojGrupa * minPoGrupi.value;
});

// opis raspodele, npr. "grupe ce imati 3 do 4 ekipe" kad n nije deljivo sa g
const raspodelaOpis = computed(() => {
  if (!turnir.value || turnir.value.brojGrupa < 1) return "";
  const g = turnir.value.brojGrupa;
  const n = ekipe.value.length;
  const manja = Math.floor(n / g);
  const veca = Math.ceil(n / g);
  return manja === veca ? `svaka grupa ima ${manja} ekipe` : `grupe će imati ${manja} ili ${veca} ekipe`;
});

// preostala mesta
const preostalaMesta = computed(() => {
  return maxEkipa.value - ekipe.value.length;
});

// ekipe koje nisu jos prijavljene na turnir
const neprijavljeneEkipe = computed(() => {
  const prijavljeniIds = ekipe.value.map(e => e.ekipaId);
  return dostupneEkipe.value.filter(e => !prijavljeniIds.includes(e.ekipaId));
});

// da li su svi mecevi grupne faze zavrseni
// faza 0 = grupni mecevi, status 1 = zavrsena
const sviGrupniMeceviZavrseni = computed(() => {
  const grupni = mecevi.value.filter(m => m.faza === 0);
  return grupni.length > 0 && grupni.every(m => m.status === 1);
});

// ekipe koje je admin cekirao za prijavu
const odabraneEkipe = ref([]);

// prijavljuje izabrane ekipe na turnir, jednu po jednu
const prijavaViseEkipa = async () => {
  if (odabraneEkipe.value.length === 0) return;
  if (odabraneEkipe.value.length > preostalaMesta.value) {
    toast.error(`Možeš prijaviti najviše ${preostalaMesta.value} ekipa!`);
    return;
  }
  try {
    for (const ekipaId of odabraneEkipe.value) {
      await axios.post("/api/TurnirEkipe", {
        turnirId: parseInt(id),
        ekipaId: parseInt(ekipaId),
      });
    }
    toast.success(`${odabraneEkipe.value.length} ekipa prijavljeno!`);
    odabraneEkipe.value = [];
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri prijavi ekipa."));
    await fetchAll();
  }
};

// skida ekipu sa turnira (klik na x pored imena)
const odjaviEkipu = async (turnirEkipaId) => {
  try {
    await axios.delete(`/api/TurnirEkipe/${turnirEkipaId}`);
    toast.success("Ekipa odjavljena!");
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri odjavi ekipe."));
  }
};

// grupise meceve po grupi
const meceviPoGrupi = computed(() => {
  const grupni = mecevi.value.filter(m => m.faza === 0);
  const mapa = {};
  for (const mec of grupni) {
    if (!mapa[mec.grupa]) mapa[mec.grupa] = [];
    mapa[mec.grupa].push(mec);
  }
  return mapa;
});

// da li su svi mecevi jedne grupe zavrseni
const sviMeceviGrupeZavrseni = (oznaka) => {
  const meceviGrupe = meceviPoGrupi.value[oznaka] || [];
  return meceviGrupe.length > 0 && meceviGrupe.every(m => m.status === 1);
};

// da li ekipa u tabeli prolazi dalje (fz-10): grupa mora biti zavrsena, a ekipa medju prvih n
const prolaziDalje = (grupa, index) => {
  if (!turnir.value) return false;
  return sviMeceviGrupeZavrseni(grupa.oznaka) && index < turnir.value.brojKvalifikovanih;
};

// kostur: kolone kola, od prvog kola do finala (na kraju mec za trece mesto, kolo 0)
const kosturKolone = computed(() => {
  // od prvog kola ka finalu; mec za trece mesto (kolo 0) ide ispred finala
  // trece mesto (0) se samo za redosled racuna kao 1.5, da dodje pre finala (1)
  const redniBroj = (b) => (b === 0 ? 1.5 : b);
  // spisak kola poredjan od prvog ka finalu (veci broj kola = ranije kolo)
  const brojevi = [...new Set(eliminacija.value.map(k => k.brojKola))].sort((a, b) => redniBroj(b) - redniBroj(a));
  return brojevi.map(brojKola => ({
    brojKola,
    kola: eliminacija.value
      .filter(k => k.brojKola === brojKola)
      .sort((a, b) => a.pozicija - b.pozicija),
  }));
});

// dok se ne odigra mec za trece mesto, finale ceka
const treceNeodigrano = computed(() => {
  const t = eliminacija.value.find(x => x.brojKola === 0);
  return !!t && t.pobednikId === null;
});

// da li je sledeci mec u kosturu vec odigran (tada se ovaj vise ne sme menjati)
const sledeciOdigran = (k) => {
  // trece mesto se zakljucava kad se odigra finale
  if (k.brojKola === 0) {
    const f = eliminacija.value.find(x => x.brojKola === 1);
    return !!f && f.pobednikId !== null;
  }
  if (k.brojKola <= 1) return false; // finale nema sledeci mec

  const sledeci = eliminacija.value.find(
    x => x.brojKola === k.brojKola - 1 && x.pozicija === Math.ceil(k.pozicija / 2)
  );
  let odigran = !!sledeci && sledeci.pobednikId !== null;

  // polufinale se zakljucava i kad se odigra mec za trece mesto
  if (k.brojKola === 2) {
    const treci = eliminacija.value.find(x => x.brojKola === 0);
    if (treci && treci.pobednikId !== null) odigran = true;
  }
  return odigran;
};

// unos je moguc tek kad je kostur potvrdjen, obe ekipe poznate i mec nije odigran; finale ceka trece mesto
const moguUnos = (k) => kosturPotvrdjen.value && !k.jeBye && k.ekipa1Id !== null && k.ekipa2Id !== null && k.pobednikId === null
  && !(k.brojKola === 1 && treceNeodigrano.value);

// ispravka je moguca dok sledeci mec nije odigran
const moguIzmena = (k) => kosturPotvrdjen.value && !k.jeBye && k.pobednikId !== null && !sledeciOdigran(k);

// termin je moguc za svaki neodigran mec koji nije bye
const moguTermin = (k) => !k.jeBye && k.pobednikId === null;

// dugme generisi grupe: trazi od servera da nasumicno rasporedi ekipe u grupe
const generisiGrupe = async () => {
  try {
    await axios.post(`/api/Grupe/generisi/${id}`);
    toast.success("Grupe generisane!");
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri generisanju grupa."));
  }
};

// rucni raspored ekipa u grupe (fz-06)
// da li je forma za rucni raspored otvorena
const rucnoOtvoreno = ref(false);
const rucniRaspored = ref({}); // ekipaid -> oznaka grupe

// oznake grupa za ovaj turnir: a, b, c... (koliko turnir ima grupa)
const oznakeGrupa = computed(() => {
  if (!turnir.value) return [];
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, turnir.value.brojGrupa).split("");
});

// koliko je ekipa admin do sada stavio u datu grupu
const brojUGrupi = (oznaka) =>
  ekipe.value.filter(e => rucniRaspored.value[e.ekipaId] === oznaka).length;

// svaka ekipa ima grupu, a svaka grupa ima izmedju minimuma i kapaciteta (grupe mogu biti razlicite velicine)
const brojURasponu = (n) => n >= minPoGrupi.value && n <= turnir.value.brojEkipaPoGrupi;

// rucni raspored je ispravan kad svaka ekipa ima grupu i svaka grupa ima dozvoljen broj ekipa
const rucniRasporedIspravan = computed(() => {
  if (!turnir.value) return false;
  if (!ekipe.value.every(e => rucniRaspored.value[e.ekipaId])) return false;
  return oznakeGrupa.value.every(o => brojURasponu(brojUGrupi(o)));
});

// otvara praznu formu za rucni raspored
const otvoriRucniRaspored = () => {
  rucniRaspored.value = {};
  rucnoOtvoreno.value = true;
};

// salje serveru raspored koji je admin izabrao
const generisiGrupeRucno = async () => {
  try {
    await axios.post(`/api/Grupe/generisi-rucno/${id}`, {
      raspored: ekipe.value.map(e => ({
        ekipaId: e.ekipaId,
        grupa: rucniRaspored.value[e.ekipaId],
      })),
    });
    toast.success("Grupe napravljene po tvom rasporedu!");
    rucnoOtvoreno.value = false;
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri pravljenju grupa."));
  }
};

// zamena dve ekipe iz razlicitih grupa, dok mecevi nisu generisani
const zamenaEkipa1 = ref("");
const zamenaEkipa2 = ref("");

// spisak svih ekipa sa oznakom grupe u kojoj su, za padajuci meni kod zamene
const ekipeUGrupama = computed(() =>
  grupe.value.flatMap(g => g.ekipe.map(e => ({ ekipaId: e.ekipaId, naziv: e.naziv, oznaka: g.oznaka })))
);

// salje serveru koje dve ekipe da zamene grupe
const zameniEkipe = async () => {
  try {
    await axios.put(`/api/Grupe/zameni/${id}`, {
      ekipa1Id: parseInt(zamenaEkipa1.value),
      ekipa2Id: parseInt(zamenaEkipa2.value),
    });
    toast.success("Ekipe su zamenile grupe!");
    zamenaEkipa1.value = "";
    zamenaEkipa2.value = "";
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri zameni ekipa."));
  }
};

// dugme generisi meceve: server pravi mecove svako sa svakim u grupi
const generisiMeceve = async () => {
  try {
    await axios.post(`/api/Mecevi/generisi/${id}`);
    toast.success("Mečevi generisani!");
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri generisanju mečeva."));
  }
};

// ---------- prozor za unos rezultata (grupni i eliminacioni mecevi) ----------
// tip: "grupa" ili "elim"
const rezModal = ref(null); // { tip, id, ekipa1, ekipa2, naslov }
// rezultati upisani u prozoru (poeni prve i druge ekipe)
const rez1 = ref(0);
const rez2 = ref(0);

// otvara prozor za unos rezultata grupnog meca. ako je mec vec zavrsen, u prozoru je stari rezultat pa se samo menja
const otvoriRezultat = (mec) => {
  rezModal.value = {
    tip: "grupa",
    id: mec.mecId,
    ekipa1: mec.ekipa1,
    ekipa2: mec.ekipa2,
    naslov: mec.status === 1 ? "Izmena rezultata" : "Unos rezultata",
  };
  rez1.value = mec.rezultatEkipa1 ?? 0;
  rez2.value = mec.rezultatEkipa2 ?? 0;
};

// isto, ali za mec iz eliminacije
const otvoriElimRezultat = (kolo) => {
  rezModal.value = {
    tip: "elim",
    id: kolo.eliminacionoKoloId,
    ekipa1: kolo.ekipa1,
    ekipa2: kolo.ekipa2,
    naslov: `${kolaNaziv(kolo.brojKola)}: unos rezultata`,
  };
  rez1.value = kolo.rezultatEkipa1 ?? 0;
  rez2.value = kolo.rezultatEkipa2 ?? 0;
};

// salje rezultat serveru. server proverava pravila, a ovde se prikazuje poruka uspeha ili greske
const sacuvajRezultat = async () => {
  const m = rezModal.value;
  if (!m) return;
  const putanja = m.tip === "grupa" ? `/api/Mecevi/${m.id}/rezultat` : `/api/Eliminacija/${m.id}/rezultat`;
  try {
    await axios.put(putanja, {
      rezultatEkipa1: parseInt(rez1.value),
      rezultatEkipa2: parseInt(rez2.value),
    });
    toast.success(m.tip === "grupa" ? "Rezultat unet!" : "Rezultat unet, pobednik određen!");
    rezModal.value = null;
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri unosu rezultata."));
  }
};

// ---------- prozor za termin (grupni i eliminacioni mecevi, fz-08) ----------
const terminModal = ref(null); // { tip, id, ekipa1, ekipa2, mozeodlozen }
const terminVrednost = ref("");
const terminOdlozen = ref(false);
const terminUpozorenja = ref([]); // preklapanja koja je server prijavio
// koliko minuta se racuna da mec traje (javlja server, 60 je podrazumevano)
const terminTrajanje = ref(60);

// prikaz termina: "2026-11-10t18:00:00" -> "2026-11-10 18:00"
const formatTermin = (v) => (v ? v.replace("T", " ").slice(0, 16) : "-");

// otvara prozor za termin grupnog meca
const otvoriTermin = (mec) => {
  terminModal.value = {
    tip: "grupa",
    id: mec.mecId,
    ekipa1: mec.ekipa1,
    ekipa2: mec.ekipa2,
    mozeOdlozen: true,
  };
  terminVrednost.value = mec.datumVreme ? mec.datumVreme.slice(0, 16) : "";
  terminOdlozen.value = mec.status === 2;
  terminUpozorenja.value = [];
};

// isto, za mec iz eliminacije
const otvoriElimTermin = (kolo) => {
  terminModal.value = {
    tip: "elim",
    id: kolo.eliminacionoKoloId,
    ekipa1: kolo.ekipa1,
    ekipa2: kolo.ekipa2,
    // odlaganje je moguce tek kad su obe ekipe poznate
    mozeOdlozen: kolo.ekipa1Id !== null && kolo.ekipa2Id !== null,
  };
  terminVrednost.value = kolo.datumVreme ? kolo.datumVreme.slice(0, 16) : "";
  terminOdlozen.value = !!kolo.odlozen;
  terminUpozorenja.value = [];
};

// zatvara prozor za termin
const zatvoriTermin = () => {
  terminModal.value = null;
  terminUpozorenja.value = [];
};

// kad se termin ili odlaganje promene, stara upozorenja vise ne vaze
const ponistiUpozorenja = () => {
  terminUpozorenja.value = [];
};

// potvrdjeno = true kad organizator vidi upozorenje o preklapanju i svejedno cuva
const sacuvajTermin = async (potvrdjeno) => {
  const m = terminModal.value;
  if (!m) return;
  const putanja = m.tip === "grupa" ? `/api/Mecevi/${m.id}/termin` : `/api/Eliminacija/${m.id}/termin`;
  try {
    const res = await axios.put(putanja, {
      datumVreme: terminVrednost.value || null,
      odlozen: terminOdlozen.value,
      potvrdjeno: potvrdjeno === true,
    });
    toast.success(res.data.message);
    zatvoriTermin();
    await fetchAll();
  } catch (error) {
    const d = error.response?.data;
    // server javlja da se termin preklapa: prikazuje se upozorenje, a admin moze da sacuva svejedno
    if (error.response?.status === 409 && d?.potrebnaPotvrda) {
      terminUpozorenja.value = d.preklapanja || [];
      terminTrajanje.value = d.trajanjeMinuta || 60;
      return;
    }
    toast.error(porukaGreske(error, "Greška pri čuvanju termina."));
  }
};

// esc zatvara prozor
const naTaster = (e) => {
  if (e.key === "Escape") {
    rezModal.value = null;
    zatvoriTermin();
  }
};

// zakljucavanje grupne faze (fz-10)
const zakljuciGrupe = async () => {
  try {
    const res = await axios.post(`/api/Grupe/zakljuci/${id}`);
    toast.success(res.data.message);
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri zaključavanju grupne faze."));
  }
};

// vraca grupnu fazu na nezakljucanu, ako eliminacija jos nije generisana
const otkljucajGrupe = async () => {
  try {
    const res = await axios.post(`/api/Grupe/otkljucaj/${id}`);
    toast.success(res.data.message);
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri otključavanju grupne faze."));
  }
};

// dugme generisi eliminaciju: server pravi kostur kao predlog
const generisiEliminaciju = async () => {
  try {
    const res = await axios.post(`/api/Eliminacija/generisi/${id}`);
    toast.success(res.data.message);
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri generisanju eliminacije."));
  }
};

// potvrda kostura (fz-12): ako se termini u prvom kolu preklapaju, server trazi potvrdu
const kosturUpozorenja = ref([]);

// potvrda kostura. ako se termini preklapaju, prvo se prikaze upozorenje, pa admin potvrdi ipak (potvrdjeno = true)
const potvrdiKostur = async (potvrdjeno) => {
  try {
    const res = await axios.post(`/api/Eliminacija/potvrdi/${id}`, null, {
      params: { potvrdjeno: potvrdjeno === true },
    });
    toast.success(res.data.message);
    kosturUpozorenja.value = [];
    await fetchAll();
  } catch (error) {
    const d = error.response?.data;
    if (error.response?.status === 409 && d?.potrebnaPotvrda) {
      kosturUpozorenja.value = d.preklapanja || [];
      terminTrajanje.value = d.trajanjeMinuta || 60;
      return;
    }
    toast.error(porukaGreske(error, "Greška pri potvrdi kostura."));
  }
};

// brise nepotvrdjen kostur da moze da se napravi novi
const odbaciPredlog = async () => {
  try {
    const res = await axios.delete(`/api/Eliminacija/${id}/predlog`);
    toast.success(res.data.message);
    kosturUpozorenja.value = [];
    // kad se napravi novi kostur, ponovo se bira da li je prikaz kompaktan
    kompaktnoPostavljeno = false;
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri odbacivanju predloga."));
  }
};

// zamena dve ekipe u prvom kolu kostura, dok nije potvrdjen
const kosturZamena1 = ref("");
const kosturZamena2 = ref("");

// ekipe iz prvog kola koje mogu da se zamene (bez onih koje imaju bye)
const ekipeZaZamenu = computed(() => {
  if (eliminacija.value.length === 0) return [];
  const prvoKolo = Math.max(...eliminacija.value.map(k => k.brojKola));
  const lista = [];
  for (const k of eliminacija.value.filter(x => x.brojKola === prvoKolo && !x.jeBye)) {
    lista.push({ ekipaId: k.ekipa1Id, naziv: k.ekipa1 });
    lista.push({ ekipaId: k.ekipa2Id, naziv: k.ekipa2 });
  }
  return lista;
});

// salje serveru koje dve ekipe da zamene mesta u kosturu
const zameniUKosturu = async () => {
  try {
    const res = await axios.put(`/api/Eliminacija/zameni/${id}`, {
      ekipa1Id: parseInt(kosturZamena1.value),
      ekipa2Id: parseInt(kosturZamena2.value),
    });
    toast.success(res.data.message);
    kosturZamena1.value = "";
    kosturZamena2.value = "";
    kosturUpozorenja.value = []; // parovi su se promenili, stara upozorenja ne vaze
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri zameni ekipa u kosturu."));
  }
};

// alat za demo: prijava test ekipa (prazno polje = do popune turnira, ili tacan broj za nejednake grupe)
const demoBrojEkipa = ref("");

// demo: prijavljuje test ekipe odjednom, da ih ne prijavljujes rucno
const prijaviTestEkipe = async () => {
  try {
    const params = demoBrojEkipa.value ? { broj: parseInt(demoBrojEkipa.value) } : {};
    const res = await axios.post(`/api/Demo/prijavi-sve/${id}`, null, { params });
    toast.success(res.data.message);
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri prijavi test ekipa."));
  }
};

// alati za demo: poziv jedne demo akcije za ovaj turnir
const demoPoziv = async (putanja, rezervna) => {
  try {
    const res = await axios.post(`/api/Demo/${putanja}/${id}`);
    toast.success(res.data.message);
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, rezervna));
  }
};

// rucno odredjivanje redosleda potpuno izjednacenih ekipa
const urediGrupaId = ref(null);
// uredigrupaid = grupa ciji se redosled trenutno uredjuje, uredilista = ekipe u tom redosledu
const urediLista = ref([]);

// vraca skupove potpuno izjednacenih ekipa u grupi
const izjednaceniUGrupi = (grupaId) => {
  const redovi = tabele.value[grupaId] || [];
  const mapa = {};
  for (const red of redovi) {
    if (red.izjednacenje !== null && red.izjednacenje !== undefined) {
      if (!mapa[red.izjednacenje]) mapa[red.izjednacenje] = [];
      mapa[red.izjednacenje].push(red);
    }
  }
  return Object.values(mapa);
};

// da li je organizator vec odredio redosled za ovaj skup
const jeRedosledOdredjen = (skup) => skup.every(r => r.rucnoOdredjen);

// otvara editor redosleda za izjednacene ekipe
const otvoriRedosled = (grupaId, skup) => {
  urediGrupaId.value = grupaId;
  urediLista.value = skup.map(r => ({ ekipaId: r.ekipaId, naziv: r.naziv }));
};

// pomera ekipu gore (-1) ili dole (+1) u listi
const pomeriEkipu = (index, smer) => {
  const novi = index + smer;
  if (novi < 0 || novi >= urediLista.value.length) return;
  const lista = [...urediLista.value];
  [lista[index], lista[novi]] = [lista[novi], lista[index]];
  urediLista.value = lista;
};

// salje serveru redosled koji je admin odredio
const sacuvajRedosled = async () => {
  try {
    await axios.put(`/api/Tabela/${urediGrupaId.value}/redosled`, {
      ekipaIds: urediLista.value.map(e => e.ekipaId),
    });
    toast.success("Redosled sačuvan!");
    urediGrupaId.value = null;
    urediLista.value = [];
    await fetchAll();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri čuvanju redosleda."));
  }
};

// status meca iz baze (broj) pretvara u tekst
const statusNaziv = (status) => {
  const mapa = { 0: "Zakazana", 1: "Završena", 2: "Odložena" };
  return mapa[status] || "?";
};

// broj kola pretvara u naziv (1 = finale, 2 = polufinale...)
const kolaNaziv = (brojKola) => {
  const mapa = {
    0: "Meč za treće mesto",
    1: "Finale",
    2: "Polufinale",
    3: "Četvrtfinale",
    4: "Osmina finala",
    5: "Šesnaestina finala",
    6: "Tridesetdrugo finale",
  };
  return mapa[brojKola] || `Kolo ${brojKola}`;
};

// radi kad se stranica otvori: ucita podatke, slusa taster esc i na 30 sekundi osvezava podatke
onMounted(() => {
  fetchAll();
  window.addEventListener("keydown", naTaster);
  osvezavanje = setInterval(() => {
    if (mozeDaSeOsvezi()) fetchAll(true);
  }, 30000);
});

// radi kad se stranica zatvori: gasi ono sto je pokrenuto pri otvaranju
onBeforeUnmount(() => {
  window.removeEventListener("keydown", naTaster);
  clearInterval(osvezavanje);
});
</script>

<!-- izgled -->
<template>
  <!-- cela stranica se prikazuje tek kad se turnir ucita sa servera -->
  <div class="container mt-4" v-if="turnir">
    <h2>{{ turnir.naziv }}</h2>
    <p class="text-muted">{{ turnir.opis }}</p>

    <!-- prijava ekipa (samo admin) -->
    <div class="card mb-4" v-if="prijavljen && grupe.length === 0">
      <div class="card-header">
        <strong>Prijava ekipa</strong>
        <span class="ms-2 text-muted">(prijavljeno: {{ ekipe.length + odabraneEkipe.length }}, najmanje {{ minEkipa }}, najviše {{ maxEkipa }})</span>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4 col-6" v-for="e in neprijavljeneEkipe" :key="e.ekipaId">
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                :value="e.ekipaId"
                v-model="odabraneEkipe"
                :id="`ekipa-${e.ekipaId}`"
                :disabled="!odabraneEkipe.includes(e.ekipaId) && odabraneEkipe.length >= preostalaMesta"
              />
              <label class="form-check-label" :for="`ekipa-${e.ekipaId}`">
                {{ e.naziv }}
              </label>
            </div>
          </div>
        </div>
        <button @click="prijavaViseEkipa" class="btn btn-primary" :disabled="odabraneEkipe.length === 0">
          Prijavi izabrane ({{ odabraneEkipe.length }})
        </button>
        <div class="mt-2" v-if="ekipe.length > 0">
          <strong>Prijavljene:</strong>
          <span v-for="e in ekipe" :key="e.ekipaId" class="badge bg-secondary me-1">
            {{ e.naziv }}
            <span @click="odjaviEkipu(e.turnirEkipaId)" style="cursor:pointer;" class="ms-1">×</span>
          </span>
        </div>
      </div>
    </div>

    <!-- posetilac: lista prijavljenih ekipa dok grupe nisu generisane -->
    <div class="card mb-4" v-if="!prijavljen && grupe.length === 0">
      <div class="card-header">
        <strong>Prijavljene ekipe</strong>
        <span class="ms-2 text-muted">({{ ekipe.length }} / {{ maxEkipa }})</span>
      </div>
      <div class="card-body">
        <span v-if="ekipe.length === 0" class="text-muted">Još nema prijavljenih ekipa.</span>
        <span v-for="e in ekipe" :key="e.ekipaId" class="badge bg-secondary me-1">{{ e.naziv }}</span>
      </div>
    </div>

    <!-- poruka kada su sve ekipe prijavljene (samo admin) -->
    <!-- premalo ekipa za generisanje grupa (samo admin) -->
    <div class="alert alert-info mb-4" v-if="prijavljen && ekipe.length < minEkipa && grupe.length === 0">
      Prijavljeno je {{ ekipe.length }} ekipa. Za generisanje grupa potrebno je najmanje {{ minEkipa }} (najviše {{ maxEkipa }}).
    </div>

    <div class="alert alert-success mb-4" v-if="prijavljen && ekipe.length >= minEkipa && grupe.length === 0">
      Prijavljeno je {{ ekipe.length }} ekipa (najmanje {{ minEkipa }}, najviše {{ maxEkipa }}); {{ raspodelaOpis }}. Možeš generisati grupe nasumično ili ih rasporediti ručno.
    </div>

    <!-- dugmad za generisanje (samo admin) - svako dugme ceka prethodni korak -->
    <div class="mb-4 d-flex gap-2 flex-wrap" v-if="prijavljen">
      <button
        @click="generisiGrupe"
        class="btn btn-success"
        :disabled="grupe.length > 0 || ekipe.length < minEkipa"
      >Generisi grupe</button>
      <button
        v-if="grupe.length === 0"
        @click="otvoriRucniRaspored"
        class="btn btn-outline-success"
        :disabled="ekipe.length < minEkipa"
      >Rasporedi ručno</button>
      <button
        @click="generisiMeceve"
        class="btn btn-success"
        :disabled="grupe.length === 0 || mecevi.length > 0"
      >Generisi mečeve</button>
      <button
        @click="generisiEliminaciju"
        class="btn btn-success"
        :disabled="!turnir.grupnaFazaZakljucana || eliminacija.length > 0"
      >Generisi eliminaciju</button>
      <button
        v-if="!turnir.grupnaFazaZakljucana"
        @click="zakljuciGrupe"
        class="btn btn-dark"
        :disabled="!sviGrupniMeceviZavrseni"
      >Zaključaj grupnu fazu</button>
      <button
        v-if="turnir.grupnaFazaZakljucana"
        @click="otkljucajGrupe"
        class="btn btn-outline-dark"
        :disabled="eliminacija.length > 0"
      >Otključaj grupnu fazu</button>
    </div>

    <!-- savet adminu: svi mececi zavrseni, ali faza nije zakljucana -->
    <div class="alert alert-info mb-4" v-if="prijavljen && sviGrupniMeceviZavrseni && !turnir.grupnaFazaZakljucana">
      Svi mečevi grupne faze su završeni. Zaključaj grupnu fazu da bi plasman postao konačan i da bi mogao da generišeš eliminaciju.
    </div>

    <!-- rucni raspored ekipa u grupe (samo admin) -->
    <div class="card mb-4" v-if="prijavljen && rucnoOtvoreno && grupe.length === 0">
      <div class="card-header"><strong>Ručni raspored ekipa u grupe</strong></div>
      <div class="card-body">
        <div class="d-flex flex-wrap gap-3 mb-3">
          <span v-for="o in oznakeGrupa" :key="o" class="badge" :class="brojURasponu(brojUGrupi(o)) ? 'bg-success' : 'bg-secondary'">
            Grupa {{ o }}: {{ brojUGrupi(o) }} (dozvoljeno {{ minPoGrupi }} do {{ turnir.brojEkipaPoGrupi }})
          </span>
        </div>
        <div v-for="e in ekipe" :key="e.ekipaId" class="d-flex align-items-center gap-2 mb-2">
          <span style="min-width: 180px">{{ e.naziv }}</span>
          <select v-model="rucniRaspored[e.ekipaId]" class="form-select" style="width: 140px">
            <option :value="undefined" disabled>Grupa</option>
            <option v-for="o in oznakeGrupa" :key="o" :value="o">Grupa {{ o }}</option>
          </select>
        </div>
        <button @click="generisiGrupeRucno" class="btn btn-primary btn-sm me-2" :disabled="!rucniRasporedIspravan">
          Generiši grupe po rasporedu
        </button>
        <button @click="rucnoOtvoreno = false" class="btn btn-secondary btn-sm">Otkaži</button>
      </div>
    </div>

    <!-- zamena ekipa izmedju grupa, dok mecevi nisu generisani (samo admin) -->
    <div class="card mb-4" v-if="prijavljen && grupe.length > 0 && mecevi.length === 0">
      <div class="card-header"><strong>Zamena ekipa između grupa</strong></div>
      <div class="card-body d-flex flex-wrap gap-2 align-items-center">
        <select v-model="zamenaEkipa1" class="form-select" style="width: 240px">
          <option value="" disabled>Prva ekipa</option>
          <option v-for="e in ekipeUGrupama" :key="e.ekipaId" :value="e.ekipaId">{{ e.naziv }} (grupa {{ e.oznaka }})</option>
        </select>
        <span>⇄</span>
        <select v-model="zamenaEkipa2" class="form-select" style="width: 240px">
          <option value="" disabled>Druga ekipa</option>
          <option v-for="e in ekipeUGrupama" :key="e.ekipaId" :value="e.ekipaId">{{ e.naziv }} (grupa {{ e.oznaka }})</option>
        </select>
        <button @click="zameniEkipe" class="btn btn-primary btn-sm" :disabled="!zamenaEkipa1 || !zamenaEkipa2 || zamenaEkipa1 === zamenaEkipa2">
          Zameni
        </button>
        <small class="text-muted w-100">Moguće samo dok mečevi nisu generisani.</small>
      </div>
    </div>

    <!-- alati za testiranje (samo admin) -->
    <div class="card border-warning mb-4" v-if="prijavljen">
      <div class="card-header">
        <strong>Alati za testiranje</strong>
        <span class="ms-2 text-muted">(samo za demo, rezultati su nasumični)</span>
      </div>
      <div class="card-body d-flex gap-2 flex-wrap">
        <input
          type="number"
          v-model="demoBrojEkipa"
          class="form-control form-control-sm"
          style="width: 130px"
          min="1"
          placeholder="Broj ekipa"
        />
        <button
          @click="prijaviTestEkipe"
          class="btn btn-warning btn-sm"
          :disabled="grupe.length > 0 || preostalaMesta <= 0"
        >Prijavi test ekipe</button>
        <button
          @click="demoPoziv('rezultati-grupe', 'Greška pri unosu rezultata grupne faze.')"
          class="btn btn-warning btn-sm"
          :disabled="mecevi.length === 0 || sviGrupniMeceviZavrseni || turnir.grupnaFazaZakljucana"
        >Popuni rezultate grupne faze</button>
        <button
          @click="demoPoziv('rezultati-eliminacije', 'Greška pri unosu rezultata eliminacije.')"
          class="btn btn-warning btn-sm"
          :disabled="eliminacija.length === 0 || !kosturPotvrdjen || turnir.status === 2"
        >Popuni sledeće kolo eliminacije</button>
      </div>
    </div>

    <!-- grupe i tabele -->
    <div v-if="grupe.length > 0">
      <h4>
        Grupe i tabele
        <span v-if="turnir.grupnaFazaZakljucana" class="badge bg-success fs-6 ms-2">grupna faza zaključana</span>
      </h4>
      <div v-for="grupa in grupe" :key="grupa.grupaId" class="mb-4">
        <h5>Grupa {{ grupa.oznaka }}</h5>
        <!-- tabela grupe: ou odigrano, p pobede, i izgubljeno, poeni osvojeni, primljeni poeni protivnika, bod bodovi -->
        <table class="table table-striped table-bordered">
          <thead class="table-dark">
            <tr>
              <th>Ekipa</th><th>OU</th><th>P</th><th>I</th>
              <th>Poeni</th><th>Primljeni</th><th>Razlika</th><th>Bod</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(red, index) in tabele[grupa.grupaId]"
              :key="red.ekipaId"
              :class="{ 'red-prolazi': prolaziDalje(grupa, index) }"
            >
              <td>
                {{ red.naziv }}
                <span
                  v-if="prolaziDalje(grupa, index)"
                  class="badge bg-success ms-1"
                >prolazi</span>
                <span
                  v-if="red.izjednacenje !== null && red.izjednacenje !== undefined && !red.rucnoOdredjen"
                  class="badge bg-warning text-dark ms-1"
                >izjednačeno</span>
                <span
                  v-if="red.rucnoOdredjen"
                  class="badge bg-info text-dark ms-1"
                >ručno određeno</span>
              </td>
              <td>{{ red.ou }}</td>
              <td>{{ red.p }}</td>
              <td>{{ red.i }}</td>
              <td>{{ red.poeni }}</td>
              <td>{{ red.primljeniPoeni }}</td>
              <td>{{ red.razlika }}</td>
              <td><strong>{{ red.bod }}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- rucno odredjivanje redosleda izjednacenih ekipa (samo admin, dok eliminacija nije generisana) -->
        <div v-if="prijavljen && !turnir.grupnaFazaZakljucana">
          <div
            v-for="(skup, i) in izjednaceniUGrupi(grupa.grupaId)"
            :key="i"
            class="alert d-flex align-items-center gap-2 mb-2"
            :class="jeRedosledOdredjen(skup) ? 'alert-info' : 'alert-warning'"
          >
            <span v-if="jeRedosledOdredjen(skup)">
              Redosled određen ručno:
              <strong>{{ skup.map(r => r.naziv).join(' → ') }}</strong>.
            </span>
            <span v-else>
              Potpuno izjednačene ekipe:
              <strong>{{ skup.map(r => r.naziv).join(', ') }}</strong>.
              Redosled određuje organizator.
            </span>
            <button @click="otvoriRedosled(grupa.grupaId, skup)" class="btn btn-sm btn-dark">
              {{ jeRedosledOdredjen(skup) ? 'Izmeni redosled' : 'Odredi redosled' }}
            </button>
          </div>
        </div>

        <!-- editor redosleda za ovu grupu (samo admin) -->
        <div v-if="prijavljen && urediGrupaId === grupa.grupaId" class="card mb-3">
          <div class="card-header"><strong>Redosled izjednačenih ekipa (prva je bolja)</strong></div>
          <div class="card-body">
            <div v-for="(e, index) in urediLista" :key="e.ekipaId" class="d-flex align-items-center gap-2 mb-2">
              <span style="width: 24px">{{ index + 1 }}.</span>
              <span style="min-width: 160px">{{ e.naziv }}</span>
              <button @click="pomeriEkipu(index, -1)" class="btn btn-outline-secondary btn-sm" :disabled="index === 0">↑</button>
              <button @click="pomeriEkipu(index, 1)" class="btn btn-outline-secondary btn-sm" :disabled="index === urediLista.length - 1">↓</button>
            </div>
            <button @click="sacuvajRedosled" class="btn btn-primary btn-sm me-2">Sačuvaj redosled</button>
            <button @click="urediGrupaId = null" class="btn btn-secondary btn-sm">Otkaži</button>
          </div>
        </div>

        <!-- mecevi grupe. dugmad u koloni akcija vide samo admin i samo dok grupna faza nije zakljucana -->
        <h6>Mečevi Grupe {{ grupa.oznaka }}</h6>
        <table class="table table-striped table-bordered mb-4">
          <thead class="table-dark">
            <tr>
              <th>Ekipa 1</th>
              <th>Rezultat</th>
              <th>Ekipa 2</th>
              <th>Termin</th>
              <th>Status</th>
              <th v-if="prijavljen && !turnir.grupnaFazaZakljucana">Akcija</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mec in meceviPoGrupi[grupa.oznaka]" :key="mec.mecId">
              <td>{{ mec.ekipa1 }}</td>
              <td>{{ mec.rezultatEkipa1 !== null ? mec.rezultatEkipa1 : '-' }} : {{ mec.rezultatEkipa2 !== null ? mec.rezultatEkipa2 : '-' }}</td>
              <td>{{ mec.ekipa2 }}</td>
              <td>{{ formatTermin(mec.datumVreme) }}</td>
              <td>{{ statusNaziv(mec.status) }}</td>
              <td v-if="prijavljen && !turnir.grupnaFazaZakljucana">
                <div v-if="mec.status !== 1" class="d-flex gap-1 flex-wrap">
                  <button @click="otvoriRezultat(mec)" class="btn btn-warning btn-sm">Unesi rezultat</button>
                  <button @click="otvoriTermin(mec)" class="btn btn-outline-secondary btn-sm">Termin</button>
                </div>
                <div v-else class="d-flex gap-1 flex-wrap">
                  <button @click="otvoriRezultat(mec)" class="btn btn-outline-secondary btn-sm">Izmeni rezultat</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- eliminaciona faza -->
    <div v-if="eliminacija.length > 0" class="mt-4">
      <h4>Eliminaciona faza</h4>

      <!-- nepotvrdjen kostur: predlog (samo admin) -->
      <div v-if="!kosturPotvrdjen && prijavljen" class="alert alert-warning">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span>
            <strong>Kostur je predlog.</strong>
            Pregledaj parove, po potrebi zameni ekipe u prvom kolu, pa potvrdi. Rezultati se unose tek posle potvrde.
          </span>
          <button @click="potvrdiKostur(false)" class="btn btn-success btn-sm">Potvrdi kostur</button>
          <button
            v-if="kosturUpozorenja.length > 0"
            @click="potvrdiKostur(true)"
            class="btn btn-warning btn-sm"
          >Potvrdi ipak</button>
          <button @click="odbaciPredlog" class="btn btn-outline-danger btn-sm">Odbaci predlog</button>
        </div>

        <!-- upozorenje o preklapanju termina u prvom kolu -->
        <div v-if="kosturUpozorenja.length > 0" class="mt-3">
          <strong>Upozorenje: termini u prvom kolu se preklapaju.</strong>
          <ul class="mb-1 mt-1">
            <li v-for="u in kosturUpozorenja" :key="u">{{ u }}</li>
          </ul>
          <small>Računa se da meč traje {{ terminTrajanje }} minuta. Možeš da promeniš termine ili zameniš ekipe, pa potvrdiš, ili da potvrdiš svejedno.</small>
        </div>
      </div>

      <!-- nepotvrdjen kostur: poruka za posetioca -->
      <div v-if="!kosturPotvrdjen && !prijavljen" class="alert alert-info">
        Eliminacioni kostur još nije potvrđen.
      </div>

      <!-- zamena ekipa u prvom kolu, dok kostur nije potvrdjen (samo admin) -->
      <div class="card mb-3" v-if="!kosturPotvrdjen && prijavljen">
        <div class="card-header"><strong>Zamena ekipa u prvom kolu</strong></div>
        <div class="card-body d-flex flex-wrap gap-2 align-items-center">
          <select v-model="kosturZamena1" class="form-select" style="width: 240px">
            <option value="" disabled>Prva ekipa</option>
            <option v-for="e in ekipeZaZamenu" :key="e.ekipaId" :value="e.ekipaId">{{ e.naziv }}</option>
          </select>
          <span>⇄</span>
          <select v-model="kosturZamena2" class="form-select" style="width: 240px">
            <option value="" disabled>Druga ekipa</option>
            <option v-for="e in ekipeZaZamenu" :key="e.ekipaId" :value="e.ekipaId">{{ e.naziv }}</option>
          </select>
          <button @click="zameniUKosturu" class="btn btn-primary btn-sm" :disabled="!kosturZamena1 || !kosturZamena2 || kosturZamena1 === kosturZamena2">
            Zameni
          </button>
          <small class="text-muted w-100">Ekipe sa BYE se ne mogu zamenjivati.</small>
        </div>
      </div>

      <!-- plasman posle finala -->
      <div v-if="plasman.zavrsen" class="alert alert-success">
        <div><strong>🏆 Prvo mesto:</strong> {{ plasman.prvi.naziv }}</div>
        <div><strong>🥈 Drugo mesto:</strong> {{ plasman.drugi.naziv }}</div>
        <div v-if="plasman.treci"><strong>🥉 Treće mesto:</strong> {{ plasman.treci.naziv }}</div>
        <div v-if="plasman.cetvrti"><strong>Četvrto mesto:</strong> {{ plasman.cetvrti.naziv }}</div>
      </div>

      <div class="form-check form-switch mb-2" v-if="kosturPotvrdjen || prijavljen">
        <input class="form-check-input" type="checkbox" id="kompaktno" v-model="kompaktno" />
        <label class="form-check-label" for="kompaktno">Kompaktan prikaz</label>
      </div>

      <!-- kostur: svaka kolona je jedno kolo, a svaka kartica jedan mec. pobednik je zelen, gubitnik crven -->
      <div class="kostur" :class="{ kompaktno: kompaktno }" v-if="kosturPotvrdjen || prijavljen">
        <div v-for="kolona in kosturKolone" :key="kolona.brojKola" class="kolona">
          <h6 class="kolona-naslov">{{ kolaNaziv(kolona.brojKola) }}</h6>
          <div class="kolona-meceva">
            <div v-for="k in kolona.kola" :key="k.eliminacionoKoloId" class="mec-kartica">
              <div
                class="ekipa-red"
                :class="{
                  pobednik: k.pobednikId !== null && k.pobednikId === k.ekipa1Id,
                  poraz: k.pobednikId !== null && !k.jeBye && k.pobednikId !== k.ekipa1Id,
                  prazno: k.ekipa1Id === null
                }"
              >
                <span class="ekipa-naziv">{{ k.ekipa1 }}</span>
                <span class="ekipa-rezultat">{{ k.rezultatEkipa1 !== null ? k.rezultatEkipa1 : '' }}</span>
              </div>
              <div
                class="ekipa-red"
                :class="{
                  pobednik: k.pobednikId !== null && k.pobednikId === k.ekipa2Id,
                  poraz: k.pobednikId !== null && !k.jeBye && k.pobednikId !== k.ekipa2Id,
                  prazno: k.ekipa2Id === null || k.jeBye
                }"
              >
                <span class="ekipa-naziv">{{ k.ekipa2 }}</span>
                <span class="ekipa-rezultat">{{ k.rezultatEkipa2 !== null ? k.rezultatEkipa2 : '' }}</span>
              </div>
              <!-- termin i odlaganje (fz-08), obican tekst -->
              <div class="mec-termin" v-if="!k.jeBye && (k.datumVreme || k.odlozen)">
                <span v-if="k.datumVreme">{{ formatTermin(k.datumVreme) }}</span>
                <span v-if="k.odlozen" class="odlozeno">Odloženo</span>
              </div>
              <div class="mec-akcija" v-if="k.jeBye || (prijavljen && (moguUnos(k) || moguIzmena(k) || moguTermin(k)))">
                <span v-if="k.jeBye" class="badge bg-info text-dark">BYE - automatski prolaz</span>
                <button v-if="prijavljen && moguUnos(k)" @click="otvoriElimRezultat(k)" class="btn btn-warning btn-sm">Unesi rezultat</button>
                <button v-if="prijavljen && moguIzmena(k)" @click="otvoriElimRezultat(k)" class="btn btn-outline-secondary btn-sm">Izmeni rezultat</button>
                <button v-if="prijavljen && moguTermin(k)" @click="otvoriElimTermin(k)" class="btn btn-outline-secondary btn-sm">Termin</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- prozor: unos rezultata (grupni i eliminacioni mecevi, samo admin) -->
    <div v-if="prijavljen && rezModal" class="modal-pozadina" @click.self="rezModal = null">
      <div class="modal-kartica">
        <form @submit.prevent="sacuvajRezultat">
          <div class="modal-zaglavlje"><strong>{{ rezModal.naslov }}</strong></div>
          <div class="modal-telo">
            <div class="d-flex gap-3 align-items-end">
              <div class="flex-fill">
                <label class="form-label">{{ rezModal.ekipa1 }}</label>
                <input type="number" v-model="rez1" class="form-control" min="0" max="3" required />
              </div>
              <span class="pb-2">:</span>
              <div class="flex-fill">
                <label class="form-label">{{ rezModal.ekipa2 }}</label>
                <input type="number" v-model="rez2" class="form-control" min="0" max="3" required />
              </div>
            </div>
            <small class="text-muted d-block mt-2">
              Meč se igra do 3 poena: pobednik ima tačno 3, a drugi tim 0, 1 ili 2.
              <span v-if="rezModal.tip === 'elim'">Rezultat ne sme biti nerešen.</span>
            </small>
          </div>
          <div class="modal-podnozje">
            <button type="submit" class="btn btn-primary">Sačuvaj</button>
            <button type="button" class="btn btn-secondary" @click="rezModal = null">Otkaži</button>
          </div>
        </form>
      </div>
    </div>

    <!-- prozor: termin meca (grupni i eliminacioni mecevi, samo admin) -->
    <div v-if="prijavljen && terminModal" class="modal-pozadina" @click.self="zatvoriTermin">
      <div class="modal-kartica">
        <form @submit.prevent="sacuvajTermin(false)">
          <div class="modal-zaglavlje">
            <strong>Termin: {{ terminModal.ekipa1 }} - {{ terminModal.ekipa2 }}</strong>
          </div>
          <div class="modal-telo">
            <label class="form-label">Datum i vreme (opciono)</label>
            <input
              type="datetime-local"
              v-model="terminVrednost"
              class="form-control mb-3"
              @input="ponistiUpozorenja"
            />
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                id="termin-odlozen"
                v-model="terminOdlozen"
                :disabled="!terminModal.mozeOdlozen"
                @change="ponistiUpozorenja"
              />
              <label class="form-check-label" for="termin-odlozen">Meč je odložen</label>
            </div>
            <small class="text-muted d-block mt-2">
              <span v-if="!terminModal.mozeOdlozen">Meč se može odložiti tek kad su obe ekipe poznate. </span>
              Odloženi meč se računa kao neodigran.
            </small>

            <!-- upozorenje o preklapanju termina -->
            <div v-if="terminUpozorenja.length > 0" class="alert alert-warning mt-3 mb-0">
              <strong>Upozorenje: termin se preklapa.</strong>
              <ul class="mb-1 mt-1">
                <li v-for="u in terminUpozorenja" :key="u">{{ u }}</li>
              </ul>
              <small>Računa se da meč traje {{ terminTrajanje }} minuta. Možeš da promeniš vreme ili da sačuvaš svejedno.</small>
            </div>
          </div>
          <div class="modal-podnozje">
            <button
              v-if="terminUpozorenja.length > 0"
              type="button"
              class="btn btn-warning"
              @click="sacuvajTermin(true)"
            >Sačuvaj ipak</button>
            <button type="submit" class="btn btn-primary">Sačuvaj</button>
            <button type="button" class="btn btn-secondary" @click="zatvoriTermin">Otkaži</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ekipe koje prolaze dalje iz grupe (fz-10) */
.red-prolazi > td {
  background-color: var(--prolazi-bg, #d1e7dd) !important;
  box-shadow: none !important; /* uklanja bootstrap "prugasti" sloj, da svi redovi budu iste zelene */
}

/* prozori (modal) za rezultat i termin */
.modal-pozadina {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-kartica {
  background: var(--kartica-bg, #fff);
  color: var(--bs-body-color);
  border-radius: 8px;
  width: min(480px, 92vw);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-zaglavlje {
  padding: 14px 18px;
  border-bottom: 1px solid var(--linija, #dee2e6);
}

.modal-telo {
  padding: 18px;
}

.modal-podnozje {
  padding: 12px 18px;
  border-top: 1px solid var(--linija, #dee2e6);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* cela sema kostura: kolone jedna pored druge, a ako ne staje na ekran moze da se skroluje levo-desno */
.kostur {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 12px;
}

/* jedna kolona = jedno kolo (npr. polufinale) */
.kolona {
  display: flex;
  flex-direction: column;
  min-width: 240px;
  flex: 1;
}

.kolona-naslov {
  text-align: center;
  margin-bottom: 12px;
}

/* kartice se ravnomerno rasporedjuju po visini, pa se sledece kolo nalazi izmedju svojih izvora */
.kolona-meceva {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex: 1;
  gap: 16px;
}

/* kartica jednog meca */
.mec-kartica {
  border: 1px solid var(--kartica-ivica, #adb5bd);
  border-radius: 6px;
  background: var(--kartica-bg, #fff);
  overflow: hidden;
}

/* jedan red u kartici: naziv ekipe levo, rezultat desno */
.ekipa-red {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--linija, #dee2e6);
}

.ekipa-red:last-of-type {
  border-bottom: none;
}

.ekipa-naziv {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ekipa-rezultat {
  font-weight: bold;
  margin-left: 8px;
}

/* prazno mesto (ekipa jos nije poznata): sivo i iskoseno */
.ekipa-red.prazno {
  color: var(--prazno-tekst, #868e96);
  font-style: italic;
}

/* pobednik: zeleno */
.ekipa-red.pobednik {
  background: var(--pobednik-bg, #d1e7dd);
  font-weight: bold;
}

/* gubitnik: crveno */
.ekipa-red.poraz {
  background: var(--poraz-bg, #f8d7da);
  color: var(--poraz-tekst, #842029);
}

/* termin i "odlozeno" na kartici eliminacije */
.mec-termin {
  padding: 4px 10px;
  font-size: 0.85rem;
  color: var(--termin-tekst, #495057);
  border-top: 1px solid var(--linija, #dee2e6);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.odlozeno {
  font-weight: 600;
  color: var(--odlozeno-tekst, #997404);
}

/* donji deo kartice sa dugmadima */
.mec-akcija {
  padding: 6px 10px;
  background: var(--akcija-bg, #f8f9fa);
  border-top: 1px solid var(--linija, #dee2e6);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* kompaktan prikaz kostura (za velike turnire) */
.kostur.kompaktno {
  gap: 10px;
}

.kostur.kompaktno .kolona {
  min-width: 170px;
}

.kostur.kompaktno .kolona-naslov {
  font-size: 0.8rem;
  margin-bottom: 6px;
}

.kostur.kompaktno .kolona-meceva {
  gap: 6px;
}

.kostur.kompaktno .ekipa-red {
  padding: 2px 6px;
  font-size: 0.78rem;
}

.kostur.kompaktno .mec-termin {
  padding: 1px 6px;
  font-size: 0.7rem;
}

.kostur.kompaktno .mec-akcija {
  padding: 2px 6px;
  gap: 4px;
}

.kostur.kompaktno .mec-akcija .btn {
  padding: 0 6px;
  font-size: 0.7rem;
}

.kostur.kompaktno .mec-akcija .badge {
  font-size: 0.65rem;
}
</style>
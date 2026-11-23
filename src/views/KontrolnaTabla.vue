<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter } from "vue-router";
import { porukaGreske } from "@/utils/greske.js";

const router = useRouter();
const podaci = ref(null);

//pretvara broj statusa u naziv
const statusNaziv = (status) => {
  const mapa = { 0: "Priprema", 1: "U toku", 2: "Završen" };
  return mapa[status] || "?";
};

//racuna se koliki je procenat meceva odigrano za traku napretka
const procenat = (t) =>
  t.ukupnoMeceva > 0 ? Math.round((t.odigrano / t.ukupnoMeceva) * 100) : 0;

//ucitavaju se podaci za kontrolnu tablu. tiho = true znaci da se ne prikazuje poruka greske (koristi se za automatsko osvezavanje)
const ucitaj = async (tiho = false) => {
  try {
    const res = await axios.get("/api/Statistika/kontrolna-tabla");
    podaci.value = res.data;
  } catch (error) {
    if (!tiho) toast.error(porukaGreske(error, "Greška pri učitavanju kontrolne table.")); //greska se prikazuje samo ako nije tiho
  }
};

//osvezavaju se podaci na svakih 30 sekundi. jedino radi ako je stranica otvorena
let osvezavanje = null;
onMounted(() => {
  ucitaj();
  osvezavanje = setInterval(() => {
    if (!document.hidden) ucitaj(true); //ako odemo na drugi tab u browseru, osvezavanje se preskace sve dok se korisnik ne vrati
  }, 30000);
});
//prekida se osvezavanje kad se stranica ugasi
onBeforeUnmount(() => clearInterval(osvezavanje));
</script>

<!-- izgled -->
<template>
  <div class="container mt-4" v-if="podaci">
    <h2 class="mb-4">Kontrolna tabla</h2>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.ukupnoTurnira }}</div>
            <div class="text-muted">Turnira</div>
            <small class="text-muted">
              {{ podaci.uPripremi }} u pripremi, {{ podaci.uToku }} u toku, {{ podaci.zavrseno }} završeno
            </small>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.ukupnoEkipa }}</div>
            <div class="text-muted">Ekipa</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.ukupnoMeceva }}</div>
            <div class="text-muted">Mečeva</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.odigranoMeceva }}</div>
            <div class="text-muted">Odigrano mečeva</div>
          </div>
        </div>
      </div>
    </div>

    <h4>Aktivni turniri</h4>
    <table class="table table-striped table-bordered mb-4">
      <thead class="table-dark">
        <tr>
          <th>Naziv</th>
          <th>Status</th>
          <th>Ekipe</th>
          <th>Napredak</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="podaci.aktivniTurniri.length === 0">
          <td colspan="5" class="text-center text-muted">Nema aktivnih turnira.</td>
        </tr>
        <tr v-for="t in podaci.aktivniTurniri" :key="t.turnirId">
          <td>{{ t.naziv }}</td>
          <td>{{ statusNaziv(t.status) }}</td>
          <td>{{ t.brojEkipa }} / {{ t.maxEkipa }}</td>
          <td style="min-width: 180px">
            <div v-if="t.ukupnoMeceva > 0">
              <div class="progress" style="height: 14px">
                <div class="progress-bar" :style="{ width: procenat(t) + '%' }"></div>
              </div>
              <small class="text-muted">{{ t.odigrano }} / {{ t.ukupnoMeceva }} mečeva</small>
            </div>
            <small v-else class="text-muted">Mečevi još nisu generisani</small>
          </td>
          <td>
            <button class="btn btn-info btn-sm me-1" @click="router.push(`/turniri/${t.turnirId}`)">Detalji</button>
            <button class="btn btn-secondary btn-sm" @click="router.push(`/turniri/${t.turnirId}/statistika`)">Statistika</button>
          </td>
        </tr>
      </tbody>
    </table>

    <h4>Poslednji rezultati</h4>
    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Turnir</th>
          <th>Faza</th>
          <th>Ekipa 1</th>
          <th>Rezultat</th>
          <th>Ekipa 2</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="podaci.poslednjiRezultati.length === 0">
          <td colspan="5" class="text-center text-muted">Još nema odigranih mečeva.</td>
        </tr>
        <tr v-for="(r, i) in podaci.poslednjiRezultati" :key="i">
          <td>
            <a href="#" @click.prevent="router.push(`/turniri/${r.turnirId}`)">{{ r.turnir }}</a>
          </td>
          <td>{{ r.faza }}</td>
          <td>{{ r.ekipa1 }}</td>
          <td><strong>{{ r.rezultatEkipa1 }} : {{ r.rezultatEkipa2 }}</strong></td>
          <td>{{ r.ekipa2 }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
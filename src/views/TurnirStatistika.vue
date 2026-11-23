<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRoute, useRouter } from "vue-router";
import { porukaGreske } from "@/utils/greske.js";

const route = useRoute();
const router = useRouter();
//id turnira od kog gledamo statistiku
const id = route.params.id;
const podaci = ref(null);

//broj se pretvara u status kako bi se lakse razumelo
const statusNaziv = (status) => {
  const mapa = { 0: "Priprema", 1: "U toku", 2: "Završen" };
  return mapa[status] || "?";
};

//ucitava se statistika turnira. tiho = true znaci da se ne prikazuje poruka greske (koristi se za automatsko osvezavanje)
const ucitaj = async (tiho = false) => {
  try {
    const res = await axios.get(`/api/Statistika/turnir/${id}`);
    podaci.value = res.data;
  } catch (error) {
    if (!tiho) toast.error(porukaGreske(error, "Greška pri učitavanju statistike.")); //greska se prikazuje samo ako nije tiho
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
    <div class="d-flex align-items-center gap-3 mb-3">
      <h2 class="mb-0">Statistika: {{ podaci.turnir.naziv }}</h2>
      <span class="badge bg-secondary">{{ statusNaziv(podaci.turnir.status) }}</span>
      <button class="btn btn-info btn-sm ms-auto" @click="router.push(`/turniri/${id}`)">Detalji turnira</button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.brojEkipa }}</div>
            <div class="text-muted">Ekipa (max {{ podaci.maxEkipa }})</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.ukupnoMeceva }}</div>
            <div class="text-muted">Mečeva ukupno</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.odigrano }}</div>
            <div class="text-muted">Odigrano</div>
            <small class="text-muted">preostalo {{ podaci.preostalo }}, odloženo {{ podaci.odlozeno }}</small>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.ukupnoPoena }}</div>
            <div class="text-muted">Ukupno poena</div>
          </div>
        </div>
      </div>
    </div>

    <h4>Mečevi po fazama</h4>
    <table class="table table-striped table-bordered mb-4">
      <thead class="table-dark">
        <tr>
          <th>Faza</th>
          <th>Ukupno</th>
          <th>Odigrano</th>
          <th>Odloženo</th>
          <th>Poeni</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="podaci.poFazama.length === 0">
          <td colspan="5" class="text-center text-muted">Mečevi još nisu generisani.</td>
        </tr>
        <tr v-for="f in podaci.poFazama" :key="f.faza">
          <td>{{ f.faza }}</td>
          <td>{{ f.ukupno }}</td>
          <td>{{ f.odigrano }}</td>
          <td>{{ f.odlozeno }}</td>
          <td>{{ f.poeni }}</td>
        </tr>
      </tbody>
    </table>

    <h4>Plasman ekipa</h4>
    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Ekipa</th>
          <th>Status</th>
          <th>Odigrano</th>
          <th>Pobede</th>
          <th>Porazi</th>
          <th>Poeni</th>
          <th>Primljeni</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="podaci.plasman.length === 0">
          <td colspan="7" class="text-center text-muted">Nema prijavljenih ekipa.</td>
        </tr>
        <tr v-for="e in podaci.plasman" :key="e.ekipaId">
          <td>
            <a href="#" @click.prevent="router.push(`/ekipe/${e.ekipaId}/istorija`)">{{ e.naziv }}</a>
          </td>
          <td>{{ e.status }}</td>
          <td>{{ e.odigrano }}</td>
          <td>{{ e.pobede }}</td>
          <td>{{ e.porazi }}</td>
          <td>{{ e.poeni }}</td>
          <td>{{ e.primljeni }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
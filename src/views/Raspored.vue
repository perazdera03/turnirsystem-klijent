<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter } from "vue-router";
import { porukaGreske } from "@/utils/greske.js";

const router = useRouter();
// svi mecevi svih turnira
const mecevi = ref([]);
const turniri = ref([]);
// izabrani turnir u filteru
const turnirFilter = ref("");
const statusFilter = ref("");
// true kad je lista obrnuta (najkasniji termin prvo)
const obrnut = ref(false);

// pretvara broj statusa u tekst
const statusNaziv = (s) => ({ 0: "Zakazana", 1: "Završena", 2: "Odložena" }[s] || "?");

// prikaz termina: "2026-11-10T18:00:00" -> "2026-11-10 18:00"
const formatTermin = (v) => (v ? v.replace("T", " ").slice(0, 16) : "Bez termina");

// prikazujemo samo mecove koji odgovaraju filterima
const filtrirani = computed(() => {
  const lista = mecevi.value.filter((m) =>
    (turnirFilter.value === "" || String(m.turnirId) === turnirFilter.value) &&
    (statusFilter.value === "" || String(m.status) === statusFilter.value)
  );
  return obrnut.value ? [...lista].reverse() : lista;
});

// tiho = true znaci da ne prikazujemo gresku kad se samo osvezava
const ucitaj = async (tiho = false) => {
  try {
    const [meceviRes, turniriRes] = await Promise.all([
      axios.get("/api/Raspored"),
      axios.get("/api/Turniri"),
    ]);
    mecevi.value = meceviRes.data;
    turniri.value = turniriRes.data;
  } catch (error) {
    if (!tiho) toast.error(porukaGreske(error, "Greška pri učitavanju rasporeda."));
  }
};

// automatsko osvezavanje na 30 sekundi (fz-16)
let osvezavanje = null;
onMounted(() => {
  ucitaj();
  osvezavanje = setInterval(() => {
    if (!document.hidden) ucitaj(true);
  }, 30000);
});
onBeforeUnmount(() => clearInterval(osvezavanje));
</script>

<!-- izgled -->
<template>
  <div class="container mt-4">
    <h2 class="mb-3">Raspored i rezultati</h2>

    <div class="d-flex flex-wrap gap-3 mb-3">
      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0">Turnir:</label>
        <select v-model="turnirFilter" class="form-select" style="width: 240px">
          <option value="">Svi turniri</option>
          <option v-for="t in turniri" :key="t.turnirId" :value="String(t.turnirId)">{{ t.naziv }}</option>
        </select>
      </div>
      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0">Status:</label>
        <select v-model="statusFilter" class="form-select" style="width: 160px">
          <option value="">Svi</option>
          <option value="0">Zakazana</option>
          <option value="1">Završena</option>
          <option value="2">Odložena</option>
        </select>
      </div>
      <button class="btn btn-outline-secondary text-nowrap" style="min-width: 170px;" @click="obrnut = !obrnut">
        <i class="fas fa-sort"></i> {{ obrnut ? "Najkasniji prvo" : "Najraniji prvo" }}
      </button>
    </div>

    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Termin</th>
          <th>Turnir</th>
          <th>Faza</th>
          <th>Ekipa 1</th>
          <th>Rezultat</th>
          <th>Ekipa 2</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="filtrirani.length === 0">
          <td colspan="7" class="text-center text-muted">Nema mečeva za izabrane filtere.</td>
        </tr>
        <tr v-for="(m, i) in filtrirani" :key="i">
          <td>{{ formatTermin(m.datumVreme) }}</td>
          <td>
            <a href="#" @click.prevent="router.push(`/turniri/${m.turnirId}`)">{{ m.turnir }}</a>
          </td>
          <td>{{ m.faza }}</td>
          <td>{{ m.ekipa1 }}</td>
          <td>
            <strong v-if="m.rezultatEkipa1 !== null">{{ m.rezultatEkipa1 }} : {{ m.rezultatEkipa2 }}</strong>
            <span v-else>-</span>
          </td>
          <td>{{ m.ekipa2 }}</td>
          <td>{{ statusNaziv(m.status) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

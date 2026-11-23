<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRoute, useRouter } from "vue-router";
import { porukaGreske } from "@/utils/greske.js";

const route = useRoute();
const router = useRouter();
const id = route.params.id;
const podaci = ref(null);
const logoUrl = ref(null);

//skracujemo datum i vreme da ne sadrzi sekunde da bi bilo cistije. ako ne postoji termin, stavlja se "-"
const formatTermin = (v) => (v ? v.replace("T", " ").slice(0, 16) : "-");

//ucitava se i statistika ekipe i samu ekipu zbog logoa (slike ekipe). oba zahteva se istovremeno salju
onMounted(async () => {
  try {
    const [istorijaRes, ekipaRes] = await Promise.all([
      axios.get(`/api/Statistika/ekipa/${id}`),
      axios.get(`/api/Ekipe/${id}`),
    ]);
    podaci.value = istorijaRes.data;
    logoUrl.value = ekipaRes.data.logoUrl || null;
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri učitavanju istorije ekipe.")); //greska usled ucitavanja. moze biti razlicitih razloga za gresku
  }
});
</script>

<!-- izgled -->
<template>
  <div class="container mt-4" v-if="podaci">
    <div class="d-flex align-items-center gap-3 mb-3">
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt=""
        style="height: 120px; width: 120px; object-fit: contain;"
        @error="(e) => (e.target.style.display = 'none')"
      />
      <h2 class="mb-0">Istorija: {{ podaci.ekipa.naziv }}</h2>
      <button class="btn btn-secondary btn-sm ms-auto" @click="router.push('/ekipe')">Sve ekipe</button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.odigrano }}</div>
            <div class="text-muted">Odigrano</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.pobede }} / {{ podaci.porazi }}</div>
            <div class="text-muted">Pobede / porazi</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.poeni }}</div>
            <div class="text-muted">Osvojeni poeni</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center h-100">
          <div class="card-body">
            <div class="fs-2 fw-bold">{{ podaci.primljeni }}</div>
            <div class="text-muted">Primljeni poeni</div>
          </div>
        </div>
      </div>
    </div>

    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Turnir</th>
          <th>Faza</th>
          <th>Protivnik</th>
          <th>Rezultat</th>
          <th>Ishod</th>
          <th>Termin</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="podaci.mecevi.length === 0">
          <td colspan="6" class="text-center text-muted">Ekipa još nije igrala mečeve.</td>
        </tr>
        <tr v-for="(m, i) in podaci.mecevi" :key="i">
          <td>
            <a href="#" @click.prevent="router.push(`/turniri/${m.turnirId}`)">{{ m.turnir }}</a>
          </td>
          <td>{{ m.faza }}</td>
          <td>{{ m.rival }}</td>
          <td>
            <strong v-if="m.moji !== null">{{ m.moji }} : {{ m.protivnik }}</strong>
            <span v-else>-</span>
          </td>
          <td>{{ m.ishod }}</td>
          <td>{{ formatTermin(m.datumVreme) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
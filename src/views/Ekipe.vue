<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";
import { useRouter } from "vue-router";
import TableContainer from "@/components/TableContainer.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import { porukaGreske } from "@/utils/greske.js";
import { prijavljen } from "@/utils/auth.js";

const router = useRouter();
// lista svih ekipa sa servera
const ekipe = ref([]);
// tekst iz polja za pretragu
const pretraga = ref("");
// true kad je lista obrnuta (najnovija prvo)
const obrnut = ref(false);
const ekipaToDelete = ref(null);
const confirmModalRef = ref(null);
const brojTestEkipa = ref(8);

// prikazujemo samo ekipe koje se poklapaju sa pretragom
const filtrirane = computed(() => {
  const q = pretraga.value.trim().toLowerCase();
  const lista = !q
    ? ekipe.value
    : ekipe.value.filter((e) =>
        [e.naziv, e.skraceniNaziv, e.mesto, e.kontaktOsoba]
          .some((v) => (v || "").toLowerCase().includes(q))
      );
  return obrnut.value ? [...lista].reverse() : lista;
});

// ucitava ekipe sa servera
const fetchEkipe = async () => {
  try {
    const response = await axios.get("/api/Ekipe");
    ekipe.value = response.data;
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri učitavanju ekipa."));
  }
};

// alat za demo: pravi n test ekipa
const dodajTestEkipe = async () => {
  try {
    const res = await axios.post("/api/Demo/ekipe", { broj: parseInt(brojTestEkipa.value) });
    toast.success(res.data.message);
    await fetchEkipe();
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri dodavanju test ekipa."));
  }
};

// otvara prozor za potvrdu brisanja
const confirmDelete = (ekipa) => {
  ekipaToDelete.value = ekipa;
  confirmModalRef.value.showModal();
};

// brise ekipu kad korisnik potvrdi
const deleteEkipa = async () => {
  try {
    await axios.delete(`/api/Ekipe/${ekipaToDelete.value.ekipaId}`);
    ekipe.value = ekipe.value.filter((e) => e.ekipaId !== ekipaToDelete.value.ekipaId);
    ekipaToDelete.value = null;
    toast.success("Ekipa obrisana!");
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri brisanju ekipe."));
  }
};

// kad se stranica otvori ucitamo ekipe
onMounted(() => {
  fetchEkipe();
});
</script>

<!-- izgled -->
<template>
  <div class="container mt-4">
    <div class="d-flex gap-2">
      <input
        type="text"
        v-model="pretraga"
        class="form-control"
        placeholder="Pretraga ekipa (naziv, skraćeni naziv, mesto, kontakt osoba)"
      />
      <button class="btn btn-outline-secondary text-nowrap" style="min-width: 170px;" @click="obrnut = !obrnut">
        <i class="fas fa-sort"></i> {{ obrnut ? "Najnovija prvo" : "Najstarija prvo" }}
      </button>
    </div>

    <!-- alati za testiranje (samo admin) -->
    <div class="card border-warning mt-3" v-if="prijavljen">
      <div class="card-header">
        <strong>Alati za testiranje</strong>
        <span class="ms-2 text-muted">(samo za demo)</span>
      </div>
      <div class="card-body d-flex gap-2 align-items-center">
        <label class="mb-0">Broj test ekipa:</label>
        <input type="number" v-model="brojTestEkipa" class="form-control" min="1" max="64" style="width: 90px" />
        <button @click="dodajTestEkipe" class="btn btn-warning">Dodaj test ekipe</button>
      </div>
    </div>
  </div>

  <!-- tabela ekipa, dugme Dodaj vide samo prijavljeni -->
  <TableContainer to="/ekipe-novi" buttonText="Dodaj ekipu" :showButton="prijavljen">
    <template #table-header>
      <tr>
        <th>#</th>
        <th>Logo</th>
        <th>Naziv</th>
        <th>Skraćeni naziv</th>
        <th>Mesto</th>
        <th>Kontakt osoba</th>
        <th style="width: 1%; white-space: nowrap">Akcije</th>
      </tr>
    </template>
    <template #table-body>
      <tr v-if="filtrirane.length === 0">
        <td colspan="7" class="text-center text-muted">Nema ekipa koje odgovaraju pretrazi.</td>
      </tr>
      <tr v-for="(ekipa, index) in filtrirane" :key="ekipa.ekipaId" class="align-middle">
        <td>{{ index + 1 }}</td>
        <td style="width: 70px" class="text-center align-middle">
          <img
            v-if="ekipa.logoUrl"
            :src="ekipa.logoUrl"
            alt=""
            style="height: 40px; width: 40px; object-fit: contain;"
            @error="(e) => (e.target.style.display = 'none')"
          />
          <span v-else class="text-muted">-</span>
        </td>
        <td class="align-middle">{{ ekipa.naziv }}</td>
        <td>{{ ekipa.skraceniNaziv || '-' }}</td>
        <td>{{ ekipa.mesto || '-' }}</td>
        <td>{{ ekipa.kontaktOsoba || '-' }}</td>
        <td style="white-space: nowrap">
          <button
            @click="router.push(`/ekipe/${ekipa.ekipaId}/istorija`)"
            class="btn btn-info btn-sm py-0 px-2 me-1"
          >
            <i class="fas fa-history"></i> Istorija
          </button>
          <button
            v-if="prijavljen"
            @click="router.push(`/ekipe-izmena/${ekipa.ekipaId}`)"
            class="btn btn-warning btn-sm py-0 px-2 me-1"
          >
            <i class="fas fa-edit"></i> Izmeni
          </button>
          <button
            v-if="prijavljen"
            @click="confirmDelete(ekipa)"
            class="btn btn-danger btn-sm py-0 px-2"
          >
            <i class="fas fa-trash"></i> Obriši
          </button>
        </td>
      </tr>
    </template>
  </TableContainer>

  <DeleteModal
    ref="confirmModalRef"
    :title="'Potvrda brisanja'"
    :message="'Da li ste sigurni da želite da obrišete ovu ekipu?'"
    :onConfirm="deleteEkipa"
  />
</template>
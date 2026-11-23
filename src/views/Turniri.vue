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
// lista svih turnira sa servera
const turniri = ref([]);
// izabrani status u filteru
const statusFilter = ref("");
//ako je true, lista krece obrnuto
const obrnut = ref(false);
const turnirToDelete = ref(null);
const confirmModalRef = ref(null);

// pretvara broj statusa u tekst
const statusNaziv = (status) => {
  const mapa = { 0: "Priprema", 1: "U toku", 2: "Završen" };
  return mapa[status] || "?";
};

// filter po statusu (fz-05): prazna vrednost znaci "svi"
const filtrirani = computed(() => {
  const lista = statusFilter.value === ""
    ? turniri.value
    : turniri.value.filter((t) => String(t.status) === statusFilter.value);
  return obrnut.value ? [...lista].reverse() : lista;
});

// ucitava turnire sa servera
const fetchTurniri = async () => {
  try {
    const response = await axios.get("/api/Turniri");
    turniri.value = response.data;
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri učitavanju turnira."));
  }
};

// otvara prozor za potvrdu brisanja
const confirmDelete = (turnir) => {
  turnirToDelete.value = turnir;
  confirmModalRef.value.showModal();
};

// brise turnir kad korisnik potvrdi
const deleteTurnir = async () => {
  try {
    await axios.delete(`/api/Turniri/${turnirToDelete.value.turnirId}`);
    turniri.value = turniri.value.filter((t) => t.turnirId !== turnirToDelete.value.turnirId);
    turnirToDelete.value = null;
    toast.success("Turnir obrisan!");
  } catch (error) {
    toast.error(porukaGreske(error, "Greška pri brisanju turnira."));
  }
};

// kad se stranica otvori ucitamo turnire
onMounted(() => {
  fetchTurniri();
});
</script>

<!-- izgled -->
<template>
  <div class="container mt-4">
    <div class="d-flex align-items-center gap-2">
      <label class="form-label mb-0">Status:</label>
      <select v-model="statusFilter" class="form-select" style="width: 160px;">
        <option value="">Svi</option>
        <option value="0">Priprema</option>
        <option value="1">U toku</option>
        <option value="2">Završen</option>
      </select>
      <button class="btn btn-outline-secondary text-nowrap" style="min-width: 170px;" @click="obrnut = !obrnut">
        <i class="fas fa-sort"></i> {{ obrnut ? "Najnoviji prvo" : "Najstariji prvo" }}
      </button>
    </div>
  </div>

  <!-- tabela turnira, dugme Dodaj vide samo prijavljeni -->
  <TableContainer to="/turniri-novi" buttonText="Dodaj turnir" :showButton="prijavljen">
    <template #table-header>
      <tr>
        <th>#</th>
        <th>Naziv</th>
        <th>Datum početka</th>
        <th>Grupe</th>
        <th>Najviše po grupi</th>
        <th>Status</th>
        <th>Akcije</th>
      </tr>
    </template>
    <template #table-body>
      <tr v-if="filtrirani.length === 0">
        <td colspan="7" class="text-center text-muted">Nema turnira sa izabranim statusom.</td>
      </tr>
      <tr v-for="(turnir, index) in filtrirani" :key="turnir.turnirId">
        <td>{{ index + 1 }}</td>
        <td>{{ turnir.naziv }}</td>
        <td>{{ (turnir.datumPocetka || '').split('T')[0] }}</td>
        <td>{{ turnir.brojGrupa }}</td>
        <td>{{ turnir.brojEkipaPoGrupi }}</td>
        <td>{{ statusNaziv(turnir.status) }}</td>
        <td>
          <button
            @click="router.push(`/turniri/${turnir.turnirId}`)"
            class="btn btn-info btn-sm me-2"
          >
            <i class="fas fa-eye"></i> Detalji
          </button>
          <button
            @click="router.push(`/turniri/${turnir.turnirId}/statistika`)"
            class="btn btn-secondary btn-sm me-2"
          >
            <i class="fas fa-chart-bar"></i> Statistika
          </button>
          <button
            v-if="prijavljen"
            @click="router.push(`/turniri-izmena/${turnir.turnirId}`)"
            class="btn btn-warning btn-sm me-2"
          >
            <i class="fas fa-edit"></i> Izmeni
          </button>
          <button
            v-if="prijavljen"
            @click="confirmDelete(turnir)"
            class="btn btn-danger btn-sm"
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
    :message="'Da li ste sigurni da želite da obrišete ovaj turnir?'"
    :onConfirm="deleteTurnir"
  />
</template>